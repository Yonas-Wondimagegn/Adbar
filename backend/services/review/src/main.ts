import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ReviewModule } from './review.module';

async function bootstrap() {
  const logger = new Logger('ReviewService');

  const app = await NestFactory.create(ReviewModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/reviews');

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
    .setTitle('Adbar Review Service')
    .setDescription(
      'Reviews & ratings management service for Adbar platform. ' +
        'Handles product reviews, freelancer ratings, review moderation, ' +
        'response management, and aggregate rating calculations. ' +
        'Publishes review events for AI matching and analytics.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('reviews', 'Review management')
    .addTag('ratings', 'Rating aggregation')
    .addTag('moderation', 'Review moderation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/reviews', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Review API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('REVIEW_PORT', 3014);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`⭐ Review Service running on http://${host}:${port}/api/v1/reviews`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/reviews`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Review Service', error);
  process.exit(1);
});
