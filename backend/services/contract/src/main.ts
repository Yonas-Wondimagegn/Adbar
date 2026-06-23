import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ContractModule } from './contract.module';

async function bootstrap() {
  const logger = new Logger('ContractService');

  const app = await NestFactory.create(ContractModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/contracts');

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
    .setTitle('Adbar Contract Service')
    .setDescription(
      'Freelance contract management service. ' +
        'Handles contract creation, milestone definition, e-signatures, ' +
        'contract status tracking, completion, and escrow integration. ' +
        'Publishes contract events for downstream services.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('contracts', 'Contract management')
    .addTag('milestones', 'Contract milestones')
    .addTag('signatures', 'E-signature management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/contracts', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Contract API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('CONTRACT_PORT', 3010);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`📝 Contract Service running on http://${host}:${port}/api/v1/contracts`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/contracts`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Contract Service', error);
  process.exit(1);
});
