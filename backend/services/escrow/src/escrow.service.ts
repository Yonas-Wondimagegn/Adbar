import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { ConflictException, ResourceNotFoundException, ForbiddenActionException } from '@adbar/common';
import {
  CreateEscrowDto,
  FundEscrowDto,
  ReleaseMilestoneDto,
  RefundEscrowDto,
  EscrowStatus,
} from './dto/create-escrow.dto';

export interface EscrowRecord {
  id: string;
  contractId: string;
  clientId: string;
  freelancerId: string;
  currency: string;
  amount: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  status: EscrowStatus;
  projectTitle: string;
  projectDescription?: string;
  milestones: MilestoneRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneRecord {
  index: number;
  title: string;
  amount: number;
  status: string;
  dueDate?: string;
  releasedAt?: Date;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new escrow agreement with milestones.
   */
  async createEscrow(createdBy: string, dto: CreateEscrowDto): Promise<EscrowRecord> {
    this.logger.log(`Creating escrow for contract: ${dto.contractId} by user: ${createdBy}`);

    // Validate milestone amounts sum to total
    const milestoneTotal = dto.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(milestoneTotal - dto.totalAmount) > 0.001) {
      throw new ConflictException(
        `Milestone amounts (${milestoneTotal}) must sum to total amount (${dto.totalAmount})`,
      );
    }

    const escrow = await this.prisma.escrow.create({
      data: {
        contractId: dto.contractId,
        clientId: dto.clientId,
        freelancerId: dto.freelancerId,
        currency: dto.currency,
        amount: dto.totalAmount,
        status: EscrowStatus.PENDING,
        milestones: {
          create: dto.milestones.map((m, index) => ({
            milestoneIndex: index,
            title: m.title,
            amount: m.amount,
            status: 'PENDING',
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
          })),
        },
      },
      include: { milestones: true },
    });

    return this.mapEscrowRecord(escrow);
  }

  /**
   * Fund an escrow agreement. Moves from PENDING to FUNDED.
   */
  async fundEscrow(escrowId: string, fundedBy: string, dto: FundEscrowDto): Promise<EscrowRecord> {
    this.logger.log(`Funding escrow ${escrowId} by user: ${fundedBy}`);

    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new ResourceNotFoundException('Escrow', escrowId);
    }

    if (escrow.clientId !== fundedBy) {
      throw new ForbiddenActionException('fund this escrow - only the client can fund');
    }

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new ConflictException(
        `Cannot fund escrow in '${escrow.status}' status. Must be 'PENDING'.`,
      );
    }

    // Update escrow status and mark milestones as funded
    const updatedEscrow = await this.prisma.$transaction([
      this.prisma.escrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.FUNDED,
          fundedAt: new Date(),
        },
        include: { milestones: true },
      }),
      this.prisma.escrowMilestone.updateMany({
        where: { escrowId },
        data: { status: 'IN_PROGRESS' },
      }),
    ]);

    this.logger.log(`Escrow ${escrowId} funded successfully`);
    return this.mapEscrowRecord(updatedEscrow[0]);
  }

  /**
   * Release a milestone payment to the freelancer.
   */
  async releaseMilestone(
    escrowId: string,
    milestoneIndex: number,
    releasedBy: string,
    dto?: ReleaseMilestoneDto,
  ): Promise<EscrowRecord> {
    this.logger.log(`Releasing milestone ${milestoneIndex} for escrow ${escrowId} by user: ${releasedBy}`);

    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new ResourceNotFoundException('Escrow', escrowId);
    }

    if (escrow.clientId !== releasedBy) {
      throw new ForbiddenActionException('release milestone - only the client can release');
    }

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.RELEASED) {
      throw new ConflictException(
        `Cannot release milestone from escrow in '${escrow.status}' status.`,
      );
    }

    const milestone = escrow.milestones.find((m) => m.milestoneIndex === milestoneIndex);
    if (!milestone) {
      throw new ResourceNotFoundException('Milestone', `index ${milestoneIndex}`);
    }

    if (milestone.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        `Milestone ${milestoneIndex} is in '${milestone.status}' status and cannot be released.`,
      );
    }

    // Update milestone to PAID, mark escrow as RELEASED
    const updatedEscrow = await this.prisma.$transaction([
      this.prisma.escrowMilestone.updateMany({
        where: { escrowId, milestoneIndex },
        data: {
          status: 'PAID',
          releasedAt: new Date(),
        },
      }),
      this.prisma.escrow.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.RELEASED },
        include: { milestones: true },
      }),
    ]);

    // Check if all milestones are released - mark escrow as RELEASED
    const remainingMilestones = await this.prisma.escrowMilestone.count({
      where: { escrowId, status: { not: 'PAID' } },
    });

    if (remainingMilestones === 0) {
      await this.prisma.escrow.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.RELEASED, releasedAt: new Date() },
      });
    }

    this.logger.log(`Milestone ${milestoneIndex} released.`);

    // Re-fetch to get updated milestones
    const finalEscrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    return this.mapEscrowRecord(finalEscrow!);
  }

  /**
   * Refund an escrow or partial amount back to the client.
   */
  async refundEscrow(
    escrowId: string,
    refundedBy: string,
    dto: RefundEscrowDto,
  ): Promise<EscrowRecord> {
    this.logger.log(`Refunding escrow ${escrowId} by user: ${refundedBy}. Reason: ${dto.reason}`);

    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new ResourceNotFoundException('Escrow', escrowId);
    }

    if (escrow.clientId !== refundedBy) {
      throw new ForbiddenActionException('refund this escrow - only the client can refund');
    }

    if (escrow.status === EscrowStatus.REFUNDED) {
      throw new ConflictException(`Escrow is already in '${escrow.status}' status.`);
    }

    // Calculate refund amount
    const refundAmount = dto.amount ?? escrow.amount.toNumber();

    if (refundAmount > escrow.amount.toNumber()) {
      throw new ConflictException('Refund amount exceeds total escrow amount.');
    }

    const updatedEscrow = await this.prisma.$transaction([
      this.prisma.escrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.REFUNDED,
          refundedAt: new Date(),
        },
        include: { milestones: true },
      }),
      this.prisma.escrowMilestone.updateMany({
        where: { escrowId, status: { in: ['IN_PROGRESS', 'PENDING'] } },
        data: { status: 'REJECTED' },
      }),
    ]);

    this.logger.log(`Escrow ${escrowId} refunded: ${refundAmount}`);
    return this.mapEscrowRecord(updatedEscrow[0]);
  }

  /**
   * Get escrow status and details.
   */
  async getEscrowStatus(escrowId: string, requestingUserId: string): Promise<EscrowRecord> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new ResourceNotFoundException('Escrow', escrowId);
    }

    // Only client or freelancer can view
    if (escrow.clientId !== requestingUserId && escrow.freelancerId !== requestingUserId) {
      throw new ForbiddenActionException('view this escrow');
    }

    return this.mapEscrowRecord(escrow);
  }

  /**
   * Map Prisma escrow record to EscrowRecord interface.
   */
  private mapEscrowRecord(escrow: any): EscrowRecord {
    return {
      id: escrow.id,
      contractId: escrow.contractId,
      clientId: escrow.clientId,
      freelancerId: escrow.freelancerId,
      currency: escrow.currency,
      amount: escrow.amount.toNumber(),
      totalAmount: escrow.amount.toNumber(),
      commissionRate: escrow.commissionRate?.toNumber() ?? 0,
      commissionAmount: escrow.commissionAmount?.toNumber() ?? 0,
      netAmount: escrow.netAmount?.toNumber() ?? escrow.amount.toNumber(),
      status: escrow.status,
      projectTitle: escrow.projectTitle,
      projectDescription: escrow.projectDescription ?? undefined,
      milestones: (escrow.milestones ?? []).map((m: any) => ({
        index: m.milestoneIndex,
        title: m.title,
        amount: m.amount.toNumber(),
        status: m.status,
        dueDate: m.dueDate?.toISOString() ?? undefined,
        releasedAt: m.releasedAt?.toISOString() ?? undefined,
      })),
      createdAt: escrow.createdAt,
      updatedAt: escrow.updatedAt,
    };
  }
}
