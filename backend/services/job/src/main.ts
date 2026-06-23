import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JobModule } from './job.module';

async function bootstrap() {
  const logger = new Logger('JobService');

  const app = await NestFactory.create(JobModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/jobs');

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
    .setTitle('Adbar Job Service')
    .setDescription(
      'Job posting & proposal management service for Adbar freelance marketplace. ' +
        'Handles job creation, job search, proposal submission, ' +
        'client-freelancer matching, and job status management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('jobs', 'Job posting management')
    .addTag('proposals', 'Proposal submission & management')
    .addTag('applications', 'Job applications')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/jobs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Job API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('JOB_PORT', 3009);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`📋 Job Service running on http://${host}:${port}/api/v1/jobs`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/jobs`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Job Service', error);
  process.exit(1);
});
