'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/search/SearchBar';

export default function JobsPage() {
  const [search, setSearch] = useState('');

  const jobs = [
    {
      id: '1',
      title: 'Frontend Developer Needed',
      budget: '$500-$1000',
      category: 'Web Development',
      posted: '2 days ago',
      proposals: 12,
    },
    {
      id: '2',
      title: 'UI/UX Designer for Mobile App',
      budget: '$800-$1500',
      category: 'Design',
      posted: '1 day ago',
      proposals: 8,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Freelance Jobs</h1>
          <p className="text-muted-foreground mt-1">Find your next opportunity</p>
        </div>
        <Button>Post a Job</Button>
      </div>

      <SearchBar
        placeholder="Search jobs..."
        value={search}
        onChange={setSearch}
      />

      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={job.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <a href={`/jobs/${job.id}`} className="text-lg font-semibold hover:text-primary">
                  {job.title}
                </a>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{job.category}</Badge>
                  <span>{job.posted}</span>
                  <span>{job.proposals} proposals</span>
                </div>
              </div>
              <span className="font-semibold text-primary">{job.budget}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
