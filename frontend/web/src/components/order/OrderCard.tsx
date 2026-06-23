'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  product: string;
  status: string;
  total: number;
  currency: string;
  date: string;
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{order.id}</p>
          <p className="text-sm text-muted-foreground">{order.product}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-sm text-muted-foreground">{formatDate(order.date)}</span>
        <span className="font-semibold">{formatCurrency(order.total, order.currency)}</span>
      </div>
    </Card>
  );
}
