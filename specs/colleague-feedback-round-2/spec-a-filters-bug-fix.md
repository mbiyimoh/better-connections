# Spec A: Filters Button Bug Fix

**Slug:** filters-bug-fix
**Author:** Claude Code
**Date:** 2026-01-08
**Priority:** P0 (Blocking)
**Estimated Effort:** 30 minutes

---

## Problem

Clicking the "Filters" button in the contacts page causes a "Something went wrong" error popup. The error is caught by MobileErrorBoundary and prevents users from filtering their contacts.

## Root Cause

The ContactsTable uses Radix UI Select components with **empty string `""` as a value** for the "All" option:

```tsx
// ContactsTable.tsx lines 408-414
<SelectContent className="bg-bg-secondary border-border">
  <SelectItem value="">All sources</SelectItem>  // ← Empty string causes crash
  {sources.map((source) => (
    <SelectItem key={source} value={source}>
      {source}
    </SelectItem>
  ))}
</SelectContent>
```

**Radix UI Select does not support empty strings as valid values.** When the component tries to handle selection/rendering with an empty string value, it throws an error.

This pattern is repeated for all 4 filters:
- Source filter (line 409)
- Relationship filter (line 430)
- Category filter (line 451)

## Solution

Replace empty string values with a sentinel value `"all"` and update the filter logic to treat `"all"` as "no filter applied".

## Implementation

### File: `src/components/contacts/ContactsTable.tsx`

**Change 1: Update Source Filter Select (lines 401-417)**

```tsx
// Before
<Select
  value={sourceFilter}
  onValueChange={(value) => updateParams({ source: value || null })}
>
  ...
  <SelectItem value="">All sources</SelectItem>

// After
<Select
  value={sourceFilter || 'all'}
  onValueChange={(value) => updateParams({ source: value === 'all' ? null : value })}
>
  ...
  <SelectItem value="all">All sources</SelectItem>
```

**Change 2: Update Relationship Filter Select (lines 419-438)**

```tsx
// Before
<Select
  value={relationshipFilter}
  onValueChange={(value) => updateParams({ relationship: value || null })}
>
  ...
  <SelectItem value="">Any strength</SelectItem>

// After
<Select
  value={relationshipFilter || 'all'}
  onValueChange={(value) => updateParams({ relationship: value === 'all' ? null : value })}
>
  ...
  <SelectItem value="all">Any strength</SelectItem>
```

**Change 3: Update Category Filter Select (lines 440-462)**

```tsx
// Before
<Select
  value={categoryFilter}
  onValueChange={(value) => updateParams({ category: value || null })}
>
  ...
  <SelectItem value="">Any category</SelectItem>

// After
<Select
  value={categoryFilter || 'all'}
  onValueChange={(value) => updateParams({ category: value === 'all' ? null : value })}
>
  ...
  <SelectItem value="all">Any category</SelectItem>
```

## Testing

1. Navigate to `/contacts`
2. Click "Filters" button - should open popover without error
3. Select a filter option - should filter contacts
4. Select "All sources" / "Any strength" / "Any category" - should clear filter
5. Verify URL params update correctly (no `source=all` in URL, just remove param)
6. Refresh page with filters applied - should maintain filter state

## Files Changed

- `src/components/contacts/ContactsTable.tsx` (3 locations)

## Rollback

If issues arise, revert the changes to ContactsTable.tsx. No database or schema changes.
