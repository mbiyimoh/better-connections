/**
 * Email Notification Service using Resend
 *
 * Setup:
 * 1. Create a Resend account at https://resend.com
 * 2. Verify your domain for better deliverability
 * 3. Get your API key from the dashboard
 * 4. Add environment variables:
 *    - RESEND_API_KEY
 *    - RESEND_FROM_EMAIL (e.g., "M33T <events@yourdomain.com>")
 */

import { Resend } from 'resend';

// Lazy-load Resend client
let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }

    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const DEFAULT_FROM_EMAIL = 'M33T <events@bettercontacts.app>';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  scheduledAt?: Date;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, replyTo, scheduledAt } = options;

  try {
    const client = getClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

    const emailOptions: Parameters<typeof client.emails.send>[0] = {
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    };

    // Add scheduling if provided
    if (scheduledAt) {
      emailOptions.scheduledAt = scheduledAt.toISOString();
    }

    const { data, error } = await client.emails.send(emailOptions);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Email send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================
// Email Templates
// =====================

interface EventInfo {
  name: string;
  date: Date;
  startTime: string;
  venueName: string;
  venueAddress: string;
}

interface MatchInfo {
  name: string;
  role: string | null;
  company: string | null;
  whyMatch: string[];
}

/**
 * Generate invitation email HTML
 */
export function generateInvitationEmail(params: {
  attendeeName: string;
  event: EventInfo;
  rsvpUrl: string;
  organizerName?: string;
}): { subject: string; html: string; text: string } {
  const { attendeeName, event, rsvpUrl, organizerName } = params;
  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `You're invited to ${event.name}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0F; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <span style="color: #d4a54a; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">You're Invited</span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #1A1A1F; border-radius: 12px; padding: 40px;">
              <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 10px 0;">${event.name}</h1>
              <p style="color: #A0A0A8; font-size: 16px; margin: 0 0 30px 0;">
                Hi ${attendeeName}, ${organizerName ? `${organizerName} has` : "You've been"} invited you to an exclusive networking event.
              </p>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: #d4a54a;">📅</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${eventDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: #d4a54a;">🕐</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${event.startTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #d4a54a;">📍</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${event.venueName}</span>
                    <br>
                    <span style="color: #A0A0A8; margin-left: 26px; font-size: 14px;">${event.venueAddress}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${rsvpUrl}" style="display: inline-block; background-color: #d4a54a; color: #0D0D0F; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      RSVP Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #606068; font-size: 14px; margin-top: 30px; text-align: center;">
                Complete your profile after RSVPing to get matched with the right connections.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 30px;">
              <p style="color: #606068; font-size: 12px; margin: 0;">
                Powered by M33T • Better Connections
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You're invited to ${event.name}!

Hi ${attendeeName},

${organizerName ? `${organizerName} has` : "You've been"} invited to an exclusive networking event.

Event Details:
- Date: ${eventDate}
- Time: ${event.startTime}
- Location: ${event.venueName}, ${event.venueAddress}

RSVP here: ${rsvpUrl}

Complete your profile after RSVPing to get matched with the right connections.

---
Powered by M33T • Better Connections
  `.trim();

  return { subject, html, text };
}

/**
 * Generate match reveal email HTML
 */
export function generateMatchRevealEmail(params: {
  attendeeName: string;
  event: EventInfo;
  matches: MatchInfo[];
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const { attendeeName, event, matches, viewUrl } = params;

  const subject = `Your connections for ${event.name} are ready!`;

  const matchesHtml = matches
    .slice(0, 3)
    .map(
      (match) => `
      <tr>
        <td style="background-color: #252529; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <h4 style="color: #FFFFFF; margin: 0 0 4px 0; font-size: 16px;">${match.name}</h4>
          ${match.role || match.company ? `<p style="color: #A0A0A8; margin: 0 0 8px 0; font-size: 14px;">${match.role || ''}${match.role && match.company ? ' at ' : ''}${match.company || ''}</p>` : ''}
          ${match.whyMatch.length > 0 ? `<p style="color: #d4a54a; margin: 0; font-size: 13px;">• ${match.whyMatch[0]}</p>` : ''}
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0F; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <span style="color: #d4a54a; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Connections Are Ready</span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #1A1A1F; border-radius: 12px; padding: 40px;">
              <h1 style="color: #FFFFFF; font-size: 24px; margin: 0 0 10px 0;">Hi ${attendeeName}!</h1>
              <p style="color: #A0A0A8; font-size: 16px; margin: 0 0 30px 0;">
                We've curated ${matches.length} connections for you at ${event.name}. Here's a preview:
              </p>

              <!-- Matches Preview -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                ${matchesHtml}
              </table>

              ${matches.length > 3 ? `<p style="color: #A0A0A8; text-align: center; margin-bottom: 20px;">+ ${matches.length - 3} more connections</p>` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${viewUrl}" style="display: inline-block; background-color: #d4a54a; color: #0D0D0F; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View All Matches
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 30px;">
              <p style="color: #606068; font-size: 12px; margin: 0;">
                Powered by M33T • Better Connections
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Your connections for ${event.name} are ready!

Hi ${attendeeName},

We've curated ${matches.length} connections for you. Here's a preview:

${matches
  .slice(0, 3)
  .map((m) => `- ${m.name}${m.role ? ` (${m.role})` : ''}${m.whyMatch[0] ? `\n  ${m.whyMatch[0]}` : ''}`)
  .join('\n\n')}

${matches.length > 3 ? `+ ${matches.length - 3} more connections\n` : ''}
View all your matches: ${viewUrl}

---
Powered by M33T • Better Connections
  `.trim();

  return { subject, html, text };
}

/**
 * Generate event reminder email HTML
 */
export function generateReminderEmail(params: {
  attendeeName: string;
  event: EventInfo;
  matchCount: number;
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const { attendeeName, event, matchCount, viewUrl } = params;

  const subject = `Reminder: ${event.name} is tomorrow!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0F; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Main Content -->
          <tr>
            <td style="background-color: #1A1A1F; border-radius: 12px; padding: 40px;">
              <h1 style="color: #FFFFFF; font-size: 24px; margin: 0 0 10px 0;">See you tomorrow, ${attendeeName}!</h1>
              <p style="color: #A0A0A8; font-size: 16px; margin: 0 0 30px 0;">
                ${event.name} is happening tomorrow. Here's everything you need to know:
              </p>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: #d4a54a;">🕐</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${event.startTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: #d4a54a;">📍</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${event.venueName}</span>
                    <br>
                    <span style="color: #A0A0A8; margin-left: 26px; font-size: 14px;">${event.venueAddress}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #d4a54a;">🤝</span>
                    <span style="color: #FFFFFF; margin-left: 10px;">${matchCount} curated connections waiting for you</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${viewUrl}" style="display: inline-block; background-color: #d4a54a; color: #0D0D0F; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Review Your Matches
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 30px;">
              <p style="color: #606068; font-size: 12px; margin: 0;">
                Powered by M33T • Better Connections
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${event.name} is tomorrow!

Hi ${attendeeName},

Here's everything you need to know:

- Time: ${event.startTime}
- Location: ${event.venueName}, ${event.venueAddress}
- ${matchCount} curated connections waiting for you

Review your matches: ${viewUrl}

---
Powered by M33T • Better Connections
  `.trim();

  return { subject, html, text };
}
