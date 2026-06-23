'use client';

import { useCartStore } from '@/stores/cartStore';

export function useCart() {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCartStore();

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
}
