'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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

const categories = ['All', 'Food & Beverages', 'Phones & Tablets', "Men's Wear", 'Electronics', 'Fashion'];
const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Category</h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onChange({ ...filters, category: cat === 'All' ? '' : cat })}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                (cat === 'All' && !filters.category) || filters.category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            className="h-9"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Sort By</h3>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange({ category: '', minPrice: '', maxPrice: '', sort: 'newest' })}
      >
        Reset Filters
      </Button>
    </div>
  );
}

