'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Heart, ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { addItem } = useCartStore();

  // Mock product data - in real app, fetch by slug
  const product = {
    id: '1',
    name: 'Premium UI Kit',
    slug: 'premium-ui-kit',
    description: 'A comprehensive UI kit with over 500 components for modern web applications. Includes dark and light themes, responsive layouts, and detailed documentation.',
    price: 49.99,
    currency: 'USD',
    category: 'UI Kits',
    seller: { name: 'DesignPro', rating: 4.8 },
    images: ['/placeholder.jpg'],
    rating: 4.7,
    reviews: 128,
    tags: ['UI', 'Components', 'Figma', 'Sketch'],
    features: ['500+ Components', 'Dark & Light Themes', 'Responsive Design', 'Free Updates'],
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: 1,
    });
  };

  return (
    <div className="container py-8">
      <Link
        href="/products"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Product Image
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Badge>{product.category}</Badge>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{product.rating}</span>
              <span className="text-muted-foreground">({product.reviews} reviews)</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            by {product.seller.name} (★ {product.seller.rating})
          </p>

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="grid grid-cols-2 gap-2">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {formatCurrency(product.price, product.currency)}
              </span>
            </div>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
