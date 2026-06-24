'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminPaymentsPage() {
  const payments = [
    { id: 'PAY-001', from: 'Alice', to: 'Bob', amount: '$49.99', method: 'wallet', status: 'completed' },
    { id: 'PAY-002', from: 'Carol', to: 'Dave', amount: '$29.99', method: 'card', status: 'completed' },
    { id: 'PAY-003', from: 'Eve', to: 'Frank', amount: '$99.99', method: 'wallet', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Track all payment transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold mt-1">$48,250</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Pending Payouts</p>
          <p className="text-2xl font-bold mt-1">$2,340</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold mt-1">$12,800</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium">Payment ID</th>
              <th className="text-left p-4 text-sm font-medium">From</th>
              <th className="text-left p-4 text-sm font-medium">To</th>
              <th className="text-left p-4 text-sm font-medium">Amount</th>
              <th className="text-left p-4 text-sm font-medium">Method</th>
              <th className="text-left p-4 text-sm font-medium">Status</th>
              <th className="text-right p-4 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="p-4 text-sm font-medium">{payment.id}</td>
                <td className="p-4 text-sm">{payment.from}</td>
                <td className="p-4 text-sm">{payment.to}</td>
                <td className="p-4 text-sm">{payment.amount}</td>
                <td className="p-4"><Badge variant="secondary">{payment.method}</Badge></td>
                <td className="p-4">
                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                    {payment.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm">Details</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
