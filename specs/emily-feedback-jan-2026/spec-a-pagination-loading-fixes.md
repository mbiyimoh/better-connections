# Spec A: Pagination & Loading Fixes

**Status:** Implemented
**Priority:** 1 (Critical bugs blocking basic usage)
**Feedback Items:** 12, 17
**Estimated Effort:** 3-4 hours
**Completed:** 2026-01-01

---

## Problem Statement

Users cannot navigate through their full contact list effectively due to:
1. A non-functional "Show more contacts" button in the enrichment queue
2. Pagination that resets on every page visit (no preference persistence)
3. No way to jump directly to a specific page number
4. Default page size of 25 is too small for users with 500+ contacts

---

## Success Criteria

- [x] "Show more contacts" button loads additional contacts when clicked
- [x] Users can type a specific page number to navigate directly
- [x] Default page size is 100 (configurable via dropdown)
- [x] Page size preference persists across sessions (localStorage)
- [x] All pagination controls remain visible and functional

---

## Detailed Requirements

### 1. Fix "Show More Contacts" Button

**Location:** `src/app/(dashboard)/enrichment/page.tsx` (lines 499-505)

**Current state:**
```tsx
{filteredQueue.length >= 20 && (
  <div className="text-center mt-5">
    <Button variant="ghost" className="text-zinc-400">
      Show more contacts <ChevronRight size={16} />
    </Button>
  </div>
)}
```
The button has no `onClick` handler - it's purely visual.

**Required changes:**
1. Add pagination state to the enrichment queue page
2. Implement `onClick` handler that fetches next batch
3. Append results to existing queue (infinite scroll pattern)
4. Show loading state while fetching
5. Hide button when all contacts are loaded

**Implementation approach:**
```tsx
const [displayLimit, setDisplayLimit] = useState(20);
const [isLoadingMore, setIsLoadingMore] = useState(false);

const handleShowMore = async () => {
  setIsLoadingMore(true);
  const newLimit = displayLimit + 20;
  const res = await fetch(`/api/enrichment/queue?limit=${newLimit}`);
  if (res.ok) {
    const data = await res.json();
    setQueue(data.contacts);
    setDisplayLimit(newLimit);
  }
  setIsLoadingMore(false);
};

// In render:
{queue.length >= displayLimit && (
  <Button
    variant="ghost"
    onClick={handleShowMore}
    disabled={isLoadingMore}
  >
    {isLoadingMore ? 'Loading...' : 'Show more contacts'}
    <ChevronRight size={16} />
  </Button>
)}
```

### 2. Direct Page Number Input

**Location:** `src/components/contacts/ContactsTable.tsx` (lines 714-754)

**Current pagination UI:**
- First/Last page buttons
- Previous/Next buttons
- "Page X of Y" text display

**Add:**
- Input field for direct page entry
- "Go" button or Enter key to navigate
- Validation (1 to totalPages)

**Implementation:**
```tsx
const [pageInput, setPageInput] = useState('');

const handlePageInputSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const page = parseInt(pageInput, 10);
  if (page >= 1 && page <= totalPages) {
    goToPage(page);
    setPageInput('');
  }
};

// In pagination section:
<form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
  <span className="text-sm text-text-secondary">Go to:</span>
  <Input
    type="number"
    min={1}
    max={totalPages}
    value={pageInput}
    onChange={(e) => setPageInput(e.target.value)}
    className="w-16 h-8 text-center"
    placeholder={String(currentPage)}
  />
  <Button type="submit" variant="outline" size="sm" className="h-8">
    Go
  </Button>
</form>
```

### 3. Higher Default Page Size

**Location:** `src/components/contacts/ContactsTable.tsx` (line 126)

**Current:**
```tsx
const limit = Number(searchParams.get('limit') || '25');
```

**Change to:**
```tsx
const limit = Number(searchParams.get('limit') || '100');
```

**Also update the dropdown options** (lines 704-709):
```tsx
<SelectContent>
  <SelectItem value="25">25</SelectItem>
  <SelectItem value="50">50</SelectItem>
  <SelectItem value="100">100</SelectItem>  {/* Now default */}
  <SelectItem value="200">200</SelectItem>  {/* Add larger option */}
</SelectContent>
```

### 4. Persist Page Size Preference

**New utility:** Use localStorage to persist user's preferred page size.

**Implementation:**
```tsx
// At top of ContactsTable component:
const [preferredLimit, setPreferredLimit] = useState<number | null>(null);

useEffect(() => {
  // Load preference from localStorage
  const saved = localStorage.getItem('contactsPageSize');
  if (saved) {
    setPreferredLimit(parseInt(saved, 10));
  }
}, []);

// When user changes page size:
const handleLimitChange = (value: string) => {
  localStorage.setItem('contactsPageSize', value);
  updateParams({ limit: value, page: '1' });
};

// Default logic:
const limit = Number(
  searchParams.get('limit') ||
  preferredLimit?.toString() ||
  '100'
);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(dashboard)/enrichment/page.tsx` | Add onClick handler, loading state, pagination logic |
| `src/components/contacts/ContactsTable.tsx` | Page input, default 100, localStorage persistence |

---

## API Considerations

The enrichment queue API (`/api/enrichment/queue`) already supports `limit` parameter. No API changes needed.

The contacts API (`/api/contacts`) already supports pagination. No API changes needed.

---

## Testing Checklist

### Enrichment Queue
- [ ] "Show more contacts" loads additional contacts
- [ ] Button shows loading state while fetching
- [ ] Button disappears when all contacts are loaded
- [ ] Existing contacts remain visible after loading more

### Contacts Table
- [ ] Can type page number and press Enter to navigate
- [ ] Invalid page numbers are rejected (out of range)
- [ ] Default page size is 100
- [ ] Page size 200 option is available
- [ ] Changing page size persists after page refresh
- [ ] Changing page size persists after browser restart (localStorage)
- [ ] First/Previous/Next/Last buttons still work
- [ ] Keyboard navigation (arrow keys) still works

### Edge Cases
- [ ] Page 1 of 1 (single page) - no pagination controls needed
- [ ] Empty state (0 contacts) - graceful handling
- [ ] Very large page (1000+ contacts) - performance acceptable
- [ ] URL with invalid limit parameter - falls back to default

---

## Design Notes

- Page input field should be small (w-16) to not dominate the pagination bar
- Loading state for "Show more" should disable the button and show spinner or "Loading..."
- Page size preference in localStorage key: `contactsPageSize`
- Don't persist other pagination state (page number, filters) - those should be URL-driven for shareability

---

## Out of Scope

- Infinite scroll on contacts table (keep pagination pattern)
- Server-side cursor pagination (current offset pagination is fine for <10k contacts)
- Prefetching next page
- Virtual scrolling for performance

---

## Implementation Order

1. Fix "Show more contacts" button (highest impact bug)
2. Change default to 100 (quick win)
3. Add 200 option to dropdown (quick win)
4. Add page input field
5. Add localStorage persistence

---

## Rollback Plan

All changes are additive and UI-only. If issues arise:
- Revert to previous default (25)
- Remove page input field
- Remove localStorage logic

No database migrations or API changes, so rollback is straightforward.
