import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';

type RouteContext = {
  params: Promise<{ token: string }>;
};

// GET /api/rsvp/[token]/question-sets - List available question sets for attendee
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    // Check if token is expired
    if (isTokenExpired(token)) {
      return NextResponse.json(
        { error: 'RSVP link has expired', code: 'TOKEN_EXPIRED', retryable: false },
        { status: 410 }
      );
    }

    // Verify token
    const payload = verifyRSVPToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid RSVP link', code: 'TOKEN_INVALID', retryable: false },
        { status: 401 }
      );
    }

    // Fetch event and attendee
    const [event, attendee] = await Promise.all([
      prisma.event.findUnique({
        where: { id: payload.eventId },
        select: { id: true, name: true },
      }),
      prisma.eventAttendee.findUnique({
        where: { id: payload.attendeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rsvpStatus: true,
        },
      }),
    ]);

    if (!event || !attendee) {
      return NextResponse.json(
        { error: 'Event or attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Must have confirmed RSVP to access question sets
    if (attendee.rsvpStatus !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Please confirm your RSVP first', code: 'RSVP_REQUIRED', retryable: false },
        { status: 403 }
      );
    }

    // Get all PUBLISHED question sets for the event with attendee's responses
    const questionSets = await prisma.questionSet.findMany({
      where: {
        eventId: event.id,
        status: 'PUBLISHED',
      },
      orderBy: { order: 'asc' },
      include: {
        responses: {
          where: { attendeeId: attendee.id },
          select: {
            responses: true,
            completedAt: true,
            startedAt: true,
          },
        },
      },
    });

    // Format response with status per set
    const formattedSets = questionSets.map((set) => {
      const response = set.responses[0];
      const questions = set.questions as unknown[];
      const questionsArray = Array.isArray(questions) ? questions : [];
      const responsesArray = response?.responses as unknown[];
      const answeredCount = Array.isArray(responsesArray) ? responsesArray.length : 0;

      let status: 'not_started' | 'in_progress' | 'completed';
      if (response?.completedAt) {
        status = 'completed';
      } else if (response?.startedAt) {
        status = 'in_progress';
      } else {
        status = 'not_started';
      }

      return {
        id: set.id,
        internalId: set.internalId,
        title: set.title,
        description: set.description,
        questionCount: questionsArray.length,
        order: set.order,
        status,
        completedAt: response?.completedAt?.toISOString() || null,
        answeredCount,
      };
    });

    // Find the next set to complete (first incomplete)
    const nextSet = formattedSets.find((s) => s.status !== 'completed');

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
      },
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
      },
      questionSets: formattedSets,
      nextSetId: nextSet?.id || null,
    });
  } catch (error) {
    console.error('Failed to fetch question sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question sets', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
