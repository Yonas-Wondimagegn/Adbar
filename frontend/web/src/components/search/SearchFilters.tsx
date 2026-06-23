'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SearchFiltersProps {
  filters: {
    query: string;
    category: string;
    minBudget: string;
    maxBudget: string;
  };
  onChange: (filters: any) => void;
}

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold text-sm">Filters</h3>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          <option value="development">Development</option>
          <option value="design">Design</option>
          <option value="marketing">Marketing</option>
          <option value="writing">Writing</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Budget Range</label>
        <div className="flex gap-2 mt-1">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minBudget}
            onChange={(e) => onChange({ ...filters, minBudget: e.target.value })}
            className="h-9"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxBudget}
            onChange={(e) => onChange({ ...filters, maxBudget: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange({ query: '', category: '', minBudget: '', maxBudget: '' })}
      >
        Clear Filters
      </Button>
    </div>
  );
}
