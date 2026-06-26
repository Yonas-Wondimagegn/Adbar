import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(data: any, userId: string) {
    const store = await this.prisma.store.findFirst({ where: { userId } });
    if (!store && !data.storeId) {
      throw new BadRequestException('You must have a store to create products');
    }
    const storeId = data.storeId || store?.id;

    return this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        currency: data.currency || 'ETB',
        categoryId: data.categoryId,
        sku: data.sku,
        storeId,
        weight: data.weight,
        status: data.status ?? 'ACTIVE',
        shortDescription: data.shortDescription,
        compareAtPrice: data.compareAtPrice,
        quantity: data.quantity ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        trackInventory: data.trackInventory ?? true,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        variants: data.variants ? {
          create: data.variants.map((v: any) => ({
            name: v.name,
            sku: v.sku,
            price: v.price,
            quantity: v.quantity ?? 0,
          })),
        } : undefined,
      },
      include: {
        category: true,
        variants: true,
        store: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async updateProduct(id: string, data: any, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const store = await this.prisma.store.findFirst({ where: { userId } });
    if (product.storeId !== store?.id) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
      if (!user?.roles.some((r: any) => r.role === 'ADMIN')) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        categoryId: data.categoryId,
        sku: data.sku,
        weight: data.weight,
        status: data.status,
        shortDescription: data.shortDescription,
        compareAtPrice: data.compareAtPrice,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold,
        trackInventory: data.trackInventory,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      },
      include: { category: true, variants: true },
    });
  }

  async deleteProduct(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const store = await this.prisma.store.findFirst({ where: { userId } });
    if (product.storeId !== store?.id) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
      if (!user?.roles.some((r: any) => r.role === 'ADMIN')) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }
    await this.prisma.product.delete({ where: { id } });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        images: true,
        store: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async listProducts(paginationDto: PaginationDto, filters: any): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.status !== undefined) where.status = filters.status;
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true } },
          variants: { select: { id: true, name: true, price: true } },
          store: { select: { id: true, name: true } },
          images: { where: { isPrimary: true }, take: 1, select: { id: true, url: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data,
      pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  async updateStock(id: string, data: { quantity: number; operation: 'add' | 'subtract' | 'set' }) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    let newQuantity: number;
    const currentQty = product.quantity;
    switch (data.operation) {
      case 'add': newQuantity = currentQty + data.quantity; break;
      case 'subtract':
        newQuantity = currentQty - data.quantity;
        if (newQuantity < 0) throw new BadRequestException('Insufficient stock');
        break;
      case 'set':
        newQuantity = data.quantity;
        if (newQuantity < 0) throw new BadRequestException('Stock cannot be negative');
        break;
      default: throw new BadRequestException('Invalid stock operation');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        quantity: newQuantity,
        status: newQuantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      },
    });
  }

  async createCategory(data: any) {
    const existing = await this.prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Category with this slug already exists');

    return this.prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        slug: data.slug,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    });
  }

  async getCategoryTree() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true, children: true, _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async createVariant(data: any) {
    const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException(`Product ${data.productId} not found`);

    const existing = await this.prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (existing) throw new ConflictException('Variant with this SKU already exists');

    return this.prisma.productVariant.create({
      data: {
        productId: data.productId,
        name: data.name,
        sku: data.sku,
        price: data.price,
        quantity: data.quantity ?? 0,
      },
    });
  }

  async getProductVariants(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async uploadImage(productId: string, file: any) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const imageUrl = `/uploads/${file.filename}`;
    return this.prisma.productImage.create({
      data: {
        productId,
        url: imageUrl,
        altText: product.name,
        isPrimary: false,
        sortOrder: 999,
      },
    });
  }

  async listTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCoupon(data: any, _userId: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        usageCount: 0,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
        storeId: data.storeId || null,
        productId: data.productId || null,
        perUserLimit: data.perUserLimit ?? 1,
      },
    });
  }

  async applyCoupon(data: { couponCode: string; orderAmount: number; productIds: string[] }) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: data.couponCode } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is not active');

    const now = new Date();
    if (coupon.startsAt && coupon.expiresAt && (now < coupon.startsAt || now > coupon.expiresAt)) {
      throw new BadRequestException('Coupon is expired or not yet valid');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }
    if (coupon.minOrderAmount && data.orderAmount < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount}`);
    }
    if (coupon.productId && !data.productIds.includes(coupon.productId)) {
      throw new BadRequestException('Coupon is not applicable to these products');
    }

    let discount: number;
    if (coupon.discountType === 'percentage') {
      discount = (data.orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = Number(coupon.discountValue);
    }

    const finalAmount = Math.max(0, data.orderAmount - discount);
    return { coupon, originalAmount: data.orderAmount, discountAmount: discount, finalAmount };
  }

  async listCoupons(_userId: string) {
    return this.prisma.coupon.findMany({
      where: { storeId: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStore(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        products: { where: { status: 'ACTIVE' }, take: 8 },
        _count: { select: { products: true, followers: true } },
      },
    });
    if (!store) throw new NotFoundException(`Store ${id} not found`);
    return store;
  }

  async listStores(paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.store.findMany({
        where: { status: 'ACTIVE' },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { products: true, followers: true } } },
      }),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data,
      pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }
}
