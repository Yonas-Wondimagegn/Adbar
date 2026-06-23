'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface Balance {
  currency: string;
  amount: number;
  rate: number;
}

interface AUBalanceCardProps {
  balance: Balance;
}

export function AUBalanceCard({ balance }: AUBalanceCardProps) {
  const auEquivalent = balance.amount / balance.rate;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{balance.currency}</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          AU: {formatCurrency(auEquivalent, 'AU')}
        </span>
      </div>
      <p className="text-2xl font-bold">{formatCurrency(balance.amount, balance.currency)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Rate: 1 AU = {balance.rate} {balance.currency}
      </p>
    </Card>
  );
}
