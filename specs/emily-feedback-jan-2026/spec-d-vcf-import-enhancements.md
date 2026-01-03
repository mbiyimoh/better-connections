# Spec D: VCF Import Enhancements

**Status:** Ready for Implementation
**Priority:** 4 (import is one-time flow, less urgent)
**Feedback Items:** 1, 2
**Estimated Effort:** ~7-8 hours

---

## 1. Context & Problem

### User Report 1 (Bulk Skip)
> "If there are duplicates the prompt asks if you want to skip them, however I had to do this individually for all of them. There should be an added 'do this for all duplicate contacts' button."

**Pain Point:** User had many email duplicates and had to click "Skip" dozens of times.

### User Report 2 (Same-Name Detection)
> "If there are duplicate names in your address book... the program should suggest to merge everyone with the same name, combining email addresses, phone, data, etc. There should be a way to review these before saying 'merge' (in the instance you actually know two different people with the exact same name)"

**Pain Point:** Contacts with same name but different emails aren't flagged as potential duplicates.

---

## 2. Current Implementation Analysis

### Duplicate Detection (Email-Only)
**File:** `src/app/api/contacts/import/vcf/route.ts`

```typescript
// Current: Only detects duplicates by email match
const existingContacts = await prisma.contact.findMany({
  where: {
    userId: user.id,
    OR: uniqueEmails.map(email => ({
      primaryEmail: { equals: email, mode: 'insensitive' }
    }))
  }
});
```

**Limitation:** Two "John Smith" contacts with different emails are NOT flagged.

### Merge Review UI (One-at-a-Time)
**File:** `src/components/import/ImportMergeReview.tsx`

```
Current Flow:
┌─────────────────────────────────────────┐
│  Reviewing duplicate 1 of 47            │
│                                         │
│  [Field-by-field comparison]            │
│                                         │
│  [Skip] [Previous] [Next] [Accept All]  │  ← Must skip one at a time!
└─────────────────────────────────────────┘
```

**"Accept All Defaults"** exists but only resolves field conflicts - doesn't skip duplicates.

### VCF Import Flow Steps
**File:** `src/components/import/VcfImportFlow.tsx`

```
Current: upload → analyzing → review → importing → complete
                              ↑
                     (email duplicates only)

Proposed: upload → analyzing → email-review → name-review → importing → complete
                               ↑               ↑
                    (with Skip All)   (NEW: same-name detection)
```

---

## 3. Solution: Bulk Skip Button

### 3.1 UI Design

Add "Skip All Remaining" button to footer of ImportMergeReview:

```
┌─────────────────────────────────────────────────────────────┐
│  Reviewing duplicate 3 of 47                                │
│                                                             │
│  ┌─ Existing Contact ─┐    ┌─ New Contact ────┐             │
│  │ John Smith         │    │ John Smith       │             │
│  │ john@company.com   │    │ john@company.com │             │
│  └────────────────────┘    └──────────────────┘             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Skip This]  [← Prev]  [Next →]           [Accept All]     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ⚡ Skip All Remaining (44 duplicates)                 │  │
│  │     Don't import any contacts that match existing     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Implementation

**File:** `src/components/import/ImportMergeReview.tsx`

```typescript
// Add to component state
const unreviewedCount = duplicates.filter(d =>
  !resolutions.some(r => r.newContactIndex === d.newContactIndex)
).length;

// Add handler
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

// Add to footer JSX
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

---

## 4. Solution: Same-Name Detection

### 4.1 Flow Integration

**Modified import flow:**
```
upload → analyzing → email-duplicates → same-name-review → importing → complete
                            ↓                   ↓
                     (bulk skip)         (merge/keep separate)
```

### 4.2 Name Normalization

**File:** `src/lib/vcf-parser.ts` (add utility)

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

### 4.3 API Enhancement

**File:** `src/app/api/contacts/import/vcf/route.ts`

Add same-name grouping after email duplicate check:

```typescript
// After email duplicate detection...

// Group all contacts (new + existing) by normalized name
interface SameNameGroup {
  normalizedName: string;
  existingContacts: ExistingContact[];
  newContacts: ParsedContact[];
}

function detectSameNameGroups(
  newContacts: ParsedContact[],
  existingContacts: ExistingContact[]
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
    group.existingContacts.push(contact);
    nameMap.set(key, group);
  }

  // Add new contacts to groups
  for (const contact of newContacts) {
    const key = normalizeName(contact.firstName, contact.lastName || '');
    if (!key) continue;

    const group = nameMap.get(key) || {
      normalizedName: key,
      existingContacts: [],
      newContacts: []
    };
    group.newContacts.push(contact);
    nameMap.set(key, group);
  }

  // Return only groups with potential duplicates:
  // - Multiple new contacts with same name, OR
  // - New contact matching existing contact name (without email match)
  return [...nameMap.values()].filter(group =>
    group.newContacts.length > 1 ||
    (group.newContacts.length >= 1 && group.existingContacts.length >= 1)
  );
}
```

**Error Handling:** If same-name detection throws an error, log it and return empty `sameNameGroups: []`. The import flow should proceed gracefully - same-name detection is enhancement, not blocking.

**Loading State:** During analysis, show "Analyzing contacts..." then "Checking for duplicates..." to indicate progress.

### 4.4 Response Schema Update

**File:** `src/app/api/contacts/import/vcf/route.ts`

```typescript
// Extended response includes same-name groups
interface VcfAnalysisResponse {
  contacts: ParsedContact[];
  duplicates: DuplicateAnalysis[];      // Email-based (existing)
  sameNameGroups: SameNameGroup[];      // Name-based (NEW)
  stats: {
    total: number;
    duplicates: number;
    sameNamePotentialDuplicates: number;
    newContacts: number;
  };
}
```

### 4.5 Same-Name Review Component

**File:** `src/components/import/SameNameMergeReview.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, X, ChevronLeft, ChevronRight, Merge } from "lucide-react";

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
}

type SameNameDecision =
  | { action: 'merge' }           // Merge all into one
  | { action: 'keep_separate' }   // Import all as separate contacts
  | { action: 'skip_new' };       // Skip new contacts, keep existing only

interface SameNameMergeReviewProps {
  groups: SameNameGroup[];
  onComplete: (decisions: Map<string, SameNameDecision>) => void;
  onBack: () => void;
}

export function SameNameMergeReview({
  groups,
  onComplete,
  onBack
}: SameNameMergeReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, SameNameDecision>>(new Map());

  const currentGroup = groups[currentIndex];
  const allContacts = [
    ...currentGroup.existingContacts.map(c => ({ ...c, isExisting: true })),
    ...currentGroup.newContacts.map(c => ({ ...c, isExisting: false }))
  ];

  const handleDecision = (decision: SameNameDecision) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(currentGroup.normalizedName, decision);
    setDecisions(newDecisions);

    // Auto-advance to next group
    if (currentIndex < groups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleComplete = () => {
    // Fill in any unreviewed groups with 'keep_separate' default
    const finalDecisions = new Map(decisions);
    for (const group of groups) {
      if (!finalDecisions.has(group.normalizedName)) {
        finalDecisions.set(group.normalizedName, { action: 'keep_separate' });
      }
    }
    onComplete(finalDecisions);
  };

  const unreviewedCount = groups.filter(g => !decisions.has(g.normalizedName)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Same Name Detected
          </h3>
          <p className="text-sm text-zinc-400">
            Reviewing {currentIndex + 1} of {groups.length} potential duplicates
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Back to email duplicates
        </button>
      </div>

      {/* Contact Cards Grid */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-400" />
          <span className="font-medium text-white capitalize">
            "{currentGroup.normalizedName}"
          </span>
          <span className="text-zinc-400">
            ({allContacts.length} contacts)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allContacts.map((contact, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                contact.isExisting
                  ? 'bg-zinc-700/50 border-zinc-600'
                  : 'bg-blue-900/20 border-blue-700/50'
              }`}
            >
              <div className="text-xs text-zinc-500 mb-1">
                {contact.isExisting ? 'Existing' : 'New from import'}
              </div>
              <div className="font-medium text-white">
                {contact.firstName} {contact.lastName}
              </div>
              {contact.primaryEmail && (
                <div className="text-sm text-zinc-400">{contact.primaryEmail}</div>
              )}
              {contact.phone && (
                <div className="text-sm text-zinc-500">{contact.phone}</div>
              )}
              {contact.company && (
                <div className="text-sm text-zinc-500">{contact.company}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleDecision({ action: 'merge' })}
          className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500
                     rounded-lg text-white font-medium flex items-center
                     justify-center gap-2"
        >
          <Merge className="w-4 h-4" />
          Same Person - Merge All
        </button>

        <button
          onClick={() => handleDecision({ action: 'keep_separate' })}
          className="w-full px-4 py-3 bg-zinc-700 hover:bg-zinc-600
                     rounded-lg text-white font-medium flex items-center
                     justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          Different People - Keep Separate
        </button>

        {currentGroup.existingContacts.length > 0 && (
          <button
            onClick={() => handleDecision({ action: 'skip_new' })}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700
                       border border-zinc-600 rounded-lg text-zinc-300
                       text-sm"
          >
            Skip new contacts (keep existing only)
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1">
          {groups.map((group, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full ${
                decisions.has(group.normalizedName)
                  ? 'bg-green-500'
                  : idx === currentIndex
                    ? 'bg-amber-400'
                    : 'bg-zinc-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentIndex(Math.min(groups.length - 1, currentIndex + 1))}
          disabled={currentIndex === groups.length - 1}
          className="px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Complete Button */}
      <button
        onClick={handleComplete}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-500
                   rounded-lg text-white font-medium"
      >
        {unreviewedCount > 0
          ? `Continue (${unreviewedCount} will be kept separate)`
          : 'Continue to Import'}
      </button>
    </div>
  );
}
```

### 4.6 Commit Endpoint Request Schema Update

**File:** `src/app/api/contacts/import/vcf/commit/route.ts`

```typescript
// Updated request schema to include same-name decisions
interface VcfCommitRequest {
  contacts: ParsedContact[];
  duplicateResolutions: DuplicateResolution[];
  sameNameDecisions: Record<string, 'merge' | 'keep_separate' | 'skip_new'>;  // NEW
}

// Zod schema update
const commitRequestSchema = z.object({
  contacts: z.array(parsedContactSchema),
  duplicateResolutions: z.array(duplicateResolutionSchema),
  sameNameDecisions: z.record(
    z.string(),  // normalized name as key
    z.enum(['merge', 'keep_separate', 'skip_new'])
  ).optional().default({}),
});
```

### 4.7 Merge Logic for Same-Name Contacts

**File:** `src/app/api/contacts/import/vcf/commit/route.ts` (extend)

```typescript
/**
 * Merge multiple contacts with same name into one.
 * Priority: existing contact wins for single-value fields.
 * Multi-value fields (emails, phones, notes) are combined.
 */
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

  // Collect all emails
  const emails = new Set<string>();
  for (const c of contacts) {
    if (c.primaryEmail) emails.add(c.primaryEmail.toLowerCase());
  }
  // First email is primary, rest could go to notes or future secondaryEmail field
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

  // Combine notes
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

---

## 5. VcfImportFlow Integration

**File:** `src/components/import/VcfImportFlow.tsx`

```typescript
type ImportStep =
  | 'upload'
  | 'analyzing'
  | 'email-review'      // Renamed from 'review'
  | 'name-review'       // NEW step
  | 'importing'
  | 'complete';

// In component state
const [sameNameGroups, setSameNameGroups] = useState<SameNameGroup[]>([]);
const [sameNameDecisions, setSameNameDecisions] = useState<Map<string, SameNameDecision>>(new Map());

// After upload analysis
useEffect(() => {
  if (analysisResult) {
    // ... existing duplicate handling
    setSameNameGroups(analysisResult.sameNameGroups || []);

    // If no email duplicates but has same-name groups, skip to name review
    if (analysisResult.duplicates.length === 0 && analysisResult.sameNameGroups.length > 0) {
      setStep('name-review');
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

---

## 6. Test Scenarios

### 6.1 Bulk Skip
1. Import VCF with 50 email duplicates
2. Skip first 3 manually
3. Click "Skip All Remaining"
4. Verify: 47 marked as skip, import proceeds immediately
5. Verify: Only non-duplicate contacts imported

### 6.2 Same-Name Detection
1. Have existing contact "John Smith" (john@work.com)
2. Import VCF with "John Smith" (john@personal.com)
3. Verify: Same-name review step appears
4. Test "Merge All" -> Single contact with both emails
5. Test "Keep Separate" -> Two separate contacts
6. Test "Skip new" -> Only existing contact remains

### 6.3 Multiple Same-Name Groups
1. Import VCF with:
   - 2x "John Smith" (different emails)
   - 3x "Jane Doe" (different emails)
2. Verify: Can navigate between groups
3. Verify: Progress dots show reviewed status
4. Verify: Can complete with partial review (defaults to keep separate)

### 6.4 Edge Cases
1. **Single-word names:** "Madonna" with no last name
2. **Honorifics:** "Dr. John Smith" vs "John Smith"
3. **Case sensitivity:** "JOHN SMITH" vs "John Smith"
4. **Empty names:** Should not create same-name group

---

## 7. Success Criteria

- [ ] "Skip All Remaining" button visible when unreviewed duplicates > 0
- [ ] Button shows count of remaining duplicates
- [ ] Clicking Skip All completes review immediately
- [ ] Same-name groups detected across new and existing contacts
- [ ] Same-name review step appears when groups exist
- [ ] User can merge, keep separate, or skip for each group
- [ ] Merge combines emails, phones, and notes correctly
- [ ] Navigation between groups works with progress indication
- [ ] Flow gracefully handles 0 email duplicates with same-name groups
- [ ] Name normalization handles honorifics and case differences

---

## 8. Open Questions (Decided)

1. **Same-name detection timing?**
   - Decision: Run on import (not separate feature)
   - Rationale: User is already in "clean up" mindset during import

2. **Multiple emails when merging?**
   - Decision: First email becomes primary, extras go to notes
   - Future: Add secondaryEmail field to Contact model

3. **Confidence scoring?**
   - Decision: Not for V1. Name match is binary (same or not)
   - Future: Could add company/title matching for "likely same person"

4. **Name variations?**
   - Decision: Exact normalized match only for V1
   - Future: Could add fuzzy name matching (Johnny/John, J./John)

---

## 9. Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `src/components/import/ImportMergeReview.tsx` | Modify | Add "Skip All Remaining" button |
| `src/lib/vcf-parser.ts` | Modify | Add `normalizeName()` utility |
| `src/app/api/contacts/import/vcf/route.ts` | Modify | Add same-name group detection |
| `src/components/import/SameNameMergeReview.tsx` | Create | New component for same-name review |
| `src/components/import/VcfImportFlow.tsx` | Modify | Add name-review step |
| `src/app/api/contacts/import/vcf/commit/route.ts` | Modify | Add merge logic for same-name |
