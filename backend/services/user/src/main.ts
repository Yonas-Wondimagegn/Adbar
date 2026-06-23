import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UserModule } from './user.module';

async function bootstrap() {
  const logger = new Logger('UserService');

  const app = await NestFactory.create(UserModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/users');

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
    .setTitle('Adbar User Service')
    .setDescription(
      'User management service for Adbar platform. ' +
        'Handles user profiles, preferences, roles, permissions, ' +
        'account settings, and user search.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('users', 'User profile management')
    .addTag('preferences', 'User preferences')
    .addTag('roles', 'Role & permission management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/users', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar User API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('USER_PORT', 3002);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`👤 User Service running on http://${host}:${port}/api/v1/users`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/users`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start User Service', error);
  process.exit(1);
});
