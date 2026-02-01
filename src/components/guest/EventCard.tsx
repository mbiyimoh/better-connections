'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import { formatEventDateShort } from '@/lib/m33t';
import type { RSVPStatus } from '@prisma/client';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    tagline?: string | null;
    date: Date;
    startTime: string;
    venueName: string;
    _count?: {
      attendees: number;
    };
  };
  rsvpStatus: RSVPStatus;
  profileCompletion: number;
}

const statusColors: Record<RSVPStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  CONFIRMED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  MAYBE: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  DECLINED: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const statusLabels: Record<RSVPStatus, string> = {
  PENDING: 'Invited',
  CONFIRMED: 'Confirmed',
  MAYBE: 'Maybe',
  DECLINED: 'Declined',
};

export function EventCard({ event, rsvpStatus, profileCompletion }: EventCardProps) {
  const status = statusColors[rsvpStatus] || statusColors.PENDING;

  return (
    <Link href={`/guest/events/${event.id}`}>
      <Card className="p-4 hover:border-gold-primary transition-colors cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-text-primary line-clamp-1">{event.name}</h3>
          <Badge className={`${status.bg} ${status.text} border-0`}>
            {statusLabels[rsvpStatus]}
          </Badge>
        </div>

        {event.tagline && (
          <p className="text-text-secondary text-sm mb-3 line-clamp-2">
            {event.tagline}
          </p>
        )}

        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatEventDateShort(event.date)} at {event.startTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{event.venueName}</span>
          </div>
          {event._count && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{event._count.attendees} attendees</span>
            </div>
          )}
        </div>

        {/* Profile completion indicator */}
        {profileCompletion < 80 && (
          <div className="mt-3 pt-3 border-t border-border">
            <Badge variant="outline" className="text-warning border-warning/30">
              Profile {profileCompletion}% complete
            </Badge>
          </div>
        )}
      </Card>
    </Link>
  );
}
