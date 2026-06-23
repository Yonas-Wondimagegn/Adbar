import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@adbar/common';
import { PaginationDto } from '@adbar/common';

class CreateOrderDto {
  items!: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  shippingAddress!: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  billingAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  couponCode?: string;
  notes?: string;
  paymentMethod!: string;
  currency?: string;
}

class UpdateStatusDto {
  status!: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

class CancelOrderDto {
  reason!: string;
}

class ConfirmDeliveryDto {
  recipientName?: string;
  signature?: string;
}

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @CurrentUser('id') userId: string) {
    const order = await this.orderService.createOrder(createOrderDto, userId);
    return { statusCode: HttpStatus.CREATED, data: order, message: 'Order created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sellerId', required: false })
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.orderService.getUserOrders(userId, paginationDto, status);
  }

  @Get('seller')
  @UseGuards(RolesGuard)
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Get seller orders' })
  @ApiQuery({ name: 'status', required: false })
  async getSellerOrders(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.orderService.getSellerOrders(userId, paginationDto, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const order = await this.orderService.getOrder(id, userId);
    return { statusCode: HttpStatus.OK, data: order };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.orderService.updateOrderStatus(id, updateStatusDto, userId);
    return { statusCode: HttpStatus.OK, data: order, message: 'Order status updated' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() cancelOrderDto: CancelOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.orderService.cancelOrder(id, cancelOrderDto.reason, userId);
    return { statusCode: HttpStatus.OK, data: order, message: 'Order cancelled' };
  }

  @Post(':id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm delivery of an order' })
  async confirmDelivery(
    @Param('id') id: string,
    @Body() confirmDeliveryDto: ConfirmDeliveryDto,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.orderService.confirmDelivery(id, confirmDeliveryDto, userId);
    return { statusCode: HttpStatus.OK, data: order, message: 'Delivery confirmed' };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order history/status changes' })
  async getOrderHistory(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const history = await this.orderService.getOrderHistory(id, userId);
    return { statusCode: HttpStatus.OK, data: history };
  }
}
