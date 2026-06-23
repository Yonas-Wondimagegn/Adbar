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
export class ChapaAdapter implements PaymentProvider {
  readonly name = 'chapa';
  readonly displayName = 'Chapa';
  private readonly logger = new Logger(ChapaAdapter.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env['CHAPA_BASE_URL'] || 'https://api.chapa.co/v1';
    this.secretKey = process.env['CHAPA_SECRET_KEY'] || '';
    this.publicKey = process.env['CHAPA_PUBLIC_KEY'] || '';
    this.webhookSecret = process.env['CHAPA_WEBHOOK_SECRET'] || '';
  }

  getSupportedCurrencies(): string[] {
    return ['ETB', 'USD'];
  }

  supportsCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const txRef = `adbar-${request.orderId}-${Date.now()}`;

    const payload = {
      amount: request.amount,
      currency: request.currency,
      email: request.customerEmail,
      first_name: request.customerName?.split(' ')[0] || 'Customer',
      last_name: request.customerName?.split(' ')[1] || '',
      tx_ref: txRef,
      callback_url: request.returnUrl || `${process.env['APP_URL']}/orders/${request.orderId}/payment/callback`,
      return_url: request.returnUrl || `${process.env['APP_URL']}/orders/${request.orderId}/payment/verify`,
      customization: {
        title: request.description || 'Adbar Order Payment',
        description: `Payment for order ${request.orderId}`,
      },
      meta: {
        order_id: request.orderId,
        user_id: request.userId,
        ...request.metadata,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      if (data.status === 'success') {
        return {
          success: true,
          reference: txRef,
          checkoutUrl: data.data.checkout_url,
          status: 'pending',
          provider: this.name,
          amount: request.amount,
          currency: request.currency,
          metadata: { txRef },
        };
      }

      return {
        success: false,
        reference: txRef,
        status: 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { error: data.message },
      };
    } catch (error) {
      this.logger.error('Chapa payment initiation failed', error);
      return {
        success: false,
        reference: txRef,
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
        this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );

      const data = response.data;

      let status: PaymentResponse['status'] = 'pending';
      if (data.status === 'success') {
        const txStatus = data.data.status;
        if (txStatus === 'success' || txStatus === 'completed') {
          status = 'completed';
        } else if (txStatus === 'failed' || txStatus === 'cancelled') {
          status = 'failed';
        } else {
          status = 'processing';
        }
      }

      return {
        success: status === 'completed',
        transactionId: data.data.tx_ref || data.data.id,
        reference,
        status,
        provider: this.name,
        amount: parseFloat(data.data.amount || '0'),
        currency: data.data.currency || 'ETB',
        metadata: data.data,
      };
    } catch (error) {
      this.logger.error('Chapa payment verification failed', error);
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
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Chapa webhook signature verification failed', error);
      return false;
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const txRef = payload.reference || payload.raw?.['tx_ref'];
      const status = payload.status || payload.raw?.['status'];

      if (!txRef) {
        return { success: false, message: 'Missing transaction reference' };
      }

      this.logger.log(`Chapa webhook received: ${txRef} - ${status}`);

      return {
        success: true,
        message: `Webhook processed for ${txRef}`,
        // The actual processing is done by PaymentService
      };
    } catch (error) {
      this.logger.error('Chapa webhook handling failed', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `refund-${request.transactionId}-${Date.now()}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/refund`, {
          tx_ref: request.transactionId,
          amount: request.amount,
          reason: request.reason,
        }, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      return {
        success: data.status === 'success',
        refundId,
        transactionId: request.transactionId,
        amount: request.amount,
        currency: request.currency,
        status: data.status === 'success' ? 'completed' : 'failed',
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('Chapa refund failed', error);
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
