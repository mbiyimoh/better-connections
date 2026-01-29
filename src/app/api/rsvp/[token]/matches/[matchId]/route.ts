import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; matchId: string }> }
) {
  const { token, matchId } = await params;

  // 1. Verify RSVP token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // 2. Get the match with matched attendee data
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      attendeeId: payload.attendeeId,
      status: { in: ['APPROVED', 'REVEALED'] },
    },
    include: {
      matchedWith: true,
      attendee: {
        include: { event: true },
      },
    },
  });

  if (!match) {
    return NextResponse.json(
      { error: 'Match not found' },
      { status: 404 }
    );
  }

  // 3. Format response with full details
  const matchedWithProfile = match.matchedWith.profile as Record<string, unknown> | null;
  const matchedWithTradingCard = match.matchedWith.tradingCard as Record<string, unknown> | null;

  return NextResponse.json({
    match: {
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
          expertise: (matchedWithProfile?.expertise as string[]) || [],
        },
        tradingCard: {
          currentFocus: (matchedWithTradingCard?.currentFocus as string) || null,
          seeking: (matchedWithTradingCard?.seekingSummary as string) ||
                   (matchedWithTradingCard?.seeking as string) || null,
          offering: (matchedWithTradingCard?.offeringSummary as string) ||
                    (matchedWithTradingCard?.offering as string) || null,
          expertise: (matchedWithTradingCard?.expertise as string[]) || [],
          conversationHooks: (matchedWithTradingCard?.conversationHooks as string[]) || [],
        },
      },
      whyMatch: match.whyMatch,
      conversationStarters: match.conversationStarters,
    },
  });
}
