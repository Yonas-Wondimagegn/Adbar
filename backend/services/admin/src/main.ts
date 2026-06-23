import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AdminModule } from './admin.module';

async function bootstrap() {
  const logger = new Logger('AdminService');

  const app = await NestFactory.create(AdminModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/admin');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adbar Admin Service')
    .setDescription(
      'Admin operations service for Adbar platform. ' +
        'Provides aggregated views and management endpoints for platform administration. ' +
        'Handles user management, KYC approval, dispute oversight, ' +
        'platform configuration, content moderation, and system monitoring.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('admin', 'Admin operations')
    .addTag('users', 'User administration')
    .addTag('kyc', 'KYC approval management')
    .addTag('moderation', 'Content moderation')
    .addTag('config', 'Platform configuration')
    .addTag('monitoring', 'System monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/admin', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Admin API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('ADMIN_PORT', 3020);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🛡️ Admin Service running on http://${host}:${port}/api/v1/admin`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/admin`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Admin Service', error);
  process.exit(1);
});
