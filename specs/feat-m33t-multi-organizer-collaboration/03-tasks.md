# Task Breakdown: M33T Multi-Organizer Collaboration

**Generated:** 2026-01-18
**Source:** specs/feat-m33t-multi-organizer-collaboration/02-spec.md
**Last Decompose:** 2026-01-18

---

## Overview

Enable multiple organizers to collaboratively manage M33T events with proper authorization, audit trails, and UI feedback showing who added/edited attendees.

**Key Changes:**
1. Fix authorization to check EventOrganizer permissions (not just owner)
2. Add `addedById` and `overridesEditedById` audit fields to EventAttendee
3. Update 4 API routes to use new permission helper
4. Update UI to show WHO edited each attendee

---

## Phase 1: Data Model

### Task 1.1: Add Audit Fields to EventAttendee Model

**Description:** Add `addedById` and `overridesEditedById` fields with User relations to track who added/edited attendees
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**Technical Requirements:**

Add to `prisma/schema.prisma` in the EventAttendee model:

```prisma
model EventAttendee {
  // ... existing fields ...

  // Audit: Who added this attendee
  addedById             String?
  addedBy               User?     @relation("AttendeeAddedBy", fields: [addedById], references: [id])

  // Audit: Who last edited profile overrides (and when - use overridesEditedAt)
  overridesEditedById   String?
  overridesEditedBy     User?     @relation("AttendeeOverridesEditedBy", fields: [overridesEditedById], references: [id])

  // ... rest of fields ...
}
```

**Note:** `overridesEditedAt` already exists from the profile overrides feature.

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Locate EventAttendee model
3. Add the two audit fields (`addedById`, `overridesEditedById`)
4. Add the two relation fields (`addedBy`, `overridesEditedBy`)
5. Verify field placement near other audit-related fields

**Acceptance Criteria:**
- [ ] `addedById` field added as nullable String
- [ ] `addedBy` relation added with proper `@relation` name
- [ ] `overridesEditedById` field added as nullable String
- [ ] `overridesEditedBy` relation added with proper `@relation` name
- [ ] Schema validates with `npx prisma validate`

---

### Task 1.2: Add Inverse Relations to User Model

**Description:** Add inverse relations to User model for the new EventAttendee audit fields
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**

Add to `prisma/schema.prisma` in the User model:

```prisma
model User {
  // ... existing fields ...

  // M33T audit relations
  attendeesAdded           EventAttendee[] @relation("AttendeeAddedBy")
  attendeeOverridesEdited  EventAttendee[] @relation("AttendeeOverridesEditedBy")
}
```

**Implementation Steps:**
1. Locate User model in `prisma/schema.prisma`
2. Add the two inverse relation arrays
3. Ensure relation names match exactly: `"AttendeeAddedBy"` and `"AttendeeOverridesEditedBy"`

**Acceptance Criteria:**
- [ ] `attendeesAdded` relation array added to User model
- [ ] `attendeeOverridesEdited` relation array added to User model
- [ ] Relation names match the EventAttendee side exactly
- [ ] Schema validates with `npx prisma validate`

---

### Task 1.3: Run Database Migration

**Description:** Create and apply database migration for the new audit fields
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None

**Technical Requirements:**

Migration adds nullable columns - safe for existing data:
- `addedById` - nullable foreign key to User
- `overridesEditedById` - nullable foreign key to User

**Implementation Steps:**
1. Run `npm run db:backup` to create safety backup
2. Run `npx prisma migrate dev --name add-attendee-audit-fields`
3. Verify migration created successfully
4. Verify Prisma client regenerated

**Acceptance Criteria:**
- [ ] Backup created before migration
- [ ] Migration file created in `prisma/migrations/`
- [ ] Migration applied successfully
- [ ] Prisma client regenerated with new fields
- [ ] Existing data unaffected (nullable fields)

---

## Phase 2: Authorization Helper

### Task 2.1: Create Event Access Permission Helper

**Description:** Create `checkEventAccess()` helper function that checks both owner and co-organizer permissions
**Size:** Medium
**Priority:** High
**Dependencies:** None (can be developed in parallel with Phase 1)
**Can run parallel with:** Task 1.1, 1.2, 1.3

**Technical Requirements:**

Create new file `src/lib/m33t/auth.ts`:

```typescript
import { prisma } from '@/lib/db';

export type EventPermission = 'view' | 'curate' | 'edit' | 'manage';

export interface EventAccessResult {
  isOwner: boolean;
  organizer: {
    canInvite: boolean;
    canCurate: boolean;
    canEdit: boolean;
    canManage: boolean;
  } | null;
}

/**
 * Check if user has access to an event with required permission level.
 *
 * Permission hierarchy:
 * - view: Can see event (any organizer)
 * - curate: Can edit attendee profiles, suggest matches (canCurate: true)
 * - edit: Can modify event details (canEdit: true)
 * - manage: Can add/remove organizers (canManage: true OR owner)
 *
 * Owner always has all permissions.
 */
export async function checkEventAccess(
  eventId: string,
  userId: string,
  requiredPermission: EventPermission = 'view'
): Promise<EventAccessResult | null> {
  // Check if owner
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true }
  });

  if (event) {
    return {
      isOwner: true,
      organizer: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
    };
  }

  // Check if co-organizer
  const organizer = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
  });

  if (!organizer) return null;

  // Check permission level
  const hasPermission =
    requiredPermission === 'view' ? true :
    requiredPermission === 'curate' ? organizer.canCurate :
    requiredPermission === 'edit' ? organizer.canEdit :
    requiredPermission === 'manage' ? organizer.canManage :
    false;

  if (!hasPermission) return null;

  return { isOwner: false, organizer };
}

/**
 * Require event access or throw/return error response.
 * Use in API routes.
 */
export async function requireEventAccess(
  eventId: string,
  userId: string,
  requiredPermission: EventPermission = 'view'
): Promise<EventAccessResult> {
  const access = await checkEventAccess(eventId, userId, requiredPermission);
  if (!access) {
    throw new Error(
      requiredPermission === 'view'
        ? 'Event not found or access denied'
        : `Requires ${requiredPermission} permission`
    );
  }
  return access;
}
```

**Implementation Steps:**
1. Create `src/lib/m33t/auth.ts`
2. Import prisma from `@/lib/db`
3. Define `EventPermission` type
4. Define `EventAccessResult` interface
5. Implement `checkEventAccess()` function
6. Implement `requireEventAccess()` helper
7. Add JSDoc comments

**Acceptance Criteria:**
- [ ] File created at `src/lib/m33t/auth.ts`
- [ ] `EventPermission` type exported
- [ ] `EventAccessResult` interface exported
- [ ] `checkEventAccess()` checks owner first, then co-organizer
- [ ] `requireEventAccess()` throws appropriate errors
- [ ] Owner always gets all permissions
- [ ] Permission hierarchy enforced correctly

---

### Task 2.2: Export Auth Helper from M33T Index

**Description:** Export the new auth helper from the M33T module index
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**Technical Requirements:**

Update `src/lib/m33t/index.ts` to export auth functions:

```typescript
export {
  checkEventAccess,
  requireEventAccess,
  type EventPermission,
  type EventAccessResult
} from './auth';
```

**Implementation Steps:**
1. Open `src/lib/m33t/index.ts`
2. Add export statement for auth module
3. Verify exports work correctly

**Acceptance Criteria:**
- [ ] Auth functions exported from `@/lib/m33t`
- [ ] Types exported alongside functions
- [ ] No circular dependency issues

---

## Phase 3: API Route Updates

### Task 3.1: Update GET Attendee Route for Co-Organizer Access

**Description:** Update GET endpoint to use new permission helper and include audit relations in response
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3, Task 2.2
**Can run parallel with:** Task 3.2, 3.3, 3.4

**Technical Requirements:**

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts`

**Current code (to replace):**
```typescript
const event = await prisma.event.findFirst({
  where: { id: eventId, userId: user.id },
});
if (!event) {
  return NextResponse.json({ error: 'Event not found' }, { status: 404 });
}
```

**New code:**
```typescript
import { checkEventAccess } from '@/lib/m33t/auth';

const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

**Also update the Prisma query to include audit relations:**
```typescript
const attendee = await prisma.eventAttendee.findFirst({
  where: { id: attendeeId, eventId },
  include: {
    contact: { select: { id: true, firstName: true, lastName: true, title: true, company: true } },
    addedBy: { select: { id: true, name: true } },
    overridesEditedBy: { select: { id: true, name: true } },
  },
});
```

**Implementation Steps:**
1. Open the route file
2. Add import for `checkEventAccess`
3. Replace owner-only check with `checkEventAccess(eventId, user.id, 'curate')`
4. Update error response to 403 with descriptive message
5. Add `addedBy` and `overridesEditedBy` to include clause
6. Test that co-organizers can now access attendees

**Acceptance Criteria:**
- [ ] Import `checkEventAccess` from `@/lib/m33t/auth`
- [ ] Owner-only check replaced with permission helper
- [ ] Returns 403 (not 404) for permission denied
- [ ] Response includes `addedBy` relation data
- [ ] Response includes `overridesEditedBy` relation data
- [ ] Owner access still works
- [ ] Co-organizer with `canCurate: true` can access

---

### Task 3.2: Update PATCH Attendee Route for Co-Organizer Access + Audit

**Description:** Update PATCH endpoint to use permission helper and track who edited
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3, Task 2.2
**Can run parallel with:** Task 3.1, 3.3, 3.4

**Technical Requirements:**

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts`

**Authorization update (same as GET):**
```typescript
import { checkEventAccess } from '@/lib/m33t/auth';

const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

**Audit field update - add to the update data:**
```typescript
const updatedAttendee = await prisma.eventAttendee.update({
  where: { id: attendeeId },
  data: {
    profileOverrides: cleanedOverrides ?? undefined,
    overridesEditedAt: new Date(),
    overridesEditedById: user.id,  // Track who edited
  },
});
```

**Implementation Steps:**
1. Open the route file
2. Add import for `checkEventAccess`
3. Replace owner-only check with permission helper
4. Add `overridesEditedById: user.id` to update data
5. Ensure `overridesEditedAt` is also set (already should be)
6. Test that edits are tracked correctly

**Acceptance Criteria:**
- [ ] Authorization uses `checkEventAccess` with 'curate' permission
- [ ] `overridesEditedById` set to current user on save
- [ ] `overridesEditedAt` set to current timestamp
- [ ] Owner can still edit
- [ ] Co-organizer with `canCurate: true` can edit
- [ ] Audit fields persist correctly in database

---

### Task 3.3: Update DELETE Overrides Route for Co-Organizer Access

**Description:** Update DELETE endpoint to use permission helper
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** Task 3.1, 3.2, 3.4

**Technical Requirements:**

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/overrides/route.ts`

**Update authorization:**
```typescript
import { checkEventAccess } from '@/lib/m33t/auth';

const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

**Implementation Steps:**
1. Open the route file
2. Add import for `checkEventAccess`
3. Replace owner-only check with permission helper
4. Update error response to 403

**Acceptance Criteria:**
- [ ] Authorization uses `checkEventAccess` with 'curate' permission
- [ ] Returns 403 for permission denied
- [ ] Owner can still reset overrides
- [ ] Co-organizer with `canCurate: true` can reset overrides

---

### Task 3.4: Update Import Attendees Route for Co-Organizer Access + Audit

**Description:** Update import endpoint to use permission helper and track who added attendees
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3, Task 2.2
**Can run parallel with:** Task 3.1, 3.2, 3.3

**Technical Requirements:**

**File:** `src/app/api/events/[eventId]/attendees/import/route.ts`

**Authorization update:**
```typescript
import { checkEventAccess } from '@/lib/m33t/auth';

const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

**Audit field - add to create data:**
```typescript
const createdAttendees = await prisma.$transaction(
  contacts.map((contact) =>
    prisma.eventAttendee.create({
      data: {
        eventId,
        email: contact.primaryEmail,
        firstName: contact.firstName,
        lastName: contact.lastName,
        // ... other fields
        addedById: user.id,  // Track who added
      },
    })
  )
);
```

**Implementation Steps:**
1. Open the route file
2. Add import for `checkEventAccess`
3. Replace owner-only check with permission helper
4. Add `addedById: user.id` to create data for each attendee
5. Test that new attendees have `addedById` set

**Acceptance Criteria:**
- [ ] Authorization uses `checkEventAccess` with 'curate' permission
- [ ] `addedById` set to current user for all created attendees
- [ ] Owner can still import attendees
- [ ] Co-organizer with `canCurate: true` can import attendees
- [ ] Audit field persists correctly in database

---

### Task 3.5: Update Event Detail API to Include Audit Relations

**Description:** Update GET /api/events/[eventId] to include audit relations in attendee data
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.3
**Can run parallel with:** Task 3.1, 3.2, 3.3, 3.4

**Technical Requirements:**

**File:** `src/app/api/events/[eventId]/route.ts`

**Update attendees select to include audit relations:**
```typescript
attendees: {
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    rsvpStatus: true,
    questionnaireCompletedAt: true,
    profile: true,
    profileOverrides: true,
    overridesEditedAt: true,
    contactId: true,
    contact: { ... },
    addedBy: { select: { id: true, name: true } },
    overridesEditedBy: { select: { id: true, name: true } },
  }
}
```

**Implementation Steps:**
1. Open the route file
2. Find the attendees select clause
3. Add `addedBy` and `overridesEditedBy` with name selection
4. Verify response includes audit info

**Acceptance Criteria:**
- [ ] `addedBy` included in attendee response
- [ ] `overridesEditedBy` included in attendee response
- [ ] Both include `id` and `name` fields only
- [ ] No performance impact from additional joins

---

## Phase 4: UI Updates

### Task 4.1: Update AttendeeData Interface

**Description:** Add audit fields to the AttendeeData TypeScript interface
**Size:** Small
**Priority:** High
**Dependencies:** Task 3.5
**Can run parallel with:** None (needed for other UI tasks)

**Technical Requirements:**

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Update interface:**
```typescript
interface AttendeeData {
  // ... existing fields ...

  addedBy: { id: string; name: string } | null;
  overridesEditedBy: { id: string; name: string } | null;
}
```

**Implementation Steps:**
1. Open the page file
2. Find AttendeeData interface
3. Add `addedBy` and `overridesEditedBy` fields
4. Ensure types match API response

**Acceptance Criteria:**
- [ ] `addedBy` field added to interface
- [ ] `overridesEditedBy` field added to interface
- [ ] Types are nullable to handle missing data
- [ ] No TypeScript errors

---

### Task 4.2: Replace Customized Badge with Editor Info

**Description:** Show who edited each attendee instead of just a "Customized" badge
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.3, 4.4

**Technical Requirements:**

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Replace this:**
```tsx
{attendee.profileOverrides && Object.keys(attendee.profileOverrides).length > 0 && (
  <Badge variant="outline" className="text-gold-primary border-gold-primary">
    Customized
  </Badge>
)}
```

**With this:**
```tsx
{attendee.overridesEditedBy && (
  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
    <Avatar className="h-5 w-5">
      <AvatarFallback className="text-[10px] bg-gold-subtle text-gold-primary">
        {getInitials(attendee.overridesEditedBy.name)}
      </AvatarFallback>
    </Avatar>
    <span>Edited by {attendee.overridesEditedBy.name}</span>
  </div>
)}
```

**Helper function needed:**
```typescript
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

**Implementation Steps:**
1. Add `getInitials` helper function
2. Import Avatar components if not already imported
3. Replace the Badge with the new editor info display
4. Style consistently with design system

**Acceptance Criteria:**
- [ ] "Customized" badge replaced with editor avatar + name
- [ ] Avatar shows initials of editor
- [ ] Uses gold-subtle background, gold-primary text
- [ ] Displays "Edited by [Name]"
- [ ] Gracefully handles null `overridesEditedBy`

---

### Task 4.3: Add "Added by" Display (Optional)

**Description:** Show who added each attendee (subtle display)
**Size:** Small
**Priority:** Low
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.2, 4.4

**Technical Requirements:**

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Add subtle display:**
```tsx
{attendee.addedBy && (
  <span className="text-xs text-text-tertiary">
    Added by {attendee.addedBy.name}
  </span>
)}
```

**Implementation Steps:**
1. Find appropriate location in attendee row
2. Add the "Added by" display
3. Make it subtle (text-tertiary)

**Acceptance Criteria:**
- [ ] Shows who added each attendee
- [ ] Uses subtle styling (text-xs text-tertiary)
- [ ] Gracefully handles null `addedBy`

---

### Task 4.4: Show Last Editor in Edit Modal Header

**Description:** Display who last edited the profile in the modal header
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.2, 4.3

**Technical Requirements:**

**File:** `src/components/m33t/AttendeeProfileEditModal.tsx`

**Add to modal header:**
```tsx
<DialogHeader>
  <DialogTitle className="text-text-primary">
    Edit Attendee Profile
    <span className="font-normal text-text-secondary ml-2">
      {attendee.firstName} {attendee.lastName}
    </span>
  </DialogTitle>
  {attendee.overridesEditedBy && (
    <p className="text-xs text-text-tertiary mt-1">
      Last edited by {attendee.overridesEditedBy.name}
      {attendee.overridesEditedAt && (
        <> {formatDistanceToNow(new Date(attendee.overridesEditedAt))} ago</>
      )}
    </p>
  )}
</DialogHeader>
```

**Import needed:**
```typescript
import { formatDistanceToNow } from 'date-fns';
```

**Implementation Steps:**
1. Add `date-fns` import for `formatDistanceToNow`
2. Update modal props interface to include audit fields
3. Add the last editor info below title
4. Format timestamp as relative time

**Acceptance Criteria:**
- [ ] Modal shows "Last edited by [Name]" when applicable
- [ ] Timestamp shown as relative time ("3 hours ago")
- [ ] Uses date-fns `formatDistanceToNow`
- [ ] Gracefully handles null values
- [ ] Styling matches design system

---

## Phase 5: Testing

### Task 5.1: Test Co-Organizer Profile Editing

**Description:** Verify co-organizers with `canCurate: true` can edit attendee profiles
**Size:** Medium
**Priority:** High
**Dependencies:** All Phase 3 tasks
**Can run parallel with:** Task 5.2, 5.3, 5.4

**Test Scenarios:**

1. **Setup:** Create event, add co-organizer with `canCurate: true`
2. **Test GET:** Co-organizer can fetch attendee details
3. **Test PATCH:** Co-organizer can save profile overrides
4. **Test DELETE:** Co-organizer can reset overrides
5. **Test Import:** Co-organizer can add new attendees
6. **Negative:** Co-organizer with `canCurate: false` gets 403

**Acceptance Criteria:**
- [ ] Co-organizer can access GET endpoint
- [ ] Co-organizer can access PATCH endpoint
- [ ] Co-organizer can access DELETE endpoint
- [ ] Co-organizer can access import endpoint
- [ ] Permissions are enforced correctly

---

### Task 5.2: Test Owner Access Preserved

**Description:** Verify event owner still has full access to all endpoints
**Size:** Small
**Priority:** High
**Dependencies:** All Phase 3 tasks
**Can run parallel with:** Task 5.1, 5.3, 5.4

**Test Scenarios:**

1. Owner can GET attendee details
2. Owner can PATCH attendee overrides
3. Owner can DELETE overrides
4. Owner can import attendees
5. Owner sees all audit information

**Acceptance Criteria:**
- [ ] No regression in owner access
- [ ] Owner treated as having all permissions
- [ ] Owner actions tracked in audit fields

---

### Task 5.3: Test Audit Fields Population

**Description:** Verify audit fields are correctly populated
**Size:** Medium
**Priority:** High
**Dependencies:** All Phase 3 tasks
**Can run parallel with:** Task 5.1, 5.2, 5.4

**Test Scenarios:**

1. Import attendees → `addedById` set to importer
2. Edit profile → `overridesEditedById` set to editor
3. Edit profile → `overridesEditedAt` updated
4. Multiple editors → tracks last editor only

**Acceptance Criteria:**
- [ ] `addedById` correctly populated on import
- [ ] `overridesEditedById` correctly populated on save
- [ ] `overridesEditedAt` timestamp is current
- [ ] Database records persist correctly

---

### Task 5.4: Test UI Displays Editor Info

**Description:** Verify UI correctly shows who edited/added attendees
**Size:** Small
**Priority:** Medium
**Dependencies:** All Phase 4 tasks
**Can run parallel with:** Task 5.1, 5.2, 5.3

**Test Scenarios:**

1. Dashboard shows editor avatar + name for customized profiles
2. Modal header shows "Last edited by" with relative time
3. Handles null values gracefully (no crash)
4. Initials generated correctly

**Acceptance Criteria:**
- [ ] Editor info displays on dashboard
- [ ] Modal shows last editor info
- [ ] No errors with null audit data
- [ ] Styling matches design system

---

## Dependency Graph

```
Phase 1: Data Model
  1.1 Add audit fields ─────┬─→ 1.3 Run migration ─→ Phase 3, 4
  1.2 Add User relations ───┘

Phase 2: Authorization (can run parallel with Phase 1)
  2.1 Create auth helper ─→ 2.2 Export from index ─→ Phase 3

Phase 3: API Routes (requires Phase 1 + 2 complete)
  3.1 GET route   ─┐
  3.2 PATCH route ─┼─→ All can run in parallel
  3.3 DELETE route─┤
  3.4 Import route─┤
  3.5 Event API   ─┘

Phase 4: UI (requires Phase 3 complete)
  4.1 Update interface ─→ 4.2, 4.3, 4.4 can run in parallel

Phase 5: Testing (requires all phases complete)
  5.1, 5.2, 5.3, 5.4 ─→ All can run in parallel
```

---

## Execution Strategy

**Recommended Order:**

1. Start Phase 1.1 and 2.1 in parallel
2. Complete Phase 1 (1.2, 1.3)
3. Complete Phase 2 (2.2)
4. Execute all Phase 3 tasks in parallel
5. Execute Phase 4 tasks (4.1 first, then 4.2-4.4 in parallel)
6. Run all Phase 5 tests

**Estimated Time:** 4-6 hours total

**Critical Path:** 1.1 → 1.2 → 1.3 → 3.2 → 4.1 → 4.2

---

## Success Criteria

From the specification:

1. ✅ Co-organizers with `canCurate: true` can edit attendee profile overrides
2. ✅ `addedById` is set when attendees are imported
3. ✅ `overridesEditedById` and `overridesEditedAt` are set when overrides are saved
4. ✅ Dashboard shows WHO edited each attendee (avatar + name)
5. ✅ Edit modal shows last editor with timestamp
6. ✅ No regression - owner still has full access
