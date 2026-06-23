'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ProductQueryParams {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: number;
}

export function useProducts(params: ProductQueryParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await api.get('/products', { params });
      return response.data;
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get(`/products/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
}
