import { PaginatedResult, PaginationDto } from './pagination.dto';

export class PaginationUtil {
  static paginate<T>(
    items: T[],
    totalItems: number,
    options: PaginationDto,
  ): PaginatedResult<T> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
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

  static getSkipTake(options: PaginationDto): { skip: number; take: number } {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  static getOrderBy(options: PaginationDto): Record<string, string> {
    if (!options.sortBy) {
      return { createdAt: 'desc' };
    }
    return {
      [options.sortBy]: options.sortOrder ?? 'desc',
    };
  }

  static buildPrismaQuery(options: PaginationDto) {
    const { skip, take } = this.getSkipTake(options);
    const orderBy = this.getOrderBy(options);
    return { skip, take, orderBy };
  }
}
