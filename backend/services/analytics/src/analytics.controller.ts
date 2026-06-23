import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard metrics (admin only)' })
  async getDashboardMetrics() {
    const metrics = await this.analyticsService.getDashboardMetrics();
    return { statusCode: HttpStatus.OK, data: metrics };
  }

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue breakdown by currency (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days for revenue period' })
  async getRevenueByCurrency(@Query('days') days?: number) {
    const revenue = await this.analyticsService.getRevenueByCurrency(
      days ? parseInt(String(days), 10) : 30,
    );
    return { statusCode: HttpStatus.OK, data: revenue };
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user growth analytics (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days for growth period' })
  async getUserGrowth(@Query('days') days?: number) {
    const growth = await this.analyticsService.getUserGrowth(
      days ? parseInt(String(days), 10) : 30,
    );
    return { statusCode: HttpStatus.OK, data: growth };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get order statistics (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days for order stats period' })
  async getOrderStats(@Query('days') days?: number) {
    const stats = await this.analyticsService.getOrderStats(
      days ? parseInt(String(days), 10) : 30,
    );
    return { statusCode: HttpStatus.OK, data: stats };
  }

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get provider/seller performance metrics (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of providers to return' })
  async getProviderPerformance(@Query('limit') limit?: number) {
    const performance = await this.analyticsService.getProviderPerformance(
      limit ? parseInt(String(limit), 10) : 20,
    );
    return { statusCode: HttpStatus.OK, data: performance };
  }

  @Get('au-balances')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Adbar Unit (AU) balance distribution across currencies (admin only)' })
  async getAUBalanceDistribution() {
    const distribution = await this.analyticsService.getAUBalanceDistribution();
    return { statusCode: HttpStatus.OK, data: distribution };
  }
}
