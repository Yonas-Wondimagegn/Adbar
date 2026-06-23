'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminKYCPage() {
  const submissions = [
    { id: '1', user: 'Alice Johnson', document: 'ID Card', status: 'pending', submitted: '2 days ago' },
    { id: '2', user: 'Bob Smith', document: 'Passport', status: 'pending', submitted: '1 week ago' },
    { id: '3', user: 'Carol White', document: 'Driver License', status: 'approved', submitted: '3 days ago' },
    { id: '4', user: 'David Kim', document: 'National ID', status: 'rejected', submitted: '5 days ago' },
    { id: '5', user: 'Eva Martinez', document: 'Passport', status: 'pending', submitted: '1 day ago' },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KYC Verification</h1>
          <p className="text-muted-foreground mt-1">Review and approve identity verifications</p>
        </div>
        <Badge variant="secondary">{pendingCount} pending review</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Approved Today</p>
          <p className="text-2xl font-bold text-green-600">5</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Rejected Today</p>
          <p className="text-2xl font-bold text-red-600">1</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Submissions Queue</h2>
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{sub.user}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{sub.document}</span>
                  <span>·</span>
                  <span>{sub.submitted}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                {sub.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Reject</Button>
                    <Button size="sm">Approve</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
