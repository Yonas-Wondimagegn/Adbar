import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '@adbar/common';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;

  const mockPrisma = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    walletBalance: {
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    withdrawalRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should return per-currency AU balances without merging', async () => {
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [
          { id: 'b1', currency: 'ETB', type: 'AVAILABLE', balance: { toNumber: () => 100.0 } },
          { id: 'b2', currency: 'ETB', type: 'PENDING', balance: { toNumber: () => 25.0 } },
          { id: 'b3', currency: 'USD', type: 'AVAILABLE', balance: { toNumber: () => 200.0 } },
        ],
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWallet('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.walletId).toBe('w1');
      // Should have separate entries for each type
      const etbAvailable = result.balances.find(b => b.currency === 'ETB' && b.type === 'AVAILABLE');
      const etbPending = result.balances.find(b => b.currency === 'ETB' && b.type === 'PENDING');
      const usdAvailable = result.balances.find(b => b.currency === 'USD' && b.type === 'AVAILABLE');
      expect(etbAvailable).toBeDefined();
      expect(etbAvailable?.balance).toBe(100.0);
      expect(etbPending).toBeDefined();
      expect(etbPending?.balance).toBe(25.0);
      expect(usdAvailable).toBeDefined();
      expect(usdAvailable?.balance).toBe(200.0);
      // No merged total
      expect(result.balances.some(b => 'total' in b && b.type === 'TOTAL')).toBe(false);
    });

    it('should auto-create wallet when none exists', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      const newWallet = {
        id: 'w-new',
        userId: 'user-1',
        balances: [],
      };
      mockPrisma.wallet.create.mockResolvedValue(newWallet);

      const result = await service.getWallet('user-1');

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
        include: { balances: true },
      });
      expect(result.walletId).toBe('w-new');
    });

    it('should include ETB and USD entries even when balance is 0', async () => {
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [
          { id: 'b1', currency: 'ETB', type: 'AVAILABLE', balance: { toNumber: () => 50.0 } },
        ],
      };
      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWallet('user-1');

      const usdEntry = result.balances.find(b => b.currency === 'USD');
      expect(usdEntry).toBeDefined();
      expect(usdEntry?.balance).toBe(0);
    });
  });

  describe('credit', () => {
    it('should credit wallet and return updated balance', async () => {
      const mockBalance = {
        id: 'b1',
        walletId: 'w1',
        currency: 'USD',
        type: 'AVAILABLE',
        balance: { toNumber: () => 100.0, add: jest.fn(() => ({ toNumber: () => 150.0 })) },
      };
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [mockBalance],
      };
      const mockUpdatedBalance = {
        ...mockBalance,
        balance: { toNumber: () => 150.0, add: jest.fn() },
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedBalance]);

      const result = await service.credit('user-1', { currency: 'USD', amount: 50.0 });

      expect(result.currency).toBe('USD');
      expect(result.balance).toBe(150.0);
    });

    it('should auto-create balance for new currency', async () => {
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [],
      };
      const mockNewBalance = {
        id: 'b-new',
        walletId: 'w1',
        currency: 'GBP',
        type: 'AVAILABLE',
        balance: { toNumber: () => 0, add: jest.fn(() => ({ toNumber: () => 75.0 })) },
      };
      const mockUpdatedBalance = {
        ...mockNewBalance,
        balance: { toNumber: () => 75.0 },
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.walletBalance.create.mockResolvedValue(mockNewBalance);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedBalance]);

      const result = await service.credit('user-1', { currency: 'GBP', amount: 75.0 });

      expect(mockPrisma.walletBalance.create).toHaveBeenCalled();
      expect(result.currency).toBe('GBP');
    });
  });

  describe('debit', () => {
    it('should debit wallet when sufficient balance exists', async () => {
      const mockBalance = {
        id: 'b1',
        walletId: 'w1',
        currency: 'USD',
        type: 'AVAILABLE',
        balance: { toNumber: () => 100.0, sub: jest.fn(() => ({ toNumber: () => 50.0 })) },
      };
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [mockBalance],
      };
      const mockUpdatedBalance = {
        ...mockBalance,
        balance: { toNumber: () => 50.0, sub: jest.fn() },
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedBalance]);

      const result = await service.debit('user-1', { currency: 'USD', amount: 50.0 });

      expect(result.balance).toBe(50.0);
    });

    it('should throw when insufficient balance', async () => {
      const mockBalance = {
        id: 'b1',
        walletId: 'w1',
        currency: 'USD',
        type: 'AVAILABLE',
        balance: { toNumber: () => 30.0 },
      };
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [mockBalance],
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.debit('user-1', { currency: 'USD', amount: 50.0 }),
      ).rejects.toThrow();
    });
  });

  describe('requestWithdrawal', () => {
    it('should reject ETB withdrawal via Stripe (fraud detection)', async () => {
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [
          { id: 'b1', currency: 'ETB', type: 'AVAILABLE', balance: { toNumber: () => 200.0 } },
        ],
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.requestWithdrawal('user-1', {
          currency: 'ETB',
          amount: 100.0,
          provider: 'stripe',
          destinationAccount: 'acct_123',
        }),
      ).rejects.toThrow('blocked');
    });

    it('should reject USD withdrawal via Chapa (fraud detection)', async () => {
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [
          { id: 'b1', currency: 'USD', type: 'AVAILABLE', balance: { toNumber: () => 200.0 } },
        ],
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.requestWithdrawal('user-1', {
          currency: 'USD',
          amount: 100.0,
          provider: 'chapa',
          destinationAccount: 'acct_123',
        }),
      ).rejects.toThrow('blocked');
    });

    it('should create withdrawal when provider matches currency', async () => {
      const mockBalance = {
        id: 'b1',
        walletId: 'w1',
        currency: 'ETB',
        type: 'AVAILABLE',
        balance: { toNumber: () => 200.0, sub: jest.fn(() => ({ toNumber: () => 150.0 })) },
      };
      const mockWallet = {
        id: 'w1',
        userId: 'user-1',
        balances: [mockBalance],
      };
      const mockWithdrawal = {
        id: 'wd1',
        userId: 'user-1',
        currency: 'ETB',
        amount: { toNumber: () => 50.0 },
        providerId: 'chapa',
        status: 'pending',
        createdAt: new Date(),
      };
      const mockUpdatedBalance = { ...mockBalance, balance: { toNumber: () => 150.0 } };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.$transaction.mockResolvedValue([mockUpdatedBalance, mockWithdrawal]);

      const result = await service.requestWithdrawal('user-1', {
        currency: 'ETB',
        amount: 50.0,
        provider: 'chapa',
        destinationAccount: 'acct_123',
      });

      expect(result.status).toBe('pending');
      expect(result.amount).toBe(50.0);
      expect(result.currency).toBe('ETB');
    });
  });

  describe('getTransactions', () => {
    it('should return transactions filtered by wallet', async () => {
      const mockWallet = { id: 'w1', userId: 'user-1' };
      const mockTransactions = [
        {
          id: 'tx1',
          walletId: 'w1',
          type: 'credit',
          amount: { toNumber: () => 100.0 },
          currency: 'USD',
          balanceBefore: { toNumber: () => 0 },
          balanceAfter: { toNumber: () => 100.0 },
          referenceId: 'ref-1',
          description: 'Top up',
          createdAt: new Date(),
        },
      ];

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.walletTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.walletTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactions('user-1', undefined, 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].currency).toBe('USD');
      expect(result.total).toBe(1);
    });
  });

  describe('getWithdrawals', () => {
    it('should return withdrawal history', async () => {
      const mockWithdrawals = [
        {
          id: 'wd1',
          userId: 'user-1',
          currency: 'USD',
          amount: { toNumber: () => 50.0 },
          providerId: 'stripe',
          status: 'completed',
          createdAt: new Date(),
        },
      ];

      mockPrisma.withdrawalRequest.findMany.mockResolvedValue(mockWithdrawals);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(1);

      const result = await service.getWithdrawals('user-1');

      expect(result.withdrawals).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
