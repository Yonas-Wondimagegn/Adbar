'use client';

import React from 'react';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  category: string;
  rating: number;
  reviews: number;
  seller: { name: string };
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
