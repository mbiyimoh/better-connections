'use client';

import { Calendar, Clock, MapPin, Users, HelpCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDressCodeLabel } from '@/lib/m33t';
import type { EventWizardData } from '../hooks/useWizardState';

interface ReviewStepProps {
  data: EventWizardData;
  onEdit: (step: number) => void;
}

const REVEAL_TIMING_LABELS: Record<string, string> = {
  'IMMEDIATE': 'Immediately',
  'TWENTY_FOUR_HOURS_BEFORE': '24 hours before',
  'FORTY_EIGHT_HOURS_BEFORE': '48 hours before',
};

export function ReviewStep({ data, onEdit }: ReviewStepProps) {
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
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Review &amp; Create</h2>
        <p className="text-text-secondary">Confirm your event details before creating</p>
      </div>

      {/* Event Details */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Event Details</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(0)}
            className="text-text-secondary hover:text-gold-primary -mt-1 -mr-2"
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-xl font-semibold text-white">{data.name || 'Untitled Event'}</h4>
            {data.eventType && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-bg-secondary rounded text-text-secondary capitalize">
                {data.eventType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <Calendar size={16} />
            <span>{formatDate(data.date)}</span>
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <Clock size={16} />
            <span>{formatTime(data.startTime)} - {formatTime(data.endTime)}</span>
          </div>

          {data.description && (
            <p className="text-text-secondary text-sm mt-2">{data.description}</p>
          )}

          {data.eventGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.eventGoals.map((goal) => (
                <span
                  key={goal}
                  className="text-xs px-2 py-1 bg-gold-subtle text-gold-primary rounded-full"
                >
                  {goal}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Venue */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Venue</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(1)}
            className="text-text-secondary hover:text-gold-primary -mt-1 -mr-2"
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-text-secondary mt-0.5 shrink-0" />
            <div>
              <p className="text-white font-medium">{data.venueName || 'Not set'}</p>
              <p className="text-text-secondary text-sm">{data.venueAddress || ''}</p>
            </div>
          </div>

          {data.parkingNotes && (
            <p className="text-text-secondary text-sm ml-6">{data.parkingNotes}</p>
          )}

          {data.dressCode && (
            <p className="text-text-secondary text-sm ml-6">
              Dress code: <span className="text-white">{getDressCodeLabel(data.dressCode)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Capacity & Settings */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Settings</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(3)}
            className="text-text-secondary hover:text-gold-primary -mt-1 -mr-2"
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-secondary" />
            <div>
              <p className="text-white">{data.capacity} attendees</p>
              <p className="text-xs text-text-tertiary">Max capacity</p>
            </div>
          </div>

          <div>
            <p className="text-white">{data.matchesPerAttendee} matches</p>
            <p className="text-xs text-text-tertiary">Per attendee</p>
          </div>

          <div className="col-span-2">
            <p className="text-text-secondary text-sm">
              Matches revealed: <span className="text-white">{REVEAL_TIMING_LABELS[data.revealTiming] || data.revealTiming}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="p-5 rounded-xl bg-bg-tertiary border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-white">Questionnaire</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(5)}
            className="text-text-secondary hover:text-gold-primary -mt-1 -mr-2"
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-text-secondary" />
          <p className="text-white">{data.questions.length} questions configured</p>
        </div>

        {data.questions.length > 0 && (
          <ul className="mt-3 space-y-1 ml-6">
            {data.questions.slice(0, 3).map((q, i) => (
              <li key={q.id} className="text-text-secondary text-sm">
                {i + 1}. {q.title}
              </li>
            ))}
            {data.questions.length > 3 && (
              <li className="text-text-tertiary text-sm">
                +{data.questions.length - 3} more...
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
        <p className="text-sm text-text-secondary">
          <strong className="text-white">Ready to create?</strong> Click the button below to publish your event.
          You can always edit these settings later.
        </p>
      </div>
    </div>
  );
}
