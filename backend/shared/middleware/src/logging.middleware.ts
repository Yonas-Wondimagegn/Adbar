import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Attach correlation ID to request for downstream use
    (req as any).correlationId = correlationId;

    // Log incoming request
    this.logger.log(
      `[${correlationId}] ${method} ${originalUrl} - Client: ${ip} - UA: ${userAgent}`,
    );

    // Override response end to log completion
    const oldEnd = res.end;
    res.end = (...args: any) => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      const logLevel = statusCode >= 400 ? 'warn' : 'log';
      this.logger[logLevel](
        `[${correlationId}] ${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`,
      );

      // Set correlation ID in response headers
      res.setHeader('X-Correlation-Id', correlationId);

      return oldEnd.apply(res, args);
    };

    next();
  }
}
