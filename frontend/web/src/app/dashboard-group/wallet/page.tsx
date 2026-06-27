'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface AUBalance {
  currency: string;
  type: string;
  balance: number;
  pendingBalance?: number;
  auLabel: string;
}

interface PaymentProvider {
  name: string;
  displayName: string;
  supportedCurrencies: string[];
  logoUrl?: string;
}

export default function WalletPage() {
  const { token } = useAuthStore();
  const [balances, setBalances] = useState<AUBalance[]>([]);
  const [providers, setProviders] = useState<{ ETB: PaymentProvider[]; USD: PaymentProvider[] }>({ ETB: [], USD: [] });
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpCurrency, setTopUpCurrency] = useState('ETB');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpResult, setTopUpResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    Promise.all([
      api.get('/wallet'),
      api.get('/payments/providers?currency=ETB'),
      api.get('/payments/providers?currency=USD'),
    ]).then(([walletRes, etbRes, usdRes]) => {
      const data = walletRes.data?.data || walletRes.data;
      const bal = data?.balances || [];
      setBalances(bal);
      setProviders({
        ETB: etbRes.data?.data || etbRes.data || [],
        USD: usdRes.data?.data || usdRes.data || [],
      });
    }).catch(() => setError('Failed to load wallet'))
      .finally(() => setLoading(false));
  }, [token]);

  const currentProviders = topUpCurrency === 'ETB' ? providers.ETB : providers.USD;

  const handleTopUp = async () => {
    if (!topUpAmount || !selectedProvider) return;
    setTopUpLoading(true);
    setTopUpResult(null);
    try {
      const res = await api.post('/payments/initiate', {
        amount: parseFloat(topUpAmount),
        currency: topUpCurrency,
        providerId: selectedProvider,
        type: 'WALLET_TOPUP',
      });
      const result = res.data?.data || res.data;
      setTopUpResult(result);
      if (result?.checkoutUrl || result?.paymentUrl) {
        window.open(result.checkoutUrl || result.paymentUrl, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setTopUpLoading(false);
    }
  };

  const availableBalances = balances.filter((b: any) => b.type === 'AVAILABLE' || !b.type);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading wallet...</div>;

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
      <p className="text-muted-foreground mb-8">Adbar Unit (AU) — currency-tagged balances</p>

      {error && <div className="text-destructive mb-4 p-3 rounded bg-destructive/10">{error}</div>}

      {/* AU Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {availableBalances.length === 0 ? (
          <Card className="p-6 col-span-2 text-center text-muted-foreground">
            No balances yet. Top up your wallet to get started.
          </Card>
        ) : (
          availableBalances.map((bal: AUBalance, i: number) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {bal.auLabel || `AU-${bal.currency}`}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {bal.currency}
                </span>
              </div>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(bal.balance, bal.currency)}
              </p>
              {bal.pendingBalance != null && bal.pendingBalance > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  + {formatCurrency(bal.pendingBalance, bal.currency)} pending
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Top Up Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Top Up Wallet</h2>

        {/* Currency Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Select Currency</label>
          <div className="flex gap-3">
            {['ETB', 'USD'].map((cur) => (
              <button
                key={cur}
                onClick={() => { setTopUpCurrency(cur); setSelectedProvider(''); }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  topUpCurrency === cur
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {cur === 'ETB' ? '???? ETB' : '?? USD'}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Provider Cards */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Select Payment Method</label>
          {currentProviders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment providers available for {topUpCurrency}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => setSelectedProvider(provider.name)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedProvider === provider.name
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">{provider.displayName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {provider.supportedCurrencies?.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Amount ({topUpCurrency})</label>
          <input
            type="number"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder={`Enter amount in ${topUpCurrency}`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            min="1"
          />
        </div>

        <Button
          onClick={handleTopUp}
          disabled={!topUpAmount || !selectedProvider || topUpLoading}
          className="w-full"
        >
          {topUpLoading ? 'Processing...' : `Pay with ${selectedProvider || '...'}`}
        </Button>

        {topUpResult && (
          <div className="mt-4 p-3 rounded bg-green-50 text-green-800 text-sm">
            <p className="font-medium">Payment initiated!</p>
            {topUpResult.checkoutUrl && (
              <a href={topUpResult.checkoutUrl} target="_blank" rel="noopener noreferrer"
                className="underline mt-1 block">
                Complete payment ?
              </a>
            )}
            {topUpResult.reference && <p className="mt-1">Reference: {topUpResult.reference}</p>}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Transaction History', href: '/dashboard-group/wallet/transactions' },
          { label: 'Withdraw Funds', href: '/dashboard-group/wallet/withdraw' },
          { label: 'My Orders', href: '/dashboard-group/my-orders' },
          { label: 'Browse Products', href: '/shop-group/products' },
        ].map((action) => (
          <a key={action.label} href={action.href}
            className="p-3 rounded-lg border text-sm font-medium text-center hover:bg-muted transition-colors">
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}
