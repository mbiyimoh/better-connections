'use client';

import { useState } from 'react';
import { AttendeeCard } from './AttendeeCard';
import type { PublicAttendee } from '../types';

interface FullGuestListModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: {
    confirmed: PublicAttendee[];
    maybe: PublicAttendee[];
    invited: PublicAttendee[];
  };
  onSelectAttendee: (attendee: PublicAttendee) => void;
}

type TabType = 'confirmed' | 'maybe' | 'invited';

const TABS: { key: TabType; label: string; color: string; bgColor: string }[] = [
  { key: 'confirmed', label: 'Confirmed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  { key: 'maybe', label: 'Maybe', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  { key: 'invited', label: 'Invited', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
];

export function FullGuestListModal({
  isOpen,
  onClose,
  attendees,
  onSelectAttendee,
}: FullGuestListModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('confirmed');

  if (!isOpen) return null;

  const currentAttendees = attendees[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-800 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl text-zinc-500 hover:text-white transition-colors z-10"
          aria-label="Close modal"
        >
          &times;
        </button>

        {/* Header */}
        <div className="p-8 pb-0">
          <p className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-2">
            THE ROOM
          </p>
          <h3
            className="text-2xl text-white mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Full Guest List
          </h3>

          {/* Tab bar */}
          <div className="flex gap-2 bg-zinc-950 rounded-xl p-1.5 inline-flex">
            {TABS.map((tab) => {
              const count = attendees[tab.key].length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? `${tab.bgColor} ${tab.color}`
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  role="tab"
                  aria-selected={isActive}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-6 overflow-y-auto flex-1">
          {currentAttendees.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">
              No {activeTab} guests yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentAttendees.map((attendee) => (
                <AttendeeCard
                  key={attendee.id}
                  attendee={attendee}
                  onClick={() => onSelectAttendee(attendee)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
