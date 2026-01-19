import type { HostData } from '../types';
import { getInitialsFromName } from '@/lib/contact-utils';

interface HostSectionProps {
  host: HostData;
}

export function HostSection({ host }: HostSectionProps) {
  const initials = getInitialsFromName(host.name);

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-center">
          YOUR HOST
        </p>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
            {initials}
          </div>

          {/* Content */}
          <div className="text-center md:text-left">
            <h2
              className="text-3xl md:text-4xl mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {host.name}
            </h2>

            {host.title && (
              <p className="text-zinc-400 mb-4">{host.title}</p>
            )}

            {host.quote && (
              <p
                className="text-xl italic text-zinc-300 mb-4"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                &ldquo;{host.quote}&rdquo;
              </p>
            )}

            {host.bio && (
              <p className="text-zinc-500 text-sm">{host.bio}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
