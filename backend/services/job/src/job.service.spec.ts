import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { PrismaService } from '@adbar/common';

describe('JobService', () => {
  let service: JobService;
  let prisma: any;

  const mockPrisma = {
    job: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    proposal: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Build a website',
        type: 'FULL_TIME',
        budget: 5000,
        status: 'OPEN',
        postedById: 'user-1',
      };

      mockPrisma.job.create.mockResolvedValue(mockJob);

      const result = await service.createJob(
        {
          title: 'Build a website',
          description: 'Need a full-stack developer',
          type: 'FULL_TIME',
          budget: 5000,
          skills: ['React', 'Node.js'],
        },
        'user-1',
      );

      expect(result).toEqual(mockJob);
      expect(mockPrisma.job.create).toHaveBeenCalled();
    });
  });

  describe('updateJob', () => {
    it('should update an open job', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Old Title',
        status: 'OPEN',
        clientId: 'user-1',
      };

      const updatedJob = {
        ...mockJob,
        title: 'New Title',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.job.update.mockResolvedValue(updatedJob);

      const result = await service.updateJob('job-1', { title: 'New Title' }, 'user-1');

      expect(result.title).toBe('New Title');
    });

    it('should throw error for non-existent job', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(
        service.updateJob('nonexistent', { title: 'Test' }, 'user-1'),
      ).rejects.toThrow();
    });

    it('should throw error if user is not the owner', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        clientId: 'user-2',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: [{ role: 'user' }] });

      await expect(
        service.updateJob('job-1', { title: 'Test' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('deleteJob', () => {
    it('should delete an open job', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        clientId: 'user-1',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.job.delete.mockResolvedValue(mockJob);

      await service.deleteJob('job-1', 'user-1');

      expect(mockPrisma.job.delete).toHaveBeenCalledWith({ where: { id: 'job-1' } });
    });

    it('should throw error for non-open job', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'IN_PROGRESS',
        clientId: 'user-1',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);

      await expect(
        service.deleteJob('job-1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('getJob', () => {
    it('should return a job by ID', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        status: 'OPEN',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);

      const result = await service.getJob('job-1');
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.getJob('nonexistent')).rejects.toThrow();
    });
  });

  describe('listJobs', () => {
    it('should return paginated jobs with filters', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Job 1', type: 'FULL_TIME', budget: 5000, status: 'OPEN' },
        { id: 'job-2', title: 'Job 2', type: 'PART_TIME', budget: 3000, status: 'OPEN' },
      ];

      mockPrisma.job.findMany.mockResolvedValue(mockJobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const result = await service.listJobs({ page: 1, limit: 20 }, { type: 'FULL_TIME' });

      expect(result.data).toEqual(mockJobs);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe('createProposal', () => {
    it('should create a proposal for an open job', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        postedById: 'client-1',
      };

      const mockProposal = {
        id: 'prop-1',
        jobId: 'job-1',
        freelancerId: 'freelancer-1',
        coverLetter: 'I can do this job',
        proposedAmount: 4500,
        status: 'PENDING',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.proposal.findFirst.mockResolvedValue(null);
      mockPrisma.proposal.create.mockResolvedValue(mockProposal);

      const result = await service.createProposal(
        'job-1',
        { coverLetter: 'I can do this job', proposedAmount: 4500, estimatedDays: 14 },
        'freelancer-1',
      );

      expect(result).toEqual(mockProposal);
    });

    it('should throw error if job is not open', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'CLOSED',
        postedById: 'client-1',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);

      await expect(
        service.createProposal(
          'job-1',
          { coverLetter: 'Test', proposedAmount: 1000, estimatedDays: 7 },
          'freelancer-1',
        ),
      ).rejects.toThrow();
    });

    it('should throw error if already submitted', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        postedById: 'client-1',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.proposal.findFirst.mockResolvedValue({ id: 'prop-existing' });

      await expect(
        service.createProposal(
          'job-1',
          { coverLetter: 'Test', proposedAmount: 1000, estimatedDays: 7 },
          'freelancer-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getJobProposals', () => {
    it('should return proposals for job owner', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        clientId: 'user-1',
      };

      const mockProposals = [
        { id: 'prop-1', proposedAmount: 4500, status: 'PENDING' },
        { id: 'prop-2', proposedAmount: 5000, status: 'PENDING' },
      ];

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

      const result = await service.getJobProposals('job-1', 'user-1');
      expect(result).toEqual(mockProposals);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'OPEN',
        clientId: 'other-user',
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: [{ role: 'user' }] });

      await expect(
        service.getJobProposals('job-1', 'user-1'),
      ).rejects.toThrow();
    });
  });
});
