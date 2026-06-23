import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeAdapter implements PaymentProvider {
  readonly name = 'stripe';
  readonly displayName = 'Stripe';
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly httpService: HttpService) {
    this.secretKey = process.env['STRIPE_SECRET_KEY'] || '';
    this.publicKey = process.env['STRIPE_PUBLIC_KEY'] || '';
    this.webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] || '';
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'ETB'];
  }

  supportsCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private encodeParams(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Create a Stripe Checkout Session
      const params = this.encodeParams({
        payment_method_types: 'card',
        mode: 'payment',
        success_url: request.returnUrl || `${process.env['APP_URL']}/payment/stripe/success?orderId=${request.orderId}`,
        cancel_url: request.cancelUrl || `${process.env['APP_URL']}/payment/stripe/cancel?orderId=${request.orderId}`,
        customer_email: request.customerEmail,
        line_items: JSON.stringify([{
          price_data: {
            currency: request.currency.toLowerCase(),
            product_data: {
              name: request.description || `Order ${request.orderId}`,
            },
            unit_amount: Math.round(request.amount * 100), // Stripe uses cents
          },
          quantity: 1,
        }]),
        metadata: {
          order_id: request.orderId,
          user_id: request.userId,
        },
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/checkout/sessions`, params, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data;

      return {
        success: true,
        transactionId: data.id,
        reference: data.id,
        checkoutUrl: data.url,
        status: 'pending',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
        metadata: { sessionId: data.id },
      };
    } catch (error) {
      this.logger.error('Stripe payment initiation failed', error);
      return {
        success: false,
        reference: '',
        status: 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { error: (error as Error).message },
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/checkout/sessions/${reference}`, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data;

      let status: PaymentResponse['status'] = 'pending';
      if (data.payment_status === 'paid') {
        status = 'completed';
      } else if (data.payment_status === 'unpaid') {
        status = 'pending';
      } else if (data.status === 'expired') {
        status = 'failed';
      }

      return {
        success: status === 'completed',
        transactionId: data.payment_intent,
        reference,
        status,
        provider: this.name,
        amount: (data.amount_total || 0) / 100,
        currency: (data.currency || 'usd').toUpperCase(),
        metadata: data,
      };
    } catch (error) {
      this.logger.error('Stripe payment verification failed', error);
      return {
        success: false,
        reference,
        status: 'failed',
        provider: this.name,
        amount: 0,
        currency: 'USD',
        metadata: { error: (error as Error).message },
      };
    }
  }

  verifyWebhookSignature(payload: Record<string, any>, signature: string): boolean {
    try {
      const timestamp = signature?.split(',')?.find((s: string) => s.startsWith('t='));
      const sig = signature?.split(',')?.find((s: string) => s.startsWith('s='));

      if (!timestamp || !sig) return false;

      const signedPayload = `${timestamp.split('=')[1]}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(sig.split('=')[1] || ''),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Stripe webhook signature verification failed', error);
      return false;
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const eventType = payload.eventType || payload.raw?.['type'];
      const data = payload.raw?.['data']?.['object'];

      if (!eventType) {
        return { success: false, message: 'Missing event type' };
      }

      this.logger.log(`Stripe webhook received: ${eventType}`);

      // Handle specific events
      switch (eventType) {
        case 'checkout.session.completed':
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'charge.refunded':
          return { success: true, message: `Event ${eventType} processed` };
        default:
          return { success: true, message: `Event ${eventType} acknowledged` };
      }
    } catch (error) {
      this.logger.error('Stripe webhook handling failed', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `stripe-refund-${request.transactionId}-${Date.now()}`;

    try {
      const params = this.encodeParams({
        payment_intent: request.transactionId,
        amount: Math.round(request.amount * 100),
        reason: request.reason || 'requested_by_customer',
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refunds`, params, {
          headers: this.getHeaders(),
        }),
      );

      const data = response.data;

      return {
        success: data.status === 'succeeded',
        refundId: data.id || refundId,
        transactionId: request.transactionId,
        amount: (data.amount || 0) / 100,
        currency: (data.currency || 'usd').toUpperCase(),
        status: data.status === 'succeeded' ? 'completed' : 'failed',
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('Stripe refund failed', error);
      return {
        success: false,
        refundId,
        transactionId: request.transactionId,
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        provider: this.name,
      };
    }
  }
}
