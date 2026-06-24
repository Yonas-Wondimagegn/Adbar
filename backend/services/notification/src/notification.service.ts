import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';
import { $Enums } from '@prisma/client';
type NotificationType = $Enums.NotificationType;

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  orderUpdates: boolean;
  paymentUpdates: boolean;
  promotions: boolean;
  reviewUpdates: boolean;
  systemAlerts: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  orderUpdates: true,
  paymentUpdates: true,
  promotions: false,
  reviewUpdates: true,
  systemAlerts: true,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== CREATE NOTIFICATION ==========

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    channels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
  }) {
    const channels = data.channels || ['in_app'];

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.message,
        data: data.metadata as any,
        isRead: false,
      },
    });

    this.logger.log(`Notification created: ${notification.id} for user: ${data.userId}`);

    // Dispatch to external channels based on user settings
    for (const channel of channels) {
      if (channel === 'email') {
        await this.sendEmail(data.userId, data.title, data.message, data.metadata);
      } else if (channel === 'sms') {
        await this.sendSms(data.userId, data.message);
      } else if (channel === 'push') {
        await this.sendPush(data.userId, data.title, data.message, data.metadata);
      }
    }

    return notification;
  }

  // ========== GET NOTIFICATIONS ==========

  async getNotifications(
    userId: string,
    paginationDto: PaginationDto,
    isRead?: boolean,
    type?: string,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    if (type) {
      where.type = type;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
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

  // ========== MARK AS READ ==========

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    this.logger.log(`Notification ${notificationId} marked as read by user: ${userId}`);

    return updated;
  }

  // ========== MARK ALL AS READ ==========

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    this.logger.log(`All notifications marked as read for user: ${userId} (${result.count} updated)`);

    return { updatedCount: result.count };
  }

  // ========== UNREAD COUNT ==========

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ========== NOTIFICATION SETTINGS ==========

  async getSettings(userId: string): Promise<NotificationSettings> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return DEFAULT_SETTINGS;
    }

    return {
      emailEnabled: settings.email,
      smsEnabled: settings.sms,
      pushEnabled: settings.push,
      inAppEnabled: settings.inApp,
      orderUpdates: true,
      paymentUpdates: true,
      promotions: false,
      reviewUpdates: true,
      systemAlerts: true,
    };
  }

  async updateSettings(
    userId: string,
    dto: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const currentSettings = await this.getSettings(userId);

    const updatedSettings: NotificationSettings = {
      ...currentSettings,
      ...(dto.emailEnabled !== undefined && { emailEnabled: dto.emailEnabled }),
      ...(dto.smsEnabled !== undefined && { smsEnabled: dto.smsEnabled }),
      ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
      ...(dto.inAppEnabled !== undefined && { inAppEnabled: dto.inAppEnabled }),
      ...(dto.orderUpdates !== undefined && { orderUpdates: dto.orderUpdates }),
      ...(dto.paymentUpdates !== undefined && { paymentUpdates: dto.paymentUpdates }),
      ...(dto.promotions !== undefined && { promotions: dto.promotions }),
      ...(dto.reviewUpdates !== undefined && { reviewUpdates: dto.reviewUpdates }),
      ...(dto.systemAlerts !== undefined && { systemAlerts: dto.systemAlerts }),
    };

    await this.prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        email: updatedSettings.emailEnabled,
        sms: updatedSettings.smsEnabled,
        push: updatedSettings.pushEnabled,
        inApp: updatedSettings.inAppEnabled,
      },
      create: {
        userId,
        email: updatedSettings.emailEnabled,
        sms: updatedSettings.smsEnabled,
        push: updatedSettings.pushEnabled,
        inApp: updatedSettings.inAppEnabled,
      },
    });

    this.logger.log(`Notification settings updated for user: ${userId}`);

    return updatedSettings;
  }

  // ========== CHANNEL SENDERS ==========

  async sendEmail(
    userId: string,
    subject: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        this.logger.warn(`Cannot send email: user ${userId} not found`);
        return;
      }

      const settings = await this.getSettings(userId);
      if (!settings.emailEnabled) {
        this.logger.debug(`Email notifications disabled for user: ${userId}`);
        return;
      }

      // In production: integrate with email provider (SendGrid, SES, etc.)
      this.logger.log(`Sending email to ${user.email}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to user ${userId}`, error);
    }
  }

  async sendSms(userId: string, message: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });

      if (!user || !user.phone) {
        this.logger.warn(`Cannot send SMS: user ${userId} has no phone number`);
        return;
      }

      const settings = await this.getSettings(userId);
      if (!settings.smsEnabled) {
        this.logger.debug(`SMS notifications disabled for user: ${userId}`);
        return;
      }

      // In production: integrate with SMS provider (Twilio, Africa's Talking, etc.)
      this.logger.log(`Sending SMS to ${user.phone}: ${message.substring(0, 50)}...`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to user ${userId}`, error);
    }
  }

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const settings = await this.getSettings(userId);
      if (!settings.pushEnabled) {
        this.logger.debug(`Push notifications disabled for user: ${userId}`);
        return;
      }

      // In production: integrate with FCM, APNs, or OneSignal
      this.logger.log(`Sending push notification to user ${userId}: ${title}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}`, error);
    }
  }
}

