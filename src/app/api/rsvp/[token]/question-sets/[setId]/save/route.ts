import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';

type RouteContext = {
  params: Promise<{ token: string; setId: string }>;
};

const saveResponsesSchema = z.object({
  responses: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
      context: z.string().optional(),
    })
  ),
});

// POST /api/rsvp/[token]/question-sets/[setId]/save - Auto-save responses
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

    // Parse and validate body
    const body = await request.json();
    const result = saveResponsesSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_ERROR', details: result.error.flatten() },
        { status: 400 }
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

    // Don't allow saving to already completed sets
    if (existingResponse?.completedAt) {
      return NextResponse.json(
        { error: 'Question set already completed', code: 'ALREADY_COMPLETED', retryable: false },
        { status: 400 }
      );
    }

    // Type for stored responses
    interface StoredResponse {
      questionId: string;
      value: string | number | string[];
      context?: string;
      answeredAt: string;
    }

    const existingResponses = existingResponse?.responses;
    const existingArray: StoredResponse[] = Array.isArray(existingResponses)
      ? (existingResponses as unknown as StoredResponse[])
      : [];

    // Merge new responses with existing (update if questionId matches)
    const newResponses = result.data.responses;
    const mergedResponses: StoredResponse[] = [...existingArray];

    for (const newResp of newResponses) {
      const existingIdx = mergedResponses.findIndex(
        (r) => r.questionId === newResp.questionId
      );

      const responseWithTimestamp: StoredResponse = {
        ...newResp,
        answeredAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        mergedResponses[existingIdx] = responseWithTimestamp;
      } else {
        mergedResponses.push(responseWithTimestamp);
      }
    }

    // Upsert the response record
    await prisma.questionSetResponse.upsert({
      where: {
        questionSetId_attendeeId: {
          questionSetId: setId,
          attendeeId: attendee.id,
        },
      },
      create: {
        questionSetId: setId,
        attendeeId: attendee.id,
        responses: mergedResponses as unknown as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
      update: {
        responses: mergedResponses as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      saved: newResponses.length,
    });
  } catch (error) {
    console.error('Failed to save responses:', error);
    return NextResponse.json(
      { error: 'Failed to save responses', code: 'SAVE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
