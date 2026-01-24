import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEventAccess, calculateProfileRichness } from '@/lib/m33t';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[eventId]/attendees/recalculate-richness
 *
 * Recalculate profileRichness for all attendees of an event.
 * Useful after bulk imports or schema changes.
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

    // Fetch all attendees with profile data
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: true,
        profileOverrides: true,
        tradingCard: true,
      },
    });

    if (attendees.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No attendees to recalculate',
      });
    }

    // Calculate richness for each attendee
    const updates = attendees.map((attendee) => {
      const baseProfile = attendee.profile as Profile | null;
      const overrides = attendee.profileOverrides as ProfileOverrides | null;
      const displayProfile = mergeProfileWithOverrides(baseProfile, overrides);

      const richness = calculateProfileRichness(
        displayProfile,
        attendee.tradingCard as Record<string, unknown> | null,
        attendee.firstName,
        attendee.lastName
      );

      return prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: { profileRichness: richness },
      });
    });

    // Execute in transaction
    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      updated: attendees.length,
    });
  } catch (error) {
    console.error('Error recalculating richness:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
