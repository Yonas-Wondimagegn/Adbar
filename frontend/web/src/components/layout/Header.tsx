'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            Adbar
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/products"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname?.startsWith('/products') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Products
            </Link>
            <Link
              href="/jobs"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname?.startsWith('/jobs') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Freelance
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingBag className="h-5 w-5" />
            </Button>
          </Link>
          {user ? (
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t p-4">
          <nav className="flex flex-col gap-2">
            <Link href="/products" className="px-3 py-2 rounded-md hover:bg-accent" onClick={() => setMobileOpen(false)}>
              Products
            </Link>
            <Link href="/jobs" className="px-3 py-2 rounded-md hover:bg-accent" onClick={() => setMobileOpen(false)}>
              Freelance
            </Link>
            <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-accent" onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
