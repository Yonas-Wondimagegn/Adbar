import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '@adbar/common';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: any;

  const mockPrisma = {
    review: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    product: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    store: { findUnique: jest.fn(), update: jest.fn() },
    freelancerProfile: { update: jest.fn() },
    userRole: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ReviewService>(ReviewService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  describe('createReview', () => {
    it('should create a product review', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({ id: 'review-1', rating: 5, comment: 'Great!', reviewerId: 'user-1', targetType: 'product', targetId: 'prod-1', isVisible: true });
      mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } });

      const result = await service.createReview('user-1', { rating: 5, comment: 'Great!', targetType: 'product', targetId: 'prod-1' });
      expect(result.rating).toBe(5);
    });

    it('should throw BadRequestException for invalid rating', async () => {
      await expect(service.createReview('user-1', { rating: 6, comment: 'Too high', targetType: 'product', targetId: 'prod-1' })).rejects.toThrow(BadRequestException);
      await expect(service.createReview('user-1', { rating: 0, comment: 'Too low', targetType: 'product', targetId: 'prod-1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.createReview('user-1', { rating: 5, comment: 'N/A', targetType: 'product', targetId: 'nonexistent' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate review', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.review.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.createReview('user-1', { rating: 5, comment: 'Dup', targetType: 'product', targetId: 'prod-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getProductReviews', () => {
    it('should return paginated reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([{ id: 'r1', rating: 5 }]);
      mockPrisma.review.count.mockResolvedValue(1);
      const result = await service.getProductReviews('prod-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('respondToReview', () => {
    it('should allow target to respond', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', targetId: 'seller-1', targetType: 'seller', isVisible: true });
      mockPrisma.review.update.mockResolvedValue({ id: 'r1', response: 'Thanks!', respondedAt: new Date() });
      const result = await service.respondToReview('r1', 'seller-1', 'Thanks!');
      expect(result.response).toBe('Thanks!');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.respondToReview('x', 'u', 'r')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', targetId: 'other', targetType: 'seller', isVisible: true });
      await expect(service.respondToReview('r1', 'wrong-user', 'r')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('moderateReview', () => {
    it('should approve a review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', targetType: 'product', targetId: 'p1', isVisible: true });
      mockPrisma.review.update.mockResolvedValue({ id: 'r1', isVisible: true });
      mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } });
      const result = await service.moderateReview('r1', 'admin-1', 'approve');
      expect(result.isVisible).toBe(true);
    });

    it('should reject a review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1', targetType: 'seller', targetId: 's1', isVisible: true });
      mockPrisma.review.update.mockResolvedValue({ id: 'r1', isVisible: false });
      const result = await service.moderateReview('r1', 'admin-1', 'reject', 'Bad');
      expect(result.isVisible).toBe(false);
    });
  });
});
