# Spec E Brief: Navigation & Discovery

**Status:** Brief (not full spec)
**Priority:** 5 (polish, nice-to-have)
**Feedback Items:** 13, 14

---

## Summary

Improve navigation and discovery UX with alphabet quick-jump and smart suggestions based on contact data.

---

## Changes Required

### 1. Alphabet Slider (Item 13)

**User report:** "Should have an alphabet slider on both the contacts and enrich pages instead of just a scroll bar."

**Files:**
- `src/components/contacts/ContactsTable.tsx`
- `src/app/(dashboard)/enrichment/page.tsx`

**New component:** `src/components/ui/AlphabetSlider.tsx`

**Design:**
```
┌─────────────────────────────────────────────┐
│  Contacts                            [A]    │
│  ─────────────────────────────────── [B]    │
│  Aaron Smith                         [C]    │
│  Alice Johnson                       [D]    │
│  ...                                 [E]    │
│  Bob Williams                        [...]  │
│  Brian Lee                           [S] ←  │
│  ...                                 [T]    │
│  Sarah Connor  ← jumps here          [...]  │
│  Steve Rogers                        [Z]    │
└─────────────────────────────────────────────┘
```

**Behavior:**
- Vertical strip on right side of list
- Click letter → scroll to first contact starting with that letter
- Highlight current letter based on visible contacts
- Gray out letters with no contacts
- Mobile: Could be horizontal strip at top

**Implementation:**
```typescript
interface AlphabetSliderProps {
  contacts: { firstName: string }[];
  onLetterClick: (letter: string) => void;
  currentLetter?: string;
}

// Generate available letters
const availableLetters = new Set(
  contacts.map(c => c.firstName[0]?.toUpperCase()).filter(Boolean)
);
```

### 2. Phone Area Code Hometown Suggestion (Item 14)

**User report:** "I would like it to suggest a hometown based on the area code of their phone number. While we know its not always going to be true i think the % is going to be high that we can say 'yes' versus having to type in their hometown."

**New utility:** `src/lib/area-codes.ts`

**Data source options:**
1. Static JSON mapping (US/CA area codes → city/state)
2. `libphonenumber-js` library (already handles phone parsing)
3. External API (more accurate but adds dependency)

**Recommended:** Static mapping for US area codes. ~350 entries, covers majority of use cases.

**Integration points:**
- Contact creation/edit form
- VCF import (suggest hometown for imported contacts)
- Enrichment (if hometown is empty, suggest based on phone)

**UX:**
```
┌─────────────────────────────────────────────┐
│  Hometown: [                            ]   │
│  ℹ️ Based on area code (201), this might   │
│     be: Newark, NJ area                     │
│     [Use This] [Dismiss]                    │
└─────────────────────────────────────────────┘
```

**Edge cases:**
- Mobile numbers (area codes less reliable)
- Multiple phone numbers with different area codes
- Non-US numbers (skip suggestion)
- VOIP numbers (area code may not reflect location)

---

## Key Files

| File | Changes |
|------|---------|
| NEW: `src/components/ui/AlphabetSlider.tsx` | Reusable alphabet nav |
| `src/components/contacts/ContactsTable.tsx` | Integrate alphabet slider |
| `src/app/(dashboard)/enrichment/page.tsx` | Integrate alphabet slider |
| NEW: `src/lib/area-codes.ts` | Area code → location mapping |
| `src/components/contacts/ContactForm.tsx` | Hometown suggestion UI |

---

## Area Code Data Structure

```typescript
// src/lib/area-codes.ts

interface AreaCodeInfo {
  code: string;
  city: string;
  state: string;
  stateAbbr: string;
}

export const US_AREA_CODES: Record<string, AreaCodeInfo> = {
  '201': { code: '201', city: 'Jersey City', state: 'New Jersey', stateAbbr: 'NJ' },
  '202': { code: '202', city: 'Washington', state: 'District of Columbia', stateAbbr: 'DC' },
  '203': { code: '203', city: 'New Haven', state: 'Connecticut', stateAbbr: 'CT' },
  // ... ~350 more entries
};

export function suggestHometownFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  // Handle +1 prefix
  const areaCode = digits.startsWith('1') ? digits.slice(1, 4) : digits.slice(0, 3);
  const info = US_AREA_CODES[areaCode];
  if (!info) return null;
  return `${info.city}, ${info.stateAbbr}`;
}
```

---

## Estimation

- AlphabetSlider component: 2-3 hours
- Integration with ContactsTable: 1 hour
- Integration with Enrichment page: 1 hour
- Area code data file: 1-2 hours (data entry/sourcing)
- Hometown suggestion UI: 1-2 hours

**Total:** ~7-9 hours

---

## Open Questions

1. Should alphabet slider be sticky or scroll with content?
2. On mobile, where should alphabet slider go? (limited screen real estate)
3. Should area code suggestions be opt-in via settings?
4. How to phrase suggestion to avoid implying certainty? ("might be from" vs "is from")
