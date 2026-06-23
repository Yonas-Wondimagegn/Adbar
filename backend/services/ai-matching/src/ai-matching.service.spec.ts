import { Test, TestingModule } from '@nestjs/testing';
import { AiMatchingService } from './ai-matching.service';
import { PrismaService } from '@adbar/common';
import { NotFoundException } from '@nestjs/common';

describe('AiMatchingService', () => {
  let service: AiMatchingService;
  let prisma: any;

  const mockPrisma = {
    order: {
      findMany: jest.fn(),
    },
    wishlistItem: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    contract: {
      findMany: jest.fn(),
    },
    freelancerSkill: {
      findMany: jest.fn(),
    },
    escrow: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMatchingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiMatchingService>(AiMatchingService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductRecommendations', () => {
    it('should return product recommendations based on user behavior', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          userId: 'user-1',
          items: [
            {
              productId: 'prod-1',
              product: {
                id: 'prod-1',
                categories: [{ categoryId: 'cat-1', id: 'cat-1' }],
              },
            },
          ],
        },
      ]);

      mockPrisma.wishlistItem.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-2',
          name: 'Recommended Product',
          price: { toNumber: () => 100 },
          images: ['img1.jpg'],
          status: 'ACTIVE',
          createdAt: new Date(),
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Electronics' },
          store: { id: 'store-1', name: 'Test Store' },
          reviewCount: 5,
          averageRating: 4.5,
        },
      ]);

      const result = await service.getProductRecommendations('user-1', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe('prod-2');
      expect(result[0].type).toBe('product');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should return empty array when no products available', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.wishlistItem.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.getProductRecommendations('user-1', 10);

      expect(result).toHaveLength(0);
    });
  });

  describe('getJobRecommendations', () => {
    it('should return job recommendations for a freelancer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'freelancer-1',
        firstName: 'John',
        lastName: 'Doe',
        roles: [{ role: 'FREELANCER' }],
        averageRating: 4.5,
        freelancerProfile: { id: 'fp-1', hourlyRate: 50 },
      });

      mockPrisma.job.findMany.mockResolvedValue([
        {
          id: 'job-1',
          title: 'Build a NestJS API',
          status: 'OPEN',
          freelancerId: null,
          budgetMin: { toNumber: () => 40 },
          budgetMax: { toNumber: () => 60 },
          currency: 'USD',
          createdAt: new Date(),
          skills: [{ skill: { name: 'TypeScript' }, skillId: 'skill-1' }],
          clientId: 'client-1',
          _count: { proposals: 2 },
        },
      ]);

      mockPrisma.contract.findMany.mockResolvedValue([]);

      const result = await service.getJobRecommendations('freelancer-1', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe('job-1');
      expect(result[0].type).toBe('job');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent freelancer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getJobRecommendations('nonexistent', 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('matchFreelancersForJob', () => {
    it('should return scored freelancer matches for a job', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Build API',
        budgetMin: { toNumber: () => 80 },
        budgetMax: { toNumber: () => 120 },
        skills: [{ skill: { name: 'TypeScript' }, skillId: 'skill-1' }],
      });

      mockPrisma.freelancerSkill.findMany.mockResolvedValue([
        { skill: { name: 'TypeScript' }, skillId: 'skill-1' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'freelancer-1',
          firstName: 'John',
          lastName: 'Doe',
          roles: [{ role: 'FREELANCER' }],
          isVerified: true,
          averageRating: 4.5,
          avatar: 'avatar.jpg',
          freelancerProfile: {
            id: 'fp-1',
            hourlyRate: 80,
            maxConcurrentProjects: 5,
            completedJobs: 10,
          },
        },
      ]);

      mockPrisma.escrow.count.mockResolvedValue(1);

      const result = await service.matchFreelancersForJob('job-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].freelancerId).toBe('freelancer-1');
      expect(result[0].freelancerName).toBe('John Doe');
      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].skillMatch).toBe(100); // Perfect skill match
      expect(result[0].completedProjects).toBe(10);
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(
        service.matchFreelancersForJob('nonexistent', 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no freelancers available', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Build API',
        budget: { toNumber: () => 100 },
        skills: [],
      });

      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.matchFreelancersForJob('job-1', 10);

      expect(result).toHaveLength(0);
    });

    it('should penalize freelancers with many active projects', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Build API',
        budgetMin: { toNumber: () => 80 },
        budgetMax: { toNumber: () => 120 },
        skills: [{ skill: { name: 'TypeScript' }, skillId: 'skill-1' }],
      });

      mockPrisma.freelancerSkill.findMany.mockResolvedValue([
        { skill: { name: 'TypeScript' }, skillId: 'skill-1' },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'freelancer-1',
          firstName: 'Busy',
          lastName: 'Person',
          roles: [{ role: 'FREELANCER' }],
          isVerified: true,
          averageRating: 4.0,
          freelancerProfile: {
            id: 'fp-1',
            hourlyRate: 80,
            maxConcurrentProjects: 3,
            completedJobs: 5,
          },
        },
        {
          id: 'freelancer-2',
          firstName: 'Available',
          lastName: 'Person',
          roles: [{ role: 'FREELANCER' }],
          isVerified: true,
          averageRating: 4.0,
          freelancerProfile: {
            id: 'fp-2',
            hourlyRate: 80,
            maxConcurrentProjects: 5,
            completedJobs: 5,
          },
        },
      ]);

      // Busy person has 3 active (max), Available has 0 active
      mockPrisma.escrow.count
        .mockResolvedValueOnce(3) // freelancer-1: fully booked
        .mockResolvedValueOnce(0); // freelancer-2: fully available

      const result = await service.matchFreelancersForJob('job-1', 10);

      expect(result).toHaveLength(2);
      // Available freelancer should score higher
      expect(result[0].freelancerId).toBe('freelancer-2');
      expect(result[0].availabilityScore).toBeGreaterThan(
        result[1].availabilityScore,
      );
    });
  });
});
