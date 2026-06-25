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
      const cleanParams: Record<string, string | number> = {};
      if (params.search) cleanParams.search = params.search;
      if (params.category) cleanParams.category = params.category;
      if (params.minPrice) cleanParams.minPrice = params.minPrice;
      if (params.maxPrice) cleanParams.maxPrice = params.maxPrice;
      if (params.page) cleanParams.page = params.page;
      const response = await api.get('/products', { params: cleanParams });
      return response.data.data || response.data;
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get(`/products/${slug}`);
      return response.data.data || response.data;
    },
    enabled: !!slug,
  });
}

