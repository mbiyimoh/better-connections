import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRSVPToken, checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

/**
 * GET /api/events/[eventId]/attendees/[attendeeId]/invite-link
 *
 * Generates a unique RSVP invite link for an attendee WITHOUT sending any notification.
 * This allows organizers to copy the link and send it manually with a personalized message.
 *
 * Returns: { token, url, expiresAt, attendee: { firstName, lastName, email, phone } }
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;

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

    // Get event and attendee
    const event = await prisma.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        id: attendeeId,
        eventId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Generate RSVP token
    const token = generateRSVPToken(eventId, attendee.email, attendee.id, event.date);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';
    const url = `${baseUrl}/rsvp/${token}`;

    // Calculate expiration (tokens are valid until event date + 24 hours)
    const expiresAt = new Date(event.date);
    expiresAt.setDate(expiresAt.getDate() + 1);

    return NextResponse.json({
      success: true,
      token,
      url,
      expiresAt: expiresAt.toISOString(),
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        phone: attendee.phone,
      },
      eventName: event.name,
    });
  } catch (error) {
    console.error('Invite link generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link', code: 'GENERATION_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
