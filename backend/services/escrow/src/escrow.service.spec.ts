import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { PrismaService } from '@adbar/common';
import { ConflictException, ResourceNotFoundException, ForbiddenActionException } from '@adbar/common';
import { CreateEscrowDto, EscrowStatus } from './dto/create-escrow.dto';

describe('EscrowService', () => {
  let service: EscrowService;
  let prisma: any;

  const mockPrisma = {
    escrow: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    escrowMilestone: {
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEscrow', () => {
    const createDto: CreateEscrowDto = {
      contractId: 'contract-1',
      currency: 'USD',
      totalAmount: 1000,
      clientId: 'client-1',
      freelancerId: 'freelancer-1',
      projectTitle: 'Website Redesign',
      commissionRate: 0.1,
      milestones: [
        { title: 'Design', amount: 400 },
        { title: 'Development', amount: 600 },
      ],
    };

    it('should create escrow with milestones and commission', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        contractId: 'contract-1',
        clientId: 'client-1',
        freelancerId: 'freelancer-1',
        currency: 'USD',
        amount: { toNumber: () => 1000 },
        commissionRate: { toNumber: () => 0.1 },
        commissionAmount: { toNumber: () => 100 },
        netAmount: { toNumber: () => 900 },
        status: 'PENDING',
        projectTitle: 'Website Redesign',
        projectDescription: null,
        milestones: [
          { milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'PENDING', dueDate: null, releasedAt: null },
          { milestoneIndex: 1, title: 'Development', amount: { toNumber: () => 600 }, status: 'PENDING', dueDate: null, releasedAt: null },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.escrow.create.mockResolvedValue(mockEscrow);

      const result = await service.createEscrow('client-1', createDto);

      expect(result.id).toBe('escrow-1');
      expect(result.totalAmount).toBe(1000);
      expect(result.commissionAmount).toBe(100);
      expect(result.netAmount).toBe(900);
      expect(result.milestones).toHaveLength(2);
    });

    it('should throw ConflictException when milestone amounts do not sum to total', async () => {
      const invalidDto = {
        ...createDto,
        milestones: [
          { title: 'Design', amount: 300 },
          { title: 'Development', amount: 500 },
        ],
      };

      await expect(
        service.createEscrow('client-1', invalidDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('fundEscrow', () => {
    it('should fund escrow when client requests and status is pending_funding', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'PENDING',
        milestones: [],
      };

      const mockUpdatedEscrow = {
        ...mockEscrow,
        status: 'FUNDED',
        amount: { toNumber: () => 1000 },
        commissionRate: { toNumber: () => 0.1 },
        commissionAmount: { toNumber: () => 100 },
        netAmount: { toNumber: () => 900 },
        projectTitle: 'Test',
        projectDescription: null,
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedEscrow]);

      const result = await service.fundEscrow('escrow-1', 'client-1', {
        provider: 'stripe',
        paymentMethodId: 'pm_123',
      });

      expect(result.status).toBe('FUNDED');
    });

    it('should throw ForbiddenActionException when non-client tries to fund', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'PENDING',
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      await expect(
        service.fundEscrow('escrow-1', 'other-user', {
          provider: 'stripe',
          paymentMethodId: 'pm_123',
        }),
      ).rejects.toThrow(ForbiddenActionException);
    });

    it('should throw ConflictException when escrow is not in pending_funding status', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'FUNDED',
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      await expect(
        service.fundEscrow('escrow-1', 'client-1', {
          provider: 'stripe',
          paymentMethodId: 'pm_123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseMilestone', () => {
    it('should release milestone with commission deduction', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'FUNDED',
        commissionRate: { toNumber: () => 0.1 },
        milestones: [
          { milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'IN_PROGRESS' },
          { milestoneIndex: 1, title: 'Dev', amount: { toNumber: () => 600 }, status: 'IN_PROGRESS' },
        ],
      };

      const mockUpdatedEscrow = {
        ...mockEscrow,
        status: 'RELEASED',
        amount: { toNumber: () => 1000 },
        commissionAmount: { toNumber: () => 100 },
        netAmount: { toNumber: () => 900 },
        projectTitle: 'Test',
        projectDescription: null,
        milestones: [
          { milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'PAID', dueDate: null, releasedAt: new Date() },
          { milestoneIndex: 1, title: 'Dev', amount: { toNumber: () => 600 }, status: 'IN_PROGRESS', dueDate: null, releasedAt: null },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFinalEscrow = {
        ...mockUpdatedEscrow,
        milestones: [
          { milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'PAID', dueDate: null, releasedAt: new Date() },
          { milestoneIndex: 1, title: 'Dev', amount: { toNumber: () => 600 }, status: 'IN_PROGRESS', dueDate: null, releasedAt: null },
        ],
      };

      mockPrisma.escrow.findUnique
        .mockResolvedValueOnce(mockEscrow)
        .mockResolvedValueOnce(mockFinalEscrow);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedEscrow]);
      mockPrisma.escrowMilestone.count.mockResolvedValue(1);

      const result = await service.releaseMilestone('escrow-1', 0, 'client-1', {});

      expect(result.status).toBe('RELEASED');
    });

    it('should throw ForbiddenActionException when non-client tries to release', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'FUNDED',
        commissionRate: { toNumber: () => 0.1 },
        milestones: [{ milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'IN_PROGRESS' }],
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      await expect(
        service.releaseMilestone('escrow-1', 0, 'other-user', {}),
      ).rejects.toThrow(ForbiddenActionException);
    });
  });

  describe('refundEscrow', () => {
    it('should refund escrow and mark milestones as refunded', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'FUNDED',
        amount: { toNumber: () => 1000 },
        commissionRate: { toNumber: () => 0.1 },
        commissionAmount: { toNumber: () => 100 },
        netAmount: { toNumber: () => 900 },
        projectTitle: 'Test',
        projectDescription: null,
        milestones: [
          { milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'IN_PROGRESS', dueDate: null, releasedAt: null },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedEscrow = {
        ...mockEscrow,
        status: 'REFUNDED',
        milestones: [{ milestoneIndex: 0, title: 'Design', amount: { toNumber: () => 400 }, status: 'REJECTED', dueDate: null, releasedAt: null }],
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedEscrow]);

      const result = await service.refundEscrow('escrow-1', 'client-1', {
        reason: 'Project cancelled',
      });

      expect(result.status).toBe('REFUNDED');
    });

    it('should throw ConflictException when escrow is already refunded', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        status: 'REFUNDED',
        amount: { toNumber: () => 1000 },
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      await expect(
        service.refundEscrow('escrow-1', 'client-1', { reason: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getEscrowStatus', () => {
    it('should return escrow details for authorized user', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        freelancerId: 'freelancer-1',
        currency: 'USD',
        amount: { toNumber: () => 1000 },
        commissionRate: { toNumber: () => 0.1 },
        commissionAmount: { toNumber: () => 100 },
        netAmount: { toNumber: () => 900 },
        status: 'FUNDED',
        projectTitle: 'Test',
        projectDescription: null,
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      const result = await service.getEscrowStatus('escrow-1', 'client-1');

      expect(result.id).toBe('escrow-1');
      expect(result.status).toBe('FUNDED');
    });

    it('should throw ForbiddenActionException for unauthorized user', async () => {
      const mockEscrow = {
        id: 'escrow-1',
        clientId: 'client-1',
        freelancerId: 'freelancer-1',
      };

      mockPrisma.escrow.findUnique.mockResolvedValue(mockEscrow);

      await expect(
        service.getEscrowStatus('escrow-1', 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenActionException);
    });

    it('should throw ResourceNotFoundException when escrow not found', async () => {
      mockPrisma.escrow.findUnique.mockResolvedValue(null);

      await expect(
        service.getEscrowStatus('nonexistent', 'user-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
