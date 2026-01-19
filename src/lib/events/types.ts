import type { Question, WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';
import { DEFAULT_LANDING_PAGE_SETTINGS } from '@/lib/m33t/schemas';

/**
 * Data structure for the event wizard/editor form.
 */
export interface EventWizardData {
  // Step 1: Basics
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  eventType: string;
  description: string;
  eventGoals: string[];

  // Step 2: Venue
  venueName: string;
  venueAddress: string;
  googlePlaceId: string | null;
  parkingNotes: string;
  dressCode: string;

  // Step 3: Organizers
  organizers: Array<{
    id?: string;
    odId: string;
    contactId?: string;
    name: string;
    email?: string;
    permissions: {
      canInvite: boolean;
      canCurate: boolean;
      canEdit: boolean;
      canManage: boolean;
    };
  }>;

  // Step 4: RSVP
  capacity: number;
  rsvpDeadline: string;
  matchesPerAttendee: number;
  revealTiming: string;

  // Step 5: Cards
  cardSettings: Record<string, boolean>;

  // Step 6: Questions
  questions: Question[];

  // Step 7: Landing Page
  whatToExpect: WhatToExpectItem[];
  landingPageSettings: LandingPageSettings;
}

/**
 * Default card settings for trading cards.
 */
export const DEFAULT_CARD_SETTINGS: Record<string, boolean> = {
  role: true,
  company: true,
  expertise: true,
  lookingFor: true,
  canHelp: true,
  whyNow: true,
  conversationStarters: true,
};

/**
 * Default event data for new events.
 */
export const DEFAULT_EVENT_DATA: EventWizardData = {
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  timezone: 'America/Chicago',
  eventType: '',
  description: '',
  eventGoals: [],
  venueName: '',
  venueAddress: '',
  googlePlaceId: null,
  parkingNotes: '',
  dressCode: '',
  organizers: [],
  capacity: 50,
  rsvpDeadline: '',
  matchesPerAttendee: 5,
  revealTiming: 'TWENTY_FOUR_HOURS_BEFORE',
  cardSettings: DEFAULT_CARD_SETTINGS,
  questions: [],
  whatToExpect: [],
  landingPageSettings: DEFAULT_LANDING_PAGE_SETTINGS,
};

/**
 * Validation status for a section/step.
 */
export type ValidationStatus = 'valid' | 'invalid' | 'incomplete';
