import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject('JWT_SERVICE') private readonly jwtService?: JwtService,
    @Optional() @Inject('CONFIG_SERVICE') private readonly configService?: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('No authorization token provided');
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      // Use injected JwtService if available, otherwise decode manually
      if (this.jwtService) {
        const payload = this.jwtService.verify(token);
        request['user'] = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles || [],
          type: payload.type,
          iat: payload.iat,
          exp: payload.exp,
        };
      } else {
        // Fallback: manual JWT decode
        const secret = this.configService?.get<string>('JWT_SECRET') || 'dev-jwt-secret-change-in-production-min-32-chars-long!!';
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        // Verify signature
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', secret)
          .update(`${parts[0]}.${parts[1]}`)
          .digest('base64url');
        if (signature !== parts[2]) throw new Error('Invalid signature');
        request['user'] = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles || [],
          type: payload.type,
          iat: payload.iat,
          exp: payload.exp,
        };
      }
      return true;
    } catch (error) {
      this.logger.warn(`Invalid token: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
