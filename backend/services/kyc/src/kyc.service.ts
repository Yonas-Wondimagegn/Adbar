import { Injectable, Logger, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { IdentityVerificationRegistry } from './identity-verification.registry';
import {
  IdentityVerificationProvider,
  IdentityVerificationRequest,
  IdentityVerificationResponse,
} from './adapters/identity-verification-provider.interface';

export interface VerificationRecord {
  id: string;
  userId: string;
  provider: string;
  documentType: string;
  status: 'pending' | 'verified' | 'failed' | 'manual_review' | 'rejected';
  verificationId?: string;
  confidenceScore?: number;
  reviewedById?: string;
  reviewNote?: string;
  rejectionReason?: string;
  submittedAt: Date;
  verifiedAt?: Date;
  reviewedAt?: Date;
}

export interface KYCDocumentRecord {
  id: string;
  userId: string;
  documentType: string;
  provider: string;
  fileUrl: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: IdentityVerificationRegistry,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: any,
  ) {}

  // ========== SUBMIT VERIFICATION ==========

  async submitVerification(data: any, userId: string): Promise<VerificationRecord> {
    this.logger.log(`KYC submission for user: ${userId}, provider: ${data.provider}`);

    const provider = this.providerRegistry.get(data.provider);
    if (!provider) {
      throw new NotFoundException(`Verification provider "${data.provider}" not found`);
    }

    if (!provider.supportsDocumentType(data.documentType)) {
      throw new BadRequestException(
        `Provider "${data.provider}" does not support document type "${data.documentType}"`,
      );
    }

    // Check for existing pending verification
    const existingVerification = await (this.prisma as any).identityVerification.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'manual_review'] },
      },
    });

    if (existingVerification) {
      throw new BadRequestException('You already have a pending verification request');
    }

    // Build verification request
    const request: IdentityVerificationRequest = {
      userId,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      documentFrontImage: data.documentFrontImage,
      documentBackImage: data.documentBackImage,
      selfieImage: data.selfieImage,
      metadata: data.metadata,
    };

    // Submit to provider
    const result = await provider.verifyIdentity(request);

    // Create verification record
    const verification = await (this.prisma as any).identityVerification.create({
      data: {
        userId,
        provider: data.provider,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        status: result.status,
        verificationId: result.verificationId,
        confidenceScore: result.confidenceScore,
        providerResponse: result.metadata,
        submittedAt: new Date(),
        verifiedAt: result.verifiedAt,
        failureReason: result.failureReason,
      },
    });

    this.logger.log(
      `KYC verification ${verification.id} submitted. Status: ${result.status}`,
    );

    await this.publishEvent('kyc.verification.submitted', {
      verificationId: verification.id,
      userId,
      provider: data.provider,
      status: result.status,
    });

    return this.mapVerificationRecord(verification);
  }

  // ========== GET VERIFICATION STATUS ==========

  async getVerificationStatus(userId: string): Promise<VerificationRecord | null> {
    this.logger.log(`Fetching KYC status for user: ${userId}`);

    const verification = await (this.prisma as any).identityVerification.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!verification) {
      return null;
    }

    // If still pending, check with provider for latest status
    if (verification.status === 'pending' && verification.verificationId) {
      const provider = this.providerRegistry.get(verification.provider);
      if (provider) {
        try {
          const providerStatus = await provider.checkStatus(verification.verificationId);
          // Update local record if status changed
          if (providerStatus.status !== verification.status) {
            const updated = await (this.prisma as any).identityVerification.update({
              where: { id: verification.id },
              data: {
                status: providerStatus.status,
                confidenceScore: providerStatus.confidenceScore,
                verifiedAt: providerStatus.verifiedAt,
                failureReason: providerStatus.failureReason,
              },
            });
            return this.mapVerificationRecord(updated);
          }
        } catch (error) {
          this.logger.warn(`Failed to check provider status for verification ${verification.id}`, error);
        }
      }
    }

    return this.mapVerificationRecord(verification);
  }

  // ========== FAYDA VERIFY ==========

  async verifyFayda(data: any, userId: string): Promise<VerificationRecord> {
    this.logger.log(`Fayda verification for user: ${userId}`);

    const faydaProvider = this.providerRegistry.get('fayda');
    if (!faydaProvider) {
      throw new NotFoundException('Fayda verification provider is not configured');
    }

    const request: IdentityVerificationRequest = {
      userId,
      documentType: 'national_id',
      documentNumber: data.documentNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
    };

    const result = await faydaProvider.verifyIdentity(request);

    const verification = await (this.prisma as any).identityVerification.create({
      data: {
        userId,
        provider: 'fayda',
        documentType: 'national_id',
        documentNumber: data.documentNumber,
        status: result.status,
        verificationId: result.verificationId,
        confidenceScore: result.confidenceScore,
        providerResponse: result.metadata,
        submittedAt: new Date(),
        verifiedAt: result.verifiedAt,
        failureReason: result.failureReason,
      },
    });

    await this.publishEvent('kyc.fayda.verified', {
      verificationId: verification.id,
      userId,
      status: result.status,
      confidenceScore: result.confidenceScore,
    });

    return this.mapVerificationRecord(verification);
  }

  // ========== UPLOAD DOCUMENT ==========

  async uploadDocument(
    userId: string,
    documentType: string,
    fileData: Buffer,
    fileName: string,
    providerName?: string,
  ): Promise<KYCDocumentRecord> {
    this.logger.log(`Document upload for user: ${userId}, type: ${documentType}`);

    // Find a provider that supports this document type
    let provider: IdentityVerificationProvider | undefined;

    if (providerName) {
      provider = this.providerRegistry.get(providerName);
    } else {
      const providers = this.providerRegistry.getByDocumentType(documentType);
      provider = providers[0];
    }

    if (!provider) {
      throw new NotFoundException(
        `No verification provider found for document type "${documentType}"`,
      );
    }

    const result = await provider.uploadDocument(userId, documentType, fileData, fileName);

    const document = await (this.prisma as any).kycDocument.create({
      data: {
        userId,
        documentType,
        provider: provider.name,
        fileUrl: result.fileUrl,
        fileName,
        status: result.status,
        documentId: result.documentId,
        providerResponse: result.metadata,
      },
    });

    this.logger.log(`Document ${document.id} uploaded for user: ${userId}`);

    return {
      id: document.id,
      userId: document.userId,
      documentType: document.documentType,
      provider: document.provider,
      fileUrl: document.fileUrl || '',
      status: document.status,
      createdAt: document.createdAt,
    };
  }

  // ========== REVIEW VERIFICATION (ADMIN) ==========

  async reviewVerification(
    verificationId: string,
    data: any,
    adminId: string,
  ): Promise<VerificationRecord> {
    this.logger.log(`Reviewing verification ${verificationId} by admin: ${adminId}`);

    const verification = await (this.prisma as any).identityVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException(`Verification "${verificationId}" not found`);
    }

    if (verification.status === 'verified' || verification.status === 'rejected') {
      throw new BadRequestException(`Verification is already in "${verification.status}" status`);
    }

    const updated = await (this.prisma as any).identityVerification.update({
      where: { id: verificationId },
      data: {
        status: data.decision === 'approved' ? 'verified' : data.decision === 'rejected' ? 'rejected' : 'manual_review',
        reviewedById: adminId,
        reviewNote: data.reviewNote,
        rejectionReason: data.rejectionReason,
        reviewedAt: new Date(),
        verifiedAt: data.decision === 'approved' ? new Date() : undefined,
      },
    });

    await this.publishEvent('kyc.verification.reviewed', {
      verificationId: updated.id,
      userId: updated.userId,
      decision: data.decision,
      adminId,
    });

    this.logger.log(`Verification ${verificationId} reviewed: ${data.decision}`);

    return this.mapVerificationRecord(updated);
  }

  // ========== GET ALL VERIFICATIONS (ADMIN) ==========

  async getAllVerifications(filters: {
    status?: string;
    provider?: string;
    page: number;
    limit: number;
  }): Promise<{ verifications: VerificationRecord[]; total: number }> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.provider) where.provider = filters.provider;

    const [verifications, total] = await Promise.all([
      (this.prisma as any).identityVerification.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      (this.prisma as any).identityVerification.count({ where }),
    ]);

    return {
      verifications: verifications.map((v: any) => this.mapVerificationRecord(v)),
      total,
    };
  }

  // ========== MAPPER ==========

  private mapVerificationRecord(verification: any): VerificationRecord {
    return {
      id: verification.id,
      userId: verification.userId,
      provider: verification.provider,
      documentType: verification.documentType,
      status: verification.status,
      verificationId: verification.verificationId ?? undefined,
      confidenceScore: verification.confidenceScore?.toNumber() ?? undefined,
      reviewedById: verification.reviewedById ?? undefined,
      reviewNote: verification.reviewNote ?? undefined,
      rejectionReason: verification.rejectionReason ?? undefined,
      submittedAt: verification.submittedAt,
      verifiedAt: verification.verifiedAt ?? undefined,
      reviewedAt: verification.reviewedAt ?? undefined,
    };
  }

  private async publishEvent(topic: string, data: any) {
    if (this.eventPublisher) {
      try {
        await this.eventPublisher.publish(topic, data);
      } catch (error) {
        this.logger.error(`Failed to publish event ${topic}`, error);
      }
    }
  }
}
