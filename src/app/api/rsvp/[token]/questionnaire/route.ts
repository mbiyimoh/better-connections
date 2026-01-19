import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import type { Question } from '@/lib/m33t/schemas';

type RouteContext = {
  params: Promise<{ token: string }>;
};

// GET /api/rsvp/[token]/questionnaire - Get questions for event
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    // Fetch event with questions and attendee's existing responses
    const [event, attendee] = await Promise.all([
      prisma.event.findUnique({
        where: { id: payload.eventId },
        select: {
          id: true,
          name: true,
          questions: true,
        },
      }),
      prisma.eventAttendee.findUnique({
        where: { id: payload.attendeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rsvpStatus: true,
          questionnaireResponses: true,
          questionnaireCompletedAt: true,
        },
      }),
    ]);

    if (!event || !attendee) {
      return NextResponse.json(
        { error: 'Event or attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Must have confirmed RSVP to access questionnaire
    if (attendee.rsvpStatus !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Please confirm your RSVP first', code: 'RSVP_REQUIRED', retryable: false },
        { status: 403 }
      );
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
      },
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        completed: !!attendee.questionnaireCompletedAt,
      },
      questions: event.questions as Question[],
      responses: attendee.questionnaireResponses || [],
    });
  } catch (error) {
    console.error('Failed to fetch questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
