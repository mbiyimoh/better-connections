# Custom Attendee Ordering for M33T Events - Specification

**Slug:** feat-custom-attendee-ordering
**Author:** Claude Code
**Date:** 2026-01-24
**Status:** Ready for Validation
**Related:** `01-ideation.md`, M33T event landing page

---

## Overview

Enable M33T event organizers to customize the display order of attendees on the event landing page. Organizers can manually drag-reorder attendees and/or auto-sort by "profile richness" (completeness score). The landing page continues to show three separate RSVP-status carousels (Confirmed/Maybe/Invited), but attendees within each carousel are sorted by their position in a single master order list.

---

## Requirements

### R1: Database Schema - Add Ordering Fields

**Description:** Add fields to EventAttendee model for ordering and richness scoring.

**Schema Changes:**
```prisma
model EventAttendee {
  // ... existing fields ...

  displayOrder     Int?    @default(null)  // null = auto-sort, number = pinned position
  profileRichness  Int     @default(0)     // 0-100 computed score for auto-sorting

  @@index([eventId, displayOrder])  // Composite index for efficient ordering queries
}
```

**Acceptance Criteria:**
- [ ] `displayOrder` field added (nullable Int)
- [ ] `profileRichness` field added (Int, default 0)
- [ ] Composite index on `[eventId, displayOrder]` for query performance
- [ ] Migration created and applied

---

### R2: Profile Richness Calculation

**Description:** Compute a 0-100 "richness" score based on profile completeness. Higher scores = richer profiles that should appear first when auto-sorting.

**Scoring Weights:**
| Field | Points | Notes |
|-------|--------|-------|
| currentFocus | 20 | Most valuable - shows engagement |
| expertise[] | 15 | Array has 1+ items |
| role/title | 15 | Job title present |
| conversationHooks[] | 15 | Array has 1+ items |
| company | 10 | Company name present |
| name | 10 | Full name (not just email) |
| tradingCard | 10 | Trading card data exists |
| location | 5 | Location present |
| **Total** | **100** | |

**Implementation:**
```typescript
// src/lib/m33t/profileRichness.ts
export function calculateProfileRichness(attendee: EventAttendee): number {
  let score = 0;
  const profile = attendee.profile as Profile | null;
  const tradingCard = attendee.tradingCard as TradingCard | null;

  // From profile JSON
  if (profile?.currentFocus) score += 20;
  if (profile?.expertise?.length > 0) score += 15;
  if (profile?.role) score += 15;
  if (profile?.conversationHooks?.length > 0) score += 15;
  if (profile?.company) score += 10;
  if (profile?.name && !profile.name.includes('@')) score += 10; // Not just email
  if (profile?.location) score += 5;

  // Trading card bonus
  if (tradingCard?.background || tradingCard?.whyInteresting) score += 10;

  return Math.min(score, 100);
}
```

**When to Calculate:**
- On attendee creation (import or RSVP)
- On profile update (questionnaire completion, organizer edits)
- Batch recalculation API for existing attendees

**Acceptance Criteria:**
- [ ] `calculateProfileRichness()` function implemented
- [ ] Score updated on attendee creation
- [ ] Score updated on profile/tradingCard changes
- [ ] Batch recalculation endpoint for existing events

---

### R3: API - Attendee Ordering Logic

**Description:** Modify the public events API to return attendees sorted by display order within each RSVP status group.

**Sorting Logic:**
```typescript
// Within each status group, sort by:
// 1. displayOrder ASC (pinned items first, nulls last)
// 2. profileRichness DESC (richest auto-sorted items next)
// 3. createdAt ASC (oldest first as tiebreaker)

const sortAttendees = (attendees: EventAttendee[]) => {
  return attendees.sort((a, b) => {
    // Pinned items (non-null displayOrder) come first
    if (a.displayOrder !== null && b.displayOrder === null) return -1;
    if (a.displayOrder === null && b.displayOrder !== null) return 1;

    // Both pinned: sort by displayOrder
    if (a.displayOrder !== null && b.displayOrder !== null) {
      return a.displayOrder - b.displayOrder;
    }

    // Both auto-sorted: sort by richness DESC, then createdAt ASC
    const richnessDiff = (b.profileRichness ?? 0) - (a.profileRichness ?? 0);
    if (richnessDiff !== 0) return richnessDiff;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};
```

**API Changes:**
- `GET /api/public/events/[slug]` - Apply sorting within each status group before returning
- Response structure unchanged (still returns `{ confirmed: [], maybe: [], invited: [] }`)

**Acceptance Criteria:**
- [ ] Public API returns attendees sorted by displayOrder within each status
- [ ] Pinned attendees (non-null displayOrder) appear before auto-sorted
- [ ] Auto-sorted attendees ordered by profileRichness DESC
- [ ] Response structure unchanged for backwards compatibility

---

### R4: API - Manage Attendee Order

**Description:** API endpoints for organizers to view and update attendee ordering.

**Endpoints:**

#### GET /api/events/[eventId]/attendee-order
Returns all attendees in master order (regardless of RSVP status).

```typescript
// Response
{
  attendees: [
    {
      id: string;
      name: string;
      email: string;
      rsvpStatus: 'PENDING' | 'CONFIRMED' | 'MAYBE' | 'DECLINED';
      displayOrder: number | null;
      profileRichness: number;
      profile: { role?: string; company?: string; ... };
    },
    ...
  ],
  stats: {
    total: number;
    pinned: number;    // Count with non-null displayOrder
    autoSorted: number; // Count with null displayOrder
  }
}
```

#### PUT /api/events/[eventId]/attendee-order
Update the display order for multiple attendees.

```typescript
// Request body
{
  orders: [
    { attendeeId: string; displayOrder: number | null },
    ...
  ]
}

// Response
{ success: true, updated: number }
```

#### POST /api/events/[eventId]/attendee-order/auto-sort
Apply auto-sort by richness to all attendees (clears manual ordering).

```typescript
// Request body
{
  sortBy: 'richness' | 'name' | 'rsvp-date';
  pinTop?: number; // Optional: pin top N after sorting
}

// Response
{ success: true, sorted: number }
```

**Authorization:** Requires `canCurate` permission (owner or co-organizer with canCurate=true)

**Acceptance Criteria:**
- [ ] GET endpoint returns all attendees in master order
- [ ] PUT endpoint updates displayOrder for specified attendees
- [ ] POST auto-sort endpoint applies richness sort
- [ ] All endpoints check `canCurate` permission
- [ ] Audit trail: track who last modified order (`orderUpdatedBy`, `orderUpdatedAt`)

---

### R5: Organizer UI - Customize Order Modal

**Description:** A modal/page where organizers can view and reorder attendees via drag-and-drop.

**Location:** Accessible from the event attendees management page via "Customize Display Order" button.

**UI Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  Customize Attendee Display Order               [× Close]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sort by: [▼ Profile Richness]  [Apply]    [Reset All]     │
│                                                             │
│  Drag to reorder. This order applies across all RSVP       │
│  status sections on your event landing page.               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ≡  1. Emily Breunig         🟢 CONF   ████████░░ 85 │   │
│  │ ≡  2. Ikechi Nwabuisi       🟢 CONF   ███████░░░ 78 │   │
│  │ ≡  3. Sarah Chen            🟡 MAYBE  ██████░░░░ 65 │   │
│  │ ≡  4. Marcus Johnson        ⚪ INVTD  █████░░░░░ 52 │   │
│  │ ≡  5. Alex Rivera           🟢 CONF   ████░░░░░░ 40 │   │
│  │ ≡  6. Jordan Kim            🟡 MAYBE  ███░░░░░░░ 35 │   │
│  │ ≡  7. Taylor Smith          ⚪ INVTD  ██░░░░░░░░ 20 │   │
│  │    ─────── Auto-sorted below ───────                │   │
│  │ ≡  8. Casey Brown           ⚪ INVTD  █░░░░░░░░░ 12 │   │
│  │ ≡  9. Morgan Lee            ⚪ INVTD  ░░░░░░░░░░  5 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Showing 9 attendees (7 pinned, 2 auto-sorted)             │
│                                                             │
│                                    [Cancel]  [Save Order]  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Drag handle (≡) for reordering
- RSVP status badge (colored dot + abbreviation)
- Profile richness bar (visual 0-100)
- Divider line between pinned and auto-sorted sections
- Sort dropdown: "Profile Richness", "Name (A-Z)", "RSVP Date", "Date Added"
- "Apply" button to auto-sort and pin current positions
- "Reset All" to clear all manual ordering (back to pure auto-sort)
- Stats footer showing pinned vs auto-sorted counts

**Drag Behavior:**
- Dragging an auto-sorted item pins it at the drop position
- Dragging a pinned item moves it to new position
- Items below shift accordingly
- Unpinning: Right-click or action menu → "Remove from pinned" (moves to auto-sorted section)

**Acceptance Criteria:**
- [ ] Modal accessible from attendee management page
- [ ] Displays all attendees in master order
- [ ] Drag-and-drop reordering works
- [ ] Sort dropdown with Apply button
- [ ] Reset All functionality
- [ ] Visual distinction between pinned and auto-sorted
- [ ] Save persists order to database
- [ ] Loading/saving states shown

---

### R6: Landing Page - Respect Display Order

**Description:** The public landing page renders attendees within each carousel sorted by displayOrder.

**Changes to EventLandingClient.tsx:**
- No structural changes (still 3 carousels)
- Attendees arrive pre-sorted from API
- No additional client-side sorting needed

**Changes to FullGuestListModal.tsx:**
- Each tab (Confirmed/Maybe/Invited) displays attendees in displayOrder
- Attendees arrive pre-sorted from API

**Acceptance Criteria:**
- [ ] Confirmed carousel shows attendees in displayOrder
- [ ] Maybe carousel shows attendees in displayOrder
- [ ] Invited carousel shows attendees in displayOrder
- [ ] FullGuestListModal tabs respect displayOrder
- [ ] No visual changes to landing page (order just changes)

---

### R7: Recalculate Richness on Profile Updates

**Description:** Automatically recalculate profileRichness when attendee data changes.

**Trigger Points:**
1. **Questionnaire submission** (`/api/rsvp/[token]/questionnaire`)
2. **Profile extraction** (after AI extracts profile from responses)
3. **Trading card generation** (after AI generates trading card)
4. **Organizer profile edits** (profileOverrides changes)
5. **Attendee import** (initial creation)

**Implementation:**
```typescript
// After any profile update:
const richness = calculateProfileRichness(attendee);
await prisma.eventAttendee.update({
  where: { id: attendee.id },
  data: { profileRichness: richness },
});
```

**Acceptance Criteria:**
- [ ] Richness recalculated on questionnaire submission
- [ ] Richness recalculated on profile extraction
- [ ] Richness recalculated on trading card generation
- [ ] Richness recalculated on organizer edits
- [ ] Richness set on attendee import/creation

---

## Technical Implementation

### File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | Modify | Add displayOrder, profileRichness fields |
| `src/lib/m33t/profileRichness.ts` | Create | Richness calculation function |
| `src/app/api/public/events/[slug]/route.ts` | Modify | Sort attendees by displayOrder |
| `src/app/api/events/[eventId]/attendee-order/route.ts` | Create | GET/PUT order management |
| `src/app/api/events/[eventId]/attendee-order/auto-sort/route.ts` | Create | POST auto-sort |
| `src/components/events/AttendeeOrderModal.tsx` | Create | Drag-and-drop ordering UI |
| `src/app/(dashboard)/events/[eventId]/page.tsx` | Modify | Add "Customize Order" button |
| `src/app/api/rsvp/[token]/questionnaire/route.ts` | Modify | Recalc richness after submit |
| `src/lib/m33t/extraction.ts` | Modify | Recalc richness after extraction |

### Dependencies

- `@dnd-kit/core` and `@dnd-kit/sortable` - For drag-and-drop (already may be in project, or add)
- No other new dependencies required

---

## Testing Checklist

### Unit Tests
- [ ] `calculateProfileRichness()` returns correct scores for various profiles
- [ ] Sorting function orders pinned before auto-sorted
- [ ] Sorting function orders by richness within auto-sorted

### Integration Tests
- [ ] GET attendee-order returns correct order
- [ ] PUT attendee-order updates displayOrder correctly
- [ ] POST auto-sort applies richness sorting
- [ ] Permission check blocks non-curators

### E2E Tests
- [ ] Organizer can open order modal
- [ ] Drag-and-drop reorders attendees
- [ ] Save persists order
- [ ] Landing page shows correct order per status
- [ ] New RSVP appears in correct position based on richness

### Manual Testing Scenarios
1. Event with 0 manual ordering → all auto-sorted by richness
2. Pin top 3, rest auto-sorted → pinned stay, others by richness
3. New attendee RSVPs → appears in auto-sorted section by richness
4. Attendee completes questionnaire → richness updates, may reorder in auto-sorted
5. Reset all → clears displayOrder, back to pure auto-sort

---

## Migration Plan

1. **Schema migration** - Add fields with defaults (non-breaking)
2. **Backfill richness** - Run batch calculation for existing attendees
3. **Deploy API changes** - Sorting logic active
4. **Deploy UI** - Ordering modal available
5. **No feature flag needed** - Graceful degradation (null displayOrder = auto-sort)

---

## Out of Scope

- Per-RSVP-status separate ordering (single master list only)
- Undo/history for ordering changes
- Real-time collaborative ordering
- Drag-and-drop on public landing page
- Keyboard accessibility for drag-and-drop (future enhancement)

---

## Success Metrics

1. **Functional:** Organizers can set custom order that persists and displays correctly
2. **Performance:** Ordering modal loads <500ms for events with 100 attendees
3. **Adoption:** Track usage of "Customize Order" feature via analytics event

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| 1. Schema + Richness | Migration, calculation function, backfill | 2 hours |
| 2. API Ordering | GET/PUT/POST endpoints, sorting logic | 3 hours |
| 3. Organizer UI | Modal component, drag-and-drop | 4 hours |
| 4. Integration | Hook up triggers, test E2E | 2 hours |
| **Total** | | **~11 hours** |
