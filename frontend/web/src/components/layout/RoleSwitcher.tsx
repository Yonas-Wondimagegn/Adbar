'use client';

import React from 'react';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';

const roleLabels: Record<UserRole, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  CLIENT: 'Client',
  FREELANCER: 'Freelancer',
  MODERATOR: 'Moderator',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  ADMIN: 'Admin',
};

export function RoleSwitcher() {
  const { user, setActiveRole } = useAuthStore();

  if (!user || user.roles.length <= 1) {
    return null;
  }

  const items = user.roles.map((role) => ({
    label: roleLabels[role],
    onClick: () => setActiveRole(role),
  }));

  return (
    <Dropdown
      trigger={<Button variant="outline" size="sm">{roleLabels[user.activeRole]} ▾</Button>}
      items={items}
    />
  );
}
