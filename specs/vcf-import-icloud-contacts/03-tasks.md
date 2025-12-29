# Task Breakdown: VCF Import for iCloud Contacts

**Generated:** 2025-12-29
**Source:** specs/vcf-import-icloud-contacts/02-specification.md
**Last Decompose:** 2025-12-29

---

## Overview

This task breakdown implements VCF (vCard) file import for Better Connections, enabling users to bulk import contacts from iCloud. The feature includes smart duplicate detection with user-controlled merge review.

**Total Tasks:** 15
**Phases:** 4
**Estimated Duration:** 4 days

---

## Gaps Addressed (from Validation)

The following gaps identified during spec validation have been incorporated:

1. **Progress Update Mechanism**: Spinner during upload/analysis, final counts on completion (not real-time streaming - simpler and sufficient)
2. **Request Timeout**: 60-second timeout added to API routes for large file handling
3. **Keyboard Navigation**: Full keyboard support in merge review modal (Tab, Enter, Escape, Arrow keys)

---

## Phase 1: Core Parser & Infrastructure

### Task 1.1: Install vcard4-ts dependency
**Description:** Add vcard4-ts library to project dependencies
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (must be first)

**Implementation Steps:**
```bash
npm install vcard4-ts
```

**Acceptance Criteria:**
- [ ] vcard4-ts added to package.json dependencies
- [ ] Package installed successfully
- [ ] TypeScript types available

---

### Task 1.2: Create VCF parser utility module
**Description:** Build src/lib/vcf-parser.ts with all parsing and field extraction functions
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**
- Parse multi-contact VCF files using vcard4-ts
- Extract name from N field with FN fallback
- Extract emails with preference ordering, overflow to notes
- Extract phones with type priority (cell > mobile > work > home)
- Extract address components from ADR field
- Detect LinkedIn URLs vs regular website URLs
- Skip PHOTO properties entirely
- Handle UTF-8, line folding, escaped characters

**Implementation:**

```typescript
// src/lib/vcf-parser.ts
import { parseVCards, VCard } from 'vcard4-ts';
import { v4 as uuidv4 } from 'uuid';

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

export type SkipReason = 'NO_NAME' | 'PARSE_ERROR' | 'EMPTY_ENTRY';

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

const PHONE_TYPE_PRIORITY = [
  'cell', 'mobile', 'iphone', 'main', 'work', 'home', 'voice', 'other'
] as const;

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

  let result;
  try {
    result = parseVCards(cleanContent);
  } catch (error) {
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
          reason: 'EMPTY_ENTRY', // Using this as "duplicate in file"
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
    } catch (error) {
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

export function extractName(vcard: VCard): { firstName: string; lastName: string | null } {
  // Priority 1: N field (structured name)
  const n = vcard.N?.[0];
  if (n?.value) {
    const familyName = n.value[0] || '';
    const givenName = n.value[1] || '';

    if (givenName || familyName) {
      return {
        firstName: givenName || familyName,
        lastName: givenName ? (familyName || null) : null,
      };
    }
  }

  // Priority 2: FN field (formatted name) - split on first space
  const fn = vcard.FN?.[0]?.value?.[0];
  if (fn) {
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

export function extractEmails(vcard: VCard): {
  primaryEmail: string | null;
  secondaryEmail: string | null;
  overflowEmails: string[];
} {
  const emails = vcard.EMAIL || [];
  const extracted: string[] = [];

  // Sort by preference if available
  const sorted = [...emails].sort((a, b) => {
    const aPref = a.parameters?.PREF?.[0];
    const bPref = b.parameters?.PREF?.[0];
    if (aPref && bPref) return Number(aPref) - Number(bPref);
    if (aPref) return -1;
    if (bPref) return 1;
    return 0;
  });

  for (const email of sorted) {
    const value = email.value?.[0];
    if (value && !extracted.includes(value)) {
      extracted.push(value);
    }
  }

  return {
    primaryEmail: extracted[0] || null,
    secondaryEmail: extracted[1] || null,
    overflowEmails: extracted.slice(2),
  };
}

export function extractPhones(vcard: VCard): {
  primaryPhone: string | null;
  secondaryPhone: string | null;
  overflowPhones: string[];
} {
  const phones = vcard.TEL || [];
  const extracted: Array<{ value: string; priority: number }> = [];

  for (const phone of phones) {
    const value = phone.value?.[0];
    if (!value) continue;

    const types = (phone.parameters?.TYPE || []).map(t => t.toLowerCase());

    // Find best matching priority
    let priority = PHONE_TYPE_PRIORITY.length;
    for (const type of types) {
      const idx = PHONE_TYPE_PRIORITY.indexOf(type as any);
      if (idx !== -1 && idx < priority) {
        priority = idx;
      }
    }

    extracted.push({ value, priority });
  }

  // Sort by priority (lower is better)
  extracted.sort((a, b) => a.priority - b.priority);

  const values = extracted.map(e => e.value);
  // Remove duplicates
  const unique = [...new Set(values)];

  return {
    primaryPhone: unique[0] || null,
    secondaryPhone: unique[1] || null,
    overflowPhones: unique.slice(2),
  };
}

export function extractAddress(vcard: VCard): {
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

  // ADR format: [PO Box, Extended, Street, City, Region, Postal, Country]
  const [poBox, extended, street, city, region, postal, country] = adr.value;

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

export function extractUrls(vcard: VCard): {
  linkedinUrl: string | null;
  websiteUrl: string | null;
} {
  const urls = vcard.URL || [];
  let linkedinUrl: string | null = null;
  let websiteUrl: string | null = null;

  for (const url of urls) {
    const value = url.value?.[0];
    if (!value) continue;

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

function extractTitle(vcard: VCard): string | null {
  return vcard.TITLE?.[0]?.value?.[0] || null;
}

function extractCompany(vcard: VCard): string | null {
  return vcard.ORG?.[0]?.value?.[0] || null;
}

export function buildNotesWithOverflow(
  vcard: VCard,
  overflowEmails: string[],
  overflowPhones: string[]
): string | null {
  const parts: string[] = [];

  // Original notes
  const originalNote = vcard.NOTE?.[0]?.value?.[0];
  if (originalNote) {
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

    // Only conflict if both have values AND they differ
    if (
      incomingValue &&
      existingValue &&
      String(incomingValue) !== String(existingValue)
    ) {
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

function getVcardPreview(vcard: VCard): string {
  const fn = vcard.FN?.[0]?.value?.[0] || '';
  const email = vcard.EMAIL?.[0]?.value?.[0] || '';
  return `${fn} ${email}`.trim().substring(0, 100);
}
```

**Acceptance Criteria:**
- [ ] parseVcfFile handles single and multi-contact VCF files
- [ ] extractName correctly parses N and FN fields
- [ ] extractEmails handles preference ordering and overflow
- [ ] extractPhones prioritizes cell/mobile types
- [ ] extractAddress maps all ADR components
- [ ] extractUrls detects LinkedIn URLs
- [ ] buildNotesWithOverflow appends overflow data correctly
- [ ] detectConflicts identifies field differences
- [ ] UTF-8 characters handled correctly
- [ ] BOM stripped from file content

---

### Task 1.3: Create VCF parser unit tests
**Description:** Write comprehensive unit tests for vcf-parser.ts with test fixtures
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 2.1 (API endpoint)

**Test Fixtures to Create:**

Create these files in `src/lib/__tests__/fixtures/`:

```vcf
// single-contact.vcf
BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
EMAIL:john@example.com
TEL;TYPE=CELL:+1-555-123-4567
END:VCARD
```

```vcf
// multi-contact.vcf
BEGIN:VCARD
VERSION:3.0
N:Smith;Jane;;;
FN:Jane Smith
EMAIL:jane@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Johnson;Bob;;;
FN:Bob Johnson
EMAIL:bob@example.com
END:VCARD
```

```vcf
// all-fields.vcf
BEGIN:VCARD
VERSION:3.0
N:Smith;John;Q.;;
FN:John Q. Smith
ORG:Acme Corporation
TITLE:Senior Product Manager
EMAIL;TYPE=HOME;TYPE=pref:john@personal.com
EMAIL;TYPE=WORK:john.smith@acme.com
EMAIL;TYPE=OTHER:john.backup@gmail.com
TEL;TYPE=CELL;TYPE=pref:+1 (555) 123-4567
TEL;TYPE=WORK:+1 (555) 987-6543
TEL;TYPE=HOME:+1 (555) 111-2222
ADR;TYPE=HOME:;;123 Main Street;San Francisco;CA;94102;USA
URL:https://www.linkedin.com/in/johnsmith
URL:https://johnsmith.com
NOTE:Met at TechCrunch Disrupt 2024.
END:VCARD
```

```vcf
// minimal-contact.vcf
BEGIN:VCARD
VERSION:3.0
FN:SingleName
END:VCARD
```

```vcf
// no-email.vcf
BEGIN:VCARD
VERSION:3.0
N:NoEmail;Person;;;
FN:Person NoEmail
TEL:+1-555-000-0000
END:VCARD
```

```vcf
// malformed.vcf
BEGIN:VCARD
VERSION:3.0
This is not valid vCard content
END:VCARD
```

```vcf
// utf8-names.vcf
BEGIN:VCARD
VERSION:3.0
N:Müller;José;;;
FN:José Müller
EMAIL:jose.muller@example.com
END:VCARD
```

**Test Implementation:**

```typescript
// src/lib/__tests__/vcf-parser.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseVcfFile,
  extractName,
  extractEmails,
  extractPhones,
  extractAddress,
  extractUrls,
  detectConflicts,
} from '../vcf-parser';

const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

describe('parseVcfFile', () => {
  it('parses single contact VCF', () => {
    const content = loadFixture('single-contact.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].firstName).toBe('John');
    expect(result.contacts[0].lastName).toBe('Doe');
    expect(result.contacts[0].primaryEmail).toBe('john@example.com');
  });

  it('parses multi-contact VCF', () => {
    const content = loadFixture('multi-contact.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[0].firstName).toBe('Jane');
    expect(result.contacts[1].firstName).toBe('Bob');
  });

  it('handles empty file gracefully', () => {
    const result = parseVcfFile('');
    expect(result.contacts).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips vCards without name', () => {
    const content = `BEGIN:VCARD
VERSION:3.0
EMAIL:noname@example.com
END:VCARD`;

    const result = parseVcfFile(content);
    expect(result.contacts).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('NO_NAME');
  });

  it('handles UTF-8 characters', () => {
    const content = loadFixture('utf8-names.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].firstName).toBe('José');
    expect(result.contacts[0].lastName).toBe('Müller');
  });

  it('strips BOM from content', () => {
    const content = '\uFEFF' + loadFixture('single-contact.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts).toHaveLength(1);
  });
});

describe('extractEmails', () => {
  it('extracts primary and secondary emails', () => {
    const content = loadFixture('all-fields.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].primaryEmail).toBe('john@personal.com');
    expect(result.contacts[0].secondaryEmail).toBe('john.smith@acme.com');
  });

  it('puts overflow emails in notes', () => {
    const content = loadFixture('all-fields.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].notes).toContain('[Additional Email: john.backup@gmail.com]');
  });
});

describe('extractPhones', () => {
  it('prioritizes cell/mobile phone types', () => {
    const content = loadFixture('all-fields.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].primaryPhone).toContain('123-4567');
  });

  it('puts overflow phones in notes', () => {
    const content = loadFixture('all-fields.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].notes).toContain('[Additional Phone:');
  });
});

describe('extractUrls', () => {
  it('detects LinkedIn URLs', () => {
    const content = loadFixture('all-fields.vcf');
    const result = parseVcfFile(content);

    expect(result.contacts[0].linkedinUrl).toContain('linkedin.com');
    expect(result.contacts[0].websiteUrl).toBe('https://johnsmith.com');
  });
});

describe('detectConflicts', () => {
  it('detects title conflict', () => {
    const incoming = { title: 'Senior PM' } as any;
    const existing = { title: 'Product Manager' };

    const conflicts = detectConflicts(incoming, existing as any);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe('title');
  });

  it('ignores when incoming is empty', () => {
    const incoming = { title: null } as any;
    const existing = { title: 'Product Manager' };

    const conflicts = detectConflicts(incoming, existing as any);

    expect(conflicts).toHaveLength(0);
  });

  it('ignores when existing is empty', () => {
    const incoming = { title: 'Senior PM' } as any;
    const existing = { title: null };

    const conflicts = detectConflicts(incoming, existing as any);

    expect(conflicts).toHaveLength(0);
  });
});
```

**Acceptance Criteria:**
- [ ] All test fixtures created in fixtures/ directory
- [ ] Tests cover single and multi-contact parsing
- [ ] Tests cover all field extraction functions
- [ ] Tests cover edge cases (empty, malformed, UTF-8)
- [ ] Tests cover conflict detection
- [ ] All tests pass

---

## Phase 2: API Endpoints

### Task 2.1: Create VCF upload & analyze API endpoint
**Description:** Build POST /api/contacts/import/vcf route that parses VCF and detects duplicates
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Accept multipart/form-data with .vcf file
- Validate file size (max 10MB) and type
- Parse VCF using vcf-parser module
- Query existing contacts by email to detect duplicates
- Return analysis without writing to database
- **60-second timeout for large files**

**Implementation:**

```typescript
// src/app/api/contacts/import/vcf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import {
  parseVcfFile,
  detectConflicts,
  ParsedContact,
  SkippedEntry,
  FieldConflict,
  AUTO_MERGE_FIELDS,
} from '@/lib/vcf-parser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: {
    id: string;
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
    enrichmentScore: number;
  };
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

interface VcfUploadResponse {
  success: true;
  analysis: {
    totalParsed: number;
    newContacts: ParsedContact[];
    duplicates: DuplicateAnalysis[];
    skipped: SkippedEntry[];
  };
}

interface VcfUploadError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export const maxDuration = 60; // 60 second timeout

export async function POST(
  request: NextRequest
): Promise<NextResponse<VcfUploadResponse | VcfUploadError>> {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.vcf')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Please upload a .vcf file' } },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File is too large. Maximum size is 10MB.' } },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: 'The file appears to be empty' } },
        { status: 400 }
      );
    }

    // Parse VCF
    const parseResult = parseVcfFile(content);

    if (parseResult.contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_VALID_CONTACTS', message: 'Could not read any valid contacts from this file' } },
        { status: 400 }
      );
    }

    // Collect emails for duplicate check
    const emails = parseResult.contacts
      .map(c => c.primaryEmail)
      .filter((e): e is string => e !== null);

    // Query existing contacts
    const existingContacts = emails.length > 0
      ? await prisma.contact.findMany({
          where: {
            userId: user.id,
            primaryEmail: { in: emails },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            secondaryEmail: true,
            primaryPhone: true,
            secondaryPhone: true,
            title: true,
            company: true,
            linkedinUrl: true,
            websiteUrl: true,
            streetAddress: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            notes: true,
            enrichmentScore: true,
          },
        })
      : [];

    // Create email -> existing contact map
    const existingByEmail = new Map(
      existingContacts.map(c => [c.primaryEmail?.toLowerCase(), c])
    );

    // Categorize contacts
    const newContacts: ParsedContact[] = [];
    const duplicates: DuplicateAnalysis[] = [];

    for (const contact of parseResult.contacts) {
      const emailKey = contact.primaryEmail?.toLowerCase();
      const existing = emailKey ? existingByEmail.get(emailKey) : undefined;

      if (existing) {
        const conflicts = detectConflicts(contact, existing);
        const autoMergeFields: string[] = [];

        // Check which auto-merge fields have incoming data
        for (const field of AUTO_MERGE_FIELDS) {
          const incomingValue = contact[field as keyof ParsedContact];
          if (incomingValue) {
            autoMergeFields.push(field);
          }
        }

        duplicates.push({
          incoming: contact,
          existing,
          conflicts,
          autoMergeFields,
        });
      } else {
        newContacts.push(contact);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        totalParsed: parseResult.contacts.length,
        newContacts,
        duplicates,
        skipped: parseResult.skipped,
      },
    });
  } catch (error) {
    console.error('VCF upload error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_FAILED', message: 'Failed to process VCF file' } },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 400 for missing file
- [ ] Returns 400 for non-.vcf files
- [ ] Returns 400 for files > 10MB
- [ ] Returns 400 for empty files
- [ ] Successfully parses valid VCF files
- [ ] Detects duplicates by email
- [ ] Returns conflicts for duplicates
- [ ] 60-second timeout configured

---

### Task 2.2: Create VCF commit API endpoint
**Description:** Build POST /api/contacts/import/vcf/commit route to apply import with merge decisions
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 3.1

**Implementation:**

```typescript
// src/app/api/contacts/import/vcf/commit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';
import { ParsedContact } from '@/lib/vcf-parser';

const fieldDecisionSchema = z.object({
  field: z.string(),
  choice: z.enum(['keep', 'use_new']),
});

const duplicateResolutionSchema = z.object({
  existingContactId: z.string(),
  incoming: z.object({
    tempId: z.string(),
    firstName: z.string(),
    lastName: z.string().nullable(),
    primaryEmail: z.string().nullable(),
    secondaryEmail: z.string().nullable(),
    primaryPhone: z.string().nullable(),
    secondaryPhone: z.string().nullable(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    streetAddress: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipCode: z.string().nullable(),
    country: z.string().nullable(),
    notes: z.string().nullable(),
    rawVcardIndex: z.number(),
  }),
  action: z.enum(['skip', 'merge']),
  fieldDecisions: z.array(fieldDecisionSchema).optional(),
});

const commitRequestSchema = z.object({
  newContacts: z.array(z.object({
    tempId: z.string(),
    firstName: z.string(),
    lastName: z.string().nullable(),
    primaryEmail: z.string().nullable(),
    secondaryEmail: z.string().nullable(),
    primaryPhone: z.string().nullable(),
    secondaryPhone: z.string().nullable(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    streetAddress: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipCode: z.string().nullable(),
    country: z.string().nullable(),
    notes: z.string().nullable(),
    rawVcardIndex: z.number(),
  })),
  duplicateResolutions: z.array(duplicateResolutionSchema),
});

interface CommitError {
  tempId: string;
  error: string;
}

export const maxDuration = 60; // 60 second timeout

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in Prisma
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
    });

    // Parse and validate request
    const body = await request.json();
    const { newContacts, duplicateResolutions } = commitRequestSchema.parse(body);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: CommitError[] = [];

    // Create new contacts
    for (const contact of newContacts) {
      try {
        const enrichmentScore = calculateEnrichmentScore(contact, 0);

        await prisma.contact.create({
          data: {
            userId: user.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            primaryEmail: contact.primaryEmail,
            secondaryEmail: contact.secondaryEmail,
            primaryPhone: contact.primaryPhone,
            secondaryPhone: contact.secondaryPhone,
            title: contact.title,
            company: contact.company,
            linkedinUrl: contact.linkedinUrl,
            websiteUrl: contact.websiteUrl,
            streetAddress: contact.streetAddress,
            city: contact.city,
            state: contact.state,
            zipCode: contact.zipCode,
            country: contact.country,
            notes: contact.notes,
            source: 'ICLOUD',
            enrichmentScore,
          },
        });

        created++;
      } catch (error) {
        errors.push({
          tempId: contact.tempId,
          error: error instanceof Error ? error.message : 'Failed to create contact',
        });
      }
    }

    // Process duplicate resolutions
    for (const resolution of duplicateResolutions) {
      if (resolution.action === 'skip') {
        skipped++;
        continue;
      }

      try {
        // Build update data based on field decisions
        const updateData: Record<string, any> = {};
        const fieldDecisions = new Map(
          (resolution.fieldDecisions || []).map(d => [d.field, d.choice])
        );

        // Apply field decisions for conflict fields
        const conflictFields = [
          'firstName', 'lastName', 'title', 'company',
          'primaryPhone', 'secondaryPhone',
          'linkedinUrl', 'websiteUrl',
          'streetAddress', 'city', 'state', 'zipCode', 'country',
        ];

        for (const field of conflictFields) {
          const decision = fieldDecisions.get(field);
          if (decision === 'use_new') {
            const value = resolution.incoming[field as keyof typeof resolution.incoming];
            if (value !== undefined) {
              updateData[field] = value;
            }
          }
        }

        // Fill empty slots (no conflict, auto-fill)
        const existing = await prisma.contact.findUnique({
          where: { id: resolution.existingContactId },
        });

        if (existing) {
          // Auto-fill empty fields
          for (const field of ['secondaryEmail', 'secondaryPhone', 'linkedinUrl', 'websiteUrl']) {
            if (!existing[field as keyof typeof existing] && resolution.incoming[field as keyof typeof resolution.incoming]) {
              updateData[field] = resolution.incoming[field as keyof typeof resolution.incoming];
            }
          }

          // Auto-merge notes
          if (resolution.incoming.notes) {
            const existingNotes = existing.notes || '';
            const separator = existingNotes ? '\n\n[Imported from iCloud]\n' : '';
            updateData.notes = existingNotes + separator + resolution.incoming.notes;
          }
        }

        // Update contact
        if (Object.keys(updateData).length > 0) {
          const updatedContact = await prisma.contact.update({
            where: { id: resolution.existingContactId },
            data: updateData,
          });

          // Recalculate enrichment score
          const tagCount = await prisma.tag.count({
            where: { contactId: resolution.existingContactId },
          });
          const newScore = calculateEnrichmentScore(updatedContact, tagCount);

          await prisma.contact.update({
            where: { id: resolution.existingContactId },
            data: { enrichmentScore: newScore },
          });
        }

        updated++;
      } catch (error) {
        errors.push({
          tempId: resolution.incoming.tempId,
          error: error instanceof Error ? error.message : 'Failed to update contact',
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        created,
        updated,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error('VCF commit error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 400 for invalid request body
- [ ] Creates new contacts with source='ICLOUD'
- [ ] Updates duplicates per field decisions
- [ ] Skips duplicates marked as 'skip'
- [ ] Auto-fills empty slots
- [ ] Auto-merges notes with separator
- [ ] Calculates enrichment scores
- [ ] Returns accurate summary counts
- [ ] Handles partial failures gracefully

---

## Phase 3: UI Components

### Task 3.1: Create ImportSourceCard component
**Description:** Build reusable card component for import source selection
**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 2.2, Task 3.2

**Implementation:**

```typescript
// src/components/import/ImportSourceCard.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImportSourceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  fileTypeHint: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ImportSourceCard({
  icon: Icon,
  title,
  description,
  fileTypeHint,
  onClick,
  disabled = false,
}: ImportSourceCardProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-6 rounded-xl border text-left transition-all
        ${disabled
          ? 'border-zinc-800 bg-zinc-900/50 cursor-not-allowed opacity-50'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-[#C9A227]/50 hover:bg-zinc-800'
        }
      `}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-zinc-700/50">
          <Icon className="w-6 h-6 text-[#C9A227]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-400 mb-2">{description}</p>
          <span className="text-xs text-zinc-500">{fileTypeHint}</span>
        </div>
      </div>
    </motion.button>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders icon, title, description, file type hint
- [ ] Hover state with gold border
- [ ] Disabled state with reduced opacity
- [ ] Click handler fires correctly
- [ ] Follows design system colors

---

### Task 3.2: Create VcfImportFlow component
**Description:** Build main import flow component with all states (upload, analyzing, review, importing, complete)
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2, Task 3.1
**Can run parallel with:** Task 3.3

**Implementation:**

```typescript
// src/components/import/VcfImportFlow.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { ImportMergeReview } from './ImportMergeReview';
import { ParsedContact, SkippedEntry, FieldConflict } from '@/lib/vcf-parser';

type ImportStep = 'upload' | 'analyzing' | 'review' | 'importing' | 'complete';

interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: {
    id: string;
    firstName: string;
    lastName: string | null;
    primaryEmail: string | null;
    // ... other fields
    enrichmentScore: number;
  };
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

interface DuplicateResolution {
  existingContactId: string;
  incoming: ParsedContact;
  action: 'skip' | 'merge';
  fieldDecisions?: Array<{ field: string; choice: 'keep' | 'use_new' }>;
}

interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ tempId: string; error: string }>;
}

interface VcfImportFlowProps {
  onComplete?: () => void;
}

export function VcfImportFlow({ onComplete }: VcfImportFlowProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [error, setError] = useState<string | null>(null);

  // Analysis data
  const [newContacts, setNewContacts] = useState<ParsedContact[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateAnalysis[]>([]);
  const [skippedEntries, setSkippedEntries] = useState<SkippedEntry[]>([]);

  // Import results
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/import/vcf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to process file');
        setStep('upload');
        return;
      }

      setNewContacts(data.analysis.newContacts);
      setDuplicates(data.analysis.duplicates);
      setSkippedEntries(data.analysis.skipped);

      // If there are duplicates, show review; otherwise go straight to import
      if (data.analysis.duplicates.length > 0) {
        setStep('review');
      } else {
        await commitImport(data.analysis.newContacts, []);
      }
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      setStep('upload');
    }
  }, []);

  const commitImport = async (
    contacts: ParsedContact[],
    resolutions: DuplicateResolution[]
  ) => {
    setStep('importing');

    try {
      const response = await fetch('/api/contacts/import/vcf/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newContacts: contacts,
          duplicateResolutions: resolutions,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Import failed');
        setStep('upload');
        return;
      }

      setSummary(data.summary);
      setStep('complete');
    } catch (err) {
      setError('Import failed. Please try again.');
      setStep('upload');
    }
  };

  const handleMergeConfirm = (resolutions: DuplicateResolution[]) => {
    commitImport(newContacts, resolutions);
  };

  const handleMergeCancel = () => {
    setStep('upload');
    setNewContacts([]);
    setDuplicates([]);
    setSkippedEntries([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/vcard': ['.vcf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: step !== 'upload',
  });

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* Upload Step */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive
                  ? 'border-[#C9A227] bg-[#C9A227]/10'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
              <p className="text-lg font-medium text-white mb-2">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your .vcf file'}
              </p>
              <p className="text-sm text-zinc-400 mb-4">
                or click to browse
              </p>
              <p className="text-xs text-zinc-500">
                Maximum file size: 10MB
              </p>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <h4 className="text-sm font-medium text-white mb-2">How to export from iCloud</h4>
              <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Go to iCloud.com and sign in</li>
                <li>Open Contacts</li>
                <li>Select the contacts you want to export (or Cmd+A for all)</li>
                <li>Click the gear icon and choose "Export vCard"</li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#C9A227] animate-spin" />
            <p className="text-lg font-medium text-white">Analyzing contacts...</p>
            <p className="text-sm text-zinc-400 mt-2">This may take a moment for large files</p>
          </motion.div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <ImportMergeReview
            duplicates={duplicates}
            onConfirm={handleMergeConfirm}
            onCancel={handleMergeCancel}
          />
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <motion.div
            key="importing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#C9A227] animate-spin" />
            <p className="text-lg font-medium text-white">Importing contacts...</p>
            <p className="text-sm text-zinc-400 mt-2">
              Importing {newContacts.length + duplicates.length} contacts
            </p>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && summary && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-semibold text-white mb-6">Import Complete</h3>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{summary.created}</p>
                <p className="text-sm text-zinc-400">Created</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{summary.updated}</p>
                <p className="text-sm text-zinc-400">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-400">{summary.skipped}</p>
                <p className="text-sm text-zinc-400">Skipped</p>
              </div>
            </div>

            {skippedEntries.length > 0 && (
              <p className="text-sm text-zinc-500 mb-6">
                {skippedEntries.length} entries could not be imported (missing name or invalid format)
              </p>
            )}

            {summary.errors.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-left">
                <p className="text-sm font-medium text-red-400 mb-2">
                  {summary.errors.length} error(s) occurred:
                </p>
                <ul className="text-sm text-red-300 list-disc list-inside">
                  {summary.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onComplete}
              className="px-6 py-3 rounded-lg bg-[#C9A227] text-black font-medium hover:bg-[#E5C766] transition-colors"
            >
              View Contacts
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] File dropzone accepts .vcf files
- [ ] Shows analyzing spinner during upload
- [ ] Opens merge review when duplicates found
- [ ] Shows importing progress
- [ ] Displays completion summary
- [ ] Error states handled properly
- [ ] Animations smooth and consistent

---

### Task 3.3: Create ImportMergeReview modal component
**Description:** Build merge review modal with per-contact navigation and field conflict resolution
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 3.2

**Technical Requirements (addressing validation gap):**
- Full keyboard navigation support
- Tab: Move between radio buttons and buttons
- Enter: Select focused option
- Escape: Cancel and close modal
- Arrow Left/Right: Navigate between contacts
- Focus management on modal open/close

**Implementation:**

```typescript
// src/components/import/ImportMergeReview.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { ParsedContact, FieldConflict } from '@/lib/vcf-parser';

interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: {
    id: string;
    firstName: string;
    lastName: string | null;
    primaryEmail: string | null;
    title: string | null;
    company: string | null;
    // ... other fields
  };
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

interface DuplicateResolution {
  existingContactId: string;
  incoming: ParsedContact;
  action: 'skip' | 'merge';
  fieldDecisions?: Array<{ field: string; choice: 'keep' | 'use_new' }>;
}

interface ImportMergeReviewProps {
  duplicates: DuplicateAnalysis[];
  onConfirm: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  title: 'Title',
  company: 'Company',
  primaryPhone: 'Primary Phone',
  secondaryPhone: 'Secondary Phone',
  linkedinUrl: 'LinkedIn',
  websiteUrl: 'Website',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  country: 'Country',
};

export function ImportMergeReview({
  duplicates,
  onConfirm,
  onCancel,
}: ImportMergeReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, DuplicateResolution>>(
    () => {
      // Initialize all resolutions with default "keep existing"
      const map = new Map<string, DuplicateResolution>();
      for (const dup of duplicates) {
        map.set(dup.existing.id, {
          existingContactId: dup.existing.id,
          incoming: dup.incoming,
          action: 'merge',
          fieldDecisions: dup.conflicts.map(c => ({
            field: c.field,
            choice: 'keep' as const,
          })),
        });
      }
      return map;
    }
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const current = duplicates[currentIndex];
  const currentResolution = resolutions.get(current.existing.id)!;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onCancel();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < duplicates.length - 1) {
            setCurrentIndex(i => i + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, duplicates.length, onCancel]);

  // Focus management
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const updateFieldDecision = (field: string, choice: 'keep' | 'use_new') => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const current = updated.get(duplicates[currentIndex].existing.id)!;
      const newDecisions = current.fieldDecisions?.map(d =>
        d.field === field ? { ...d, choice } : d
      ) || [];
      updated.set(duplicates[currentIndex].existing.id, {
        ...current,
        fieldDecisions: newDecisions,
      });
      return updated;
    });
  };

  const skipCurrentContact = () => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const current = updated.get(duplicates[currentIndex].existing.id)!;
      updated.set(duplicates[currentIndex].existing.id, {
        ...current,
        action: 'skip',
      });
      return updated;
    });

    // Move to next if not at end
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const acceptAllDefaults = () => {
    // All resolutions already default to "keep existing"
    onConfirm(Array.from(resolutions.values()));
  };

  const handleConfirm = () => {
    onConfirm(Array.from(resolutions.values()));
  };

  const isSkipped = currentResolution.action === 'skip';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-review-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 id="merge-review-title" className="text-lg font-semibold text-white">
            Review Import Conflicts
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-zinc-400 mb-6">
            {duplicates.length} contact{duplicates.length !== 1 ? 's' : ''} already exist in your network.
            Review what should be updated.
          </p>

          {/* Contact Card */}
          <div className={`rounded-lg border p-4 ${
            isSkipped ? 'border-zinc-700 bg-zinc-800/30 opacity-50' : 'border-zinc-700 bg-zinc-800/50'
          }`}>
            {/* Contact Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-white">
                  {current.existing.firstName} {current.existing.lastName}
                </h3>
                <p className="text-sm text-zinc-400">{current.existing.primaryEmail}</p>
              </div>
              <span className="text-sm text-zinc-500">
                {currentIndex + 1} / {duplicates.length}
              </span>
            </div>

            {isSkipped ? (
              <div className="text-center py-4">
                <p className="text-zinc-500">This contact will be skipped</p>
                <button
                  onClick={() => {
                    setResolutions(prev => {
                      const updated = new Map(prev);
                      const current = updated.get(duplicates[currentIndex].existing.id)!;
                      updated.set(duplicates[currentIndex].existing.id, {
                        ...current,
                        action: 'merge',
                      });
                      return updated;
                    });
                  }}
                  className="mt-2 text-sm text-[#C9A227] hover:underline"
                >
                  Undo skip
                </button>
              </div>
            ) : (
              <>
                {/* Conflicts */}
                {current.conflicts.length > 0 ? (
                  <div className="space-y-4">
                    {current.conflicts.map(conflict => {
                      const decision = currentResolution.fieldDecisions?.find(
                        d => d.field === conflict.field
                      );
                      return (
                        <div key={conflict.field} className="space-y-2">
                          <label className="text-sm font-medium text-zinc-300">
                            {FIELD_LABELS[conflict.field] || conflict.field}
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`${current.existing.id}-${conflict.field}`}
                                checked={decision?.choice === 'keep'}
                                onChange={() => updateFieldDecision(conflict.field, 'keep')}
                                className="w-4 h-4 accent-[#C9A227]"
                              />
                              <span className="text-sm text-white">
                                Keep: "{conflict.existingValue}"
                              </span>
                              <span className="text-xs text-zinc-500">(existing)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`${current.existing.id}-${conflict.field}`}
                                checked={decision?.choice === 'use_new'}
                                onChange={() => updateFieldDecision(conflict.field, 'use_new')}
                                className="w-4 h-4 accent-[#C9A227]"
                              />
                              <span className="text-sm text-green-400">
                                Use: "{conflict.incomingValue}"
                              </span>
                              <span className="text-xs text-zinc-500">(incoming)</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 py-4">
                    No conflicts - empty fields will be filled automatically.
                  </p>
                )}

                {/* Auto-merge info */}
                {current.autoMergeFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="flex items-start gap-2 text-sm text-blue-400">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Notes will be appended to existing content</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={skipCurrentContact}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Skip this contact
            </button>
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={currentIndex === duplicates.length - 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-700">
          <button
            onClick={acceptAllDefaults}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Accept All Defaults
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg bg-[#C9A227] text-black font-medium hover:bg-[#E5C766] transition-colors"
          >
            Apply & Import
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows per-contact view with navigation
- [ ] Radio buttons for field conflict resolution
- [ ] Default to "Keep existing" for all fields
- [ ] "Accept All Defaults" button works
- [ ] "Skip this contact" marks contact as skipped
- [ ] Keyboard navigation: Escape, Arrow keys
- [ ] Focus trapped in modal
- [ ] Progress indicator shows current/total
- [ ] Auto-merge info displayed for notes
- [ ] Follows design system colors

---

### Task 3.4: Refactor import page with source-based tabs
**Description:** Update contacts/import page with source-based navigation tabs
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1, Task 3.2, Task 3.3
**Can run parallel with:** None

**Implementation:**

```typescript
// src/app/(dashboard)/contacts/import/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cloud, Mail } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VcfImportFlow } from '@/components/import/VcfImportFlow';
// Import existing CSV flow component

export default function ImportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('icloud');

  const handleImportComplete = () => {
    router.push('/contacts');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Import Contacts</h1>
      <p className="text-zinc-400 mb-8">
        Add contacts from your favorite apps and services
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-6 bg-zinc-800/50 border border-zinc-700 p-1 rounded-lg">
          <TabsTrigger
            value="icloud"
            className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-zinc-700"
          >
            <Cloud className="w-4 h-4" />
            Import from iCloud
          </TabsTrigger>
          <TabsTrigger
            value="google"
            className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-zinc-700"
          >
            <Mail className="w-4 h-4" />
            Import from Google
          </TabsTrigger>
        </TabsList>

        <TabsContent value="icloud">
          <VcfImportFlow onComplete={handleImportComplete} />
        </TabsContent>

        <TabsContent value="google">
          {/* Existing CSV import flow */}
          <div className="text-center py-12 text-zinc-400">
            {/* Placeholder - integrate existing CSV import here */}
            <p>Google Contacts import (CSV) - existing functionality</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Source-based tabs (iCloud, Google)
- [ ] iCloud tab shows VcfImportFlow
- [ ] Google tab shows existing CSV import
- [ ] Tab state persists during navigation
- [ ] Follows design system
- [ ] Redirects to contacts list after import

---

## Phase 4: Testing & Polish

### Task 4.1: Write API integration tests
**Description:** Create integration tests for VCF import API endpoints
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2
**Can run parallel with:** Task 4.2

**Test file location:** `src/app/api/contacts/import/vcf/__tests__/route.test.ts`

**Acceptance Criteria:**
- [ ] Tests for authentication (401)
- [ ] Tests for file validation (400s)
- [ ] Tests for successful parse
- [ ] Tests for duplicate detection
- [ ] Tests for commit with merge decisions

---

### Task 4.2: Write E2E tests for import flow
**Description:** Create Playwright E2E tests for the complete import flow
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.4
**Can run parallel with:** Task 4.1

**Test file location:** `e2e/vcf-import.spec.ts`

**Acceptance Criteria:**
- [ ] Test upload flow
- [ ] Test merge review
- [ ] Test completion summary
- [ ] Test error states

---

### Task 4.3: Manual testing & polish
**Description:** Manual testing with real iCloud exports, fix any issues
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1, Task 4.2
**Can run parallel with:** None

**Testing checklist:**
- [ ] Export contacts from real iCloud account
- [ ] Test with various file sizes (10, 100, 500+ contacts)
- [ ] Test UTF-8 characters in names
- [ ] Test duplicate detection accuracy
- [ ] Verify merge review UX
- [ ] Test keyboard navigation
- [ ] Check accessibility (screen reader)
- [ ] Performance check with large files

---

## Dependency Graph

```
Phase 1 (Foundation)
  1.1 Install vcard4-ts
    └─> 1.2 Create vcf-parser.ts
          └─> 1.3 Parser unit tests

Phase 2 (API)
  1.2 ─┬─> 2.1 Upload endpoint
       │      └─> 2.2 Commit endpoint
       └─> 1.3 (parallel)

Phase 3 (UI)
  2.1 ─┬─> 3.2 VcfImportFlow
       │      └─> 3.4 Import page refactor
  2.2 ─┘

  3.1 ImportSourceCard ─┬─> 3.4
  3.3 ImportMergeReview ─┘

Phase 4 (Testing)
  2.2 ─> 4.1 API tests
  3.4 ─> 4.2 E2E tests
  4.1, 4.2 ─> 4.3 Manual testing
```

## Parallel Execution Opportunities

The following tasks can be worked on simultaneously:
- Task 1.3 (tests) + Task 2.1 (upload endpoint)
- Task 3.1 (ImportSourceCard) + Task 3.2 (VcfImportFlow) + Task 3.3 (ImportMergeReview)
- Task 4.1 (API tests) + Task 4.2 (E2E tests)

## Summary

| Phase | Tasks | Size | Priority |
|-------|-------|------|----------|
| 1. Foundation | 3 | L, S, M | High |
| 2. API | 2 | L, L | High |
| 3. UI | 4 | S, L, L, M | High/Medium |
| 4. Testing | 3 | M, M, M | High |
| **Total** | **12** | - | - |
