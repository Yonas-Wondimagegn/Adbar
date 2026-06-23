import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OrderModule } from './order.module';

async function bootstrap() {
  const logger = new Logger('OrderService');

  const app = await NestFactory.create(OrderModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/orders');

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
    .setTitle('Adbar Order Service')
    .setDescription(
      'Order management service for Adbar marketplace. ' +
        'Handles order creation, state machine transitions (pending → confirmed → shipped → delivered), ' +
        'order tracking, cancellations, returns, and event publishing for downstream services.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('orders', 'Order management')
    .addTag('tracking', 'Order tracking')
    .addTag('returns', 'Returns & refunds')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/orders', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Order API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('ORDER_PORT', 3004);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🛒 Order Service running on http://${host}:${port}/api/v1/orders`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/orders`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Order Service', error);
  process.exit(1);
});
