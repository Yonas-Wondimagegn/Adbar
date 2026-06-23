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
  PayoutRequest,
  PayoutResponse,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class SantimPayAdapter implements PaymentProvider {
  readonly name = 'santimpay';
  readonly displayName = 'SantimPay';
  private readonly logger = new Logger(SantimPayAdapter.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env['SANTIMPAY_BASE_URL'] || 'https://santimpay.com/api';
    this.merchantId = process.env['SANTIMPAY_MERCHANT_ID'] || '';
    this.secretKey = process.env['SANTIMPAY_SECRET_KEY'] || '';
    this.apiKey = process.env['SANTIMPAY_API_KEY'] || '';
  }

  getSupportedCurrencies(): string[] {
    return ['ETB'];
  }

  supportsCurrency(currency: string): boolean {
    return currency.toUpperCase() === 'ETB';
  }

  /**
   * Generate SantimPay signature for direct charge
   */
  private generateSignature(payload: Record<string, any>): string {
    const sortedKeys = Object.keys(payload).sort();
    const queryString = sortedKeys
      .filter((key) => key !== 'signature')
      .map((key) => `${key}=${payload[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const reference = `adbar-sp-${request.orderId}-${Date.now()}`;

    // SantimPay supports two flow types:
    // 1. Redirect flow (hosted checkout page)
    // 2. Direct charge (for mobile money)

    const payload: Record<string, any> = {
      merchantId: this.merchantId,
      apiKey: this.apiKey,
      orderId: request.orderId,
      amount: request.amount.toString(),
      currency: request.currency,
      description: request.description || `Order ${request.orderId}`,
      customerEmail: request.customerEmail || '',
      customerName: request.customerName || '',
      reference,
      returnUrl: request.returnUrl || `${process.env['APP_URL']}/payment/callback`,
      cancelUrl: request.cancelUrl || `${process.env['APP_URL']}/payment/cancel`,
      notifyUrl: `${process.env['APP_URL']}/payment/santimpay/webhook`,
      timestamp: Date.now().toString(),
    };

    payload['signature'] = this.generateSignature(payload);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payment/init`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      if (data.success || data.status === 'success') {
        return {
          success: true,
          reference,
          checkoutUrl: data.checkoutUrl || data.paymentUrl || data.redirectUrl,
          status: 'pending',
          provider: this.name,
          amount: request.amount,
          currency: request.currency,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          metadata: { rawResponse: data },
        };
      }

      return {
        success: false,
        reference,
        status: 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { error: data.message || data.error },
      };
    } catch (error) {
      this.logger.error('SantimPay payment initiation failed', error);
      return {
        success: false,
        reference,
        status: 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { error: (error as Error).message },
      };
    }
  }

  /**
   * Direct charge for mobile money (no redirect)
   */
  async directCharge(phoneNumber: string, request: PaymentRequest): Promise<PaymentResponse> {
    const reference = `adbar-dc-${request.orderId}-${Date.now()}`;

    const payload: Record<string, any> = {
      merchantId: this.merchantId,
      apiKey: this.apiKey,
      orderId: request.orderId,
      amount: request.amount.toString(),
      currency: request.currency,
      phoneNumber,
      description: request.description || `Order ${request.orderId}`,
      reference,
      timestamp: Date.now().toString(),
    };

    payload['signature'] = this.generateSignature(payload);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/direct-charge`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      return {
        success: data.success || data.status === 'success',
        reference,
        status: data.success ? 'processing' : 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { rawResponse: data },
      };
    } catch (error) {
      this.logger.error('SantimPay direct charge failed', error);
      return {
        success: false,
        reference,
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
        this.httpService.get(`${this.baseUrl}/payment/verify`, {
          params: {
            merchantId: this.merchantId,
            apiKey: this.apiKey,
            reference,
          },
          headers: {
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      let status: PaymentResponse['status'] = 'pending';
      if (data.status === 'success' || data.status === 'completed') {
        status = 'completed';
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        status = 'failed';
      } else {
        status = 'processing';
      }

      return {
        success: status === 'completed',
        transactionId: data.transactionId || data.id,
        reference,
        status,
        provider: this.name,
        amount: parseFloat(data.amount || '0'),
        currency: data.currency || 'ETB',
        metadata: data,
      };
    } catch (error) {
      this.logger.error('SantimPay payment verification failed', error);
      return {
        success: false,
        reference,
        status: 'failed',
        provider: this.name,
        amount: 0,
        currency: 'ETB',
        metadata: { error: (error as Error).message },
      };
    }
  }

  verifyWebhookSignature(payload: Record<string, any>, signature: string): boolean {
    try {
      const { signature: _, ...payloadWithoutSig } = payload;
      const expectedSignature = this.generateSignature(payloadWithoutSig);

      return crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('SantimPay webhook signature verification failed', error);
      return false;
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const reference = payload.reference || payload.raw?.['reference'];
      const status = payload.status || payload.raw?.['status'];

      if (!reference) {
        return { success: false, message: 'Missing reference' };
      }

      this.logger.log(`SantimPay webhook received: ${reference} - ${status}`);

      return {
        success: true,
        message: `Webhook processed for ${reference}`,
      };
    } catch (error) {
      this.logger.error('SantimPay webhook handling failed', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `sp-refund-${request.transactionId}-${Date.now()}`;

    try {
      const payload: Record<string, any> = {
        merchantId: this.merchantId,
        apiKey: this.apiKey,
        transactionId: request.transactionId,
        amount: request.amount.toString(),
        reason: request.reason || 'Customer refund',
        timestamp: Date.now().toString(),
      };

      payload['signature'] = this.generateSignature(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refund`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      return {
        success: data.success || data.status === 'success',
        refundId,
        transactionId: request.transactionId,
        amount: request.amount,
        currency: request.currency,
        status: data.success ? 'completed' : 'failed',
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('SantimPay refund failed', error);
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

  async payout(request: PayoutRequest): Promise<PayoutResponse> {
    const payoutId = `sp-payout-${Date.now()}`;

    try {
      const payload: Record<string, any> = {
        merchantId: this.merchantId,
        apiKey: this.apiKey,
        amount: request.amount.toString(),
        currency: request.currency,
        accountNumber: request.recipientAccount,
        accountName: request.recipientName,
        reference: request.reference || payoutId,
        timestamp: Date.now().toString(),
      };

      payload['signature'] = this.generateSignature(payload);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payout`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }),
      );

      const data = response.data;

      return {
        success: data.success || data.status === 'success',
        payoutId,
        amount: request.amount,
        currency: request.currency,
        status: data.success ? 'completed' : 'failed',
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('SantimPay payout failed', error);
      return {
        success: false,
        payoutId,
        amount: request.amount,
        currency: request.currency,
        status: 'failed',
        provider: this.name,
      };
    }
  }
}
