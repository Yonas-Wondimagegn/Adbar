import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '@adbar/common';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    notificationSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create an in-app notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'EMAIL',
        title: 'Order Shipped',
        message: 'Your order has been shipped',
        isRead: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user-1',
        type: 'EMAIL',
        title: 'Order Shipped',
        message: 'Your order has been shipped',
      });

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should create notification with multiple channels', async () => {
      const mockNotification = {
        id: 'notif-2',
        userId: 'user-1',
        type: 'PUSH',
        title: 'Payment Received',
        body: 'Your payment was successful',
        isRead: false,
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
      });

      const result = await service.createNotification({
        userId: 'user-1',
        type: 'PUSH',
        title: 'Payment Received',
        message: 'Your payment was successful',
        channels: ['in_app', 'email'],
      });

      expect(result.type).toBe('PUSH');
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Test 1', isRead: false },
        { id: 'notif-2', title: 'Test 2', isRead: true },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.getNotifications('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by isRead status', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', { page: 1, limit: 20 }, true);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: true }),
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', { page: 1, limit: 20 }, undefined, 'order_update');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'order_update' }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      };

      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for notification belonging to another user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
      });

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result.updatedCount).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(3);
    });
  });

  describe('getSettings', () => {
    it('should return user notification settings', async () => {
      const mockSettings = {
        email: true,
        sms: true,
        push: false,
        inApp: true,
      };

      mockPrisma.notificationSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await service.getSettings('user-1');

      expect(result.emailEnabled).toBe(true);
      expect(result.smsEnabled).toBe(true);
      expect(result.pushEnabled).toBe(false);
    });

    it('should return default settings when none set', async () => {
      mockPrisma.notificationSettings.findUnique.mockResolvedValue(null);

      const result = await service.getSettings('user-1');

      expect(result.emailEnabled).toBe(true);
      expect(result.smsEnabled).toBe(false);
      expect(result.pushEnabled).toBe(true);
      expect(result.promotions).toBe(false);
    });

    it('should return default settings when no settings exist', async () => {
      mockPrisma.notificationSettings.findUnique.mockResolvedValue(null);

      const result = await service.getSettings('nonexistent');

      expect(result.emailEnabled).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('should update notification settings', async () => {
      mockPrisma.notificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.notificationSettings.upsert.mockResolvedValue({});

      const result = await service.updateSettings('user-1', {
        emailEnabled: false,
        promotions: true,
      });

      expect(result.emailEnabled).toBe(false);
      expect(result.promotions).toBe(true);
      // Defaults preserved
      expect(result.pushEnabled).toBe(true);
      expect(result.orderUpdates).toBe(true);
    });
  });
});
