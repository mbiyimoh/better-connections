import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEventAccess } from '@/lib/m33t';
import type { Profile } from '@/lib/m33t/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/attendee-order
 *
 * Returns all attendees in master order (regardless of RSVP status).
 * Requires canCurate permission.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch all non-declined attendees with ordering fields
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: { not: 'DECLINED' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rsvpStatus: true,
        displayOrder: true,
        profileRichness: true,
        createdAt: true,
        profile: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { profileRichness: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Transform to response format
    const transformedAttendees = attendees.map((a) => {
      const profile = a.profile as Profile | null;
      return {
        id: a.id,
        name: `${a.firstName}${a.lastName ? ' ' + a.lastName : ''}`,
        email: a.email,
        rsvpStatus: a.rsvpStatus,
        displayOrder: a.displayOrder,
        profileRichness: a.profileRichness,
        profile: {
          role: profile?.role,
          company: profile?.company,
        },
      };
    });

    // Calculate stats
    const pinned = attendees.filter((a) => a.displayOrder !== null).length;
    const autoSorted = attendees.length - pinned;

    return NextResponse.json({
      attendees: transformedAttendees,
      stats: {
        total: attendees.length,
        pinned,
        autoSorted,
      },
    });
  } catch (error) {
    console.error('Error fetching attendee order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Request body schema for PUT
const UpdateOrderSchema = z.object({
  orders: z.array(z.object({
    attendeeId: z.string(),
    displayOrder: z.number().int().min(0).nullable(), // Non-negative when set
  })),
});

/**
 * PUT /api/events/[eventId]/attendee-order
 *
 * Update the display order for multiple attendees.
 * Requires canCurate permission.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { orders } = parsed.data;

    // Verify all attendees belong to this event
    const attendeeIds = orders.map((o) => o.attendeeId);
    const existingAttendees = await prisma.eventAttendee.findMany({
      where: {
        id: { in: attendeeIds },
        eventId,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingAttendees.map((a) => a.id));
    const invalidIds = attendeeIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some attendees not found in this event', invalidIds },
        { status: 400 }
      );
    }

    // Update all attendees in a transaction
    const now = new Date();
    await prisma.$transaction(
      orders.map((order) =>
        prisma.eventAttendee.update({
          where: { id: order.attendeeId },
          data: {
            displayOrder: order.displayOrder,
            orderUpdatedById: user.id,
            orderUpdatedAt: now,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: orders.length });
  } catch (error) {
    console.error('Error updating attendee order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
