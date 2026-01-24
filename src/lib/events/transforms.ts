import type { Event } from '@prisma/client';
import type { Question, WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';
import { DEFAULT_LANDING_PAGE_SETTINGS } from '@/lib/m33t/schemas';
import { STARTER_QUESTIONS } from '@/lib/m33t/questions';
import { DEFAULT_CARD_SETTINGS, type EventWizardData, type EventHost } from './types';

/**
 * Maps a Prisma Event model to EventWizardData for use in wizard/editor forms.
 */
export function mapEventToWizardData(event: Event): EventWizardData {
  const eventWithExtras = event as Event & {
    eventType?: string;
    eventGoals?: string[];
    parkingNotes?: string;
    dressCode?: string;
    foodInfo?: string;
    whatToExpect?: WhatToExpectItem[];
    landingPageSettings?: LandingPageSettings;
    hosts?: EventHost[];
    // Legacy single-host fields for backward compatibility
    hostName?: string;
    hostTitle?: string;
    hostBio?: string;
    hostQuote?: string;
    hostPhoto?: string;
  };

  // Use hosts array if available, otherwise migrate from legacy single-host fields
  let hosts: EventHost[] = [];
  if (eventWithExtras.hosts && Array.isArray(eventWithExtras.hosts) && eventWithExtras.hosts.length > 0) {
    hosts = eventWithExtras.hosts;
  } else if (eventWithExtras.hostName) {
    // Migrate legacy single-host to array format
    hosts = [{
      id: 'host_legacy_' + event.id.substring(0, 8),
      name: eventWithExtras.hostName,
      title: eventWithExtras.hostTitle || undefined,
      bio: eventWithExtras.hostBio || undefined,
      quote: eventWithExtras.hostQuote || undefined,
      photo: eventWithExtras.hostPhoto || undefined,
    }];
  }

  return {
    name: event.name,
    tagline: event.tagline || '',
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
    foodInfo: eventWithExtras.foodInfo || '',
    organizers: [],
    capacity: event.capacity,
    rsvpDeadline: event.rsvpDeadline?.toISOString().split('T')[0] || '',
    matchesPerAttendee: event.matchesPerAttendee,
    revealTiming: event.revealTiming,
    cardSettings: (event.cardSettings as Record<string, boolean>) || DEFAULT_CARD_SETTINGS,
    questions: (event.questions as Question[]) || STARTER_QUESTIONS,
    whatToExpect: (eventWithExtras.whatToExpect as WhatToExpectItem[]) || [],
    landingPageSettings: (eventWithExtras.landingPageSettings as LandingPageSettings) || DEFAULT_LANDING_PAGE_SETTINGS,
    hosts,
  };
}

/**
 * Transforms EventWizardData to the API payload format for creating/updating events.
 */
export function eventWizardDataToApiPayload(data: EventWizardData) {
  return {
    name: data.name,
    tagline: data.tagline || undefined,
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
    foodInfo: data.foodInfo || undefined,
    cardSettings: data.cardSettings,
    questions: data.questions,
    whatToExpect: data.whatToExpect.length > 0 ? data.whatToExpect : undefined,
    landingPageSettings: data.landingPageSettings,
    hosts: data.hosts.length > 0 ? data.hosts : undefined,
  };
}
