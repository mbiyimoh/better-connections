import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

// GET /api/events/[eventId]/matches - List all matches for an event
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const attendeeId = searchParams.get('attendeeId');

    const matches = await prisma.match.findMany({
      where: {
        eventId,
        ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVEALED' } : {}),
        ...(attendeeId ? { attendeeId } : {}),
      },
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
      orderBy: [{ attendeeId: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// Schema for creating a manual match
const ManualMatchSchema = z.object({
  attendeeId: z.string().min(1),
  matchedWithId: z.string().min(1),
  position: z.number().int().min(1).optional(),
  curatorNotes: z.string().optional(),
});

// POST /api/events/[eventId]/matches - Add a manual match
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

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

    const body = await request.json();
    const validatedData = ManualMatchSchema.parse(body);

    // Verify both attendees exist and belong to this event
    const [attendee, matchedWith] = await Promise.all([
      prisma.eventAttendee.findFirst({
        where: { id: validatedData.attendeeId, eventId },
      }),
      prisma.eventAttendee.findFirst({
        where: { id: validatedData.matchedWithId, eventId },
      }),
    ]);

    if (!attendee || !matchedWith) {
      return NextResponse.json(
        { error: 'One or both attendees not found in this event', code: 'ATTENDEE_NOT_FOUND', retryable: false },
        { status: 400 }
      );
    }

    // Check if match already exists
    const existingMatch = await prisma.match.findUnique({
      where: {
        eventId_attendeeId_matchedWithId: {
          eventId,
          attendeeId: validatedData.attendeeId,
          matchedWithId: validatedData.matchedWithId,
        },
      },
    });

    if (existingMatch) {
      return NextResponse.json(
        { error: 'Match already exists', code: 'DUPLICATE', retryable: false },
        { status: 409 }
      );
    }

    // Get the highest position for this attendee
    const highestPosition = await prisma.match.findFirst({
      where: { eventId, attendeeId: validatedData.attendeeId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const match = await prisma.match.create({
      data: {
        eventId,
        attendeeId: validatedData.attendeeId,
        matchedWithId: validatedData.matchedWithId,
        position: validatedData.position || (highestPosition?.position || 0) + 1,
        score: 0, // Manual matches don't have algorithm scores
        whyMatch: ['Manually added by organizer'],
        conversationStarters: [],
        status: 'APPROVED', // Manual matches are pre-approved
        isManual: true,
        curatorNotes: validatedData.curatorNotes,
      },
      include: {
        attendee: {
          select: { firstName: true, lastName: true },
        },
        matchedWith: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to create match:', error);
    return NextResponse.json(
      { error: 'Failed to create match', code: 'CREATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
