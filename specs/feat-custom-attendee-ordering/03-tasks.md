# Task Breakdown: Custom Attendee Ordering for M33T Events

**Generated:** 2026-01-24
**Source:** specs/feat-custom-attendee-ordering/02-spec.md
**Feature Slug:** feat-custom-attendee-ordering
**Last Decompose:** 2026-01-24

---

## Overview

Enable M33T event organizers to customize the display order of attendees on the event landing page through manual drag-reorder and/or auto-sort by "profile richness" (completeness score). The landing page maintains three RSVP-status carousels, but attendees within each carousel are sorted by their position in a single master order list.

---

## Phase 1: Database Schema & Core Infrastructure

### Task 1.1: Add displayOrder and profileRichness fields to EventAttendee model

**Description:** Add two new fields to the EventAttendee Prisma model for ordering and richness scoring.
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**Technical Requirements:**

Update `prisma/schema.prisma` EventAttendee model (around line 502):

```prisma
model EventAttendee {
  // ... existing fields ...

  // Attendee Ordering (new fields)
  displayOrder     Int?    @default(null)  // null = auto-sort, number = pinned position
  profileRichness  Int     @default(0)     // 0-100 computed score for auto-sorting

  // Audit trail for ordering changes
  orderUpdatedById  String?
  orderUpdatedBy    User?     @relation("AttendeeOrderUpdatedBy", fields: [orderUpdatedById], references: [id])
  orderUpdatedAt    DateTime?

  // ... existing indexes ...
  @@index([eventId, displayOrder])  // Composite index for efficient ordering queries
}
```

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Find the EventAttendee model (around line 502)
3. Add the three new fields after existing audit fields (around line 540)
4. Add the new User relation for orderUpdatedBy
5. Add the composite index for efficient ordering queries
6. Run `npx prisma migrate dev --name add-attendee-ordering-fields`
7. Run `npx prisma generate` to update the client

**Acceptance Criteria:**
- [ ] `displayOrder` field added as nullable Int
- [ ] `profileRichness` field added as Int with default 0
- [ ] `orderUpdatedById`, `orderUpdatedBy`, `orderUpdatedAt` audit fields added
- [ ] Composite index on `[eventId, displayOrder]` created
- [ ] Migration runs without errors
- [ ] Prisma client regenerated successfully

---

### Task 1.2: Create profileRichness calculation function

**Description:** Implement a function to compute a 0-100 "richness" score based on profile completeness.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**

Create `src/lib/m33t/profileRichness.ts`:

```typescript
import type { Profile } from './schemas';

// Type for trading card data
interface TradingCard {
  background?: string;
  whyInteresting?: string;
  whyMatch?: string[];
  conversationStarters?: string[];
  headline?: string;
  company?: string;
  location?: string;
}

/**
 * Scoring weights for profile richness calculation.
 * Higher scores = richer profiles that should appear first when auto-sorting.
 *
 * | Field             | Points | Notes                           |
 * |-------------------|--------|----------------------------------|
 * | currentFocus      | 20     | Most valuable - shows engagement |
 * | expertise[]       | 15     | Array has 1+ items              |
 * | role/title        | 15     | Job title present               |
 * | conversationHooks | 15     | Array has 1+ items              |
 * | company           | 10     | Company name present            |
 * | name              | 10     | Full name (not just email)      |
 * | tradingCard       | 10     | Trading card data exists        |
 * | location          | 5      | Location present                |
 * | Total             | 100    |                                  |
 */

export function calculateProfileRichness(
  profile: Profile | null | undefined,
  tradingCard: TradingCard | null | undefined,
  firstName: string,
  lastName?: string | null
): number {
  let score = 0;

  // From profile JSON
  if (profile?.currentFocus && profile.currentFocus.trim()) {
    score += 20;
  }

  if (profile?.expertise && profile.expertise.length > 0) {
    score += 15;
  }

  if (profile?.role && profile.role.trim()) {
    score += 15;
  }

  if (profile?.conversationHooks && profile.conversationHooks.length > 0) {
    score += 15;
  }

  if (profile?.company && profile.company.trim()) {
    score += 10;
  }

  // Check for real name (not just email-like)
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
  if (fullName && !fullName.includes('@') && fullName.length > 2) {
    score += 10;
  }

  if (profile?.location && profile.location.trim()) {
    score += 5;
  }

  // Trading card bonus - any meaningful content
  if (tradingCard) {
    const hasTradingCardContent =
      (tradingCard.background && tradingCard.background.trim()) ||
      (tradingCard.whyInteresting && tradingCard.whyInteresting.trim()) ||
      (tradingCard.whyMatch && tradingCard.whyMatch.length > 0) ||
      (tradingCard.conversationStarters && tradingCard.conversationStarters.length > 0);

    if (hasTradingCardContent) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Calculate richness from a full EventAttendee record.
 * Convenience wrapper for use with Prisma query results.
 */
export function calculateAttendeeRichness(attendee: {
  firstName: string;
  lastName?: string | null;
  profile?: unknown;
  tradingCard?: unknown;
}): number {
  return calculateProfileRichness(
    attendee.profile as Profile | null,
    attendee.tradingCard as TradingCard | null,
    attendee.firstName,
    attendee.lastName
  );
}
```

**Implementation Steps:**
1. Create new file `src/lib/m33t/profileRichness.ts`
2. Import the Profile type from existing schemas
3. Define TradingCard interface for type safety
4. Implement `calculateProfileRichness()` with all scoring weights
5. Implement `calculateAttendeeRichness()` convenience wrapper
6. Export from `src/lib/m33t/index.ts` barrel file

**Acceptance Criteria:**
- [ ] Function returns correct scores for various profile combinations:
  - Empty profile → 0
  - Full profile with all fields → 100
  - Partial profile → proportional score
- [ ] Name scoring excludes email-like names (containing @)
- [ ] Trading card bonus only applies when meaningful content exists
- [ ] Function handles null/undefined inputs gracefully
- [ ] Exported from m33t barrel file

---

### Task 1.3: Add profileRichness export to m33t barrel file

**Description:** Export the new profileRichness functions from the m33t barrel file.
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** None

**Technical Requirements:**

Update `src/lib/m33t/index.ts`:

```typescript
// Add to existing exports
export {
  calculateProfileRichness,
  calculateAttendeeRichness
} from './profileRichness';
```

**Implementation Steps:**
1. Open `src/lib/m33t/index.ts`
2. Add export statement for profileRichness functions
3. Verify no circular dependency issues

**Acceptance Criteria:**
- [ ] Functions importable via `import { calculateProfileRichness } from '@/lib/m33t'`
- [ ] No TypeScript errors
- [ ] No circular dependency warnings

---

## Phase 2: API Layer - Ordering Logic

### Task 2.1: Create sortAttendees utility function

**Description:** Implement the sorting logic that orders attendees by displayOrder within each RSVP status group.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.2, Task 1.3

**Technical Requirements:**

Create `src/lib/m33t/attendeeSort.ts`:

```typescript
/**
 * Attendee sorting logic for display order.
 *
 * Sorting Priority (within each RSVP status group):
 * 1. displayOrder ASC (pinned items first, nulls last)
 * 2. profileRichness DESC (richest auto-sorted items next)
 * 3. createdAt ASC (oldest first as tiebreaker)
 */

interface SortableAttendee {
  id: string;
  displayOrder: number | null;
  profileRichness: number;
  createdAt: Date;
}

/**
 * Sort attendees by display order within a single group.
 * Pinned items (non-null displayOrder) appear first, sorted by displayOrder.
 * Auto-sorted items (null displayOrder) follow, sorted by profileRichness DESC.
 */
export function sortAttendeesByDisplayOrder<T extends SortableAttendee>(
  attendees: T[]
): T[] {
  return [...attendees].sort((a, b) => {
    // Pinned items (non-null displayOrder) come first
    if (a.displayOrder !== null && b.displayOrder === null) return -1;
    if (a.displayOrder === null && b.displayOrder !== null) return 1;

    // Both pinned: sort by displayOrder ascending
    if (a.displayOrder !== null && b.displayOrder !== null) {
      return a.displayOrder - b.displayOrder;
    }

    // Both auto-sorted: sort by richness DESC, then createdAt ASC
    const richnessDiff = (b.profileRichness ?? 0) - (a.profileRichness ?? 0);
    if (richnessDiff !== 0) return richnessDiff;

    // Tiebreaker: oldest first
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Sort attendees grouped by RSVP status.
 * Each group is sorted independently using the same logic.
 */
export function sortAttendeeGroups<T extends SortableAttendee>(
  groups: { confirmed: T[]; maybe: T[]; invited: T[] }
): { confirmed: T[]; maybe: T[]; invited: T[] } {
  return {
    confirmed: sortAttendeesByDisplayOrder(groups.confirmed),
    maybe: sortAttendeesByDisplayOrder(groups.maybe),
    invited: sortAttendeesByDisplayOrder(groups.invited),
  };
}
```

**Implementation Steps:**
1. Create `src/lib/m33t/attendeeSort.ts`
2. Define SortableAttendee interface with required fields
3. Implement `sortAttendeesByDisplayOrder()` with three-tier sorting
4. Implement `sortAttendeeGroups()` convenience wrapper
5. Export from m33t barrel file

**Acceptance Criteria:**
- [ ] Pinned attendees (non-null displayOrder) appear before auto-sorted
- [ ] Pinned attendees sorted by displayOrder ascending
- [ ] Auto-sorted attendees ordered by profileRichness descending
- [ ] Tiebreaker uses createdAt ascending (oldest first)
- [ ] Original array not mutated (returns new array)
- [ ] Works with empty arrays

---

### Task 2.2: Update public events API to return sorted attendees

**Description:** Modify the public events API to apply sorting within each RSVP status group.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**Technical Requirements:**

Update `src/app/api/public/events/[slug]/route.ts`:

1. Add new fields to Prisma select:
```typescript
select: {
  id: true,
  firstName: true,
  lastName: true,
  rsvpStatus: true,
  profile: true,
  profileOverrides: true,
  tradingCard: true,
  // NEW: Add ordering fields
  displayOrder: true,
  profileRichness: true,
  createdAt: true,
}
```

2. Import and use sorting function:
```typescript
import { sortAttendeeGroups } from '@/lib/m33t';

// After grouping attendees by status, before returning:
const sortedAttendees = sortAttendeeGroups(transformedAttendees);

// Return sorted groups
const response = {
  // ... existing fields
  attendees: sortedAttendees,
  // ...
};
```

**Implementation Steps:**
1. Add `displayOrder`, `profileRichness`, `createdAt` to Prisma select
2. Import `sortAttendeeGroups` from `@/lib/m33t`
3. Store createdAt, displayOrder, profileRichness in the PublicAttendee transformation
4. Apply sorting after grouping by status
5. Return sorted groups in response

**Acceptance Criteria:**
- [ ] API returns attendees sorted by displayOrder within each status
- [ ] Response structure unchanged (still `{ confirmed: [], maybe: [], invited: [] }`)
- [ ] Pinned attendees appear first in each group
- [ ] Auto-sorted attendees follow in richness order
- [ ] No breaking changes to existing API consumers

---

### Task 2.3: Create GET /api/events/[eventId]/attendee-order endpoint

**Description:** Create API endpoint for organizers to view all attendees in master order.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 2.1
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/api/events/[eventId]/attendee-order/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { checkEventAccess } from '@/lib/m33t';
import { sortAttendeesByDisplayOrder } from '@/lib/m33t';
import type { Profile } from '@/lib/m33t/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/attendee-order
 *
 * Returns all attendees in master order (regardless of RSVP status).
 * Requires canCurate permission.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch all non-declined attendees with ordering fields
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: { not: 'DECLINED' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rsvpStatus: true,
        displayOrder: true,
        profileRichness: true,
        createdAt: true,
        profile: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { profileRichness: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Transform to response format
    const transformedAttendees = attendees.map((a) => {
      const profile = a.profile as Profile | null;
      return {
        id: a.id,
        name: `${a.firstName}${a.lastName ? ' ' + a.lastName : ''}`,
        email: a.email,
        rsvpStatus: a.rsvpStatus,
        displayOrder: a.displayOrder,
        profileRichness: a.profileRichness,
        profile: {
          role: profile?.role,
          company: profile?.company,
        },
      };
    });

    // Calculate stats
    const pinned = attendees.filter((a) => a.displayOrder !== null).length;
    const autoSorted = attendees.length - pinned;

    return NextResponse.json({
      attendees: transformedAttendees,
      stats: {
        total: attendees.length,
        pinned,
        autoSorted,
      },
    });
  } catch (error) {
    console.error('Error fetching attendee order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create directory `src/app/api/events/[eventId]/attendee-order/`
2. Create `route.ts` with GET handler
3. Implement auth check using `checkEventAccess` with 'curate' permission
4. Fetch attendees with ordering fields
5. Transform to response format with stats

**Acceptance Criteria:**
- [ ] Returns all non-declined attendees in master order
- [ ] Includes displayOrder and profileRichness for each attendee
- [ ] Stats include total, pinned, and autoSorted counts
- [ ] Requires canCurate permission (403 if missing)
- [ ] Returns 401 if not authenticated

---

### Task 2.4: Create PUT /api/events/[eventId]/attendee-order endpoint

**Description:** Create API endpoint to update displayOrder for multiple attendees.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.3
**Can run parallel with:** None

**Technical Requirements:**

Add to `src/app/api/events/[eventId]/attendee-order/route.ts`:

```typescript
import { z } from 'zod';

// Request body schema
const UpdateOrderSchema = z.object({
  orders: z.array(z.object({
    attendeeId: z.string(),
    displayOrder: z.number().int().nullable(),
  })),
});

/**
 * PUT /api/events/[eventId]/attendee-order
 *
 * Update the display order for multiple attendees.
 * Requires canCurate permission.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { orders } = parsed.data;

    // Verify all attendees belong to this event
    const attendeeIds = orders.map((o) => o.attendeeId);
    const existingAttendees = await prisma.eventAttendee.findMany({
      where: {
        id: { in: attendeeIds },
        eventId,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingAttendees.map((a) => a.id));
    const invalidIds = attendeeIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some attendees not found in this event', invalidIds },
        { status: 400 }
      );
    }

    // Update all attendees in a transaction
    const now = new Date();
    await prisma.$transaction(
      orders.map((order) =>
        prisma.eventAttendee.update({
          where: { id: order.attendeeId },
          data: {
            displayOrder: order.displayOrder,
            orderUpdatedById: user.id,
            orderUpdatedAt: now,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: orders.length });
  } catch (error) {
    console.error('Error updating attendee order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Add Zod schema for request validation
2. Add PUT handler to existing route file
3. Implement auth check with canCurate permission
4. Verify all attendees belong to event
5. Update in transaction with audit trail

**Acceptance Criteria:**
- [ ] Updates displayOrder for specified attendees
- [ ] Records audit trail (orderUpdatedById, orderUpdatedAt)
- [ ] Validates all attendees belong to the event
- [ ] Uses transaction for atomic updates
- [ ] Requires canCurate permission

---

### Task 2.5: Create POST /api/events/[eventId]/attendee-order/auto-sort endpoint

**Description:** Create API endpoint to apply auto-sort by richness to all attendees.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.4, Task 1.2
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/api/events/[eventId]/attendee-order/auto-sort/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AutoSortSchema = z.object({
  sortBy: z.enum(['richness', 'name', 'rsvp-date']),
  pinTop: z.number().int().min(0).optional(), // Optional: pin top N after sorting
});

/**
 * POST /api/events/[eventId]/attendee-order/auto-sort
 *
 * Apply auto-sort to all attendees (clears manual ordering).
 * Requires canCurate permission.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = AutoSortSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sortBy, pinTop } = parsed.data;

    // Fetch all non-declined attendees
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: { not: 'DECLINED' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileRichness: true,
        rsvpRespondedAt: true,
        createdAt: true,
      },
    });

    // Sort based on criteria
    let sorted: typeof attendees;
    switch (sortBy) {
      case 'richness':
        sorted = [...attendees].sort((a, b) =>
          (b.profileRichness ?? 0) - (a.profileRichness ?? 0)
        );
        break;
      case 'name':
        sorted = [...attendees].sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName || ''}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'rsvp-date':
        sorted = [...attendees].sort((a, b) => {
          const dateA = a.rsvpRespondedAt || a.createdAt;
          const dateB = b.rsvpRespondedAt || b.createdAt;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
        break;
      default:
        sorted = attendees;
    }

    // Build updates: pin top N or clear all
    const now = new Date();
    const updates = sorted.map((attendee, index) => {
      const shouldPin = pinTop !== undefined && index < pinTop;
      return prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          displayOrder: shouldPin ? index : null,
          orderUpdatedById: user.id,
          orderUpdatedAt: now,
        },
      });
    });

    // Execute in transaction
    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      sorted: sorted.length,
      pinned: pinTop ?? 0,
    });
  } catch (error) {
    console.error('Error auto-sorting attendees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create `src/app/api/events/[eventId]/attendee-order/auto-sort/` directory
2. Create `route.ts` with POST handler
3. Implement sorting by richness, name, or rsvp-date
4. Optionally pin top N results
5. Clear displayOrder for non-pinned (set to null)

**Acceptance Criteria:**
- [ ] Sorts by richness (profileRichness DESC)
- [ ] Sorts by name (alphabetical A-Z)
- [ ] Sorts by rsvp-date (earliest first)
- [ ] pinTop option pins specified number at top
- [ ] Without pinTop, clears all displayOrder (back to pure auto-sort)
- [ ] Records audit trail

---

## Phase 3: Richness Recalculation Triggers

### Task 3.1: Update richness on attendee creation

**Description:** Calculate and set profileRichness when attendees are created.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 3.2, Task 3.3

**Technical Requirements:**

Update attendee creation locations to include richness calculation:

1. **Import endpoint** (`src/app/api/events/[eventId]/attendees/import/route.ts` or similar):
```typescript
import { calculateAttendeeRichness } from '@/lib/m33t';

// After creating attendee, update richness
const richness = calculateAttendeeRichness(newAttendee);
await prisma.eventAttendee.update({
  where: { id: newAttendee.id },
  data: { profileRichness: richness },
});
```

2. **Manual add endpoint** (if exists):
```typescript
// Same pattern - calculate and set richness on creation
```

3. **RSVP endpoint** (`src/app/api/rsvp/[token]/route.ts` or similar):
```typescript
// After RSVP creates/updates attendee
const richness = calculateAttendeeRichness(attendee);
await prisma.eventAttendee.update({
  where: { id: attendee.id },
  data: { profileRichness: richness },
});
```

**Implementation Steps:**
1. Identify all attendee creation points
2. Import calculateAttendeeRichness
3. Calculate richness after creation
4. Update the attendee record

**Acceptance Criteria:**
- [ ] New attendees from import have profileRichness set
- [ ] New attendees from manual add have profileRichness set
- [ ] New attendees from RSVP have profileRichness set
- [ ] Richness reflects available data at creation time

---

### Task 3.2: Update richness on questionnaire submission

**Description:** Recalculate profileRichness when attendee completes questionnaire.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 3.1, Task 3.3

**Technical Requirements:**

Update `src/app/api/rsvp/[token]/questionnaire/route.ts`:

```typescript
import { calculateAttendeeRichness } from '@/lib/m33t';

// After saving questionnaire responses and extracting profile:
// (This likely happens after profile extraction completes)

// Recalculate richness with new profile data
const updatedAttendee = await prisma.eventAttendee.findUnique({
  where: { id: attendeeId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    profile: true,
    tradingCard: true,
  },
});

if (updatedAttendee) {
  const richness = calculateAttendeeRichness(updatedAttendee);
  await prisma.eventAttendee.update({
    where: { id: attendeeId },
    data: { profileRichness: richness },
  });
}
```

**Implementation Steps:**
1. Find questionnaire submission handler
2. Add richness recalculation after profile extraction
3. Update attendee with new richness score

**Acceptance Criteria:**
- [ ] Richness recalculated after questionnaire submission
- [ ] New score reflects extracted profile data
- [ ] Works even if profile extraction is async

---

### Task 3.3: Update richness on profile/trading card changes

**Description:** Recalculate profileRichness when profile or trading card is updated.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 3.1, Task 3.2

**Technical Requirements:**

Update `src/lib/m33t/extraction.ts` (after profile extraction):

```typescript
import { calculateAttendeeRichness } from './profileRichness';

// In extractProfileFromResponses or similar function:
// After updating profile, recalculate richness

const richness = calculateAttendeeRichness({
  firstName: attendee.firstName,
  lastName: attendee.lastName,
  profile: extractedProfile,
  tradingCard: attendee.tradingCard,
});

await prisma.eventAttendee.update({
  where: { id: attendeeId },
  data: {
    profile: extractedProfile,
    profileRichness: richness,
  },
});
```

Also update trading card generation endpoint:
```typescript
// After generating/updating trading card
const richness = calculateAttendeeRichness(attendeeWithNewTradingCard);
await prisma.eventAttendee.update({
  where: { id: attendeeId },
  data: { profileRichness: richness },
});
```

**Implementation Steps:**
1. Find profile extraction function
2. Add richness recalculation after profile update
3. Find trading card generation function
4. Add richness recalculation after trading card update

**Acceptance Criteria:**
- [ ] Richness recalculated after profile extraction
- [ ] Richness recalculated after trading card generation
- [ ] Organizer profile edits trigger recalculation

---

### Task 3.4: Create batch richness recalculation endpoint

**Description:** API endpoint to recalculate richness for all attendees in an event.
**Size:** Small
**Priority:** Low
**Dependencies:** Task 1.2
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/api/events/[eventId]/attendee-order/recalculate/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { checkEventAccess, calculateAttendeeRichness } from '@/lib/m33t';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[eventId]/attendee-order/recalculate
 *
 * Batch recalculate profileRichness for all attendees.
 * Useful for existing events or after scoring algorithm changes.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Check canCurate permission
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch all attendees
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: true,
        tradingCard: true,
      },
    });

    // Recalculate and update each
    let updated = 0;
    for (const attendee of attendees) {
      const richness = calculateAttendeeRichness(attendee);
      await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: { profileRichness: richness },
      });
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    console.error('Error recalculating richness:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create recalculate endpoint
2. Fetch all attendees for event
3. Recalculate richness for each
4. Return count of updated records

**Acceptance Criteria:**
- [ ] Recalculates richness for all attendees
- [ ] Works with existing events (migration helper)
- [ ] Requires canCurate permission

---

## Phase 4: Organizer UI - Customize Order Modal

### Task 4.1: Install @dnd-kit dependencies

**Description:** Add drag-and-drop library dependencies.
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 4.2

**Technical Requirements:**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Implementation Steps:**
1. Run npm install command
2. Verify packages added to package.json
3. Check for peer dependency warnings

**Acceptance Criteria:**
- [ ] @dnd-kit/core installed
- [ ] @dnd-kit/sortable installed
- [ ] @dnd-kit/utilities installed
- [ ] No peer dependency conflicts

---

### Task 4.2: Create AttendeeOrderModal component

**Description:** Build the modal UI for drag-and-drop attendee ordering.
**Size:** Large
**Priority:** High
**Dependencies:** Task 4.1, Task 2.3, Task 2.4, Task 2.5
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/events/AttendeeOrderModal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Types
interface OrderableAttendee {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'MAYBE' | 'DECLINED';
  displayOrder: number | null;
  profileRichness: number;
  profile: {
    role?: string;
    company?: string;
  };
}

interface AttendeeOrderModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

// RSVP Status colors
const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-500',
  MAYBE: 'bg-amber-500',
  PENDING: 'bg-zinc-500',
};

const STATUS_ABBREV: Record<string, string> = {
  CONFIRMED: 'CONF',
  MAYBE: 'MAYBE',
  PENDING: 'INVTD',
};

// Sortable attendee row component
function SortableAttendeeRow({
  attendee,
  index,
  isPinned,
}: {
  attendee: OrderableAttendee;
  index: number;
  isPinned: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attendee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Richness bar width (0-100%)
  const richnessWidth = `${attendee.profileRichness}%`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border ${
        isPinned ? 'border-gold-primary/30' : 'border-border'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary"
      >
        <GripVertical size={18} />
      </button>

      {/* Position number */}
      <span className="w-6 text-sm text-text-tertiary">{index + 1}.</span>

      {/* Name */}
      <span className="flex-1 text-sm text-text-primary truncate">
        {attendee.name}
      </span>

      {/* RSVP Status */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[attendee.rsvpStatus]}`} />
        <span className="text-xs text-text-tertiary w-12">
          {STATUS_ABBREV[attendee.rsvpStatus]}
        </span>
      </div>

      {/* Richness bar */}
      <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-gold-primary rounded-full transition-all"
          style={{ width: richnessWidth }}
        />
      </div>
      <span className="w-8 text-xs text-text-tertiary text-right">
        {attendee.profileRichness}
      </span>
    </div>
  );
}

export function AttendeeOrderModal({
  eventId,
  isOpen,
  onClose,
}: AttendeeOrderModalProps) {
  const router = useRouter();
  const [attendees, setAttendees] = useState<OrderableAttendee[]>([]);
  const [stats, setStats] = useState({ total: 0, pinned: 0, autoSorted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'richness' | 'name' | 'rsvp-date'>('richness');
  const [hasChanges, setHasChanges] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch attendees on open
  useEffect(() => {
    if (isOpen) {
      fetchAttendees();
    }
  }, [isOpen, eventId]);

  async function fetchAttendees() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendee-order`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAttendees(data.attendees);
      setStats(data.stats);
    } catch (error) {
      toast.error('Failed to load attendees');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAttendees((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  }

  // Apply sort
  async function handleApplySort() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendee-order/auto-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortBy }),
      });
      if (!res.ok) throw new Error('Failed to sort');
      await fetchAttendees();
      setHasChanges(false);
      toast.success('Sort applied');
    } catch (error) {
      toast.error('Failed to apply sort');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  // Reset all ordering
  async function handleResetAll() {
    setIsSaving(true);
    try {
      // Clear all display orders by setting to null
      const orders = attendees.map((a) => ({ attendeeId: a.id, displayOrder: null }));
      const res = await fetch(`/api/events/${eventId}/attendee-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error('Failed to reset');
      await fetchAttendees();
      setHasChanges(false);
      toast.success('Order reset to auto-sort');
    } catch (error) {
      toast.error('Failed to reset order');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  // Save current order
  async function handleSave() {
    setIsSaving(true);
    try {
      // Pin all items with their current position
      const orders = attendees.map((a, index) => ({
        attendeeId: a.id,
        displayOrder: index,
      }));
      const res = await fetch(`/api/events/${eventId}/attendee-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Order saved');
      setHasChanges(false);
      router.refresh();
      onClose();
    } catch (error) {
      toast.error('Failed to save order');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  // Find divider position between pinned and auto-sorted
  const pinnedCount = attendees.filter((a) => a.displayOrder !== null).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Attendee Display Order</DialogTitle>
        </DialogHeader>

        {/* Sort controls */}
        <div className="flex items-center gap-3 py-3 border-b border-border">
          <span className="text-sm text-text-secondary">Sort by:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="richness">Profile Richness</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="rsvp-date">RSVP Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleApplySort} disabled={isSaving}>
            Apply
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleResetAll} disabled={isSaving}>
            Reset All
          </Button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-text-tertiary py-2">
          Drag to reorder. This order applies across all RSVP status sections on your event landing page.
        </p>

        {/* Attendee list */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-text-tertiary" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={attendees.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {attendees.map((attendee, index) => (
                  <SortableAttendeeRow
                    key={attendee.id}
                    attendee={attendee}
                    index={index}
                    isPinned={attendee.displayOrder !== null}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Stats footer */}
        <div className="text-xs text-text-tertiary py-2 border-t border-border">
          Showing {stats.total} attendees ({stats.pinned} pinned, {stats.autoSorted} auto-sorted)
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-gold-primary hover:bg-gold-light text-black"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Save Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Implementation Steps:**
1. Create the component file
2. Import and configure @dnd-kit
3. Create SortableAttendeeRow subcomponent
4. Implement fetch, sort, reset, and save handlers
5. Add visual indicators for pinned vs auto-sorted

**Acceptance Criteria:**
- [ ] Modal opens with list of all attendees
- [ ] Drag-and-drop reorders attendees
- [ ] Sort dropdown with Apply button works
- [ ] Reset All clears manual ordering
- [ ] Save persists order to database
- [ ] Loading/saving states displayed
- [ ] Visual distinction between pinned and auto-sorted

---

### Task 4.3: Add "Customize Display Order" button to event management

**Description:** Add a button to access the ordering modal from the event attendees page.
**Size:** Small
**Priority:** High
**Dependencies:** Task 4.2
**Can run parallel with:** None

**Technical Requirements:**

Update event attendees management page (likely `src/app/(dashboard)/events/[eventId]/page.tsx` or attendees tab):

```typescript
import { AttendeeOrderModal } from '@/components/events/AttendeeOrderModal';

// Add state
const [showOrderModal, setShowOrderModal] = useState(false);

// Add button in the attendees section header
<Button
  variant="outline"
  onClick={() => setShowOrderModal(true)}
  className="gap-2"
>
  <GripVertical size={16} />
  Customize Display Order
</Button>

// Add modal
<AttendeeOrderModal
  eventId={eventId}
  isOpen={showOrderModal}
  onClose={() => setShowOrderModal(false)}
/>
```

**Implementation Steps:**
1. Find the event attendees management page
2. Import AttendeeOrderModal component
3. Add state for modal visibility
4. Add button in appropriate location
5. Render modal conditionally

**Acceptance Criteria:**
- [ ] Button visible on attendee management page
- [ ] Button opens the ordering modal
- [ ] Modal closes and refreshes data on save

---

## Phase 5: Landing Page Integration

### Task 5.1: Update PublicAttendee type to include ordering fields

**Description:** Add displayOrder and profileRichness to the PublicAttendee type for sorting.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2
**Can run parallel with:** None

**Technical Requirements:**

Update `src/app/m33t/[slug]/types.ts`:

```typescript
export interface PublicAttendee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  status: 'confirmed' | 'maybe' | 'invited';
  expertise?: string[];
  currentFocus?: string;
  tradingCard?: {
    background?: string;
    whyInteresting?: string;
    conversationStarters?: string[];
  };
  // NEW: Ordering fields (not displayed, used for sorting)
  displayOrder?: number | null;
  profileRichness?: number;
}
```

**Implementation Steps:**
1. Open types.ts
2. Add optional displayOrder and profileRichness fields
3. Update any consuming components if needed

**Acceptance Criteria:**
- [ ] PublicAttendee type includes displayOrder
- [ ] PublicAttendee type includes profileRichness
- [ ] No TypeScript errors in consuming code

---

### Task 5.2: Verify landing page respects sorted order

**Description:** Confirm the landing page displays attendees in the sorted order from the API.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2, Task 5.1
**Can run parallel with:** None

**Technical Requirements:**

The landing page (`src/app/m33t/[slug]/EventLandingClient.tsx`) should already work since:
1. API returns attendees pre-sorted
2. Client renders in array order

**Verification Steps:**
1. Create test event with attendees having varied richness scores
2. Set custom displayOrder for some attendees via API
3. Load landing page and verify order matches expectation
4. Check each carousel (confirmed, maybe, invited) maintains correct order

**Acceptance Criteria:**
- [ ] Confirmed carousel shows attendees in displayOrder
- [ ] Maybe carousel shows attendees in displayOrder
- [ ] Invited carousel shows attendees in displayOrder
- [ ] Order persists across page refreshes
- [ ] New RSVPs appear in correct position based on richness

---

### Task 5.3: Verify FullGuestListModal respects sorted order

**Description:** Confirm the full guest list modal displays attendees in sorted order.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2, Task 5.1
**Can run parallel with:** Task 5.2

**Technical Requirements:**

Check `src/app/m33t/[slug]/components/FullGuestListModal.tsx`:
- Each tab (Confirmed/Maybe/Invited) should render in array order
- Since API returns pre-sorted data, no changes should be needed

**Verification Steps:**
1. Open full guest list modal on landing page
2. Switch between tabs
3. Verify each tab shows attendees in expected order

**Acceptance Criteria:**
- [ ] Each tab displays attendees in displayOrder
- [ ] Order matches carousel order
- [ ] No additional sorting needed in component

---

## Execution Strategy

### Recommended Order

1. **Phase 1 (Foundation):** Tasks 1.1 → 1.2 → 1.3 (sequential, database first)
2. **Phase 2 (API):** Tasks 2.1 → 2.2 → 2.3 → 2.4 → 2.5 (sequential, build on each other)
3. **Phase 3 (Triggers):** Tasks 3.1, 3.2, 3.3 can run in parallel, then 3.4
4. **Phase 4 (UI):** Task 4.1 || 4.2 (parallel), then 4.3
5. **Phase 5 (Integration):** Tasks 5.1 → 5.2 || 5.3 (parallel verification)

### Critical Path

```
1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 2.4 → 4.2 → 4.3
```

### Parallel Opportunities

- Task 2.1 (sort utility) can be developed while 1.2 (richness calc) is in progress
- Task 4.1 (install deps) can run alongside any Phase 2/3 work
- Phase 3 tasks (3.1, 3.2, 3.3) are independent
- Phase 5 verification tasks can run in parallel

---

## Testing Checklist

### Unit Tests
- [ ] `calculateProfileRichness()` returns correct scores for various profiles
- [ ] `sortAttendeesByDisplayOrder()` orders pinned before auto-sorted
- [ ] `sortAttendeesByDisplayOrder()` orders by richness within auto-sorted

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

---

## Summary

- **Total Tasks:** 16
- **Phase 1 (Foundation):** 3 tasks
- **Phase 2 (API):** 5 tasks
- **Phase 3 (Triggers):** 4 tasks
- **Phase 4 (UI):** 3 tasks
- **Phase 5 (Integration):** 3 tasks (2 verification)

**Estimated Total Effort:** ~11 hours (per spec estimate)
