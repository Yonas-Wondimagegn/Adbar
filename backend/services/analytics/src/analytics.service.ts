import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@adbar/common';

export interface DashboardMetrics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalFreelancers: number;
  activeOrders: number;
  pendingKyc: number;
  pendingDisputes: number;
  period: { start: Date; end: Date };
}

export interface RevenueByCurrency {
  currency: string;
  total: number;
  count: number;
  averageOrderValue: number;
  period: { start: Date; end: Date };
}

export interface UserGrowth {
  period: string;
  newUsers: number;
  cumulativeUsers: number;
  growthRate: number;
}

export interface OrderStats {
  status: string;
  count: number;
  totalValue: number;
  percentage: number;
}

export interface ProviderPerformance {
  providerId: string;
  providerName: string;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  fulfillmentRate: number;
}

export interface AUBalanceDistribution {
  currency: string;
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  escrowBalance: number;
  walletCount: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalOrders,
      totalRevenueResult,
      totalProducts,
      activeOrders,
      pendingKyc,
      pendingDisputes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: ['DELIVERED'] } },
      }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({
        where: { status: { in: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'] } },
      }),
      this.prisma.identityVerification.count({ where: { status: 'PENDING' } }),
      this.prisma.dispute.count({ where: { status: 'OPEN' } }),
    ]);

    const totalFreelancers = await this.prisma.freelancerProfile.count();

    return {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenueResult._sum?.total?.toNumber() || 0,
      totalProducts,
      totalFreelancers,
      activeOrders,
      pendingKyc,
      pendingDisputes,
      period: { start: thirtyDaysAgo, end: now },
    };
  }

  async getRevenueByCurrency(days: number = 30): Promise<RevenueByCurrency[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['DELIVERED'] },
        createdAt: { gte: startDate },
      },
      select: { currency: true, total: true },
    });

    const revenueMap = new Map<string, { total: number; count: number }>();

    for (const order of orders) {
      const existing = revenueMap.get(order.currency) || { total: 0, count: 0 };
      existing.total += order.total.toNumber();
      existing.count += 1;
      revenueMap.set(order.currency, existing);
    }

    const result: RevenueByCurrency[] = [];
    for (const [currency, data] of revenueMap.entries()) {
      result.push({
        currency,
        total: data.total,
        count: data.count,
        averageOrderValue: data.count > 0 ? data.total / data.count : 0,
        period: { start: startDate, end: new Date() },
      });
    }

    return result.sort((a, b) => b.total - a.total);
  }

  async getUserGrowth(days: number = 30): Promise<UserGrowth[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalUsersBefore = await this.prisma.user.count({
      where: { createdAt: { lt: startDate } },
    });

    const dailyMap = new Map<string, number>();
    for (const user of users) {
      const dayKey = user.createdAt.toISOString().split('T')[0];
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
    }

    const result: UserGrowth[] = [];
    let cumulative = totalUsersBefore;
    const currentDate = new Date(startDate);
    const now = new Date();

    while (currentDate <= now) {
      const dayKey = currentDate.toISOString().split('T')[0];
      const newUsers = dailyMap.get(dayKey) || 0;
      cumulative += newUsers;
      const growthRate =
        cumulative > 0 && totalUsersBefore > 0
          ? ((newUsers / (cumulative - newUsers)) * 100)
          : 0;

      result.push({
        period: dayKey,
        newUsers,
        cumulativeUsers: cumulative,
        growthRate: Math.round(growthRate * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getOrderStats(days: number = 30): Promise<OrderStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      select: { status: true, total: true },
    });

    const totalOrders = orders.length;
    const statusMap = new Map<string, { count: number; totalValue: number }>();

    for (const order of orders) {
      const existing = statusMap.get(order.status) || { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += order.total.toNumber();
      statusMap.set(order.status, existing);
    }

    const result: OrderStats[] = [];
    for (const [status, data] of statusMap.entries()) {
      result.push({
        status,
        count: data.count,
        totalValue: data.totalValue,
        percentage:
          totalOrders > 0
            ? Math.round((data.count / totalOrders) * 10000) / 100
            : 0,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  async getProviderPerformance(
    limit: number = 20,
  ): Promise<ProviderPerformance[]> {
    const stores = await this.prisma.store.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const result: ProviderPerformance[] = [];

    for (const store of stores) {
      const orders = await this.prisma.order.findMany({
        where: { sellerId: store.userId },
        select: { status: true, total: true },
      });

      const completedOrders = orders.filter(
        (o) => o.status === 'DELIVERED',
      );

      const totalRevenue = completedOrders.reduce(
        (sum, o) => sum + o.total.toNumber(),
        0,
      );

      const reviews = await this.prisma.review.aggregate({
        where: { targetId: store.userId, targetType: 'seller' },
        _avg: { rating: true },
      });

      result.push({
        providerId: store.id,
        providerName: store.name,
        totalOrders: orders.length,
        totalRevenue,
        averageRating: reviews._avg.rating || 0,
        fulfillmentRate:
          orders.length > 0
            ? Math.round(
                (completedOrders.length / orders.length) * 10000,
              ) / 100
            : 0,
      });
    }

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * AU Balance Distribution — uses the correct Wallet + WalletBalance models.
   * Each currency is reported separately (never merged).
   */
  async getAUBalanceDistribution(): Promise<AUBalanceDistribution[]> {
    // Query WalletBalance grouped by currency and type
    const balances = await this.prisma.walletBalance.findMany({
      select: { currency: true, type: true, balance: true },
    });

    const escrows = await this.prisma.escrow.findMany({
      where: { status: { in: ['FUNDED', 'DISPUTED'] } },
      select: { currency: true, amount: true },
    });

    const currencyMap = new Map<
      string,
      {
        totalBalance: number;
        availableBalance: number;
        pendingBalance: number;
        escrowBalance: number;
        walletCount: number;
      }
    >();

    // Aggregate wallet balances
    for (const bal of balances) {
      const existing = currencyMap.get(bal.currency) || {
        totalBalance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        escrowBalance: 0,
        walletCount: 0,
      };
      const val = bal.balance.toNumber();
      existing.totalBalance += val;
      if (bal.type === 'AVAILABLE') existing.availableBalance += val;
      else if (bal.type === 'PENDING') existing.pendingBalance += val;
      existing.walletCount += 1;
      currencyMap.set(bal.currency, existing);
    }

    // Add escrow balances
    for (const escrow of escrows) {
      const existing = currencyMap.get(escrow.currency) || {
        totalBalance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        escrowBalance: 0,
        walletCount: 0,
      };
      existing.escrowBalance += escrow.amount.toNumber();
      currencyMap.set(escrow.currency, existing);
    }

    const result: AUBalanceDistribution[] = [];
    for (const [currency, data] of currencyMap.entries()) {
      result.push({ currency, ...data });
    }

    return result;
  }
}
