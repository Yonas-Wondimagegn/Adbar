'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');

  const users = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'user', status: 'active' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'seller', status: 'active' },
    { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'user', status: 'suspended' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage platform users</p>
        </div>
      </div>

      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium">Name</th>
              <th className="text-left p-4 text-sm font-medium">Email</th>
              <th className="text-left p-4 text-sm font-medium">Role</th>
              <th className="text-left p-4 text-sm font-medium">Status</th>
              <th className="text-right p-4 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-4 text-sm font-medium">{user.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                <td className="p-4"><Badge variant="secondary">{user.role}</Badge></td>
                <td className="p-4">
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
