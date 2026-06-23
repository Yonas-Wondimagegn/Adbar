import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '@adbar/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    wallet: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    paymentProviderConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    identityVerification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    supportTicket: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ussdSession: {
      count: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [{ role: 'SELLER' }],
          emailVerified: true,
          phoneVerified: true,
          kycLevel: 'not_started',
          createdAt: new Date(),
          _count: { buyerOrders: 5 },
          identityVerifications: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].kycLevel).toBe('not_started');
      expect(result.pagination.totalItems).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ page: 1, limit: 20 }, { role: 'seller' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roles: { some: { role: 'seller' } } }),
        }),
      );
    });
  });

  describe('getUserById', () => {
    it('should return user details', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        freelancerProfile: null,
        store: null,
        identityVerifications: [{ status: 'approved' }],
        _count: { buyerOrders: 3, sellerOrders: 2, writtenReviews: 1 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(result.id).toBe('user-1');
      expect(result._count.buyerOrders).toBe(3);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Updated',
        lastName: 'Name',
        roles: [{ role: 'SELLER' }],
        emailVerified: true,
      });

      const result = await service.updateUser('user-1', {
        firstName: 'Updated',
        isVerified: true,
      });

      expect(result.firstName).toBe('Updated');
      expect(result.roles).toEqual([{ role: 'SELLER' }]);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'pending',
          items: [],
          buyer: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com' },
          transactions: [],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.getAllOrders({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          type: 'payment',
          status: 'completed',
          order: { id: 'order-1', orderNumber: 'ORD-001' },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.getTransactions({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getWallets', () => {
    it('should return paginated wallets', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          currency: 'ETB',
          balance: { toNumber: () => 1000 },
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com' },
        },
      ];

      mockPrisma.wallet.findMany.mockResolvedValue(mockWallets);
      mockPrisma.wallet.count.mockResolvedValue(1);

      const result = await service.getWallets({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getPaymentProviders', () => {
    it('should return payment providers', async () => {
      const mockProviders = [
        { id: 'pp-1', name: 'Chapa', isActive: true },
        { id: 'pp-2', name: 'Stripe', isActive: true },
      ];

      mockPrisma.paymentProviderConfig.findMany.mockResolvedValue(mockProviders);

      const result = await service.getPaymentProviders();

      expect(result).toHaveLength(2);
    });
  });

  describe('updatePaymentProvider', () => {
    it('should update payment provider', async () => {
      mockPrisma.paymentProviderConfig.findUnique.mockResolvedValue({
        id: 'pp-1',
        name: 'Chapa',
      });
      mockPrisma.paymentProviderConfig.update.mockResolvedValue({
        id: 'pp-1',
        name: 'Chapa',
        isActive: false,
      });

      const result = await service.updatePaymentProvider('pp-1', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent provider', async () => {
      mockPrisma.paymentProviderConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePaymentProvider('nonexistent', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingKyc', () => {
    it('should return pending KYC verifications', async () => {
      const mockKyc = [
        {
          id: 'kyc-1',
          status: 'PENDING',
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com', phone: '+251912345678' },
        },
      ];

      mockPrisma.identityVerification.findMany.mockResolvedValue(mockKyc);
      mockPrisma.identityVerification.count.mockResolvedValue(1);

      const result = await service.getPendingKyc({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('PENDING');
    });
  });

  describe('reviewKyc', () => {
    it('should approve KYC verification', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        status: 'PENDING',
      });
      mockPrisma.identityVerification.update.mockResolvedValue({
        id: 'kyc-1',
        status: 'VERIFIED',
        verifiedAt: expect.any(Date),
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com' },
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', kycLevel: 'LEVEL_2' });

      const result = await service.reviewKyc('kyc-1', 'approved');

      expect(result.status).toBe('VERIFIED');
    });

    it('should reject KYC verification with reason', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        userId: 'user-1',
        status: 'PENDING',
      });
      mockPrisma.identityVerification.update.mockResolvedValue({
        id: 'kyc-1',
        status: 'REJECTED',
        rejectionReason: 'Invalid document',
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com' },
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', kycLevel: 'LEVEL_1' });

      const result = await service.reviewKyc('kyc-1', 'rejected', 'Invalid document');

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Invalid document');
    });

    it('should throw BadRequestException for already reviewed KYC', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue({
        id: 'kyc-1',
        status: 'VERIFIED',
      });

      await expect(service.reviewKyc('kyc-1', 'approved')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent KYC', async () => {
      mockPrisma.identityVerification.findUnique.mockResolvedValue(null);

      await expect(service.reviewKyc('nonexistent', 'approved')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPendingOnboarding', () => {
    it('should return pending store onboardings', async () => {
      const mockStores = [
        {
          id: 'store-1',
          name: 'Test Store',
          status: 'PENDING_VERIFICATION',
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com', phone: '+251912345678' },
          _count: { products: 0 },
        },
      ];

      mockPrisma.store.findMany.mockResolvedValue(mockStores);
      mockPrisma.store.count.mockResolvedValue(1);

      const result = await service.getPendingOnboarding({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('approveOnboarding', () => {
    it('should approve store onboarding', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({ id: 'store-1' });
      mockPrisma.store.update.mockResolvedValue({
        id: 'store-1',
        status: 'ACTIVE',
      });

      const result = await service.approveOnboarding('store-1');

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException for non-existent store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.approveOnboarding('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSupportTickets', () => {
    it('should return support tickets', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          status: 'open',
          priority: 'high',
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@test.com' },
          _count: { responses: 3 },
        },
      ];

      mockPrisma.supportTicket.findMany.mockResolvedValue(mockTickets);
      mockPrisma.supportTicket.count.mockResolvedValue(1);

      const result = await service.getSupportTickets({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getUssdHealth', () => {
    it('should return USSD health status', async () => {
      mockPrisma.ussdSession.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(50) // active
        .mockResolvedValueOnce(200) // recent 24h
        .mockResolvedValueOnce(5); // failed 24h

      const result = await service.getUssdHealth();

      expect(result.status).toBe('healthy');
      expect(result.totalSessions).toBe(1000);
      expect(result.activeSessions).toBe(50);
      expect(result.failureRate).toBe(2.5);
    });

    it('should return degraded status when failure rate is high', async () => {
      mockPrisma.ussdSession.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(100) // recent 24h
        .mockResolvedValueOnce(20); // failed 24h (20%)

      const result = await service.getUssdHealth();

      expect(result.status).toBe('degraded');
    });
  });

  describe('getSmsAnalytics', () => {
    it('should return SMS analytics', async () => {
      const mockNotifications = [
        { createdAt: new Date(), isRead: true },
        { createdAt: new Date(), isRead: false },
        { createdAt: new Date(), isRead: true },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getSmsAnalytics(30);

      expect(result.total).toBe(3);
      expect(result.read).toBe(2);
      expect(result.readRate).toBeCloseTo(66.67);
    });
  });
});
