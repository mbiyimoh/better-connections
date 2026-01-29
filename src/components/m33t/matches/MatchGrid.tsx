'use client';

import { MatchCard } from './MatchCard';

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

interface MatchGridProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

export function MatchGrid({ matches, onSelectMatch }: MatchGridProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">
          No matches available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {matches.map((match, index) => (
        <MatchCard
          key={match.id}
          match={match}
          onClick={() => onSelectMatch(match)}
          index={index}
        />
      ))}
    </div>
  );
}
