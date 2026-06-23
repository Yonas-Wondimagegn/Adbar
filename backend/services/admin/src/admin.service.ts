import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

export interface AdminUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  kycLevel: string;
  createdAt: Date;
  _count: { buyerOrders: number };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== USER MANAGEMENT ==========

  async getUsers(
    paginationDto: PaginationDto,
    filters?: { role?: string; isVerified?: boolean; search?: string },
  ): Promise<PaginatedResult<AdminUserView>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.role) where.roles = { some: { role: filters.role } };
    if (filters?.isVerified !== undefined) where.emailVerified = filters.isVerified;
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          emailVerified: true,
          phoneVerified: true,
          kycLevel: true,
          createdAt: true,
          _count: { select: { buyerOrders: true } },
          identityVerifications: {
            select: { status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const mappedData: AdminUserView[] = data.map((user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycLevel: user.identityVerifications?.[0]?.status || 'not_started',
      createdAt: user.createdAt,
      _count: { buyerOrders: user._count?.buyerOrders || 0 },
    }));

    return {
      data: mappedData,
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

  async getUserById(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        freelancerProfile: true,
        store: true,
        identityVerifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            buyerOrders: true,
            sellerOrders: true,
            writtenReviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async updateUser(userId: string, updateData: any): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.isVerified !== undefined && {
          emailVerified: updateData.isVerified,
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
      },
    });

    this.logger.log(`Admin updated user ${userId}`);
    return updated;
  }

  // ========== ORDER MANAGEMENT ==========

  async getAllOrders(
    paginationDto: PaginationDto,
    filters?: { status?: string; startDate?: string; endDate?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          transactions: { select: { id: true, status: true, providerId: true } },
        },
      }),
      this.prisma.order.count({ where }),
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

  // ========== TRANSACTION MANAGEMENT ==========

  async getTransactions(
    paginationDto: PaginationDto,
    filters?: { type?: string; status?: string; userId?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;

    const [data, totalItems] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
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

  // ========== WALLET MANAGEMENT ==========

  async getWallets(
    paginationDto: PaginationDto,
    filters?: { currency?: string; userId?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.currency) where.currency = filters.currency;
    if (filters?.userId) where.userId = filters.userId;

    const [data, totalItems] = await Promise.all([
      this.prisma.wallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.wallet.count({ where }),
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

  // ========== PAYMENT PROVIDERS ==========

  async getPaymentProviders(): Promise<any[]> {
    return this.prisma.paymentProviderConfig.findMany({
      orderBy: { displayName: 'asc' },
    });
  }

  async updatePaymentProvider(
    providerId: string,
    updateData: any,
  ): Promise<any> {
    const provider = await this.prisma.paymentProviderConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException(
        `Payment provider with ID ${providerId} not found`,
      );
    }

    const updated = await this.prisma.paymentProviderConfig.update({
      where: { id: providerId },
      data: {
        ...(updateData.isActive !== undefined && {
          isActive: updateData.isActive,
        }),
        ...(updateData.priority !== undefined && {
          sortOrder: updateData.priority,
        }),
      },
    });

    this.logger.log(`Admin updated payment provider ${providerId}`);
    return updated;
  }

  // ========== KYC MANAGEMENT ==========

  async getPendingKyc(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.identityVerification.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.identityVerification.count({ where: { status: 'PENDING' } }),
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

  async reviewKyc(
    kycId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<any> {
    const kyc = await this.prisma.identityVerification.findUnique({
      where: { id: kycId },
    });

    if (!kyc) {
      throw new NotFoundException(`KYC verification with ID ${kycId} not found`);
    }

    if (kyc.status !== 'PENDING') {
      throw new BadRequestException(
        `KYC verification is already ${kyc.status}`,
      );
    }

    const updated = await this.prisma.identityVerification.update({
      where: { id: kycId },
      data: {
        status: decision === 'approved' ? 'VERIFIED' : 'REJECTED',
        verifiedAt: decision === 'approved' ? new Date() : undefined,
        rejectionReason: decision === 'rejected' ? reason : null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update user KYC level
    await this.prisma.user.update({
      where: { id: kyc.userId },
      data: { kycLevel: decision === 'approved' ? 'LEVEL_2' : 'LEVEL_1' },
    });

    this.logger.log(`KYC ${kycId} ${decision}`);
    return updated;
  }

  // ========== ONBOARDING MANAGEMENT ==========

  async getPendingOnboarding(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.store.findMany({
        where: { status: 'PENDING_VERIFICATION' },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.store.count({ where: { status: 'PENDING_VERIFICATION' } }),
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

  async approveOnboarding(storeId: string): Promise<any> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Store ${storeId} approved for onboarding`);
    return updated;
  }

  // ========== SUPPORT TICKETS ==========

  async getSupportTickets(
    paginationDto: PaginationDto,
    filters?: { status?: string; priority?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;

    const [data, totalItems] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
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

  // ========== USSD HEALTH ==========

  async getUssdHealth(): Promise<any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalSessions,
      activeSessions,
      recentSessions,
      failedSessions,
    ] = await Promise.all([
      this.prisma.ussdSession.count(),
      this.prisma.ussdSession.count({
        where: { status: 'active' },
      }),
      this.prisma.ussdSession.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.ussdSession.count({
        where: {
          createdAt: { gte: twentyFourHoursAgo },
          status: 'expired',
        },
      }),
    ]);

    return {
      status: failedSessions > recentSessions * 0.1 ? 'degraded' : 'healthy',
      totalSessions,
      activeSessions,
      recentSessions24h: recentSessions,
      failedSessions24h: failedSessions,
      failureRate:
        recentSessions > 0
          ? Math.round((failedSessions / recentSessions) * 10000) / 100
          : 0,
      lastChecked: now,
    };
  }

  // ========== SMS ANALYTICS ==========

  async getSmsAnalytics(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const notifications = await this.prisma.notification.findMany({
      where: {
        createdAt: { gte: startDate },
        sentViaSms: true,
      },
      select: { createdAt: true, isRead: true },
    });

    const total = notifications.length;
    const read = notifications.filter((n) => n.isRead).length;

    // Group by day
    const dailyMap = new Map<string, { sent: number; read: number }>();
    for (const n of notifications) {
      const dayKey = n.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dayKey) || { sent: 0, read: 0 };
      existing.sent += 1;
      if (n.isRead) existing.read += 1;
      dailyMap.set(dayKey, existing);
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return {
      total,
      delivered: total,
      read,
      readRate: total > 0 ? Math.round((read / total) * 10000) / 100 : 0,
      period: { start: startDate, end: new Date() },
      daily,
    };
  }
}
