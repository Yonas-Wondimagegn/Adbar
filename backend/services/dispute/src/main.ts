import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DisputeModule } from './dispute.module';

async function bootstrap() {
  const logger = new Logger('DisputeService');

  const app = await NestFactory.create(DisputeModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/disputes');

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
    .setTitle('Adbar Dispute Service')
    .setDescription(
      'Dispute resolution service for Adbar platform. ' +
        'Handles dispute filing, evidence submission, mediation workflow, ' +
        'fund freezing, resolution decisions, and refund processing. ' +
        'Integrates with escrow service for fund management during disputes.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('disputes', 'Dispute management')
    .addTag('mediation', 'Mediation workflow')
    .addTag('evidence', 'Evidence submission')
    .addTag('resolution', 'Dispute resolution')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/disputes', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Dispute API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('DISPUTE_PORT', 3015);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`⚖️ Dispute Service running on http://${host}:${port}/api/v1/disputes`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/disputes`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Dispute Service', error);
  process.exit(1);
});
