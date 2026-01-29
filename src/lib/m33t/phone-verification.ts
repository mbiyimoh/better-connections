/**
 * M33T Phone Verification Utilities
 *
 * Provides secure OTP generation, hashing, and phone number handling
 * for M33T invitee phone verification flow.
 */

import * as crypto from 'crypto';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

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

/**
 * Normalize a phone number to E.164 format
 * Returns null if the phone number is invalid
 *
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code (defaults to US)
 * @returns E.164 formatted phone number or null
 *
 * @example
 * normalizePhone('512-555-1234') // '+15125551234'
 * normalizePhone('(512) 555-1234') // '+15125551234'
 * normalizePhone('+44 20 7946 0958') // '+442079460958'
 * normalizePhone('123') // null
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  if (!phone || phone.trim().length < 3) {
    return null;
  }

  try {
    // Check if phone number is valid
    if (!isValidPhoneNumber(phone, defaultCountry)) {
      return null;
    }

    // Parse and format to E.164
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (!parsed) {
      return null;
    }

    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Format a phone number for display (national format)
 * Returns the original string if parsing fails
 *
 * @param phone - Phone number (preferably E.164)
 * @param defaultCountry - Default country for formatting
 * @returns Formatted phone number for display
 *
 * @example
 * formatPhoneForDisplay('+15125551234') // '(512) 555-1234'
 */
export function formatPhoneForDisplay(
  phone: string,
  defaultCountry: CountryCode = 'US'
): string {
  if (!phone) {
    return '';
  }

  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (!parsed) {
      return phone;
    }

    // Use national format for display (e.g., "(512) 555-1234")
    return parsed.formatNational();
  } catch {
    return phone;
  }
}

/**
 * Mask a phone number for privacy (shows last 4 digits)
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
