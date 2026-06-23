export enum NotificationEventTopics {
  NOTIFICATION_EMAIL = 'notification.email',
  NOTIFICATION_SMS = 'notification.sms',
  NOTIFICATION_PUSH = 'notification.push',
  NOTIFICATION_IN_APP = 'notification.in_app',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_FAILED = 'notification.failed',
}

export interface NotificationEmailEvent {
  recipientEmail: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface NotificationSmsEvent {
  recipientPhone: string;
  message: string;
  templateName?: string;
  templateData?: Record<string, string>;
}

export interface NotificationPushEvent {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export interface NotificationInAppEvent {
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSentEvent {
  notificationId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  recipient: string;
  sentAt: string;
}

export interface NotificationDeliveredEvent {
  notificationId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  deliveredAt: string;
}

export interface NotificationFailedEvent {
  notificationId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  errorCode: string;
  errorMessage: string;
  retryCount: number;
}

export type NotificationEvents = {
  [NotificationEventTopics.NOTIFICATION_EMAIL]: NotificationEmailEvent;
  [NotificationEventTopics.NOTIFICATION_SMS]: NotificationSmsEvent;
  [NotificationEventTopics.NOTIFICATION_PUSH]: NotificationPushEvent;
  [NotificationEventTopics.NOTIFICATION_IN_APP]: NotificationInAppEvent;
  [NotificationEventTopics.NOTIFICATION_SENT]: NotificationSentEvent;
  [NotificationEventTopics.NOTIFICATION_DELIVERED]: NotificationDeliveredEvent;
  [NotificationEventTopics.NOTIFICATION_FAILED]: NotificationFailedEvent;
};
