import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdbarException } from '../exceptions/adbar.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolveErrorResponse(exception, request);

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json(body);
  }

  private resolveErrorResponse(
    exception: unknown,
    request: Request,
  ): { status: number; body: Record<string, unknown> } {
    if (exception instanceof AdbarException) {
      return {
        status: exception.getStatus(),
        body: {
          statusCode: exception.getStatus(),
          code: exception.code,
          message: exception.message,
          details: exception.details,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      return {
        status,
        body: {
          statusCode: status,
          message: typeof response === 'string' ? response : (response as any).message,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    // Unknown errors - 500
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };
  }
}
