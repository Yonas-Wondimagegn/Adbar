import { Injectable, Logger } from '@nestjs/common';

export interface AdbarEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  version: string;
  timestamp: Date;
  source: string;
  data: T;
  metadata: {
    userId?: string;
    correlationId: string;
    causationId?: string;
  };
}

export interface PublishOptions {
  key?: string;
  headers?: Record<string, string>;
  partition?: number;
}

@Injectable()
export abstract class EventPublisher {
  protected readonly logger = new Logger(EventPublisher.name);

  abstract publish<T>(
    topic: string,
    event: AdbarEvent<T>,
    options?: PublishOptions,
  ): Promise<void>;

  abstract publishAll<T>(
    events: Array<{ topic: string; event: AdbarEvent<T>; options?: PublishOptions }>,
  ): Promise<void>;

  protected createEvent<T>(
    type: string,
    source: string,
    data: T,
    metadata: Partial<AdbarEvent<T>['metadata']> = {},
  ): AdbarEvent<T> {
    return {
      id: this.generateId(),
      type,
      version: '1.0.0',
      timestamp: new Date(),
      source,
      data,
      metadata: {
        correlationId: metadata.correlationId ?? this.generateId(),
        ...metadata,
      },
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
