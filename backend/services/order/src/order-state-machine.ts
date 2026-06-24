import { $Enums } from '@prisma/client';
type OrderStatus = $Enums.OrderStatus;

/**
 * Order State Machine
 * 
 * Valid transitions:
 * PENDING -> PAID | CANCELLED
 * PAID -> PROCESSING | REFUNDED | CANCELLED
 * PROCESSING -> PACKED | CANCELLED
 * PACKED -> SHIPPED | CANCELLED
 * SHIPPED -> DELIVERED
 * DELIVERED -> RETURNED
 * RETURNED -> REFUNDED
 * CANCELLED -> (terminal)
 * REFUNDED -> (terminal)
 * RETURNED -> (terminal after refund)
 */

export type OrderState = OrderStatus;

export const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
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

