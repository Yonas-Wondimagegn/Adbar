import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: config.windowMs ?? 60000, // 1 minute default
      maxRequests: config.maxRequests ?? 100,
      keyGenerator: config.keyGenerator ?? this.defaultKeyGenerator,
      skipFailedRequests: config.skipFailedRequests ?? false,
      message: config.message ?? 'Too many requests, please try again later.',
    };
  }

  private defaultKeyGenerator(req: Request): string {
    const userId = (req as any).user?.id;
    if (userId) return `user:${userId}`;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();

    // Clean expired entries periodically
    if (this.store.size > 10000) {
      this.cleanExpiredEntries(now);
    }

    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.store.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      this.setRateLimitHeaders(res, 1, this.config.maxRequests, now + this.config.windowMs);
      next();
      return;
    }

    // Increment counter
    entry.count += 1;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    this.setRateLimitHeaders(res, entry.count, this.config.maxRequests, entry.resetTime);

    if (entry.count > this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.config.message,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private setRateLimitHeaders(
    res: Response,
    current: number,
    max: number,
    resetTime: number,
  ): void {
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
  }

  private cleanExpiredEntries(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
