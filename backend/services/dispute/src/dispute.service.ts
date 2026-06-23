import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';

export interface DisputeRecord {
  id: string;
  reporterId: string;
  openedById: string; // alias for reporterId
  orderId: string | null;
  contractId: string | null;
  type: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: string;
  resolution?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceRecord {
  id: string;
  type: string;
  description: string;
  fileUrl?: string;
  submittedById: string;
  createdAt: Date;
}

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== OPEN DISPUTE ==========

  async openDispute(data: any, userId: string): Promise<DisputeRecord> {
    this.logger.log(`Opening dispute for order: ${data.orderId} by user: ${userId}`);

    const dispute = await this.prisma.dispute.create({
      data: {
        reporterId: userId,
        orderId: data.orderId,
        contractId: data.contractId || null,
        type: data.type || 'service',
        reason: data.reason,
        description: data.description,
        evidenceUrls: data.evidenceUrls || [],
        status: 'OPEN',
        resolution: data.desiredResolution,
      },
    });

    this.logger.log(`Dispute ${dispute.id} opened for order ${data.orderId}`);

    return this.mapDisputeRecord(dispute);
  }

  // ========== GET DISPUTE ==========

  async getDispute(disputeId: string, userId: string): Promise<DisputeRecord> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute "${disputeId}" not found`);
    }

    // Only the reporter or involved parties can view
    if (dispute.reporterId !== userId) {
      // In a real system, check for admin role here
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return this.mapDisputeRecord(dispute);
  }

  // ========== GET USER DISPUTES ==========

  async getUserDisputes(userId: string): Promise<DisputeRecord[]> {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        reporterId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((d) => this.mapDisputeRecord(d));
  }

  // ========== ADD EVIDENCE ==========

  async addEvidence(
    disputeId: string,
    data: any,
    userId: string,
  ): Promise<EvidenceRecord> {
    this.logger.log(`Adding evidence to dispute ${disputeId} by user: ${userId}`);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute "${disputeId}" not found`);
    }

    // Only reporter can add evidence
    if (dispute.reporterId !== userId) {
      throw new ForbiddenException('You cannot add evidence to this dispute');
    }

    // Cannot add evidence to resolved/closed disputes
    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      throw new BadRequestException(
        `Cannot add evidence to a dispute with status "${dispute.status}"`,
      );
    }

    // Store evidence as JSON in evidenceUrls or a separate record
    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        evidenceUrls: [...(dispute.evidenceUrls || []), data.fileUrl].filter(Boolean),
      },
    });

    this.logger.log(`Evidence added to dispute ${disputeId}`);

    return {
      id: disputeId,
      type: data.type || 'document',
      description: data.description,
      fileUrl: data.fileUrl,
      submittedById: userId,
      createdAt: updatedDispute.createdAt,
    };
  }

  // ========== RESOLVE DISPUTE ==========

  async resolveDispute(
    disputeId: string,
    data: any,
    adminId: string,
  ): Promise<DisputeRecord> {
    this.logger.log(`Resolving dispute ${disputeId} by admin: ${adminId}`);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute "${disputeId}" not found`);
    }

    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      throw new BadRequestException(`Dispute is already in "${dispute.status}" status`);
    }

    // Perform fund distribution based on resolution
    await this.distributeFunds(dispute, data);

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: data.resolution,
        resolutionNote: data.resolutionNote,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
    });

    this.logger.log(
      `Dispute ${disputeId} resolved with "${data.resolution}".`,
    );

    return this.mapDisputeRecord(updatedDispute);
  }

  // ========== ESCALATE DISPUTE ==========

  async escalateDispute(
    disputeId: string,
    data: any,
    userId: string,
  ): Promise<DisputeRecord> {
    this.logger.log(`Escalating dispute ${disputeId} by user: ${userId}`);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute "${disputeId}" not found`);
    }

    // Only reporter can escalate
    if (dispute.reporterId !== userId) {
      throw new ForbiddenException('You cannot escalate this dispute');
    }

    if (dispute.status === 'ESCALATED') {
      throw new BadRequestException('Dispute is already escalated');
    }

    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      throw new BadRequestException(`Cannot escalate a dispute with status "${dispute.status}"`);
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'ESCALATED',
        resolutionNote: data.reason,
      },
    });

    this.logger.log(`Dispute ${disputeId} escalated. Reason: ${data.reason}`);

    return this.mapDisputeRecord(updatedDispute);
  }

  // ========== FUND DISTRIBUTION ==========

  private async distributeFunds(dispute: any, resolution: any): Promise<void> {
    if (!dispute.orderId) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dispute.orderId },
    });

    if (!order) {
      return;
    }

    switch (resolution.resolution) {
      case 'REFUND_BUYER': {
        // Full refund to buyer
        await this.prisma.order.update({
          where: { id: dispute.orderId },
          data: { status: 'REFUNDED' },
        });
        break;
      }

      case 'PAY_SELLER': {
        // Full payment to seller, no refund
        await this.prisma.order.update({
          where: { id: dispute.orderId },
          data: { status: 'DELIVERED' },
        });
        break;
      }

      case 'PARTIAL_REFUND': {
        // Partial refund to buyer, remainder to seller
        await this.prisma.order.update({
          where: { id: dispute.orderId },
          data: { status: 'REFUNDED' },
        });
        break;
      }

      case 'NO_ACTION':
      default:
        break;
    }
  }

  // ========== MAPPER ==========

  private mapDisputeRecord(dispute: any): DisputeRecord {
    return {
      id: dispute.id,
      reporterId: dispute.reporterId,
      openedById: dispute.reporterId,
      orderId: dispute.orderId,
      contractId: dispute.contractId,
      type: dispute.type,
      reason: dispute.reason,
      description: dispute.description,
      evidenceUrls: dispute.evidenceUrls || [],
      status: dispute.status,
      resolution: dispute.resolution ?? undefined,
      resolutionNote: dispute.resolutionNote ?? undefined,
      resolvedBy: dispute.resolvedBy ?? undefined,
      resolvedAt: dispute.resolvedAt ?? undefined,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }
}
