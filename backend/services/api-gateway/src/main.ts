import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

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

  // CORS configuration
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:3001',
  );

  app.enableCors({
    origin: corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adbar Platform API')
    .setDescription(
      'Adbar - Ethiopian Digital Marketplace & Freelance Platform API Gateway. ' +
      'Supports marketplace, freelance, escrow, USSD, and payment services.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & authorization')
    .addTag('users', 'User management')
    .addTag('products', 'Product catalog')
    .addTag('orders', 'Order management')
    .addTag('payments', 'Payment processing')
    .addTag('wallets', 'Wallet management')
    .addTag('escrow', 'Escrow services')
    .addTag('freelance', 'Freelance marketplace')
    .addTag('jobs', 'Job postings')
    .addTag('contracts', 'Freelance contracts')
    .addTag('disputes', 'Dispute resolution')
    .addTag('reviews', 'Reviews & ratings')
    .addTag('notifications', 'Notifications')
    .addTag('messaging', 'Real-time messaging')
    .addTag('search', 'Search & discovery')
    .addTag('kyc', 'KYC verification')
    .addTag('ussd', 'USSD mobile access')
    .addTag('analytics', 'Analytics & reporting')
    .addTag('ai-matching', 'AI-powered matching')
    .addTag('admin', 'Admin operations')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Adbar API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🚀 Adbar API Gateway running on http://${host}:${port}/api/v1`);
  logger.log(`📚 Swagger docs available at http://${host}:${port}/api/docs`);
  logger.log(`🏥 Health check at http://${host}:${port}/api/v1/health`);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

bootstrap().catch((error) => {
  Logger.error('Failed to start API Gateway', error);
  process.exit(1);
});
