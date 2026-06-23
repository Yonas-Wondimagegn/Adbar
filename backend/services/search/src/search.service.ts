import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@adbar/common';

export interface SearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  storeId?: string;
  sortBy: string;
  page: number;
  limit: number;
}

export interface SearchResult {
  products: any[];
  facets: {
    categories: Array<{ name: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
    stores: Array<{ id: string; name: string; count: number }>;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== SEARCH PRODUCTS ==========

  async searchProducts(filters: SearchFilters): Promise<SearchResult> {
    const { query, category, minPrice, maxPrice, rating, storeId, sortBy, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: any = { isActive: true };

    // Full-text search on name, description, tags
    if (query && query.trim().length > 0) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query.toLowerCase()] } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.categoryId = category;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Rating filter
    if (rating !== undefined) {
      where.averageRating = { gte: rating };
    }

    // Store filter
    if (storeId) {
      where.storeId = storeId;
    }

    // Build sort order
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { averageRating: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'relevance':
      default:
        // For relevance, if there's a query, prioritize by search rank
        // In a real ES implementation, this would use ES relevance scoring
        if (query && query.trim().length > 0) {
          orderBy = [
            { averageRating: 'desc' },
            { createdAt: 'desc' },
          ];
        } else {
          orderBy = { createdAt: 'desc' };
        }
        break;
    }

    // Execute search query
    const [products, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          store: {
            select: { id: true, name: true, logoUrl: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            select: { id: true, name: true, price: true, quantity: true },
            take: 3,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Build facets/aggregations
    const facets = await this.buildFacets(where);

    const totalPages = Math.ceil(totalItems / limit);

    this.logger.log(
      `Search: "${query}" | Found: ${totalItems} | Page: ${page}/${totalPages}`,
    );

    return {
      products,
      facets,
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

  // ========== BUILD FACETS ==========

  private async buildFacets(baseWhere: any) {
    // Category facet
    const categoryResults = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { ...baseWhere, categoryId: { not: null } },
      _count: { id: true },
    });

    const categoryIds = categoryResults.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryFacets = categoryResults.map((cr) => {
      const cat = categories.find((c) => c.id === cr.categoryId);
      return {
        name: cat?.name || 'Unknown',
        count: cr._count.id,
      };
    }).sort((a, b) => b.count - a.count);

    // Price range facet
    const priceRanges = [
      { label: '0-50', min: 0, max: 50 },
      { label: '50-100', min: 50, max: 100 },
      { label: '100-250', min: 100, max: 250 },
      { label: '250-500', min: 250, max: 500 },
      { label: '500-1000', min: 500, max: 1000 },
      { label: '1000+', min: 1000, max: null },
    ];

    const priceRangeFacets = await Promise.all(
      priceRanges.map(async (range) => {
        const rangeWhere = { ...baseWhere };
        rangeWhere.price = {};
        if (range.min !== null) rangeWhere.price.gte = range.min;
        if (range.max !== null) rangeWhere.price.lte = range.max;

        const count = await this.prisma.product.count({ where: rangeWhere });
        return { range: range.label, count };
      }),
    );

    // Rating facet
    const ratingFacets = await Promise.all(
      [4, 3, 2, 1].map(async (r) => {
        const count = await this.prisma.product.count({
          where: { ...baseWhere, averageRating: { gte: r } },
        });
        return { rating: r, count };
      }),
    );

    // Store facet
    const storeResults = await this.prisma.product.groupBy({
      by: ['storeId'],
      where: baseWhere,
      _count: { id: true },
    });

    const storeIds = storeResults.map((s) => s.storeId);
    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });

    const storeFacets = storeResults.map((sr) => {
      const store = stores.find((s) => s.id === sr.storeId);
      return {
        id: sr.storeId,
        name: store?.name || 'Unknown',
        count: sr._count.id,
      };
    }).sort((a, b) => b.count - a.count);

    return {
      categories: categoryFacets,
      priceRanges: priceRangeFacets,
      ratings: ratingFacets,
      stores: storeFacets,
    };
  }

  // ========== INDEX PRODUCT ==========

  async indexProduct(productId: string, userId: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: { select: { id: true, userId: true } },
        category: { select: { id: true, name: true, slug: true } },
        variants: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify ownership (seller must own the store, or be admin)
    const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
    const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN');
    if (product.store?.userId !== userId && !isAdmin) {
      throw new BadRequestException('You can only index products from your own store');
    }

    // In production: index to Elasticsearch
    // const esDocument = this.buildSearchDocument(product);
    // await this.elasticsearch.index({ index: 'products', id: productId, body: esDocument });

    this.logger.log(`Product indexed: ${productId} (${product.name})`);

    return {
      productId,
      name: product.name,
      indexed: true,
      message: 'Product indexed successfully',
    };
  }

  // ========== REMOVE FROM INDEX ==========

  async removeIndex(productId: string, userId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: { select: { id: true, userId: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify ownership
    const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
    const isAdmin = userRoles.some((r: any) => r.role === 'ADMIN');
    if (product.store?.userId !== userId && !isAdmin) {
      throw new BadRequestException('You can only remove products from your own store');
    }

    // In production: remove from Elasticsearch
    // await this.elasticsearch.delete({ index: 'products', id: productId });

    this.logger.log(`Product removed from index: ${productId}`);
  }

  // ========== BULK INDEX ==========

  async bulkIndex(productIds: string[]): Promise<{ indexed: number; errors: string[] }> {
    const errors: string[] = [];
    let indexed = 0;

    for (const productId of productIds) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            variants: { select: { id: true, name: true } },
          },
        });

        if (!product) {
          errors.push(`Product ${productId} not found`);
          continue;
        }

        // In production: bulk index to Elasticsearch
        // await this.elasticsearch.index({ index: 'products', id: productId, body: document });

        indexed++;
      } catch (error: any) {
        errors.push(`Failed to index ${productId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk index complete: ${indexed} indexed, ${errors.length} errors`);

    return { indexed, errors };
  }
}
