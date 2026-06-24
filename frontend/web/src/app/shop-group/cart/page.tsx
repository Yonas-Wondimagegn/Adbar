'use client';

import React from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">
          Add some products to get started.
        </p>
        <Link href="/products">
          <Button className="mt-6">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex items-center gap-4">
              <div className="h-20 w-20 rounded-md bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.price, item.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right w-24">
                <p className="font-medium">
                  {formatCurrency(item.price * item.quantity, item.currency)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>

        <div>
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(total, 'USD')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(total * 0.1, 'USD')}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total * 1.1, 'USD')}</span>
                </div>
              </div>
            </div>
            <Link href="/checkout">
              <Button className="w-full mt-6">Proceed to Checkout</Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full mt-2 text-destructive"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
