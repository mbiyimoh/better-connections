import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  generateEventMatches,
  generateWhyMatchReasons,
  generateConversationStarters,
  checkM33tAccess,
  m33tAccessDeniedResponse,
  checkEventAccess,
  type MatchableProfile,
} from '@/lib/m33t';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

// POST /api/events/[eventId]/matches/generate - Generate matches for an event
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Check M33T access
    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Check event access (owner or co-organizer with curate permission)
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        matchesPerAttendee: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Check event is in valid status
    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot generate matches for cancelled event', code: 'INVALID_STATUS', retryable: false },
        { status: 400 }
      );
    }

    // Fetch confirmed attendees with completed profiles
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        profileExtractedAt: { not: null },
      },
      select: {
        id: true,
        seekingKeywords: true,
        offeringKeywords: true,
        expertise: true,
        experienceLevel: true,
        topicsOfInterest: true,
        createdAt: true,
      },
    });

    if (attendees.length < 2) {
      return NextResponse.json(
        {
          error: 'Need at least 2 confirmed attendees with completed profiles',
          code: 'INSUFFICIENT_ATTENDEES',
          retryable: false,
          attendeeCount: attendees.length,
        },
        { status: 400 }
      );
    }

    // Convert to matchable profiles
    const matchableProfiles: MatchableProfile[] = attendees.map((a) => ({
      id: a.id,
      seekingKeywords: a.seekingKeywords,
      offeringKeywords: a.offeringKeywords,
      expertise: a.expertise,
      experienceLevel: a.experienceLevel,
      topicsOfInterest: a.topicsOfInterest,
      createdAt: a.createdAt,
    }));

    // Generate matches
    const matchScores = generateEventMatches(matchableProfiles, event.matchesPerAttendee);

    // Delete existing pending matches (keep approved/rejected for history)
    await prisma.match.deleteMany({
      where: {
        eventId,
        status: 'PENDING',
      },
    });

    // Create match records with explanations
    const matchRecords = matchScores.map((score, index) => {
      const attendee = matchableProfiles.find((p) => p.id === score.attendeeId);
      const matchedWith = matchableProfiles.find((p) => p.id === score.matchedWithId);

      // Generate explanations
      const whyMatch =
        attendee && matchedWith ? generateWhyMatchReasons(score, attendee, matchedWith) : ['Complementary backgrounds'];
      const conversationStarters =
        attendee && matchedWith ? generateConversationStarters(attendee, matchedWith) : ['What brought you here?'];

      // Calculate position (1-indexed) for each attendee's matches
      const attendeeMatches = matchScores.filter((m) => m.attendeeId === score.attendeeId);
      const position = attendeeMatches.findIndex((m) => m.matchedWithId === score.matchedWithId) + 1;

      return {
        eventId,
        attendeeId: score.attendeeId,
        matchedWithId: score.matchedWithId,
        position: position || index + 1,
        score: score.score,
        whyMatch,
        conversationStarters,
        status: 'PENDING' as const,
        isManual: false,
      };
    });

    // Batch insert matches
    const created = await prisma.match.createMany({
      data: matchRecords,
      skipDuplicates: true,
    });

    // Get match stats
    const matchStats = await prisma.match.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      generated: created.count,
      attendeesMatched: attendees.length,
      matchesPerAttendee: event.matchesPerAttendee,
      stats: matchStats.reduce(
        (acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Match generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate matches', code: 'GENERATION_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
