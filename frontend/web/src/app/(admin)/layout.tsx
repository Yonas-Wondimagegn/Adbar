'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-64 border-r bg-muted/50 min-h-screen p-6">
          <h2 className="text-lg font-bold mb-6 text-primary">Admin Panel</h2>
          <nav className="space-y-2 flex-1">
            <a href="/admin" className="block px-3 py-2 rounded-md text-sm hover:bg-accent font-medium">
              Dashboard
            </a>
            <a href="/admin/users" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Users
            </a>
            <a href="/admin/orders" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Orders
            </a>
            <a href="/admin/payments" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              Payments
            </a>
            <a href="/admin/kyc" className="block px-3 py-2 rounded-md text-sm hover:bg-accent">
              KYC Verification
            </a>
          </nav>
        </aside>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
