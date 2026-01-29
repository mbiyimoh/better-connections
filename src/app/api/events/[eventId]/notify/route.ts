import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendSMS, formatPhoneE164, isValidE164, SMS_TEMPLATES } from '@/lib/notifications/sms';
import {
  sendEmail,
  generateInvitationEmail,
  generateMatchRevealEmail,
  generateReminderEmail,
} from '@/lib/notifications/email';
import { generateRSVPToken, checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import type { RSVPStatus } from '@prisma/client';
import type { Profile } from '@/lib/m33t/schemas';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const NotifyRequestSchema = z.object({
  type: z.enum(['invitation', 'rsvp_reminder', 'match_reveal', 'event_reminder']),
  attendeeIds: z.array(z.string()).optional(), // If not provided, sends to all eligible
  channels: z.enum(['email', 'sms', 'both', 'none']).optional().default('both'), // Which channels to use
});

interface NotificationResult {
  attendeeId: string;
  attendeeName: string;
  email: { success: boolean; error?: string };
  sms: { success: boolean; error?: string } | null;
}

// POST /api/events/[eventId]/notify - Trigger batch notifications
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

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

    const event = await prisma.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        venueName: true,
        venueAddress: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, attendeeIds, channels } = NotifyRequestSchema.parse(body);

    // Handle 'none' channel - just mark timestamps without sending (for link copy)
    if (channels === 'none') {
      const attendees = await getEligibleAttendees(eventId, type, attendeeIds);

      // Mark all attendees with notification timestamps without sending
      for (const attendee of attendees) {
        await updateNotificationTimestamp(attendee.id, type, 'LINK_COPIED');
      }

      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        emailSent: 0,
        smsSent: 0,
        total: attendees.length,
        channels: 'none',
        results: attendees.map((a) => ({
          attendeeId: a.id,
          name: `${a.firstName} ${a.lastName || ''}`.trim(),
          emailSent: false,
          smsSent: false,
          errors: [],
        })),
      });
    }

    // Get eligible attendees based on notification type
    const attendees = await getEligibleAttendees(eventId, type, attendeeIds);

    if (attendees.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: 0,
        message: 'No eligible attendees for this notification type',
      });
    }

    const results: NotificationResult[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';

    for (const attendee of attendees) {
      const attendeeName = `${attendee.firstName} ${attendee.lastName || ''}`.trim();
      const result: NotificationResult = {
        attendeeId: attendee.id,
        attendeeName,
        email: { success: false },
        sms: null,
      };

      try {
        // Generate RSVP token and URL for this attendee
        const token = generateRSVPToken(eventId, attendee.email, attendee.id, event.date);
        const rsvpUrl = `${baseUrl}/rsvp/${token}`;

        // Build email content based on type
        let emailContent: { subject: string; html: string; text: string };

        switch (type) {
          case 'invitation':
          case 'rsvp_reminder':
            emailContent = generateInvitationEmail({
              attendeeName,
              event: {
                name: event.name,
                date: event.date,
                startTime: event.startTime,
                venueName: event.venueName,
                venueAddress: event.venueAddress,
              },
              rsvpUrl,
            });
            break;

          case 'match_reveal':
            const matches = await getAttendeeMatches(attendee.id);
            const viewUrl = `${baseUrl}/rsvp/${token}/matches`;
            emailContent = generateMatchRevealEmail({
              attendeeName,
              event: {
                name: event.name,
                date: event.date,
                startTime: event.startTime,
                venueName: event.venueName,
                venueAddress: event.venueAddress,
              },
              matches: matches.map((m) => ({
                name: `${m.matchedWith.firstName} ${m.matchedWith.lastName || ''}`.trim(),
                role: (m.matchedWith.profile as Profile | null)?.role || null,
                company: (m.matchedWith.profile as Profile | null)?.company || null,
                whyMatch: m.whyMatch,
              })),
              viewUrl,
            });
            break;

          case 'event_reminder':
            const matchCount = await prisma.match.count({
              where: { attendeeId: attendee.id, status: 'APPROVED' },
            });
            const reminderViewUrl = `${baseUrl}/rsvp/${token}/matches`;
            emailContent = generateReminderEmail({
              attendeeName,
              event: {
                name: event.name,
                date: event.date,
                startTime: event.startTime,
                venueName: event.venueName,
                venueAddress: event.venueAddress,
              },
              matchCount,
              viewUrl: reminderViewUrl,
            });
            break;
        }

        // Send email only if channels includes email and attendee has an email address
        const shouldSendEmail = channels === 'email' || channels === 'both';
        if (shouldSendEmail && attendee.email) {
          const emailResult = await sendEmail({
            to: attendee.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          result.email = emailResult;
        } else if (shouldSendEmail && !attendee.email) {
          result.email = { success: false, error: 'No email address' };
        } else {
          result.email = { success: false, error: 'Email channel not selected' };
        }

        // Send SMS if channels includes sms and phone is available
        const shouldSendSms = channels === 'sms' || channels === 'both';
        if (shouldSendSms && attendee.phone) {
          const formattedPhone = formatPhoneE164(attendee.phone);

          if (isValidE164(formattedPhone)) {
            let smsBody: string;

            switch (type) {
              case 'invitation':
                smsBody = SMS_TEMPLATES.invitation({ eventName: event.name, rsvpUrl });
                break;
              case 'rsvp_reminder':
                smsBody = SMS_TEMPLATES.rsvpReminder({ eventName: event.name, rsvpUrl });
                break;
              case 'match_reveal':
                const smsMatchCount = await prisma.match.count({
                  where: { attendeeId: attendee.id, status: 'APPROVED' },
                });
                const smsViewUrl = `${baseUrl}/rsvp/${token}/matches`;
                smsBody = SMS_TEMPLATES.matchReveal({
                  eventName: event.name,
                  matchCount: smsMatchCount,
                  viewUrl: smsViewUrl,
                });
                break;
              case 'event_reminder':
                smsBody = SMS_TEMPLATES.eventReminder({
                  eventName: event.name,
                  time: event.startTime,
                  venue: event.venueName,
                });
                break;
            }

            const smsResult = await sendSMS({ to: formattedPhone, body: smsBody });
            result.sms = smsResult;
          } else {
            result.sms = { success: false, error: 'Invalid phone number format' };
          }
        } else if (shouldSendSms && !attendee.phone) {
          result.sms = { success: false, error: 'No phone number' };
        }

        // Update notification timestamp with method tracking for invitations
        const inviteMethod =
          channels === 'both' ? 'BOTH' : channels === 'email' ? 'EMAIL' : channels === 'sms' ? 'SMS' : undefined;
        await updateNotificationTimestamp(attendee.id, type, inviteMethod);
      } catch (error) {
        result.email = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      results.push(result);
    }

    // Calculate summary based on selected channels
    const emailSent = results.filter((r) => r.email.success).length;
    const smsSent = results.filter((r) => r.sms?.success).length;

    // 'sent' = at least one channel succeeded per attendee
    const sent = results.filter((r) => r.email.success || r.sms?.success).length;
    const failed = results.filter((r) => !r.email.success && !r.sms?.success).length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      emailSent,
      smsSent,
      total: results.length,
      channels, // Include selected channels in response
      results: results.map((r) => ({
        attendeeId: r.attendeeId,
        name: r.attendeeName,
        emailSent: r.email.success,
        smsSent: r.sms?.success || false,
        errors: [r.email.error, r.sms?.error].filter(Boolean),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Notification send failed:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', code: 'SEND_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

/**
 * Get attendees eligible for a specific notification type
 */
async function getEligibleAttendees(
  eventId: string,
  type: 'invitation' | 'rsvp_reminder' | 'match_reveal' | 'event_reminder',
  specificIds?: string[]
) {
  const selectFields = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
  } as const;

  switch (type) {
    case 'invitation':
      // Send to attendees who haven't received an invite yet
      return prisma.eventAttendee.findMany({
        where: {
          eventId,
          ...(specificIds ? { id: { in: specificIds } } : {}),
          inviteSentAt: null,
        },
        select: selectFields,
      });

    case 'rsvp_reminder':
      // Send to PENDING attendees who have been invited but haven't responded
      return prisma.eventAttendee.findMany({
        where: {
          eventId,
          ...(specificIds ? { id: { in: specificIds } } : {}),
          rsvpStatus: 'PENDING' as RSVPStatus,
          inviteSentAt: { not: null },
          rsvpReminderSentAt: null,
        },
        select: selectFields,
      });

    case 'match_reveal':
      // Send to CONFIRMED attendees with approved matches who haven't received reveal
      return prisma.eventAttendee.findMany({
        where: {
          eventId,
          ...(specificIds ? { id: { in: specificIds } } : {}),
          rsvpStatus: 'CONFIRMED' as RSVPStatus,
          matchRevealSentAt: null,
          // Has at least one approved match
          matches: {
            some: { status: 'APPROVED' },
          },
        },
        select: selectFields,
      });

    case 'event_reminder':
      // Send to CONFIRMED attendees who haven't received event reminder
      return prisma.eventAttendee.findMany({
        where: {
          eventId,
          ...(specificIds ? { id: { in: specificIds } } : {}),
          rsvpStatus: 'CONFIRMED' as RSVPStatus,
          eventReminderSentAt: null,
        },
        select: selectFields,
      });
  }
}

/**
 * Get approved matches for an attendee
 */
async function getAttendeeMatches(attendeeId: string) {
  return prisma.match.findMany({
    where: {
      attendeeId,
      status: 'APPROVED',
    },
    include: {
      matchedWith: {
        select: {
          firstName: true,
          lastName: true,
          profile: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  });
}

/**
 * Update the notification timestamp for an attendee
 */
async function updateNotificationTimestamp(
  attendeeId: string,
  type: 'invitation' | 'rsvp_reminder' | 'match_reveal' | 'event_reminder',
  inviteMethod?: 'EMAIL' | 'SMS' | 'BOTH' | 'LINK_COPIED'
) {
  const timestampField = {
    invitation: 'inviteSentAt',
    rsvp_reminder: 'rsvpReminderSentAt',
    match_reveal: 'matchRevealSentAt',
    event_reminder: 'eventReminderSentAt',
  }[type];

  const updateData: { [key: string]: Date | string } = {
    [timestampField]: new Date(),
  };

  // Track invite method for invitation type only
  if (type === 'invitation' && inviteMethod) {
    updateData.inviteMethod = inviteMethod;
  }

  await prisma.eventAttendee.update({
    where: { id: attendeeId },
    data: updateData,
  });
}
