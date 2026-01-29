import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { generateProfileSuggestions } from '@/lib/m33t/profile-suggestions';

type RouteContext = {
  params: Promise<{ token: string; setId: string }>;
};

interface StoredQuestion {
  id: string;
  title: string;
  type: string;
  category: string;
}

interface StoredResponse {
  questionId: string;
  value: string | number | string[];
  context?: string;
  answeredAt: string;
}

// POST /api/rsvp/[token]/question-sets/[setId]/complete - Complete question set and get suggestions
export async function POST(request: NextRequest, context: RouteContext) {
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

    // Fetch attendee with profile
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        id: true,
        rsvpStatus: true,
        profile: true,
        profileOverrides: true,
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

    // Verify question set exists and is published
    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: setId,
        eventId: payload.eventId,
        status: 'PUBLISHED',
      },
    });

    if (!questionSet) {
      return NextResponse.json(
        { error: 'Question set not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Get existing response record
    const existingResponse = await prisma.questionSetResponse.findUnique({
      where: {
        questionSetId_attendeeId: {
          questionSetId: setId,
          attendeeId: attendee.id,
        },
      },
    });

    // Check if already completed
    if (existingResponse?.completedAt) {
      return NextResponse.json(
        { error: 'Question set already completed', code: 'ALREADY_COMPLETED', retryable: false },
        { status: 400 }
      );
    }

    // Must have started the set
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Please answer at least one question first', code: 'NO_RESPONSES', retryable: false },
        { status: 400 }
      );
    }

    // Extract questions and responses
    const questions = questionSet.questions as unknown as StoredQuestion[];
    const responses = existingResponse.responses as unknown as StoredResponse[];
    const questionsArray = Array.isArray(questions) ? questions : [];
    const responsesArray = Array.isArray(responses) ? responses : [];

    // Validate minimum responses (at least half the questions)
    const minResponses = Math.ceil(questionsArray.length / 2);
    if (responsesArray.length < minResponses) {
      return NextResponse.json(
        {
          error: `Please answer at least ${minResponses} questions`,
          code: 'INCOMPLETE',
          retryable: false,
          required: minResponses,
          answered: responsesArray.length,
        },
        { status: 400 }
      );
    }

    // Generate profile suggestions
    const currentProfile = (attendee.profile as Record<string, unknown>) || {};
    const profileOverrides = (attendee.profileOverrides as Record<string, unknown>) || {};

    const suggestions = await generateProfileSuggestions({
      currentProfile,
      profileOverrides,
      questions: questionsArray,
      responses: responsesArray.map((r) => ({
        questionId: r.questionId,
        value: r.value,
      })),
      questionSetId: setId,
    });

    // Mark as completed and store suggestions
    const completedResponse = await prisma.questionSetResponse.update({
      where: {
        questionSetId_attendeeId: {
          questionSetId: setId,
          attendeeId: attendee.id,
        },
      },
      data: {
        completedAt: new Date(),
        suggestions: suggestions as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      completedAt: completedResponse.completedAt?.toISOString(),
      suggestions,
      stats: {
        totalQuestions: questionsArray.length,
        answeredQuestions: responsesArray.length,
        suggestionsGenerated: suggestions.length,
      },
    });
  } catch (error) {
    console.error('Failed to complete question set:', error);
    return NextResponse.json(
      { error: 'Failed to complete question set', code: 'COMPLETE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
