import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess, calculateProfileRichness } from '@/lib/m33t';
import type { Profile } from '@/lib/m33t/schemas';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

// DELETE /api/events/[eventId]/attendees/[attendeeId]/overrides
// Resets all profile overrides for an attendee
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;
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

    // Verify event access (owner or co-organizer with curate permission)
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    // Fetch attendee to get profile and tradingCard for richness calculation
    const existingAttendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
    });

    if (!existingAttendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Recalculate richness with base profile (no overrides)
    const baseProfile = existingAttendee.profile as Profile | null;
    const profileRichness = calculateProfileRichness(
      baseProfile,
      existingAttendee.tradingCard as Record<string, unknown> | null,
      existingAttendee.firstName,
      existingAttendee.lastName
    );

    // Reset overrides and update richness
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        profileOverrides: undefined,
        profileRichness, // Recalculate with base profile
        overridesEditedAt: null,
        overridesEditedById: null,  // Clear audit trail when resetting
      },
    });

    // Fetch contact separately if linked
    const contact = updatedAttendee.contactId
      ? await prisma.contact.findUnique({
          where: { id: updatedAttendee.contactId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
          },
        })
      : null;

    const profile = updatedAttendee.profile as Profile | null;

    return NextResponse.json({
      id: updatedAttendee.id,
      firstName: updatedAttendee.firstName,
      lastName: updatedAttendee.lastName,
      email: updatedAttendee.email,
      rsvpStatus: updatedAttendee.rsvpStatus,
      profile,
      profileOverrides: null,
      displayProfile: profile, // No overrides, display equals base
      overridesEditedAt: null,
      overridesEditedBy: null,
      hasOverrides: false,
      overriddenFields: [],
      contact,
    });
  } catch (error) {
    console.error('Error resetting overrides:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}
