'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Briefcase, Wallet, Shield, Globe, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">Adbar</Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/products" className="text-sm font-medium hover:text-primary">Products</Link>
            <Link href="/jobs" className="text-sm font-medium hover:text-primary">Freelance</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="px-4 py-2 text-sm font-medium">Sign In</button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md">Get Started</button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Adbar</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            The premier Ethiopian digital marketplace. Buy products, hire freelancers, and manage your business — all in one place.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/products">
              <button className="px-8 py-3 text-lg font-medium bg-primary text-primary-foreground rounded-lg">
                Browse Products
              </button>
            </Link>
            <Link href="/register">
              <button className="px-8 py-3 text-lg font-medium border border-input rounded-lg">
                Get Started
              </button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border bg-card p-8 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Digital Products</h3>
              <p className="mt-2 text-muted-foreground">Browse thousands of digital products from verified sellers.</p>
            </div>
            <div className="rounded-xl border bg-card p-8 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Freelance Services</h3>
              <p className="mt-2 text-muted-foreground">Find skilled freelancers or offer your own services.</p>
            </div>
            <div className="rounded-xl border bg-card p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Secure Payments</h3>
              <p className="mt-2 text-muted-foreground">Multi-currency wallet with ETB and AU balance tracking.</p>
            </div>
          </div>
        </section>

        <section className="bg-muted py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Adbar?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <Shield className="h-10 w-10 mx-auto text-primary" />
                <h3 className="mt-4 text-lg font-semibold">Trusted & Verified</h3>
                <p className="mt-2 text-muted-foreground">KYC verification and escrow payments for your safety.</p>
              </div>
              <div className="text-center">
                <Globe className="h-10 w-10 mx-auto text-primary" />
                <h3 className="mt-4 text-lg font-semibold">Multi-Currency</h3>
                <p className="mt-2 text-muted-foreground">Support for ETB, USD, and more with real-time rates.</p>
              </div>
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto text-primary" />
                <h3 className="mt-4 text-lg font-semibold">Community Driven</h3>
                <p className="mt-2 text-muted-foreground">Built for the Ethiopian community, by the community.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Adbar. Ethiopian Digital Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
