// src/lib/vcf-parser.ts
import { parseVCards, VCard4 } from 'vcard4-ts';
import { v4 as uuidv4 } from 'uuid';
import { normalizePhone } from '@/lib/phone';

// ============================================
// Types
// ============================================

export interface ParsedContact {
  tempId: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  rawVcardIndex: number;
}

export interface SkippedEntry {
  index: number;
  reason: SkipReason;
  rawPreview: string;
}

export type SkipReason = 'NO_NAME' | 'PARSE_ERROR' | 'EMPTY_ENTRY' | 'DUPLICATE_IN_FILE';

export interface VcfParseResult {
  contacts: ParsedContact[];
  skipped: SkippedEntry[];
  totalInFile: number;
}

export interface FieldConflict {
  field: string;
  existingValue: string;
  incomingValue: string;
}

// ============================================
// Constants
// ============================================

const PHONE_TYPE_PRIORITY: readonly string[] = [
  'cell', 'mobile', 'iphone', 'main', 'work', 'home', 'voice', 'other'
];

export const AUTO_MERGE_FIELDS = ['notes', 'expertise', 'interests'] as const;

export const CONFLICT_FIELDS = [
  'firstName', 'lastName', 'title', 'company',
  'primaryPhone', 'secondaryPhone',
  'linkedinUrl', 'websiteUrl',
  'streetAddress', 'city', 'state', 'zipCode', 'country',
] as const;

// ============================================
// Main Parser
// ============================================

export function parseVcfFile(content: string): VcfParseResult {
  const contacts: ParsedContact[] = [];
  const skipped: SkippedEntry[] = [];

  // Strip BOM if present
  const cleanContent = content.charCodeAt(0) === 0xFEFF
    ? content.slice(1)
    : content;

  // Handle empty content
  if (!cleanContent.trim()) {
    return { contacts: [], skipped: [], totalInFile: 0 };
  }

  let result;
  try {
    result = parseVCards(cleanContent);
  } catch {
    // Complete parse failure
    return { contacts: [], skipped: [], totalInFile: 0 };
  }

  const vcards = result.vCards || [];
  const totalInFile = vcards.length;

  // Track emails to detect duplicates within same file
  const seenEmails = new Set<string>();

  vcards.forEach((vcard, index) => {
    try {
      const name = extractName(vcard);

      if (!name.firstName && !name.lastName) {
        skipped.push({
          index,
          reason: 'NO_NAME',
          rawPreview: getVcardPreview(vcard),
        });
        return;
      }

      const emails = extractEmails(vcard);

      // Skip if duplicate email within same file
      if (emails.primaryEmail && seenEmails.has(emails.primaryEmail.toLowerCase())) {
        skipped.push({
          index,
          reason: 'DUPLICATE_IN_FILE',
          rawPreview: `Duplicate email: ${emails.primaryEmail}`,
        });
        return;
      }

      if (emails.primaryEmail) {
        seenEmails.add(emails.primaryEmail.toLowerCase());
      }

      const phones = extractPhones(vcard);
      const address = extractAddress(vcard);
      const urls = extractUrls(vcard);
      const notes = buildNotesWithOverflow(
        vcard,
        emails.overflowEmails,
        phones.overflowPhones
      );

      contacts.push({
        tempId: uuidv4(),
        firstName: name.firstName,
        lastName: name.lastName,
        primaryEmail: emails.primaryEmail,
        secondaryEmail: emails.secondaryEmail,
        primaryPhone: phones.primaryPhone,
        secondaryPhone: phones.secondaryPhone,
        title: extractTitle(vcard),
        company: extractCompany(vcard),
        linkedinUrl: urls.linkedinUrl,
        websiteUrl: urls.websiteUrl,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        notes,
        rawVcardIndex: index,
      });
    } catch {
      skipped.push({
        index,
        reason: 'PARSE_ERROR',
        rawPreview: getVcardPreview(vcard),
      });
    }
  });

  return { contacts, skipped, totalInFile };
}

// ============================================
// Field Extraction Functions
// ============================================

export function extractName(vcard: VCard4): { firstName: string; lastName: string | null } {
  // Priority 1: N field (structured name)
  // VCard4 N.value is an object: { familyNames, givenNames, additionalNames, honorificPrefixes, honorificSuffixes }
  const n = vcard.N;
  if (n?.value) {
    const familyName = n.value.familyNames?.[0] || '';
    const givenName = n.value.givenNames?.[0] || '';

    if (givenName || familyName) {
      return {
        firstName: givenName || familyName,
        lastName: givenName ? (familyName || null) : null,
      };
    }
  }

  // Priority 2: FN field (formatted name) - split on first space
  // VCard4 FN is an array of SingleVCardProperty, each with a string value
  const fn = vcard.FN?.[0]?.value;
  if (fn && typeof fn === 'string') {
    const trimmed = fn.trim();
    const spaceIndex = trimmed.indexOf(' ');

    if (spaceIndex === -1) {
      return { firstName: trimmed, lastName: null };
    }

    return {
      firstName: trimmed.substring(0, spaceIndex),
      lastName: trimmed.substring(spaceIndex + 1),
    };
  }

  return { firstName: '', lastName: null };
}

export function extractEmails(vcard: VCard4): {
  primaryEmail: string | null;
  secondaryEmail: string | null;
  overflowEmails: string[];
} {
  const emails = vcard.EMAIL || [];
  const extracted: string[] = [];

  // Sort by preference if available (PREF is a number in vcard4-ts)
  const sorted = [...emails].sort((a, b) => {
    const aPref = a.parameters?.PREF;
    const bPref = b.parameters?.PREF;
    if (aPref !== undefined && bPref !== undefined) return aPref - bPref;
    if (aPref !== undefined) return -1;
    if (bPref !== undefined) return 1;
    return 0;
  });

  for (const email of sorted) {
    // VCard4 EMAIL value is a string
    const value = email.value;
    if (value && typeof value === 'string' && !extracted.includes(value)) {
      extracted.push(value);
    }
  }

  return {
    primaryEmail: extracted[0] || null,
    secondaryEmail: extracted[1] || null,
    overflowEmails: extracted.slice(2),
  };
}

export function extractPhones(vcard: VCard4): {
  primaryPhone: string | null;
  secondaryPhone: string | null;
  overflowPhones: string[];
} {
  const phones = vcard.TEL || [];
  const extracted: Array<{ value: string; priority: number }> = [];

  for (const phone of phones) {
    // VCard4 TEL value is a string
    const value = phone.value;
    if (!value || typeof value !== 'string') continue;

    const types = (phone.parameters?.TYPE || []).map((t: string) => t.toLowerCase());

    // Find best matching priority
    let priority = PHONE_TYPE_PRIORITY.length;
    for (const type of types) {
      const idx = PHONE_TYPE_PRIORITY.indexOf(type);
      if (idx !== -1 && idx < priority) {
        priority = idx;
      }
    }

    extracted.push({ value, priority });
  }

  // Sort by priority (lower is better)
  extracted.sort((a, b) => a.priority - b.priority);

  // Normalize phone numbers, keeping raw value as fallback
  const normalized = extracted.map(e => normalizePhone(e.value) ?? e.value);
  // Remove duplicates (normalization may merge different formats of same number)
  const unique = [...new Set(normalized)];

  return {
    primaryPhone: unique[0] || null,
    secondaryPhone: unique[1] || null,
    overflowPhones: unique.slice(2),
  };
}

export function extractAddress(vcard: VCard4): {
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
} {
  const adr = vcard.ADR?.[0];
  if (!adr?.value) {
    return {
      streetAddress: null,
      city: null,
      state: null,
      zipCode: null,
      country: null,
    };
  }

  // VCard4 ADR.value is an object with named properties:
  // { postOfficeBox, extendedAddress, streetAddress, locality, region, postalCode, countryName }
  // Each is NonEmptyArray<string> | undefined
  const addrValue = adr.value;
  const poBox = addrValue.postOfficeBox?.[0] || '';
  const extended = addrValue.extendedAddress?.[0] || '';
  const street = addrValue.streetAddress?.[0] || '';
  const city = addrValue.locality?.[0] || '';
  const region = addrValue.region?.[0] || '';
  const postal = addrValue.postalCode?.[0] || '';
  const country = addrValue.countryName?.[0] || '';

  // Combine PO Box, Extended, and Street for street address
  const streetParts = [poBox, extended, street].filter(Boolean);
  const streetAddress = streetParts.length > 0 ? streetParts.join(', ') : null;

  return {
    streetAddress,
    city: city || null,
    state: region || null,
    zipCode: postal || null,
    country: country || null,
  };
}

export function extractUrls(vcard: VCard4): {
  linkedinUrl: string | null;
  websiteUrl: string | null;
} {
  const urls = vcard.URL || [];
  let linkedinUrl: string | null = null;
  let websiteUrl: string | null = null;

  for (const url of urls) {
    // VCard4 URL value is a string
    const value = url.value;
    if (!value || typeof value !== 'string') continue;

    if (isLinkedInUrl(value)) {
      if (!linkedinUrl) linkedinUrl = value;
    } else {
      if (!websiteUrl) websiteUrl = value;
    }
  }

  return { linkedinUrl, websiteUrl };
}

function isLinkedInUrl(url: string): boolean {
  return url.toLowerCase().includes('linkedin.com');
}

function extractTitle(vcard: VCard4): string | null {
  // VCard4 TITLE value is a string
  const title = vcard.TITLE?.[0]?.value;
  return title && typeof title === 'string' ? title : null;
}

function extractCompany(vcard: VCard4): string | null {
  // VCard4 ORG.value is NonEmptyArray<string> - first element is org name
  const org = vcard.ORG?.[0]?.value;
  if (org && Array.isArray(org) && org[0]) {
    return org[0];
  }
  return null;
}

export function buildNotesWithOverflow(
  vcard: VCard4,
  overflowEmails: string[],
  overflowPhones: string[]
): string | null {
  const parts: string[] = [];

  // Original notes - VCard4 NOTE value is a string
  const originalNote = vcard.NOTE?.[0]?.value;
  if (originalNote && typeof originalNote === 'string') {
    parts.push(originalNote);
  }

  // Overflow emails
  if (overflowEmails.length > 0) {
    parts.push(overflowEmails.map(e => `[Additional Email: ${e}]`).join('\n'));
  }

  // Overflow phones
  if (overflowPhones.length > 0) {
    parts.push(overflowPhones.map(p => `[Additional Phone: ${p}]`).join('\n'));
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

// ============================================
// Conflict Detection
// ============================================

export function detectConflicts(
  incoming: ParsedContact,
  existing: {
    firstName: string;
    lastName: string | null;
    title: string | null;
    company: string | null;
    primaryPhone: string | null;
    secondaryPhone: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
  }
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  for (const field of CONFLICT_FIELDS) {
    const incomingValue = incoming[field as keyof ParsedContact];
    const existingValue = existing[field as keyof typeof existing];

    if (!incomingValue || !existingValue) continue;

    // For phone fields, normalize both sides before comparison
    if (field === 'primaryPhone' || field === 'secondaryPhone') {
      const normalizedIncoming = normalizePhone(String(incomingValue));
      const normalizedExisting = normalizePhone(String(existingValue));
      if (normalizedIncoming && normalizedExisting && normalizedIncoming !== normalizedExisting) {
        conflicts.push({
          field,
          existingValue: String(existingValue),
          incomingValue: String(incomingValue),
        });
      }
    } else if (String(incomingValue) !== String(existingValue)) {
      conflicts.push({
        field,
        existingValue: String(existingValue),
        incomingValue: String(incomingValue),
      });
    }
  }

  return conflicts;
}

// ============================================
// Helpers
// ============================================

function getVcardPreview(vcard: VCard4): string {
  const fn = vcard.FN?.[0]?.value || '';
  const email = vcard.EMAIL?.[0]?.value || '';
  return `${fn} ${email}`.trim().substring(0, 100);
}

// ============================================
// Name Normalization (for same-name detection)
// ============================================

const HONORIFICS = ['dr.', 'dr', 'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'prof.', 'prof'];

/**
 * Normalize name for duplicate detection.
 * - Trims whitespace
 * - Lowercases
 * - Removes honorifics (Dr., Mr., Mrs., etc.)
 * - Handles single-word names
 */
export function normalizeName(firstName: string, lastName: string | null): string {
  const parts = [firstName, lastName]
    .filter(Boolean)
    .map(s => s!.trim().toLowerCase())
    .filter(s => s.length > 0);

  // Remove common honorifics
  const filtered = parts.filter(p => !HONORIFICS.includes(p));

  return filtered.join(' ');
}
