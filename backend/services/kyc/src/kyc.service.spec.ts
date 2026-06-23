import { Test, TestingModule } from '@nestjs/testing';
import { KYCService } from './kyc.service';
import { IdentityVerificationRegistry } from './identity-verification.registry';
import { PrismaService } from '@adbar/common';
import { IdentityVerificationProvider, IdentityVerificationRequest } from './adapters/identity-verification-provider.interface';

describe('KYCService', () => {
  let service: KYCService;
  let registry: IdentityVerificationRegistry;
  let prisma: any;

  const mockPrisma = {
    identityVerification: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    kycDocument: {
      create: jest.fn(),
    },
  };

  const mockProvider: IdentityVerificationProvider = {
    name: 'test-provider',
    displayName: 'Test Provider',
    supportedDocumentTypes: ['national_id', 'passport'],
    supportsDocumentType: jest.fn().mockReturnValue(true),
    verifyIdentity: jest.fn().mockResolvedValue({
      success: true,
      verificationId: 'test-verification-123',
      status: 'verified',
      confidenceScore: 0.95,
      provider: 'test-provider',
      verifiedAt: new Date(),
    }),
    checkStatus: jest.fn().mockResolvedValue({
      success: true,
      verificationId: 'test-verification-123',
      status: 'verified',
      provider: 'test-provider',
    }),
    uploadDocument: jest.fn().mockResolvedValue({
      success: true,
      documentId: 'doc-123',
      documentType: 'national_id',
      fileUrl: 'https://storage.example.com/doc.png',
      status: 'uploaded',
      provider: 'test-provider',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KYCService,
        IdentityVerificationRegistry,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<KYCService>(KYCService);
    registry = module.get<IdentityVerificationRegistry>(IdentityVerificationRegistry);
    prisma = module.get(PrismaService);

    registry.register(mockProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitVerification', () => {
    it('should submit a verification successfully', async () => {
      mockPrisma.identityVerification.findFirst.mockResolvedValue(null);
      mockPrisma.identityVerification.create.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        provider: 'test-provider',
        documentType: 'national_id',
        status: 'verified',
        verificationId: 'test-verification-123',
        confidenceScore: { toNumber: () => 0.95 },
        submittedAt: new Date(),
        verifiedAt: new Date(),
      });

      const result = await service.submitVerification(
        {
          provider: 'test-provider',
          documentType: 'national_id',
          documentNumber: 'ET123456',
          firstName: 'Abebe',
          lastName: 'Kebede',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('verified');
      expect(result.provider).toBe('test-provider');
    });

    it('should throw NotFoundException for unknown provider', async () => {
      await expect(
        service.submitVerification(
          {
            provider: 'unknown-provider',
            documentType: 'national_id',
            documentNumber: '123',
            firstName: 'Test',
            lastName: 'User',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException for unsupported document type', async () => {
      (mockProvider.supportsDocumentType as jest.Mock).mockReturnValue(false);

      await expect(
        service.submitVerification(
          {
            provider: 'test-provider',
            documentType: 'drivers_license',
            documentNumber: '123',
            firstName: 'Test',
            lastName: 'User',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException for existing pending verification', async () => {
      mockPrisma.identityVerification.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.submitVerification(
          {
            provider: 'test-provider',
            documentType: 'national_id',
            documentNumber: '123',
            firstName: 'Test',
            lastName: 'User',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status', async () => {
      mockPrisma.identityVerification.findFirst.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        provider: 'test-provider',
        documentType: 'national_id',
        status: 'verified',
        verificationId: 'test-verification-123',
        confidenceScore: { toNumber: () => 0.95 },
        submittedAt: new Date(),
        verifiedAt: new Date(),
      });

      const result = await service.getVerificationStatus('user-1');
      expect(result).toBeDefined();
      expect(result!.status).toBe('verified');
    });

    it('should return null when no verification exists', async () => {
      mockPrisma.identityVerification.findFirst.mockResolvedValue(null);

      const result = await service.getVerificationStatus('user-1');
      expect(result).toBeNull();
    });
  });

  describe('verifyFayda', () => {
    it('should verify via Fayda', async () => {
      const faydaProvider: IdentityVerificationProvider = {
        name: 'fayda',
        displayName: 'Fayda',
        supportedDocumentTypes: ['national_id'],
        supportsDocumentType: jest.fn().mockReturnValue(true),
        verifyIdentity: jest.fn().mockResolvedValue({
          success: true,
          verificationId: 'fayda-verification-123',
          status: 'verified',
          confidenceScore: 0.98,
          provider: 'fayda',
          verifiedAt: new Date(),
        }),
        checkStatus: jest.fn().mockResolvedValue({
          success: true,
          verificationId: 'fayda-verification-123',
          status: 'verified',
          provider: 'fayda',
        }),
        uploadDocument: jest.fn().mockResolvedValue({
          success: true,
          documentId: 'doc-123',
          documentType: 'national_id',
          fileUrl: 'https://storage.example.com/doc.png',
          status: 'uploaded',
          provider: 'fayda',
        }),
      };
      registry.register(faydaProvider);

      mockPrisma.identityVerification.create.mockResolvedValue({
        id: 'kyc-fayda-1',
        userId: 'user-1',
        provider: 'fayda',
        documentType: 'national_id',
        status: 'verified',
        verificationId: 'fayda-verification-123',
        confidenceScore: { toNumber: () => 0.98 },
        submittedAt: new Date(),
        verifiedAt: new Date(),
      });

      const result = await service.verifyFayda(
        {
          documentNumber: 'ET123456',
          firstName: 'Abebe',
          lastName: 'Kebede',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.provider).toBe('fayda');
      expect(result.status).toBe('verified');
    });

    it('should throw NotFoundException when Fayda provider not configured', async () => {
      // Create a new registry without fayda
      const newRegistry = new IdentityVerificationRegistry();
      const newService = new KYCService(mockPrisma as any, newRegistry);

      await expect(
        newService.verifyFayda(
          { documentNumber: '123', firstName: 'Test', lastName: 'User' },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document', async () => {
      mockPrisma.kycDocument.create.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        documentType: 'national_id',
        provider: 'test-provider',
        fileUrl: 'https://storage.example.com/doc.png',
        fileName: 'id-front.png',
        status: 'uploaded',
        createdAt: new Date(),
      });

      const result = await service.uploadDocument(
        'user-1',
        'national_id',
        Buffer.from('test'),
        'id-front.png',
        'test-provider',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('uploaded');
    });

    it('should throw NotFoundException for unsupported document type', async () => {
      const newRegistry = new IdentityVerificationRegistry();
      const newService = new KYCService(mockPrisma as any, newRegistry);

      await expect(
        newService.uploadDocument(
          'user-1',
          'unknown_type',
          Buffer.from('test'),
          'file.png',
        ),
      ).rejects.toThrow();
    });
  });

  describe('reviewVerification', () => {
    it('should approve a verification', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        status: 'manual_review',
      });
      mockPrisma.identityVerification.update.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        provider: 'test-provider',
        documentType: 'national_id',
        status: 'verified',
        reviewedById: 'admin-1',
        reviewNote: 'All documents verified',
        reviewedAt: new Date(),
        verifiedAt: new Date(),
        submittedAt: new Date(),
      });

      const result = await service.reviewVerification(
        'kyc-1',
        { decision: 'approved', reviewNote: 'All documents verified' },
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('verified');
      expect(result.reviewedById).toBe('admin-1');
    });

    it('should reject a verification', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        status: 'manual_review',
      });
      mockPrisma.identityVerification.update.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        provider: 'test-provider',
        documentType: 'national_id',
        status: 'rejected',
        reviewedById: 'admin-1',
        reviewNote: 'Documents unclear',
        rejectionReason: 'Blurry images',
        reviewedAt: new Date(),
        submittedAt: new Date(),
      });

      const result = await service.reviewVerification(
        'kyc-1',
        {
          decision: 'rejected',
          reviewNote: 'Documents unclear',
          rejectionReason: 'Blurry images',
        },
        'admin-1',
      );

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Blurry images');
    });

    it('should throw NotFoundException for missing verification', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewVerification(
          'nonexistent',
          { decision: 'approved', reviewNote: 'Test' },
          'admin-1',
        ),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException for already resolved verification', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        status: 'verified',
      });

      await expect(
        service.reviewVerification(
          'kyc-1',
          { decision: 'approved', reviewNote: 'Test' },
          'admin-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getAllVerifications', () => {
    it('should return paginated verifications', async () => {
      mockPrisma.identityVerification.findMany.mockResolvedValue([
        {
          id: 'kyc-1',
          userId: 'user-1',
          provider: 'test-provider',
          documentType: 'national_id',
          status: 'verified',
          submittedAt: new Date(),
          verifiedAt: new Date(),
        },
      ]);
      mockPrisma.identityVerification.count.mockResolvedValue(1);

      const result = await service.getAllVerifications({
        page: 1,
        limit: 20,
      });

      expect(result.verifications).toBeDefined();
      expect(result.verifications.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.identityVerification.findMany.mockResolvedValue([]);
      mockPrisma.identityVerification.count.mockResolvedValue(0);

      const result = await service.getAllVerifications({
        status: 'PENDING',
        page: 1,
        limit: 20,
      });

      expect(result.verifications).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

describe('IdentityVerificationRegistry', () => {
  let registry: IdentityVerificationRegistry;

  beforeEach(() => {
    registry = new IdentityVerificationRegistry();
  });

  it('should register and retrieve providers', () => {
    const mockProvider: IdentityVerificationProvider = {
      name: 'test',
      displayName: 'Test',
      supportedDocumentTypes: ['national_id'],
      supportsDocumentType: jest.fn().mockReturnValue(true),
      verifyIdentity: jest.fn(),
      checkStatus: jest.fn(),
      uploadDocument: jest.fn(),
    };

    registry.register(mockProvider);
    expect(registry.get('test')).toBe(mockProvider);
    expect(registry.has('test')).toBe(true);
  });

  it('should return undefined for unregistered provider', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should return all registered providers', () => {
    const provider: IdentityVerificationProvider = {
      name: 'p1',
      displayName: 'P1',
      supportedDocumentTypes: ['national_id'],
      supportsDocumentType: jest.fn().mockReturnValue(true),
      verifyIdentity: jest.fn(),
      checkStatus: jest.fn(),
      uploadDocument: jest.fn(),
    };

    registry.register(provider);
    const all = registry.getAll();
    expect(all.length).toBe(1);
  });

  it('should filter by document type', () => {
    const provider: IdentityVerificationProvider = {
      name: 'p1',
      displayName: 'P1',
      supportedDocumentTypes: ['national_id'],
      supportsDocumentType: jest.fn().mockReturnValue(true),
      verifyIdentity: jest.fn(),
      checkStatus: jest.fn(),
      uploadDocument: jest.fn(),
    };

    registry.register(provider);
    const byType = registry.getByDocumentType('national_id');
    expect(byType.length).toBe(1);
  });
});
