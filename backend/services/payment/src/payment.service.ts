import { Injectable, Logger, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { PaymentProvider } from './interfaces/payment-provider.interface';
import { PaymentEventTopics } from '@adbar/events';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: any,
  ) {}

  // ========== GET PROVIDERS BY CURRENCY ==========

  async getProviders(currency?: string) {
    const configs = this.providerRegistry.getEnabledProviders();

    let providers = configs.map((config) => ({
      name: config.name,
      displayName: config.displayName,
      supportedCurrencies: config.supportedCurrencies,
      enabled: config.enabled,
    }));

    if (currency) {
      providers = providers.filter((p) =>
        p.supportedCurrencies.includes(currency.toUpperCase()),
      );
    }

    return providers;
  }

  // ========== INITIATE PAYMENT ==========

  async initiatePayment(data: any, userId: string) {
    const provider = this.providerRegistry.get(data.provider);

    if (!provider) {
      throw new NotFoundException(`Payment provider "${data.provider}" not found`);
    }

    if (!provider.supportsCurrency(data.currency)) {
      throw new BadRequestException(
        `Provider "${data.provider}" does not support currency ${data.currency}`,
      );
    }

    // Create transaction record (using the Transaction model from schema)
    const transaction = await this.prisma.transaction.create({
      data: {
        orderId: data.orderId || null,
        contractId: data.contractId || null,
        userId,
        providerId: data.provider,
        providerRef: '',
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        status: 'PENDING' as any,
        type: data.contractId ? 'payment' : 'payment',
      },
    });

    // Initiate with provider adapter
    const result = await provider.initiatePayment({
      amount: data.amount,
      currency: data.currency,
      orderId: data.orderId,
      userId,
      description: data.description,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
      metadata: { ...data.metadata, transactionId: transaction.id },
    });

    // Update transaction with provider reference
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        providerRef: result.reference,
        status: result.success ? 'PENDING' : 'FAILED',
        rawWebhookPayload: result.metadata as any,
      },
    });

    await this.publishEvent(PaymentEventTopics.PAYMENT_INITIATED, {
      transactionId: transaction.id,
      orderId: data.orderId,
      userId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
    });

    return {
      ...result,
      transactionId: transaction.id,
    };
  }

  // ========== VERIFY PAYMENT ==========

  async verifyPayment(reference: string, providerName: string) {
    const provider = this.providerRegistry.get(providerName);
    if (!provider) throw new NotFoundException(`Payment provider "${providerName}" not found`);

    const result = await provider.verifyPayment(reference);

    const transaction = await this.prisma.transaction.findFirst({
      where: { providerRef: reference },
    });

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: result.status === 'completed' ? 'SUCCESS' : (result.status as any).toUpperCase(),
        },
      });

      if (result.status === 'completed' && transaction.orderId) {
        await this.prisma.order.update({
          where: { id: transaction.orderId },
          data: { status: 'PAID' },
        });

        await this.publishEvent(PaymentEventTopics.PAYMENT_SUCCESS, {
          transactionId: transaction.id,
          orderId: transaction.orderId,
          userId: transaction.userId,
          amount: result.amount,
          currency: result.currency,
          provider: providerName,
          paidAt: new Date().toISOString(),
        });
      }
    }

    return result;
  }

  // ========== HANDLE WEBHOOK ==========

  async handleWebhook(providerName: string, payload: Record<string, any>, headers: Record<string, string>) {
    const provider = this.providerRegistry.get(providerName);
    if (!provider) throw new NotFoundException(`Payment provider "${providerName}" not found`);

    const signature =
      headers['x-webhook-signature'] ||
      headers['x-stripe-signature'] ||
      headers['x-paypal-transmission-sig'] ||
      headers['signature'] ||
      '';

    const isValid = provider.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for provider: ${providerName}`);
      return { success: false, message: 'Invalid signature' };
    }

    const webhookPayload = {
      provider: providerName,
      eventType: payload.type || payload.event_type || 'unknown',
      reference: payload.reference || payload.tx_ref || payload['data']?.['id'] || '',
      transactionId: payload.transactionId || payload['data']?.['object']?.['id'],
      status: payload.status || payload['data']?.['object']?.['status'] || 'unknown',
      amount: payload.amount,
      currency: payload.currency,
      signature,
      raw: payload,
    };

    await this.processWebhookResult(providerName, webhookPayload);
    return { success: true };
  }

  private async processWebhookResult(providerName: string, payload: any) {
    const reference = payload.reference;
    const status = payload.status;

    const transaction = await this.prisma.transaction.findFirst({
      where: { providerRef: reference },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for reference: ${reference}`);
      return;
    }

    let txStatus: string;
    let orderStatus: string | null = null;

    switch (status) {
      case 'success':
      case 'completed':
      case 'paid':
      case 'succeeded':
        txStatus = 'SUCCESS';
        if (transaction.orderId) orderStatus = 'PAID';
        break;
      case 'failed':
      case 'cancelled':
      case 'declined':
        txStatus = 'FAILED';
        break;
      case 'refunded':
        txStatus = 'REFUNDED';
        if (transaction.orderId) orderStatus = 'REFUNDED';
        break;
      default:
        txStatus = status.toUpperCase();
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: txStatus as any,
        rawWebhookPayload: payload.raw as any,
      },
    });

    if (orderStatus && transaction.orderId) {
      await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: { status: orderStatus as any },
      });
    }

    if (txStatus === 'SUCCESS') {
      await this.publishEvent(PaymentEventTopics.PAYMENT_SUCCESS, {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: providerName,
        paidAt: new Date().toISOString(),
      });
    } else if (txStatus === 'FAILED') {
      await this.publishEvent(PaymentEventTopics.PAYMENT_FAILED, {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        userId: transaction.userId,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: providerName,
      });
    }
  }

  // ========== REFUND ==========

  async refund(data: any) {
    const provider = this.providerRegistry.get(data.provider);
    if (!provider) throw new NotFoundException(`Payment provider "${data.provider}" not found`);

    const transaction = await this.prisma.transaction.findFirst({
      where: { providerRef: data.transactionId },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const result = await provider.refund({
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason,
    });

    if (result.success) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'REFUNDED' },
      });

      if (transaction.orderId) {
        await this.prisma.order.update({
          where: { id: transaction.orderId },
          data: { status: 'REFUNDED' },
        });
      }

      await this.publishEvent(PaymentEventTopics.PAYMENT_REFUNDED, {
        transactionId: transaction.id,
        orderId: transaction.orderId,
        userId: transaction.userId,
        amount: data.amount,
        reason: data.reason,
      });
    }

    return result;
  }

  private async publishEvent(topic: string, data: any) {
    if (this.eventPublisher) {
      try {
        await this.eventPublisher.publish(topic, data);
      } catch (error) {
        this.logger.error(`Failed to publish event ${topic}`, error);
      }
    }
  }
}
