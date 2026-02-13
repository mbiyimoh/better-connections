/**
 * POST /api/events/[eventId]/sms/[messageId]/retry
 *
 * Retry sending a failed SMS message.
 * Creates a new SMSMessage record and sends via Twilio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, checkEventAccess } from '@/lib/m33t';
import { sendTrackedSMS, type NotificationType } from '@/lib/notifications/sms';
import { isPermanentError } from '@/lib/notifications/sms-error-codes';

type RouteContext = {
  params: Promise<{ eventId: string; messageId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, messageId } = await context.params;

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

    // Check event access (curate permission required for retry)
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get the original message
    const originalMessage = await prisma.sMSMessage.findFirst({
      where: { id: messageId, eventId },
      include: {
        attendee: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if this is a retriable status
    const retriableStatuses = ['failed', 'undelivered'];
    if (!retriableStatuses.includes(originalMessage.status)) {
      return NextResponse.json(
        { error: 'Message is not in a failed state', code: 'NOT_RETRIABLE' },
        { status: 400 }
      );
    }

    // Check if error is permanent (retry won't help)
    if (isPermanentError(originalMessage.errorCode)) {
      return NextResponse.json(
        {
          error: 'This error is permanent and cannot be resolved by retrying',
          code: 'PERMANENT_ERROR',
          errorCode: originalMessage.errorCode,
        },
        { status: 400 }
      );
    }

    // Verify attendee still has a valid phone number
    if (!originalMessage.attendee?.phone) {
      return NextResponse.json(
        { error: 'Attendee no longer has a phone number', code: 'NO_PHONE' },
        { status: 400 }
      );
    }

    // Verify we have the message body
    if (!originalMessage.body) {
      return NextResponse.json(
        { error: 'Original message content not available', code: 'NO_BODY' },
        { status: 400 }
      );
    }

    // Check if a recent retry already exists (within last 60 seconds)
    // Prevents duplicate sends from rapid retry clicks
    const recentRetry = await prisma.sMSMessage.findFirst({
      where: {
        eventId,
        attendeeId: originalMessage.attendeeId,
        notificationType: originalMessage.notificationType,
        body: originalMessage.body,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last 60 seconds
        },
        status: {
          in: ['queued', 'sending', 'sent'],
        },
        id: {
          not: messageId, // Exclude the original message
        },
      },
    });

    if (recentRetry) {
      return NextResponse.json(
        {
          error: 'A retry for this message is already in progress',
          code: 'RETRY_IN_PROGRESS',
          existingMessageId: recentRetry.messageSid,
        },
        { status: 429 }
      );
    }

    // Send the retry
    const result = await sendTrackedSMS({
      to: originalMessage.attendee.phone,
      body: originalMessage.body,
      eventId,
      attendeeId: originalMessage.attendeeId,
      notificationType: originalMessage.notificationType as NotificationType,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Retry failed',
          code: 'RETRY_FAILED',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Retry sent successfully',
      newMessageId: result.messageId,
      attendee: {
        id: originalMessage.attendee.id,
        name: `${originalMessage.attendee.firstName} ${originalMessage.attendee.lastName || ''}`.trim(),
      },
    });
  } catch (error) {
    console.error('SMS retry failed:', error);
    return NextResponse.json(
      { error: 'Failed to retry SMS', code: 'RETRY_ERROR' },
      { status: 500 }
    );
  }
}
