import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { KYCModule } from './kyc.module';

async function bootstrap() {
  const logger = new Logger('KYCService');

  const app = await NestFactory.create(KYCModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/kyc');

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
    .setTitle('Adbar KYC Service')
    .setDescription(
      'Know Your Customer (KYC) identity verification service. ' +
        'Implements adapter pattern for Fayda (Ethiopian national ID) and Passport verification. ' +
        'Handles document upload, identity verification workflows, ' +
        'verification status tracking, and compliance reporting.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('kyc', 'KYC verification')
    .addTag('documents', 'Document management')
    .addTag('fayda', 'Fayda ID verification')
    .addTag('passport', 'Passport verification')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/kyc', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar KYC API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('KYC_PORT', 3016);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🪪 KYC Service running on http://${host}:${port}/api/v1/kyc`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/kyc`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start KYC Service', error);
  process.exit(1);
});
