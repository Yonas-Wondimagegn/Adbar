import { HttpException, HttpStatus } from '@nestjs/common';

export class AdbarException extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ message, code, details }, status);
    this.code = code;
    this.details = details;
  }
}

export class ResourceNotFoundException extends AdbarException {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id '${id}'` : ''} not found`,
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedException extends AdbarException {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenActionException extends AdbarException {
  constructor(action: string) {
    super(
      `You are not permitted to perform: ${action}`,
      'FORBIDDEN_ACTION',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ConflictException extends AdbarException {
  constructor(message: string) {
    super(message, 'CONFLICT', HttpStatus.CONFLICT);
  }
}

export class ValidationException extends AdbarException {
  constructor(details: Record<string, unknown>) {
    super('Validation failed', 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, details);
  }
}

export class RateLimitExceededException extends AdbarException {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      'RATE_LIMIT_EXCEEDED',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
