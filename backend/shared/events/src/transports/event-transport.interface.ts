import { AdbarEvent, PublishOptions } from '../publisher/event-publisher';

export interface EventTransport {
  publish<T>(
    topic: string,
    event: AdbarEvent<T>,
    options?: PublishOptions,
  ): Promise<void>;

  publishAll<T>(
    events: Array<{ topic: string; event: AdbarEvent<T>; options?: PublishOptions }>,
  ): Promise<void>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export enum TransportType {
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',
}

export function createTransport(type: TransportType, config: any): EventTransport {
  switch (type) {
    case TransportType.KAFKA:
      // Lazy import to avoid circular dependencies
      const { KafkaTransport } = require('./kafka.transport');
      return new KafkaTransport(config);
    case TransportType.RABBITMQ:
      const { RabbitMQTransport } = require('./rabbitmq.transport');
      return new RabbitMQTransport(config);
    default:
      throw new Error(`Unsupported transport type: ${type}`);
  }
}
