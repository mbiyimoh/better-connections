/**
 * Notifications Module
 *
 * Provides SMS (Twilio) and Email (Resend) notification services for M33T events.
 */

// SMS Notifications
export {
  sendSMS,
  formatPhoneE164,
  isValidE164,
  generateSMSFromTemplate,
  SMS_TEMPLATES,
  type SMSResult,
  type SMSOptions,
  type SMSTemplateType,
} from './sms';

// Email Notifications
export {
  sendEmail,
  generateInvitationEmail,
  generateMatchRevealEmail,
  generateReminderEmail,
  type EmailResult,
  type SendEmailOptions,
} from './email';
