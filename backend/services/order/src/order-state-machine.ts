import { $Enums } from '@prisma/client';
export type OrderState = $Enums.OrderStatus;

export const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  'PENDING': ['PAID', 'CANCELLED'],
  'PAID': ['PROCESSING', 'REFUNDED', 'CANCELLED'],
  'PROCESSING': ['PACKED', 'CANCELLED'],
  'PACKED': ['SHIPPED', 'CANCELLED'],
  'SHIPPED': ['DELIVERED'],
  'DELIVERED': ['RETURNED'],
  'RETURNED': ['REFUNDED'],
  'REFUNDED': [],
  'CANCELLED': [],
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  const allowedTransitions = ORDER_TRANSITIONS[from];
  if (!allowedTransitions) return false;
  return allowedTransitions.includes(to);
}

export function getAllowedTransitions(from: OrderState): OrderState[] {
  return ORDER_TRANSITIONS[from] || [];
}

export function isTerminalState(state: OrderState): boolean {
  return ORDER_TRANSITIONS[state]?.length === 0;
}
