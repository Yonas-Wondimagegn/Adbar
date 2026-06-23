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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@adbar/common';
import { CurrentUser } from '@adbar/common';
import { PaginationDto } from '@adbar/common';
import { NotificationService } from './notification.service';

class UpdateNotificationSettingsDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  orderUpdates?: boolean;
  paymentUpdates?: boolean;
  promotions?: boolean;
  reviewUpdates?: boolean;
  systemAlerts?: boolean;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const isReadFilter = isRead !== undefined ? isRead === 'true' : undefined;
    return this.notificationService.getNotifications(userId, paginationDto, isReadFilter, type);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.notificationService.markAsRead(id, userId);
    return { statusCode: HttpStatus.OK, data: notification, message: 'Notification marked as read' };
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const result = await this.notificationService.markAllAsRead(userId);
    return { statusCode: HttpStatus.OK, data: result, message: 'All notifications marked as read' };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { statusCode: HttpStatus.OK, data: { unreadCount: count } };
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification settings' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.notificationService.updateSettings(userId, dto);
    return { statusCode: HttpStatus.OK, data: settings, message: 'Notification settings updated' };
  }
}
