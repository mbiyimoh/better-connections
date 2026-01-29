'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, Gift, MessageCircle, Lightbulb } from 'lucide-react';

interface MatchDetailModalProps {
  match: {
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
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailModal({
  match,
  isOpen,
  onClose,
}: MatchDetailModalProps) {
  if (!match) return null;

  const { matchedWith, whyMatch, conversationStarters } = match;
  const { firstName, lastName, profile, tradingCard } = matchedWith;

  // Build headline
  const headline = profile.role && profile.company
    ? `${profile.role} at ${profile.company}`
    : profile.role || profile.company || null;

  // Get initials
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Match Details: {firstName} {lastName}
          </DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="text-center mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gold-subtle flex items-center justify-center text-3xl font-bold text-gold-primary mx-auto mb-4 overflow-hidden">
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

          <h2 className="text-2xl font-bold text-text-primary">
            {firstName} {lastName}
          </h2>
          {headline && (
            <p className="text-text-secondary mt-1">{headline}</p>
          )}
          {profile.location && (
            <p className="text-sm text-text-tertiary flex items-center justify-center gap-1 mt-2">
              <MapPin className="w-4 h-4" />
              {profile.location}
            </p>
          )}
        </div>

        {/* Why You Match */}
        {whyMatch.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-primary" />
              Why You Match
            </h3>
            <ul className="space-y-2">
              {whyMatch.map((reason, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                  <span className="text-gold-primary mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Current Focus */}
        {tradingCard.currentFocus && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-gold-primary" />
              Current Focus
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.currentFocus}
            </p>
          </section>
        )}

        {/* Looking For */}
        {tradingCard.seeking && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-primary" />
              Looking For
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.seeking}
            </p>
          </section>
        )}

        {/* Can Offer */}
        {tradingCard.offering && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold-primary" />
              Can Offer
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.offering}
            </p>
          </section>
        )}

        {/* Conversation Starters */}
        {conversationStarters.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold-primary" />
              Conversation Starters
            </h3>
            <ul className="space-y-3">
              {conversationStarters.map((starter, i) => (
                <li
                  key={i}
                  className="text-sm text-text-secondary bg-bg-tertiary rounded-lg p-3 flex items-start gap-2"
                >
                  <span className="text-lg flex-shrink-0">💬</span>
                  <span>{starter}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Expertise */}
        {tradingCard.expertise.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Expertise
            </h3>
            <div className="flex flex-wrap gap-2">
              {tradingCard.expertise.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-bg-tertiary text-text-secondary"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
