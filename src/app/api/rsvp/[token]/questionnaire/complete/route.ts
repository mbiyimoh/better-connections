import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { extractProfileWithTimeout, createFallbackProfile } from '@/lib/m33t/extraction';
import { calculateProfileRichness } from '@/lib/m33t';
import type { Question, QuestionnaireResponse } from '@/lib/m33t/schemas';

type RouteContext = {
  params: Promise<{ token: string }>;
};

// POST /api/rsvp/[token]/questionnaire/complete - Complete questionnaire and extract profile
export async function POST(
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

    // Get attendee with responses and event questions
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      include: {
        event: { select: { questions: true } }
      }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    if (!attendee.questionnaireResponses) {
      return NextResponse.json(
        { error: 'Questionnaire not started', code: 'NO_RESPONSES', retryable: false },
        { status: 400 }
      );
    }

    // Parse questions and responses
    const questions = attendee.event.questions as unknown as Question[];
    const responses = attendee.questionnaireResponses as unknown as QuestionnaireResponse[];

    // Format for extraction
    const formattedResponses = responses.map((r) => {
      const question = questions.find((q) => q.id === r.questionId);
      return {
        questionId: r.questionId,
        questionTitle: question?.title || r.questionId,
        value: r.value,
      };
    });

    const attendeeName = `${attendee.firstName} ${attendee.lastName || ''}`.trim();

    // Try AI extraction with timeout
    let profile = await extractProfileWithTimeout(attendeeName, formattedResponses, 30000);

    // Fallback if extraction fails
    if (!profile) {
      console.warn(`Profile extraction failed for ${attendeeName}, using fallback`);
      profile = createFallbackProfile(attendeeName, formattedResponses);
    }

    // Get goals and ideal connections for indexed fields
    const goalsResponse = responses.find((r) => r.questionId === 'goals');
    const idealResponse = responses.find((r) => r.questionId === 'ideal_connections');

    // Calculate profile richness for ordering
    const profileRichness = calculateProfileRichness(
      profile,
      attendee.tradingCard as Record<string, unknown> | null,
      attendee.firstName,
      attendee.lastName
    );

    // Update attendee with profile
    await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        profile,
        profileExtractedAt: new Date(),
        questionnaireCompletedAt: new Date(),
        profileRichness, // Update richness score
        // Index fields for matching
        goalsText: typeof goalsResponse?.value === 'string' ? goalsResponse.value : null,
        idealMatchText: typeof idealResponse?.value === 'string' ? idealResponse.value : null,
        experienceLevel: profile.seniority,
        expertise: profile.expertise,
        seekingKeywords: profile.seekingKeywords,
        offeringKeywords: profile.offeringKeywords,
      },
    });

    return NextResponse.json({
      success: true,
      profile,
      completeness: profile.completeness,
    });
  } catch (error) {
    console.error('Profile extraction failed:', error);

    if (error instanceof Error && error.message === 'Extraction timeout') {
      return NextResponse.json(
        { error: 'Extraction taking too long', code: 'TIMEOUT', retryable: true },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract profile', code: 'EXTRACTION_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
