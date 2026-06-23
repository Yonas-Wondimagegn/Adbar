import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== CREATE JOB ==========

  async createJob(data: any, userId: string) {
    const job = await this.prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        budgetMin: data.budget,
        currency: data.currency || 'ETB',
        deadline: data.deadline ? new Date(data.deadline) : null,
        skills: data.skills || [],
        attachments: data.attachments || [],
        status: 'OPEN',
        clientId: userId,
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return job;
  }

  // ========== UPDATE JOB ==========

  async updateJob(id: string, data: any, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (job.clientId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      if (!user?.roles?.some((r: any) => r.role === 'admin')) {
        throw new ForbiddenException('You can only update your own jobs');
      }
    }

    if (job.status !== 'OPEN') {
      throw new BadRequestException('Only open jobs can be updated');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.isRemote !== undefined) updateData.isRemote = data.isRemote;

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return updatedJob;
  }

  // ========== DELETE JOB ==========

  async deleteJob(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (job.clientId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      if (!user?.roles?.some((r: any) => r.role === 'admin')) {
        throw new ForbiddenException('You can only delete your own jobs');
      }
    }

    if (job.status !== 'OPEN') {
      throw new BadRequestException('Only open jobs can be deleted');
    }

    await this.prisma.job.delete({ where: { id } });
  }

  // ========== GET JOB ==========

  async getJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        proposals: {
          select: {
            id: true,
            proposedAmount: true,
            estimatedDays: true,
            status: true,
            createdAt: true,
            freelancer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  // ========== LIST JOBS ==========

  async listJobs(paginationDto: PaginationDto, filters?: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = 'OPEN';
    }

    if (filters?.budget) {
      const budget = parseFloat(filters.budget);
      if (!isNaN(budget)) {
        where.budget = { lte: budget };
      }
    }

    if (filters?.skills) {
      const skillsArray = typeof filters.skills === 'string'
        ? filters.skills.split(',').map((s: string) => s.trim())
        : filters.skills;
      where.skills = { hasSome: skillsArray };
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { proposals: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ========== GET MY JOBS ==========

  async getMyJobs(userId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { clientId: userId };

    const [data, totalItems] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { proposals: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ========== CREATE PROPOSAL ==========

  async createProposal(jobId: string, data: any, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.status !== 'OPEN') {
      throw new BadRequestException('Proposals can only be submitted for open jobs');
    }

    // Check if freelancer already submitted a proposal
    const existingProposal = await this.prisma.proposal.findFirst({
      where: { jobId, freelancerId: userId },
    });

    if (existingProposal) {
      throw new BadRequestException('You have already submitted a proposal for this job');
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        jobId,
        freelancerId: userId,
        coverLetter: data.coverLetter,
        proposedAmount: data.proposedAmount,
        estimatedDays: data.estimatedDays,
        status: 'PENDING',
      },
      include: {
        freelancer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        job: { select: { id: true, title: true, budgetMin: true, budgetMax: true } },
      },
    });

    return proposal;
  }

  // ========== GET JOB PROPOSALS ==========

  async getJobProposals(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Only the job poster or admin can view proposals
    if (job.clientId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      if (!user?.roles?.some((r: any) => r.role === 'admin')) {
        throw new ForbiddenException('You do not have access to view proposals for this job');
      }
    }

    return this.prisma.proposal.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        freelancer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }
}
