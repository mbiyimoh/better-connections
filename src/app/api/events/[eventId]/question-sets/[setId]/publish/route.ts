import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess, generateRSVPToken } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';
import { sendEmail, generateQuestionSetEmail } from '@/lib/notifications/email';
import { sendSMS, formatPhoneE164, isValidE164, SMS_TEMPLATES } from '@/lib/notifications/sms';
import { sendWithRetry, type NotificationResult } from '@/lib/notifications/utils';

const publishSchema = z.object({
  notifyAttendees: z.boolean(),
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

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = publishSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { notifyAttendees } = result.data;

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

  // Can only publish DRAFT sets
  if (questionSet.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only DRAFT question sets can be published' },
      { status: 400 }
    );
  }

  // Check if there are questions
  const questions = questionSet.questions as unknown[];
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: 'Cannot publish a question set with no questions' },
      { status: 400 }
    );
  }

  // Publish the set
  const updatedSet = await prisma.questionSet.update({
    where: { id: setId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  let sent = 0;
  let failed = 0;
  const results: NotificationResult[] = [];

  if (notifyAttendees) {
    // Get confirmed attendees who haven't completed this set
    const attendeesToNotify = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        questionSetResponses: {
          none: {
            questionSetId: setId,
            completedAt: { not: null },
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';

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
            isNewSet: true, // Always true for publish notifications
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
                    isNewSet: true,
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
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        notificationResult.email = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        failed++;
      }

      results.push(notificationResult);
    }
  }

  // Calculate email/SMS specific counts
  const emailSent = results.filter((r) => r.email.success).length;
  const smsSent = results.filter((r) => r.sms?.success).length;

  return NextResponse.json({
    success: true,
    questionSet: updatedSet,
    ...(notifyAttendees && {
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
    }),
  });
}
