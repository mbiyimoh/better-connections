import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { QuestionnaireResponseSchema } from '@/lib/m33t/schemas';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ token: string }>;
};

const SaveRequestSchema = z.object({
  responses: z.array(QuestionnaireResponseSchema),
  isComplete: z.boolean().optional(),
});

// POST /api/rsvp/[token]/questionnaire/save - Auto-save responses
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

    const body = await request.json();
    const validatedData = SaveRequestSchema.parse(body);

    // Verify attendee exists and has confirmed RSVP
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        id: payload.attendeeId,
        eventId: payload.eventId,
        email: payload.email,
        rsvpStatus: 'CONFIRMED',
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found or RSVP not confirmed', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Update questionnaire responses
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: payload.attendeeId },
      data: {
        questionnaireResponses: validatedData.responses,
        ...(validatedData.isComplete ? { questionnaireCompletedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      saved: validatedData.responses.length,
      completed: !!updatedAttendee.questionnaireCompletedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const firstIssue = zodError.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to save questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to save questionnaire', code: 'SAVE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
