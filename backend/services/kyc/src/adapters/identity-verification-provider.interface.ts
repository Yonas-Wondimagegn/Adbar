/**
 * Identity Verification Provider Interface
 * All KYC identity verification adapters must implement this interface.
 * Follows the same adapter pattern as the payment module.
 */

export interface IdentityVerificationRequest {
  userId: string;
  documentType: 'national_id' | 'passport' | 'drivers_license';
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  documentFrontImage?: string;
  documentBackImage?: string;
  selfieImage?: string;
  metadata?: Record<string, any>;
}

export interface IdentityVerificationResponse {
  success: boolean;
  verificationId: string;
  status: 'pending' | 'verified' | 'failed' | 'manual_review';
  confidenceScore?: number;
  provider: string;
  verifiedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId: string;
  documentType: string;
  fileUrl: string;
  status: 'uploaded' | 'processing' | 'verified' | 'rejected';
  provider: string;
  metadata?: Record<string, any>;
}

/**
 * IdentityVerificationProvider interface.
 * Each adapter (Fayda, Passport, etc.) implements this.
 */
export interface IdentityVerificationProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportedDocumentTypes: string[];

  /**
   * Submit an identity for verification
   */
  verifyIdentity(request: IdentityVerificationRequest): Promise<IdentityVerificationResponse>;

  /**
   * Check the status of a verification
   */
  checkStatus(verificationId: string): Promise<IdentityVerificationResponse>;

  /**
   * Upload a supporting document
   */
  uploadDocument(
    userId: string,
    documentType: string,
    fileData: Buffer,
    fileName: string,
  ): Promise<DocumentUploadResponse>;

  /**
   * Check if provider supports a document type
   */
  supportsDocumentType(documentType: string): boolean;
}
