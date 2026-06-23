import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from './contract.service';
import { PrismaService } from '@adbar/common';

describe('ContractService', () => {
  let service: ContractService;
  let prisma: any;

  const mockPrisma = {
    contract: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    proposal: {
      findUnique: jest.fn(),
    },
    job: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    milestone: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContractFromProposal', () => {
    it('should create a contract from an accepted proposal', async () => {
      const mockProposal = {
        id: 'prop-1',
        status: 'ACCEPTED',
        jobId: 'job-1',
        freelancerId: 'freelancer-1',
        job: { postedById: 'client-1' },
      };

      const mockContract = {
        id: 'contract-1',
        contractNumber: 'CTR-123',
        status: 'DRAFT',
        totalAmount: 5000,
      };

      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.contract.create.mockResolvedValue(mockContract);
      mockPrisma.job.update.mockResolvedValue({});

      const result = await service.createContractFromProposal(
        {
          proposalId: 'prop-1',
          jobId: 'job-1',
          freelancerId: 'freelancer-1',
          totalAmount: 5000,
          milestones: [{ title: 'Phase 1', amount: 2500 }],
        },
        'client-1',
      );

      expect(result).toEqual(mockContract);
      expect(mockPrisma.contract.create).toHaveBeenCalled();
    });

    it('should throw error if proposal is not accepted', async () => {
      const mockProposal = {
        id: 'prop-1',
        status: 'PENDING',
        jobId: 'job-1',
        job: { postedById: 'client-1' },
      };

      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.createContractFromProposal(
          { proposalId: 'prop-1', jobId: 'job-1', freelancerId: 'freelancer-1', totalAmount: 5000 },
          'client-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('signContract', () => {
    it('should allow freelancer to sign', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        status: 'DRAFT',
        freelancerSignedAt: null,
        clientSignedAt: null,
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contract.update.mockResolvedValue({
        ...mockContract,
        status: 'PARTIALLY_SIGNED',
        freelancerSignedAt: new Date(),
      });

      const result = await service.signContract('contract-1', 'freelancer-1');
      expect(result.status).toBe('PARTIALLY_SIGNED');
    });

    it('should set status to ACTIVE when both parties sign', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        status: 'PARTIALLY_SIGNED',
        freelancerSignedAt: new Date(),
        clientSignedAt: null,
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contract.update.mockResolvedValue({
        ...mockContract,
        status: 'ACTIVE',
        clientSignedAt: new Date(),
      });

      const result = await service.signContract('contract-1', 'client-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error if already signed', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
        status: 'DRAFT',
        freelancerSignedAt: new Date(),
        clientSignedAt: null,
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);

      await expect(
        service.signContract('contract-1', 'freelancer-1'),
      ).rejects.toThrow();
    });
  });

  describe('addMilestone', () => {
    it('should add a milestone to a draft contract', async () => {
      const mockContract = {
        id: 'contract-1',
        clientId: 'client-1',
        status: 'DRAFT',
      };

      const mockMilestone = {
        id: 'ms-1',
        title: 'Phase 2',
        amount: 2500,
        order: 0,
        status: 'PENDING',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.milestone.findFirst.mockResolvedValue(null);
      mockPrisma.milestone.create.mockResolvedValue(mockMilestone);
      mockPrisma.contract.update.mockResolvedValue({});

      const result = await service.addMilestone(
        'contract-1',
        { title: 'Phase 2', amount: 2500 },
        'client-1',
      );

      expect(result).toEqual(mockMilestone);
    });
  });

  describe('submitMilestone', () => {
    it('should allow freelancer to submit milestone', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
      };

      const mockMilestone = {
        id: 'ms-1',
        contractId: 'contract-1',
        status: 'PENDING',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockMilestone);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockMilestone,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });

      const result = await service.submitMilestone(
        'contract-1',
        'ms-1',
        { deliverables: 'Done' },
        'freelancer-1',
      );

      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('approveMilestone', () => {
    it('should allow client to approve submitted milestone', async () => {
      const mockContract = {
        id: 'contract-1',
        clientId: 'client-1',
        jobId: 'job-1',
      };

      const mockMilestone = {
        id: 'ms-1',
        contractId: 'contract-1',
        status: 'SUBMITTED',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockMilestone);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockMilestone,
        status: 'APPROVED',
        approvedAt: new Date(),
      });
      mockPrisma.milestone.count.mockResolvedValue(0);
      mockPrisma.contract.update.mockResolvedValue({});
      mockPrisma.job.update.mockResolvedValue({});

      const result = await service.approveMilestone(
        'contract-1',
        'ms-1',
        { approved: true },
        'client-1',
      );

      expect(result.status).toBe('APPROVED');
    });
  });

  describe('rejectMilestone', () => {
    it('should allow client to reject submitted milestone', async () => {
      const mockContract = {
        id: 'contract-1',
        clientId: 'client-1',
      };

      const mockMilestone = {
        id: 'ms-1',
        contractId: 'contract-1',
        status: 'SUBMITTED',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockMilestone);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockMilestone,
        status: 'REJECTED',
        rejectedAt: new Date(),
      });

      const result = await service.rejectMilestone(
        'contract-1',
        'ms-1',
        { notes: 'Needs revision' },
        'client-1',
      );

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('getContract', () => {
    it('should return a contract for a party member', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);

      const result = await service.getContract('contract-1', 'freelancer-1');
      expect(result).toEqual(mockContract);
    });

    it('should throw ForbiddenException for non-party user', async () => {
      const mockContract = {
        id: 'contract-1',
        freelancerId: 'freelancer-1',
        clientId: 'client-1',
      };

      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });

      await expect(
        service.getContract('contract-1', 'other-user'),
      ).rejects.toThrow();
    });
  });
});
