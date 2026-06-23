import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');

  const app = await NestFactory.create(AnalyticsModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/analytics');

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
    .setTitle('Adbar Analytics Service')
    .setDescription(
      'Analytics & reporting service for Adbar platform. ' +
        'Aggregates data from all services for dashboards, reports, and insights. ' +
        'Handles GMV tracking, user activity analytics, seller performance, ' +
        'freelancer metrics, and platform health monitoring. ' +
        'Consumes events from Kafka for real-time analytics.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('analytics', 'Analytics & metrics')
    .addTag('reports', 'Report generation')
    .addTag('dashboards', 'Dashboard data')
    .addTag('events', 'Event aggregation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/analytics', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Analytics API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('ANALYTICS_PORT', 3018);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`📊 Analytics Service running on http://${host}:${port}/api/v1/analytics`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/analytics`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Analytics Service', error);
  process.exit(1);
});
