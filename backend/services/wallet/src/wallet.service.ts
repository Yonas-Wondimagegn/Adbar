import { Injectable, Logger, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService, ResourceNotFoundException } from '@adbar/common';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';

export interface WalletBalanceView {
  currency: string;
  type: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  auLabel: string;
}

export interface WalletData {
  userId: string;
  walletId: string;
  balances: WalletBalanceView[];
  defaultCurrency: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  currency: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  description?: string;
  createdAt: Date;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  currency: string;
  amount: number;
  provider: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get wallet with per-currency AU balances.
   * Each currency is a separate balance card - NEVER merged across currencies.
   */
  async getWallet(userId: string): Promise<WalletData> {
    this.logger.log(`Fetching wallet for user: ${userId}`);

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      // Auto-create wallet for user
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { balances: true },
      });
    }

    // Build per-currency balance cards - each currency is independent
    const balanceMap = new Map<string, { available: number; pending: number; frozen: number }>();

    for (const b of wallet.balances) {
      const existing = balanceMap.get(b.currency) || { available: 0, pending: 0, frozen: 0 };
      const bal = b.balance.toNumber();
      if (b.type === 'AVAILABLE') existing.available = bal;
      else if (b.type === 'PENDING') existing.pending = bal;
      else if (b.type === 'FROZEN') existing.frozen = bal;
      balanceMap.set(b.currency, existing);
    }

    const balances: WalletBalanceView[] = [];
    for (const [currency, vals] of balanceMap.entries()) {
      balances.push({
        currency,
        type: 'AVAILABLE',
        balance: vals.available,
        availableBalance: vals.available,
        pendingBalance: vals.pending,
        totalBalance: vals.available + vals.pending + vals.frozen,
        auLabel: `AU-${currency}`,
      });
      if (vals.pending > 0) {
        balances.push({
          currency,
          type: 'PENDING',
          balance: vals.pending,
          availableBalance: vals.available,
          pendingBalance: vals.pending,
          totalBalance: vals.available + vals.pending + vals.frozen,
          auLabel: `AU-${currency}`,
        });
      }
      if (vals.frozen > 0) {
        balances.push({
          currency,
          type: 'FROZEN',
          balance: vals.frozen,
          availableBalance: vals.available,
          pendingBalance: vals.pending,
          totalBalance: vals.available + vals.pending + vals.frozen,
          auLabel: `AU-${currency}`,
        });
      }
    }

    // Ensure at least ETB and USD entries exist
    for (const currency of ['ETB', 'USD']) {
      if (!balanceMap.has(currency)) {
        balances.push({
          currency,
          type: 'AVAILABLE',
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          totalBalance: 0,
          auLabel: `AU-${currency}`,
        });
      }
    }

    // Determine default currency from primary balance
    const primaryBalance = balances.find((b) => b.type === 'AVAILABLE');
    const defaultCurrency = primaryBalance?.currency ?? 'USD';

    return { userId, walletId: wallet.id, balances, defaultCurrency };
  }

  /**
   * Credit a user's wallet with strict currency-match enforcement.
   * The credit currency MUST match the balance's currency. No cross-currency.
   */
  async credit(userId: string, dto: CreditWalletDto): Promise<WalletBalanceView> {
    this.logger.log(`Crediting ${dto.amount} ${dto.currency} to user: ${userId}`);

    // Find or create wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { balances: true },
      });
    }

    // Find the AVAILABLE balance for THIS SPECIFIC CURRENCY
    let balance = wallet.balances.find(
      (b) => b.currency === dto.currency && b.type === 'AVAILABLE',
    );

    if (!balance) {
      // Create balance row for this currency
      balance = await this.prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          currency: dto.currency,
          type: 'AVAILABLE',
          balance: 0,
        },
      });
    }

    const newBalance = balance.balance.add(dto.amount);

    // Atomic update
    const [updatedBalance] = await this.prisma.$transaction([
      this.prisma.walletBalance.update({
        where: { id: balance.id },
        data: { balance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          balanceId: balance.id,
          type: 'credit',
          amount: dto.amount,
          currency: dto.currency,
          balanceBefore: balance.balance,
          balanceAfter: newBalance,
          referenceId: dto.referenceId,
          description: dto.description,
        },
      }),
    ]);

    return {
      currency: dto.currency,
      type: 'AVAILABLE',
      balance: updatedBalance.balance.toNumber(),
      availableBalance: updatedBalance.balance.toNumber(),
      pendingBalance: 0,
      totalBalance: updatedBalance.balance.toNumber(),
      auLabel: `AU-${dto.currency}`,
    };
  }

  /**
   * Debit a user's wallet with balance check and currency-match enforcement.
   */
  async debit(userId: string, dto: DebitWalletDto): Promise<WalletBalanceView> {
    this.logger.log(`Debiting ${dto.amount} ${dto.currency} from user: ${userId}`);

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    const balance = wallet.balances.find(
      (b) => b.currency === dto.currency && b.type === 'AVAILABLE',
    );

    if (!balance) {
      throw new NotFoundException(`${dto.currency} wallet balance not found for user`);
    }

    const availableBalance = balance.balance.toNumber();
    if (availableBalance < dto.amount) {
      throw new ConflictException(
        `Insufficient AU-${dto.currency} balance. Available: ${availableBalance}, Requested: ${dto.amount}`,
      );
    }

    const newBalance = balance.balance.sub(dto.amount);

    const [updatedBalance] = await this.prisma.$transaction([
      this.prisma.walletBalance.update({
        where: { id: balance.id },
        data: { balance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          balanceId: balance.id,
          type: 'debit',
          amount: dto.amount,
          currency: dto.currency,
          balanceBefore: balance.balance,
          balanceAfter: newBalance,
          referenceId: dto.referenceId,
          description: dto.description,
        },
      }),
    ]);

    return {
      currency: dto.currency,
      type: 'AVAILABLE',
      balance: updatedBalance.balance.toNumber(),
      availableBalance: updatedBalance.balance.toNumber(),
      pendingBalance: 0,
      totalBalance: updatedBalance.balance.toNumber(),
      auLabel: `AU-${dto.currency}`,
    };
  }

  /**
   * Request a withdrawal with CRITICAL currency-provider mismatch fraud detection.
   * ETB can only be withdrawn via Chapa or SantimPay (Ethiopian providers).
   * USD can only be withdrawn via Stripe or Stripe-compatible providers.
   * Any mismatch is a CRITICAL fraud flag.
   */
  async requestWithdrawal(userId: string, dto: WithdrawWalletDto): Promise<WithdrawalRecord> {
    this.logger.log(`Withdrawal request: ${dto.amount} ${dto.currency} via ${dto.provider} for user: ${userId}`);

    // CRITICAL: Currency-provider mismatch fraud detection
    const currencyProviderMap: Record<string, string[]> = {
      ETB: ['chapa', 'santimpay'],
      USD: ['stripe', 'paypal', 'bank_transfer'],
      EUR: ['stripe', 'paypal', 'bank_transfer'],
      GBP: ['stripe', 'paypal', 'bank_transfer'],
    };

    const expectedProviders = currencyProviderMap[dto.currency.toUpperCase()];
    if (expectedProviders && !expectedProviders.includes(dto.provider.toLowerCase())) {
      // CRITICAL FRAUD FLAG
      this.logger.error(
        `FRAUD_ALERT: Currency-provider mismatch for user ${userId}. ` +
        `Currency: ${dto.currency}, Provider: ${dto.provider}. ` +
        `Expected providers: ${expectedProviders.join(', ')}`,
      );

      // Create fraud alert record
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'FRAUD_CURRENCY_PROVIDER_MISMATCH',
          entityType: 'withdrawal_request',
          entityId: 'blocked',
          newValue: JSON.stringify({
            currency: dto.currency,
            provider: dto.provider,
            expectedProviders,
            amount: dto.amount,
          }),
        },
      }).catch(() => {}); // Don't fail if audit log fails

      throw new ForbiddenException(
        `Withdrawal blocked: Provider '${dto.provider}' does not support currency '${dto.currency}'. ` +
        `This incident has been flagged for compliance review.`,
      );
    }

    // Check wallet balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    const balance = wallet.balances.find(
      (b) => b.currency === dto.currency.toUpperCase() && b.type === 'AVAILABLE',
    );

    if (!balance) {
      throw new NotFoundException(`AU-${dto.currency} balance not found for user`);
    }

    const availableBalance = balance.balance.toNumber();
    if (availableBalance < dto.amount) {
      throw new ConflictException(
        `Insufficient AU-${dto.currency} balance. Available: ${availableBalance}, Requested: ${dto.amount}`,
      );
    }

    // Deduct from balance and create withdrawal record atomically
    const [updatedBalance, withdrawal] = await this.prisma.$transaction([
      this.prisma.walletBalance.update({
        where: { id: balance.id },
        data: { balance: balance.balance.sub(dto.amount) },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          userId,
          walletId: wallet.id,
          balanceId: balance.id,
          amount: dto.amount,
          currency: dto.currency.toUpperCase(),
          providerId: dto.provider.toLowerCase(),
          status: 'pending',
          bankName: dto.bankName,
          bankAccountNumber: dto.destinationAccount,
        },
      }),
    ]);

    this.logger.log(`Withdrawal ${withdrawal.id} created for user ${userId}: ${dto.amount} ${dto.currency}`);

    return {
      id: withdrawal.id,
      userId: withdrawal.userId,
      currency: withdrawal.currency,
      amount: withdrawal.amount.toNumber(),
      provider: withdrawal.providerId,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
    };
  }

  /**
   * Get withdrawal history for a user.
   */
  async getWithdrawals(
    userId: string,
    currency?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ withdrawals: WithdrawalRecord[]; total: number }> {
    this.logger.log(`Fetching withdrawals for user: ${userId}`);

    const where: any = { userId };
    if (currency) {
      where.currency = currency.toUpperCase();
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    const records: WithdrawalRecord[] = withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      currency: w.currency,
      amount: w.amount.toNumber(),
      provider: w.providerId,
      status: w.status,
      createdAt: w.createdAt,
    }));

    return { withdrawals: records, total };
  }

  /**
   * Get wallet transaction history.
   */
  async getTransactions(
    userId: string,
    currency?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: TransactionRecord[]; total: number }> {
    const where: any = { walletId: { not: undefined } };
    
    // Join through wallet to filter by user
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return { transactions: [], total: 0 };
    }

    const txWhere: any = { walletId: wallet.id };
    if (currency) {
      txWhere.currency = currency.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: txWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: txWhere }),
    ]);

    const records: TransactionRecord[] = transactions.map((tx) => ({
      id: tx.id,
      userId,
      currency: tx.currency,
      type: tx.type as 'credit' | 'debit',
      amount: tx.amount.toNumber(),
      balanceBefore: tx.balanceBefore.toNumber(),
      balanceAfter: tx.balanceAfter.toNumber(),
      referenceId: tx.referenceId ?? undefined,
      description: tx.description ?? undefined,
      createdAt: tx.createdAt,
    }));

    return { transactions: records, total };
  }
}
