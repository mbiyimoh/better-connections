# Spec D Brief: VCF Import Enhancements

**Status:** Brief (not full spec)
**Priority:** 4 (import is one-time flow, less urgent)
**Feedback Items:** 1, 2

---

## Summary

Improve VCF import UX for users with many duplicates by adding bulk operations and same-name detection.

---

## Changes Required

### 1. Bulk Duplicate Skip (Item 1)

**User report:** "If there are duplicates the prompt asks if you want to skip them, however I had to do this individually for all of them. There should be an added 'do this for all duplicate contacts' button."

**File:** `src/components/import/ImportMergeReview.tsx`

**Current flow:**
- Modal shows one duplicate at a time
- User must click "Skip this contact" individually
- Or click through each with Next/Previous

**New UI options:**
1. **"Skip All Remaining"** button in footer
   - Marks all unreviewed duplicates as `action: 'skip'`
   - Immediately proceeds to import

2. **"Accept All Defaults"** already exists (line 189-192)
   - Currently keeps existing values for conflicts
   - Already a form of bulk action

3. **Checkbox option:** "Apply this decision to all similar conflicts"
   - When user picks "keep" or "use new" for a field type
   - Applies same choice to all duplicates with that field conflict

**Recommended:** Add "Skip All Remaining Duplicates" button. Simple, addresses the pain point directly.

### 2. Same-Name Merge Suggestions (Item 2)

**User report:** "If there are duplicate names in your address book... the program should suggest to merge everyone with the same name, combining email addresses, phone, data, etc. There should be a way to review these before saying 'merge' (in the instance you actually know two different people with the exact same name)"

**Current duplicate detection:** Email-based only
**File:** `src/app/api/contacts/import/vcf/route.ts`

**New flow:**
1. After email duplicate check, group by normalized name
2. If 2+ contacts share a name, flag as "potential duplicates"
3. Present in a new UI step: "We found contacts with the same name"
4. Side-by-side comparison showing all fields
5. User options:
   - "These are the same person" → Merge
   - "These are different people" → Keep separate
   - "Let me review each" → Per-contact decision

**New component needed:** `SameNameMergeReview.tsx`

---

## Key Files

| File | Changes |
|------|---------|
| `src/components/import/ImportMergeReview.tsx` | Add "Skip All" button |
| `src/components/import/VcfImportFlow.tsx` | Add same-name detection step |
| `src/app/api/contacts/import/vcf/route.ts` | Add name-based grouping logic |
| NEW: `src/components/import/SameNameMergeReview.tsx` | Same-name comparison UI |

---

## Name Normalization Logic

```typescript
function normalizeName(firstName: string, lastName: string | null): string {
  return [firstName, lastName]
    .filter(Boolean)
    .map(s => s.trim().toLowerCase())
    .join(' ');
}

// Group contacts by normalized name
const nameGroups = new Map<string, Contact[]>();
for (const contact of contacts) {
  const key = normalizeName(contact.firstName, contact.lastName);
  const group = nameGroups.get(key) || [];
  group.push(contact);
  nameGroups.set(key, group);
}

// Flag groups with 2+ contacts
const potentialDuplicates = [...nameGroups.entries()]
  .filter(([_, contacts]) => contacts.length > 1);
```

---

## Same-Name Merge UI Design

```
┌─────────────────────────────────────────────────────────────┐
│  Potential Duplicate: "John Smith" (3 contacts)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ John Smith   │ │ John Smith   │ │ John Smith   │        │
│  │ john@a.com   │ │ jsmith@b.com │ │ (no email)   │        │
│  │ Tech Corp    │ │ Tech Corp    │ │ Tech Corp    │        │
│  │ 555-1234     │ │ (no phone)   │ │ 555-5678     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  [Merge All]  [Keep Separate]  [Review Individually]       │
└─────────────────────────────────────────────────────────────┘
```

**Merge logic:**
- Combine all emails (primary, secondary, tertiary?)
- Combine all phones
- Keep first non-null for single-value fields (title, company)
- Append all notes
- Highest enrichment score wins for conflicts

---

## Estimation

- "Skip All" button: 30 min
- Name normalization + grouping: 1 hour
- SameNameMergeReview component: 3-4 hours
- Flow integration: 1 hour
- Merge logic: 1-2 hours

**Total:** ~7-8 hours

---

## Open Questions

1. Should same-name detection run on import or be a separate "Find Duplicates" feature?
2. How to handle more than 2 fields (e.g., 3 emails) when merging?
3. Should we show confidence score for "likely same person" based on field overlap?
4. What about slight name variations? "John Smith" vs "Johnny Smith" vs "J. Smith"?
