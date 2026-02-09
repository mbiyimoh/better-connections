import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const PreviewQuerySchema = z.object({
  type: z.enum(['new_rsvps']),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Validate query params
    const validation = PreviewQuerySchema.safeParse({ type });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid type parameter', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }

    // Auth checks
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

    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    // Get all CONFIRMED attendees with phone numbers
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        phone: { not: null },
        rsvpRespondedAt: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rsvpRespondedAt: true,
        newRsvpsNotifiedAt: true,
      },
    });

    // Build attendee list with eligibility info
    const attendeeList: Array<{
      id: string;
      name: string;
      newRsvpCount: number;
      isEligible: boolean;
    }> = [];

    let eligibleCount = 0;
    let skippedCount = 0;
    let sampleNewCount = 0;
    let lastSentAt: Date | null = null;

    for (const attendee of attendees) {
      // Track most recent notification sent
      if (attendee.newRsvpsNotifiedAt) {
        if (!lastSentAt || attendee.newRsvpsNotifiedAt > lastSentAt) {
          lastSentAt = attendee.newRsvpsNotifiedAt;
        }
      }

      // Skip attendees without RSVP timestamp (defensive - query filters for not null)
      if (!attendee.rsvpRespondedAt) {
        skippedCount++;
        continue;
      }

      // Count new RSVPs for this attendee
      const newRsvpCount = await prisma.eventAttendee.count({
        where: {
          eventId,
          rsvpStatus: 'CONFIRMED',
          rsvpRespondedAt: { gt: attendee.rsvpRespondedAt },
          id: { not: attendee.id },
        },
      });

      const isEligible = newRsvpCount > 0;
      const name = `${attendee.firstName} ${attendee.lastName || ''}`.trim();

      attendeeList.push({
        id: attendee.id,
        name,
        newRsvpCount,
        isEligible,
      });

      if (isEligible) {
        eligibleCount++;
        if (sampleNewCount === 0) {
          sampleNewCount = newRsvpCount;
        }
      } else {
        skippedCount++;
      }
    }

    // Sort: eligible first (by newRsvpCount desc), then ineligible
    attendeeList.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.newRsvpCount - a.newRsvpCount;
    });

    return NextResponse.json({
      eligibleCount,
      skippedCount,
      sampleNewCount,
      lastSentAt: lastSentAt?.toISOString() || null,
      attendees: attendeeList,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR', retryable: true },
      { status: 500 }
    );
  }
}
