import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { RSVPResponseSchema } from '@/lib/m33t/schemas';
import { z } from 'zod';
import { normalizePhone } from '@/lib/phone';

type RouteContext = {
  params: Promise<{ token: string }>;
};

// POST /api/rsvp/[token]/respond - Submit RSVP response
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
    const validatedData = RSVPResponseSchema.parse(body);

    // Verify attendee exists and belongs to the event
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        id: payload.attendeeId,
        eventId: payload.eventId,
        email: payload.email,
      },
      include: {
        event: { select: { status: true } }
      }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Check event is still accepting RSVPs
    if (attendee.event.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Event has been cancelled', code: 'EVENT_CANCELLED', retryable: false },
        { status: 410 }
      );
    }

    // Normalize phone to E.164 if provided
    let formattedPhone: string | undefined = validatedData.phone;
    if (formattedPhone) {
      const normalized = normalizePhone(formattedPhone);
      if (!normalized) {
        return NextResponse.json(
          { error: 'Please enter a valid phone number', code: 'INVALID_PHONE', retryable: false },
          { status: 400 }
        );
      }
      formattedPhone = normalized;
    }

    // Update attendee status
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: payload.attendeeId },
      data: {
        rsvpStatus: validatedData.status,
        rsvpRespondedAt: new Date(),
        ...(formattedPhone ? { phone: formattedPhone } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedAttendee.rsvpStatus,
      nextStep: validatedData.status === 'CONFIRMED' ? 'questionnaire' : null,
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
    console.error('Failed to submit RSVP:', error);
    return NextResponse.json(
      { error: 'Failed to submit RSVP', code: 'SUBMIT_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
