'use client';

import React, { useState } from 'react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters } from '@/components/product/ProductFilters';
import { SearchBar } from '@/components/search/SearchBar';
import { useProducts } from '@/hooks/useProducts';

export default function ProductsPage() {
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useProducts({ ...filters, search });

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">
              Browse our collection of digital products
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 shrink-0">
            <ProductFilters filters={filters} onChange={setFilters} />
          </aside>

          <main className="flex-1">
            <div className="mb-6">
              <SearchBar
                placeholder="Search products..."
                value={search}
                onChange={setSearch}
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-lg border p-4 animate-pulse">
                    <div className="aspect-video bg-muted rounded-md mb-4" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Failed to load products. Please try again.
              </div>
            ) : (
              <ProductGrid products={( Array.isArray(data) ? data : (data?.data || []) ).map((p: any) => ({ ...p, category: p.category?.name || p.category || '', seller: p.store || { name: 'Unknown' }, rating: parseFloat(p.averageRating) || 0, reviews: p.reviewCount || 0, price: parseFloat(p.price) || 0 }))} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


