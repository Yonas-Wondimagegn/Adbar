export enum OrderEventTopics {
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_REFUNDED = 'order.refunded',
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  shippingAddress?: Record<string, string>;
}

export interface OrderPaidEvent {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface OrderShippedEvent {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: string;
}

export interface OrderDeliveredEvent {
  orderId: string;
  deliveredAt: string;
  recipientName?: string;
}

export interface OrderCancelledEvent {
  orderId: string;
  reason: string;
  cancelledBy: string;
  refundAmount?: number;
}

export interface OrderRefundedEvent {
  orderId: string;
  refundId: string;
  amount: number;
  reason: string;
}

export type OrderEvents = {
  [OrderEventTopics.ORDER_CREATED]: OrderCreatedEvent;
  [OrderEventTopics.ORDER_PAID]: OrderPaidEvent;
  [OrderEventTopics.ORDER_SHIPPED]: OrderShippedEvent;
  [OrderEventTopics.ORDER_DELIVERED]: OrderDeliveredEvent;
  [OrderEventTopics.ORDER_CANCELLED]: OrderCancelledEvent;
  [OrderEventTopics.ORDER_REFUNDED]: OrderRefundedEvent;
};
