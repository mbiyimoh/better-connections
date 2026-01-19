# Contact Import System - Developer Guide

**Last Updated:** 2026-01-15
**Component:** VCF/vCard Import with Duplicate Detection & Merge Review

---

## 1. Architecture Overview

The contact import system handles VCF file uploads through a two-phase workflow: **analyze** (detect duplicates) → **commit** (create/update contacts with user decisions).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTACT IMPORT PIPELINE                                │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Upload    │───>│   Parse     │───>│  Duplicate  │───>│   Review    │  │
│  │   .vcf      │    │   vCard     │    │  Detection  │    │     UI      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                     │       │
│                                                                     ▼       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Celebration │<───│   Commit    │<───│    Merge    │<───│   Field     │  │
│  │   Summary   │    │   Import    │    │  Decisions  │    │  Decisions  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  Drag & drop       vcard4-ts         Email + Name       Per-field          │
│  10MB max          parsing           matching           resolution         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Duplicate Detection Strategy

1. **Email-based duplicates:** Primary priority - exact email match (case-insensitive)
2. **Same-name groups:** Secondary - normalized name match without email match
3. **New contacts:** No existing contact matches by email or name

---

## 2. Key Dependencies

| Library | Purpose |
|---------|---------|
| `vcard4-ts` | vCard 4.0 parsing library |
| `react-dropzone` | Drag-and-drop file upload |
| `framer-motion` | Step transitions and animations |
| `zod` | Request validation on commit |

---

## 3. Where Contact Import Is Used

| Location | Purpose |
|----------|---------|
| `/contacts/import` | Main import page with VCF upload |
| `VcfImportFlow` | Multi-step import wizard |
| `ImportMergeReview` | Email duplicate resolution UI |
| `SameNameMergeReview` | Same-name duplicate resolution UI |

---

## 4. Quick Implementation Reference

### VCF Parsing (vcf-parser.ts)

```typescript
import { parseVcfFile, detectConflicts } from '@/lib/vcf-parser';

// Parse raw VCF content
const { contacts, skipped } = parseVcfFile(vcfContent);

// contacts: ParsedContact[] - successfully parsed
// skipped: SkippedEntry[] - entries without valid names

interface ParsedContact {
  tempId: string;           // UUID for tracking
  rawVcardIndex: number;    // Index in original file
  firstName: string;        // Required
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
}
```

### Phone Type Priority

VCF files often contain multiple phone numbers with type labels. The parser prioritizes:

```typescript
// src/lib/vcf-parser.ts:11-14
export const PHONE_TYPE_PRIORITY: readonly string[] = [
  'cell', 'mobile', 'iphone', 'main', 'work', 'home', 'voice', 'other'
];
```

**Extraction logic:**
1. Sort phone numbers by type priority index
2. First phone becomes `primaryPhone`
3. Second phone becomes `secondaryPhone`

### Name Normalization

For same-name detection, names are normalized:

```typescript
// src/lib/vcf-parser.ts:20-28
export function normalizeName(firstName: string, lastName: string | null): string {
  const combined = `${firstName} ${lastName || ''}`.toLowerCase();
  return combined
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '')       // Remove punctuation
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}
```

### Conflict Detection

```typescript
// src/lib/vcf-parser.ts:73-103
export const CONFLICT_FIELDS = [
  'firstName', 'lastName', 'title', 'company',
  'primaryPhone', 'secondaryPhone',
  'linkedinUrl', 'websiteUrl',
  'streetAddress', 'city', 'state', 'zipCode', 'country',
] as const;

export function detectConflicts(
  incoming: ParsedContact,
  existing: ExistingContact
): FieldConflict[] {
  return CONFLICT_FIELDS
    .map(field => {
      const incomingValue = incoming[field];
      const existingValue = existing[field];
      // Conflict if both have values AND they differ
      if (incomingValue && existingValue && incomingValue !== existingValue) {
        return { field, incomingValue, existingValue };
      }
      return null;
    })
    .filter((c): c is FieldConflict => c !== null);
}
```

### Two-Phase API Flow

**Phase 1: Analyze (`POST /api/contacts/import/vcf`)**

```typescript
// Request: FormData with 'file' field
const formData = new FormData();
formData.append('file', vcfFile);

const response = await fetch('/api/contacts/import/vcf', {
  method: 'POST',
  body: formData,
});

// Response
interface VcfUploadResponse {
  success: true;
  analysis: {
    totalParsed: number;
    newContacts: ParsedContact[];         // No duplicates
    duplicates: DuplicateAnalysis[];      // Email matches
    sameNameGroups: SameNameGroup[];      // Name matches
    skipped: SkippedEntry[];              // Invalid entries
  };
}
```

**Phase 2: Commit (`POST /api/contacts/import/vcf/commit`)**

```typescript
// Request
interface CommitRequest {
  newContacts: ParsedContact[];
  duplicateResolutions: DuplicateResolution[];
  sameNameDecisions: Record<string, 'merge' | 'keep_separate' | 'skip_new'>;
}

// Response
interface CommitResponse {
  success: true;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ tempId: string; error: string }>;
  };
}
```

---

## 5. UX Flow & State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPORT STEP STATE MACHINE                           │
│                                                                             │
│   upload ──► analyzing ──┬──► email-review ──┬──► name-review ──► importing │
│      │                   │        │          │        │              │      │
│      │                   │        │          │        ▼              ▼      │
│      │                   │        │          └──► importing ──► complete    │
│      │                   │        ▼                                         │
│      │                   └──► importing ──► complete                        │
│      │                                                                      │
│      └──────────────────── (error) ◄───────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step Transitions:**

| From | Condition | To |
|------|-----------|-----|
| `upload` | File dropped | `analyzing` |
| `analyzing` | Has email duplicates | `email-review` |
| `analyzing` | Only name duplicates | `name-review` |
| `analyzing` | No duplicates | `importing` |
| `email-review` | User confirms | `name-review` (if groups exist) or `importing` |
| `name-review` | User confirms | `importing` |
| `importing` | Commit complete | `complete` |
| Any | Error | `upload` |

---

## 6. Duplicate Resolution Types

### Email Duplicates (DuplicateResolution)

```typescript
interface DuplicateResolution {
  existingContactId: string;
  incoming: ParsedContact;
  action: 'skip' | 'merge';
  fieldDecisions?: Array<{
    field: string;
    choice: 'keep' | 'use_new';
  }>;
}
```

**Bulk Actions:**
- `Skip All` - Mark all duplicates as skipped
- `Merge All (Smart)` - Fill empty fields only
- `Replace Empty` - Fill only empty fields with incoming
- `Replace All` - Overwrite all fields (requires confirmation)

### Same-Name Duplicates (SameNameDecision)

```typescript
type SameNameDecision =
  | { action: 'merge' }           // Merge all into one contact
  | { action: 'keep_separate' }   // Import all as separate contacts
  | { action: 'skip_new' };       // Skip new contacts, keep existing only
```

**Same-name merge logic:**
1. Find all contacts with matching normalized name
2. Sort by: existing contacts first, then by field completeness
3. Use first contact as base
4. Collect all emails/phones into primary/secondary slots
5. For single-value fields, use first non-null value
6. Concatenate all notes with `\n\n---\n\n` separator

---

## 7. vCard Field Extraction

### vcard4-ts Named Properties

```typescript
// CORRECT - Use named properties
const vcard = vcards[0];
const name = vcard.N?.value?.familyNames?.[0];
const givenName = vcard.N?.value?.givenNames?.[0];

// WRONG - Don't use array indexing
const name = vcard.N?.value?.[0];  // TypeScript error
```

### Field Mapping

| vCard Property | Mapped Field | Notes |
|----------------|--------------|-------|
| `N.value.givenNames[0]` | `firstName` | Required |
| `N.value.familyNames[0]` | `lastName` | Optional |
| `EMAIL[0].value` | `primaryEmail` | First email |
| `EMAIL[1].value` | `secondaryEmail` | Second email |
| `TEL` (sorted by type) | `primaryPhone`, `secondaryPhone` | Priority sorted |
| `TITLE.value` | `title` | Job title |
| `ORG.value[0]` | `company` | Organization name |
| `ADR.value.streetAddress` | `streetAddress` | Street |
| `ADR.value.locality` | `city` | City |
| `ADR.value.region` | `state` | State/Province |
| `ADR.value.postalCode` | `zipCode` | ZIP/Postal code |
| `ADR.value.countryName` | `country` | Country |
| `NOTE.value` | `notes` | Free-form notes |
| `URL` (linkedin check) | `linkedinUrl` | URL containing 'linkedin' |
| `URL` (other) | `websiteUrl` | First non-LinkedIn URL |

---

## 8. Critical Gotchas

### MIME Type Variations

Different browsers/OS report different MIME types for .vcf files:

```typescript
// src/components/import/VcfImportFlow.tsx:164-169
accept: {
  'text/vcard': ['.vcf'],        // Standard
  'text/x-vcard': ['.vcf'],      // macOS common
  'text/directory': ['.vcf'],    // Older vCard format
  'application/octet-stream': ['.vcf'],  // Windows fallback
},
```

### Case-Insensitive Email Matching

```typescript
// src/app/api/contacts/import/vcf/route.ts:229-234
const existingContacts = await prisma.contact.findMany({
  where: {
    userId: user.id,
    OR: emails.map(email => ({
      primaryEmail: { equals: email, mode: 'insensitive' }
    })),
  },
});
```

### Hooks Before Returns

React hooks must be called before any early returns:

```typescript
// WRONG - Will cause React error
function ImportMergeReview({ duplicates }) {
  const current = duplicates[0];
  if (!current) return null;  // Early return BEFORE hooks

  const [state, setState] = useState(...);  // Hook after return!
}

// CORRECT - Hooks first, then early return
function ImportMergeReview({ duplicates }) {
  const [state, setState] = useState(...);  // Hook first

  const current = duplicates[0];
  if (!current) return null;  // Early return AFTER hooks
}
```

### Auto-Merge Fields vs Conflict Fields

```typescript
// AUTO_MERGE_FIELDS: Always fill if empty, never show in conflict UI
export const AUTO_MERGE_FIELDS = ['secondaryEmail', 'notes'] as const;

// CONFLICT_FIELDS: Show in UI if both have different values
export const CONFLICT_FIELDS = [
  'firstName', 'lastName', 'title', 'company',
  'primaryPhone', 'secondaryPhone',
  'linkedinUrl', 'websiteUrl',
  'streetAddress', 'city', 'state', 'zipCode', 'country',
] as const;
```

### Notes Append Pattern

Notes are always appended, never overwritten:

```typescript
// src/app/api/contacts/import/vcf/commit/route.ts:469-472
if (resolution.incoming.notes) {
  const existingNotes = existing.notes || '';
  const separator = existingNotes ? '\n\n[Imported from iCloud]\n' : '';
  updateData.notes = existingNotes + separator + resolution.incoming.notes;
}
```

### Enrichment Score Recalculation

After updating a contact, always recalculate the enrichment score:

```typescript
// src/app/api/contacts/import/vcf/commit/route.ts:483-491
const tagCount = await prisma.tag.count({
  where: { contactId: resolution.existingContactId },
});
const newScore = calculateEnrichmentScore(updatedContact, tagCount);

await prisma.contact.update({
  where: { id: resolution.existingContactId },
  data: { enrichmentScore: newScore },
});
```

---

## 9. Testing Import Flow

### Manual Testing

1. Start dev server: `PORT=3333 npm run dev`
2. Navigate to `/contacts/import`
3. Export a .vcf from iCloud Contacts
4. Drag file into drop zone
5. Test scenarios:
   - First import (no duplicates) → Direct import
   - Import with email duplicates → Email review modal
   - Import with same-name contacts → Name review modal
   - Mixed duplicates → Both review steps

### Test Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty .vcf file | Error: "The file appears to be empty" |
| No valid names in file | Error: "Could not read any valid contacts" |
| All new contacts | Skip review, import directly |
| Email duplicates only | Show email review modal |
| Same-name groups only | Show name review modal |
| Both duplicate types | Email review → Name review → Import |
| Skip all duplicates | Fast path to completion |
| Replace all fields | Confirmation dialog required |

### E2E Test Files

```
.quick-checks/
├── test-import-flow.spec.ts    # Full import workflow
├── test-vcf-parsing.spec.ts    # VCF parsing edge cases
└── test-merge-decisions.spec.ts # Duplicate resolution
```

---

## 10. File Structure Reference

```
src/
├── lib/
│   ├── vcf-parser.ts            # VCF parsing & conflict detection
│   ├── vcf-import-types.ts      # Shared type definitions
│   └── enrichment.ts            # Score calculation
├── app/
│   └── api/contacts/import/
│       ├── vcf/
│       │   ├── route.ts         # Analyze endpoint (Phase 1)
│       │   └── commit/
│       │       └── route.ts     # Commit endpoint (Phase 2)
│       └── csv/
│           └── route.ts         # CSV import (simpler flow)
└── components/import/
    ├── VcfImportFlow.tsx        # Multi-step wizard
    ├── ImportMergeReview.tsx    # Email duplicate UI
    └── SameNameMergeReview.tsx  # Name duplicate UI
```

---

## 11. Connections to Other Systems

| System | Connection |
|--------|------------|
| Contact Detail | Imported contacts appear in `/contacts/:id` |
| Enrichment Score | Calculated on import, recalculated on merge |
| Contact List | New contacts appear in main table |
| Explore Chat | Imported contacts searchable via AI |
| Delete All | Can clear all before fresh import |

---

## 12. Quick Reference

### File Size Limits

| Limit | Value |
|-------|-------|
| Max file size | 10MB |
| Max duration (analyze) | 60 seconds |
| Max duration (commit) | 60 seconds |

### Import Source

All VCF imports are tagged with:

```typescript
source: 'ICLOUD'
```

### Validation Schema (Commit)

```typescript
const commitRequestSchema = z.object({
  newContacts: z.array(parsedContactSchema),
  duplicateResolutions: z.array(duplicateResolutionSchema),
  sameNameDecisions: z.record(
    z.string(),  // normalized name as key
    z.enum(['merge', 'keep_separate', 'skip_new'])
  ).optional().default({}),
});
```

---

## 13. Related Guides

- [Architecture Overview](./00-architecture-overview-guide.md) - System architecture
- [Voice Enrichment Guide](./01-voice-enrichment-guide.md) - Enriching imported contacts
- [Research Enrichment Guide](./02-research-enrichment-guide.md) - AI research on contacts
