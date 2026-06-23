import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FreelanceModule } from './freelance.module';

async function bootstrap() {
  const logger = new Logger('FreelanceService');

  const app = await NestFactory.create(FreelanceModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/freelancers');

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
    .setTitle('Adbar Freelance Service')
    .setDescription(
      'Freelancer profile & portfolio management service. ' +
        'Handles freelancer profiles, skills, portfolios, availability, ' +
        'hourly rates, and verification badges for the freelance marketplace.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('freelancers', 'Freelancer profile management')
    .addTag('portfolios', 'Portfolio management')
    .addTag('skills', 'Skill tags & categories')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/freelancers', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Freelance API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('FREELANCE_PORT', 3008);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`🧑‍💻 Freelance Service running on http://${host}:${port}/api/v1/freelancers`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/freelancers`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Freelance Service', error);
  process.exit(1);
});
