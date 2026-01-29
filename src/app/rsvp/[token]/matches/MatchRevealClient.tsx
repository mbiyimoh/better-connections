'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MatchRevealIntro,
  MatchComingSoon,
  MatchGrid,
  MatchDetailModal,
} from '@/components/m33t/matches';

interface Match {
  id: string;
  position: number;
  matchedWith: {
    id: string;
    firstName: string;
    lastName: string | null;
    profile: {
      role: string | null;
      company: string | null;
      location: string | null;
      photoUrl: string | null;
    };
    tradingCard: {
      currentFocus: string | null;
      seeking: string | null;
      offering: string | null;
      expertise: string[];
    };
  };
  whyMatch: string[];
  conversationStarters: string[];
}

type ViewState = 'loading' | 'intro' | 'coming_soon' | 'grid' | 'empty' | 'error';

interface MatchesResponse {
  status: 'ready' | 'coming_soon';
  event: {
    id: string;
    name: string;
    date: string;
    venueName?: string;
  };
  attendee: {
    id: string;
    firstName: string;
  };
  // For "ready" status
  matches?: Match[];
  isFirstView?: boolean;
  totalMatches?: number;
  // For "coming_soon" status
  message?: string;
  revealTiming?: 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE';
  estimatedRevealDate?: string | null;
}

interface MatchRevealClientProps {
  token: string;
}

export function MatchRevealClient({ token }: MatchRevealClientProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch(`/api/rsvp/${token}/matches`);

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load matches');
          setViewState('error');
          return;
        }

        const result: MatchesResponse = await response.json();
        setData(result);

        if (result.status === 'coming_soon') {
          setViewState('coming_soon');
        } else if (result.matches?.length === 0) {
          setViewState('empty');
        } else if (result.isFirstView) {
          setViewState('intro');
        } else {
          setViewState('grid');
        }
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('An unexpected error occurred');
        setViewState('error');
      }
    }

    fetchMatches();
  }, [token]);

  // Loading state
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  // Error state
  if (viewState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Unable to Load Matches
          </h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  // Coming soon state
  if (viewState === 'coming_soon' && data) {
    return (
      <MatchComingSoon
        eventName={data.event.name}
        revealTiming={data.revealTiming!}
        estimatedRevealDate={data.estimatedRevealDate || null}
        rsvpToken={token}
      />
    );
  }

  // Empty state (no matches yet)
  if (viewState === 'empty' && data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-text-tertiary mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            No Matches Yet
          </h1>
          <p className="text-text-secondary mb-8">
            We&apos;re still curating your perfect connections for {data.event.name}.
            Check back soon!
          </p>
          <Link href={`/rsvp/${token}`}>
            <Button variant="outline">
              Back to Event Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Intro state (first view)
  if (viewState === 'intro' && data) {
    return (
      <MatchRevealIntro
        eventName={data.event.name}
        matchCount={data.totalMatches!}
        onContinue={() => setViewState('grid')}
      />
    );
  }

  // Grid state
  if (viewState === 'grid' && data?.matches) {
    return (
      <div className="min-h-screen bg-bg-primary">
        {/* Header */}
        <header className="border-b border-border py-6 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-text-primary">
              Your Matches for {data.event.name}
            </h1>
            <p className="text-text-secondary mt-1">
              {data.totalMatches} curated connection{data.totalMatches !== 1 ? 's' : ''}
            </p>
          </div>
        </header>

        {/* Match Grid */}
        <main className="py-8 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <MatchGrid
              matches={data.matches}
              onSelectMatch={setSelectedMatch}
            />
          </div>
        </main>

        {/* Detail Modal */}
        <MatchDetailModal
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      </div>
    );
  }

  return null;
}
