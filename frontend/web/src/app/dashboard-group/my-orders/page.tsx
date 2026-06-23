'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { OrderCard } from '@/components/order/OrderCard';

export default function OrdersPage() {
  const orders = [
    {
      id: 'ORD-001',
      product: 'Premium UI Kit',
      status: 'completed',
      total: 49.99,
      currency: 'USD',
      date: '2024-06-15',
    },
    {
      id: 'ORD-002',
      product: 'Icon Pack Pro',
      status: 'processing',
      total: 29.99,
      currency: 'USD',
      date: '2024-06-18',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">Track your purchase history</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
