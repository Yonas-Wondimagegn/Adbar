'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Store,
  Briefcase,
  FileText,
  Shield,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, type UserRole } from '@/stores/authStore';

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { href: '/dashboard-group', icon: LayoutDashboard, label: 'Dashboard', roles: ['BUYER', 'SELLER', 'CLIENT', 'FREELANCER', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'] },
  { href: '/dashboard-group/my-orders', icon: ShoppingBag, label: 'Orders', roles: ['BUYER', 'SELLER', 'CLIENT', 'FREELANCER', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'] },
  { href: '/dashboard-group/wallet', icon: Wallet, label: 'Wallet', roles: ['BUYER', 'SELLER', 'CLIENT', 'FREELANCER', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'] },
  { href: '/dashboard-group/store', icon: Store, label: 'Store', roles: ['SELLER', 'ADMIN'] },
  { href: '/shop-group/products', icon: ClipboardList, label: 'Products', roles: ['SELLER', 'BUYER', 'MODERATOR', 'ADMIN'] },
  { href: '/freelance-group/jobs', icon: Briefcase, label: 'Jobs', roles: ['FREELANCER', 'CLIENT', 'ADMIN'] },
  { href: '/freelance-group/proposals', icon: FileText, label: 'Proposals', roles: ['FREELANCER', 'CLIENT', 'ADMIN'] },
  { href: '/dashboard-group/contracts', icon: FileText, label: 'Contracts', roles: ['FREELANCER', 'CLIENT', 'ADMIN'] },
  { href: '/freelance-group/profile', icon: User, label: 'Profile', roles: ['BUYER', 'SELLER', 'CLIENT', 'FREELANCER', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'] },
  { href: '/admin-group', icon: Shield, label: 'Admin', roles: ['ADMIN'] },
  { href: '/admin-group/kyc', icon: Shield, label: 'KYC Review', roles: ['COMPLIANCE_OFFICER', 'ADMIN'] },
  { href: '/admin-group/reports', icon: ClipboardList, label: 'Reports', roles: ['MODERATOR', 'ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const activeRole = user?.activeRole ?? 'BUYER';

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(activeRole)
  );

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-muted/50 min-h-screen p-4 transition-all',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between mb-6">
        {!collapsed && <h2 className="text-lg font-semibold">Menu</h2>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-2 flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Role: <span className="font-medium text-foreground">{activeRole}</span>
          </p>
        </div>
      )}
    </aside>
  );
}
