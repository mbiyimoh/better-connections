import type { EventData } from '../types';
import { formatEventDate, formatEventTime } from '@/lib/m33t';

interface EventHeroProps {
  event: EventData;
  rsvpUrl: string;
}

export function EventHero({ event, rsvpUrl }: EventHeroProps) {
  // Split event name to highlight first word
  const nameParts = event.name.split(' ');
  const firstWord = nameParts[0];
  const restOfName = nameParts.slice(1).join(' ');

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1
        className="text-5xl md:text-7xl lg:text-8xl font-medium mb-4"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <span className="text-amber-500">{firstWord}</span>
        {restOfName && ` ${restOfName}`}
      </h1>

      {event.tagline && (
        <p
          className="text-xl md:text-2xl text-zinc-300 italic mb-8"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {event.tagline}
        </p>
      )}

      <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-8" />

      <div className="text-zinc-400 tracking-widest uppercase text-sm mb-8">
        <p>{formatEventDate(event.date)}</p>
        <p>
          {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}
        </p>
        <p className="mt-2">{event.venueName}</p>
      </div>

      <a
        href={rsvpUrl}
        className="px-8 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors"
      >
        Request an Invitation
      </a>
    </section>
  );
}
