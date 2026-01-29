import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';

type RouteContext = {
  params: Promise<{ token: string; setId: string }>;
};

// GET /api/rsvp/[token]/question-sets/[setId] - Get single question set with questions and responses
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token, setId } = await context.params;

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

    // Fetch attendee to verify access
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        id: true,
        rsvpStatus: true,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Must have confirmed RSVP
    if (attendee.rsvpStatus !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Please confirm your RSVP first', code: 'RSVP_REQUIRED', retryable: false },
        { status: 403 }
      );
    }

    // Get the question set
    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: setId,
        eventId: payload.eventId,
        status: 'PUBLISHED',
      },
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

    if (!questionSet) {
      return NextResponse.json(
        { error: 'Question set not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const questions = questionSet.questions as unknown[];
    const questionsArray = Array.isArray(questions) ? questions : [];
    const savedResponse = questionSet.responses[0];
    const savedResponses = savedResponse?.responses as unknown[];
    const responsesArray = Array.isArray(savedResponses) ? savedResponses : [];

    // Calculate progress - find first unanswered question
    const answeredIds = new Set(
      responsesArray
        .filter(
          (r): r is { questionId: string } =>
            typeof r === 'object' && r !== null && 'questionId' in r
        )
        .map((r) => r.questionId)
    );

    const currentIndex = questionsArray.findIndex((q) => {
      if (typeof q !== 'object' || q === null || !('id' in q)) return false;
      const questionId = (q as { id: string }).id;
      return !answeredIds.has(questionId);
    });

    return NextResponse.json({
      questionSet: {
        id: questionSet.id,
        internalId: questionSet.internalId,
        title: questionSet.title,
        description: questionSet.description,
        questions: questionsArray,
      },
      responses: responsesArray,
      progress: {
        total: questionsArray.length,
        answered: answeredIds.size,
        currentIndex: currentIndex === -1 ? questionsArray.length : currentIndex,
      },
      isCompleted: !!savedResponse?.completedAt,
    });
  } catch (error) {
    console.error('Failed to fetch question set:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question set', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
