import { formatEventDate } from '@/lib/m33t';
import { GOLD_FOIL_BUTTON } from '@/lib/design-system';
import { AddToCalendarButton } from '@/components/m33t/AddToCalendarButton';
import type { InviteeContext } from '../types';

interface FooterCTAProps {
  tagline?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  venueAddress: string;
  description?: string | null;
  eventName: string;
  rsvpUrl: string;
  inviteeContext?: InviteeContext;
}

export function FooterCTA({
  tagline,
  date,
  startTime,
  endTime,
  location,
  venueAddress,
  description,
  eventName,
  rsvpUrl,
  inviteeContext,
}: FooterCTAProps) {

  return (
    <section className="py-24 px-4 relative">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-56 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto text-center relative">
        {/* Tagline with highlight */}
        {tagline && (
          <p
            className="font-display text-2xl md:text-3xl mb-8"
          >
            {tagline}
          </p>
        )}

        {/* CTA Button */}
        <a
          href={inviteeContext?.rsvpUrl || rsvpUrl}
          className="inline-block px-10 py-5 rounded-xl text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
          style={{ ...GOLD_FOIL_BUTTON }}
        >
          {inviteeContext ? 'RSVP Here' : 'Request an Invitation'}
        </a>

        {/* Event details */}
        <div className="mt-8 text-zinc-500 text-sm">
          <p>{formatEventDate(date)}</p>
          <p>{location}</p>
        </div>

        {/* Add to Calendar */}
        <div className="mt-4">
          <AddToCalendarButton
            event={{
              title: eventName,
              description: description || '',
              date,
              startTime,
              endTime,
              timezone: 'America/Chicago',
              venueName: location,
              venueAddress,
            }}
            variant="landing"
          />
        </div>
      </div>
    </section>
  );
}
