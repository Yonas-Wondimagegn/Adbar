'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: React.ReactNode;
  items: { label: string; onClick?: () => void; href?: string }[];
  className?: string;
}

export function Dropdown({ trigger, items, className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-popover p-1 shadow-md">
            {items.map((item, i) => (
              <div
                key={i}
                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
