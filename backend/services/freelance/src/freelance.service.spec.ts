import { Test, TestingModule } from '@nestjs/testing';
import { FreelanceService } from './freelance.service';
import { PrismaService } from '@adbar/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProfileDto } from './dto/freelance.dto';

describe('FreelanceService', () => {
  let service: FreelanceService;
  let prisma: any;

  const mockPrisma = {
    freelancerProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    portfolioItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    skill: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    freelancerSkill: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    freelancerExperience: {
      create: jest.fn(),
    },
    freelancerEducation: {
      create: jest.fn(),
    },
    freelancerCertification: {
      create: jest.fn(),
    },
    freelancerLanguage: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreelanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FreelanceService>(FreelanceService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const createDto: CreateProfileDto = {
      headline: 'Full-Stack Developer',
      bio: 'Experienced developer with 5+ years.',
      hourlyRate: 50,
      currency: 'USD',
    } as any;

    it('should create a profile if none exists', async () => {
      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(null);
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        headline: 'Full-Stack Developer',
        overview: 'Experienced developer with 5+ years.',
        hourlyRate: { toNumber: () => 50 },
        currency: 'USD',
        availability: 'full_time',
      };
      mockPrisma.freelancerProfile.create.mockResolvedValue(mockProfile);

      const result = await service.createProfile('user-1', createDto);

      expect(result.id).toBe('profile-1');
      expect(result.headline).toBe('Full-Stack Developer');
    });

    it('should throw ConflictException if profile already exists', async () => {
      mockPrisma.freelancerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
      });

      await expect(
        service.createProfile('user-1', createDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile when owner requests', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        headline: 'Old Headline',
        overview: 'Old bio',
        hourlyRate: { toNumber: () => 40 },
        currency: 'USD',
        availability: 'full_time',
      };

      const mockUpdated = {
        ...mockProfile,
        headline: 'New Headline',
        overview: 'Updated bio',
      };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.freelancerProfile.update.mockResolvedValue(mockUpdated);

      const result = await service.updateProfile('user-1', {
        headline: 'New Headline',
        bio: 'Updated bio',
      });

      expect(result.headline).toBe('New Headline');
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-1', { headline: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return profile when found', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        headline: 'Developer',
        overview: null,
        hourlyRate: { toNumber: () => 50 },
        currency: 'USD',
        availability: 'full_time',
        skills: [],
        portfolioItems: [],
        experiences: [],
        educations: [],
        certifications: [],
        languages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('profile-1');
      expect(result.headline).toBe('Developer');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getProfile('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPortfolioItem', () => {
    it('should add portfolio item to profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
      };

      const mockPortfolioItem = {
        id: 'portfolio-1234567890',
        freelancerProfileId: 'profile-1',
        title: 'E-commerce Platform',
        description: 'Built with React',
        imageUrl: null,
        videoUrl: null,
        documentUrl: null,
        externalUrl: null,
        sortOrder: 0,
        createdAt: new Date(),
      };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.portfolioItem.create.mockResolvedValue(mockPortfolioItem);

      const result = await service.addPortfolioItem('user-1', {
        title: 'E-commerce Platform',
        description: 'Built with React',
      });

      expect(result.id).toBe('portfolio-1234567890');
      expect(result.title).toBe('E-commerce Platform');
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.addPortfolioItem('other-user', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addSkill', () => {
    it('should add skill to profile', async () => {
      const mockProfile = { id: 'profile-1', userId: 'user-1' };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.skill.findUnique.mockResolvedValue(null);
      mockPrisma.skill.create.mockResolvedValue({ id: 'skill-1', name: 'Python', slug: 'python' });
      mockPrisma.freelancerSkill.findUnique.mockResolvedValue(null);
      mockPrisma.freelancerSkill.create.mockResolvedValue({});

      const updatedProfile = {
        id: 'profile-1',
        userId: 'user-1',
        skills: [{ skill: { name: 'Python' } }],
        portfolioItems: [],
        experiences: [],
        educations: [],
        certifications: [],
        languages: [],
      };
      mockPrisma.freelancerProfile.findUnique.mockResolvedValueOnce(mockProfile);
        mockPrisma.freelancerProfile.findUnique.mockResolvedValueOnce(updatedProfile);

      const result = await service.addSkill('user-1', { name: 'Python', level: 'expert' });

      expect(result).toBeDefined();
    });

    it('should throw ConflictException for duplicate skill', async () => {
      const mockProfile = { id: 'profile-1', userId: 'user-1' };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.skill.findUnique.mockResolvedValue({ id: 'skill-1', name: 'TypeScript', slug: 'typescript' });
      mockPrisma.freelancerSkill.findUnique.mockResolvedValue({ id: 'fs-1' });

      await expect(
        service.addSkill('user-1', { name: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listFreelancers', () => {
    it('should return paginated freelancer list', async () => {
      const mockProfiles = [
        {
          id: 'p1',
          userId: 'user-1',
          headline: 'Developer',
          overview: null,
          hourlyRate: { toNumber: () => 50 },
          currency: 'USD',
          availability: 'full_time',
          skills: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.freelancerProfile.findMany.mockResolvedValue(mockProfiles);
      mockPrisma.freelancerProfile.count.mockResolvedValue(1);

      const result = await service.listFreelancers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by skill when provided', async () => {
      mockPrisma.freelancerProfile.findMany.mockResolvedValue([]);
      mockPrisma.freelancerProfile.count.mockResolvedValue(0);

      await service.listFreelancers({ skill: 'TypeScript', page: 1, limit: 20 });

      expect(mockPrisma.freelancerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            skills: expect.anything(),
          }),
        }),
      );
    });

    it('should filter by rate range when provided', async () => {
      mockPrisma.freelancerProfile.findMany.mockResolvedValue([]);
      mockPrisma.freelancerProfile.count.mockResolvedValue(0);

      await service.listFreelancers({ minRate: 30, maxRate: 100, page: 1, limit: 20 });

      expect(mockPrisma.freelancerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hourlyRate: { gte: 30, lte: 100 },
          }),
        }),
      );
    });
  });

  describe('addExperience', () => {
    it('should add experience to profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
      };

      const mockExperience = {
        id: 'exp-1234567890',
        freelancerProfileId: 'profile-1',
        company: 'Acme Corp',
        title: 'Senior Developer',
        startDate: new Date('2020-01-01'),
        endDate: null,
        isCurrent: true,
        description: null,
        location: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.freelancerExperience.create.mockResolvedValue(mockExperience);

      const result = await service.addExperience('user-1', {
        company: 'Acme Corp',
        title: 'Senior Developer',
        startDate: '2020-01-01',
        isCurrent: true,
      });

      expect(result.id).toBe('exp-1234567890');
      expect(result.company).toBe('Acme Corp');
    });
  });

  describe('addCertification', () => {
    it('should add certification to profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
      };

      const mockCertification = {
        id: 'cert-1234567890',
        freelancerProfileId: 'profile-1',
        name: 'AWS Solutions Architect',
        issuingOrganization: 'Amazon',
        issueDate: new Date('2022-06-01'),
        expiryDate: null,
        credentialId: null,
        credentialUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.freelancerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.freelancerCertification.create.mockResolvedValue(mockCertification);

      const result = await service.addCertification('user-1', {
        name: 'AWS Solutions Architect',
        issuingOrganization: 'Amazon',
        issueDate: '2022-06-01',
      });

      expect(result.id).toBe('cert-1234567890');
      expect(result.name).toBe('AWS Solutions Architect');
    });
  });
});
