import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MessagingModule } from './messaging.module';

async function bootstrap() {
  const logger = new Logger('MessagingService');

  const app = await NestFactory.create(MessagingModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/messages');

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

  // WebSocket is configured in MessagingModule via @WebSocketGateway

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adbar Messaging Service')
    .setDescription(
      'Real-time messaging service for Adbar platform. ' +
        'Handles direct messages, conversation management, file sharing, ' +
        'typing indicators, read receipts, and WebSocket-based real-time delivery.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('messages', 'Message management')
    .addTag('conversations', 'Conversation management')
    .addTag('websocket', 'WebSocket real-time events')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/messages', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Messaging API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('MESSAGING_PORT', 3011);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`💬 Messaging Service running on http://${host}:${port}/api/v1/messages`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/messages`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Messaging Service', error);
  process.exit(1);
});
