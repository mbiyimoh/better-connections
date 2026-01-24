# AttendeeCard Layout Alignment - Task Breakdown

**Spec:** `02-spec.md`
**Date:** 2026-01-24

---

## Task 1: Add Style Constants to styles.ts

**File:** `src/app/m33t/[slug]/components/styles.ts`

**Changes:**
- Add `CURRENT_FOCUS_CALLOUT_CLASS` for inset panel styling
- Add `CURRENT_FOCUS_TEXT_STYLE` for amber italic text

**Estimated:** 5 minutes

---

## Task 2: Refactor AttendeeCard Layout Structure

**File:** `src/app/m33t/[slug]/components/AttendeeCard.tsx`

**Changes:**
1. Add fixed card height `h-[280px]`
2. Add `flex flex-col` to card container
3. Create HEADER ZONE wrapper with `min-h-[88px] max-h-[88px]`
4. Create CONTENT ZONE wrapper with `flex-1`
5. Create FOOTER ZONE wrapper with `min-h-[56px] mt-auto`
6. Move divider inside content zone (always render, not conditional)

**Estimated:** 15 minutes

---

## Task 3: Add Header Field Truncation

**File:** `src/app/m33t/[slug]/components/AttendeeCard.tsx`

**Changes:**
- Ensure all header text fields have `truncate` class
- Name: already has truncate ✓
- Title: already has truncate ✓
- Company: already has truncate ✓
- Location: already has truncate ✓

**Estimated:** 2 minutes (verification only)

---

## Task 4: Implement 2-Row Tag Display

**File:** `src/app/m33t/[slug]/components/AttendeeCard.tsx`

**Changes:**
1. Change from `slice(0, 3)` to `slice(0, 6)` for MAX_VISIBLE_TAGS
2. Add `max-h-[68px] overflow-hidden` to tag container
3. Update "+N" calculation for new limit

**Estimated:** 5 minutes

---

## Task 5: Create Current Focus Callout

**File:** `src/app/m33t/[slug]/components/AttendeeCard.tsx`

**Changes:**
1. Import new style constants
2. Wrap currentFocus in callout container with inset panel styling
3. Keep `line-clamp-2` for text truncation
4. Always render footer zone (even when empty) to preserve space

**Estimated:** 10 minutes

---

## Task 6: Update Barrel Exports

**File:** `src/app/m33t/[slug]/components/index.ts`

**Changes:**
- Add new style constant exports if needed

**Estimated:** 2 minutes

---

## Task 7: Visual Testing

**Manual testing checklist:**
- [ ] Two cards side-by-side: tags at same Y position
- [ ] Card with all fields vs minimal fields: same height
- [ ] Card with 1 tag vs 8+ tags: consistent layout
- [ ] Long current focus text: properly truncated
- [ ] No current focus: empty footer space preserved
- [ ] Hover state works correctly

**Estimated:** 15 minutes

---

## Execution Order

1. Task 1 (styles.ts) - Foundation
2. Task 2 (layout structure) - Core change
3. Task 3 (truncation) - Verification
4. Task 4 (2-row tags) - Content zone
5. Task 5 (callout) - Footer zone
6. Task 6 (exports) - Cleanup
7. Task 7 (testing) - Validation

**Total Estimated:** ~55 minutes
