import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  const app = await NestFactory.create(NotificationModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/notifications');

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
    .setTitle('Adbar Notification Service')
    .setDescription(
      'Multi-channel notification service for Adbar platform. ' +
        'Handles email (SMTP), SMS (Twilio), push notifications (Firebase), ' +
        'in-app notifications, and notification preferences. ' +
        'Consumes events from Kafka for async notification delivery.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('notifications', 'Notification management')
    .addTag('preferences', 'Notification preferences')
    .addTag('templates', 'Notification templates')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/notifications', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Notification API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('NOTIFICATION_PORT', 3012);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🔔 Notification Service running on http://${host}:${port}/api/v1/notifications`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/notifications`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Notification Service', error);
  process.exit(1);
});
