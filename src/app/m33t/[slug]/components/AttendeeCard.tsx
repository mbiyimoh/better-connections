import type { PublicAttendee } from '../types';
import { getInitialsFromName } from '@/lib/contact-utils';
import { RSVP_STATUS_COLORS } from '@/lib/design-system';
import { MapPin } from 'lucide-react';

interface AttendeeCardProps {
  attendee: PublicAttendee;
  onClick: () => void;
}

export function AttendeeCard({ attendee, onClick }: AttendeeCardProps) {
  const initials = getInitialsFromName(attendee.name);
  const hasDetails = attendee.expertise?.length || attendee.currentFocus;

  return (
    <div
      onClick={onClick}
      className="w-80 flex-shrink-0 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80 cursor-pointer transition-all"
      data-testid="attendee-card"
    >
      {/* Avatar with status dot */}
      <div className="relative mb-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-medium">
          {initials}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${RSVP_STATUS_COLORS[attendee.status]} border-2 border-zinc-900`}
        />
      </div>

      {/* Name */}
      <p className="text-white text-sm font-medium truncate">{attendee.name}</p>

      {/* Title */}
      {attendee.title && (
        <p className="text-xs text-zinc-400 truncate">{attendee.title}</p>
      )}

      {/* Company */}
      {attendee.company && (
        <p className="text-xs text-zinc-500 truncate">{attendee.company}</p>
      )}

      {/* Location */}
      {attendee.location && (
        <p className="text-xs text-zinc-600 truncate flex items-center gap-1 mt-0.5">
          <MapPin size={10} className="shrink-0" />
          {attendee.location}
        </p>
      )}

      {/* Divider if we have more details */}
      {hasDetails && (
        <div className="my-2 border-t border-zinc-800/50" />
      )}

      {/* Expertise Tags */}
      {attendee.expertise && attendee.expertise.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attendee.expertise.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 truncate max-w-[140px]"
            >
              {tag}
            </span>
          ))}
          {attendee.expertise.length > 3 && (
            <span className="text-xs px-2 py-0.5 text-zinc-500">
              +{attendee.expertise.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Current Focus */}
      {attendee.currentFocus && (
        <p className="text-xs text-amber-500/80 italic mt-2 line-clamp-2">
          {attendee.currentFocus}
        </p>
      )}
    </div>
  );
}
