/**
 * Twilio SMS Status Callback Webhook
 *
 * Receives status updates from Twilio for sent messages.
 * Status flow: queued → sending → sent → delivered (or failed/undelivered)
 *
 * Webhook URL: https://app.bettercontacts.ai/api/webhooks/twilio/status
 * Configure this URL when sending messages via statusCallback parameter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Twilio sends POST requests with form data
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data from Twilio webhook
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Validate Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get('x-twilio-signature');

    // CRITICAL: Always require signature validation in production
    if (process.env.NODE_ENV === 'production' && !authToken) {
      console.error('[Twilio Webhook] TWILIO_AUTH_TOKEN not configured in production');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (process.env.NODE_ENV === 'production' && !signature) {
      console.error('[Twilio Webhook] Missing x-twilio-signature header');
      return NextResponse.json({ error: 'Signature required' }, { status: 403 });
    }

    if (authToken && signature) {
      const isValid = await validateTwilioSignature(request, payload, signature, authToken);
      if (!isValid) {
        console.error('[Twilio Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Twilio Webhook] Skipping signature validation (development mode)');
    }

    // Extract key fields from webhook payload
    const {
      MessageSid: messageSid,
      MessageStatus: status,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
      To: to,
      From: from,
      AccountSid: accountSid,
      MessagingServiceSid: messagingServiceSid,
    } = payload;

    if (!messageSid || !status) {
      console.error('[Twilio Webhook] Missing required fields:', { messageSid, status });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine timestamps based on status
    const now = new Date();
    const statusTimestamps: { sentAt?: Date; deliveredAt?: Date } = {};

    if (status === 'sent' || status === 'delivered') {
      statusTimestamps.sentAt = now;
    }
    if (status === 'delivered') {
      statusTimestamps.deliveredAt = now;
    }

    // Find existing message record - sendTrackedSMS should have created it
    const existingMessage = await prisma.sMSMessage.findUnique({
      where: { messageSid },
    });

    if (!existingMessage) {
      // Webhook arrived before sendTrackedSMS wrote to DB
      // This is a race condition - log and return success to prevent Twilio retries
      // Twilio will send subsequent status updates that will succeed
      console.warn(
        `[Twilio Webhook] Message ${messageSid} not found - webhook arrived before DB write. ` +
          `Status: ${status}. Twilio will send subsequent updates.`
      );

      return NextResponse.json({
        success: true,
        messageSid,
        status,
        deferred: true,
        message: 'Message not yet in database, awaiting next status update',
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Update the existing message with status
    await prisma.sMSMessage.update({
      where: { messageSid },
      data: {
        status,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        rawPayload: payload,
        ...statusTimestamps,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[Twilio Webhook] Updated SMS ${messageSid} to status: ${status} (${duration}ms)`);

    // Respond quickly to Twilio (< 15 seconds required, <500ms recommended)
    return NextResponse.json({
      success: true,
      messageSid,
      status,
      processingTimeMs: duration,
    });
  } catch (error) {
    console.error('[Twilio Webhook] Error processing status update:', error);

    // Still respond with 200 to prevent Twilio retries for application errors
    // Twilio will retry on 4xx/5xx responses
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Validate Twilio request signature
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
async function validateTwilioSignature(
  request: NextRequest,
  params: Record<string, string>,
  signature: string,
  authToken: string
): Promise<boolean> {
  try {
    const twilio = (await import('twilio')).default;

    // For Railway/proxied environments, reconstruct the URL with HTTPS
    // SSL terminates at the load balancer, so we manually build HTTPS URL
    const host = request.headers.get('host') || 'app.bettercontacts.ai';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const url = `${protocol}://${host}${request.nextUrl.pathname}`;

    return twilio.validateRequest(authToken, signature, url, params);
  } catch (error) {
    console.error('[Twilio Webhook] Signature validation error:', error);
    return false;
  }
}

// Allow Twilio to check this endpoint exists
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Twilio SMS Status Webhook',
    timestamp: new Date().toISOString(),
  });
}
