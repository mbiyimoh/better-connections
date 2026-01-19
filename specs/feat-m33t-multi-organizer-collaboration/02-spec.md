# M33T Multi-Organizer Collaboration - Specification

**Slug:** feat-m33t-multi-organizer-collaboration
**Author:** Claude Code
**Date:** 2026-01-18
**Status:** Draft
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## 1. Overview

### 1.1 Problem Statement

The M33T attendee profile overrides feature currently only allows the event owner to edit attendee profiles. Co-organizers with `canCurate: true` permission receive 404 errors when attempting to edit. Additionally, there's no tracking of who added or edited attendees, making collaboration difficult to coordinate.

### 1.2 Solution Summary

1. **Fix authorization** - Check EventOrganizer permissions in addition to owner
2. **Add audit fields** - Track `addedById` and `overridesEditedById` on EventAttendee
3. **Update UI** - Show who added/customized each attendee instead of just badges
4. **Keep simple conflict handling** - Last-write-wins (no version locking for now)

### 1.3 User Decisions

| Question | Decision |
|----------|----------|
| Authorization scope | `canCurate: true` can edit all profile fields; contact linking requires contact ownership |
| Audit granularity | Last edited by + timestamp (not full history) |
| Conflict handling | Last-write-wins (Option A - simplest) |
| Track "Added by" | Yes |
| UI indicator | Show WHO customized (avatar/name), not just badge |

---

## 2. Data Model

### 2.1 Schema Changes

**File:** `prisma/schema.prisma`

Add to EventAttendee model:

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

### 2.2 User Model Relations

Add inverse relations to User model:

```prisma
model User {
  // ... existing fields ...

  // M33T audit relations
  attendeesAdded           EventAttendee[] @relation("AttendeeAddedBy")
  attendeeOverridesEdited  EventAttendee[] @relation("AttendeeOverridesEditedBy")
}
```

---

## 3. Authorization

### 3.1 Permission Helper

**File:** `src/lib/m33t/auth.ts` (new file)

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

### 3.2 API Route Updates

Update these routes to use `checkEventAccess()` instead of owner-only check:

| Route | Current Check | New Check |
|-------|--------------|-----------|
| `GET /api/events/[eventId]/attendees/[attendeeId]` | `userId: user.id` | `checkEventAccess(eventId, userId, 'curate')` |
| `PATCH /api/events/[eventId]/attendees/[attendeeId]` | `userId: user.id` | `checkEventAccess(eventId, userId, 'curate')` |
| `DELETE /api/events/[eventId]/attendees/[attendeeId]/overrides` | `userId: user.id` | `checkEventAccess(eventId, userId, 'curate')` |
| `POST /api/events/[eventId]/attendees/import` | `userId: user.id` | `checkEventAccess(eventId, userId, 'curate')` |

**Example update for PATCH route:**

```typescript
// Before
const event = await prisma.event.findFirst({
  where: { id: eventId, userId: user.id },
});
if (!event) {
  return NextResponse.json({ error: 'Event not found' }, { status: 404 });
}

// After
import { checkEventAccess } from '@/lib/m33t/auth';

const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

---

## 4. Audit Trail Implementation

### 4.1 Track Who Added Attendee

**File:** `src/app/api/events/[eventId]/attendees/import/route.ts`

When creating attendees, set `addedById`:

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

### 4.2 Track Who Edited Overrides

**File:** `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts`

When updating overrides, set `overridesEditedById`:

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

### 4.3 API Response Updates

Include editor info in attendee responses:

```typescript
interface AttendeeResponse {
  // ... existing fields ...

  // Audit info
  addedBy: { id: string; name: string } | null;
  overridesEditedBy: { id: string; name: string } | null;
  overridesEditedAt: string | null;
}
```

Update GET endpoint to include relations:

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

---

## 5. UI Updates

### 5.1 Dashboard Attendee List

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

Replace "Customized" badge with editor info:

```tsx
// Before
{attendee.profileOverrides && Object.keys(attendee.profileOverrides).length > 0 && (
  <Badge variant="outline" className="text-gold-primary border-gold-primary">
    Customized
  </Badge>
)}

// After
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

### 5.2 "Added by" Display

Show who added each attendee (subtle, on hover or in detail):

```tsx
{attendee.addedBy && (
  <span className="text-xs text-text-tertiary">
    Added by {attendee.addedBy.name}
  </span>
)}
```

### 5.3 Edit Modal Header

**File:** `src/components/m33t/AttendeeProfileEditModal.tsx`

Show last editor in modal header:

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

### 5.4 Update AttendeeData Interface

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

```typescript
interface AttendeeData {
  // ... existing fields ...

  addedBy: { id: string; name: string } | null;
  overridesEditedBy: { id: string; name: string } | null;
}
```

---

## 6. Event Detail API Update

**File:** `src/app/api/events/[eventId]/route.ts`

Include audit relations in attendee select:

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

---

## 7. Implementation Tasks

### Phase 1: Data Model (1 hour)
- [ ] Add `addedById`, `addedBy` relation to EventAttendee
- [ ] Add `overridesEditedById`, `overridesEditedBy` relation to EventAttendee
- [ ] Add inverse relations to User model
- [ ] Run database migration

### Phase 2: Authorization Helper (1 hour)
- [ ] Create `src/lib/m33t/auth.ts` with `checkEventAccess()` helper
- [ ] Export from `src/lib/m33t/index.ts`

### Phase 3: API Route Updates (2-3 hours)
- [ ] Update `GET /api/events/[eventId]/attendees/[attendeeId]` - use new auth + include audit relations
- [ ] Update `PATCH /api/events/[eventId]/attendees/[attendeeId]` - use new auth + set `overridesEditedById`
- [ ] Update `DELETE /api/events/[eventId]/attendees/[attendeeId]/overrides` - use new auth
- [ ] Update `POST /api/events/[eventId]/attendees/import` - use new auth + set `addedById`
- [ ] Update `GET /api/events/[eventId]` - include audit relations in attendee select

### Phase 4: UI Updates (2 hours)
- [ ] Update dashboard AttendeeData interface
- [ ] Replace "Customized" badge with editor info display
- [ ] Add "Last edited by" to edit modal header
- [ ] Optional: Add "Added by" display

### Phase 5: Testing (1 hour)
- [ ] Test co-organizer can edit attendee profiles
- [ ] Test owner still has full access
- [ ] Test audit fields are populated correctly
- [ ] Test UI displays editor info

---

## 8. Success Criteria

1. **Co-organizers with `canCurate: true` can edit attendee profile overrides** - no more 404 errors
2. **`addedById` is set** when attendees are imported
3. **`overridesEditedById` and `overridesEditedAt` are set** when overrides are saved
4. **Dashboard shows WHO edited** each attendee (avatar + name), not just "Customized"
5. **Edit modal shows last editor** with timestamp
6. **No regression** - owner still has full access

---

## 9. Future Considerations

- **Version-based conflict detection** - Add if users report lost edits
- **Full audit log table** - Add if compliance/history needed
- **"Currently editing" indicator** - Add if simultaneous editing becomes common
- **Activity feed** - Show recent changes across all attendees

---

## 10. Migration Safety

**Risk:** Low - adding nullable fields, no data loss

**Migration steps:**
1. Add new fields as nullable (safe)
2. Deploy code that populates fields on new actions
3. Optionally backfill existing attendees with owner as `addedById`

**Backfill query (optional):**
```sql
UPDATE "EventAttendee" ea
SET "addedById" = e."userId"
FROM "Event" e
WHERE ea."eventId" = e.id
AND ea."addedById" IS NULL;
```
