'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendeeCard } from './AttendeeCard';
import type { PublicAttendee } from '../types';

interface AttendeeCarouselProps {
  title: string;
  subtitle?: string;
  attendees: PublicAttendee[];
  statusColor: string;
  onSelectAttendee: (attendee: PublicAttendee) => void;
}

export function AttendeeCarousel({
  title,
  subtitle,
  attendees,
  statusColor,
  onSelectAttendee,
}: AttendeeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  // Check scroll position to show/hide buttons
  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftButton(scrollLeft > 0);
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    // Recheck on resize
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [attendees]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (attendees.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-white font-medium">{title}</span>
        <span className="text-zinc-500">({attendees.length})</span>
        {subtitle && (
          <span className="text-zinc-600 text-sm ml-2">{subtitle}</span>
        )}
      </div>

      {/* Carousel container */}
      <div className="relative group">
        {/* Left fade gradient */}
        {showLeftButton && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        )}

        {/* Right fade gradient */}
        {showRightButton && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
        )}

        {/* Left scroll button */}
        {showLeftButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right scroll button */}
        {showRightButton && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/90 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {attendees.map((attendee) => (
            <AttendeeCard
              key={attendee.id}
              attendee={attendee}
              onClick={() => onSelectAttendee(attendee)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
