import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const logger = new Logger('AuthService');

  const app = await NestFactory.create(AuthModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1/auth');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:3001',
  );

  app.enableCors({
    origin: corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adbar Auth Service')
    .setDescription(
      'Authentication & authorization service for Adbar platform. ' +
        'Handles JWT issuance, OAuth (Google/Apple), MFA, phone/email verification, ' +
        'token refresh, password reset, and session management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('mfa', 'Multi-factor authentication')
    .addTag('oauth', 'OAuth social login')
    .addTag('verification', 'Email & phone verification')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/auth', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Auth API',
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('AUTH_PORT', 3001);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🔐 Auth Service running on http://${host}:${port}/api/v1/auth`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/auth`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Auth Service', error);
  process.exit(1);
});
