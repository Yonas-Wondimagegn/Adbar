import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '@adbar/common';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaService;

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    store: {
      findFirst: jest.fn(),
    },
    category: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    productImage: {
      create: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    coupon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('should create a product', async () => {
      const mockStore = { id: 'store-1' };
      const mockProduct = { id: 'prod-1', name: 'Test Product' };

      mockPrisma.store.findFirst.mockResolvedValue(mockStore);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.createProduct(
        { name: 'Test Product', price: 100, currency: 'ETB', stock: 10, categoryId: 'cat-1' },
        'user-1',
      );

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });

    it('should throw error if no store and no storeId', async () => {
      mockPrisma.store.findFirst.mockResolvedValue(null);

      await expect(
        service.createProduct(
          { name: 'Test', price: 100, currency: 'ETB', stock: 10, categoryId: 'cat-1' },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getProduct', () => {
    it('should return a product', async () => {
      const mockProduct = { id: 'prod-1', name: 'Test Product' };
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProduct('prod-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProduct('nonexistent')).rejects.toThrow();
    });
  });

  describe('listProducts', () => {
    it('should return paginated products', async () => {
      const mockProducts = [{ id: 'prod-1' }, { id: 'prod-2' }];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(2);

      const result = await service.listProducts(
        { page: 1, limit: 10 },
        {},
      );

      expect(result.data).toEqual(mockProducts);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe('updateStock', () => {
    it('should add stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', quantity: 10 });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', quantity: 15 });

      const result = await service.updateStock('prod-1', { quantity: 5, operation: 'add' });
      expect(result.quantity).toBe(15);
    });

    it('should subtract stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', quantity: 10 });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', quantity: 5 });

      const result = await service.updateStock('prod-1', { quantity: 5, operation: 'subtract' });
      expect(result.quantity).toBe(5);
    });

    it('should throw error when subtracting more than available', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', quantity: 5 });

      await expect(
        service.updateStock('prod-1', { quantity: 10, operation: 'subtract' }),
      ).rejects.toThrow();
    });
  });

  describe('createCategory', () => {
    it('should create a category', async () => {
      const mockCategory = { id: 'cat-1', name: 'Electronics' };
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory({ name: 'Electronics', slug: 'electronics' });
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', slug: 'electronics' });

      await expect(
        service.createCategory({ name: 'Electronics', slug: 'electronics' }),
      ).rejects.toThrow();
    });
  });

  describe('applyCoupon', () => {
    it('should apply percentage coupon', async () => {
      const mockCoupon = {
        code: 'SAVE10',
        isActive: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-12-31'),
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usedCount: 0,
        applicableProducts: [],
        applicableCategories: [],
      };
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.applyCoupon({
        couponCode: 'SAVE10',
        orderAmount: 100,
        productIds: [],
      });

      expect(result.discountAmount).toBe(10);
      expect(result.finalAmount).toBe(90);
    });

    it('should apply fixed coupon', async () => {
      const mockCoupon = {
        code: 'FLAT50',
        isActive: true,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-12-31'),
        discountType: 'fixed',
        discountValue: 50,
        minOrderAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usedCount: 0,
        applicableProducts: [],
        applicableCategories: [],
      };
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.applyCoupon({
        couponCode: 'FLAT50',
        orderAmount: 100,
        productIds: [],
      });

      expect(result.discountAmount).toBe(50);
      expect(result.finalAmount).toBe(50);
    });

    it('should throw NotFoundException for invalid coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.applyCoupon({ couponCode: 'INVALID', orderAmount: 100, productIds: [] }),
      ).rejects.toThrow();
    });
  });
});
