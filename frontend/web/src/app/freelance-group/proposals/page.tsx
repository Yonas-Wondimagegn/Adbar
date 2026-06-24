'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ProposalsPage() {
  const proposals = [
    {
      id: '1',
      jobTitle: 'Frontend Developer Needed',
      amount: '$750',
      status: 'pending',
      submitted: '2 days ago',
    },
    {
      id: '2',
      jobTitle: 'UI/UX Designer for Mobile App',
      amount: '$1200',
      status: 'accepted',
      submitted: '5 days ago',
    },
    {
      id: '3',
      jobTitle: 'Backend API Development',
      amount: '$900',
      status: 'rejected',
      submitted: '1 week ago',
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Proposals</h1>
          <p className="text-muted-foreground mt-1">Track your submitted proposals</p>
        </div>
      </div>

      <div className="space-y-4">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{proposal.jobTitle}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span>{proposal.amount}</span>
                  <span>{proposal.submitted}</span>
                </div>
              </div>
              <Badge variant={statusVariant(proposal.status)}>
                {proposal.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
