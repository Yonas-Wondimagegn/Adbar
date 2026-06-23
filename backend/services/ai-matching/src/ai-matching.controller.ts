import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { AiMatchingService } from './ai-matching.service';

@ApiTags('ai-matching')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiMatchingController {
  constructor(private readonly aiMatchingService: AiMatchingService) {}

  @Get('recommendations/products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-powered product recommendations based on user behavior' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations' })
  async getProductRecommendations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    const recommendations = await this.aiMatchingService.getProductRecommendations(
      userId,
      limit ? parseInt(String(limit), 10) : 10,
    );
    return { statusCode: HttpStatus.OK, data: recommendations };
  }

  @Get('recommendations/jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-powered job recommendations for freelancers' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations' })
  async getJobRecommendations(
    @CurrentUser('id') freelancerId: string,
    @Query('limit') limit?: number,
  ) {
    const recommendations = await this.aiMatchingService.getJobRecommendations(
      freelancerId,
      limit ? parseInt(String(limit), 10) : 10,
    );
    return { statusCode: HttpStatus.OK, data: recommendations };
  }

  @Get('recommendations/freelancers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-powered freelancer recommendations based on skills and ratings' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations' })
  async getFreelancerRecommendations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    // Get user's job categories and find matching freelancers
    const userOrders = await this.aiMatchingService.getProductRecommendations(userId, 5);
    const recommendations = await this.aiMatchingService.getJobRecommendations(
      userId,
      limit ? parseInt(String(limit), 10) : 10,
    );
    return { statusCode: HttpStatus.OK, data: recommendations };
  }

  @Get('match/:jobId')
  @UseGuards(RolesGuard)
  @Roles('client', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Match freelancers for a specific job using AI scoring algorithm' })
  @ApiParam({ name: 'jobId', description: 'Job ID to match freelancers for' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of matches to return' })
  async matchFreelancersForJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('limit') limit?: number,
  ) {
    const matches = await this.aiMatchingService.matchFreelancersForJob(
      jobId,
      limit ? parseInt(String(limit), 10) : 10,
    );
    return { statusCode: HttpStatus.OK, data: matches };
  }
}
