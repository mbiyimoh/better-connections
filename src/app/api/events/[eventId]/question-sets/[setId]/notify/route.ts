import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess, generateRSVPToken } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';
import { sendEmail, generateQuestionSetEmail } from '@/lib/notifications/email';
import { sendSMS, formatPhoneE164, isValidE164, SMS_TEMPLATES } from '@/lib/notifications/sms';
import { sendWithRetry, type NotificationResult } from '@/lib/notifications/utils';

const notifySchema = z.object({
  filter: z.enum(['announce', 'all', 'not_started', 'in_progress']).optional().default('all'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'curate');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = notifySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { filter } = result.data;

  // Get the question set with event details
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          date: true,
          startTime: true,
          venueName: true,
          venueAddress: true,
        },
      },
    },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Can only notify for PUBLISHED sets
  if (questionSet.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'Can only send notifications for published question sets' },
      { status: 400 }
    );
  }

  // Build filter conditions based on notification target
  type WhereClause = {
    eventId: string;
    rsvpStatus: 'CONFIRMED';
    questionSetResponses?: {
      none?: { questionSetId: string; completedAt?: { not: null } };
      some?: { questionSetId: string; completedAt: null };
    };
  };

  const whereClause: WhereClause = {
    eventId,
    rsvpStatus: 'CONFIRMED',
  };

  if (filter === 'announce') {
    // Announce to everyone - no additional filter, all confirmed attendees
    // No questionSetResponses filter needed
  } else if (filter === 'all') {
    // All who haven't completed
    whereClause.questionSetResponses = {
      none: {
        questionSetId: setId,
        completedAt: { not: null },
      },
    };
  } else if (filter === 'not_started') {
    // No response at all
    whereClause.questionSetResponses = {
      none: { questionSetId: setId },
    };
  } else if (filter === 'in_progress') {
    // Have response but not completed
    whereClause.questionSetResponses = {
      some: {
        questionSetId: setId,
        completedAt: null,
      },
    };
  }

  const attendeesToNotify = await prisma.eventAttendee.findMany({
    where: whereClause,
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  });

  if (attendeesToNotify.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      failed: 0,
      total: 0,
      message: 'No eligible attendees for this notification',
    });
  }

  const results: NotificationResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';
  const isNewSet = filter === 'announce';

  for (const attendee of attendeesToNotify) {
    const attendeeName = `${attendee.firstName} ${attendee.lastName || ''}`.trim();
    const notificationResult: NotificationResult = {
      attendeeId: attendee.id,
      attendeeName,
      email: { success: false },
      sms: null,
    };

    try {
      // Generate RSVP token for the attendee
      const token = generateRSVPToken(eventId, attendee.email, attendee.id, questionSet.event.date);
      const rsvpBase = questionSet.event.slug ? `${baseUrl}/m33t/${questionSet.event.slug}/rsvp` : `${baseUrl}/rsvp`;
      const questionSetUrl = `${rsvpBase}/${token}/question-sets`;

      // Send email if available
      if (attendee.email) {
        const emailContent = generateQuestionSetEmail({
          attendeeName: attendee.firstName,
          event: {
            name: questionSet.event.name,
            date: questionSet.event.date,
            startTime: questionSet.event.startTime,
            venueName: questionSet.event.venueName,
            venueAddress: questionSet.event.venueAddress,
          },
          questionSetTitle: questionSet.title,
          questionSetUrl,
          isNewSet,
        });

        try {
          const emailResult = await sendWithRetry(() =>
            sendEmail({
              to: attendee.email!,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            })
          );
          notificationResult.email = emailResult;
        } catch (error) {
          notificationResult.email = {
            success: false,
            error: error instanceof Error ? error.message : 'Email send failed after retries',
          };
        }
      } else {
        notificationResult.email = { success: false, error: 'No email address' };
      }

      // Send SMS if phone is available
      if (attendee.phone) {
        const formattedPhone = formatPhoneE164(attendee.phone);

        if (isValidE164(formattedPhone)) {
          try {
            const smsResult = await sendWithRetry(() =>
              sendSMS({
                to: formattedPhone,
                body: SMS_TEMPLATES.questionSet({
                  eventName: questionSet.event.name,
                  questionSetTitle: questionSet.title,
                  url: questionSetUrl,
                  isNewSet,
                }),
              })
            );
            notificationResult.sms = smsResult;
          } catch (error) {
            notificationResult.sms = {
              success: false,
              error: error instanceof Error ? error.message : 'SMS send failed after retries',
            };
          }
        } else {
          notificationResult.sms = { success: false, error: 'Invalid phone number format' };
        }
      }

      // Update notification timestamp if at least one channel succeeded
      if (notificationResult.email.success || notificationResult.sms?.success) {
        await prisma.eventAttendee.update({
          where: { id: attendee.id },
          data: { questionSetNotifiedAt: new Date() },
        });
      }
    } catch (error) {
      notificationResult.email = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    results.push(notificationResult);
  }

  // Calculate summary
  const sent = results.filter((r) => r.email.success || r.sms?.success).length;
  const failed = results.filter((r) => !r.email.success && !r.sms?.success).length;
  const emailSent = results.filter((r) => r.email.success).length;
  const smsSent = results.filter((r) => r.sms?.success).length;

  return NextResponse.json({
    success: true,
    sent,
    failed,
    emailSent,
    smsSent,
    total: results.length,
    results: results.map((r) => ({
      attendeeId: r.attendeeId,
      name: r.attendeeName,
      emailSent: r.email.success,
      smsSent: r.sms?.success || false,
      errors: [r.email.error, r.sms?.error].filter(Boolean),
    })),
  });
}
