import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  id?: string;
  sub: string;
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Extend Express Request to include JWT user info
declare global {
  namespace Express {
    interface Request {
      jwtUser?: JwtPayload;
    }
  }
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  'GET /api/v1/health',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/login/phone',
  'POST /api/v1/auth/verify-email',
  'POST /api/v1/auth/verify-phone',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
  'POST /api/v1/auth/mfa/verify',
  'GET /api/v1/auth/oauth/google',
  'GET /api/v1/auth/oauth/google/callback',
  'GET /api/v1/auth/oauth/apple',
  'GET /api/v1/auth/oauth/apple/callback',
  'POST /api/v1/ussd/callback',
  'GET /api/v1/products',
  'GET /api/v1/products/:id',
  'GET /api/v1/search',
  'GET /api/v1/users/:id/public',
  'GET /api/v1/api/docs',
  'GET /api/v1/api/docs/*',
];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Check if route is public
    const routeKey = `${req.method} ${req.path}`;
    const isPublic = PUBLIC_ROUTES.some((publicRoute) => {
      // Handle wildcard matching for swagger docs
      if (publicRoute.includes('*')) {
        const prefix = publicRoute.replace('/*', '');
        return routeKey.startsWith(prefix);
      }
      // Handle exact match and parameterized routes
      const pattern = publicRoute
        .replace(/:[^/]+/g, '[^/]+')
        .replace(/\//g, '\\/');
      return new RegExp(`^${pattern}$`).test(routeKey);
    });

    if (isPublic) {
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'dev-jwt-secret-change-in-production',
      );

      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      // Ensure it's an access token
      if (payload.type && payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach user to request
      req.jwtUser = payload;
      next();
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`JWT verification failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
