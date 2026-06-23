import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, PaginationDto } from '@adbar/common';
import { AdminService } from './admin.service';

class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: string;
  isVerified?: boolean;
  isBanned?: boolean;
}

class ReviewKycDto {
  decision!: 'approved' | 'rejected';
  reason?: string;
}

class UpdatePaymentProviderDto {
  isActive?: boolean;
  config?: any;
  priority?: number;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========== USER MANAGEMENT ==========

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async getUsers(
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: string,
    @Query('isVerified') isVerified?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.adminService.getUsers(paginationDto, {
      role,
      isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
      search,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserById(@Param('id', ParseUUIDPipe) userId: string) {
    const user = await this.adminService.getUserById(userId);
    return { statusCode: HttpStatus.OK, data: user };
  }

  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.adminService.updateUser(userId, updateUserDto);
    return { statusCode: HttpStatus.OK, data: user, message: 'User updated successfully' };
  }

  // ========== ORDER MANAGEMENT ==========

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAllOrders(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.adminService.getAllOrders(paginationDto, {
      status,
      startDate,
      endDate,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== TRANSACTION MANAGEMENT ==========

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all transactions (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async getTransactions(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.adminService.getTransactions(paginationDto, {
      type,
      status,
      userId,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== WALLET MANAGEMENT ==========

  @Get('wallets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all wallets (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async getWallets(
    @Query() paginationDto: PaginationDto,
    @Query('currency') currency?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.adminService.getWallets(paginationDto, {
      currency,
      userId,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== PAYMENT PROVIDERS ==========

  @Get('payments/providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment providers (admin only)' })
  async getPaymentProviders() {
    const providers = await this.adminService.getPaymentProviders();
    return { statusCode: HttpStatus.OK, data: providers };
  }

  @Put('payments/providers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payment provider (admin only)' })
  @ApiParam({ name: 'id', description: 'Payment provider ID' })
  async updatePaymentProvider(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Body() updateDto: UpdatePaymentProviderDto,
  ) {
    const provider = await this.adminService.updatePaymentProvider(
      providerId,
      updateDto,
    );
    return { statusCode: HttpStatus.OK, data: provider, message: 'Payment provider updated' };
  }

  // ========== ANALYTICS DASHBOARD ==========

  @Get('analytics/dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get admin analytics dashboard (admin only)' })
  async getAnalyticsDashboard() {
    // Reuse analytics service data
    return { statusCode: HttpStatus.OK, data: { message: 'Use /analytics/dashboard for detailed metrics' } };
  }

  // ========== KYC MANAGEMENT ==========

  @Get('kyc/pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pending KYC verifications (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingKyc(@Query() paginationDto: PaginationDto) {
    const result = await this.adminService.getPendingKyc(paginationDto);
    return { statusCode: HttpStatus.OK, data: result };
  }

  @Put('kyc/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a KYC verification (admin only)' })
  @ApiParam({ name: 'id', description: 'KYC verification ID' })
  async reviewKyc(
    @Param('id', ParseUUIDPipe) kycId: string,
    @Body() reviewDto: ReviewKycDto,
  ) {
    const result = await this.adminService.reviewKyc(
      kycId,
      reviewDto.decision,
      reviewDto.reason,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: `KYC ${reviewDto.decision}`,
    };
  }

  // ========== ONBOARDING MANAGEMENT ==========

  @Get('onboarding/pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pending store onboarding (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingOnboarding(@Query() paginationDto: PaginationDto) {
    const result = await this.adminService.getPendingOnboarding(paginationDto);
    return { statusCode: HttpStatus.OK, data: result };
  }

  @Put('onboarding/:storeId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve store onboarding (admin only)' })
  @ApiParam({ name: 'storeId', description: 'Store ID' })
  async approveOnboarding(
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    const result = await this.adminService.approveOnboarding(storeId);
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Store approved successfully',
    };
  }

  // ========== SUPPORT TICKETS ==========

  @Get('support/tickets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get support tickets (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  async getSupportTickets(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const result = await this.adminService.getSupportTickets(paginationDto, {
      status,
      priority,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== ANALYTICS REVENUE ==========

  @Get('analytics/revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue analytics (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getRevenueAnalytics(@Query('days') days?: number) {
    return { statusCode: HttpStatus.OK, data: { message: 'Use /analytics/revenue for detailed revenue data' } };
  }

  // ========== ANALYTICS PROVIDERS ==========

  @Get('analytics/providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get provider analytics (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProviderAnalytics(@Query('limit') limit?: number) {
    return { statusCode: HttpStatus.OK, data: { message: 'Use /analytics/providers for detailed provider data' } };
  }

  // ========== USSD HEALTH ==========

  @Get('ussd/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get USSD service health status (admin only)' })
  async getUssdHealth() {
    const health = await this.adminService.getUssdHealth();
    return { statusCode: HttpStatus.OK, data: health };
  }

  // ========== SMS ANALYTICS ==========

  @Get('sms/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get SMS delivery analytics (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSmsAnalytics(@Query('days') days?: number) {
    const analytics = await this.adminService.getSmsAnalytics(
      days ? parseInt(String(days), 10) : 30,
    );
    return { statusCode: HttpStatus.OK, data: analytics };
  }
}
