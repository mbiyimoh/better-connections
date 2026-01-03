# Spec B Brief: Enrichment Flow Polish

**Status:** Brief (not full spec)
**Priority:** 2 (after bug fixes)
**Feedback Items:** 3, 4, 6, 9, 15

---

## Summary

Improve the enrichment workflow from discovery → session → completion with better navigation, editing capabilities, and flow continuity.

---

## Changes Required

### 1. Search Bar in Enrichment Queue (Item 3)
**File:** `src/app/(dashboard)/enrichment/page.tsx`
**Change:** Add search input above the priority queue list
**Behavior:** Filter queue by name/email/company while preserving priority ordering
**Pattern:** Copy from `ContactsTable.tsx` search implementation

### 2. Prominent Edit + Enrich Buttons (Item 4)
**File:** `src/components/contacts/ContactDetail.tsx`
**Current:** Edit is a button, Enrich is buried in "More" dropdown (line ~273)
**Change:** Two side-by-side buttons in header: "Edit Contact" and "Enrich"
**Design:** Both should be visible, Enrich gets gold accent color

### 3. Editable Tags Before Save (Item 6)
**File:** `src/app/(dashboard)/enrichment/session/page.tsx`
**Current:** Tags display in bubbles but aren't directly editable
**Change:**
- Click tag → inline edit mode
- X button to delete tag
- Option to change category via dropdown
**Complexity:** Medium - need to track edited state vs. AI-extracted state

### 4. "Enrich Further" Button (Item 9)
**File:** `src/components/enrichment/completion/CompletionCelebration.tsx`
**Current:** Shows celebration, score improvement, mentioned people - no continue option
**Change:** Add "Continue Enriching This Contact" button below the celebration
**Behavior:** Returns to enrichment session for same contact

### 5. Relationship Strength Descriptions (Item 15)
**File:** `src/components/contacts/ContactDetail.tsx` or form components
**Current:** 4 dots with labels "Weak, Casual, Good, Strong"
**Change:** Add tooltip or inline descriptions:
- Weak: "Know through friends of friends"
- Casual: "Met a few times, friendly"
- Good: "Regular contact, would help if asked"
- Strong: "Close relationship, can call anytime"

---

## Key Files

| File | Changes |
|------|---------|
| `src/app/(dashboard)/enrichment/page.tsx` | Add search input, filter logic |
| `src/components/contacts/ContactDetail.tsx` | Button layout, relationship descriptions |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Tag editing UI |
| `src/components/enrichment/completion/CompletionCelebration.tsx` | Continue button |

---

## Dependencies

- None blocking
- Could optionally wait for Spec A if we want consistent search patterns

---

## Estimation

- Search bar: 1 hour
- Edit/Enrich buttons: 30 min
- Editable tags: 2-3 hours (most complex)
- Continue button: 30 min
- Relationship descriptions: 30 min

**Total:** ~5-6 hours

---

## Open Questions

1. Should tag editing show original AI extraction vs. user edits?
2. Should "Continue Enriching" add to existing notes or start fresh?
3. Where should relationship descriptions appear - tooltip, inline, or modal?
