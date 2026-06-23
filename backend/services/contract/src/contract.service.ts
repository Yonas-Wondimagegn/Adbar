import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== CREATE CONTRACT FROM PROPOSAL ==========

  async createContractFromProposal(data: any, userId: string) {
    // Verify the proposal exists and is accepted
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: data.proposalId },
      include: { job: true },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${data.proposalId} not found`);
    }

    if (proposal.status !== 'ACCEPTED') {
      throw new BadRequestException('Proposal must be accepted before creating a contract');
    }

    // Verify the user is the job poster (client)
    if (proposal.job.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('Only the job poster can create a contract');
      }
    }

    // Create contract with milestones
    const contract = await this.prisma.contract.create({
      data: {
        proposalId: data.proposalId,
        jobId: data.jobId,
        freelancerId: data.freelancerId,
        clientId: userId,
        title: data.title || 'Contract',
        description: data.description,
        totalAmount: data.totalAmount,
        currency: data.currency || 'ETB',
        type: data.type || 'FIXED_PRICE',
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'DRAFT',
        milestones: {
          create: (data.milestones || []).map((m: any, index: number) => ({
            title: m.title,
            description: m.description,
            amount: m.amount,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            status: 'PENDING',
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' as const },
        },
        freelancer: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    // Update job status
    await this.prisma.job.update({
      where: { id: data.jobId },
      data: { status: 'IN_PROGRESS' },
    });

    return contract;
  }

  // ========== SIGN CONTRACT ==========

  async signContract(id: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    // Verify user is a party to the contract
    if (contract.freelancerId !== userId && contract.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('You are not a party to this contract');
      }
    }

    if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGNATURE') {
      throw new BadRequestException('Contract cannot be signed in its current status');
    }

    // Determine new status based on who is signing
    let newStatus: string = contract.status;
    const isClient = contract.clientId === userId;
    const isFreelancer = contract.freelancerId === userId;

    if (isClient && contract.clientSignedAt) {
      throw new BadRequestException('Client has already signed');
    }
    if (isFreelancer && contract.freelancerSignedAt) {
      throw new BadRequestException('Freelancer has already signed');
    }

    const updateData: any = {};

    if (isClient) {
      updateData.clientSignedAt = new Date();
      if (contract.freelancerSignedAt) {
        newStatus = 'ACTIVE';
      } else {
        newStatus = 'PENDING_SIGNATURE';
      }
    }

    if (isFreelancer) {
      updateData.freelancerSignedAt = new Date();
      if (contract.clientSignedAt) {
        newStatus = 'ACTIVE';
      } else {
        newStatus = 'PENDING_SIGNATURE';
      }
    }

    updateData.status = newStatus;

    const updatedContract = await this.prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' as const },
        },
        freelancer: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return updatedContract;
  }

  // ========== ADD MILESTONE ==========

  async addMilestone(contractId: string, data: any, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    if (contract.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('Only the client can add milestones');
      }
    }

    if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGNATURE') {
      throw new BadRequestException('Milestones can only be added before contract is active');
    }

    // Get current max order
    const lastMilestone = await this.prisma.milestone.findFirst({
      where: { contractId },
      orderBy: { createdAt: 'desc' as const },
    });

    const milestone = await this.prisma.milestone.create({
      data: {
        contractId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'PENDING',
      },
    });

    // Update contract total
    await this.prisma.contract.update({
      where: { id: contractId },
      data: { totalAmount: { increment: data.amount } },
    });

    return milestone;
  }

  // ========== SUBMIT MILESTONE ==========

  async submitMilestone(contractId: string, milestoneId: string, data: any, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    if (contract.freelancerId !== userId) {
      throw new ForbiddenException('Only the assigned freelancer can submit milestones');
    }

    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.contractId !== contractId) {
      throw new NotFoundException(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== 'PENDING' && milestone.status !== 'REJECTED') {
      throw new BadRequestException('Milestone cannot be submitted in its current status');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        deliverables: data.deliverables,
      },
    });

    return updatedMilestone;
  }

  // ========== APPROVE MILESTONE ==========

  async approveMilestone(contractId: string, milestoneId: string, data: any, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    if (contract.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('Only the client can approve milestones');
      }
    }

    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.contractId !== contractId) {
      throw new NotFoundException(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted milestones can be approved');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // Check if all milestones are approved - if so, complete the contract
    const pendingMilestones = await this.prisma.milestone.count({
      where: { contractId, status: { not: 'APPROVED' } },
    });

    if (pendingMilestones === 0) {
      await this.prisma.contract.update({
        where: { id: contractId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      await this.prisma.job.update({
        where: { id: contract.jobId },
        data: { status: 'COMPLETED' },
      });
    }

    return updatedMilestone;
  }

  // ========== REJECT MILESTONE ==========

  async rejectMilestone(contractId: string, milestoneId: string, data: any, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    if (contract.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('Only the client can reject milestones');
      }
    }

    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.contractId !== contractId) {
      throw new NotFoundException(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted milestones can be rejected');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: data.notes,
      },
    });

    return updatedMilestone;
  }

  // ========== GET CONTRACT ==========

  async getContract(id: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' as const },
        },
        freelancer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        job: { select: { id: true, title: true, description: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    // Verify user is a party to the contract
    if (contract.freelancerId !== userId && contract.clientId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
      const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('You do not have access to this contract');
      }
    }

    return contract;
  }

  // ========== GET USER CONTRACTS ==========

  async getUserContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: {
        OR: [{ freelancerId: userId }, { clientId: userId }],
      },
      orderBy: { createdAt: 'desc' as const },
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' as const },
        },
        freelancer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
    });
  }
}
