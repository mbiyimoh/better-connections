'use client';

import { useRef, useState, useEffect } from 'react';
import type { PublicAttendee } from '../types';
import { getInitialsFromName } from '@/lib/contact-utils';
import { RSVP_STATUS_COLORS } from '@/lib/design-system';
import { MapPin } from 'lucide-react';
import {
  STATUS_GLOW,
  METALLIC_BADGE_CLASS,
  POLISHED_AVATAR_CLASS,
  TEXT_3D_NAME_STYLE,
  TEXT_3D_SUBTITLE_STYLE,
  FLOATING_CARD_CLASS,
  PEBBLE_HIGHLIGHT_STYLE,
  CURRENT_FOCUS_CALLOUT_CLASS,
  CURRENT_FOCUS_TEXT_STYLE,
} from './styles';

interface AttendeeCardProps {
  attendee: PublicAttendee;
  onClick: () => void;
}

export function AttendeeCard({ attendee, onClick }: AttendeeCardProps) {
  const initials = getInitialsFromName(attendee.name);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleTagCount, setVisibleTagCount] = useState<number>(
    attendee.expertise?.length || 0
  );

  const expertise = attendee.expertise || [];

  // Measure which tags fit in 2 rows and show "+N" for the rest
  useEffect(() => {
    const container = tagsContainerRef.current;
    if (!container || expertise.length === 0) return;

    // Get all tag elements
    const tags = Array.from(container.children) as HTMLElement[];
    if (tags.length === 0) return;

    const firstTag = tags[0];
    if (!firstTag) return;

    // Find the Y position of the first tag
    const firstTagTop = firstTag.offsetTop;
    const tagHeight = firstTag.offsetHeight;
    const maxBottomY = firstTagTop + tagHeight * 2 + 6; // 2 rows + gap

    // Find how many tags fit within 2 rows
    let lastVisibleIndex = expertise.length - 1;
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (!tag) continue;
      // Check if this tag's bottom edge exceeds 2 rows
      if (tag.offsetTop + tag.offsetHeight > maxBottomY) {
        // This tag doesn't fit - go back one (leave room for +N)
        lastVisibleIndex = Math.max(0, i - 1);
        break;
      }
    }

    setVisibleTagCount(lastVisibleIndex + 1);
  }, [expertise]);

  const visibleTags = expertise.slice(0, visibleTagCount);
  const hiddenCount = expertise.length - visibleTagCount;

  return (
    <div
      onClick={onClick}
      className={`w-80 h-[300px] flex-shrink-0 flex flex-col p-5 rounded-2xl cursor-pointer overflow-hidden ${FLOATING_CARD_CLASS}`}
      data-testid="attendee-card"
    >
      {/* Pebble highlight overlay for curved surface illusion */}
      <div style={PEBBLE_HIGHLIGHT_STYLE} className="absolute inset-0 rounded-2xl pointer-events-none" />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER ZONE - Fixed height for consistent alignment
          Contains: Avatar, Name, Title, Company, Location
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="h-[100px] overflow-hidden flex-shrink-0">
        {/* Avatar with status dot */}
        <div className="mb-1.5">
          <div className="relative inline-block">
            <div
              className={`
                w-11 h-11 rounded-full
                ${POLISHED_AVATAR_CLASS}
                flex items-center justify-center
                text-white font-medium text-sm
              `}
            >
              {initials}
            </div>
            <div
              className={`
                absolute bottom-0 right-0 w-3 h-3 rounded-full
                ${RSVP_STATUS_COLORS[attendee.status]}
                ${STATUS_GLOW[attendee.status] || STATUS_GLOW.invited}
              `}
            />
          </div>
        </div>

        {/* Name */}
        <p
          className="text-white text-sm font-semibold truncate leading-tight"
          style={TEXT_3D_NAME_STYLE}
        >
          {attendee.name}
        </p>

        {/* Title */}
        {attendee.title && (
          <p
            className="text-xs text-zinc-400 truncate leading-tight"
            style={TEXT_3D_SUBTITLE_STYLE}
          >
            {attendee.title}
          </p>
        )}

        {/* Company */}
        {attendee.company && (
          <p
            className="text-xs text-zinc-500 truncate leading-tight"
            style={TEXT_3D_SUBTITLE_STYLE}
          >
            {attendee.company}
          </p>
        )}

        {/* Location */}
        {attendee.location && (
          <p className="text-xs text-zinc-600 truncate flex items-center gap-1 leading-tight">
            <MapPin size={10} className="shrink-0" />
            {attendee.location}
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENT ZONE - Flexible height (absorbs variable space)
          Contains: Divider, Expertise Tags
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Divider - always present for consistent layout */}
        <div className="my-2 border-t border-white/10 flex-shrink-0" />

        {/* Hidden measurement container - renders all tags to measure */}
        {expertise.length > 0 && (
          <div
            ref={tagsContainerRef}
            className="flex flex-wrap gap-1.5 absolute opacity-0 pointer-events-none"
            style={{ width: 'calc(320px - 40px)' }} // card width minus padding
            aria-hidden="true"
          >
            {expertise.map((tag, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-md ${METALLIC_BADGE_CLASS} truncate max-w-[130px]`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Visible tags - only show what fits in 2 rows */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 content-start">
            {visibleTags.map((tag, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-md ${METALLIC_BADGE_CLASS} truncate max-w-[130px]`}
              >
                {tag}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="text-xs px-2 py-0.5 text-zinc-500">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER ZONE - Fixed height for current focus callout
          Always rendered to preserve space for alignment
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="h-[56px] flex-shrink-0 flex items-end">
        {attendee.currentFocus && (
          <div className={`w-full ${CURRENT_FOCUS_CALLOUT_CLASS}`}>
            <p className="line-clamp-2" style={CURRENT_FOCUS_TEXT_STYLE}>
              {attendee.currentFocus}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
