'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [showProposal, setShowProposal] = useState(false);

  const job = {
    id: jobId,
    title: 'Frontend Developer Needed',
    description: 'We are looking for an experienced frontend developer to build a marketplace platform using Next.js and TypeScript. The project involves creating responsive UI components, integrating APIs, and optimizing performance.',
    budget: '$500-$1000',
    duration: '2-3 weeks',
    category: 'Web Development',
    skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS'],
    posted: '2 days ago',
    proposals: 12,
    client: { name: 'TechCorp', rating: 4.9, jobs: 25 },
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="secondary">{job.category}</Badge>
              <span className="text-sm text-muted-foreground">{job.posted}</span>
            </div>
          </div>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Description</h2>
            <p className="text-muted-foreground">{job.description}</p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">{job.budget}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{job.duration}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proposals</p>
                <p className="font-medium">{job.proposals} submitted</p>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={() => setShowProposal(true)}>
              Submit Proposal
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">About Client</h3>
            <p className="font-medium">{job.client.name}</p>
            <p className="text-sm text-muted-foreground">
              {job.client.jobs} jobs posted | Rating: {job.client.rating}★
            </p>
          </Card>
        </div>
      </div>

      <Modal open={showProposal} onClose={() => setShowProposal(false)} title="Submit Proposal">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Proposal Amount</label>
            <input
              type="text"
              placeholder="$"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cover Letter</label>
            <textarea
              rows={4}
              placeholder="Write your proposal..."
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <Button className="w-full">Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
