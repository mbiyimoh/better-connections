'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Mail, Phone, MapPin, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SwipeableCard } from '@/components/ui/SwipeableCard';
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials, getAvatarColor } from '@/types/contact';

interface ContactCardProps {
  contact: Contact;
  isExpanded?: boolean;
  onExpand?: (id: string) => void;
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

export const ContactCard = React.memo(function ContactCard({
  contact,
  isExpanded = false,
  onExpand,
  onEnrich,
}: ContactCardProps) {
  const router = useRouter();

  const handleTap = () => {
    if (onExpand) {
      onExpand(contact.id);
    } else {
      router.push(`/contacts/${contact.id}`);
    }
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
      disabled={isExpanded}
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
      aria-expanded={isExpanded}
      aria-label={`${getDisplayName(contact)}. ${isExpanded ? 'Collapse' : 'Expand'} for details`}
      className={cn(
        'bg-bg-secondary rounded-xl border border-border',
        'p-4',
        'transition-colors duration-150',
        'active:bg-bg-tertiary',
        'cursor-pointer',
        isExpanded && 'bg-bg-tertiary'
      )}
    >
      <div className="flex items-center gap-3">
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
            <ChevronRight
              className={cn(
                'h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </div>

          <p className="text-sm text-text-secondary truncate">
            {contact.title || 'No title'}
            {contact.title && contact.company && ' · '}
            {contact.company}
          </p>

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

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 200, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border space-y-3">
              {/* Contact Details */}
              {contact.primaryEmail && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Mail className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  <span className="truncate">{contact.primaryEmail}</span>
                </div>
              )}
              {contact.primaryPhone && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  <span>{contact.primaryPhone}</span>
                </div>
              )}
              {contact.location && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  <span>{contact.location}</span>
                </div>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {contact.tags.slice(0, 5).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={cn(
                        'text-xs',
                        tag.category === 'RELATIONSHIP' && 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                        tag.category === 'OPPORTUNITY' && 'bg-green-500/10 text-green-400 border-green-500/30',
                        tag.category === 'EXPERTISE' && 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                        tag.category === 'INTEREST' && 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      )}
                    >
                      {tag.text}
                    </Badge>
                  ))}
                  {contact.tags.length > 5 && (
                    <Badge variant="outline" className="text-xs text-text-tertiary">
                      +{contact.tags.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/contacts/${contact.id}`);
                  }}
                >
                  View Profile
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-10 bg-gold-primary hover:bg-gold-light text-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEnrich) {
                      onEnrich(contact.id);
                    } else {
                      router.push(`/enrichment/session?contactId=${contact.id}`);
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Enrich
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </SwipeableCard>
  );
});
