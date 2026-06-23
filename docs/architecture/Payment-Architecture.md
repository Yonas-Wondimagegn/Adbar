# Adbar (አድባር) — Payment Architecture

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. Payment Gateway Adapter Pattern

### 1.1 Core Interface

```typescript
// backend/services/payment/src/interfaces/payment-provider.interface.ts

export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  orderId?: string;
  contractId?: string;
  phoneNumber?: string; // For direct mobile money charges
  returnUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  success: boolean;
  reference: string;       // Adbar's internal reference
  providerRef: string;     // Provider's transaction reference
  checkoutUrl?: string;    // For redirect-based flows
  status: 'pending' | 'processing' | 'success' | 'failed';
  message?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'refunded';
  amount: number;
  currency: string;
  providerRef: string;
  paidAt?: Date;
  rawResponse: unknown;
}

export interface WebhookResult {
  success: boolean;
  reference: string;
  status: 'success' | 'failed' | 'expired';
  amount: number;
  currency: string;
  rawPayload: unknown;
}

export interface RefundResult {
  success: boolean;
  reference: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface PayoutParams {
  amount: number;
  currency: string;
  recipientName: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  phoneNumber?: string; // For mobile money payouts
  reason?: string;
}

export interface PayoutResult {
  success: boolean;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  readonly supportedCurrencies: string[];
  readonly logoUrl: string;
  readonly supportsDirectCharge: boolean;
  readonly supportsPayout: boolean;

  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyPayment(reference: string): Promise<PaymentStatusResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
  refund(reference: string, amount?: number): Promise<RefundResult>;
  payout?(params: PayoutParams): Promise<PayoutResult>;
}
```

### 1.2 Provider Registry

```typescript
// backend/services/payment/src/payment-provider.registry.ts

import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();
  private readonly logger = new Logger(PaymentProviderRegistry.name);

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
    this.logger.log(`Registered payment provider: ${provider.id} (${provider.displayName})`);
  }

  get(providerId: string): PaymentProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Payment provider not found: ${providerId}`);
    }
    return provider;
  }

  getByCurrency(currency: string): PaymentProvider[] {
    return Array.from(this.providers.values()).filter(
      (p) => p.supportedCurrencies.includes(currency),
    );
  }

  getAll(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getActiveProviders(): PaymentProvider[] {
    // Filter by active status from PaymentProviderConfig
    return this.getAll(); // Simplified — actual implementation checks DB
  }
}
```

---

## 2. Chapa Adapter

```typescript
// backend/services/payment/src/adapters/chapa.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, InitiatePaymentParams, InitiatePaymentResult, PaymentStatusResult, WebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class ChapaAdapter implements PaymentProvider {
  readonly id = 'chapa';
  readonly displayName = 'Chapa';
  readonly supportedCurrencies = ['ETB'];
  readonly logoUrl = '/assets/payment-logos/chapa.svg';
  readonly supportsDirectCharge = false;
  readonly supportsPayout = false;

  private readonly logger = new Logger(ChapaAdapter.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const isTestMode = this.configService.get('CHAPA_TEST_MODE', 'true') === 'true';
    this.baseUrl = isTestMode
      ? 'https://api.chapa.co/v1'
      : 'https://api.chapa.co/v1';
    this.secretKey = this.configService.getOrThrow('CHAPA_SECRET_KEY');
    this.publicKey = this.configService.getOrThrow('CHAPA_PUBLIC_KEY');
    this.webhookSecret = this.configService.getOrThrow('CHAPA_WEBHOOK_SECRET');
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const txRef = this.generateTxRef();

    try {
      const payload = {
        amount: params.amount.toString(),
        currency: params.currency,
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        tx_ref: txRef,
        callback_url: params.callbackUrl,
        return_url: params.returnUrl,
        customization: {
          title: 'Adbar (አድባር)',
          description: `Payment for ${params.orderId || params.contractId || 'Adbar service'}`,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          reference: txRef,
          providerRef: response.data.data?.ref_id || txRef,
          checkoutUrl: response.data.data?.checkout_url,
          status: 'pending',
        };
      }

      return {
        success: false,
        reference: txRef,
        providerRef: '',
        status: 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`Chapa initiate payment failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: txRef,
        providerRef: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentStatusResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );

      const data = response.data.data;
      return {
        success: response.data.status === 'success',
        status: this.mapStatus(data?.status),
        amount: parseFloat(data?.amount || '0'),
        currency: data?.currency || 'ETB',
        providerRef: data?.ref_id || reference,
        paidAt: data?.created_at ? new Date(data.created_at) : undefined,
        rawResponse: response.data,
      };
    } catch (error) {
      this.logger.error(`Chapa verify payment failed: ${error.message}`, error.stack);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: 'ETB',
        providerRef: reference,
        rawResponse: { error: error.message },
      };
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    // Validate webhook signature
    if (!this.validateWebhookSignature(payload, signature)) {
      this.logger.warn('Chapa webhook signature validation failed');
      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        currency: 'ETB',
        rawPayload: payload,
      };
    }

    const data = payload as Record<string, any>;
    return {
      success: true,
      reference: data.tx_ref || data.reference,
      status: this.mapStatus(data.status),
      amount: parseFloat(data.amount || '0'),
      currency: data.currency || 'ETB',
      rawPayload: payload,
    };
  }

  async refund(reference: string, amount?: number): Promise<RefundResult> {
    try {
      const payload: Record<string, any> = { ref_id: reference };
      if (amount) payload.amount = amount.toString();

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refund`, payload, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        success: response.data.status === 'success',
        reference,
        amount: amount || 0,
        status: response.data.status === 'success' ? 'completed' : 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`Chapa refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference,
        amount: amount || 0,
        status: 'failed',
        message: error.message,
      };
    }
  }

  private generateTxRef(): string {
    return `adbar-chapa-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private validateWebhookSignature(payload: unknown, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  private mapStatus(chapaStatus: string): 'pending' | 'success' | 'failed' | 'expired' | 'refunded' {
    switch (chapaStatus?.toLowerCase()) {
      case 'success':
      case 'successful':
        return 'success';
      case 'failed':
        return 'failed';
      case 'expired':
        return 'expired';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
```

---

## 3. SantimPay Adapter

```typescript
// backend/services/payment/src/adapters/santimpay.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, InitiatePaymentParams, InitiatePaymentResult, PaymentStatusResult, WebhookResult, RefundResult, PayoutParams, PayoutResult } from '../interfaces/payment-provider.interface';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class SantimPayAdapter implements PaymentProvider {
  readonly id = 'santimpay';
  readonly displayName = 'SantimPay';
  readonly supportedCurrencies = ['ETB'];
  readonly logoUrl = '/assets/payment-logos/santimpay.svg';
  readonly supportsDirectCharge = true;
  readonly supportsPayout = true;

  private readonly logger = new Logger(SantimPayAdapter.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly privateKey: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const isTestMode = this.configService.get('SANTIMPAY_TEST_MODE', 'true') === 'true';
    this.baseUrl = isTestMode
      ? 'https://api.santimpay.com/v1/test'
      : 'https://api.santimpay.com/v1';
    this.merchantId = this.configService.getOrThrow('SANTIMPAY_MERCHANT_ID');
    this.privateKey = this.configService.getOrThrow('SANTIMPAY_PRIVATE_KEY');
    this.webhookSecret = this.configService.getOrThrow('SANTIMPAY_WEBHOOK_SECRET');
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const internalRef = this.generateRef();

    try {
      const payload = {
        id: internalRef,
        amount: params.amount.toString(),
        paymentReason: `Adbar payment for ${params.orderId || params.contractId || 'service'}`,
        successRedirectUrl: params.returnUrl,
        failureRedirectUrl: `${params.returnUrl}?status=failed`,
        cancelRedirectUrl: `${params.returnUrl}?status=cancelled`,
        notifyUrl: params.callbackUrl,
      };

      const signedPayload = this.signPayload(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/checkout`, signedPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Id': this.merchantId,
          },
        }),
      );

      if (response.data.success) {
        return {
          success: true,
          reference: internalRef,
          providerRef: response.data.data?.id || internalRef,
          checkoutUrl: response.data.data?.checkoutUrl,
          status: 'pending',
        };
      }

      return {
        success: false,
        reference: internalRef,
        providerRef: '',
        status: 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`SantimPay initiate payment failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: internalRef,
        providerRef: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  async initiateDirectCharge(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (!params.phoneNumber) {
      throw new Error('Phone number required for direct charge');
    }

    const internalRef = this.generateRef();

    try {
      const payload = {
        id: internalRef,
        amount: params.amount.toString(),
        phoneNumber: params.phoneNumber,
        paymentReason: `Adbar direct payment for ${params.orderId || params.contractId}`,
        notifyUrl: params.callbackUrl,
      };

      const signedPayload = this.signPayload(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/direct-charge`, signedPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Id': this.merchantId,
          },
        }),
      );

      return {
        success: response.data.success,
        reference: internalRef,
        providerRef: response.data.data?.id || internalRef,
        status: response.data.success ? 'processing' : 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`SantimPay direct charge failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: internalRef,
        providerRef: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentStatusResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/${reference}`, {
          headers: {
            'X-Merchant-Id': this.merchantId,
            'X-Signature': this.signPayload({ id: reference }).signature,
          },
        }),
      );

      const data = response.data.data;
      return {
        success: response.data.success,
        status: this.mapStatus(data?.status),
        amount: parseFloat(data?.amount || '0'),
        currency: 'ETB',
        providerRef: data?.id || reference,
        paidAt: data?.completedAt ? new Date(data.completedAt) : undefined,
        rawResponse: response.data,
      };
    } catch (error) {
      this.logger.error(`SantimPay verify failed: ${error.message}`, error.stack);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: 'ETB',
        providerRef: reference,
        rawResponse: { error: error.message },
      };
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    if (!this.validateWebhookSignature(payload, signature)) {
      this.logger.warn('SantimPay webhook signature validation failed');
      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        currency: 'ETB',
        rawPayload: payload,
      };
    }

    const data = payload as Record<string, any>;
    return {
      success: true,
      reference: data.id || data.reference,
      status: this.mapStatus(data.status),
      amount: parseFloat(data.amount || '0'),
      currency: 'ETB',
      rawPayload: payload,
    };
  }

  async refund(reference: string, amount?: number): Promise<RefundResult> {
    try {
      const payload: Record<string, any> = { transactionId: reference };
      if (amount) payload.amount = amount.toString();

      const signedPayload = this.signPayload(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refund`, signedPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Id': this.merchantId,
          },
        }),
      );

      return {
        success: response.data.success,
        reference,
        amount: amount || 0,
        status: response.data.success ? 'completed' : 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`SantimPay refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference,
        amount: amount || 0,
        status: 'failed',
        message: error.message,
      };
    }
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    try {
      const payload = {
        amount: params.amount.toString(),
        currency: params.currency,
        recipientName: params.recipientName,
        bankName: params.bankName,
        bankAccountNumber: params.bankAccountNumber,
        bankAccountName: params.bankAccountName,
        phoneNumber: params.phoneNumber,
        reason: params.reason || 'Adbar payout',
      };

      const signedPayload = this.signPayload(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payout`, signedPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-Id': this.merchantId,
          },
        }),
      );

      return {
        success: response.data.success,
        reference: response.data.data?.id || '',
        status: response.data.success ? 'processing' : 'failed',
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error(`SantimPay payout failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  private generateRef(): string {
    return `adbar-santim-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private signPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.privateKey)
      .update(payloadString)
      .digest('hex');
    return { ...payload, signature };
  }

  private validateWebhookSignature(payload: unknown, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  private mapStatus(santimStatus: string): 'pending' | 'success' | 'failed' | 'expired' | 'refunded' {
    switch (santimStatus?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'success';
      case 'failed':
      case 'failure':
        return 'failed';
      case 'expired':
        return 'expired';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
```

---

## 4. Stripe Adapter (International)

```typescript
// backend/services/payment/src/adapters/stripe.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentProvider, InitiatePaymentParams, InitiatePaymentResult, PaymentStatusResult, WebhookResult, RefundResult } from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeAdapter implements PaymentProvider {
  readonly id = 'stripe';
  readonly displayName = 'Stripe';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'ETB'];
  readonly logoUrl = '/assets/payment-logos/stripe.svg';
  readonly supportsDirectCharge = false;
  readonly supportsPayout = true;

  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.getOrThrow('STRIPE_SECRET_KEY'),
      { apiVersion: '2024-04-10' as any },
    );
    this.webhookSecret = this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET');
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `Adbar Payment`,
              description: `Order: ${params.orderId || params.contractId || 'Service'}`,
            },
            unit_amount: Math.round(params.amount * 100), // Stripe uses cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${params.returnUrl}?status=cancelled`,
        customer_email: params.email,
        metadata: {
          orderId: params.orderId || '',
          contractId: params.contractId || '',
        },
      });

      return {
        success: true,
        reference: session.id,
        providerRef: session.payment_intent as string,
        checkoutUrl: session.url,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Stripe initiate failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: '',
        providerRef: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentStatusResult> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(reference);
      return {
        success: session.payment_status === 'paid',
        status: session.payment_status === 'paid' ? 'success' : 'pending',
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'usd').toUpperCase(),
        providerRef: session.payment_intent as string,
        paidAt: session.payment_status === 'paid' ? new Date() : undefined,
        rawResponse: session,
      };
    } catch (error) {
      this.logger.error(`Stripe verify failed: ${error.message}`, error.stack);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: 'USD',
        providerRef: reference,
        rawResponse: { error: error.message },
      };
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload as string,
        signature,
        this.webhookSecret,
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          success: true,
          reference: session.id,
          status: 'success',
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'usd').toUpperCase(),
          rawPayload: event,
        };
      }

      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        currency: 'USD',
        rawPayload: event,
      };
    } catch (error) {
      this.logger.error(`Stripe webhook failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        currency: 'USD',
        rawPayload: payload,
      };
    }
  }

  async refund(reference: string, amount?: number): Promise<RefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: reference,
      };
      if (amount) refundParams.amount = Math.round(amount * 100);

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: refund.status === 'succeeded',
        reference: refund.id,
        amount: (refund.amount || 0) / 100,
        status: refund.status === 'succeeded' ? 'completed' : 'pending',
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference,
        amount: amount || 0,
        status: 'failed',
        message: error.message,
      };
    }
  }
}
```

---

## 5. PayPal Adapter

```typescript
// backend/services/payment/src/adapters/paypal.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, InitiatePaymentParams, InitiatePaymentResult, PaymentStatusResult, WebhookResult, RefundResult } from '../interfaces/payment-provider.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PayPalAdapter implements PaymentProvider {
  readonly id = 'paypal';
  readonly displayName = 'PayPal';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP'];
  readonly logoUrl = '/assets/payment-logos/paypal.svg';
  readonly supportsDirectCharge = false;
  readonly supportsPayout = true;

  private readonly logger = new Logger(PayPalAdapter.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const isSandbox = this.configService.get('PAYPAL_SANDBOX', 'true') === 'true';
    this.baseUrl = isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
    this.clientId = this.configService.getOrThrow('PAYPAL_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow('PAYPAL_CLIENT_SECRET');
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );
    return response.data.access_token;
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    try {
      const token = await this.getAccessToken();
      const orderId = `adbar-pp-${Date.now()}`;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/checkout/orders`,
          {
            intent: 'CAPTURE',
            purchase_units: [{
              reference_id: orderId,
              amount: {
                currency_code: params.currency,
                value: params.amount.toFixed(2),
              },
              description: `Adbar payment for ${params.orderId || params.contractId || 'service'}`,
            }],
            application_context: {
              brand_name: 'Adbar (አድባር)',
              return_url: params.returnUrl,
              cancel_url: `${params.returnUrl}?status=cancelled`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const approvalLink = response.data.links?.find((l: any) => l.rel === 'approve');

      return {
        success: true,
        reference: orderId,
        providerRef: response.data.id,
        checkoutUrl: approvalLink?.href,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`PayPal initiate failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference: '',
        providerRef: '',
        status: 'failed',
        message: error.message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentStatusResult> {
    try {
      const token = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/checkout/orders/${reference}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      const data = response.data;
      return {
        success: data.status === 'COMPLETED',
        status: data.status === 'COMPLETED' ? 'success' : 'pending',
        amount: parseFloat(data.purchase_units?.[0]?.amount?.value || '0'),
        currency: data.purchase_units?.[0]?.amount?.currency_code || 'USD',
        providerRef: data.id,
        paidAt: data.status === 'COMPLETED' ? new Date() : undefined,
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(`PayPal verify failed: ${error.message}`, error.stack);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: 'USD',
        providerRef: reference,
        rawResponse: { error: error.message },
      };
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
    // PayPal webhook verification would go here
    const data = payload as Record<string, any>;
    return {
      success: true,
      reference: data.resource?.id || '',
      status: data.event_type === 'CHECKOUT.ORDER.APPROVED' ? 'success' : 'pending',
      amount: parseFloat(data.resource?.amount?.value || '0'),
      currency: data.resource?.amount?.currency_code || 'USD',
      rawPayload: payload,
    };
  }

  async refund(reference: string, amount?: number): Promise<RefundResult> {
    try {
      const token = await this.getAccessToken();
      const payload: Record<string, any> = {};
      if (amount) {
        payload.amount = {
          value: amount.toFixed(2),
          currency_code: 'USD',
        };
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/payments/captures/${reference}/refund`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: response.data.status === 'COMPLETED',
        reference: response.data.id,
        amount: amount || 0,
        status: response.data.status === 'COMPLETED' ? 'completed' : 'pending',
      };
    } catch (error) {
      this.logger.error(`PayPal refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        reference,
        amount: amount || 0,
        status: 'failed',
        message: error.message,
      };
    }
  }
}
```

---

## 6. Payment Service

```typescript
// backend/services/payment/src/payment.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { WalletService } from '../../wallet/src/wallet.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getProviders(currency: string) {
    const providers = this.providerRegistry.getByCurrency(currency);
    const configs = await this.prisma.paymentProviderConfig.findMany({
      where: { isActive: true },
    });

    return providers
      .filter((p) => configs.some((c) => c.id === p.id))
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        logoUrl: p.logoUrl,
        supportedCurrencies: p.supportedCurrencies,
        supportsDirectCharge: p.supportsDirectCharge,
      }));
  }

  async initiatePayment(dto: {
    userId: string;
    providerId: string;
    amount: number;
    currency: string;
    orderId?: string;
    contractId?: string;
    phoneNumber?: string;
    returnUrl: string;
    callbackUrl: string;
  }) {
    const provider = this.providerRegistry.get(dto.providerId);

    // Validate provider supports currency
    if (!provider.supportedCurrencies.includes(dto.currency)) {
      throw new BadRequestException(
        `Provider ${dto.providerId} does not support currency ${dto.currency}`,
      );
    }

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        id: uuidv4(),
        userId: dto.userId,
        orderId: dto.orderId,
        contractId: dto.contractId,
        providerId: dto.providerId,
        amount: dto.amount,
        currency: dto.currency,
        status: 'PENDING',
        type: dto.contractId ? 'payment' : 'payment',
      },
    });

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    // Initiate with provider
    const result = await provider.initiatePayment({
      amount: dto.amount,
      currency: dto.currency,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      orderId: dto.orderId,
      contractId: dto.contractId,
      phoneNumber: dto.phoneNumber,
      returnUrl: dto.returnUrl,
      callbackUrl: dto.callbackUrl,
    });

    // Update transaction with provider reference
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerRef: result.providerRef },
    });

    return {
      transactionId: transaction.id,
      checkoutUrl: result.checkoutUrl,
      reference: result.reference,
      status: result.status,
    };
  }

  async handleWebhook(providerId: string, payload: unknown, signature: string) {
    const provider = this.providerRegistry.get(providerId);
    const result = await provider.handleWebhook(payload, signature);

    if (!result.success) {
      this.logger.warn(`Webhook processing failed for provider ${providerId}`);
      return { success: false };
    }

    // Find and update transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: { providerRef: result.reference },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for reference ${result.reference}`);
      return { success: false };
    }

    // Update transaction status
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: result.status.toUpperCase() as any,
        rawWebhookPayload: payload as any,
      },
    });

    // If payment successful, credit wallet and emit event
    if (result.status === 'success') {
      await this.walletService.credit({
        userId: transaction.userId,
        amount: result.amount,
        currency: result.currency,
        referenceType: transaction.contractId ? 'escrow' : 'order',
        referenceId: transaction.contractId || transaction.orderId,
        description: `Payment via ${providerId}`,
      });

      this.eventEmitter.emit('payment.success', {
        transactionId: transaction.id,
        userId: transaction.userId,
        orderId: transaction.orderId,
        contractId: transaction.contractId,
        amount: result.amount,
        currency: result.currency,
        providerId,
      });
    }

    return { success: true };
  }

  async verifyPayment(providerId: string, reference: string) {
    const provider = this.providerRegistry.get(providerId);
    return provider.verifyPayment(reference);
  }

  async refund(providerId: string, reference: string, amount?: number) {
    const provider = this.providerRegistry.get(providerId);
    return provider.refund(reference, amount);
  }
}
```

---

## 7. Wallet Service (AU Ledger)

```typescript
// backend/services/wallet/src/wallet.service.ts

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaymentProviderRegistry } from '../../payment/src/payment-provider.registry';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
  ) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { balances: true },
      });
    }

    return {
      id: wallet.id,
      balances: wallet.balances.map((b) => ({
        currency: b.currency,
        type: b.type,
        balance: b.balance,
        auLabel: `AU-${b.currency}`,
      })),
    };
  }

  async credit(dto: {
    userId: string;
    amount: number;
    currency: string;
    referenceType: string;
    referenceId: string;
    description?: string;
  }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Find or create balance for this currency
    let balance = await this.prisma.walletBalance.findUnique({
      where: {
        walletId_currency_type: {
          walletId: wallet.id,
          currency: dto.currency,
          type: 'AVAILABLE',
        },
      },
    });

    if (!balance) {
      balance = await this.prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          currency: dto.currency,
          type: 'AVAILABLE',
          balance: 0,
        },
      });
    }

    // Update balance
    const newBalance = parseFloat(balance.balance.toString()) + dto.amount;
    await this.prisma.walletBalance.update({
      where: { id: balance.id },
      data: { balance: newBalance },
    });

    // Record wallet transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        balanceId: balance.id,
        type: 'credit',
        amount: dto.amount,
        currency: dto.currency,
        balanceBefore: balance.balance,
        balanceAfter: newBalance,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        description: dto.description,
      },
    });

    this.logger.log(
      `Credited ${dto.amount} AU-${dto.currency} to user ${dto.userId}`,
    );

    return { balance: newBalance, currency: dto.currency, auLabel: `AU-${dto.currency}` };
  }

  async debit(dto: {
    userId: string;
    amount: number;
    currency: string;
    referenceType: string;
    referenceId: string;
    description?: string;
  }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const balance = await this.prisma.walletBalance.findUnique({
      where: {
        walletId_currency_type: {
          walletId: wallet.id,
          currency: dto.currency,
          type: 'AVAILABLE',
        },
      },
    });

    if (!balance || parseFloat(balance.balance.toString()) < dto.amount) {
      throw new BadRequestException(`Insufficient AU-${dto.currency} balance`);
    }

    const newBalance = parseFloat(balance.balance.toString()) - dto.amount;
    await this.prisma.walletBalance.update({
      where: { id: balance.id },
      data: { balance: newBalance },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        balanceId: balance.id,
        type: 'debit',
        amount: dto.amount,
        currency: dto.currency,
        balanceBefore: balance.balance,
        balanceAfter: newBalance,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        description: dto.description,
      },
    });

    return { balance: newBalance, currency: dto.currency, auLabel: `AU-${dto.currency}` };
  }

  async requestWithdrawal(dto: {
    userId: string;
    amount: number;
    currency: string;
    providerId: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    phoneNumber?: string;
  }) {
    // CRITICAL: Verify provider supports the currency
    const provider = this.providerRegistry.get(dto.providerId);
    if (!provider.supportedCurrencies.includes(dto.currency)) {
      // This is a critical fraud signal per Section 13.9
      this.logger.error(
        `FRAUD ALERT: User ${dto.userId} attempted withdrawal of ${dto.currency} via ${dto.providerId} which does not support that currency`,
      );
      throw new ForbiddenException('Currency-provider mismatch detected');
    }

    // Check balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
      include: { balances: true },
    });

    const balance = wallet?.balances.find(
      (b) => b.currency === dto.currency && b.type === 'AVAILABLE',
    );

    if (!balance || parseFloat(balance.balance.toString()) < dto.amount) {
      throw new BadRequestException(`Insufficient AU-${dto.currency} balance`);
    }

    // Create withdrawal request
    const withdrawal = await this.prisma.withdrawalRequest.create({
      data: {
        userId: dto.userId,
        walletId: wallet.id,
        balanceId: balance.id,
        amount: dto.amount,
        currency: dto.currency,
        providerId: dto.providerId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountName: dto.bankAccountName,
        status: 'pending',
      },
    });

    return withdrawal;
  }
}
```

---

## 8. Escrow Service

```typescript
// backend/services/escrow/src/escrow.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { WalletService } from '../../wallet/src/wallet.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createEscrow(data: {
    contractId: string;
    amount: number;
    currency: string;
    milestones: { title: string; amount: number; dueDate?: Date }[];
  }) {
    const escrow = await this.prisma.escrow.create({
      data: {
        contractId: data.contractId,
        amount: data.amount,
        currency: data.currency,
        status: 'PENDING',
        milestones: {
          create: data.milestones.map((m, i) => ({
            milestoneIndex: i,
            title: m.title,
            amount: m.amount,
            dueDate: m.dueDate,
            status: 'PENDING',
          })),
        },
      },
      include: { milestones: true },
    });

    this.logger.log(`Escrow created for contract ${data.contractId}`);
    return escrow;
  }

  async fundEscrow(escrowId: string, userId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) throw new BadRequestException('Escrow not found');
    if (escrow.status !== 'PENDING') {
      throw new BadRequestException('Escrow is not in pending status');
    }

    // Debit client's wallet
    await this.walletService.debit({
      userId,
      amount: parseFloat(escrow.amount.toString()),
      currency: escrow.currency,
      referenceType: 'escrow',
      referenceId: escrowId,
      description: `Escrow funding for contract ${escrow.contractId}`,
    });

    // Update escrow status
    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'FUNDED', fundedAt: new Date() },
    });

    this.eventEmitter.emit('escrow.funded', {
      escrowId,
      contractId: escrow.contractId,
      amount: escrow.amount,
      currency: escrow.currency,
    });

    return { success: true, status: 'FUNDED' };
  }

  async releaseMilestone(escrowId: string, milestoneIndex: number, clientId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) throw new BadRequestException('Escrow not found');
    if (escrow.status !== 'FUNDED' && escrow.status !== 'PENDING') {
      throw new BadRequestException('Escrow is not funded');
    }

    const milestone = escrow.milestones.find((m) => m.milestoneIndex === milestoneIndex);
    if (!milestone) throw new BadRequestException('Milestone not found');
    if (milestone.status !== 'SUBMITTED') {
      throw new BadRequestException('Milestone is not submitted for approval');
    }

    // Get contract to find freelancer
    const contract = await this.prisma.contract.findUnique({
      where: { id: escrow.contractId },
    });

    // Credit freelancer's wallet (minus platform commission)
    const commission = this.calculateCommission(parseFloat(milestone.amount.toString()));
    const payoutAmount = parseFloat(milestone.amount.toString()) - commission;

    await this.walletService.credit({
      userId: contract.freelancerId,
      amount: payoutAmount,
      currency: escrow.currency,
      referenceType: 'escrow',
      referenceId: escrowId,
      description: `Milestone ${milestoneIndex + 1} payout for contract ${escrow.contractId}`,
    });

    // Update milestone
    await this.prisma.escrowMilestone.update({
      where: { id: milestone.id },
      data: { status: 'PAID', releasedAt: new Date() },
    });

    // Check if all milestones are paid
    const allMilestones = await this.prisma.escrowMilestone.findMany({
      where: { escrowId },
    });

    const allPaid = allMilestones.every((m) => m.status === 'PAID');
    if (allPaid) {
      await this.prisma.escrow.update({
        where: { id: escrowId },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }

    this.eventEmitter.emit('escrow.released', {
      escrowId,
      milestoneIndex,
      amount: payoutAmount,
      currency: escrow.currency,
      freelancerId: contract.freelancerId,
    });

    return { success: true, amount: payoutAmount, currency: escrow.currency };
  }

  async refundEscrow(escrowId: string, reason: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) throw new BadRequestException('Escrow not found');

    // Get contract to find client
    const contract = await this.prisma.contract.findUnique({
      where: { id: escrow.contractId },
    });

    // Refund to client's wallet
    await this.walletService.credit({
      userId: contract.clientId,
      amount: parseFloat(escrow.amount.toString()),
      currency: escrow.currency,
      referenceType: 'escrow',
      referenceId: escrowId,
      description: `Escrow refund: ${reason}`,
    });

    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });

    this.eventEmitter.emit('escrow.refunded', {
      escrowId,
      amount: escrow.amount,
      currency: escrow.currency,
      reason,
    });

    return { success: true };
  }

  private calculateCommission(amount: number): number {
    // 10% platform commission
    return amount * 0.10;
  }
}
```

---

## 9. Payment Module Configuration

```typescript
// backend/services/payment/src/payment.module.ts

import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { ChapaAdapter } from './adapters/chapa.adapter';
import { SantimPayAdapter } from './adapters/santimpay.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { PayPalAdapter } from './adapters/paypal.adapter';

@Module({})
export class PaymentModule {
  static register(): DynamicModule {
    return {
      module: PaymentModule,
      imports: [HttpModule, ConfigModule],
      controllers: [PaymentController],
      providers: [
        PaymentService,
        PaymentProviderRegistry,
        ChapaAdapter,
        SantimPayAdapter,
        StripeAdapter,
        PayPalAdapter,
        {
          provide: 'PAYMENT_PROVIDERS',
          useFactory: (
            chapa: ChapaAdapter,
            santimpay: SantimPayAdapter,
            stripe: StripeAdapter,
            paypal: PayPalAdapter,
            registry: PaymentProviderRegistry,
          ) => {
            registry.register(chapa);
            registry.register(santimpay);
            registry.register(stripe);
            registry.register(paypal);
            return registry;
          },
          inject: [ChapaAdapter, SantimPayAdapter, StripeAdapter, PayPalAdapter, PaymentProviderRegistry],
        },
      ],
      exports: [PaymentService, PaymentProviderRegistry],
    };
  }
}
```

---

## 10. Environment Variables

```bash
# backend/services/payment/.env

# Chapa
CHAPA_SECRET_KEY=chapa_test_xxxxxxxxxxxxx
CHAPA_PUBLIC_KEY=chapa_pk_test_xxxxxxxxxxxxx
CHAPA_WEBHOOK_SECRET=chapa_whsec_xxxxxxxxxxxxx
CHAPA_TEST_MODE=true

# SantimPay
SANTIMPAY_MERCHANT_ID=adbar_merchant_xxx
SANTIMPAY_PRIVATE_KEY=santim_pk_xxxxxxxxxxxxx
SANTIMPAY_WEBHOOK_SECRET=santim_whsec_xxxxxxxxxxxxx
SANTIMPAY_TEST_MODE=true

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# PayPal
PAYPAL_CLIENT_ID=paypal_client_xxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=paypal_secret_xxxxxxxxxxxxx
PAYPAL_SANDBOX=true
```

---

## 11. Sequence Diagrams

### 11.1 Chapa Checkout Flow

```
Buyer                Frontend           API Gateway       Payment Svc        Chapa API
  │                     │                    │                 │                 │
  │──Select ETB────────>│                    │                 │                 │
  │                     │──GET /providers────>│                 │                 │
  │                     │   ?currency=ETB     │──getProviders──>│                 │
  │                     │<─[Chapa,SantimPay]──│<─providers──────│                 │
  │<─Show provider cards│                    │                 │                 │
  │                     │                    │                 │                 │
  │──Click Chapa───────>│                    │                 │                 │
  │                     │──POST /initiate────>│                 │                 │
  │                     │  {providerId:chapa} │──initiatePay───>│                 │
  │                     │                    │                 │──POST /initialize│
  │                     │                    │                 │  {amount,tx_ref} │
  │                     │                    │                 │<─{checkout_url}──│
  │                     │<─{checkoutUrl}─────│<─result─────────│                 │
  │<─Redirect to Chapa──│                    │                 │                 │
  │                     │                    │                 │                 │
  │──Pay on Chapa────────────────────────────────────────────────────────────────>│
  │                     │                    │                 │                 │
  │<─Redirect back──────│                    │                 │                 │
  │  ?status=success    │                    │                 │                 │
  │                     │                    │                 │                 │
  │                     │                    │                 │<──Webhook POST──│
  │                     │                    │                 │  {tx_ref,status} │
  │                     │                    │                 │──verify────────>│
  │                     │                    │                 │<─confirmed──────│
  │                     │                    │                 │──credit wallet──│
  │                     │                    │                 │──emit event─────│
  │<─Order confirmed────│                    │                 │                 │
```

### 11.2 AU Credit/Withdraw with Currency-Match Enforcement

```
User                 Wallet Svc         Payment Registry    Payment Provider
  │                      │                     │                    │
  │──Credit (ETB)───────>│                     │                    │
  │  from payment        │──find/create────────│                    │
  │                      │  AU-ETB balance     │                    │
  │                      │──update balance─────│                    │
  │                      │──log transaction────│                    │
  │<─AU-ETB: 5000────────│                     │                    │
  │                      │                     │                    │
  │──Withdraw ETB───────>│                     │                    │
  │  via Chapa           │──validate provider──>│                    │
  │                      │  supports ETB       │──get(chapa)───────>│
  │                      │<─✓ Chapa supports───│<─supportedCurrencies│
  │                      │  ETB                │  ["ETB"]           │
  │                      │──debit AU-ETB───────│                    │
  │                      │──create withdrawal──│                    │
  │<─Withdrawal pending──│                     │                    │
  │                      │                     │                    │
  │                      │──process payout─────────────────────────>│
  │                      │<─payout completed────────────────────────│
  │<─Payout complete─────│                     │                    │
  │                      │                     │                    │
  │──FRAUD ATTEMPT:──────>│                     │                    │
  │  Withdraw ETB        │──validate provider──>│                    │
  │  via Stripe          │  supports ETB       │──get(stripe)──────>│
  │                      │<─✗ Stripe does not──│<─supportedCurrencies│
  │                      │  support ETB        │  ["USD","EUR"]     │
  │                      │──BLOCK + ALERT──────│                    │
  │<─FORBIDDEN───────────│                     │                    │
  │  Currency mismatch   │                     │                    │
```

### 11.3 USSD Balance Check Flow

```
Feature Phone        USSD Gateway       USSD Service       Wallet Service
      │                    │                  │                   │
      │──*801*1#─────────>│                  │                   │
      │                    │──session start──>│                   │
      │<─"Adbar: 1.Balance │                  │                   │
      │  2.Order Status"   │                  │                   │
      │                    │                  │                   │
      │──Send "1"─────────>│                  │                   │
      │                    │──process input──>│                   │
      │                    │  {text:"1"}      │──getWallet───────>│
      │                    │                  │  (same API as web)│
      │                    │                  │<─{AU-ETB:5000,───│
      │                    │                  │  AU-USD:200}      │
      │<─"Balance:─────────│<─response────────│                   │
      │  ETB:5000          │                  │                   │
      │  USD:200"          │                  │                   │
      │                    │                  │                   │
      │                    │──trigger SMS─────│                   │
      │<─SMS:"Adbar Balance│                  │                   │
      │  AU-ETB:5000       │                  │                   │
      │  AU-USD:200"       │                  │                   │
```
