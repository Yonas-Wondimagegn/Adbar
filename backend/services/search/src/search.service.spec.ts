import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '@adbar/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: any;

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    store: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchProducts', () => {
    it('should return search results with pagination', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Test Product',
          price: 100,
          isActive: true,
          store: { id: 'store-1', name: 'Test Store' },
          category: { id: 'cat-1', name: 'Electronics' },
          variants: [],
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      const result = await service.searchProducts({
        query: 'test',
        sortBy: 'relevance',
        page: 1,
        limit: 20,
      });

      expect(result.products).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(result.facets).toBeDefined();
      expect(result.facets.categories).toBeDefined();
      expect(result.facets.priceRanges).toBeDefined();
      expect(result.facets.ratings).toBeDefined();
      expect(result.facets.stores).toBeDefined();
    });

    it('should filter by price range', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      await service.searchProducts({
        query: '',
        minPrice: 50,
        maxPrice: 200,
        sortBy: 'price_asc',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 50, lte: 200 },
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      await service.searchProducts({
        query: '',
        category: 'cat-1',
        sortBy: 'relevance',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
          }),
        }),
      );
    });

    it('should sort by price ascending', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      await service.searchProducts({
        query: '',
        sortBy: 'price_asc',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });

    it('should apply full-text search filters', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      await service.searchProducts({
        query: 'laptop',
        sortBy: 'relevance',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'laptop' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('indexProduct', () => {
    it('should index a product successfully', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        store: { id: 'store-1', userId: 'seller-1' },
        category: { id: 'cat-1', name: 'Electronics' },
        variants: [],
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.userRole.findMany.mockResolvedValue([{ role: 'SELLER' }]);

      const result = await service.indexProduct('prod-1', 'seller-1');

      expect(result.indexed).toBe(true);
      expect(result.productId).toBe('prod-1');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.indexProduct('nonexistent', 'seller-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-owner', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        store: { id: 'store-1', userId: 'seller-1' },
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.userRole.findMany.mockResolvedValue([{ role: 'SELLER' }]);

      await expect(service.indexProduct('prod-1', 'other-seller')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow admin to index any product', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        store: { id: 'store-1', userId: 'seller-1' },
        category: { id: 'cat-1', name: 'Electronics' },
        variants: [],
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.userRole.findMany.mockResolvedValue([{ role: 'ADMIN' }]);

      const result = await service.indexProduct('prod-1', 'admin-1');

      expect(result.indexed).toBe(true);
    });
  });

  describe('removeIndex', () => {
    it('should remove product from index', async () => {
      const mockProduct = {
        id: 'prod-1',
        store: { id: 'store-1', userId: 'seller-1' },
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.userRole.findMany.mockResolvedValue([{ role: 'SELLER' }]);

      await service.removeIndex('prod-1', 'seller-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prod-1' } }),
      );
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.removeIndex('nonexistent', 'seller-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkIndex', () => {
    it('should bulk index products', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Test',
        category: { id: 'cat-1', name: 'Electronics' },
        variants: [],
      });

      const result = await service.bulkIndex(['prod-1']);

      expect(result.indexed).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should report errors for missing products', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await service.bulkIndex(['nonexistent']);

      expect(result.indexed).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});
