'use client';

import { Users, Calendar, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventWizardData } from '../hooks/useWizardState';

interface RSVPStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

const REVEAL_TIMING_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediately after questionnaire' },
  { value: 'TWENTY_FOUR_HOURS_BEFORE', label: '24 hours before event' },
  { value: 'FORTY_EIGHT_HOURS_BEFORE', label: '48 hours before event' },
];

export function RSVPStep({ data, onChange }: RSVPStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">RSVP Settings</h2>
        <p className="text-text-secondary">Configure capacity and matching preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="capacity">
            <Users className="inline w-4 h-4 mr-1" />
            Event Capacity
          </Label>
          <Input
            id="capacity"
            type="number"
            min={2}
            max={200}
            value={data.capacity}
            onChange={(e) => onChange({ capacity: parseInt(e.target.value) || 50 })}
            className="bg-bg-tertiary"
          />
          <p className="text-sm text-text-secondary">Maximum 200 attendees</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rsvpDeadline">
            <Calendar className="inline w-4 h-4 mr-1" />
            RSVP Deadline
          </Label>
          <Input
            id="rsvpDeadline"
            type="date"
            value={data.rsvpDeadline}
            onChange={(e) => onChange({ rsvpDeadline: e.target.value })}
            className="bg-bg-tertiary"
          />
          <p className="text-sm text-text-secondary">Optional - when RSVPs close</p>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium text-white mb-4">
          <Sparkles className="inline w-4 h-4 mr-1 text-gold-primary" />
          Match Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="matchesPerAttendee">Matches per Attendee</Label>
            <Input
              id="matchesPerAttendee"
              type="number"
              min={1}
              max={20}
              value={data.matchesPerAttendee}
              onChange={(e) => onChange({ matchesPerAttendee: parseInt(e.target.value) || 5 })}
              className="bg-bg-tertiary"
            />
            <p className="text-sm text-text-secondary">How many matches each guest receives</p>
          </div>

          <div className="space-y-2">
            <Label>Match Reveal Timing</Label>
            <Select
              value={data.revealTiming}
              onValueChange={(v) => onChange({ revealTiming: v })}
            >
              <SelectTrigger className="bg-bg-tertiary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVEAL_TIMING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-text-secondary">When attendees see their matches</p>
          </div>
        </div>
      </div>
    </div>
  );
}
