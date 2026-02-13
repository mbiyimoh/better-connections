/**
 * SMS Notification Service using Twilio
 *
 * Setup:
 * 1. Create a Twilio account at https://www.twilio.com
 * 2. Get your Account SID and Auth Token from the console
 * 3. Create a Messaging Service for better deliverability
 * 4. Add environment variables:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER for basic setup)
 */

import type { Twilio } from 'twilio';
import { normalizePhone } from '@/lib/phone';
import { prisma } from '@/lib/db';

// Notification types for SMS tracking
export type NotificationType =
  | 'invitation'
  | 'rsvp_reminder'
  | 'match_reveal'
  | 'event_reminder'
  | 'new_rsvps'
  | 'question_set'
  | 'phone_verification';

// Lazy-load Twilio client to avoid build-time errors
let twilioClient: Twilio | null = null;

async function getClient(): Promise<Twilio> {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    // Dynamic import to avoid build-time issues
    const twilio = (await import('twilio')).default;
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSOptions {
  to: string;
  body: string;
  scheduledAt?: Date;
}

/**
 * Extended SMS options with tracking context
 * Use this when sending SMS that should be tracked per-attendee
 */
export interface TrackedSMSOptions extends SMSOptions {
  eventId: string;
  attendeeId: string;
  notificationType: NotificationType;
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  const { to, body, scheduledAt } = options;

  try {
    const client = await getClient();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!messagingServiceSid && !fromNumber) {
      throw new Error('Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER');
    }

    // Build message options
    const messageOptions: {
      to: string;
      body: string;
      messagingServiceSid?: string;
      from?: string;
      scheduleType?: 'fixed';
      sendAt?: Date;
    } = {
      to,
      body,
    };

    if (messagingServiceSid) {
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (fromNumber) {
      messageOptions.from = fromNumber;
    }

    // Add scheduling if provided (Twilio supports up to 7 days in advance)
    if (scheduledAt) {
      const now = new Date();
      const scheduleTime = new Date(scheduledAt);

      // Twilio requires at least 15 minutes in the future
      if (scheduleTime.getTime() - now.getTime() >= 15 * 60 * 1000) {
        messageOptions.scheduleType = 'fixed';
        messageOptions.sendAt = scheduleTime;
      }
    }

    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('SMS send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a tracked SMS message via Twilio with delivery status tracking
 *
 * This enhanced version:
 * 1. Sends the SMS via Twilio with statusCallback URL for webhook updates
 * 2. Creates an SMSMessage record in the database for tracking
 * 3. Returns the result with messageId for reference
 *
 * Use this for all event-related SMS that should appear in attendee SMS history.
 */
export async function sendTrackedSMS(options: TrackedSMSOptions): Promise<SMSResult> {
  const { to, body, eventId, attendeeId, notificationType, scheduledAt } = options;

  try {
    const client = await getClient();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;

    if (!messagingServiceSid && !fromNumber) {
      throw new Error('Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER');
    }

    // Build webhook callback URL for status updates
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.bettercontacts.ai';
    const statusCallbackUrl = `${appUrl}/api/webhooks/twilio/status`;

    // Build message options
    const messageOptions: {
      to: string;
      body: string;
      messagingServiceSid?: string;
      from?: string;
      statusCallback?: string;
      scheduleType?: 'fixed';
      sendAt?: Date;
    } = {
      to,
      body,
      statusCallback: statusCallbackUrl,
    };

    if (messagingServiceSid) {
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (fromNumber) {
      messageOptions.from = fromNumber;
    }

    // Add scheduling if provided (Twilio supports up to 7 days in advance)
    if (scheduledAt) {
      const now = new Date();
      const scheduleTime = new Date(scheduledAt);

      // Twilio requires at least 15 minutes in the future
      if (scheduleTime.getTime() - now.getTime() >= 15 * 60 * 1000) {
        messageOptions.scheduleType = 'fixed';
        messageOptions.sendAt = scheduleTime;
      }
    }

    // Send the message via Twilio
    const message = await client.messages.create(messageOptions);

    // Store the message in our database for tracking
    // Initial status from Twilio is typically "queued" or "accepted"
    await prisma.sMSMessage.create({
      data: {
        messageSid: message.sid,
        accountSid: accountSid || null,
        messagingServiceSid: messagingServiceSid || null,
        toPhone: to,
        fromPhone: message.from || fromNumber || '',
        body: body,
        numSegments: message.numSegments ? parseInt(String(message.numSegments)) : 1,
        status: message.status || 'queued',
        eventId,
        attendeeId,
        notificationType,
      },
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Tracked SMS send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format a phone number to E.164 format.
 * @deprecated Use `normalizePhone` from `@/lib/phone` instead.
 */
export function formatPhoneE164(phone: string): string {
  return normalizePhone(phone) ?? phone;
}

/**
 * Validate if a phone number appears to be valid E.164 format.
 * @deprecated Use `normalizePhone` from `@/lib/phone` instead (returns null for invalid).
 */
export function isValidE164(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

// =====================
// SMS Templates
// =====================

interface InvitationParams {
  eventName: string;
  rsvpUrl: string;
}

interface MatchRevealParams {
  eventName: string;
  matchCount: number;
  viewUrl: string;
}

interface EventReminderParams {
  eventName: string;
  time: string;
  venue: string;
}

interface ProfileReminderParams {
  eventName: string;
  profileUrl: string;
}

interface PhoneVerificationParams {
  code: string;
  eventName: string;
}

interface QuestionSetParams {
  eventName: string;
  questionSetTitle: string;
  url: string;
  isNewSet: boolean;
}

interface NewRsvpsParams {
  eventName: string;
  eventDate: string;  // Formatted as "March 12"
  newCount: number;
  viewUrl: string;
}

export const SMS_TEMPLATES = {
  /**
   * Event invitation SMS
   */
  invitation: (params: InvitationParams) =>
    `You're invited to ${params.eventName}! RSVP and complete your profile to get matched with the right people: ${params.rsvpUrl}`,

  /**
   * RSVP reminder SMS
   */
  rsvpReminder: (params: InvitationParams) =>
    `Reminder: Please RSVP for ${params.eventName}. Complete your profile to get curated connections! ${params.rsvpUrl}`,

  /**
   * Match reveal SMS
   */
  matchReveal: (params: MatchRevealParams) =>
    `Your ${params.matchCount} curated connections for ${params.eventName} are ready! See who you should meet: ${params.viewUrl}`,

  /**
   * Event reminder SMS (day before)
   */
  eventReminder: (params: EventReminderParams) =>
    `Reminder: ${params.eventName} is tomorrow at ${params.time}. Location: ${params.venue}. Don't forget to review your matches!`,

  /**
   * Profile incomplete reminder
   */
  profileReminder: (params: ProfileReminderParams) =>
    `Your profile for ${params.eventName} is incomplete. Finish it to get better matches: ${params.profileUrl}`,

  /**
   * Phone verification OTP
   */
  phoneVerification: (params: PhoneVerificationParams) =>
    `Your M33T verification code is ${params.code}. This confirms your number for ${params.eventName} match notifications. Code expires in 5 minutes.`,

  /**
   * Question set notification SMS
   */
  questionSet: (params: QuestionSetParams) => {
    const action = params.isNewSet ? 'New questions available' : 'Reminder';
    return `${action} for ${params.eventName}: "${params.questionSetTitle}". Complete here: ${params.url}`;
  },

  /**
   * New RSVPs notification SMS
   * Notifies attendees about new people who RSVPed since they did
   */
  newRsvps: (params: NewRsvpsParams) =>
    `${params.newCount} more people RSVP'd for ${params.eventName} on ${params.eventDate}! See who they are: ${params.viewUrl}`,
} as const;

export type SMSTemplateType = keyof typeof SMS_TEMPLATES;

/**
 * Generate an SMS from a template
 */
export function generateSMSFromTemplate(
  template: 'invitation' | 'rsvpReminder',
  params: InvitationParams
): string;
export function generateSMSFromTemplate(
  template: 'matchReveal',
  params: MatchRevealParams
): string;
export function generateSMSFromTemplate(
  template: 'eventReminder',
  params: EventReminderParams
): string;
export function generateSMSFromTemplate(
  template: 'profileReminder',
  params: ProfileReminderParams
): string;
export function generateSMSFromTemplate(
  template: SMSTemplateType,
  params: InvitationParams | MatchRevealParams | EventReminderParams | ProfileReminderParams
): string {
  switch (template) {
    case 'invitation':
    case 'rsvpReminder':
      return SMS_TEMPLATES[template](params as InvitationParams);
    case 'matchReveal':
      return SMS_TEMPLATES.matchReveal(params as MatchRevealParams);
    case 'eventReminder':
      return SMS_TEMPLATES.eventReminder(params as EventReminderParams);
    case 'profileReminder':
      return SMS_TEMPLATES.profileReminder(params as ProfileReminderParams);
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
