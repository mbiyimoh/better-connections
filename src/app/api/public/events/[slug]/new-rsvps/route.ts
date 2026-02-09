import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import type { PublicAttendee } from '@/app/m33t/[slug]/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// Extended type that includes rsvpRespondedAt for sorting/display
type NewRsvpAttendee = PublicAttendee & { rsvpRespondedAt: string };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    // Verify token
    const payload = verifyRSVPToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the requesting attendee and verify slug match
    const viewer = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            date: true,
          },
        },
      },
    });

    if (!viewer) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    if (viewer.event.slug !== slug) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
    }

    if (!viewer.rsvpRespondedAt) {
      return NextResponse.json({ error: 'Viewer has not RSVPed' }, { status: 400 });
    }

    // Fetch new CONFIRMED attendees (RSVPed after viewer)
    const newAttendees = await prisma.eventAttendee.findMany({
      where: {
        eventId: viewer.event.id,
        rsvpStatus: 'CONFIRMED',
        rsvpRespondedAt: { gt: viewer.rsvpRespondedAt },
        id: { not: viewer.id },
      },
      orderBy: { rsvpRespondedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rsvpRespondedAt: true,
        profile: true,
        profileOverrides: true,
        tradingCard: true,
        // Exclude: email, phone, questionnaireResponses
      },
    });

    // Transform to public format
    const publicAttendees: NewRsvpAttendee[] = newAttendees.map((attendee) => {
      const baseProfile = attendee.profile as Profile | null;
      const overrides = attendee.profileOverrides as ProfileOverrides | null;
      const displayProfile = mergeProfileWithOverrides(baseProfile, overrides);

      // Extract from trading card or profile
      let title: string | undefined;
      let company: string | undefined;
      let location: string | undefined;

      if (attendee.tradingCard && typeof attendee.tradingCard === 'object') {
        const tc = attendee.tradingCard as Record<string, unknown>;
        if (typeof tc.headline === 'string') title = tc.headline;
        if (typeof tc.company === 'string') company = tc.company;
        if (typeof tc.location === 'string') location = tc.location;
      }

      if (displayProfile) {
        if (!title && displayProfile.role) title = displayProfile.role;
        if (!company && displayProfile.company) company = displayProfile.company;
        if (!location && displayProfile.location) location = displayProfile.location;
      }

      // Parse trading card for display
      let tradingCardData: NewRsvpAttendee['tradingCard'];
      if (attendee.tradingCard && typeof attendee.tradingCard === 'object') {
        const tc = attendee.tradingCard as Record<string, unknown>;
        const background = typeof tc.background === 'string' ? tc.background : undefined;
        let whyInteresting: string | undefined;
        if (Array.isArray(tc.whyMatch) && tc.whyMatch.length > 0) {
          whyInteresting = tc.whyMatch.filter(Boolean).join(' ');
        }
        let conversationStarters: string[] | undefined;
        if (Array.isArray(tc.conversationStarters) && tc.conversationStarters.length > 0) {
          conversationStarters = tc.conversationStarters.filter(
            (s): s is string => typeof s === 'string' && s.length > 0
          );
        }
        if (background || whyInteresting || conversationStarters) {
          tradingCardData = { background, whyInteresting, conversationStarters };
        }
      }

      return {
        id: attendee.id,
        name: `${attendee.firstName}${attendee.lastName ? ' ' + attendee.lastName : ''}`,
        title,
        company,
        location,
        expertise: displayProfile?.expertise,
        currentFocus: displayProfile?.currentFocus ?? undefined,
        rsvpRespondedAt: attendee.rsvpRespondedAt!.toISOString(),
        tradingCard: tradingCardData,
        // Required PublicAttendee fields
        status: 'confirmed' as const,
        displayOrder: null,
        profileRichness: 0,
        createdAt: new Date(attendee.rsvpRespondedAt!),
      };
    });

    return NextResponse.json(
      {
        event: {
          id: viewer.event.id,
          name: viewer.event.name,
          slug: viewer.event.slug,
          date: viewer.event.date.toISOString(),
        },
        viewer: {
          id: viewer.id,
          name: `${viewer.firstName}${viewer.lastName ? ' ' + viewer.lastName : ''}`,
          rsvpRespondedAt: viewer.rsvpRespondedAt.toISOString(),
        },
        newAttendees: publicAttendees,
        totalCount: publicAttendees.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching new RSVPs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
