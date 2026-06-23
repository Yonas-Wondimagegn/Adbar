import { Module } from '@nestjs/common';
import { PaymentProvider } from './interfaces/payment-provider.interface';

export interface PaymentProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: string[];
  enabled: boolean;
  config: Record<string, string>;
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    name: 'chapa',
    displayName: 'Chapa',
    supportedCurrencies: ['ETB', 'USD'],
    enabled: true,
    config: {
      baseUrl: process.env['CHAPA_BASE_URL'] || 'https://api.chapa.co/v1',
      secretKey: process.env['CHAPA_SECRET_KEY'] || '',
      publicKey: process.env['CHAPA_PUBLIC_KEY'] || '',
      webhookSecret: process.env['CHAPA_WEBHOOK_SECRET'] || '',
    },
  },
  {
    name: 'santimpay',
    displayName: 'SantimPay',
    supportedCurrencies: ['ETB'],
    enabled: true,
    config: {
      baseUrl: process.env['SANTIMPAY_BASE_URL'] || 'https://santimpay.com/api',
      merchantId: process.env['SANTIMPAY_MERCHANT_ID'] || '',
      secretKey: process.env['SANTIMPAY_SECRET_KEY'] || '',
      apiKey: process.env['SANTIMPAY_API_KEY'] || '',
    },
  },
  {
    name: 'stripe',
    displayName: 'Stripe',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'ETB'],
    enabled: true,
    config: {
      secretKey: process.env['STRIPE_SECRET_KEY'] || '',
      publicKey: process.env['STRIPE_PUBLIC_KEY'] || '',
      webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || '',
    },
  },
  {
    name: 'paypal',
    displayName: 'PayPal',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    enabled: true,
    config: {
      clientId: process.env['PAYPAL_CLIENT_ID'] || '',
      clientSecret: process.env['PAYPAL_CLIENT_SECRET'] || '',
      webhookId: process.env['PAYPAL_WEBHOOK_ID'] || '',
      sandbox: process.env['PAYPAL_SANDBOX'] || 'true',
    },
  },
];

@Module({
  providers: [
    {
      provide: 'PAYMENT_PROVIDER_CONFIGS',
      useValue: PAYMENT_PROVIDERS,
    },
  ],
  exports: ['PAYMENT_PROVIDER_CONFIGS'],
})
export class PaymentProviderModule {}
