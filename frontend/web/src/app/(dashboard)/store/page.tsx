'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function StorePage() {
  const storeItems = [
    { id: '1', name: 'My UI Kit', sales: 45, revenue: 2250, status: 'active' },
    { id: '2', name: 'Icon Collection', sales: 23, revenue: 690, status: 'active' },
    { id: '3', name: 'Template Pack', sales: 0, revenue: 0, status: 'draft' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Store</h1>
          <p className="text-muted-foreground mt-1">Manage your products and listings</p>
        </div>
        <Button>Add Product</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">$2,940</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold mt-1">68</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Active Listings</p>
          <p className="text-2xl font-bold mt-1">2</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Products</h2>
        <div className="divide-y">
          {storeItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.sales} sales</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">${item.revenue}</span>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
