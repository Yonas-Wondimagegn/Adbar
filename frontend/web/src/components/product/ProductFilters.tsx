'use client';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface Filters {
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
}

interface ProductFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

interface Category {
  id: string;
  name: string;
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get('/categories').then(res => {
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {
      setCategories([
        { id: '', name: 'All' },
      ]);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-medium text-sm mb-3">Category</h3>
        <div className="space-y-1">
          <button
            onClick={() => onChange({ ...filters, category: '' })}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.category === ''
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange({ ...filters, category: cat.id })}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.category === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-medium text-sm mb-3">Price Range</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
          />
          <Input
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          />
        </div>
      </div>
      <div>
        <h3 className="font-medium text-sm mb-3">Sort By</h3>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onChange({ category: '', minPrice: '', maxPrice: '', sort: 'newest' })}
      >
        Reset Filters
      </Button>
    </div>
  );
}

