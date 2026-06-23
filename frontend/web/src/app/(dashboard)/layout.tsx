'use client';

import React from 'react';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="border-b px-6 py-3 flex items-center justify-between bg-muted/30">
            <div>
              <p className="text-sm text-muted-foreground">
                Logged in as <span className="font-medium text-foreground">{user.name}</span>
              </p>
            </div>
            {user.roles.length > 1 && <RoleSwitcher />}
          </header>
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
