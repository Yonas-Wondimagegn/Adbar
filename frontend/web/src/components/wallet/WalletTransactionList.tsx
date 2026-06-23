'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: string;
}

interface WalletTransactionListProps {
  transactions?: Transaction[];
}

export function WalletTransactionList({ transactions }: WalletTransactionListProps) {
  const defaultTransactions: Transaction[] = [
    {
      id: '1',
      type: 'credit',
      amount: 500,
      currency: 'USD',
      description: 'Order payment received',
      date: '2024-06-20',
      status: 'completed',
    },
    {
      id: '2',
      type: 'debit',
      amount: 150,
      currency: 'USD',
      description: 'Withdrawal to bank',
      date: '2024-06-18',
      status: 'completed',
    },
    {
      id: '3',
      type: 'credit',
      amount: 75,
      currency: 'USD',
      description: 'Refund - Order #1234',
      date: '2024-06-15',
      status: 'completed',
    },
  ];

  const items = transactions || defaultTransactions;

  return (
    <div className="divide-y">
      {items.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {tx.type === 'credit' ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{tx.description}</p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
            </div>
          </div>
          <span
            className={`font-semibold text-sm ${
              tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {tx.type === 'credit' ? '+' : '-'}
            {formatCurrency(tx.amount, tx.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
