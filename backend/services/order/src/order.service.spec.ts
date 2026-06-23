import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '@adbar/common';
import { OrderStatus } from '@prisma/client';
import { canTransition, getAllowedTransitions, isTerminalState } from './order-state-machine';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;

  const mockPrisma = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create an order with valid items', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Test Product',
          price: 100,
          quantity: 10,
          sku: 'SKU-1',
          status: 'ACTIVE',
          storeId: 'store-1',
          variants: [],
        },
      ];

      const mockStore = {
        id: 'store-1',
        userId: 'seller-1',
      };

      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-123',
        status: OrderStatus.PENDING,
        total: 100,
      };

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder(
        {
          items: [{ productId: 'prod-1', quantity: 1 }],
          shippingAddress: { fullName: 'John', phone: '123', addressLine1: 'Add', city: 'Addis', country: 'ET' },
          paymentMethod: 'chapa',
        },
        'user-1',
      );

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    it('should throw error for unavailable products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.createOrder(
          {
            items: [{ productId: 'prod-1', quantity: 1 }],
            shippingAddress: { fullName: 'John', phone: '123', addressLine1: 'Add', city: 'Addis', country: 'ET' },
            paymentMethod: 'chapa',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getOrder', () => {
    it('should return an order for the buyer', async () => {
      const mockOrder = { id: 'order-1', buyerId: 'user-1', sellerId: 'seller-1' };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-1', 'user-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrder('nonexistent', 'user-1')).rejects.toThrow();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        status: OrderStatus.PENDING,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });

      const result = await service.cancelOrder('order-1', 'Changed mind', 'user-1');
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error when cancelling a shipped order', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        status: OrderStatus.SHIPPED,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelOrder('order-1', 'reason', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('confirmDelivery', () => {
    it('should confirm delivery for shipped order', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        status: OrderStatus.SHIPPED,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: OrderStatus.DELIVERED });

      const result = await service.confirmDelivery('order-1', { recipientName: 'John' }, 'user-1');
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw error for non-shipped order', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        status: OrderStatus.PENDING,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.confirmDelivery('order-1', {}, 'user-1'),
      ).rejects.toThrow();
    });
  });
});

describe('Order State Machine', () => {
  it('should allow PENDING -> PAID transition', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(true);
  });

  it('should allow PENDING -> CANCELLED transition', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
  });

  it('should not allow PENDING -> DELIVERED transition', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
  });

  it('should not allow DELIVERED -> PAID transition', () => {
    expect(canTransition(OrderStatus.DELIVERED, OrderStatus.PAID)).toBe(false);
  });

  it('should return correct allowed transitions', () => {
    const transitions = getAllowedTransitions(OrderStatus.PENDING);
    expect(transitions).toContain(OrderStatus.PAID);
    expect(transitions).toContain(OrderStatus.CANCELLED);
  });

  it('should identify terminal states', () => {
    expect(isTerminalState(OrderStatus.REFUNDED)).toBe(true);
    expect(isTerminalState(OrderStatus.CANCELLED)).toBe(true);
    expect(isTerminalState(OrderStatus.PENDING)).toBe(false);
  });
});
