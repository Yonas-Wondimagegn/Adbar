import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AiMatchingModule } from './ai-matching.module';

async function bootstrap() {
  const logger = new Logger('AiMatchingService');

  const app = await NestFactory.create(AiMatchingModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/ai');

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
    .setTitle('Adbar AI Matching Service')
    .setDescription(
      'AI-powered recommendation & matching service for Adbar platform. ' +
        'Provides personalized product recommendations, freelancer-job matching, ' +
        'and search result ranking. Consumes user events, review events, ' +
        'and order events to build recommendation models.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('recommendations', 'Product & content recommendations')
    .addTag('matching', 'Freelancer-job matching')
    .addTag('ranking', 'Search result ranking')
    .addTag('models', 'ML model management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/ai', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar AI Matching API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('AI_MATCHING_PORT', 3019);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🤖 AI Matching Service running on http://${host}:${port}/api/v1/ai`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/ai`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start AI Matching Service', error);
  process.exit(1);
});
