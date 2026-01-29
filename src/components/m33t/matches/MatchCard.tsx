'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    position: number;
    matchedWith: {
      firstName: string;
      lastName: string | null;
      profile: {
        role: string | null;
        company: string | null;
        location: string | null;
        photoUrl: string | null;
      };
      tradingCard: {
        seeking: string | null;
        offering: string | null;
      };
    };
    whyMatch: string[];
  };
  onClick: () => void;
  index: number;
}

export function MatchCard({ match, onClick, index }: MatchCardProps) {
  const { matchedWith, whyMatch, position } = match;
  const { firstName, lastName, profile, tradingCard } = matchedWith;

  // Build headline: "Role at Company" or just role or just company
  const headline = profile.role && profile.company
    ? `${profile.role} at ${profile.company}`
    : profile.role || profile.company || null;

  // Get initials for avatar
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';

  // Truncate text helper
  const truncate = (text: string | null, maxLength: number) => {
    if (!text) return null;
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Card
        onClick={onClick}
        className="p-5 bg-bg-secondary border-border hover:border-gold-primary transition-all cursor-pointer group relative"
      >
        {/* Position Badge */}
        <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gold-primary flex items-center justify-center text-sm font-bold text-bg-primary z-10">
          {position}
        </div>

        {/* Header: Avatar + Name/Headline */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gold-subtle flex items-center justify-center text-xl font-bold text-gold-primary flex-shrink-0 overflow-hidden">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={firstName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* Name + Headline */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {firstName} {lastName}
            </h3>
            {headline && (
              <p className="text-sm text-text-secondary truncate">{headline}</p>
            )}
            {profile.location && (
              <p className="text-xs text-text-tertiary flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Why Match Teaser */}
        {whyMatch[0] && (
          <p className="text-sm text-gold-light italic mb-4 line-clamp-2">
            &ldquo;{whyMatch[0]}&rdquo;
          </p>
        )}

        {/* Seeking / Offering Preview */}
        <div className="border-t border-border pt-4 space-y-2">
          {tradingCard.seeking && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Looking for:{' '}
              </span>
              <span className="text-sm text-text-secondary">
                {truncate(tradingCard.seeking, 60)}
              </span>
            </div>
          )}
          {tradingCard.offering && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Can offer:{' '}
              </span>
              <span className="text-sm text-text-secondary">
                {truncate(tradingCard.offering, 60)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
