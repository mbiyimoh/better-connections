import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string; matchId: string }>;
};

// GET /api/events/[eventId]/matches/[matchId] - Get single match
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, matchId } = await context.params;

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

    const match = await prisma.match.findFirst({
      where: { id: matchId, eventId },
      include: {
        attendee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: true,
          },
        },
        matchedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error('Failed to fetch match:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// Schema for updating a match
const MatchUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  position: z.number().int().min(1).optional(),
  curatorNotes: z.string().optional(),
  whyMatch: z.array(z.string()).optional(),
  conversationStarters: z.array(z.string()).optional(),
});

// PUT /api/events/[eventId]/matches/[matchId] - Update match status/position/notes
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, matchId } = await context.params;

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

    // Verify match exists
    const existingMatch = await prisma.match.findFirst({
      where: { id: matchId, eventId },
    });

    if (!existingMatch) {
      return NextResponse.json(
        { error: 'Match not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = MatchUpdateSchema.parse(body);

    // Handle position reordering if position changed
    if (validatedData.position && validatedData.position !== existingMatch.position) {
      const oldPosition = existingMatch.position;
      const newPosition = validatedData.position;

      if (newPosition < oldPosition) {
        // Moving up: increment positions of matches between new and old
        await prisma.match.updateMany({
          where: {
            eventId,
            attendeeId: existingMatch.attendeeId,
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        });
      } else {
        // Moving down: decrement positions of matches between old and new
        await prisma.match.updateMany({
          where: {
            eventId,
            attendeeId: existingMatch.attendeeId,
            position: { gt: oldPosition, lte: newPosition },
          },
          data: { position: { decrement: 1 } },
        });
      }
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: validatedData,
      include: {
        attendee: {
          select: { firstName: true, lastName: true },
        },
        matchedWith: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to update match:', error);
    return NextResponse.json(
      { error: 'Failed to update match', code: 'UPDATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/matches/[matchId] - Remove a match
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, matchId } = await context.params;

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

    // Verify match exists
    const existingMatch = await prisma.match.findFirst({
      where: { id: matchId, eventId },
    });

    if (!existingMatch) {
      return NextResponse.json(
        { error: 'Match not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Delete the match
    await prisma.match.delete({
      where: { id: matchId },
    });

    // Reorder remaining matches for this attendee
    await prisma.match.updateMany({
      where: {
        eventId,
        attendeeId: existingMatch.attendeeId,
        position: { gt: existingMatch.position },
      },
      data: { position: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete match:', error);
    return NextResponse.json(
      { error: 'Failed to delete match', code: 'DELETE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
