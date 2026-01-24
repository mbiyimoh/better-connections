# Custom Attendee Ordering for M33T Event Landing Pages

**Slug:** feat-custom-attendee-ordering
**Author:** Claude Code
**Date:** 2026-01-24
**Branch:** preflight/feat-custom-attendee-ordering
**Related:** M33T event landing page, AttendeeCarousel component

---

## 1) Intent & Assumptions

- **Task brief:** Give M33T event organizers the ability to:
  1. Create a custom/manual order for attendees on the event landing page (single master list, not per-RSVP-status)
  2. Sort by "profile richness" (completeness) to prioritize well-filled profiles
  3. Combine both: first auto-sort by richness, then manually drag-reorder specific positions

- **Assumptions:**
  - The landing page will display ONE unified attendee list (not split by RSVP status)
  - Profile completeness score already exists in the `profile.completeness` field (0-1)
  - Organizers need a dedicated UI to manage attendee order (not inline on landing page)
  - Manual ordering takes precedence over auto-sort (drag position is "pinned")
  - New attendees who RSVP after ordering is set should slot in based on current sort rule

- **Out of scope:**
  - Changing the RSVP status filtering logic (declined still excluded)
  - Per-RSVP-status separate ordering
  - Real-time collaborative ordering (single organizer at a time)
  - Undo/history for ordering changes

---

## 2) Pre-reading Log

- `src/app/api/public/events/[slug]/route.ts`: Current API returns attendees grouped by RSVP status with no ordering. Would need to return a single sorted list.
- `prisma/schema.prisma` (EventAttendee): No `displayOrder` field exists. Has `profile` JSON with `completeness` score.
- `src/lib/m33t/extraction.ts`: Profile completeness (0-1) calculated by GPT during questionnaire extraction.
- `src/app/m33t/[slug]/EventLandingClient.tsx`: Renders 3 separate carousels by status. Would need unified list mode.
- `src/components/events/wizard/steps/LandingPageStep.tsx`: Landing page settings UI - could add ordering controls here.
- `src/lib/enrichment.ts`: Contact enrichment score pattern (0-100) - similar concept, different implementation.

---

## 3) Codebase Map

- **Primary components/modules:**
  - `src/app/api/public/events/[slug]/route.ts` - Public API for landing page data
  - `src/app/api/events/[eventId]/attendees/` - Attendee management APIs
  - `src/app/m33t/[slug]/EventLandingClient.tsx` - Landing page rendering
  - `src/components/events/wizard/steps/LandingPageStep.tsx` - Organizer settings
  - `prisma/schema.prisma` - EventAttendee model

- **Shared dependencies:**
  - `src/lib/m33t/schemas.ts` - LandingPageSettings, Profile schemas
  - `src/lib/m33t/extraction.ts` - Profile completeness calculation
  - `src/app/m33t/[slug]/types.ts` - PublicAttendee type

- **Data flow:**
  - EventAttendee (DB) → API transform → PublicAttendee → AttendeeCarousel → AttendeeCard
  - LandingPageSettings (JSON in Event) → API → Client rendering decisions

- **Potential blast radius:**
  - EventAttendee model (new field)
  - Public events API (ordering logic)
  - Landing page client (unified list vs split carousels)
  - Wizard UI (new ordering step or settings)
  - Possibly FullGuestListModal (if it should respect ordering)

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Potential Solution 1: Database-Level `displayOrder` Field

**Approach:** Add `displayOrder Int?` to EventAttendee model. Null = auto-sorted, integer = manual position.

**Implementation:**
```prisma
model EventAttendee {
  // ... existing fields
  displayOrder      Int?      // null = use auto-sort, number = manual position
  displayOrderSetAt DateTime? // when was manual order set
}
```

**API sorting logic:**
```typescript
const attendees = await prisma.eventAttendee.findMany({
  where: { eventId, rsvpStatus: { not: 'DECLINED' } },
  orderBy: [
    { displayOrder: 'asc' },        // Manual positions first (nulls last)
    { profile: { path: ['completeness'], order: 'desc' } }, // Then by richness
  ],
});
```

**Pros:**
- Simple, standard approach
- Easy to query with `orderBy`
- Supports mix of manual + auto-sorted entries

**Cons:**
- Prisma doesn't support JSON path ordering in `orderBy` - would need computed field
- Re-ordering requires updating multiple rows (shift all positions)
- Need to handle gaps/conflicts when dragging

---

### Potential Solution 2: Ordered Array in Event Settings

**Approach:** Store `attendeeOrder: string[]` (array of attendee IDs) in Event's `landingPageSettings` JSON.

**Implementation:**
```typescript
// In LandingPageSettings
{
  showAttendees: true,
  attendeeDisplayMode: 'unified' | 'by-status',
  attendeeSort: 'manual' | 'richness' | 'name' | 'rsvp-date',
  attendeeOrder: ['attendee-id-1', 'attendee-id-2', ...], // Manual order
}
```

**API sorting logic:**
```typescript
// Fetch all attendees
const attendees = await prisma.eventAttendee.findMany({ ... });

// Apply ordering from settings
const orderMap = new Map(settings.attendeeOrder.map((id, i) => [id, i]));
attendees.sort((a, b) => {
  const aOrder = orderMap.get(a.id) ?? Infinity;
  const bOrder = orderMap.get(b.id) ?? Infinity;
  if (aOrder !== bOrder) return aOrder - bOrder;
  // Fallback to completeness for unordered entries
  return (b.profile?.completeness ?? 0) - (a.profile?.completeness ?? 0);
});
```

**Pros:**
- No schema migration needed
- Single update to save order (not multiple row updates)
- Easy to reorder (just splice array)
- New attendees automatically fall to auto-sort section

**Cons:**
- Array can get stale if attendees are removed
- Need to clean up orphaned IDs
- Large events = large JSON array

---

### Potential Solution 3: Hybrid - `displayOrder` + Denormalized `profileRichness`

**Approach:** Add both `displayOrder` and `profileRichness` (computed Int 0-100) to EventAttendee.

**Implementation:**
```prisma
model EventAttendee {
  displayOrder     Int?    // null = auto, number = pinned position
  profileRichness  Int     @default(0) // 0-100 computed score
}
```

**Richness calculation (on profile update):**
```typescript
function calculateProfileRichness(attendee: EventAttendee): number {
  let score = 0;
  const profile = attendee.profile as Profile | null;

  if (profile?.name) score += 10;
  if (profile?.role) score += 15;
  if (profile?.company) score += 10;
  if (profile?.location) score += 5;
  if (profile?.expertise?.length) score += 15;
  if (profile?.currentFocus) score += 20;
  if (profile?.conversationHooks?.length) score += 15;
  if (attendee.tradingCard) score += 10;

  return Math.min(score, 100);
}
```

**Pros:**
- Native Prisma `orderBy` support
- Fast queries (indexed field)
- Explicit pinning vs auto-sort separation
- Can evolve richness algorithm independently

**Cons:**
- Schema migration required
- Need to update `profileRichness` when profile changes
- Two fields to maintain

---

### Potential Solution 4: Drag-and-Drop UI with Fractional Indexing

**Approach:** Use fractional ordering (like `0.5`, `0.25`, `0.75`) to avoid re-indexing entire list on drag.

**Library:** Use `fractional-indexing` npm package

**Pros:**
- Efficient reordering (only update 1 row per drag)
- Standard technique used by Notion, Linear, etc.

**Cons:**
- More complex implementation
- Need to handle precision limits over many reorders
- Overkill for typical event sizes (<100 attendees)

---

### Recommendation

**Solution 3 (Hybrid)** is the best balance:

1. **`displayOrder Int?`** - For manual pinning (null = auto-sort)
2. **`profileRichness Int @default(0)`** - Denormalized score for efficient sorting
3. **Store settings in Event** - `attendeeDisplayMode`, `defaultSort`

**Reasoning:**
- Schema changes are minimal (2 fields)
- Supports the exact UX requested: "sort by richness, then manually reorder top positions"
- Prisma-native sorting (no JSON path hacks)
- Future-proof for adding more sort options

---

## 6) Clarification Questions

1. **Unified list confirmation:** The landing page will show ONE attendee list instead of three carousels (Confirmed/Maybe/Invited). Should the RSVP status still be visible on each card (the colored dot)?
>> NO. the landing page does not change. What I'm saying is that there should be one unified list behind the scenes where the event organizer is customizing how people show up. They shouldn't be able to create three custom lists based on status. Instead, there's just one single master list that defines the order people show up, but as people RSVP, they should still jump between those various sections on the landing page just as it's designed right now

2. **Ordering UI location:** Should the "Customize Attendee Order" experience be:
   - A new step in the event wizard?
   - A separate page/modal accessible from event management?
   - Inline on the existing Attendees tab?
   >> A separate page/modal accessible from event management with a CTA somewhere obvious on the page / experience where you are adding / managing invitees

3. **Who can reorder:** Only the event owner, or also co-organizers with `canCurate` permission?
>> co-organizers with canCurate too

4. **New RSVP behavior:** When someone new RSVPs after the organizer has set a custom order:
   - Insert at the end of manually-ordered section?
   - Insert based on their richness score (within auto-sorted section)?
   - Notify organizer to re-review order?
   >> RSVP status should have no impact on this. see my answer to #1 and let me know if you need further clarification

5. **Profile richness weighting:** What fields should contribute most to "richness"?
   - Current suggestion: currentFocus (20), expertise (15), role/title (15), conversationHooks (15), company (10), name (10), location (5), tradingCard (10)
   - Should photos/avatars factor in?
   >> your suggestion is fine

6. **Guest list modal:** Should the FullGuestListModal also respect the custom order, or keep its tabbed by-status view?
>> see my answer to #1. those things should be mutually exclusive — keep the tabbed view, but attendees are ranked by the customOrder within each rsvp status list (which I assume is just filtering anyways)

---

## Visual Mockup (ASCII)

### Current State - Split by Status
```
┌─────────────────────────────────────────────────────────┐
│  Confirmed (5)                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ →                  │
│  │Card│ │Card│ │Card│ │Card│ │Card│                     │
│  └────┘ └────┘ └────┘ └────┘ └────┘                     │
├─────────────────────────────────────────────────────────┤
│  Maybe (3)                                              │
│  ┌────┐ ┌────┐ ┌────┐ →                                │
│  │Card│ │Card│ │Card│                                   │
│  └────┘ └────┘ └────┘                                   │
├─────────────────────────────────────────────────────────┤
│  Invited (8)                                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ... →                     │
└─────────────────────────────────────────────────────────┘
```

### Proposed - Unified Ordered List
```
┌─────────────────────────────────────────────────────────┐
│  Who's Coming (16)                                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ... →       │
│  │ 🟢 │ │ 🟢 │ │ 🟡 │ │ 🟢 │ │ ⚪ │ │ 🟡 │              │
│  │Rich│ │Rich│ │Rich│ │Med │ │Med │ │Low │  ← Sorted   │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘    by       │
│    ↑       ↑                                  richness │
│  Pinned  Pinned                                        │
│  #1      #2                                            │
└─────────────────────────────────────────────────────────┘
  🟢 = confirmed  🟡 = maybe  ⚪ = invited
```

### Ordering UI
```
┌─────────────────────────────────────────────────────────┐
│  Customize Attendee Order                    [× Close]  │
├─────────────────────────────────────────────────────────┤
│  Sort by: [▼ Profile Richness]  [Apply Sort]           │
│                                                         │
│  Drag to reorder. Pinned items stay at their position. │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ≡  1. Emily Breunig        🟢  ████████░░ 85%  │   │
│  │ ≡  2. Ikechi Nwabuisi      🟢  ███████░░░ 78%  │   │
│  │ ≡  3. Sarah Chen           🟡  ██████░░░░ 65%  │   │
│  │ ≡  4. Marcus Johnson       🟢  █████░░░░░ 52%  │   │
│  │ ≡  5. Alex Rivera          ⚪  ████░░░░░░ 40%  │   │
│  │ ≡  6. Jordan Kim           🟡  ███░░░░░░░ 35%  │   │
│  │    ... (auto-sorted below)                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Reset to Auto] [Save]    │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. User to answer clarification questions
2. Finalize data model (recommend Solution 3)
3. Create spec document with acceptance criteria
4. Implement in phases:
   - Phase 1: Schema + richness calculation
   - Phase 2: API ordering logic
   - Phase 3: Unified list on landing page
   - Phase 4: Organizer ordering UI
