/**
 * M33T Phone Verification Utilities
 *
 * Provides secure OTP generation, hashing, and phone number handling
 * for M33T invitee phone verification flow.
 */

import * as crypto from 'crypto';

// ========== Constants ==========

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
export const MAX_ATTEMPTS = 3;
export const RATE_LIMIT_MINUTES = 1;

// ========== OTP Generation & Hashing ==========

/**
 * Generate a cryptographically secure 6-digit OTP
 * Uses crypto.randomInt for secure random number generation
 */
export function generateOTP(): string {
  // Generate random number between 0 and 999999
  const randomNumber = crypto.randomInt(0, 1000000);
  // Pad with leading zeros to ensure 6 digits
  return randomNumber.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hash an OTP code using SHA-256
 * OTPs are never stored in plain text
 */
export function hashOTP(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Check if an OTP has expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Get expiration timestamp for a new OTP
 */
export function getOTPExpiration(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

// ========== Phone Number Handling ==========

// Re-export shared phone utilities
export { normalizePhone, formatPhoneForDisplay } from '@/lib/phone';

/**
 * Mask a phone number for privacy (shows last 4 digits)
 * M33T-specific utility for OTP verification flows.
 *
 * @example
 * maskPhone('+15125551234') // '***-***-1234'
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return '****';
  }

  const lastFour = phone.slice(-4);
  return `***-***-${lastFour}`;
}
