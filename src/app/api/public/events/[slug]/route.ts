import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { RSVPStatus } from '@prisma/client';
// Import shared types (single source of truth)
import type {
  PublicAttendee,
  ScheduleItem,
  WhatToExpectItem,
  LandingPageSettings,
} from '@/app/m33t/[slug]/types';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import { sortAttendeeGroups } from '@/lib/m33t';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Map RSVPStatus enum to display string
 */
function mapRsvpStatus(status: RSVPStatus): 'confirmed' | 'maybe' | 'invited' | null {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'MAYBE':
      return 'maybe';
    case 'PENDING':
      return 'invited';
    case 'DECLINED':
      return null; // Excluded from display
    default:
      return null;
  }
}

/**
 * Parse trading card JSON safely
 */
function parseTradingCard(tradingCard: unknown): PublicAttendee['tradingCard'] | undefined {
  if (!tradingCard || typeof tradingCard !== 'object') return undefined;

  const card = tradingCard as Record<string, unknown>;

  // Extract background/bio
  const background = typeof card.background === 'string' ? card.background : undefined;

  // Extract whyMatch array and join into paragraph
  let whyInteresting: string | undefined;
  if (Array.isArray(card.whyMatch) && card.whyMatch.length > 0) {
    whyInteresting = card.whyMatch.filter(Boolean).join(' ');
  }

  // Extract conversation starters
  let conversationStarters: string[] | undefined;
  if (Array.isArray(card.conversationStarters) && card.conversationStarters.length > 0) {
    conversationStarters = card.conversationStarters.filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    );
    if (conversationStarters.length === 0) conversationStarters = undefined;
  }

  // Return undefined if no data
  if (!background && !whyInteresting && !conversationStarters) return undefined;

  return { background, whyInteresting, conversationStarters };
}

/**
 * GET /api/public/events/[slug]
 *
 * Public endpoint to fetch event data for the landing page.
 * No authentication required.
 * Returns privacy-filtered attendee data.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch event with related data
    const event = await prisma.event.findFirst({
      where: { slug },
      include: {
        attendees: {
          where: {
            rsvpStatus: {
              not: 'DECLINED', // Exclude declined attendees
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rsvpStatus: true,
            profile: true,           // For company/title extraction
            profileOverrides: true,  // Organizer customizations
            tradingCard: true,
            // Ordering fields
            displayOrder: true,
            profileRichness: true,
            createdAt: true,
            // Privacy: exclude email, phone, questionnaireResponses
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Transform attendees to public format with privacy filtering
    const transformedAttendees: {
      confirmed: PublicAttendee[];
      maybe: PublicAttendee[];
      invited: PublicAttendee[];
    } = {
      confirmed: [],
      maybe: [],
      invited: [],
    };

    for (const attendee of event.attendees) {
      const status = mapRsvpStatus(attendee.rsvpStatus);
      if (!status) continue; // Skip declined

      const tradingCardData = parseTradingCard(attendee.tradingCard);

      // Extract title, company, and location from trading card or profile
      let title: string | undefined;
      let company: string | undefined;
      let location: string | undefined;

      // First try trading card
      if (attendee.tradingCard && typeof attendee.tradingCard === 'object') {
        const tc = attendee.tradingCard as Record<string, unknown>;
        if (typeof tc.headline === 'string') {
          title = tc.headline;
        }
        if (typeof tc.company === 'string') {
          company = tc.company;
        }
        if (typeof tc.location === 'string') {
          location = tc.location;
        }
      }

      // Extract expertise and currentFocus for richer cards
      let expertise: string[] | undefined;
      let currentFocus: string | undefined;

      // Merge profile with organizer overrides (overrides take precedence)
      const baseProfile = attendee.profile as Profile | null;
      const overrides = attendee.profileOverrides as ProfileOverrides | null;
      const displayProfile = mergeProfileWithOverrides(baseProfile, overrides);

      // Use merged displayProfile (uses ProfileSchema field names)
      if (displayProfile) {
        // ProfileSchema uses 'role' not 'title'
        if (!title && displayProfile.role) {
          title = displayProfile.role;
        }
        if (!company && displayProfile.company) {
          company = displayProfile.company;
        }
        if (!location && displayProfile.location) {
          location = displayProfile.location;
        }
        // Extract expertise array (already merged)
        if (displayProfile.expertise && displayProfile.expertise.length > 0) {
          expertise = displayProfile.expertise;
        }
        // Extract currentFocus (what they're working on / seeking)
        if (displayProfile.currentFocus && displayProfile.currentFocus.trim()) {
          currentFocus = displayProfile.currentFocus;
        }
      }

      const publicAttendee: PublicAttendee = {
        id: attendee.id,
        name: `${attendee.firstName}${attendee.lastName ? ' ' + attendee.lastName : ''}`,
        title,
        company,
        location,
        status,
        expertise,
        currentFocus,
        tradingCard: tradingCardData,
        // Ordering fields for sorting
        displayOrder: attendee.displayOrder,
        profileRichness: attendee.profileRichness,
        createdAt: attendee.createdAt,
      };

      transformedAttendees[status].push(publicAttendee);
    }

    // Parse schedule JSON
    let schedule: ScheduleItem[] | undefined;
    if (event.schedule && Array.isArray(event.schedule)) {
      schedule = (event.schedule as unknown[])
        .filter((item): item is ScheduleItem => {
          if (!item || typeof item !== 'object') return false;
          const obj = item as Record<string, unknown>;
          return (
            typeof obj.time === 'string' &&
            typeof obj.title === 'string' &&
            typeof obj.description === 'string'
          );
        });
      if (schedule.length === 0) schedule = undefined;
    }

    // Parse whatToExpect JSON with error handling
    let whatToExpect: WhatToExpectItem[] | undefined;
    try {
      if (event.whatToExpect && Array.isArray(event.whatToExpect)) {
        whatToExpect = (event.whatToExpect as unknown[])
          .filter((item): item is WhatToExpectItem => {
            if (!item || typeof item !== 'object') return false;
            const obj = item as Record<string, unknown>;
            return (
              typeof obj.id === 'string' &&
              typeof obj.icon === 'string' &&
              typeof obj.title === 'string' &&
              typeof obj.description === 'string'
            );
          });
        if (whatToExpect.length === 0) whatToExpect = undefined;
      }
    } catch (error) {
      console.error('Failed to parse whatToExpect JSON:', error);
      whatToExpect = undefined; // Graceful degradation
    }

    // Parse landingPageSettings JSON with defaults and error handling
    const defaultSettings: LandingPageSettings = {
      showVenue: true,
      showSchedule: true,
      showHost: true,
      showWhatToExpect: true,
      showAttendees: true,
    };

    let landingPageSettings: LandingPageSettings = defaultSettings;
    try {
      if (event.landingPageSettings && typeof event.landingPageSettings === 'object') {
        const settings = event.landingPageSettings as Record<string, unknown>;
        landingPageSettings = {
          showVenue: typeof settings.showVenue === 'boolean' ? settings.showVenue : defaultSettings.showVenue,
          showSchedule: typeof settings.showSchedule === 'boolean' ? settings.showSchedule : defaultSettings.showSchedule,
          showHost: typeof settings.showHost === 'boolean' ? settings.showHost : defaultSettings.showHost,
          showWhatToExpect: typeof settings.showWhatToExpect === 'boolean' ? settings.showWhatToExpect : defaultSettings.showWhatToExpect,
          showAttendees: typeof settings.showAttendees === 'boolean' ? settings.showAttendees : defaultSettings.showAttendees,
        };
      }
    } catch (error) {
      console.error('Failed to parse landingPageSettings JSON:', error);
      // Use defaults on error
    }

    // Build response
    const response = {
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        tagline: event.tagline,
        description: event.description,
        date: event.date.toISOString(),
        startTime: event.startTime,
        endTime: event.endTime,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        googlePlaceId: event.googlePlaceId,
        parkingNotes: event.parkingNotes,
        dressCode: event.dressCode,
        foodInfo: event.foodInfo,
        schedule,
        whatToExpect,
        landingPageSettings,
      },
      attendees: sortAttendeeGroups(transformedAttendees),
      // Use hosts array if available, fall back to legacy single-host fields
      hosts: event.hosts && Array.isArray(event.hosts) && (event.hosts as unknown[]).length > 0
        ? (event.hosts as Array<{ id?: string; name: string; title?: string; bio?: string; quote?: string; photo?: string }>)
        : event.hostName
          ? [{
              id: 'host_legacy',
              name: event.hostName || event.user.name || 'Event Host',
              title: event.hostTitle || undefined,
              bio: event.hostBio || undefined,
              quote: event.hostQuote || undefined,
              photo: event.hostPhoto || undefined,
            }]
          : [{
              id: 'host_default',
              name: event.user.name || 'Event Host',
            }],
      rsvpUrl: '#request-invite',
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store', // Ensure fresh data
      },
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
