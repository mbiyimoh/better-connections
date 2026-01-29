import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import {
  calculateRevealTime,
  areMatchesViewable,
} from '@/lib/m33t/reveal-timing';
import type { Match, EventAttendee } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Check token expiry first for better error messages
  if (isTokenExpired(token)) {
    return NextResponse.json(
      { error: 'This link has expired', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    );
  }

  // 2. Verify RSVP token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid token', code: 'TOKEN_INVALID' },
      { status: 401 }
    );
  }

  // 3. Get attendee with event
  const attendee = await prisma.eventAttendee.findUnique({
    where: { id: payload.attendeeId },
    include: {
      event: true,
    },
  });

  if (!attendee) {
    return NextResponse.json(
      { error: 'Attendee not found', code: 'ATTENDEE_NOT_FOUND' },
      { status: 404 }
    );
  }

  // 4. Check RSVP status
  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json(
      { error: 'RSVP not confirmed', code: 'RSVP_NOT_CONFIRMED' },
      { status: 403 }
    );
  }

  // 5. Get approved/revealed matches
  const matches = await prisma.match.findMany({
    where: {
      attendeeId: attendee.id,
      status: { in: ['APPROVED', 'REVEALED'] },
    },
    include: {
      matchedWith: true,
    },
    orderBy: { position: 'asc' },
  });

  // 6. Check reveal timing
  const isViewable = areMatchesViewable(attendee.event, attendee, matches.length > 0);

  // Cache control headers - no caching for personalized match data
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };

  if (!isViewable) {
    // Return "coming soon" response
    const revealTime = calculateRevealTime(attendee.event);
    return NextResponse.json(
      {
        status: 'coming_soon',
        event: {
          id: attendee.event.id,
          name: attendee.event.name,
          date: attendee.event.date.toISOString(),
        },
        attendee: {
          id: attendee.id,
          firstName: attendee.firstName,
        },
        message: 'Your matches will be revealed soon!',
        revealTiming: attendee.event.revealTiming,
        estimatedRevealDate: revealTime?.toISOString() || null,
      },
      { headers }
    );
  }

  // 7. Update view timestamps
  const isFirstView = !attendee.matchesFirstViewedAt;
  await prisma.eventAttendee.update({
    where: { id: attendee.id },
    data: {
      matchesLastViewedAt: new Date(),
      ...(isFirstView && { matchesFirstViewedAt: new Date() }),
    },
  });

  // 8. Format and return matches
  type MatchWithAttendee = Match & { matchedWith: EventAttendee };
  const formattedMatches = matches.map((match: MatchWithAttendee) => {
    const matchedWithProfile = match.matchedWith.profile as Record<string, unknown> | null;
    const matchedWithTradingCard = match.matchedWith.tradingCard as Record<string, unknown> | null;

    return {
      id: match.id,
      position: match.position,
      matchedWith: {
        id: match.matchedWith.id,
        firstName: match.matchedWith.firstName,
        lastName: match.matchedWith.lastName,
        profile: {
          role: (matchedWithProfile?.role as string) || null,
          company: (matchedWithProfile?.company as string) || null,
          location: (matchedWithProfile?.location as string) || null,
          photoUrl: (matchedWithProfile?.photoUrl as string) || null,
        },
        tradingCard: {
          currentFocus: (matchedWithTradingCard?.currentFocus as string) || null,
          seeking: (matchedWithTradingCard?.seekingSummary as string) ||
                   (matchedWithTradingCard?.seeking as string) || null,
          offering: (matchedWithTradingCard?.offeringSummary as string) ||
                    (matchedWithTradingCard?.offering as string) || null,
          expertise: (matchedWithTradingCard?.expertise as string[]) || [],
        },
      },
      whyMatch: match.whyMatch,
      conversationStarters: match.conversationStarters,
    };
  });

  return NextResponse.json(
    {
      status: 'ready',
      event: {
        id: attendee.event.id,
        name: attendee.event.name,
        date: attendee.event.date.toISOString(),
        venueName: attendee.event.venueName,
      },
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
      },
      matches: formattedMatches,
      isFirstView,
      totalMatches: matches.length,
    },
    { headers }
  );
}
