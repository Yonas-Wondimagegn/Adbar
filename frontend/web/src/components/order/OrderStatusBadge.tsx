'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface OrderStatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge
      className={statusColors[status] || 'bg-gray-100 text-gray-800'}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
