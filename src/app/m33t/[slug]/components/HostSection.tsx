import Image from 'next/image';
import type { HostData } from '../types';
import { getInitialsFromName } from '@/lib/contact-utils';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface HostSectionProps {
  hosts: HostData[];
  sectionNumber?: string | null;
}

function HostCard({ host }: { host: HostData }) {
  const initials = getInitialsFromName(host.name);

  return (
    <div className="flex flex-col gap-4">
      {/* Header: Photo + Name/Title side by side on all viewports */}
      <div className="flex items-start gap-4">
        {/* Avatar / Photo */}
        {host.photo ? (
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-amber-500/30">
            <Image
              src={host.photo}
              alt={host.name}
              width={112}
              height={112}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white text-xl md:text-2xl font-medium flex-shrink-0">
            {initials}
          </div>
        )}

        {/* Name and Title - beside photo on all viewports */}
        <div className="flex flex-col justify-center min-h-[5rem] md:min-h-[7rem]">
          <h3 className="font-display text-2xl md:text-3xl mb-1">
            {host.name}
          </h3>

          {host.title && (
            <p className="font-body text-zinc-400">{host.title}</p>
          )}
        </div>
      </div>

      {/* Quote and Bio - below the header */}
      <div className="text-left">
        {host.quote && (
          <p className="font-display text-xl md:text-2xl italic text-zinc-300 pt-4 pb-6">
            &ldquo;{host.quote}&rdquo;
          </p>
        )}

        {host.bio && (
          <MarkdownContent className="text-zinc-500 text-sm">
            {host.bio}
          </MarkdownContent>
        )}
      </div>
    </div>
  );
}

export function HostSection({ hosts, sectionNumber }: HostSectionProps) {
  if (hosts.length === 0) return null;

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-left md:text-center">
          {sectionNumber ? `${sectionNumber} — ` : ''}{hosts.length === 1 ? 'YOUR HOST' : 'YOUR HOSTS'}
        </p>

        <div className="space-y-16">
          {hosts.map((host, index) => (
            <HostCard key={host.id || index} host={host} />
          ))}
        </div>
      </div>
    </section>
  );
}
