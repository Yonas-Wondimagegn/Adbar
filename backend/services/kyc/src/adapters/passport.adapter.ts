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
 * Passport / International ID Verification Adapter
 * Supports passport verification and international identity documents.
 */
@Injectable()
export class PassportAdapter implements IdentityVerificationProvider {
  readonly name = 'passport';
  readonly displayName = 'Passport / International ID';
  readonly supportedDocumentTypes = ['passport', 'drivers_license'];
  private readonly logger = new Logger(PassportAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env['PASSPORT_VERIFY_BASE_URL'] || 'https://api.passportverify.com/v2';
    this.apiKey = process.env['PASSPORT_VERIFY_API_KEY'] || '';
    this.apiSecret = process.env['PASSPORT_VERIFY_API_SECRET'] || '';
  }

  supportsDocumentType(documentType: string): boolean {
    return this.supportedDocumentTypes.includes(documentType);
  }

  async verifyIdentity(request: IdentityVerificationRequest): Promise<IdentityVerificationResponse> {
    this.logger.log(
      `Passport verification for user: ${request.userId}, type: ${request.documentType}`,
    );

    const verificationId = `passport-${request.userId}-${Date.now()}`;

    try {
      const payload = {
        documentType: request.documentType.toUpperCase(),
        documentNumber: request.documentNumber,
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        nationality: request.nationality,
        requestId: verificationId,
        ...(request.documentFrontImage && { documentFrontImage: request.documentFrontImage }),
        ...(request.selfieImage && { selfieImage: request.selfieImage }),
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/identity/verify`, payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'X-Signature': this.generateSignature(payload),
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      let status: IdentityVerificationResponse['status'] = 'pending';
      if (data.result === 'match') {
        status = 'verified';
      } else if (data.result === 'no_match') {
        status = 'failed';
      } else if (data.result === 'manual_review') {
        status = 'manual_review';
      }

      return {
        success: status === 'verified',
        verificationId,
        status,
        confidenceScore: data.confidence,
        provider: this.name,
        verifiedAt: status === 'verified' ? new Date() : undefined,
        failureReason: data.failureReason,
        metadata: {
          verificationRef: data.verificationRef,
          documentAuthenticated: data.documentAuthenticated,
          faceMatched: data.faceMatched,
          nationality: data.nationality,
        },
      };
    } catch (error) {
      this.logger.error(`Passport verification failed for user: ${request.userId}`, error);
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
        this.httpService.get(`${this.baseUrl}/identity/verify/${verificationId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );

      const data = response.data;

      return {
        success: data.result === 'match',
        verificationId,
        status: data.result === 'match' ? 'verified' : data.result === 'no_match' ? 'failed' : 'pending',
        confidenceScore: data.confidence,
        provider: this.name,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
        metadata: data,
      };
    } catch (error) {
      this.logger.error(`Passport status check failed for: ${verificationId}`, error);
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
    const documentId = `passport-doc-${userId}-${Date.now()}`;

    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fileData, fileName);
      formData.append('userId', userId);
      formData.append('documentType', documentType);
      formData.append('documentId', documentId);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/documents`, formData, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
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
        metadata: { documentRef: data.reference },
      };
    } catch (error) {
      this.logger.error(`Passport document upload failed for user: ${userId}`, error);
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
