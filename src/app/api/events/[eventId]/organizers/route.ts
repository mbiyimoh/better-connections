import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = { params: Promise<{ eventId: string }> };

const AddOrganizerSchema = z.object({
  userId: z.string(),
  canInvite: z.boolean().default(true),
  canCurate: z.boolean().default(true),
  canEdit: z.boolean().default(false),
  canManage: z.boolean().default(false),
});

const UpdateOrganizerSchema = z.object({
  canInvite: z.boolean().optional(),
  canCurate: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canManage: z.boolean().optional(),
});

// GET /api/events/[eventId]/organizers
export async function GET(request: NextRequest, context: RouteContext) {
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

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Check user is owner or organizer
    const event = await prisma.event.findFirst({
      where: { id: eventId },
      include: {
        organizers: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const isOwner = event.userId === user.id;
    const isOrganizer = event.organizers.some(o => o.userId === user.id);

    if (!isOwner && !isOrganizer) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    return NextResponse.json(event.organizers);
  } catch (error) {
    console.error('Failed to fetch organizers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizers', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/organizers
export async function POST(request: NextRequest, context: RouteContext) {
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

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Only owner can add organizers
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = AddOrganizerSchema.parse(body);

    // Prevent adding self
    if (data.userId === user.id) {
      return NextResponse.json(
        { error: 'You are already the event owner', code: 'SELF_ADD', retryable: false },
        { status: 400 }
      );
    }

    // Check target user has M33T access
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, hasM33tAccess: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    if (!targetUser.hasM33tAccess) {
      return NextResponse.json(
        { error: 'This user does not have M33T access', code: 'NO_M33T_ACCESS', retryable: false },
        { status: 400 }
      );
    }

    // Check if already an organizer
    const existing = await prisma.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId, userId: data.userId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User is already an organizer', code: 'ALREADY_ORGANIZER', retryable: false },
        { status: 400 }
      );
    }

    // Create organizer
    const organizer = await prisma.eventOrganizer.create({
      data: {
        eventId,
        userId: data.userId,
        canInvite: data.canInvite,
        canCurate: data.canCurate,
        canEdit: data.canEdit,
        canManage: data.canManage,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(organizer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to add organizer:', error);
    return NextResponse.json(
      { error: 'Failed to add organizer', code: 'ADD_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]/organizers - Update organizer permissions
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get('id');

    if (!organizerId) {
      return NextResponse.json(
        { error: 'Organizer ID required', code: 'MISSING_ID', retryable: false },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Only owner can update organizer permissions
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = UpdateOrganizerSchema.parse(body);

    const updated = await prisma.eventOrganizer.update({
      where: { id: organizerId },
      data,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to update organizer:', error);
    return NextResponse.json(
      { error: 'Failed to update organizer', code: 'UPDATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/organizers - Remove organizer
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get('id');

    if (!organizerId) {
      return NextResponse.json(
        { error: 'Organizer ID required', code: 'MISSING_ID', retryable: false },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Only owner can remove organizers
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    await prisma.eventOrganizer.delete({
      where: { id: organizerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove organizer:', error);
    return NextResponse.json(
      { error: 'Failed to remove organizer', code: 'DELETE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
