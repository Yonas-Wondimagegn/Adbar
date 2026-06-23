import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const logger = new Logger('PaymentService');

  const app = await NestFactory.create(PaymentModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/payments');

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
    .setTitle('Adbar Payment Service')
    .setDescription(
      'Payment processing service for Adbar platform. ' +
        'Implements adapter pattern for Chapa, SantimPay, Stripe, and PayPal. ' +
        'Handles payment initiation, webhook processing, refunds, ' +
        'and currency-based provider selection. AU currency-tagging enforced.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('payments', 'Payment processing')
    .addTag('webhooks', 'Payment provider webhooks')
    .addTag('refunds', 'Refund management')
    .addTag('providers', 'Payment provider management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/payments', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Payment API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PAYMENT_PORT', 3005);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`💳 Payment Service running on http://${host}:${port}/api/v1/payments`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/payments`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Payment Service', error);
  process.exit(1);
});
