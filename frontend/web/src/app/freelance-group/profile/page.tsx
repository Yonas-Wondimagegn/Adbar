'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function FreelanceProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  const profile = {
    name: 'John Developer',
    title: 'Full Stack Developer',
    bio: 'Experienced developer with 5+ years in web technologies. Specialized in React, Node.js, and TypeScript.',
    skills: ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL'],
    hourlyRate: '$45/hr',
    rating: 4.8,
    completedJobs: 32,
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <Input defaultValue={profile.name} placeholder="Full Name" />
                <Input defaultValue={profile.title} placeholder="Title" />
                <textarea
                  defaultValue={profile.bio}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Bio"
                />
                <Input defaultValue={profile.hourlyRate} placeholder="Hourly Rate" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.title}</p>
                <p className="mt-3">{profile.bio}</p>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <p className="text-2xl font-bold">{profile.rating}★</p>
          <p className="text-sm text-muted-foreground">Rating</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl font-bold">{profile.completedJobs}</p>
          <p className="text-sm text-muted-foreground">Completed Jobs</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl font-bold">{profile.hourlyRate}</p>
          <p className="text-sm text-muted-foreground">Hourly Rate</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <Badge key={skill} variant="secondary">{skill}</Badge>
          ))}
        </div>
      </Card>

      {isEditing && (
        <Button className="w-full">Save Changes</Button>
      )}
    </div>
  );
}
