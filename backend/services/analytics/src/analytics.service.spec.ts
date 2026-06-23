import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@adbar/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  const mockPrisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    identityVerification: {
      count: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
    freelancerProfile: {
      count: jest.fn(),
    },
    store: {
      findMany: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    walletBalance: {
      findMany: jest.fn(),
    },
    escrow: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(100);
      mockPrisma.order.count.mockResolvedValueOnce(500);
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: { toNumber: () => 150000 } },
      });
      mockPrisma.product.count.mockResolvedValueOnce(200);
      mockPrisma.order.count.mockResolvedValueOnce(50);
      mockPrisma.identityVerification.count.mockResolvedValueOnce(10);
      mockPrisma.dispute.count.mockResolvedValueOnce(3);
      mockPrisma.freelancerProfile.count.mockResolvedValueOnce(25);

      const result = await service.getDashboardMetrics();

      expect(result.totalUsers).toBe(100);
      expect(result.totalOrders).toBe(500);
      expect(result.totalRevenue).toBe(150000);
      expect(result.totalProducts).toBe(200);
      expect(result.totalFreelancers).toBe(25);
      expect(result.activeOrders).toBe(50);
      expect(result.pendingKyc).toBe(10);
      expect(result.pendingDisputes).toBe(3);
      expect(result.period).toBeDefined();
    });

    it('should handle zero revenue', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(0);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: null },
      });
      mockPrisma.product.count.mockResolvedValueOnce(0);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.identityVerification.count.mockResolvedValueOnce(0);
      mockPrisma.dispute.count.mockResolvedValueOnce(0);
      mockPrisma.freelancerProfile.count.mockResolvedValueOnce(0);

      const result = await service.getDashboardMetrics();

      expect(result.totalRevenue).toBe(0);
      expect(result.totalUsers).toBe(0);
    });
  });

  describe('getRevenueByCurrency', () => {
    it('should return revenue grouped by currency', async () => {
      const mockOrders = [
        { currency: 'ETB', total: { toNumber: () => 1000 } },
        { currency: 'ETB', total: { toNumber: () => 2000 } },
        { currency: 'USD', total: { toNumber: () => 500 } },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getRevenueByCurrency(30);

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('ETB');
      expect(result[0].total).toBe(3000);
      expect(result[0].count).toBe(2);
      expect(result[0].averageOrderValue).toBe(1500);
      expect(result[1].currency).toBe('USD');
      expect(result[1].total).toBe(500);
    });

    it('should return empty array when no orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getRevenueByCurrency(30);

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserGrowth', () => {
    it('should return user growth data', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.user.findMany.mockResolvedValue([
        { createdAt: yesterday },
        { createdAt: yesterday },
        { createdAt: now },
      ]);
      mockPrisma.user.count.mockResolvedValue(50);

      const result = await service.getUserGrowth(7);

      expect(result.length).toBeGreaterThan(0);
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      const yesterdayEntry = result.find((r) => r.period === yesterdayKey);
      expect(yesterdayEntry?.newUsers).toBe(2);
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics by status', async () => {
      const mockOrders = [
        { status: 'DELIVERED', total: { toNumber: () => 1000 } },
        { status: 'DELIVERED', total: { toNumber: () => 2000 } },
        { status: 'PENDING', total: { toNumber: () => 500 } },
        { status: 'CANCELLED', total: { toNumber: () => 300 } },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getOrderStats(30);

      expect(result).toHaveLength(3);
      const delivered = result.find((r) => r.status === 'DELIVERED');
      expect(delivered?.count).toBe(2);
      expect(delivered?.totalValue).toBe(3000);
      expect(delivered?.percentage).toBe(50);
    });
  });

  describe('getProviderPerformance', () => {
    it('should return provider performance metrics', async () => {
      mockPrisma.store.findMany.mockResolvedValue([
        {
          id: 'store-1',
          name: 'Test Store',
          userId: 'user-1',
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          _count: { products: 10 },
        },
      ]);

      mockPrisma.order.findMany.mockResolvedValue([
        { status: 'DELIVERED', total: { toNumber: () => 1000 } },
        { status: 'DELIVERED', total: { toNumber: () => 2000 } },
        { status: 'PENDING', total: { toNumber: () => 500 } },
      ]);

      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
      });

      const result = await service.getProviderPerformance(10);

      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe('store-1');
      expect(result[0].providerName).toBe('Test Store');
      expect(result[0].totalOrders).toBe(3);
      expect(result[0].totalRevenue).toBe(3000);
      expect(result[0].averageRating).toBe(4.5);
      expect(result[0].fulfillmentRate).toBeCloseTo(66.67);
    });
  });

  describe('getAUBalanceDistribution', () => {
    it('should return AU balance distribution', async () => {
      mockPrisma.walletBalance.findMany.mockResolvedValue([
        {
          currency: 'ETB',
          type: 'AVAILABLE',
          balance: { toNumber: () => 8000 },
        },
        {
          currency: 'ETB',
          type: 'PENDING',
          balance: { toNumber: () => 2000 },
        },
        {
          currency: 'USD',
          type: 'AVAILABLE',
          balance: { toNumber: () => 4000 },
        },
        {
          currency: 'USD',
          type: 'PENDING',
          balance: { toNumber: () => 1000 },
        },
      ]);

      mockPrisma.escrow.findMany.mockResolvedValue([
        { currency: 'ETB', amount: { toNumber: () => 3000 }, status: 'FUNDED' },
      ]);

      const result = await service.getAUBalanceDistribution();

      expect(result).toHaveLength(2);
      const etb = result.find((r) => r.currency === 'ETB');
      expect(etb?.totalBalance).toBe(10000);
      expect(etb?.availableBalance).toBe(8000);
      expect(etb?.pendingBalance).toBe(2000);
      expect(etb?.escrowBalance).toBe(3000);
      expect(etb?.walletCount).toBe(2);
    });
  });
});
