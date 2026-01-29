import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import type { ProfileSuggestion } from '@/lib/m33t/suggestion-schema';

type RouteContext = {
  params: Promise<{ token: string; setId: string }>;
};

const applyRequestSchema = z.object({
  acceptedSuggestionIndices: z.array(z.number().int().min(0)),
});

// POST /api/rsvp/[token]/question-sets/[setId]/apply-suggestions - Apply accepted suggestions
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
    const result = applyRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_ERROR', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { acceptedSuggestionIndices } = result.data;

    // Get the response record with suggestions
    const responseRecord = await prisma.questionSetResponse.findUnique({
      where: {
        questionSetId_attendeeId: {
          questionSetId: setId,
          attendeeId: attendee.id,
        },
      },
    });

    if (!responseRecord) {
      return NextResponse.json(
        { error: 'No responses found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Must be completed
    if (!responseRecord.completedAt) {
      return NextResponse.json(
        { error: 'Please complete the question set first', code: 'NOT_COMPLETED', retryable: false },
        { status: 400 }
      );
    }

    const suggestions = responseRecord.suggestions as unknown as ProfileSuggestion[] | null;
    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No suggestions to apply', code: 'NO_SUGGESTIONS', retryable: false },
        { status: 400 }
      );
    }

    // Validate indices
    const invalidIndices = acceptedSuggestionIndices.filter(
      (i) => i < 0 || i >= suggestions.length
    );
    if (invalidIndices.length > 0) {
      return NextResponse.json(
        { error: 'Invalid suggestion indices', code: 'INVALID_INDICES', invalidIndices },
        { status: 400 }
      );
    }

    // Get accepted suggestions (filter out any undefined values)
    const acceptedSuggestions = acceptedSuggestionIndices
      .map((i) => suggestions[i])
      .filter((s): s is ProfileSuggestion => s !== undefined);

    // Apply suggestions to profile
    const currentProfile = (attendee.profile as Record<string, unknown>) || {};
    const updatedProfile = applyProfileSuggestions(currentProfile, acceptedSuggestions);

    // Update attendee profile
    await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        profile: updatedProfile as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      appliedCount: acceptedSuggestions.length,
      updatedFields: acceptedSuggestions.map((s) => s.field),
    });
  } catch (error) {
    console.error('Failed to apply suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to apply suggestions', code: 'APPLY_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

/**
 * Apply profile suggestions to a profile object
 */
function applyProfileSuggestions(
  profile: Record<string, unknown>,
  suggestions: ProfileSuggestion[]
): Record<string, unknown> {
  const updated = { ...profile };

  for (const suggestion of suggestions) {
    const { field, action, suggestedValue } = suggestion;

    switch (action) {
      case 'add': {
        // Append to array
        const current = updated[field];
        if (Array.isArray(current)) {
          if (Array.isArray(suggestedValue)) {
            updated[field] = [...current, ...suggestedValue];
          } else {
            updated[field] = [...current, suggestedValue];
          }
        } else if (current === null || current === undefined) {
          updated[field] = Array.isArray(suggestedValue) ? suggestedValue : [suggestedValue];
        } else {
          // Current is a single value, convert to array
          updated[field] = Array.isArray(suggestedValue)
            ? [current, ...suggestedValue]
            : [current, suggestedValue];
        }
        break;
      }

      case 'update':
      case 'replace': {
        // Direct replacement
        updated[field] = suggestedValue;
        break;
      }
    }
  }

  return updated;
}
