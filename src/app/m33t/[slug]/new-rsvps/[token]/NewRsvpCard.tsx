'use client';

import { Badge } from '@/components/ui/badge';
import { AttendeeCard } from '@/app/m33t/[slug]/components/AttendeeCard';
import { formatRelativeDate } from '@/lib/m33t/question-formatting';
import type { PublicAttendee } from '@/app/m33t/[slug]/types';

interface NewRsvpCardProps {
  attendee: PublicAttendee & { rsvpRespondedAt: string };
  onClick: () => void;
}

export function NewRsvpCard({ attendee, onClick }: NewRsvpCardProps) {
  return (
    <div className="relative">
      {/* Timestamp badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
          RSVP&apos;d {formatRelativeDate(attendee.rsvpRespondedAt)}
        </Badge>
      </div>

      {/* Reuse AttendeeCard */}
      <AttendeeCard
        attendee={attendee}
        onClick={onClick}
      />
    </div>
  );
}
