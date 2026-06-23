'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

interface CheckoutFormData {
  address: string;
  city: string;
  country: string;
  zipCode: string;
  paymentMethod: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>();

  const onSubmit = async (data: CheckoutFormData) => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    clearCart();
    router.push('/dashboard/orders');
  };

  if (!mounted) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    placeholder="123 Main Street"
                    {...register('address', { required: 'Address is required' })}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    placeholder="New York"
                    {...register('city', { required: 'City is required' })}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    placeholder="United States"
                    {...register('country', { required: 'Country is required' })}
                  />
                  {errors.country && (
                    <p className="text-xs text-destructive mt-1">{errors.country.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">ZIP Code</label>
                  <Input
                    placeholder="10001"
                    {...register('zipCode', { required: 'ZIP code is required' })}
                  />
                  {errors.zipCode && (
                    <p className="text-xs text-destructive mt-1">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                  <input
                    type="radio"
                    value="wallet"
                    {...register('paymentMethod', { required: 'Select a payment method' })}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">Wallet Balance (AU)</p>
                    <p className="text-sm text-muted-foreground">Pay with your AU wallet</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                  <input
                    type="radio"
                    value="card"
                    {...register('paymentMethod', { required: 'Select a payment method' })}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">Pay with your card</p>
                  </div>
                </label>
              </div>
              {errors.paymentMethod && (
                <p className="text-xs text-destructive mt-2">{errors.paymentMethod.message}</p>
              )}
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="shrink-0">
                      {formatCurrency(item.price * item.quantity, item.currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(total, 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span>{formatCurrency(total * 0.1, 'USD')}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total * 1.1, 'USD')}</span>
                </div>
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Place Order'}
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
