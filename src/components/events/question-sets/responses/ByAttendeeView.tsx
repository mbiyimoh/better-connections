'use client';

import { useState, useRef, useEffect } from 'react';
import type { AttendeeWithResponses } from '@/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient';
import { AttendeeList } from './AttendeeList';
import { AttendeeDetail } from './AttendeeDetail';

interface ByAttendeeViewProps {
  attendees: AttendeeWithResponses[];
  notStartedCount: number;
}

export function ByAttendeeView({
  attendees,
  notStartedCount,
}: ByAttendeeViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedAttendee = selectedId
    ? attendees.find((a) => a.attendee.id === selectedId) ?? null
    : null;

  useEffect(() => {
    if (selectedAttendee && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedAttendee]);

  return (
    <div className="space-y-4">
      <AttendeeList
        attendees={attendees}
        selectedId={selectedId}
        onSelect={setSelectedId}
        notStartedCount={notStartedCount}
      />
      {selectedAttendee && (
        <div ref={detailRef}>
          <AttendeeDetail
            data={selectedAttendee}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
