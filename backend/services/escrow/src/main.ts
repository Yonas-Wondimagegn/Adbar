import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EscrowModule } from './escrow.module';

async function bootstrap() {
  const logger = new Logger('EscrowService');

  const app = await NestFactory.create(EscrowModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/escrow');

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
    .setTitle('Adbar Escrow Service')
    .setDescription(
      'Escrow management service for Adbar platform. ' +
        'Handles escrow account creation, funding, release, and refund operations. ' +
        'Integrates with payment service for fund capture and wallet service for disbursement. ' +
        'AU currency-tagged — currencies are never fungible.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('escrow', 'Escrow account management')
    .addTag('release', 'Escrow release operations')
    .addTag('refunds', 'Escrow refund operations')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/escrow', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Escrow API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('ESCROW_PORT', 3006);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🔒 Escrow Service running on http://${host}:${port}/api/v1/escrow`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/escrow`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Escrow Service', error);
  process.exit(1);
});
