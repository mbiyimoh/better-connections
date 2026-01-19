import type { Event } from '@prisma/client';
import type { Question, WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';
import { DEFAULT_LANDING_PAGE_SETTINGS } from '@/lib/m33t/schemas';
import { STARTER_QUESTIONS } from '@/lib/m33t/questions';
import { DEFAULT_CARD_SETTINGS, DEFAULT_EVENT_DATA, type EventWizardData } from './types';

/**
 * Maps a Prisma Event model to EventWizardData for use in wizard/editor forms.
 */
export function mapEventToWizardData(event: Event): EventWizardData {
  const eventWithExtras = event as Event & {
    eventType?: string;
    eventGoals?: string[];
    parkingNotes?: string;
    dressCode?: string;
    whatToExpect?: WhatToExpectItem[];
    landingPageSettings?: LandingPageSettings;
  };

  return {
    name: event.name,
    date: event.date.toISOString().split('T')[0] ?? '',
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    eventType: eventWithExtras.eventType || '',
    description: event.description || '',
    eventGoals: eventWithExtras.eventGoals || [],
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    googlePlaceId: event.googlePlaceId ?? null,
    parkingNotes: eventWithExtras.parkingNotes || '',
    dressCode: eventWithExtras.dressCode || '',
    organizers: [],
    capacity: event.capacity,
    rsvpDeadline: event.rsvpDeadline?.toISOString().split('T')[0] || '',
    matchesPerAttendee: event.matchesPerAttendee,
    revealTiming: event.revealTiming,
    cardSettings: (event.cardSettings as Record<string, boolean>) || DEFAULT_CARD_SETTINGS,
    questions: (event.questions as Question[]) || STARTER_QUESTIONS,
    whatToExpect: (eventWithExtras.whatToExpect as WhatToExpectItem[]) || [],
    landingPageSettings: (eventWithExtras.landingPageSettings as LandingPageSettings) || DEFAULT_LANDING_PAGE_SETTINGS,
  };
}

/**
 * Transforms EventWizardData to the API payload format for creating/updating events.
 */
export function eventWizardDataToApiPayload(data: EventWizardData) {
  return {
    name: data.name,
    description: data.description || undefined,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    googlePlaceId: data.googlePlaceId || undefined,
    capacity: data.capacity,
    rsvpDeadline: data.rsvpDeadline || undefined,
    matchesPerAttendee: data.matchesPerAttendee,
    revealTiming: data.revealTiming,
    eventType: data.eventType || undefined,
    eventGoals: data.eventGoals.length > 0 ? data.eventGoals : undefined,
    parkingNotes: data.parkingNotes || undefined,
    dressCode: data.dressCode || undefined,
    cardSettings: data.cardSettings,
    questions: data.questions,
    whatToExpect: data.whatToExpect.length > 0 ? data.whatToExpect : undefined,
    landingPageSettings: data.landingPageSettings,
  };
}
