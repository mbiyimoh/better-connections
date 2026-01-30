/**
 * Shared Phone Number Utilities
 *
 * Provides phone normalization (E.164 storage) and display formatting
 * used by both core contacts and M33T event flows.
 */

import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

/**
 * Normalize a phone number to E.164 format.
 * Returns null if the phone number is invalid.
 *
 * @example
 * normalizePhone('(512) 555-1234')   // '+15125551234'
 * normalizePhone('512-555-1234')     // '+15125551234'
 * normalizePhone('+15125551234')     // '+15125551234' (idempotent)
 * normalizePhone('call my office')   // null
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  if (!phone || phone.trim().length < 3) {
    return null;
  }

  try {
    if (!isValidPhoneNumber(phone, defaultCountry)) {
      return null;
    }

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
 * Format a phone number for display (national format).
 * Returns the original string if parsing fails (graceful fallback for historical data).
 *
 * @example
 * formatPhoneForDisplay('+15125551234')  // '(512) 555-1234'
 * formatPhoneForDisplay('not-a-phone')   // 'not-a-phone' (passthrough)
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

    return parsed.formatNational();
  } catch {
    return phone;
  }
}

/**
 * Normalize phone fields in a contact data object.
 * Returns { data, phoneErrors } — phoneErrors lists any invalid phone values.
 * Invalid phones are removed from the data object so they don't overwrite
 * existing valid data.
 */
export function normalizeContactPhones<T extends Record<string, unknown>>(
  data: T
): { data: T; phoneErrors: string[] } {
  const errors: string[] = [];
  const result = { ...data };

  for (const field of ['primaryPhone', 'secondaryPhone'] as const) {
    const value = result[field];
    if (value === null || value === undefined || value === '') {
      (result as Record<string, unknown>)[field] = null;
      continue;
    }
    if (typeof value === 'string') {
      const normalized = normalizePhone(value);
      if (normalized) {
        (result as Record<string, unknown>)[field] = normalized;
      } else {
        errors.push(`Invalid phone number in ${field}: "${value}"`);
        delete (result as Record<string, unknown>)[field];
      }
    }
  }

  return { data: result, phoneErrors: errors };
}
