# Task Breakdown: Spec B - Enrichment Flow Polish

**Generated:** 2026-01-02
**Source:** specs/emily-feedback-jan-2026/spec-b-enrichment-flow-polish.md
**Feature Slug:** spec-b-enrichment-polish
**Last Decompose:** 2026-01-02

---

## Overview

Polish the enrichment workflow with these improvements:
1. Search bar in enrichment queue
2. Prominent Edit + Enrich buttons on contact detail
3. Relationship strength tooltips
4. Continue enriching button
5. Editable tags during enrichment

**Total Tasks:** 6 (including prerequisite)
**Estimated Effort:** 5-6 hours
**Parallel Opportunities:** Tasks 2.1, 2.2, 2.3 can run in parallel

---

## Phase 1: Prerequisites

### Task 1.1: Install shadcn Tooltip Component
**Description:** Install the tooltip component required for relationship strength descriptions
**Size:** Small (5 minutes)
**Priority:** High (blocker for Task 2.3)
**Dependencies:** None
**Can run parallel with:** None (should be done first)

**Command:**
```bash
npx shadcn-ui@latest add tooltip
```

**Acceptance Criteria:**
- [ ] `src/components/ui/tooltip.tsx` exists
- [ ] No TypeScript errors after installation
- [ ] Component exports: Tooltip, TooltipTrigger, TooltipContent, TooltipProvider

---

## Phase 2: Independent Features

### Task 2.1: Add Search Bar to Enrichment Queue
**Description:** Add search input to filter queue by name, email, or company
**Size:** Medium (1 hour)
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Tasks 2.2, 2.3

**Source:** spec-b-enrichment-flow-polish.md, Section 1

**Location:** `src/app/(dashboard)/enrichment/page.tsx`

**Technical Requirements:**
1. Add `searchQuery` state
2. Update `filteredQueue` to include search filtering
3. Add search input UI with clear button
4. Add empty state for no search results

**Implementation:**

1. Add state (after line 372):
```tsx
const [searchQuery, setSearchQuery] = useState('');
```

2. Update filter logic (around line 432):
```tsx
const filteredQueue = queue.filter((contact) => {
  const matchesPriority = activeFilter === "all" || contact.priorityLevel === activeFilter;
  const searchLower = searchQuery.toLowerCase();
  const matchesSearch = !searchQuery ||
    getDisplayName(contact).toLowerCase().includes(searchLower) ||
    (contact.primaryEmail?.toLowerCase().includes(searchLower)) ||
    (contact.company?.toLowerCase().includes(searchLower));
  return matchesPriority && matchesSearch;
});
```

3. Add search UI before filter tabs (around line 479)
4. Add import for `X` from lucide-react
5. Add empty state when search returns no results

**Acceptance Criteria:**
- [ ] Search input visible above filter tabs
- [ ] Filters by first name, last name, email, company
- [ ] Clear button resets search
- [ ] Works with priority filters
- [ ] Empty state shows when no results match

---

### Task 2.2: Add Prominent Edit + Enrich Buttons
**Description:** Move "Enrich" action from dropdown to visible button next to "Edit"
**Size:** Small (30 minutes)
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Tasks 2.1, 2.3

**Source:** spec-b-enrichment-flow-polish.md, Section 2

**Location:** `src/components/contacts/ContactDetail.tsx` (lines 135-168)

**Technical Requirements:**
1. Add Enrich button with gold styling next to Edit button
2. Keep More dropdown for secondary actions (Draft Intro, Delete)
3. Add Sparkles icon import

**Acceptance Criteria:**
- [ ] Edit and Enrich buttons visible side-by-side
- [ ] Enrich button has gold accent color
- [ ] Edit links to /contacts/{id}/edit
- [ ] Enrich links to /enrichment/session?contact={id}
- [ ] More menu still contains Draft Intro and Delete

---

### Task 2.3: Add Relationship Strength Tooltips
**Description:** Show descriptive tooltips when hovering over relationship strength indicator
**Size:** Small (30 minutes)
**Priority:** Medium
**Dependencies:** Task 1.1 (tooltip component)
**Can run parallel with:** Tasks 2.1, 2.2 (after Task 1.1)

**Source:** spec-b-enrichment-flow-polish.md, Section 5

**Location:** `src/components/contacts/ContactDetail.tsx`

**Technical Requirements:**
1. Add Tooltip imports
2. Add strength descriptions constant
3. Wrap strength indicator with Tooltip components

**Strength Descriptions:**
```typescript
const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};
```

**Acceptance Criteria:**
- [ ] Tooltip appears on hover over strength dots
- [ ] Each level shows correct description
- [ ] Tooltip positioned below indicator
- [ ] Cursor shows help indicator

---

## Phase 3: Continue Enriching Feature

### Task 3.1: Add "Continue Enriching" Button to Completion
**Description:** Add button to continue enriching the same contact after completion
**Size:** Small (30 minutes)
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** None

**Source:** spec-b-enrichment-flow-polish.md, Section 4

**Location:**
- `src/components/enrichment/completion/CompletionCelebration.tsx`
- `src/app/(dashboard)/enrichment/session/page.tsx`

**Technical Requirements:**
1. Add `onContinueEnriching` prop to CompletionCelebration
2. Add Continue button between existing CTAs
3. Add `Plus` icon import
4. Add handler in session page that sets `sessionComplete(false)`

**Acceptance Criteria:**
- [ ] Continue button appears after completion
- [ ] Shows "Continue Enriching {firstName}"
- [ ] Clicking resets to enrichment mode
- [ ] Transcript is cleared for new input
- [ ] Previous data preserved

---

## Phase 4: Editable Tags

### Task 4.1: Create EditableBubble Component
**Description:** Create new component for inline-editable tag bubbles
**Size:** Large (2-3 hours)
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** None

**Source:** spec-b-enrichment-flow-polish.md, Section 3

**Location:**
- NEW: `src/components/enrichment/EditableBubble.tsx`
- Update: `src/components/enrichment/EnrichmentBubbles.tsx`
- Update: `src/app/(dashboard)/enrichment/session/page.tsx`

**Technical Requirements:**

1. Create EditableBubble.tsx with:
   - Click text to edit inline
   - Category dropdown on dot click
   - X button to delete
   - Animation on entry/exit
   - Keyboard support (Enter to save, Escape to cancel)

2. Update EnrichmentBubbles.tsx:
   - Add `editable` prop
   - Add `onUpdate` and `onDelete` callbacks
   - Conditionally render EditableBubble when editable

3. Update session page:
   - Add `handleUpdateBubble` and `handleDeleteBubble` handlers
   - Pass handlers to EnrichmentBubbles

**Acceptance Criteria:**
- [ ] Click tag text to enter edit mode
- [ ] Enter saves edit, Escape cancels
- [ ] Blur saves edit
- [ ] Click category dot opens dropdown
- [ ] Category change updates bubble styling
- [ ] X button deletes tag (with animation)
- [ ] Changes reflected in saved data
- [ ] Works with existing non-editable mode

---

## Phase 5: Testing & Verification

### Task 5.1: Manual Testing
**Description:** Verify all changes work correctly
**Size:** Small (30 minutes)
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** None

**Test Scenarios:**

1. Enrichment Queue Search:
   - Search by first name, last name, email, company
   - Combine search with priority filter
   - Clear search
   - Empty state displays correctly

2. Edit + Enrich Buttons:
   - Both visible on contact detail
   - Correct navigation
   - More menu works

3. Relationship Tooltips:
   - Hover shows tooltip
   - Correct description per level

4. Continue Enriching:
   - Button appears after completion
   - Returns to enrichment mode
   - Transcript cleared

5. Editable Tags:
   - Edit text inline
   - Change category
   - Delete tag
   - Saved correctly

**Acceptance Criteria:**
- [ ] All features pass manual testing
- [ ] No console errors
- [ ] No visual regressions

---

## Dependency Graph

```
Task 1.1 (Tooltip Install)
    ↓
Task 2.3 (Relationship Tooltips)
    ↓
    └──────────────────────────────┐
                                   ↓
Task 2.1 (Search) ─┐               │
                   ├───────────────┼──→ Task 5.1 (Testing)
Task 2.2 (Buttons) ┘               │
                                   │
Task 3.1 (Continue Button) ────────┤
                                   │
Task 4.1 (Editable Tags) ──────────┘
```

## Execution Strategy

**Recommended Order:**
1. **First:** Task 1.1 (prerequisite - install tooltip)
2. **Parallel batch:** Tasks 2.1, 2.2, 2.3 (independent features)
3. **Then:** Task 3.1 (continue button)
4. **Then:** Task 4.1 (most complex - editable tags)
5. **Finally:** Task 5.1 (verification)

**Critical Path:** 1.1 → 2.3 → 5.1

---

## Files Modified Summary

| File | Tasks | Changes |
|------|-------|---------|
| `src/components/ui/tooltip.tsx` | 1.1 | NEW - shadcn component |
| `src/app/(dashboard)/enrichment/page.tsx` | 2.1 | Search input, filter logic |
| `src/components/contacts/ContactDetail.tsx` | 2.2, 2.3 | Buttons, tooltips |
| `src/components/enrichment/EditableBubble.tsx` | 4.1 | NEW - editable tag |
| `src/components/enrichment/EnrichmentBubbles.tsx` | 4.1 | Editable mode support |
| `src/app/(dashboard)/enrichment/session/page.tsx` | 3.1, 4.1 | Handlers |
| `src/components/enrichment/completion/CompletionCelebration.tsx` | 3.1 | Continue button |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tooltip install conflicts | Low | Low | shadcn handles dependencies |
| Tag editing performance | Low | Medium | Use proper React patterns |
| Session state complexity | Medium | Medium | Keep state management simple |

---

## Rollback Plan

All changes are UI-only with no database or API modifications:
1. Uninstall tooltip if issues arise
2. Revert file changes via git
3. No migrations to rollback
