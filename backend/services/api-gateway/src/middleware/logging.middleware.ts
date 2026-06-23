import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  statusCode: number;
  responseTime: number;
  userAgent: string;
  ip: string;
  userId?: string;
  contentLength?: number;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Attach request ID for tracing
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log request
    const clientIp = this.getClientIp(req);
    this.logger.log(
      `[${requestId}] → ${req.method} ${req.path} from ${clientIp}`,
    );

    // Capture response finish
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const userId = (req as any).user?.sub;

      const logEntry: RequestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: Object.keys(req.query || {}).length > 0 ? req.query as Record<string, any> : undefined,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: clientIp,
        userId,
        contentLength: res.getHeader('content-length')
          ? parseInt(String(res.getHeader('content-length')), 10)
          : undefined,
      };

      // Choose log level based on status code
      const statusEmoji = this.getStatusEmoji(res.statusCode);
      const logMessage = `[${requestId}] ${statusEmoji} ${req.method} ${req.path} ${res.statusCode} ${responseTime}ms`;

      if (res.statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (res.statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getStatusEmoji(statusCode: number): string {
    if (statusCode < 300) return '✅';
    if (statusCode < 400) return '↩️';
    if (statusCode < 500) return '⚠️';
    return '❌';
  }
}
