import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

export interface CreateReviewInput {
  rating: number;
  title?: string;
  comment: string;
  targetType: 'product' | 'seller' | 'freelancer' | 'client' | 'store';
  targetId: string;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, input: CreateReviewInput) {
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Validate target exists
    await this.validateTarget(input.targetType, input.targetId);

    // Duplicate check
    const existing = await this.prisma.review.findFirst({
      where: { reviewerId: userId, targetId: input.targetId, targetType: input.targetType },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this entity.');
    }

    const review = await this.prisma.review.create({
      data: {
        reviewerId: userId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        targetType: input.targetType,
        targetId: input.targetId,
        isVisible: true,
      },
    });

    await this.updateAggregateRating(input);
    this.logger.log(`Review created: ${review.id} by user ${userId} for ${input.targetType}:${input.targetId}`);

    return review;
  }

  async getProductReviews(
    productId: string,
    paginationDto: PaginationDto,
    ratingFilter?: number,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    return this.getReviews({ targetType: 'product', targetId: productId }, page, limit, ratingFilter);
  }

  async getSellerReviews(
    sellerId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    return this.getReviews({ targetType: 'seller', targetId: sellerId }, page, limit);
  }

  async getFreelancerReviews(
    freelancerId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    return this.getReviews({ targetType: 'freelancer', targetId: freelancerId }, page, limit);
  }

  private async getReviews(
    target: { targetType: string; targetId: string },
    page: number,
    limit: number,
    ratingFilter?: number,
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;
    const where: any = { ...target, isVisible: true };
    if (ratingFilter !== undefined) where.rating = ratingFilter;

    const [data, totalItems] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data,
      pagination: {
        page, limit, totalItems, totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async respondToReview(reviewId: string, userId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    const isTarget = review.targetId === userId;
    const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
    const isAdmin = userRoles.some((r) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');

    if (!isTarget && !isAdmin) {
      throw new ForbiddenException('Only the reviewed entity or admin can respond');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { response, respondedAt: new Date() },
    });

    return updated;
  }

  async moderateReview(
    reviewId: string,
    moderatorId: string,
    action: 'approve' | 'reject' | 'flag',
    reason?: string,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    const isVisible = action === 'approve';

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isVisible },
    });

    if (isVisible) {
      await this.updateAggregateRating({
        targetType: review.targetType,
        targetId: review.targetId,
      });
    }

    this.logger.log(`Review ${reviewId} moderated: ${action} by ${moderatorId}`);
    return updated;
  }

  private async validateTarget(targetType: string, targetId: string) {
    switch (targetType) {
      case 'product': {
        const p = await this.prisma.product.findUnique({ where: { id: targetId } });
        if (!p) throw new NotFoundException(`Product ${targetId} not found`);
        break;
      }
      case 'seller':
      case 'freelancer':
      case 'client': {
        const u = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!u) throw new NotFoundException(`User ${targetId} not found`);
        break;
      }
      case 'store': {
        const s = await this.prisma.store.findUnique({ where: { id: targetId } });
        if (!s) throw new NotFoundException(`Store ${targetId} not found`);
        break;
      }
      default:
        throw new BadRequestException(`Invalid target type: ${targetType}`);
    }
  }

  private async updateAggregateRating(input: { targetType: string; targetId: string }) {
    try {
      const stats = await this.prisma.review.aggregate({
        where: { targetType: input.targetType, targetId: input.targetId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const averageRating = stats._avg.rating || 0;
      const reviewCount = stats._count.rating || 0;

      if (input.targetType === 'product') {
        await this.prisma.product.update({
          where: { id: input.targetId },
          data: { averageRating, reviewCount },
        });
      } else if (input.targetType === 'freelancer') {
        await this.prisma.freelancerProfile.update({
          where: { userId: input.targetId },
          data: { averageRating, reviewCount },
        });
      } else if (input.targetType === 'store') {
        await this.prisma.store.update({
          where: { id: input.targetId },
          data: { averageRating, reviewCount },
        });
      }
    } catch (error) {
      this.logger.error('Failed to update aggregate rating', error);
    }
  }
}
