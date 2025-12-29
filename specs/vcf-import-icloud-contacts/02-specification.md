# VCF Import for iCloud Contacts - Technical Specification

**Slug:** vcf-import-icloud-contacts
**Author:** Claude Code
**Date:** 2025-12-29
**Status:** Draft
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## 1. Overview

### 1.1 Purpose
Enable users to bulk import contacts from iCloud by uploading VCF (vCard) files exported from iCloud.com. The feature includes smart duplicate detection with user-controlled merge review.

### 1.2 User Stories
1. As a user, I want to import my iCloud contacts so I can enrich them in Better Connections
2. As a user, I want to see which imported contacts already exist so I can decide what to update
3. As a user, I want to review field-by-field conflicts so I don't lose important existing data
4. As a user, I want a progress indicator so I know the import is working on large files

### 1.3 Success Criteria
- User can upload .vcf files up to 10MB
- All standard vCard 3.0 fields are mapped correctly
- Duplicates detected by email with merge review UI
- Import completes in <30 seconds for 1000 contacts
- Zero data loss (existing contact data preserved unless user chooses to update)

---

## 2. Technical Architecture

### 2.1 System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /contacts/import                                                   │
│  ┌─────────────┐  ┌─────────────┐                                  │
│  │ Import from │  │ Import from │  ← Source-based navigation       │
│  │   iCloud    │  │   Google    │                                  │
│  └──────┬──────┘  └─────────────┘                                  │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────┐                                   │
│  │   VCF Dropzone Component    │                                   │
│  │   - Drag & drop .vcf        │                                   │
│  │   - File validation         │                                   │
│  └──────────────┬──────────────┘                                   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌─────────────────────────────┐      ┌──────────────────────────┐ │
│  │   Upload & Parse Phase      │─────▶│   Merge Review Modal     │ │
│  │   - Progress spinner        │      │   - Per-contact view     │ │
│  │   - "Analyzing contacts..." │      │   - Field comparisons    │ │
│  └─────────────────────────────┘      │   - Keep/Use new radios  │ │
│                                       └────────────┬─────────────┘ │
│                                                    │               │
│                                                    ▼               │
│                                       ┌──────────────────────────┐ │
│                                       │   Import Progress        │ │
│                                       │   "Importing 156/500..." │ │
│                                       └────────────┬─────────────┘ │
│                                                    │               │
│                                                    ▼               │
│                                       ┌──────────────────────────┐ │
│                                       │   Completion Summary     │ │
│                                       │   Created: X Updated: Y  │ │
│                                       └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER (API Routes)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/contacts/import/vcf                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Validate file (size, extension, content)                 │   │
│  │ 2. Parse with vcard4-ts                                     │   │
│  │ 3. Map vCard → Contact for each entry                       │   │
│  │ 4. Query existing contacts by email                         │   │
│  │ 5. Categorize: new vs duplicate                             │   │
│  │ 6. Return analysis (no DB writes yet)                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  POST /api/contacts/import/vcf/commit                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Receive merge decisions from client                      │   │
│  │ 2. Create new contacts                                      │   │
│  │ 3. Update duplicates per user choices                       │   │
│  │ 4. Calculate enrichment scores                              │   │
│  │ 5. Return final summary                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependencies

**New dependency:**
```bash
npm install vcard4-ts
```

**Existing dependencies (reused):**
- `@/lib/db` - Prisma client
- `@/lib/supabase/server` - Authentication
- `@/lib/enrichment` - `calculateEnrichmentScore()`
- `zod` - Request validation
- `lucide-react` - Icons
- `framer-motion` - Animations

---

## 3. API Specification

### 3.1 POST /api/contacts/import/vcf

**Purpose:** Upload and analyze VCF file, detect duplicates, return parsed data for review.

**Request:**
```typescript
// Content-Type: multipart/form-data
interface VcfUploadRequest {
  file: File; // .vcf file, max 10MB
}
```

**Response (200 OK):**
```typescript
interface VcfUploadResponse {
  success: true;
  analysis: {
    totalParsed: number;        // Total vCards successfully parsed
    newContacts: ParsedContact[];     // Contacts with no email match
    duplicates: DuplicateAnalysis[];  // Contacts with existing email match
    skipped: SkippedEntry[];          // Invalid/unparseable entries
  };
}

interface ParsedContact {
  tempId: string;              // Client-side tracking ID (uuid)
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
  notes: string | null;        // Includes overflow emails/phones
  rawVcardIndex: number;       // Position in original file (for debugging)
}

interface DuplicateAnalysis {
  incoming: ParsedContact;           // Data from VCF file
  existing: ExistingContact;         // Data from database
  conflicts: FieldConflict[];        // Fields with different values
  autoMergeFields: string[];         // Fields that will auto-append (notes, etc.)
}

interface ExistingContact {
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
}

interface FieldConflict {
  field: string;               // e.g., "title", "company"
  existingValue: string;
  incomingValue: string;
}

interface SkippedEntry {
  index: number;               // Position in file
  reason: SkipReason;
  rawPreview: string;          // First 100 chars of raw vCard
}

type SkipReason =
  | 'NO_NAME'                  // Missing FN and N fields
  | 'PARSE_ERROR'              // Malformed vCard syntax
  | 'EMPTY_ENTRY';             // No usable data
```

**Error Responses:**

```typescript
// 400 Bad Request
interface VcfUploadError {
  success: false;
  error: {
    code: VcfErrorCode;
    message: string;
    details?: string;
  };
}

type VcfErrorCode =
  | 'NO_FILE'                  // No file in request
  | 'INVALID_TYPE'             // Not a .vcf file
  | 'FILE_TOO_LARGE'           // Exceeds 10MB
  | 'EMPTY_FILE'               // File has no content
  | 'NO_VALID_CONTACTS'        // File parsed but no usable contacts
  | 'PARSE_FAILED';            // Complete parse failure

// 401 Unauthorized
{ error: 'Unauthorized' }

// 500 Internal Server Error
{ error: 'Failed to process VCF file' }
```

---

### 3.2 POST /api/contacts/import/vcf/commit

**Purpose:** Apply import with user's merge decisions.

**Request:**
```typescript
interface VcfCommitRequest {
  // New contacts to create (all from newContacts array)
  newContacts: ParsedContact[];

  // Duplicate resolutions
  duplicateResolutions: DuplicateResolution[];
}

interface DuplicateResolution {
  existingContactId: string;
  incoming: ParsedContact;
  action: 'skip' | 'merge';

  // Only required if action === 'merge'
  fieldDecisions?: FieldDecision[];
}

interface FieldDecision {
  field: string;
  choice: 'keep' | 'use_new';
}
```

**Response (200 OK):**
```typescript
interface VcfCommitResponse {
  success: true;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: CommitError[];
  };
}

interface CommitError {
  tempId: string;
  error: string;
}
```

**Error Responses:**
```typescript
// 400 Bad Request
{ error: 'Invalid request body' }

// 401 Unauthorized
{ error: 'Unauthorized' }

// 500 Internal Server Error
{ error: 'Import failed', details: string }
```

---

## 4. VCF Parser Specification

### 4.1 Module: `src/lib/vcf-parser.ts`

```typescript
import { parseVCards, VCard } from 'vcard4-ts';

// ============================================
// Main Parser Function
// ============================================

export interface VcfParseResult {
  contacts: ParsedContact[];
  skipped: SkippedEntry[];
  totalInFile: number;
}

export function parseVcfFile(content: string): VcfParseResult;

// ============================================
// Field Extraction Functions
// ============================================

/**
 * Extract first and last name from vCard
 * Priority: N field > FN field (split on space)
 */
export function extractName(vcard: VCard): { firstName: string; lastName: string | null };

/**
 * Extract emails with overflow handling
 * Returns: { primary, secondary, overflow[] }
 */
export function extractEmails(vcard: VCard): {
  primaryEmail: string | null;
  secondaryEmail: string | null;
  overflowEmails: string[];
};

/**
 * Extract phones with type prioritization
 * Priority: cell/mobile > work > home > other
 */
export function extractPhones(vcard: VCard): {
  primaryPhone: string | null;
  secondaryPhone: string | null;
  overflowPhones: string[];
};

/**
 * Extract and format address fields
 * vCard ADR: [PO Box, Extended, Street, City, Region, Postal, Country]
 */
export function extractAddress(vcard: VCard): {
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
};

/**
 * Extract URLs with LinkedIn detection
 */
export function extractUrls(vcard: VCard): {
  linkedinUrl: string | null;
  websiteUrl: string | null;
};

/**
 * Build notes field including overflow data
 */
export function buildNotesWithOverflow(
  vcard: VCard,
  overflowEmails: string[],
  overflowPhones: string[]
): string | null;

// ============================================
// Duplicate Detection
// ============================================

/**
 * Find conflicts between incoming and existing contact
 */
export function detectConflicts(
  incoming: ParsedContact,
  existing: ExistingContact
): FieldConflict[];

/**
 * Fields that should auto-merge (append) rather than conflict
 */
export const AUTO_MERGE_FIELDS = ['notes', 'expertise', 'interests'] as const;

/**
 * Fields to compare for conflicts
 */
export const CONFLICT_FIELDS = [
  'firstName',
  'lastName',
  'title',
  'company',
  'primaryPhone',
  'secondaryPhone',
  'linkedinUrl',
  'websiteUrl',
  'streetAddress',
  'city',
  'state',
  'zipCode',
  'country',
] as const;
```

### 4.2 Field Mapping Rules

| vCard Property | Extraction Logic | Target Field(s) |
|---------------|------------------|-----------------|
| `N` | `value[1]` (given), `value[0]` (family) | `firstName`, `lastName` |
| `FN` | Split on first space (fallback) | `firstName`, `lastName` |
| `EMAIL` | First by preference, then by order | `primaryEmail`, `secondaryEmail`, notes |
| `TEL` | Priority: cell > mobile > work > home | `primaryPhone`, `secondaryPhone`, notes |
| `ORG` | `value[0]` | `company` |
| `TITLE` | `value[0]` | `title` |
| `ADR` | Index mapping (see above) | Address fields |
| `URL` | LinkedIn detection via domain | `linkedinUrl` or `websiteUrl` |
| `NOTE` | Direct mapping | `notes` |
| `PHOTO` | **Skip entirely** | - |
| `BDAY` | **Skip for v1** | - |

### 4.3 Phone Type Priority

```typescript
const PHONE_TYPE_PRIORITY = [
  'cell',
  'mobile',
  'iphone',      // iCloud-specific
  'main',
  'work',
  'home',
  'voice',
  'other',
] as const;
```

---

## 5. Component Specifications

### 5.1 Import Page Refactor

**File:** `src/app/(dashboard)/contacts/import/page.tsx`

**Changes:**
1. Add source-based navigation tabs
2. Integrate VCF upload flow
3. Keep existing CSV flow in separate tab

**Source Navigation Structure:**
```tsx
<Tabs defaultValue="icloud">
  <TabsList>
    <TabsTrigger value="icloud">
      <Cloud className="w-4 h-4 mr-2" />
      Import from iCloud
    </TabsTrigger>
    <TabsTrigger value="google">
      <Mail className="w-4 h-4 mr-2" />
      Import from Google
    </TabsTrigger>
  </TabsList>

  <TabsContent value="icloud">
    <VcfImportFlow />
  </TabsContent>

  <TabsContent value="google">
    {/* Existing CSV import */}
  </TabsContent>
</Tabs>
```

**Label Guidelines:**
- Tab labels: Source name ("iCloud", "Google")
- Subtitle text: File type hint ("Upload your .vcf file")
- Help text: Instructions for exporting from source

---

### 5.2 VCF Import Flow Component

**File:** `src/components/import/VcfImportFlow.tsx`

**States:**
```typescript
type ImportStep =
  | 'upload'      // File dropzone
  | 'analyzing'   // Parsing file
  | 'review'      // Merge review (if duplicates)
  | 'importing'   // Creating/updating contacts
  | 'complete';   // Summary
```

**Props:**
```typescript
interface VcfImportFlowProps {
  onComplete?: () => void;  // Called after successful import
}
```

---

### 5.3 Import Merge Review Modal

**File:** `src/components/import/ImportMergeReview.tsx`

**Props:**
```typescript
interface ImportMergeReviewProps {
  duplicates: DuplicateAnalysis[];
  onConfirm: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
}
```

**Internal State:**
```typescript
interface MergeReviewState {
  currentIndex: number;                    // Which duplicate we're viewing
  resolutions: Map<string, DuplicateResolution>;  // contactId → resolution
}
```

**Behavior:**
- Opens when `duplicates.length > 0`
- Per-contact navigation with prev/next
- Default all conflicts to "Keep existing"
- "Accept All Defaults" skips to confirmation
- "Skip this contact" marks as `action: 'skip'`
- Progress indicator: "Reviewing 1 of 12"

**Visual Structure (following ConflictResolutionModal pattern):**
```
┌─────────────────────────────────────────────────────────┐
│  Review Import Conflicts                         [×]    │
│─────────────────────────────────────────────────────────│
│                                                         │
│  12 contacts already exist in your network.             │
│  Review what should be updated.                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ John Smith                                 1/12 │   │
│  │ john@example.com                                │   │
│  │─────────────────────────────────────────────────│   │
│  │                                                 │   │
│  │ Title                                           │   │
│  │ ○ Keep: "Product Manager"          (existing)  │   │
│  │ ● Use: "Senior Product Manager"    (incoming)  │   │
│  │                                                 │   │
│  │ Company                                         │   │
│  │ ● Keep: "Acme Corp"                (existing)  │   │
│  │ ○ Use: "Acme Corporation"          (incoming)  │   │
│  │                                                 │   │
│  │ ─────────────────────────────────────────────  │   │
│  │ Notes                                           │   │
│  │ ✓ New notes will be appended to existing       │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Previous]  [Skip this contact]  [Next →]           │
│                                                         │
│─────────────────────────────────────────────────────────│
│  [Accept All Defaults]              [Apply & Import]    │
└─────────────────────────────────────────────────────────┘
```

**Color Tokens:**
- Existing value label: `text-zinc-400`
- Incoming value label: `text-green-400`
- Auto-merge info: `text-blue-400`
- Radio selected: `border-gold-500`

---

### 5.4 Import Source Card Component

**File:** `src/components/import/ImportSourceCard.tsx`

**Props:**
```typescript
interface ImportSourceCardProps {
  icon: LucideIcon;
  title: string;           // "Import from iCloud"
  description: string;     // "Upload contacts exported from iCloud.com"
  fileTypeHint: string;    // ".vcf files"
  onClick: () => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
<ImportSourceCard
  icon={Cloud}
  title="Import from iCloud"
  description="Upload contacts exported from iCloud.com"
  fileTypeHint=".vcf files"
  onClick={() => setActiveTab('icloud')}
/>
```

---

## 6. Edge Cases & Error Handling

### 6.1 File Validation

| Condition | Behavior | User Message |
|-----------|----------|--------------|
| No file selected | Block upload | "Please select a file" |
| Wrong extension | Block upload | "Please upload a .vcf file" |
| File > 10MB | Block upload | "File is too large. Maximum size is 10MB." |
| Empty file | Error response | "The file appears to be empty" |
| Not valid vCard | Error response | "Could not read contacts from this file" |

### 6.2 Parse Edge Cases

| Condition | Behavior | Notes |
|-----------|----------|-------|
| vCard without FN or N | Skip entry | Add to `skipped[]` with reason `NO_NAME` |
| vCard with only PHOTO | Skip entry | No usable contact data |
| Malformed vCard syntax | Skip entry | Continue parsing others |
| Mixed valid/invalid entries | Partial success | Import valid, report skipped |
| No email in vCard | Import as new | Cannot detect as duplicate |
| Duplicate emails in same file | Keep first | Skip subsequent with same email |

### 6.3 Duplicate Detection

| Condition | Behavior |
|-----------|----------|
| Email matches existing contact | Add to `duplicates[]` |
| No email in incoming | Treat as new (no duplicate check possible) |
| Multiple matches (shouldn't happen) | Use first match |
| All contacts are duplicates | Show merge review for all |
| No duplicates | Skip merge review, go to import |

### 6.4 Merge Edge Cases

| Condition | Behavior |
|-----------|----------|
| User cancels merge review | Discard all, return to upload |
| Existing field empty, incoming has value | Auto-fill (no conflict) |
| Both fields empty | No conflict |
| Incoming field empty, existing has value | No conflict (keep existing) |
| User skips all duplicates | Only create new contacts |

### 6.5 Import Errors

| Condition | Behavior | Recovery |
|-----------|----------|----------|
| Network error during commit | Show error | Retry button |
| Partial failure | Report in summary | Show which failed |
| Auth expired mid-import | Redirect to login | - |

---

## 7. Testing Strategy

### 7.1 Unit Tests: VCF Parser

**File:** `src/lib/__tests__/vcf-parser.test.ts`

```typescript
describe('parseVcfFile', () => {
  // Basic parsing
  it('parses single contact VCF');
  it('parses multi-contact VCF (100+ contacts)');
  it('handles empty file gracefully');
  it('handles malformed vCard syntax');

  // Field extraction
  it('extracts name from N field');
  it('falls back to FN when N missing');
  it('splits FN on first space for firstName/lastName');
  it('handles single-word names (firstName only)');

  // Email handling
  it('extracts primary email');
  it('extracts secondary email');
  it('appends overflow emails to notes');
  it('handles no emails gracefully');

  // Phone handling
  it('prioritizes cell/mobile phone type');
  it('extracts work phone as secondary');
  it('appends overflow phones to notes');
  it('handles phone with country code');

  // Address handling
  it('extracts all address components');
  it('handles partial addresses');
  it('handles missing address gracefully');

  // URL handling
  it('detects LinkedIn URL');
  it('places non-LinkedIn URL in websiteUrl');
  it('handles multiple URLs');

  // Edge cases
  it('skips PHOTO property');
  it('handles UTF-8 characters');
  it('handles line folding');
  it('handles escaped characters');
});

describe('detectConflicts', () => {
  it('detects title conflict');
  it('detects company conflict');
  it('ignores empty vs empty');
  it('ignores empty vs value (no conflict)');
  it('is case-sensitive for values');
  it('marks notes as auto-merge field');
});
```

### 7.2 Integration Tests: API Routes

**File:** `src/app/api/contacts/import/vcf/__tests__/route.test.ts`

```typescript
describe('POST /api/contacts/import/vcf', () => {
  it('returns 401 for unauthenticated request');
  it('returns 400 for missing file');
  it('returns 400 for non-vcf file');
  it('returns 400 for file > 10MB');
  it('parses valid VCF and returns analysis');
  it('detects duplicates by email');
  it('categorizes new vs duplicate contacts');
  it('includes skipped entries with reasons');
});

describe('POST /api/contacts/import/vcf/commit', () => {
  it('returns 401 for unauthenticated request');
  it('creates new contacts');
  it('updates duplicates per merge decisions');
  it('skips duplicates marked as skip');
  it('calculates enrichment scores');
  it('returns accurate summary counts');
  it('handles partial failures gracefully');
});
```

### 7.3 E2E Tests

**File:** `e2e/vcf-import.spec.ts`

```typescript
describe('VCF Import Flow', () => {
  beforeEach(() => {
    // Login and navigate to import page
  });

  it('shows source-based navigation');
  it('uploads and parses VCF file');
  it('shows progress during analysis');
  it('displays merge review for duplicates');
  it('allows per-field conflict resolution');
  it('completes import with summary');
  it('navigates to contacts list after import');

  // Error scenarios
  it('shows error for invalid file type');
  it('shows error for empty file');
  it('handles network error gracefully');
});
```

### 7.4 Test Fixtures

**Location:** `src/lib/__tests__/fixtures/`

```
fixtures/
├── single-contact.vcf        # Basic single contact
├── multi-contact.vcf         # 10 contacts
├── large-contact-list.vcf    # 100+ contacts
├── all-fields.vcf            # Contact with every field populated
├── minimal-contact.vcf       # Just FN, nothing else
├── no-email.vcf              # Contact without email
├── malformed.vcf             # Invalid vCard syntax
├── mixed-valid-invalid.vcf   # Some valid, some broken
├── utf8-names.vcf            # International characters
└── with-photos.vcf           # Contains base64 photos (should skip)
```

---

## 8. Implementation Tasks

### Phase 1: Core Parser (Day 1)
- [ ] Install `vcard4-ts` dependency
- [ ] Create `src/lib/vcf-parser.ts` with all extraction functions
- [ ] Write unit tests for parser
- [ ] Create test fixtures

### Phase 2: API Endpoints (Day 1-2)
- [ ] Create `POST /api/contacts/import/vcf` route
- [ ] Create `POST /api/contacts/import/vcf/commit` route
- [ ] Add Zod schemas for request validation
- [ ] Write integration tests

### Phase 3: UI Components (Day 2-3)
- [ ] Create `ImportSourceCard` component
- [ ] Create `VcfImportFlow` component with all states
- [ ] Create `ImportMergeReview` modal
- [ ] Refactor import page with tabs

### Phase 4: Integration (Day 3)
- [ ] Wire up components to API
- [ ] Add progress indicators
- [ ] Handle all error states
- [ ] Add loading states and animations

### Phase 5: Testing & Polish (Day 4)
- [ ] Write E2E tests
- [ ] Manual testing with real iCloud exports
- [ ] Error message copy review
- [ ] Accessibility review
- [ ] Performance testing with large files

---

## 9. File Manifest

### New Files
```
src/
├── lib/
│   ├── vcf-parser.ts                    # VCF parsing utilities
│   └── __tests__/
│       ├── vcf-parser.test.ts           # Parser unit tests
│       └── fixtures/                    # Test VCF files
│           ├── single-contact.vcf
│           ├── multi-contact.vcf
│           └── ...
├── app/
│   └── api/
│       └── contacts/
│           └── import/
│               └── vcf/
│                   ├── route.ts         # Upload & analyze endpoint
│                   └── commit/
│                       └── route.ts     # Commit import endpoint
└── components/
    └── import/
        ├── ImportSourceCard.tsx         # Source selection card
        ├── VcfImportFlow.tsx            # Main import flow
        └── ImportMergeReview.tsx        # Merge review modal

e2e/
└── vcf-import.spec.ts                   # E2E tests
```

### Modified Files
```
src/app/(dashboard)/contacts/import/page.tsx  # Add tabs, integrate VCF flow
package.json                                   # Add vcard4-ts dependency
```

---

## 10. Rollback Plan

If issues are discovered post-deployment:

1. **Feature flag:** No flag needed - VCF tab can be hidden via code
2. **Database:** No schema changes - safe rollback
3. **Revert:** Standard git revert of feature branch
4. **Data:** Imported contacts use `source: 'ICLOUD'` for easy identification/cleanup if needed

---

## Appendix A: Sample VCF Content

```vcf
BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//iCloud Web Address Book 2449B13//EN
N:Smith;John;Q.;;
FN:John Q. Smith
ORG:Acme Corporation;
TITLE:Senior Product Manager
EMAIL;type=INTERNET;type=HOME;type=pref:john@personal.com
EMAIL;type=INTERNET;type=WORK:john.smith@acme.com
TEL;type=CELL;type=VOICE;type=pref:+1 (555) 123-4567
TEL;type=WORK;type=VOICE:+1 (555) 987-6543
ADR;type=HOME;type=pref:;;123 Main Street;San Francisco;CA;94102;USA
URL;type=pref:https://www.linkedin.com/in/johnsmith
URL:https://johnsmith.com
NOTE:Met at TechCrunch Disrupt 2024. Interested in AI startups.
END:VCARD
```

---

## Appendix B: Conflict Resolution Examples

**Example 1: Title conflict**
```
Existing: "Product Manager"
Incoming: "Senior Product Manager"
→ Show radio buttons, default to "Keep existing"
```

**Example 2: Empty slot fill (no conflict)**
```
Existing secondaryEmail: null
Incoming secondaryEmail: "john.work@acme.com"
→ Auto-fill, no user decision needed
```

**Example 3: Notes merge**
```
Existing: "Met at conference"
Incoming: "Works on AI projects"
→ Auto-merge: "Met at conference\n\n[Imported from iCloud]\nWorks on AI projects"
```
