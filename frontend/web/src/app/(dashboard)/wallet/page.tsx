'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WalletTransactionList } from '@/components/wallet/WalletTransactionList';
import { formatCurrency } from '@/lib/utils';

interface AUBalance {
  currency: string;
  flag: string;
  balance: number;
}

export default function WalletPage() {
  const balances: AUBalance[] = [
    { currency: 'AU-ETB', flag: '🇪🇹', balance: 12500.00 },
    { currency: 'AU-USD', flag: '🇺🇸', balance: 3250.75 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your AU wallet balances</p>
        </div>
        <Button variant="outline">Deposit</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {balances.map((bal) => (
          <Card key={bal.currency} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{bal.flag}</span>
                <div>
                  <p className="font-semibold text-lg">{bal.currency}</p>
                  <p className="text-sm text-muted-foreground">AU Wallet</p>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold mb-4">
              {formatCurrency(bal.balance, bal.currency.split('-')[1])}
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Withdraw {bal.currency}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        <WalletTransactionList />
      </Card>
    </div>
  );
}
