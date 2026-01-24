import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AutoSortSchema = z.object({
  sortBy: z.enum(['richness', 'name', 'rsvp-date']),
  pinTop: z.number().int().min(0).optional(), // Optional: pin top N after sorting
});

/**
 * POST /api/events/[eventId]/attendee-order/auto-sort
 *
 * Apply auto-sort to all attendees (clears manual ordering).
 * Requires canCurate permission.
 */
export async function POST(
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

    // Parse request body
    const body = await request.json();
    const parsed = AutoSortSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sortBy, pinTop } = parsed.data;

    // Fetch all non-declined attendees
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: { not: 'DECLINED' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileRichness: true,
        rsvpRespondedAt: true,
        createdAt: true,
      },
    });

    // Sort based on criteria
    let sorted: typeof attendees;
    switch (sortBy) {
      case 'richness':
        sorted = [...attendees].sort((a, b) =>
          (b.profileRichness ?? 0) - (a.profileRichness ?? 0)
        );
        break;
      case 'name':
        sorted = [...attendees].sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName || ''}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'rsvp-date':
        sorted = [...attendees].sort((a, b) => {
          const dateA = a.rsvpRespondedAt || a.createdAt;
          const dateB = b.rsvpRespondedAt || b.createdAt;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
        break;
      default:
        sorted = attendees;
    }

    // Build updates: pin top N or clear all
    const now = new Date();
    const updates = sorted.map((attendee, index) => {
      const shouldPin = pinTop !== undefined && index < pinTop;
      return prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          displayOrder: shouldPin ? index : null,
          orderUpdatedById: user.id,
          orderUpdatedAt: now,
        },
      });
    });

    // Execute in transaction
    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      sorted: sorted.length,
      pinned: pinTop ?? 0,
    });
  } catch (error) {
    console.error('Error auto-sorting attendees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
