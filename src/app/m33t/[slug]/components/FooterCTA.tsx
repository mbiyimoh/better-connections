import { formatEventDate } from '@/lib/m33t';

interface FooterCTAProps {
  tagline?: string | null;
  date: string;
  location: string;
  rsvpUrl: string;
}

export function FooterCTA({
  tagline,
  date,
  location,
  rsvpUrl,
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
            className="text-2xl md:text-3xl mb-8"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {tagline}
          </p>
        )}

        {/* CTA Button */}
        <a
          href={rsvpUrl}
          className="inline-block px-10 py-5 bg-amber-500 text-black font-semibold rounded-xl text-lg hover:bg-amber-400 transition-colors"
        >
          Request an Invitation
        </a>

        {/* Event details */}
        <div className="mt-8 text-zinc-500 text-sm">
          <p>{formatEventDate(date)}</p>
          <p>{location}</p>
        </div>
      </div>
    </section>
  );
}
