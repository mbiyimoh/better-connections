'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SwipeableCard } from '@/components/ui/SwipeableCard';
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials, getAvatarColor } from '@/types/contact';

interface ContactCardProps {
  contact: Contact;
  onEnrich?: (id: string) => void;
}

function RelationshipDots({ strength }: { strength: number }) {
  return (
    <div className="flex gap-1" aria-label={`Relationship strength: ${strength} of 4`}>
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={cn(
            'w-2 h-2 rounded-full',
            level <= strength ? 'bg-gold-primary' : 'bg-zinc-600'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Mobile contact card - tapping navigates to detail page.
 * Swipe right to enrich.
 */
export const ContactCard = React.memo(function ContactCard({
  contact,
  onEnrich,
}: ContactCardProps) {
  const router = useRouter();

  const handleTap = () => {
    router.push(`/contacts/${contact.id}`);
  };

  const handleSwipeEnrich = () => {
    if (onEnrich) {
      onEnrich(contact.id);
    } else {
      router.push(`/enrichment/session?contactId=${contact.id}`);
    }
  };

  return (
    <SwipeableCard
      onSwipeRight={handleSwipeEnrich}
      actionLabel="Enrich"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleTap}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleTap();
          }
        }}
        aria-label={`View ${getDisplayName(contact)} details`}
        className={cn(
          'bg-bg-secondary rounded-xl border border-border',
          'p-4',
          'transition-colors duration-150',
          'active:bg-bg-tertiary',
          'cursor-pointer'
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarFallback
              style={{ background: getAvatarColor(contact) }}
              className="text-sm font-medium text-white/90"
            >
              {getInitials(contact)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-text-primary truncate">
                {getDisplayName(contact)}
              </h3>
              <ChevronRight className="h-4 w-4 text-text-tertiary flex-shrink-0" />
            </div>

            <p className="text-sm text-text-secondary truncate">
              {contact.title || 'No title'}
              {contact.title && contact.company && ' · '}
              {contact.company}
            </p>

            {/* Email/phone - always show to maintain fixed height */}
            <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-text-tertiary h-[32px]">
              <span className="truncate">{contact.primaryEmail || '—'}</span>
              <span>{contact.primaryPhone || '—'}</span>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <RelationshipDots strength={contact.relationshipStrength || 1} />
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-2 py-0.5',
                  contact.enrichmentScore >= 80
                    ? 'bg-success/20 text-success border-success/30'
                    : contact.enrichmentScore >= 50
                    ? 'bg-gold-subtle text-gold-primary border-gold-primary/30'
                    : 'bg-warning/20 text-warning border-warning/30'
                )}
              >
                {contact.enrichmentScore}%
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </SwipeableCard>
  );
});
