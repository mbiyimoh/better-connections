'use client';

import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventWizardData } from '../hooks/useWizardState';

interface BasicsStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

const EVENT_TYPES = [
  { value: 'networking', label: 'Networking' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const GOAL_OPTIONS = ['Fundraising', 'Hiring', 'Partnerships', 'Learning', 'Community'];

export function BasicsStep({ data, onChange }: BasicsStepProps) {
  const toggleGoal = (goal: string) => {
    const newGoals = data.eventGoals.includes(goal)
      ? data.eventGoals.filter(g => g !== goal)
      : [...data.eventGoals, goal];
    onChange({ eventGoals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Event Basics</h2>
        <p className="text-text-secondary">Let&apos;s start with the essential details</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Event Name <span className="text-gold-primary">*</span></Label>
        <Input
          id="name"
          placeholder="e.g., Austin Founder Mixer"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`bg-bg-tertiary ${!data.name ? 'border-error/50 focus:border-error' : ''}`}
        />
        {!data.name && (
          <p className="text-xs text-error">Event name is required</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">
            <Calendar className="inline w-4 h-4 mr-1" />
            Date <span className="text-gold-primary">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className={`bg-bg-tertiary ${!data.date ? 'border-error/50 focus:border-error' : ''}`}
          />
          {!data.date && (
            <p className="text-xs text-error">Required</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">
            <Clock className="inline w-4 h-4 mr-1" />
            Start <span className="text-gold-primary">*</span>
          </Label>
          <Input
            id="startTime"
            type="time"
            value={data.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className={`bg-bg-tertiary ${!data.startTime ? 'border-error/50 focus:border-error' : ''}`}
          />
          {!data.startTime && (
            <p className="text-xs text-error">Required</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End <span className="text-gold-primary">*</span></Label>
          <Input
            id="endTime"
            type="time"
            value={data.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className={`bg-bg-tertiary ${!data.endTime ? 'border-error/50 focus:border-error' : ''}`}
          />
          {!data.endTime && (
            <p className="text-xs text-error">Required</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Event Type</Label>
          <Select value={data.eventType} onValueChange={(v) => onChange({ eventType: v })}>
            <SelectTrigger className="bg-bg-tertiary">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={data.timezone} onValueChange={(v) => onChange({ timezone: v })}>
            <SelectTrigger className="bg-bg-tertiary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Tell attendees what to expect..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="bg-bg-tertiary min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Event Goals</Label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                data.eventGoals.includes(goal)
                  ? 'bg-gold-primary text-bg-primary'
                  : 'bg-bg-tertiary text-text-secondary border border-border'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
