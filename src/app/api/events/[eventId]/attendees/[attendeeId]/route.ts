import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess, calculateProfileRichness } from '@/lib/m33t';
import { ProfileOverridesSchema } from '@/lib/m33t/schemas';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';
import {
  mergeProfileWithOverrides,
  hasOverrides,
  getOverriddenFields,
  cleanOverrides,
} from '@/lib/m33t/profile-utils';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

// GET /api/events/[eventId]/attendees/[attendeeId]
export async function GET(request: NextRequest, context: RouteContext) {
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

    // Fetch attendee with contact and audit relations
    const attendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
          },
        },
        addedBy: { select: { id: true, name: true } },
        overridesEditedBy: { select: { id: true, name: true } },
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const profile = attendee.profile as Profile | null;
    const profileOverrides = attendee.profileOverrides as ProfileOverrides | null;
    const displayProfile = mergeProfileWithOverrides(profile, profileOverrides);

    return NextResponse.json({
      id: attendee.id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      rsvpStatus: attendee.rsvpStatus,

      // Profile data
      profile,
      profileOverrides,
      displayProfile,

      // Override metadata
      overridesEditedAt: attendee.overridesEditedAt?.toISOString() ?? null,
      hasOverrides: hasOverrides(profileOverrides),
      overriddenFields: getOverriddenFields(profileOverrides),

      // Audit info
      addedBy: attendee.addedBy,
      overridesEditedBy: attendee.overridesEditedBy,

      // Linked contact
      contact: attendee.contact,
    });
  } catch (error) {
    console.error('Error fetching attendee:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[eventId]/attendees/[attendeeId]
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Verify attendee exists
    const existingAttendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
    });

    if (!existingAttendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate incoming overrides
    const parseResult = ProfileOverridesSchema.safeParse(body.profileOverrides);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid profile overrides',
          code: 'VALIDATION_ERROR',
          retryable: false,
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Merge with existing overrides (sparse update)
    const existingOverrides = existingAttendee.profileOverrides as ProfileOverrides | null;
    const mergedOverrides = {
      ...existingOverrides,
      ...parseResult.data,
    };

    // Clean and save
    const cleanedOverrides = cleanOverrides(mergedOverrides);

    // Recalculate profile richness with the merged profile
    const baseProfile = existingAttendee.profile as Profile | null;
    const mergedProfile = mergeProfileWithOverrides(baseProfile, cleanedOverrides);
    const profileRichness = calculateProfileRichness(
      mergedProfile,
      existingAttendee.tradingCard as Record<string, unknown> | null,
      existingAttendee.firstName,
      existingAttendee.lastName
    );

    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: {
        profileOverrides: cleanedOverrides ?? undefined,
        profileRichness, // Update richness when overrides change
        overridesEditedAt: new Date(),
        overridesEditedById: user.id,  // Track who edited
      },
      include: {
        overridesEditedBy: { select: { id: true, name: true } },
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
    const profileOverrides = updatedAttendee.profileOverrides as ProfileOverrides | null;
    const displayProfile = mergeProfileWithOverrides(profile, profileOverrides);

    return NextResponse.json({
      id: updatedAttendee.id,
      firstName: updatedAttendee.firstName,
      lastName: updatedAttendee.lastName,
      email: updatedAttendee.email,
      rsvpStatus: updatedAttendee.rsvpStatus,
      profile,
      profileOverrides,
      displayProfile,
      overridesEditedAt: updatedAttendee.overridesEditedAt?.toISOString() ?? null,
      hasOverrides: hasOverrides(profileOverrides),
      overriddenFields: getOverriddenFields(profileOverrides),
      overridesEditedBy: updatedAttendee.overridesEditedBy,
      contact,
    });
  } catch (error) {
    console.error('Error updating attendee overrides:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/attendees/[attendeeId]
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

    // Verify attendee exists
    const existingAttendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
    });

    if (!existingAttendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Delete the attendee
    await prisma.eventAttendee.delete({
      where: { id: attendeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendee:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', retryable: true },
      { status: 500 }
    );
  }
}
