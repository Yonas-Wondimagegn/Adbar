'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminOrdersPage() {
  const orders = [
    { id: 'ORD-001', buyer: 'Alice', seller: 'Bob', amount: '$49.99', status: 'completed' },
    { id: 'ORD-002', buyer: 'Carol', seller: 'Dave', amount: '$29.99', status: 'disputed' },
    { id: 'ORD-003', buyer: 'Eve', seller: 'Frank', amount: '$99.99', status: 'pending' },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'disputed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage all orders</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium">Order ID</th>
              <th className="text-left p-4 text-sm font-medium">Buyer</th>
              <th className="text-left p-4 text-sm font-medium">Seller</th>
              <th className="text-left p-4 text-sm font-medium">Amount</th>
              <th className="text-left p-4 text-sm font-medium">Status</th>
              <th className="text-right p-4 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-4 text-sm font-medium">{order.id}</td>
                <td className="p-4 text-sm">{order.buyer}</td>
                <td className="p-4 text-sm">{order.seller}</td>
                <td className="p-4 text-sm">{order.amount}</td>
                <td className="p-4">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
