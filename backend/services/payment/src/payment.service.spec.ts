import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { PrismaService } from '@adbar/common';
import { PaymentProvider } from './interfaces/payment-provider.interface';

describe('PaymentService', () => {
  let service: PaymentService;
  let registry: PaymentProviderRegistry;
  let prisma: any;

  const mockPrisma = {
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  };

  const mockProvider: PaymentProvider = {
    name: 'test-provider',
    displayName: 'Test Provider',
    initiatePayment: jest.fn().mockResolvedValue({
      success: true,
      reference: 'test-ref-123',
      status: 'pending',
      provider: 'test-provider',
      amount: 100,
      currency: 'ETB',
    }),
    verifyPayment: jest.fn().mockResolvedValue({
      success: true,
      reference: 'test-ref-123',
      status: 'completed',
      provider: 'test-provider',
      amount: 100,
      currency: 'ETB',
    }),
    handleWebhook: jest.fn().mockResolvedValue({ success: true, message: 'OK' }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
    refund: jest.fn().mockResolvedValue({
      success: true,
      refundId: 'refund-123',
      transactionId: 'test-ref-123',
      amount: 100,
      currency: 'ETB',
      status: 'completed',
      provider: 'test-provider',
    }),
    getSupportedCurrencies: jest.fn().mockReturnValue(['ETB', 'USD']),
    supportsCurrency: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        PaymentProviderRegistry,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    registry = module.get<PaymentProviderRegistry>(PaymentProviderRegistry);
    prisma = module.get(PrismaService);

    // Register mock provider
    registry.register(mockProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProviders', () => {
    it('should return all enabled providers', async () => {
      const providers = await service.getProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should filter by currency', async () => {
      const providers = await service.getProviders('ETB');
      expect(providers).toBeDefined();
      providers.forEach((p) => {
        expect(p.supportedCurrencies).toContain('ETB');
      });
    });
  });

  describe('initiatePayment', () => {
    it('should initiate a payment', async () => {
      mockPrisma.transaction.create.mockResolvedValue({ id: 'txn-1' });
      mockPrisma.transaction.update.mockResolvedValue({});

      const result = await service.initiatePayment(
        {
          orderId: 'order-1',
          amount: 100,
          currency: 'ETB',
          provider: 'test-provider',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown provider', async () => {
      await expect(
        service.initiatePayment(
          {
            orderId: 'order-1',
            amount: 100,
            currency: 'ETB',
            provider: 'unknown-provider',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException for unsupported currency', async () => {
      (mockProvider.supportsCurrency as jest.Mock).mockReturnValue(false);

      await expect(
        service.initiatePayment(
          {
            orderId: 'order-1',
            amount: 100,
            currency: 'XYZ',
            provider: 'test-provider',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        orderId: 'order-1',
        userId: 'user-1',
        providerRef: 'test-ref-123',
      });
      mockPrisma.transaction.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});

      const result = await service.verifyPayment('test-ref-123', 'test-provider');

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException for unknown provider', async () => {
      await expect(
        service.verifyPayment('ref-123', 'unknown-provider'),
      ).rejects.toThrow();
    });
  });

  describe('handleWebhook', () => {
    it('should handle valid webhook', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'ETB',
        providerRef: 'test-ref-123',
      });
      mockPrisma.transaction.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});

      const result = await service.handleWebhook(
        'test-provider',
        { status: 'success', reference: 'test-ref-123' },
        { 'x-webhook-signature': 'valid-sig' },
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid signature', async () => {
      (mockProvider.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const result = await service.handleWebhook(
        'test-provider',
        { status: 'success' },
        { 'x-webhook-signature': 'invalid' },
      );

      expect(result.success).toBe(false);
    });

    it('should throw NotFoundException for unknown provider', async () => {
      await expect(
        service.handleWebhook('unknown', {}, {}),
      ).rejects.toThrow();
    });
  });

  describe('refund', () => {
    it('should process a refund', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        orderId: 'order-1',
        userId: 'user-1',
        providerRef: 'test-ref-123',
      });
      mockPrisma.transaction.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});

      const result = await service.refund({
        transactionId: 'test-ref-123',
        amount: 100,
        currency: 'ETB',
        provider: 'test-provider',
        reason: 'Customer request',
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
    });

    it('should throw NotFoundException for unknown provider', async () => {
      await expect(
        service.refund({
          transactionId: 'ref-123',
          amount: 100,
          currency: 'ETB',
          provider: 'unknown',
        }),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException for missing payment', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.refund({
          transactionId: 'nonexistent',
          amount: 100,
          currency: 'ETB',
          provider: 'test-provider',
        }),
      ).rejects.toThrow();
    });
  });
});

describe('PaymentProviderRegistry', () => {
  let registry: PaymentProviderRegistry;

  beforeEach(() => {
    registry = new PaymentProviderRegistry();
  });

  it('should register and retrieve providers', () => {
    const mockProvider: PaymentProvider = {
      name: 'test',
      displayName: 'Test',
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
      handleWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      refund: jest.fn(),
      getSupportedCurrencies: jest.fn().mockReturnValue(['ETB']),
      supportsCurrency: jest.fn().mockReturnValue(true),
    };

    registry.register(mockProvider);
    expect(registry.get('test')).toBe(mockProvider);
    expect(registry.has('test')).toBe(true);
  });

  it('should return undefined for unregistered provider', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should return all registered providers', () => {
    const provider1: PaymentProvider = {
      name: 'p1',
      displayName: 'P1',
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
      handleWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      refund: jest.fn(),
      getSupportedCurrencies: jest.fn().mockReturnValue(['ETB']),
      supportsCurrency: jest.fn().mockReturnValue(true),
    };

    registry.register(provider1);
    const all = registry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter by currency', () => {
    const provider1: PaymentProvider = {
      name: 'p1',
      displayName: 'P1',
      initiatePayment: jest.fn(),
      verifyPayment: jest.fn(),
      handleWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      refund: jest.fn(),
      getSupportedCurrencies: jest.fn().mockReturnValue(['ETB']),
      supportsCurrency: jest.fn().mockReturnValue(true),
    };

    registry.register(provider1);
    const byCurrency = registry.getByCurrency('ETB');
    expect(byCurrency.length).toBeGreaterThanOrEqual(1);
  });
});
