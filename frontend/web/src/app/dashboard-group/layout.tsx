'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Button } from '@/components/ui/Button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/auth-group/login');
  };

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
            <div className="flex items-center gap-3">
              {user.roles.length > 1 && <RoleSwitcher />}
              <Button variant="ghost" size="sm" onClick={handleLogout} title="Log out">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
