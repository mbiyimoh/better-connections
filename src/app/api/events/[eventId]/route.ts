import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EventUpdateSchema, checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

// GET /api/events/[eventId]
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Check event access (owner or co-organizer with view permission)
    const access = await checkEventAccess(eventId, user.id, 'view');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or access denied', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId },
      include: {
        attendees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            rsvpStatus: true,
            questionnaireCompletedAt: true,
            profile: true,
            profileOverrides: true,
            overridesEditedAt: true,
            contactId: true,
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                primaryEmail: true,
                title: true,
                company: true,
                expertise: true,
                interests: true,
                whyNow: true,
              }
            },
            addedBy: { select: { id: true, name: true } },
            overridesEditedBy: { select: { id: true, name: true } },
          }
        },
        matches: true,
        _count: {
          select: {
            attendees: true,
            matches: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Check event access (owner or co-organizer with edit permission)
    const access = await checkEventAccess(eventId, user.id, 'edit');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = EventUpdateSchema.parse(body);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: validatedData,
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const firstIssue = zodError.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', code: 'UPDATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Verify ownership
    const existing = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Cascade delete handles attendees and matches
    await prisma.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', code: 'DELETE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
