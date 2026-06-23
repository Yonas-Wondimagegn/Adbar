import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { PaginationDto } from '@adbar/common';
import { ReviewService } from './review.service';

class CreateReviewDto {
  rating!: number;
  title?: string;
  comment!: string;
  targetType!: 'product' | 'seller' | 'freelancer' | 'client' | 'store';
  targetId!: string;
}

class RespondToReviewDto {
  response!: string;
}

class ModerateReviewDto {
  action!: 'approve' | 'reject' | 'flag';
  reason?: string;
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a review' })
  async createReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewService.createReview(userId, dto);
    return { statusCode: HttpStatus.CREATED, data: review, message: 'Review created successfully' };
  }

  @Get('product/:id')
  @ApiOperation({ summary: 'Get reviews for a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async getProductReviews(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query() paginationDto: PaginationDto,
    @Query('rating') rating?: string,
  ) {
    return this.reviewService.getProductReviews(productId, paginationDto, rating ? parseInt(rating, 10) : undefined);
  }

  @Get('seller/:id')
  @ApiOperation({ summary: 'Get reviews for a seller' })
  @ApiParam({ name: 'id', description: 'Seller (user) ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSellerReviews(
    @Param('id', ParseUUIDPipe) sellerId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reviewService.getSellerReviews(sellerId, paginationDto);
  }

  @Get('freelancer/:id')
  @ApiOperation({ summary: 'Get reviews for a freelancer' })
  @ApiParam({ name: 'id', description: 'Freelancer (user) ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFreelancerReviews(
    @Param('id', ParseUUIDPipe) freelancerId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reviewService.getFreelancerReviews(freelancerId, paginationDto);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  async respondToReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: RespondToReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    const review = await this.reviewService.respondToReview(reviewId, userId, dto.response);
    return { statusCode: HttpStatus.OK, data: review, message: 'Response added successfully' };
  }

  @Put(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Moderate a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  async moderateReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    const review = await this.reviewService.moderateReview(reviewId, userId, dto.action, dto.reason);
    return { statusCode: HttpStatus.OK, data: review, message: `Review ${dto.action}d` };
  }
}
