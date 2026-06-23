/**
 * Payment Provider Interface
 * All payment provider adapters must implement this interface
 */

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  userId: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  checkoutUrl?: string;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: string;
  amount: number;
  currency: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  provider: string;
  eventType: string;
  reference: string;
  transactionId?: string;
  status: string;
  amount?: number;
  currency?: string;
  signature?: string;
  raw: Record<string, any>;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
}

export interface PayoutRequest {
  amount: number;
  currency: string;
  recipientAccount: string;
  recipientName: string;
  reference?: string;
}

export interface PayoutResponse {
  success: boolean;
  payoutId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly displayName: string;

  /**
   * Initialize a payment and return checkout URL or reference
   */
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Verify a payment by transaction reference
   */
  verifyPayment(reference: string): Promise<PaymentResponse>;

  /**
   * Handle incoming webhook from provider
   */
  handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Record<string, any>, signature: string): boolean;

  /**
   * Process a refund
   */
  refund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Process a payout/withdrawal
   */
  payout?(request: PayoutRequest): Promise<PayoutResponse>;

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[];

  /**
   * Check if provider supports a currency
   */
  supportsCurrency(currency: string): boolean;
}
