import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async createStore(data: any, userId: string) {
    const existing = await this.prisma.store.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException('Store with this slug already exists');
    }

    // Check if user already has a store
    const existingStore = await this.prisma.store.findFirst({ where: { userId: userId } });
    if (existingStore) {
      throw new ConflictException('You already have a store');
    }

    return this.prisma.store.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logo,
        bannerUrl: data.banner,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        userId: userId,
        status: 'ACTIVE',
      },
    });
  }

  async getStore(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        products: {
          where: { status: 'ACTIVE' },
          take: 12,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            followers: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return store;
  }

  async getStoreBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        products: {
          where: { status: 'ACTIVE' },
          take: 12,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            followers: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with slug "${slug}" not found`);
    }

    return store;
  }

  async updateStore(id: string, data: any, userId: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    if (store.userId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if ((user as any)?.role !== 'admin') {
        throw new ForbiddenException('You can only update your own store');
      }
    }

    return this.prisma.store.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logo,
        bannerUrl: data.banner,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        status: data.status,
      },
    });
  }

  async listStores(paginationDto: PaginationDto, filters?: { category?: string; search?: string }) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { products: true, followers: true } },
        },
      }),
      this.prisma.store.count({ where }),
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

  async toggleFollowStore(storeId: string, userId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    const existingFollow = await (this.prisma as any).storeFollower.findUnique({
      where: {
        storeId_userId: {
          storeId,
          userId,
        },
      },
    });

    if (existingFollow) {
      await (this.prisma as any).storeFollower.delete({
        where: { id: existingFollow.id },
      });
      return { following: false };
    }

    await (this.prisma as any).storeFollower.create({
      data: {
        storeId,
        userId,
      },
    });

    return { following: true };
  }

  async getStoreProducts(storeId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { storeId, status: 'ACTIVE' };

    const [data, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
        },
      }),
      this.prisma.product.count({ where }),
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
}
