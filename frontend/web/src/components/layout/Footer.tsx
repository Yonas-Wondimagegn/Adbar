import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg text-primary">Adbar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The premier marketplace for digital products and freelance services.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary">Products</Link></li>
              <li><Link href="/jobs" className="hover:text-primary">Freelance Jobs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/dashboard-group" className="hover:text-primary">Dashboard</Link></li>
              <li><Link href="/dashboard-group/wallet" className="hover:text-primary">Wallet</Link></li>
              <li><Link href="/dashboard-group/my-orders" className="hover:text-primary">Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">Help Center</a></li>
              <li><a href="#" className="hover:text-primary">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Adbar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
