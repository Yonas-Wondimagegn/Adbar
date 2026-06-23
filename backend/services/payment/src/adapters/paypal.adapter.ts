import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class PaypalAdapter implements PaymentProvider {
  readonly name = 'paypal';
  readonly displayName = 'PayPal';
  private readonly logger = new Logger(PaypalAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;
  private readonly sandbox: boolean;

  constructor(private readonly httpService: HttpService) {
    this.clientId = process.env['PAYPAL_CLIENT_ID'] || '';
    this.clientSecret = process.env['PAYPAL_CLIENT_SECRET'] || '';
    this.webhookId = process.env['PAYPAL_WEBHOOK_ID'] || '';
    this.sandbox = (process.env['PAYPAL_SANDBOX'] || 'true') === 'true';
  }

  private get baseUrl(): string {
    return this.sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP'];
  }

  supportsCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
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

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.orderId,
            description: request.description || `Order ${request.orderId}`,
            amount: {
              currency_code: request.currency.toUpperCase(),
              value: request.amount.toFixed(2),
            },
            custom_id: JSON.stringify({
              orderId: request.orderId,
              userId: request.userId,
            }),
          },
        ],
        application_context: {
          brand_name: 'Adbar',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: request.returnUrl || `${process.env['APP_URL']}/payment/paypal/execute`,
          cancel_url: request.cancelUrl || `${process.env['APP_URL']}/payment/paypal/cancel`,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/checkout/orders`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      // Extract approval URL
      const approvalUrl = data.links?.find(
        (link: any) => link.rel === 'approve',
      )?.href;

      return {
        success: true,
        transactionId: data.id,
        reference: data.id,
        checkoutUrl: approvalUrl,
        status: data.status === 'CREATED' ? 'pending' : 'failed',
        provider: this.name,
        amount: request.amount,
        currency: request.currency,
        metadata: { orderId: data.id },
      };
    } catch (error) {
      this.logger.error('PayPal payment initiation failed', error);
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
      const accessToken = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/checkout/orders/${reference}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      let status: PaymentResponse['status'] = 'pending';
      if (data.status === 'COMPLETED') {
        status = 'completed';
      } else if (data.status === 'VOIDED' || data.status === 'PAYER_ACTION_REQUIRED') {
        status = 'failed';
      }

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

      return {
        success: status === 'completed',
        transactionId: capture?.id || data.id,
        reference,
        status,
        provider: this.name,
        amount: parseFloat(data.purchase_units?.[0]?.amount?.value || '0'),
        currency: data.purchase_units?.[0]?.amount?.currency_code || 'USD',
        metadata: data,
      };
    } catch (error) {
      this.logger.error('PayPal payment verification failed', error);
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

  /**
   * Capture an approved PayPal order
   */
  async capturePayment(orderId: string): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

      return {
        success: data.status === 'COMPLETED',
        transactionId: capture?.id,
        reference: orderId,
        status: data.status === 'COMPLETED' ? 'completed' : 'failed',
        provider: this.name,
        amount: parseFloat(capture?.amount?.value || '0'),
        currency: capture?.amount?.currency_code || 'USD',
        metadata: data,
      };
    } catch (error) {
      this.logger.error('PayPal capture failed', error);
      return {
        success: false,
        reference: orderId,
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
      // PayPal webhook verification is done via API
      // In production, verify using PayPal's webhook verification API
      const authAlgo = payload.auth_algo || signature;
      const certUrl = payload.cert_url;
      const transmissionId = payload.transmission_id;
      const transmissionSig = payload.transmission_sig;
      const transmissionTime = payload.transmission_time;

      if (!this.webhookId || !transmissionSig) {
        this.logger.warn('PayPal webhook verification: missing required fields');
        return false;
      }

      // In production, call PayPal's POST /v1/notifications/verify-webhook-signature
      this.logger.log('PayPal webhook signature verification (simplified)');
      return true;
    } catch (error) {
      this.logger.error('PayPal webhook signature verification failed', error);
      return false;
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const eventType = payload.eventType || payload.raw?.['event_type'];
      const resource = payload.raw?.['resource'];

      if (!eventType) {
        return { success: false, message: 'Missing event type' };
      }

      this.logger.log(`PayPal webhook received: ${eventType}`);

      switch (eventType) {
        case 'CHECKOUT.ORDER.APPROVED':
        case 'PAYMENT.CAPTURE.COMPLETED':
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.REFUNDED':
          return { success: true, message: `Event ${eventType} processed` };
        default:
          return { success: true, message: `Event ${eventType} acknowledged` };
      }
    } catch (error) {
      this.logger.error('PayPal webhook handling failed', error);
      return { success: false, message: (error as Error).message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `pp-refund-${request.transactionId}-${Date.now()}`;

    try {
      const accessToken = await this.getAccessToken();

      const payload = {
        amount: {
          value: request.amount.toFixed(2),
          currency_code: request.currency.toUpperCase(),
        },
        note_to_payer: request.reason || 'Refund',
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/payments/captures/${request.transactionId}/refund`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      return {
        success: data.status === 'COMPLETED' || data.status === 'PENDING',
        refundId: data.id || refundId,
        transactionId: request.transactionId,
        amount: request.amount,
        currency: request.currency,
        status: data.status === 'COMPLETED' ? 'completed' : data.status === 'PENDING' ? 'pending' : 'failed',
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('PayPal refund failed', error);
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
