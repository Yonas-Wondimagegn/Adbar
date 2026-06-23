import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly CORRELATION_ID_HEADER = 'x-correlation-id';

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate correlation ID
    const correlationId =
      (req.headers[this.CORRELATION_ID_HEADER] as string) || uuidv4();

    // Attach to request for downstream access
    (req as any).correlationId = correlationId;

    // Propagate to response headers
    res.setHeader(this.CORRELATION_ID_HEADER, correlationId);

    // Also support accessing via request object in services
    req.headers[this.CORRELATION_ID_HEADER] = correlationId;

    next();
  }
}
