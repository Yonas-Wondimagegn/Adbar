import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UssdModule } from './ussd.module';

async function bootstrap() {
  const logger = new Logger('UssdService');

  const app = await NestFactory.create(UssdModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/ussd');

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
    .setTitle('Adbar USSD Service')
    .setDescription(
      'USSD mobile access service for Adbar platform. ' +
        'Provides feature phone access via telecom USSD gateway. ' +
        'Handles USSD session management, menu navigation, ' +
        'balance checks, order placement, and mobile money integration. ' +
        'First-class support for low-connectivity environments.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('ussd', 'USSD session management')
    .addTag('menu', 'USSD menu navigation')
    .addTag('sessions', 'Session state management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/ussd', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar USSD API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('USSD_PORT', 3017);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`📱 USSD Service running on http://${host}:${port}/api/v1/ussd`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/ussd`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start USSD Service', error);
  process.exit(1);
});
