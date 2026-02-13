/**
 * GET /api/events/[eventId]/attendees/[attendeeId]/sms-history
 *
 * Returns SMS message history for a specific attendee.
 * Requires curate permission on the event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, checkEventAccess } from '@/lib/m33t';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check M33T access
    if (!(await checkM33tAccess(user.id))) {
      return NextResponse.json(
        { error: 'M33T access required', code: 'M33T_ACCESS_DENIED' },
        { status: 403 }
      );
    }

    // Check event access (view permission is sufficient for SMS history)
    const access = await checkEventAccess(eventId, user.id, 'view');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Verify the attendee belongs to this event
    const attendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get SMS messages for this attendee, ordered by creation date (newest first)
    const messages = await prisma.sMSMessage.findMany({
      where: {
        eventId,
        attendeeId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        messageSid: true,
        toPhone: true,
        body: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        notificationType: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        statusUpdatedAt: true,
      },
    });

    // Calculate summary stats
    const total = messages.length;
    const delivered = messages.filter((m) => m.status === 'delivered').length;
    const failed = messages.filter((m) => m.status === 'failed' || m.status === 'undelivered').length;
    const pending = messages.filter((m) => ['queued', 'sending', 'sent'].includes(m.status)).length;

    return NextResponse.json({
      attendee: {
        id: attendee.id,
        name: `${attendee.firstName} ${attendee.lastName || ''}`.trim(),
        phone: attendee.phone,
      },
      messages,
      summary: {
        total,
        delivered,
        failed,
        pending,
      },
    });
  } catch (error) {
    console.error('SMS history fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS history', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
