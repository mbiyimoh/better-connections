'use client';

import { Calendar, Clock, MapPin, Users, HelpCircle, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDressCodeLabel } from '@/lib/m33t';
import type { EventWizardData } from '@/lib/events';
import Link from 'next/link';

interface EventEditorPreviewProps {
  data: EventWizardData;
  onEdit: (sectionId: string) => void;
  eventId?: string;
}

const REVEAL_TIMING_LABELS: Record<string, string> = {
  'IMMEDIATE': 'Immediately',
  'TWENTY_FOUR_HOURS_BEFORE': '24 hours before',
  'FORTY_EIGHT_HOURS_BEFORE': '48 hours before',
};

export function EventEditorPreview({ data, onEdit, eventId }: EventEditorPreviewProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours || '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {eventId && (
        <div className="p-4 rounded-lg bg-gold-subtle border border-gold-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gold-primary">View Public Page</p>
              <p className="text-xs text-text-secondary mt-1">
                See how your event looks to attendees
              </p>
            </div>
            <Link href={`/e/${eventId}`} target="_blank">
              <Button variant="outline" size="sm" className="border-gold-primary/50 text-gold-primary">
                <ExternalLink size={14} className="mr-2" />
                Open Preview
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Event Details */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Event Details</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit('basics')}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xl font-semibold text-white">{data.name || 'Untitled Event'}</p>
            {data.description && (
              <p className="text-text-secondary mt-1 text-sm">{data.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="w-4 h-4" />
              {formatDate(data.date)}
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock className="w-4 h-4" />
              {formatTime(data.startTime)} - {formatTime(data.endTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Venue */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Venue</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit('venue')}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-text-secondary">
            <MapPin className="w-4 h-4 mt-0.5" />
            <div>
              <p className="text-white">{data.venueName || 'Not set'}</p>
              <p className="text-sm">{data.venueAddress || ''}</p>
            </div>
          </div>
          {data.parkingNotes && (
            <p className="text-sm text-text-tertiary ml-6">Parking: {data.parkingNotes}</p>
          )}
          {data.dressCode && (
            <p className="text-sm text-text-tertiary ml-6">
              Dress Code: {getDressCodeLabel(data.dressCode)}
            </p>
          )}
        </div>
      </div>

      {/* RSVP Settings */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">RSVP Settings</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit('rsvp')}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-tertiary">Capacity</p>
            <p className="text-white flex items-center gap-1">
              <Users className="w-4 h-4" />
              {data.capacity} attendees
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">Matches per person</p>
            <p className="text-white">{data.matchesPerAttendee}</p>
          </div>
          <div>
            <p className="text-text-tertiary">RSVP Deadline</p>
            <p className="text-white">{data.rsvpDeadline ? formatDate(data.rsvpDeadline) : 'Not set'}</p>
          </div>
          <div>
            <p className="text-text-tertiary">Reveal timing</p>
            <p className="text-white">{REVEAL_TIMING_LABELS[data.revealTiming] || data.revealTiming}</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Questionnaire</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit('questions')}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <HelpCircle className="w-4 h-4" />
          <span>{data.questions.length} questions configured</span>
        </div>
        {data.questions.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-text-tertiary ml-6">
            {data.questions.slice(0, 3).map((q) => (
              <li key={q.id}>• {q.title}</li>
            ))}
            {data.questions.length > 3 && (
              <li className="text-text-tertiary">...and {data.questions.length - 3} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
