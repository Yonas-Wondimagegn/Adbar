'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminOnboardingPage() {
  const queue = [
    { id: '1', name: 'TechCorp Ltd', type: 'Seller', step: 'Document Review', waiting: '2 days' },
    { id: '2', name: 'Jane Doe', type: 'Freelancer', step: 'Identity Verification', waiting: '1 day' },
    { id: '3', name: 'Acme Inc', type: 'Seller', step: 'Payment Setup', waiting: '3 hours' },
    { id: '4', name: 'John Smith', type: 'Freelancer', step: 'Skills Assessment', waiting: '5 days' },
    { id: '5', name: 'Global Trade Co', type: 'Seller', step: 'Compliance Check', waiting: '1 week' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Queue</h1>
          <p className="text-muted-foreground mt-1">Users awaiting account activation</p>
        </div>
        <Badge variant="secondary">{queue.length} in queue</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Sellers Pending</p>
          <p className="text-2xl font-bold">3</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Freelancers Pending</p>
          <p className="text-2xl font-bold">2</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg. Wait Time</p>
          <p className="text-2xl font-bold">2.8 days</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Queue</h2>
        <div className="space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <Badge variant="outline">{item.type}</Badge>
                  <span>Step: {item.step}</span>
                  <span>·</span>
                  <span>Waiting {item.waiting}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Skip</Button>
                <Button size="sm">Process</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
