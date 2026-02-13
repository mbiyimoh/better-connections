/**
 * Twilio SMS Error Code Mapping
 *
 * Maps Twilio error codes to user-friendly messages and suggested actions.
 * Reference: https://www.twilio.com/docs/api/errors
 */

export interface SMSErrorInfo {
  code: string;
  title: string;
  description: string;
  action: string;
  isPermanent: boolean; // Whether retry is unlikely to help
}

const errorCodeMap: Record<string, SMSErrorInfo> = {
  // Carrier & Delivery Errors (30xxx)
  '30001': {
    code: '30001',
    title: 'Queue Overflow',
    description: 'Message queue is full. System is overloaded.',
    action: 'Try again in a few minutes',
    isPermanent: false,
  },
  '30002': {
    code: '30002',
    title: 'Account Suspended',
    description: 'Twilio account has been suspended.',
    action: 'Contact your administrator',
    isPermanent: true,
  },
  '30003': {
    code: '30003',
    title: 'Unreachable Handset',
    description: 'Phone may be turned off or out of service area.',
    action: 'Recipient should check their phone is on and has signal',
    isPermanent: false,
  },
  '30004': {
    code: '30004',
    title: 'Message Blocked',
    description: 'Message was blocked by Twilio or carrier.',
    action: 'Review message content for spam triggers',
    isPermanent: true,
  },
  '30005': {
    code: '30005',
    title: 'Unknown Destination',
    description: 'Phone number does not exist or is invalid.',
    action: 'Verify the phone number is correct',
    isPermanent: true,
  },
  '30006': {
    code: '30006',
    title: 'Landline or Unreachable',
    description: 'Number is a landline or cannot receive SMS.',
    action: 'This number cannot receive text messages',
    isPermanent: true,
  },
  '30007': {
    code: '30007',
    title: 'Carrier Violation',
    description: 'Message filtered by carrier as spam or violation.',
    action: 'Review message content and try a different approach',
    isPermanent: true,
  },
  '30008': {
    code: '30008',
    title: 'Unknown Error',
    description: 'An unknown error occurred.',
    action: 'Try again later',
    isPermanent: false,
  },
  '30009': {
    code: '30009',
    title: 'Missing Segment',
    description: 'Part of a multi-segment message was not delivered.',
    action: 'Try sending the message again',
    isPermanent: false,
  },
  '30010': {
    code: '30010',
    title: 'Message Expired',
    description: 'Message expired before delivery.',
    action: 'Try sending the message again',
    isPermanent: false,
  },

  // Messaging Service Errors (21xxx)
  '21211': {
    code: '21211',
    title: 'Invalid Phone Number',
    description: 'The phone number format is invalid.',
    action: 'Update the phone number to a valid format',
    isPermanent: true,
  },
  '21408': {
    code: '21408',
    title: 'Permission Denied',
    description: 'Account lacks permission to send to this region.',
    action: 'Contact your administrator about regional permissions',
    isPermanent: true,
  },
  '21610': {
    code: '21610',
    title: 'Unsubscribed',
    description: 'Recipient has opted out of receiving messages.',
    action: 'Recipient must reply START to receive messages',
    isPermanent: true,
  },
  '21612': {
    code: '21612',
    title: 'No Phone Numbers',
    description: 'Messaging service has no phone numbers assigned.',
    action: 'Contact your administrator',
    isPermanent: true,
  },
  '21614': {
    code: '21614',
    title: 'Not a Mobile Number',
    description: 'This number cannot receive SMS messages.',
    action: 'Use a mobile phone number instead',
    isPermanent: true,
  },
};

/**
 * Get user-friendly error information for a Twilio error code
 */
export function getErrorInfo(errorCode: string | null | undefined): SMSErrorInfo | null {
  if (!errorCode) return null;

  const info = errorCodeMap[errorCode];
  if (info) return info;

  // Return generic info for unknown codes
  return {
    code: errorCode,
    title: 'Delivery Failed',
    description: `An error occurred (code: ${errorCode}).`,
    action: 'Try sending the message again',
    isPermanent: false,
  };
}

/**
 * Check if an error code indicates a permanent failure (retry won't help)
 */
export function isPermanentError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  const info = errorCodeMap[errorCode];
  return info?.isPermanent ?? false;
}

/**
 * Get a short label for the error
 */
export function getErrorLabel(errorCode: string | null | undefined): string {
  if (!errorCode) return 'Unknown error';
  const info = errorCodeMap[errorCode];
  return info?.title ?? `Error ${errorCode}`;
}
