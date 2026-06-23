import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  IdentityVerificationProvider,
  IdentityVerificationRequest,
  IdentityVerificationResponse,
  DocumentUploadResponse,
} from './identity-verification-provider.interface';

/**
 * Fayda National ID Verification Adapter
 * Integrates with Ethiopia's Fayda national ID system for identity verification.
 */
@Injectable()
export class FaydaAdapter implements IdentityVerificationProvider {
  readonly name = 'fayda';
  readonly displayName = 'Fayda National ID';
  readonly supportedDocumentTypes = ['national_id'];
  private readonly logger = new Logger(FaydaAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env['FAYDA_BASE_URL'] || 'https://api.fayda.gov.et/v1';
    this.apiKey = process.env['FAYDA_API_KEY'] || '';
    this.apiSecret = process.env['FAYDA_API_SECRET'] || '';
  }

  supportsDocumentType(documentType: string): boolean {
    return this.supportedDocumentTypes.includes(documentType);
  }

  async verifyIdentity(request: IdentityVerificationRequest): Promise<IdentityVerificationResponse> {
    this.logger.log(`Fayda verification for user: ${request.userId}, document: ${request.documentNumber}`);

    const verificationId = `fayda-${request.userId}-${Date.now()}`;

    try {
      // Build Fayda-specific payload
      const payload = {
        documentType: 'NATIONAL_ID',
        documentNumber: request.documentNumber,
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        requestId: verificationId,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/verify`, payload, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-Signature': this.generateSignature(payload),
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      let status: IdentityVerificationResponse['status'] = 'pending';
      if (data.verified === true) {
        status = 'verified';
      } else if (data.verified === false) {
        status = data.requiresManualReview ? 'manual_review' : 'failed';
      }

      return {
        success: status === 'verified',
        verificationId,
        status,
        confidenceScore: data.confidenceScore,
        provider: this.name,
        verifiedAt: status === 'verified' ? new Date() : undefined,
        failureReason: data.reason,
        metadata: {
          faydaReference: data.reference,
          verifiedName: data.verifiedName,
          verifiedPhoto: data.photoMatched,
        },
      };
    } catch (error) {
      this.logger.error(`Fayda verification failed for user: ${request.userId}`, error);
      return {
        success: false,
        verificationId,
        status: 'failed',
        provider: this.name,
        failureReason: (error as Error).message,
      };
    }
  }

  async checkStatus(verificationId: string): Promise<IdentityVerificationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/verify/${verificationId}`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      return {
        success: data.verified === true,
        verificationId,
        status: data.verified ? 'verified' : data.failed ? 'failed' : 'pending',
        confidenceScore: data.confidenceScore,
        provider: this.name,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
        metadata: data,
      };
    } catch (error) {
      this.logger.error(`Fayda status check failed for: ${verificationId}`, error);
      return {
        success: false,
        verificationId,
        status: 'failed',
        provider: this.name,
        failureReason: (error as Error).message,
      };
    }
  }

  async uploadDocument(
    userId: string,
    documentType: string,
    fileData: Buffer,
    fileName: string,
  ): Promise<DocumentUploadResponse> {
    const documentId = `fayda-doc-${userId}-${Date.now()}`;

    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fileData, fileName);
      formData.append('userId', userId);
      formData.append('documentType', documentType);
      formData.append('documentId', documentId);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/documents/upload`, formData, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-Signature': this.generateSignature({ userId, documentType }),
            ...formData.getHeaders(),
          },
        }),
      );

      const data = response.data;

      return {
        success: true,
        documentId,
        documentType,
        fileUrl: data.fileUrl || '',
        status: 'uploaded',
        provider: this.name,
        metadata: { faydaDocumentRef: data.reference },
      };
    } catch (error) {
      this.logger.error(`Fayda document upload failed for user: ${userId}`, error);
      return {
        success: false,
        documentId,
        documentType,
        fileUrl: '',
        status: 'rejected',
        provider: this.name,
        metadata: { error: (error as Error).message },
      };
    }
  }

  private generateSignature(payload: Record<string, any>): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
