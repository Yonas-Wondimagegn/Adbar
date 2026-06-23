export enum PaymentEventTopics {
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_PENDING = 'payment.pending',
}

export interface PaymentInitiatedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  provider: string;
}

export interface PaymentSuccessEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
  provider: string;
  paidAt: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  errorCode: string;
  errorMessage: string;
  provider: string;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  refundId: string;
  amount: number;
  reason: string;
}

export interface PaymentPendingEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: string;
  expiresAt?: string;
}

export type PaymentEvents = {
  [PaymentEventTopics.PAYMENT_INITIATED]: PaymentInitiatedEvent;
  [PaymentEventTopics.PAYMENT_SUCCESS]: PaymentSuccessEvent;
  [PaymentEventTopics.PAYMENT_FAILED]: PaymentFailedEvent;
  [PaymentEventTopics.PAYMENT_REFUNDED]: PaymentRefundedEvent;
  [PaymentEventTopics.PAYMENT_PENDING]: PaymentPendingEvent;
};
