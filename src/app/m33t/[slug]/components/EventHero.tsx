import type { EventData, InviteeContext } from '../types';
import { formatEventDate, formatEventTime } from '@/lib/m33t';
import { GOLD_FOIL_GRADIENT, GOLD_FOIL_BUTTON } from '@/lib/design-system';

interface EventHeroProps {
  event: EventData;
  rsvpUrl: string;
  inviteeContext?: InviteeContext;
}

export function EventHero({ event, rsvpUrl, inviteeContext }: EventHeroProps) {
  // Split event name on colon to separate title from subtitle
  const [rawTitle, subtitle] = event.name.includes(':')
    ? event.name.split(':').map((s) => s.trim())
    : [event.name, null];

  // Ensure title ends with a period
  const mainTitle = rawTitle.endsWith('.') ? rawTitle : `${rawTitle}.`;

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1
        className="font-display text-6xl md:text-8xl lg:text-9xl font-medium tracking-wide mb-4 pb-2"
        style={{ ...GOLD_FOIL_GRADIENT }}
      >
        {mainTitle}
      </h1>

      <p
        className="font-display text-2xl md:text-3xl lg:text-4xl text-white mb-8"
      >
        {subtitle || 'Building at the Speed of Thought'}
      </p>

      <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-8" />

      <div className="text-zinc-400 tracking-widest uppercase text-sm mb-8">
        <p>{formatEventDate(event.date)}</p>
        <p>
          {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}
        </p>
        <p className="mt-2">{event.venueName}</p>
      </div>

      {inviteeContext && (
        <p className="text-xl md:text-2xl text-zinc-300 mb-6">
          Welcome, {inviteeContext.firstName}
        </p>
      )}

      <a
        href={inviteeContext?.rsvpUrl || rsvpUrl}
        className="px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
        style={{ ...GOLD_FOIL_BUTTON }}
      >
        {inviteeContext ? 'RSVP Here' : 'Request an Invitation'}
      </a>
    </section>
  );
}
