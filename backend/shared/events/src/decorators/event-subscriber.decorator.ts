import { SetMetadata } from '@nestjs/common';

export const EVENT_SUBSCRIBER_KEY = 'event_subscriber';

export interface EventSubscriberOptions {
  topic: string;
  group?: string;
  autoAck?: boolean;
  maxRetries?: number;
}

export const EventSubscriber = (options: EventSubscriberOptions) =>
  SetMetadata(EVENT_SUBSCRIBER_KEY, options);
