'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'User'}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s an overview of your account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold mt-1">12</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Wallet Balance</p>
          <p className="text-2xl font-bold mt-1">2,450 AU</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Active Jobs</p>
          <p className="text-2xl font-bold mt-1">3</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Proposals Sent</p>
          <p className="text-2xl font-bold mt-1">8</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {['Order #1234 completed', 'Payment received: 150 AU', 'New proposal submitted'].map(
              (item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {item}
                </div>
              )
            )}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/dashboard-group/wallet" className="rounded-lg border p-4 hover:bg-accent text-sm font-medium">
              View Wallet
            </a>
            <a href="/dashboard-group/my-orders" className="rounded-lg border p-4 hover:bg-accent text-sm font-medium">
              Track Orders
            </a>
            <a href="/products" className="rounded-lg border p-4 hover:bg-accent text-sm font-medium">
              Browse Products
            </a>
            <a href="/jobs" className="rounded-lg border p-4 hover:bg-accent text-sm font-medium">
              Find Jobs
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
