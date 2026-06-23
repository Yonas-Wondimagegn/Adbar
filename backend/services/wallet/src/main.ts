import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WalletModule } from './wallet.module';

async function bootstrap() {
  const logger = new Logger('WalletService');

  const app = await NestFactory.create(WalletModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1/wallet');

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
    .setTitle('Adbar Wallet Service')
    .setDescription(
      'AU (Adbar Unit) wallet & ledger service. ' +
        'Manages internal currency-tagged balances — currencies are NEVER fungible. ' +
        'Handles credits, debits, withdrawals, balance inquiries, and transaction history. ' +
        'Core AML control: AU currency mismatch is auto-blocked.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('wallet', 'Wallet balance & transactions')
    .addTag('ledger', 'AU ledger entries')
    .addTag('withdrawals', 'Withdrawal requests')
    .addTag('history', 'Transaction history')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs/wallet', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Adbar Wallet API',
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('WALLET_PORT', 3007);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`💰 Wallet Service running on http://${host}:${port}/api/v1/wallet`);
  logger.log(`📚 Swagger docs at http://${host}:${port}/api/docs/wallet`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start Wallet Service', error);
  process.exit(1);
});
