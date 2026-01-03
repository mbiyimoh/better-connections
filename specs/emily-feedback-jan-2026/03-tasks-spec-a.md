# Task Breakdown: Spec A - Pagination & Loading Fixes

**Generated:** 2026-01-01
**Source:** specs/emily-feedback-jan-2026/spec-a-pagination-loading-fixes.md
**Feature Slug:** spec-a-pagination
**Last Decompose:** 2026-01-01

---

## Overview

Fix critical pagination and loading bugs in Better Connections:
1. Non-functional "Show more contacts" button in enrichment queue
2. Missing direct page navigation input
3. Default page size too small (25 → 100)
4. No persistence of page size preference

**Total Tasks:** 5
**Estimated Effort:** 3-4 hours
**Parallel Opportunities:** Tasks 1.2 and 1.3 can run in parallel

---

## Phase 1: Bug Fixes & Core Changes

### Task 1.1: Fix "Show more contacts" button in enrichment queue
**Description:** Add onClick handler and loading state to the non-functional button
**Size:** Medium
**Priority:** High (Critical bug)
**Dependencies:** None
**Can run parallel with:** None (should be done first)

**Source:** spec-a-pagination-loading-fixes.md, Section 1

**Location:** `src/app/(dashboard)/enrichment/page.tsx` (lines 499-505)

**Current broken code:**
```tsx
{filteredQueue.length >= 20 && (
  <div className="text-center mt-5">
    <Button variant="ghost" className="text-zinc-400">
      Show more contacts <ChevronRight size={16} />
    </Button>
  </div>
)}
```

**Technical Requirements:**
- Add `displayLimit` state to track how many contacts to show
- Add `isLoadingMore` state for loading indicator
- Add `totalContacts` state to track total available from API
- Implement `handleShowMore` function that fetches next batch
- Update button to show loading state and hide when all loaded

**Implementation:**

1. Add state variables after existing state declarations (around line 373):
```tsx
const [displayLimit, setDisplayLimit] = useState(50); // Match initial fetch
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [totalContacts, setTotalContacts] = useState(0);
```

2. Update `fetchData` to capture total (around line 389):
```tsx
if (queueRes.ok) {
  const queueData = await queueRes.json();
  setQueue(queueData.contacts);
  setTotalContacts(queueData.total); // Add this line
}
```

3. Add `handleShowMore` function (after `handleStartSession`):
```tsx
const handleShowMore = async () => {
  setIsLoadingMore(true);
  try {
    const newLimit = displayLimit + 25;
    const res = await fetch(`/api/enrichment/queue?limit=${newLimit}`);
    if (res.ok) {
      const data = await res.json();
      setQueue(data.contacts);
      setDisplayLimit(newLimit);
      setTotalContacts(data.total);
    }
  } catch (error) {
    console.error("Failed to load more contacts:", error);
  } finally {
    setIsLoadingMore(false);
  }
};
```

4. Update button render (replace lines 499-505):
```tsx
{queue.length < totalContacts && (
  <div className="text-center mt-5">
    <Button
      variant="ghost"
      className="text-zinc-400"
      onClick={handleShowMore}
      disabled={isLoadingMore}
    >
      {isLoadingMore ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-zinc-400 mr-2" />
          Loading...
        </>
      ) : (
        <>
          Show more contacts <ChevronRight size={16} />
        </>
      )}
    </Button>
  </div>
)}
```

**Acceptance Criteria:**
- [x] Button has onClick handler that triggers fetch
- [x] Loading spinner shows while fetching
- [x] Button is disabled during loading
- [x] New contacts append to existing list
- [x] Button disappears when all contacts are loaded (queue.length >= totalContacts)
- [x] Error handling logs failures without crashing

---

### Task 1.2: Change default page size to 100 and add 200 option
**Description:** Update default pagination from 25 to 100, add 200 option
**Size:** Small
**Priority:** High (Quick win)
**Dependencies:** None
**Can run parallel with:** Task 1.3

**Source:** spec-a-pagination-loading-fixes.md, Section 3

**Location:** `src/components/contacts/ContactsTable.tsx`

**Technical Requirements:**
- Change default limit from '25' to '100'
- Add '200' option to the page size dropdown

**Implementation:**

1. Update default limit (line 126):
```tsx
// Before:
const limit = Number(searchParams.get('limit') || '25');

// After:
const limit = Number(searchParams.get('limit') || '100');
```

2. Update dropdown options (lines 704-709):
```tsx
<SelectContent className="bg-bg-secondary border-border">
  <SelectItem value="25">25</SelectItem>
  <SelectItem value="50">50</SelectItem>
  <SelectItem value="100">100</SelectItem>
  <SelectItem value="200">200</SelectItem>
</SelectContent>
```

**Acceptance Criteria:**
- [x] Default page size is 100 when no URL param present
- [x] Dropdown shows options: 25, 50, 100, 200
- [x] Selecting 200 works correctly
- [x] Existing URL params still work (e.g., ?limit=50)

---

### Task 1.3: Add direct page number input field
**Description:** Add input field allowing users to type a page number and navigate directly
**Size:** Medium
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Source:** spec-a-pagination-loading-fixes.md, Section 2

**Location:** `src/components/contacts/ContactsTable.tsx` (lines 714-754)

**Technical Requirements:**
- Add controlled input for page number
- Form submission navigates to page
- Validation: 1 to totalPages
- Clear input after navigation

**Implementation:**

1. Add state for page input (after line 122):
```tsx
const [pageInput, setPageInput] = useState('');
```

2. Add handler function (after `goToPage` function, around line 299):
```tsx
const handlePageInputSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const page = parseInt(pageInput, 10);
  if (!isNaN(page) && page >= 1 && page <= totalPages) {
    goToPage(page);
    setPageInput('');
  }
};
```

3. Add form UI in pagination section (insert after line 734, before the next/last buttons):
```tsx
<form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 mx-2">
  <Input
    type="number"
    min={1}
    max={totalPages}
    value={pageInput}
    onChange={(e) => setPageInput(e.target.value)}
    className="w-16 h-8 text-center bg-bg-tertiary border-border text-text-primary"
    placeholder={String(currentPage)}
  />
  <Button
    type="submit"
    variant="outline"
    size="sm"
    className="h-8 border-border"
    disabled={!pageInput}
  >
    Go
  </Button>
</form>
```

**Acceptance Criteria:**
- [x] Input field appears in pagination bar
- [x] Can type page number and press Enter to navigate
- [x] "Go" button also triggers navigation
- [x] Invalid numbers (0, negative, > totalPages) are ignored
- [x] Input clears after successful navigation
- [x] Placeholder shows current page number
- [x] Button disabled when input is empty

---

### Task 1.4: Persist page size preference in localStorage
**Description:** Save user's preferred page size to localStorage so it persists across sessions
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2 (default change)
**Can run parallel with:** None

**Source:** spec-a-pagination-loading-fixes.md, Section 4

**Location:** `src/components/contacts/ContactsTable.tsx`

**Technical Requirements:**
- Load preference from localStorage on mount
- Save preference when user changes page size
- Preference takes precedence over default, but URL param wins
- localStorage key: `contactsPageSize`

**Implementation:**

1. Add state for stored preference (after line 122):
```tsx
const [storedLimit, setStoredLimit] = useState<string | null>(null);
```

2. Add useEffect to load preference on mount (after other useEffects, around line 200):
```tsx
useEffect(() => {
  const saved = localStorage.getItem('contactsPageSize');
  if (saved) {
    setStoredLimit(saved);
  }
}, []);
```

3. Update limit calculation (replace line 126):
```tsx
const limit = Number(
  searchParams.get('limit') ||
  storedLimit ||
  '100'
);
```

4. Update the Select onValueChange handler (line 699):
```tsx
onValueChange={(value) => {
  localStorage.setItem('contactsPageSize', value);
  setStoredLimit(value);
  updateParams({ limit: value, page: '1' });
}}
```

**Acceptance Criteria:**
- [x] Page size preference saved to localStorage when changed
- [x] Preference loads on page refresh
- [x] Preference persists after browser restart
- [x] URL param overrides localStorage preference
- [x] localStorage key is 'contactsPageSize'

---

### Task 1.5: Manual testing and edge case verification
**Description:** Verify all changes work correctly including edge cases
**Size:** Small
**Priority:** High
**Dependencies:** Tasks 1.1, 1.2, 1.3, 1.4
**Can run parallel with:** None

**Technical Requirements:**
- Test all acceptance criteria from previous tasks
- Test edge cases documented in spec
- Verify no regressions in existing functionality

**Test Scenarios:**

**Enrichment Queue:**
1. Load enrichment page with 50+ contacts needing enrichment
2. Click "Show more contacts" - verify loading state appears
3. Verify more contacts load and append to list
4. Continue clicking until all contacts loaded
5. Verify button disappears when all loaded
6. Test with filter applied (e.g., "high" priority only)

**Contacts Table - Pagination:**
1. Navigate to contacts page - verify default is 100
2. Change to 200 - verify URL updates
3. Refresh page - verify stays at 200 (localStorage)
4. Type "5" in page input, press Enter - verify navigates to page 5
5. Type "999" (invalid) - verify nothing happens
6. Type "0" - verify nothing happens
7. Click First/Last/Prev/Next buttons - verify still work
8. Use arrow keys - verify still work

**Edge Cases:**
1. Test with 1 page of contacts (< 100) - pagination should be minimal
2. Test with 0 contacts - empty state should show
3. Test with exactly 100 contacts - boundary condition
4. Clear localStorage, reload - should use default 100
5. Set URL param ?limit=50 with localStorage=200 - URL should win

**Acceptance Criteria:**
- [ ] All acceptance criteria from Tasks 1.1-1.4 pass
- [ ] No console errors during normal usage
- [ ] No visual regressions in pagination UI
- [ ] Keyboard navigation still works
- [ ] Mobile responsive layout not broken

---

## Dependency Graph

```
Task 1.1 (Show More Button)
    ↓
Task 1.5 (Testing)

Task 1.2 (Default 100) ──┐
                         ├──→ Task 1.4 (localStorage) ──→ Task 1.5 (Testing)
Task 1.3 (Page Input) ───┘
```

## Execution Strategy

**Recommended Order:**
1. **Start:** Task 1.1 (highest impact bug fix)
2. **Parallel:** Tasks 1.2 + 1.3 (independent, can be done together)
3. **Then:** Task 1.4 (depends on 1.2 being done)
4. **Finally:** Task 1.5 (verification)

**Critical Path:** 1.1 → 1.5 (bug fix must be verified)

**Parallel Opportunity:** Tasks 1.2 and 1.3 have no dependencies on each other and touch different parts of the file.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| localStorage not available (private browsing) | Low | Low | Feature degrades gracefully to default |
| API rate limiting on rapid "Show more" clicks | Low | Low | Button disabled during loading |
| Large page sizes (200) slow performance | Medium | Low | User choice, can revert to smaller |

---

## Files Modified Summary

| File | Tasks | Changes |
|------|-------|---------|
| `src/app/(dashboard)/enrichment/page.tsx` | 1.1 | Add state, handleShowMore, update button |
| `src/components/contacts/ContactsTable.tsx` | 1.2, 1.3, 1.4 | Default change, page input, localStorage |

---

## Rollback Plan

All changes are additive UI changes with no database or API modifications:
1. Revert enrichment/page.tsx to remove Show More handler
2. Revert ContactsTable.tsx to previous pagination logic
3. Clear localStorage key 'contactsPageSize' if needed

No migrations, no breaking changes, safe to deploy incrementally.
