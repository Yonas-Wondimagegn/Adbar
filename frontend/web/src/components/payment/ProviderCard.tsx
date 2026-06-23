'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
}

interface ProviderCardProps {
  provider: Provider;
  selected?: boolean;
  onSelect?: () => void;
}

export function ProviderCard({ provider, selected, onSelect }: ProviderCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        selected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-lg">
          {provider.icon}
        </div>
        <div>
          <p className="font-medium text-sm">{provider.name}</p>
          <p className="text-xs text-muted-foreground">{provider.description}</p>
        </div>
      </div>
    </Card>
  );
}
