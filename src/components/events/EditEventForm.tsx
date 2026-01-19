'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventFormSchema, type EventFormInput } from '@/lib/m33t/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Event } from '@prisma/client';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const REVEAL_TIMING_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediately after questionnaire' },
  { value: 'TWENTY_FOUR_HOURS_BEFORE', label: '24 hours before event' },
  { value: 'FORTY_EIGHT_HOURS_BEFORE', label: '48 hours before event' },
];

interface EditEventFormProps {
  event: Event;
}

export function EditEventForm({ event }: EditEventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const form = useForm<EventFormInput>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      name: event.name,
      tagline: event.tagline || '',
      description: event.description || '',
      date: formatDateForInput(new Date(event.date)),
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      capacity: event.capacity,
      matchesPerAttendee: event.matchesPerAttendee,
      revealTiming: event.revealTiming,
    },
  });

  const onSubmit = async (data: EventFormInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update event');
      }

      toast.success('Event updated successfully!');
      router.push(`/events/${event.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Event
      </Link>

      <Card className="bg-bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Event</CardTitle>
          <CardDescription>Update your event details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Austin Founder Mixer"
                {...form.register('name')}
                className="bg-bg-tertiary"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-error">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="e.g., Connecting founders with investors"
                {...form.register('tagline')}
                className="bg-bg-tertiary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell attendees what to expect at this event..."
                {...form.register('description')}
                className="bg-bg-tertiary min-h-[100px]"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register('date')}
                  className="bg-bg-tertiary"
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-error">{form.formState.errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Start *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                  className="bg-bg-tertiary"
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-error">{form.formState.errors.startTime.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register('endTime')}
                  className="bg-bg-tertiary"
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-error">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.watch('timezone')}
                onValueChange={(value) => form.setValue('timezone', value)}
              >
                <SelectTrigger className="bg-bg-tertiary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venueName">
                <MapPin className="inline w-4 h-4 mr-1" />
                Venue Name *
              </Label>
              <Input
                id="venueName"
                placeholder="e.g., The Capital Factory"
                {...form.register('venueName')}
                className="bg-bg-tertiary"
              />
              {form.formState.errors.venueName && (
                <p className="text-sm text-error">{form.formState.errors.venueName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueAddress">Venue Address *</Label>
              <Input
                id="venueAddress"
                placeholder="e.g., 701 Brazos St, Austin, TX 78701"
                {...form.register('venueAddress')}
                className="bg-bg-tertiary"
              />
              {form.formState.errors.venueAddress && (
                <p className="text-sm text-error">{form.formState.errors.venueAddress.message}</p>
              )}
            </div>

            {/* Capacity & Matches Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  <Users className="inline w-4 h-4 mr-1" />
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={2}
                  max={200}
                  {...form.register('capacity', { valueAsNumber: true })}
                  className="bg-bg-tertiary"
                />
                <p className="text-sm text-text-secondary">Maximum 200 attendees</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="matchesPerAttendee">Matches per Attendee</Label>
                <Input
                  id="matchesPerAttendee"
                  type="number"
                  min={1}
                  max={20}
                  {...form.register('matchesPerAttendee', { valueAsNumber: true })}
                  className="bg-bg-tertiary"
                />
                <p className="text-sm text-text-secondary">How many matches each attendee receives</p>
              </div>
            </div>

            {/* Match Reveal Timing */}
            <div className="space-y-2">
              <Label>Match Reveal Timing</Label>
              <Select
                value={form.watch('revealTiming')}
                onValueChange={(value) => form.setValue('revealTiming', value as 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE')}
              >
                <SelectTrigger className="bg-bg-tertiary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVEAL_TIMING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary">When attendees see their matches</p>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/events/${event.id}`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gold-primary hover:bg-gold-light text-bg-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
