import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations per tier
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many requests. Please try again later.',
  },
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    message: 'Rate limit exceeded. Please slow down.',
  },
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
    message: 'Admin rate limit exceeded.',
  },
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Rate limit exceeded for this endpoint.',
  },
};

// Endpoints with strict rate limits
const STRICT_ENDPOINTS = [
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
  'POST /api/v1/ussd/callback',
];

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Generate rate limit key (user ID if authenticated, IP otherwise)
    const userId = (req as any).user?.sub;
    const clientIp = this.getClientIp(req);
    const key = userId ? `user:${userId}` : `ip:${clientIp}`;

    // Determine rate limit tier
    const routeKey = `${req.method} ${req.path}`;
    const isStrict = STRICT_ENDPOINTS.some((endpoint) => {
      const pattern = endpoint.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/');
      return new RegExp(`^${pattern}$`).test(routeKey);
    });

    const isAdmin = (req as any).user?.roles?.includes('admin');
    const isAuthenticated = !!userId;

    let tier = 'default';
    if (isStrict) {
      tier = 'strict';
    } else if (isAdmin) {
      tier = 'admin';
    } else if (isAuthenticated) {
      tier = 'authenticated';
    }

    const config = RATE_LIMITS[tier];
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now >= entry.resetTime) {
      // New window
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        windowStart: now,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Existing window
      entry.count += 1;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, config.maxRequests - entry.count),
    );
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for ${key} (${tier} tier) on ${routeKey}`,
      );

      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: config.message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
