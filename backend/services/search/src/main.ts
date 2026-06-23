import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SearchModule } from './search.module';

async function bootstrap() {
  const logger = new Logger('SearchService');

  const app = await NestFactory.create(SearchModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/search');

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
    .setTitle('Adbar Search Service')
    .setDescription(
      'Search & discovery service powered by Elasticsearch. ' +
        'Provides full-text search for products, freelancers, and jobs. ' +
        'Supports faceted filtering, autocomplete, search suggestions, ' +
        'and index management for marketplace content.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('search', 'Full-text search')
    .addTag('filters', 'Faceted search filters')
    .addTag('autocomplete', 'Search suggestions')
    .addTag('index', 'Index management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/search', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Search API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('SEARCH_PORT', 3013);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🔍 Search Service running on http://${host}:${port}/api/v1/search`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/search`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Search Service', error);
  process.exit(1);
});
