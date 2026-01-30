/**
 * Types for the public event landing page
 */

// Import shared types from schemas (single source of truth)
import type { WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';

// Re-export for consumers of this module
export type { WhatToExpectItem, LandingPageSettings } from '@/lib/m33t/schemas';

export interface PublicAttendee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  status: 'confirmed' | 'maybe' | 'invited';
  // Profile data for richer cards
  expertise?: string[];
  currentFocus?: string;
  tradingCard?: {
    background?: string;
    whyInteresting?: string;
    conversationStarters?: string[];
  };
  // Ordering fields (used for sorting, not displayed)
  displayOrder: number | null;
  profileRichness: number;
  createdAt: Date;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

export interface EventData {
  id: string;
  slug: string | null;
  name: string;
  tagline?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  googlePlaceId?: string | null;
  parkingNotes?: string | null;
  dressCode?: string | null;
  foodInfo?: string | null;
  schedule?: ScheduleItem[];
  whatToExpect?: WhatToExpectItem[];
  landingPageSettings: LandingPageSettings;
}

export interface HostData {
  id?: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  quote?: string | null;
  photo?: string | null;
}

export interface InviteeContext {
  firstName: string;
  rsvpUrl: string;
}

export interface PublicEventData {
  event: EventData;
  attendees: {
    confirmed: PublicAttendee[];
    maybe: PublicAttendee[];
    invited: PublicAttendee[];
  };
  hosts: HostData[];
  rsvpUrl: string;
  inviteeContext?: InviteeContext;
}
