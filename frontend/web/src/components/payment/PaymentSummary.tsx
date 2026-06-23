'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface PaymentSummaryProps {
  subtotal: number;
  currency: string;
  tax?: number;
  discount?: number;
}

export function PaymentSummary({ subtotal, currency, tax = 0, discount = 0 }: PaymentSummaryProps) {
  const total = subtotal + tax - discount;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Payment Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(tax, currency)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(discount, currency)}</span>
          </div>
        )}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
