'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewRsvpCard } from './NewRsvpCard';
import { ProfileModal } from '@/app/m33t/[slug]/components/ProfileModal';
import type { PublicAttendee } from '@/app/m33t/[slug]/types';

interface NewRsvpsResponse {
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
  };
  viewer: {
    id: string;
    name: string;
    rsvpRespondedAt: string;
  };
  newAttendees: Array<PublicAttendee & { rsvpRespondedAt: string }>;
  totalCount: number;
}

interface NewRsvpsPageClientProps {
  slug: string;
  token: string;
}

export function NewRsvpsPageClient({ slug, token }: NewRsvpsPageClientProps) {
  const [data, setData] = useState<NewRsvpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<(PublicAttendee & { rsvpRespondedAt: string }) | null>(null);

  useEffect(() => {
    fetch(`/api/public/events/${slug}/new-rsvps?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
          <p className="text-zinc-400">Unable to load new RSVPs. Please try again later.</p>
        </div>
      </div>
    );
  }

  // API already returns proper PublicAttendee fields
  const attendeesWithDefaults = data.newAttendees;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/m33t/${slug}?token=${token}`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {data.event.name}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-white">
              {data.totalCount} New {data.totalCount === 1 ? 'Person' : 'People'} Since You RSVP&apos;d
            </h1>
            <p className="text-zinc-400">for {data.event.name}</p>
          </div>

          {/* Attendee grid */}
          {data.totalCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">No new RSVPs yet. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
              {attendeesWithDefaults.map((attendee) => (
                <NewRsvpCard
                  key={attendee.id}
                  attendee={attendee}
                  onClick={() => setSelectedAttendee(attendee)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Profile modal */}
      {selectedAttendee && (
        <ProfileModal
          attendee={selectedAttendee}
          onClose={() => setSelectedAttendee(null)}
        />
      )}
    </div>
  );
}
