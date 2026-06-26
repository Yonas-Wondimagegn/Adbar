'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

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
  image?: string;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-sm">Image</span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product.slug}`} className="flex-1">
            <h3 className="font-medium text-sm line-clamp-1 hover:text-primary">
              {product.name}
            </h3>
          </Link>
          <Badge variant="secondary" className="text-xs">
            {product.category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">by {product.seller.name}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-sm">
            {formatCurrency(product.price, product.currency)}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {product.rating} ({product.reviews})
          </div>
        </div>
        <Link href={`/products/${product.slug}`}>
          <Button variant="outline" size="sm" className="w-full mt-3">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}
