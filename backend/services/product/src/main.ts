import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ProductModule } from './product.module';

async function bootstrap() {
  const logger = new Logger('ProductService');

  const app = await NestFactory.create(ProductModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/products');

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
    .setTitle('Adbar Product Service')
    .setDescription(
      'Product catalog & store management service for Adbar marketplace. ' +
        'Handles product CRUD, categories, variants, inventory, store profiles, ' +
        'product moderation, and seller storefront management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('products', 'Product catalog management')
    .addTag('stores', 'Seller store management')
    .addTag('categories', 'Product categories')
    .addTag('inventory', 'Inventory management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/products', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Product API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PRODUCT_PORT', 3003);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`📦 Product Service running on http://${host}:${port}/api/v1/products`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/products`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Product Service', error);
  process.exit(1);
});
