# Task Breakdown: Spec D - VCF Import Enhancements

**Generated:** 2026-01-03
**Source:** specs/emily-feedback-jan-2026/spec-d-vcf-import-enhancements.md
**Feature Slug:** emily-feedback-jan-2026
**Last Decompose:** 2026-01-03

---

## Overview

Two features to improve VCF import UX:
1. **Bulk Skip Button** - Skip all remaining email duplicates with one click
2. **Same-Name Detection** - Detect and merge contacts with matching names but different emails

**Total Tasks:** 7
**Estimated Effort:** ~7-8 hours

---

## Phase 1: Bulk Skip Button

### Task 1.1: Add "Skip All Remaining" Button to ImportMergeReview

**Description:** Add a button that marks all unreviewed duplicates as 'skip' and completes the review flow immediately.
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (standalone feature)

**File:** `src/components/import/ImportMergeReview.tsx`

**Technical Requirements:**
- Calculate count of unreviewed duplicates
- Create skip resolutions for all unreviewed duplicates
- Merge with existing resolutions and call onComplete
- Button only visible when unreviewedCount > 0
- Style: secondary action (zinc background, not primary color)

**Implementation:**

```typescript
// Add to component - calculate unreviewed count
const unreviewedCount = duplicates.filter(d =>
  !resolutions.some(r => r.newContactIndex === d.newContactIndex)
).length;

// Add handler function
const handleSkipAllRemaining = () => {
  const unreviewedDuplicates = duplicates.filter(d =>
    !resolutions.some(r => r.newContactIndex === d.newContactIndex)
  );

  const skipResolutions: DuplicateResolution[] = unreviewedDuplicates.map(dup => ({
    newContactIndex: dup.newContactIndex,
    existingContactId: dup.existingContact.id,
    action: 'skip' as const,
    fieldResolutions: {} // No field merging needed for skip
  }));

  // Merge with existing resolutions and complete
  onComplete([...resolutions, ...skipResolutions]);
};

// Add to footer JSX (after existing buttons)
{unreviewedCount > 0 && (
  <button
    onClick={handleSkipAllRemaining}
    className="mt-4 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700
               border border-zinc-600 rounded-lg text-zinc-300
               flex items-center justify-center gap-2"
  >
    <Zap className="w-4 h-4" />
    Skip All Remaining ({unreviewedCount} duplicates)
  </button>
)}
```

**Acceptance Criteria:**
- [ ] Button visible only when unreviewed duplicates exist
- [ ] Button shows count of remaining duplicates
- [ ] Clicking button creates skip resolutions for all unreviewed
- [ ] Flow completes immediately after clicking
- [ ] Previously reviewed items (merged) are preserved

---

## Phase 2: Same-Name Detection Infrastructure

### Task 2.1: Add normalizeName Utility

**Description:** Create name normalization function for duplicate detection.
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**File:** `src/lib/vcf-parser.ts`

**Technical Requirements:**
- Trim whitespace from name parts
- Convert to lowercase for comparison
- Remove common honorifics (Dr., Mr., Mrs., Ms., Prof.)
- Handle single-word names (no lastName)
- Return empty string for empty/null inputs

**Implementation:**

```typescript
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
  const honorifics = ['dr.', 'dr', 'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'prof.', 'prof'];
  const filtered = parts.filter(p => !honorifics.includes(p));

  return filtered.join(' ');
}
```

**Acceptance Criteria:**
- [ ] "John Smith" and "john smith" normalize to same value
- [ ] "Dr. John Smith" and "John Smith" normalize to same value
- [ ] "Madonna" (no lastName) returns "madonna"
- [ ] Empty/null inputs return empty string
- [ ] Handles extra whitespace correctly

---

### Task 2.2: Add Same-Name Group Detection to VCF Analysis API

**Description:** Detect contacts with matching normalized names and group them for review.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**File:** `src/app/api/contacts/import/vcf/route.ts`

**Technical Requirements:**
- Import normalizeName from vcf-parser
- Group ALL contacts (new from VCF + existing in DB) by normalized name
- Only return groups with potential duplicates:
  - Multiple new contacts with same name, OR
  - New contact matching existing contact name (without email match already detected)
- Exclude contacts already flagged as email duplicates

**Implementation:**

```typescript
import { normalizeName } from "@/lib/vcf-parser";

interface SameNameGroup {
  normalizedName: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    primaryEmail: string | null;
    phone: string | null;
    company: string | null;
    title: string | null;
  }>;
  newContacts: Array<{
    firstName: string;
    lastName: string | null;
    primaryEmail: string | null;
    phone: string | null;
    company: string | null;
    title: string | null;
    vcfIndex: number;  // To track which VCF contact this is
  }>;
}

function detectSameNameGroups(
  newContacts: ParsedContact[],
  existingContacts: ExistingContact[],
  emailDuplicateIndices: Set<number>  // Indices already flagged as email duplicates
): SameNameGroup[] {
  const nameMap = new Map<string, SameNameGroup>();

  // Add existing contacts to groups
  for (const contact of existingContacts) {
    const key = normalizeName(contact.firstName, contact.lastName);
    if (!key) continue;

    const group = nameMap.get(key) || {
      normalizedName: key,
      existingContacts: [],
      newContacts: []
    };
    group.existingContacts.push({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      primaryEmail: contact.primaryEmail,
      phone: contact.phone,
      company: contact.company,
      title: contact.title,
    });
    nameMap.set(key, group);
  }

  // Add new contacts to groups (skip those already flagged as email duplicates)
  newContacts.forEach((contact, index) => {
    if (emailDuplicateIndices.has(index)) return;  // Already handled by email duplicate flow

    const key = normalizeName(contact.firstName, contact.lastName || '');
    if (!key) return;

    const group = nameMap.get(key) || {
      normalizedName: key,
      existingContacts: [],
      newContacts: []
    };
    group.newContacts.push({
      firstName: contact.firstName,
      lastName: contact.lastName || null,
      primaryEmail: contact.primaryEmail || null,
      phone: contact.phone || null,
      company: contact.company || null,
      title: contact.title || null,
      vcfIndex: index,
    });
    nameMap.set(key, group);
  });

  // Return only groups with potential duplicates
  return [...nameMap.values()].filter(group =>
    group.newContacts.length > 1 ||
    (group.newContacts.length >= 1 && group.existingContacts.length >= 1)
  );
}
```

**Error Handling:**
```typescript
// Wrap in try-catch, return empty array on error
let sameNameGroups: SameNameGroup[] = [];
try {
  sameNameGroups = detectSameNameGroups(parsedContacts, existingContacts, emailDuplicateIndices);
} catch (error) {
  console.error("Same-name detection error:", error);
  // Proceed with empty groups - feature is enhancement, not blocking
}
```

**Acceptance Criteria:**
- [ ] Groups contacts by normalized name correctly
- [ ] Excludes contacts already flagged as email duplicates
- [ ] Only returns groups with 2+ contacts
- [ ] Handles errors gracefully (returns empty array)
- [ ] Includes all required fields for UI display

---

### Task 2.3: Update VCF Analysis Response Schema

**Description:** Add sameNameGroups to API response.
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** None

**File:** `src/app/api/contacts/import/vcf/route.ts`

**Technical Requirements:**
- Add sameNameGroups to response
- Add sameNamePotentialDuplicates count to stats
- Ensure response is backwards compatible (new field, not breaking)

**Implementation:**

```typescript
// Update response type
interface VcfAnalysisResponse {
  contacts: ParsedContact[];
  duplicates: DuplicateAnalysis[];
  sameNameGroups: SameNameGroup[];  // NEW
  stats: {
    total: number;
    duplicates: number;
    sameNamePotentialDuplicates: number;  // NEW
    newContacts: number;
  };
}

// Update return statement
return NextResponse.json({
  contacts: parsedContacts,
  duplicates,
  sameNameGroups,
  stats: {
    total: parsedContacts.length,
    duplicates: duplicates.length,
    sameNamePotentialDuplicates: sameNameGroups.reduce(
      (sum, g) => sum + g.existingContacts.length + g.newContacts.length,
      0
    ),
    newContacts: parsedContacts.length - duplicates.length,
  },
});
```

**Acceptance Criteria:**
- [ ] Response includes sameNameGroups array
- [ ] Stats include sameNamePotentialDuplicates count
- [ ] Existing fields unchanged (backwards compatible)

---

## Phase 3: Same-Name Review UI

### Task 3.1: Create SameNameMergeReview Component

**Description:** Build the UI component for reviewing same-name potential duplicates.
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.3
**Can run parallel with:** None

**File:** `src/components/import/SameNameMergeReview.tsx` (NEW)

**Technical Requirements:**
- Display current group with all contacts (existing + new)
- Three decision options: Merge All, Keep Separate, Skip New
- Navigation between groups (prev/next)
- Progress dots showing reviewed status
- Auto-advance after decision
- Default unreviewed to 'keep_separate'
- Back button to return to email review

**Component Props:**
```typescript
interface SameNameGroup {
  normalizedName: string;
  existingContacts: ContactPreview[];
  newContacts: ContactPreview[];
}

interface ContactPreview {
  id?: string;  // Only for existing contacts
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  vcfIndex?: number;  // Only for new contacts
}

type SameNameDecision =
  | { action: 'merge' }
  | { action: 'keep_separate' }
  | { action: 'skip_new' };

interface SameNameMergeReviewProps {
  groups: SameNameGroup[];
  onComplete: (decisions: Map<string, SameNameDecision>) => void;
  onBack: () => void;
}
```

**Full Implementation:** (See spec Section 4.5 for complete component code - ~150 lines)

Key UI elements:
- Header with group count and back button
- Contact cards grid (existing vs new styled differently)
- Decision buttons (Merge All, Keep Separate, Skip New)
- Navigation with progress dots
- Complete button with unreviewed count

**Acceptance Criteria:**
- [ ] Displays all contacts in current group
- [ ] Existing vs new contacts visually distinguished
- [ ] Three decision options work correctly
- [ ] Navigation between groups works
- [ ] Progress dots show reviewed status (green) vs current (amber) vs pending (gray)
- [ ] Auto-advances after decision
- [ ] Complete fills unreviewed with 'keep_separate'
- [ ] Back button returns to email review

---

### Task 3.2: Integrate name-review Step in VcfImportFlow

**Description:** Add the same-name review step to the import flow.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None

**File:** `src/components/import/VcfImportFlow.tsx`

**Technical Requirements:**
- Add 'name-review' step to ImportStep type
- Rename 'review' to 'email-review' for clarity
- Store sameNameGroups and sameNameDecisions in state
- Route to name-review after email-review if groups exist
- Skip name-review if no same-name groups
- Pass decisions to executeImport

**Implementation:**

```typescript
// Update step type
type ImportStep =
  | 'upload'
  | 'analyzing'
  | 'email-review'      // Renamed from 'review'
  | 'name-review'       // NEW step
  | 'importing'
  | 'complete';

// Add state
const [sameNameGroups, setSameNameGroups] = useState<SameNameGroup[]>([]);
const [sameNameDecisions, setSameNameDecisions] = useState<Map<string, SameNameDecision>>(new Map());

// Update analysis result handler
useEffect(() => {
  if (analysisResult) {
    // ... existing duplicate handling
    setSameNameGroups(analysisResult.sameNameGroups || []);

    // Determine initial step
    if (analysisResult.duplicates.length > 0) {
      setStep('email-review');
    } else if (analysisResult.sameNameGroups?.length > 0) {
      setStep('name-review');
    } else {
      setStep('importing');
      executeImport([], new Map());
    }
  }
}, [analysisResult]);

// After email duplicate review
const handleEmailReviewComplete = (resolutions: DuplicateResolution[]) => {
  setDuplicateResolutions(resolutions);

  if (sameNameGroups.length > 0) {
    setStep('name-review');
  } else {
    setStep('importing');
    executeImport(resolutions, new Map());
  }
};

// After same-name review
const handleNameReviewComplete = (decisions: Map<string, SameNameDecision>) => {
  setSameNameDecisions(decisions);
  setStep('importing');
  executeImport(duplicateResolutions, decisions);
};

// Render step
{step === 'name-review' && (
  <SameNameMergeReview
    groups={sameNameGroups}
    onComplete={handleNameReviewComplete}
    onBack={() => setStep('email-review')}
  />
)}
```

**Acceptance Criteria:**
- [ ] Flow shows name-review step when same-name groups exist
- [ ] Skips name-review when no groups
- [ ] Back button works from name-review to email-review
- [ ] Handles case: no email duplicates but has same-name groups
- [ ] Decisions passed to import execution

---

## Phase 4: Merge Logic

### Task 4.1: Add Merge Logic to Commit Endpoint

**Description:** Implement contact merging for same-name decisions.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.2
**Can run parallel with:** None

**File:** `src/app/api/contacts/import/vcf/commit/route.ts`

**Technical Requirements:**
- Update request schema to accept sameNameDecisions
- Process decisions: merge, keep_separate, skip_new
- Merge logic: combine emails, phones, notes; first non-null for single-value fields
- Priority: existing contact > most complete new contact

**Request Schema Update:**
```typescript
const commitRequestSchema = z.object({
  contacts: z.array(parsedContactSchema),
  duplicateResolutions: z.array(duplicateResolutionSchema),
  sameNameDecisions: z.record(
    z.string(),  // normalized name as key
    z.enum(['merge', 'keep_separate', 'skip_new'])
  ).optional().default({}),
});
```

**Merge Function:**
```typescript
interface ContactData {
  id?: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  notes: string | null;
}

function mergeContacts(contacts: ContactData[]): ContactData {
  // Sort: existing contacts first, then by most complete
  const sorted = [...contacts].sort((a, b) => {
    if (a.id && !b.id) return -1;  // Existing first
    if (!a.id && b.id) return 1;
    // Then by field completeness
    const aScore = countFields(a);
    const bScore = countFields(b);
    return bScore - aScore;
  });

  const base = sorted[0];
  const merged: ContactData = { ...base };

  // Collect all emails (for future: could store in notes or secondary field)
  const emails = new Set<string>();
  for (const c of contacts) {
    if (c.primaryEmail) emails.add(c.primaryEmail.toLowerCase());
  }
  merged.primaryEmail = emails.values().next().value || null;

  // Collect all phones
  const phones = new Set<string>();
  for (const c of contacts) {
    if (c.phone) phones.add(c.phone);
  }
  merged.phone = phones.values().next().value || null;

  // For single-value fields, use first non-null
  merged.title = contacts.find(c => c.title)?.title || null;
  merged.company = contacts.find(c => c.company)?.company || null;
  merged.location = contacts.find(c => c.location)?.location || null;

  // Combine notes with separator
  const allNotes = contacts
    .map(c => c.notes)
    .filter(Boolean)
    .join('\n\n---\n\n');
  merged.notes = allNotes || null;

  return merged;
}

function countFields(contact: ContactData): number {
  return [
    contact.primaryEmail,
    contact.phone,
    contact.title,
    contact.company,
    contact.location,
    contact.notes
  ].filter(Boolean).length;
}
```

**Processing Logic:**
```typescript
// In POST handler, after processing duplicateResolutions:

// Process same-name decisions
for (const [normalizedName, decision] of Object.entries(sameNameDecisions)) {
  const group = sameNameGroups.find(g => g.normalizedName === normalizedName);
  if (!group) continue;

  switch (decision) {
    case 'merge':
      // Merge all contacts into one
      const allContacts = [...group.existingContacts, ...group.newContacts];
      const merged = mergeContacts(allContacts);

      if (group.existingContacts.length > 0) {
        // Update existing contact with merged data
        await prisma.contact.update({
          where: { id: group.existingContacts[0].id },
          data: { ...merged, updatedAt: new Date() }
        });
      } else {
        // Create new merged contact
        await prisma.contact.create({
          data: { ...merged, userId: user.id }
        });
      }

      // Mark new contacts as processed (don't import separately)
      for (const nc of group.newContacts) {
        processedIndices.add(nc.vcfIndex);
      }
      break;

    case 'keep_separate':
      // Do nothing special - contacts will be imported as separate entries
      break;

    case 'skip_new':
      // Skip all new contacts in this group
      for (const nc of group.newContacts) {
        processedIndices.add(nc.vcfIndex);
      }
      break;
  }
}
```

**Acceptance Criteria:**
- [ ] Request accepts sameNameDecisions field
- [ ] 'merge' combines all contacts correctly
- [ ] Existing contact is updated when merging (not duplicated)
- [ ] Notes are combined with separator
- [ ] 'keep_separate' imports all as separate contacts
- [ ] 'skip_new' skips new contacts, keeps existing
- [ ] Handles empty sameNameDecisions gracefully

---

## Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1: Bulk Skip | 1 | ~30 min |
| Phase 2: Same-Name Detection | 3 | ~2 hours |
| Phase 3: Same-Name UI | 2 | ~3-4 hours |
| Phase 4: Merge Logic | 1 | ~1-2 hours |
| **Total** | **7** | **~7-8 hours** |

### Execution Order

```
Task 1.1 (Bulk Skip) ─────────────────────────────────────────┐
                                                              │
Task 2.1 (normalizeName) ──► Task 2.2 (Detection) ──► Task 2.3 (Schema) ──► Task 3.1 (UI) ──► Task 3.2 (Flow) ──► Task 4.1 (Merge)
```

**Parallel opportunities:**
- Task 1.1 can run in parallel with Phase 2 tasks
- All other tasks are sequential (dependencies)

### Testing Notes

After implementation, test with:
1. VCF with 50+ email duplicates → verify Skip All works
2. VCF with same-name contacts (different emails) → verify detection
3. Mix of email duplicates AND same-name groups → verify both flows work
4. Edge cases: single-word names, honorifics, case variations
