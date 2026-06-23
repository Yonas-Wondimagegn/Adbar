'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface WalletData {
  balances: Array<{
    currency: string;
    amount: number;
    rate: number;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    status: string;
  }>;
}

export function useWallet() {
  return useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.get('/wallet');
      return response.data;
    },
  });
}
