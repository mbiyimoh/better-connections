'use client';

import type { PublicAttendee } from '../types';
import { getInitialsFromName } from '@/lib/contact-utils';
import { RSVP_STATUS_COLORS } from '@/lib/design-system';
import { METALLIC_BADGE_CLASS, POLISHED_AVATAR_CLASS, STATUS_GLOW, TEXT_3D_NAME_STYLE, TEXT_3D_SUBTITLE_STYLE } from './styles';

interface ProfileModalProps {
  attendee: PublicAttendee | null;
  onClose: () => void;
}

export function ProfileModal({ attendee, onClose }: ProfileModalProps) {
  if (!attendee) return null;

  const initials = getInitialsFromName(attendee.name);

  // Check if we have any content to show
  const hasExpertise = attendee.expertise && attendee.expertise.length > 0;
  const hasCurrentFocus = attendee.currentFocus;
  const hasBackground = attendee.tradingCard?.background;
  const hasWhyInteresting = attendee.tradingCard?.whyInteresting;
  const hasConversationStarters =
    attendee.tradingCard?.conversationStarters &&
    attendee.tradingCard.conversationStarters.length > 0;
  const hasAnyContent = hasExpertise || hasCurrentFocus || hasBackground || hasWhyInteresting || hasConversationStarters;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl text-zinc-500 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-20 h-20 rounded-2xl ${POLISHED_AVATAR_CLASS} flex items-center justify-center text-white text-2xl font-medium flex-shrink-0`}>
            {initials}
          </div>
          <div>
            <h3
              className="font-display text-2xl text-white font-semibold"
              style={TEXT_3D_NAME_STYLE}
            >
              {attendee.name}
            </h3>
            {attendee.title && (
              <p className="font-body text-zinc-400" style={TEXT_3D_SUBTITLE_STYLE}>{attendee.title}</p>
            )}
            {attendee.company && (
              <p className="font-body text-zinc-500 text-sm" style={TEXT_3D_SUBTITLE_STYLE}>{attendee.company}</p>
            )}
            {attendee.location && (
              <p className="font-body text-zinc-600 text-sm">{attendee.location}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${RSVP_STATUS_COLORS[attendee.status]} ${STATUS_GLOW[attendee.status] || STATUS_GLOW.invited}`}
              />
              <span className="text-zinc-400 text-sm capitalize">
                {attendee.status}
              </span>
            </div>
          </div>
        </div>

        {/* Expertise tags */}
        {hasExpertise && (
          <div className="mb-6">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">
              EXPERTISE
            </p>
            <div className="flex flex-wrap gap-2">
              {attendee.expertise!.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-sm px-3 py-1.5 rounded-lg ${METALLIC_BADGE_CLASS}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current Focus */}
        {hasCurrentFocus && (
          <div className="mb-6">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">
              CURRENT FOCUS
            </p>
            <p className="text-zinc-300 italic">{attendee.currentFocus}</p>
          </div>
        )}

        {/* Background section */}
        {hasBackground && (
          <div className="mb-6">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">
              BACKGROUND
            </p>
            <p className="text-zinc-300">{attendee.tradingCard!.background}</p>
          </div>
        )}

        {/* Why They're Interesting section */}
        {hasWhyInteresting && (
          <div className="mb-6">
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">
              WHY THEY&apos;RE INTERESTING
            </p>
            <p className="text-zinc-300">
              {attendee.tradingCard!.whyInteresting}
            </p>
          </div>
        )}

        {/* Conversation Starters section */}
        {hasConversationStarters && (
          <div>
            <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3">
              CONVERSATION STARTERS
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2">
              {attendee.tradingCard!.conversationStarters!.map(
                (starter, idx) => (
                  <li key={idx}>{starter}</li>
                )
              )}
            </ul>
          </div>
        )}

        {/* Empty state if no content at all */}
        {!hasAnyContent && (
          <p className="text-zinc-500 text-center py-4">
            More details coming soon...
          </p>
        )}
      </div>
    </div>
  );
}
