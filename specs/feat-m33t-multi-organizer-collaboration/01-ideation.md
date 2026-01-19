# M33T Multi-Organizer Collaboration

**Slug:** feat-m33t-multi-organizer-collaboration
**Author:** Claude Code
**Date:** 2026-01-18
**Related:** `specs/feat-m33t-attendee-profile-overrides/`

---

## 1) Intent & Assumptions

**Task brief:** Enable multiple organizers to collaboratively manage M33T events, including editing attendee profile overrides, with proper authorization checks, audit trails to track who added/edited attendees, and conflict handling when organizers edit simultaneously.

**Assumptions:**
- 2-5 co-organizers per event (small team collaboration)
- Organizers work asynchronously most of the time (not real-time pairing)
- Low conflict frequency - rarely editing the same attendee simultaneously
- EventOrganizer model already exists with permission flags (`canInvite`, `canCurate`, `canEdit`, `canManage`)
- Profile overrides feature is already implemented but only allows event owner access

**Out of scope:**
- Real-time collaborative editing (Google Docs-style CRDTs/OT)
- WebSocket-based presence indicators
- Full event sourcing / complete audit history
- Field-level locking
- Automatic conflict merging

---

## 2) Pre-reading Log

- `prisma/schema.prisma:553-577`: EventOrganizer model exists with `canInvite`, `canCurate`, `canEdit`, `canManage` permission flags. Missing: audit fields on EventAttendee.
- `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts:124-127`: Authorization only checks `event.userId === user.id` (owner). Does NOT check EventOrganizer table - co-organizers get 404 errors.
- `specs/feat-m33t-attendee-profile-overrides/02-spec.md:439-441`: "Future Considerations" explicitly lists "Audit history: Track who changed what and when" as out-of-scope for v1.
- `src/app/api/events/[eventId]/organizers/route.ts`: Full CRUD for EventOrganizer exists but permissions aren't enforced elsewhere.

---

## 3) Codebase Map

**Primary components/modules:**
- `prisma/schema.prisma` - EventOrganizer, EventAttendee models
- `src/app/api/events/[eventId]/attendees/[attendeeId]/route.ts` - GET/PATCH for profile overrides
- `src/app/api/events/[eventId]/attendees/[attendeeId]/overrides/route.ts` - DELETE for reset
- `src/app/api/events/[eventId]/attendees/import/route.ts` - Attendee import (needs `addedById`)
- `src/components/m33t/AttendeeProfileEditModal.tsx` - Edit UI

**Shared dependencies:**
- `src/lib/m33t/index.ts` - `checkM33tAccess()` helper
- `src/lib/supabase/server.ts` - Auth context

**Data flow:**
1. User opens event dashboard
2. Clicks edit on attendee row
3. Modal fetches attendee via GET API
4. User makes changes, saves via PATCH API
5. API currently checks owner only, should check EventOrganizer

**Feature flags/config:** None currently

**Potential blast radius:**
- All EventAttendee API routes need authorization updates
- EventAttendee model needs new audit fields
- Profile edit modal may need conflict handling UI
- Public API unaffected (display-only)

---

## 4) Root Cause Analysis

N/A - This is a feature enhancement, not a bug fix.

**Current gap identified:** Co-organizers with `canCurate: true` permission cannot edit attendee profiles because API routes only check `event.userId === user.id`.

---

## 5) Research

### Research Summary

Comprehensive research was conducted on multi-user collaborative editing patterns from 30+ authoritative sources including Notion, Figma, Google Docs, and Prisma documentation.

### Potential Solutions

#### 1. Authorization: Resource-Specific RBAC

**Pattern:** Check EventOrganizer table with role hierarchy instead of just owner.

```typescript
async function requireEventAccess(eventId: string, userId: string, minPermission: 'view' | 'curate' | 'edit' | 'manage') {
  // Check if owner
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } });
  if (event) return { role: 'OWNER' };

  // Check if co-organizer with required permission
  const organizer = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId } }
  });

  if (!organizer) throw new Error('Access denied');

  // Check permission based on minPermission
  if (minPermission === 'curate' && !organizer.canCurate) throw new Error('Insufficient permissions');
  // ... etc

  return organizer;
}
```

**Pros:** Simple, uses existing EventOrganizer model, no schema changes
**Cons:** Need to update all API routes

#### 2. Audit Trail: Inline Fields (Recommended for MVP)

**Pattern:** Add `addedById`, `overridesEditedById` to EventAttendee.

```prisma
model EventAttendee {
  // ... existing fields

  // Audit fields
  addedById           String?
  addedBy             User?     @relation("AttendeeAddedBy", fields: [addedById], references: [id])
  overridesEditedById String?
  overridesEditedBy   User?     @relation("AttendeeOverridesEditedBy", fields: [overridesEditedById], references: [id])
}
```

**Pros:** Simple, fast queries, no joins, sufficient for "who added/edited"
**Cons:** Only tracks last editor, no full history

**Alternative - Separate Audit Log Table:**
```prisma
model AuditLog {
  id            String   @id @default(cuid())
  tableName     String
  recordId      String
  action        String   // CREATE, UPDATE, DELETE
  userId        String
  timestamp     DateTime @default(now())
  oldData       Json?
  newData       Json?
  changedFields String[]
}
```

**Pros:** Full history, queryable, compliance-ready
**Cons:** More complex, storage overhead, overkill for small teams

#### 3. Concurrent Edit Handling

**Option A: Last-Write-Wins (Current - No Change)**
- Simplest, current behavior
- Risk: Silent data loss when two people edit same attendee
- Acceptable for low-conflict scenarios

**Option B: Optimistic Locking with `updatedAt` (Simple)**
```typescript
const updated = await prisma.eventAttendee.update({
  where: {
    id: attendeeId,
    updatedAt: originalUpdatedAt  // Must match
  },
  data: { ... }
});
// If no match, Prisma throws - return 409 Conflict
```

**Pros:** No schema change needed, simple
**Cons:** Timestamp precision issues if two updates in same millisecond

**Option C: Optimistic Locking with `version` Field (Robust)**
```prisma
model EventAttendee {
  version Int @default(1)
}
```
```typescript
const updated = await prisma.eventAttendee.update({
  where: { id: attendeeId, version: currentVersion },
  data: { ..., version: { increment: 1 } }
});
```

**Pros:** Explicit versioning, no precision issues, industry standard
**Cons:** Schema change required, client must track version

#### 4. UI Conflict Handling

**Option A: Simple Error Toast**
- Show "Someone else edited this. Please refresh." toast
- User manually refreshes and re-applies changes
- Minimal UI work

**Option B: Conflict Resolution Modal**
- Show side-by-side diff of user's changes vs server state
- "Keep mine" / "Discard mine" / "Merge manually" options
- Better UX but more development effort

### Recommendation

**Phase 1 (Must Have - Before Production):**
1. **Fix authorization** - Add `requireEventAccess()` helper, update all attendee API routes to check EventOrganizer permissions
2. **Add audit fields** - `addedById` and `overridesEditedById` inline on EventAttendee
3. **Keep last-write-wins** for now - conflicts are rare with 2-5 organizers

**Phase 2 (Should Have - Soon After):**
4. **Add `version` field** for optimistic locking
5. **Add conflict error handling** - Return 409 Conflict, show toast in UI
6. **Display "Last edited by X"** in modal header

**Phase 3 (Nice to Have - Later):**
7. **Conflict resolution modal** with diff view
8. **Separate audit log table** if compliance needed
9. **"Currently viewing" indicator** via HTTP polling

**Rationale:** For 2-5 organizers working asynchronously, the likelihood of simultaneous edits to the same attendee is very low. Starting simple (fix auth + basic audit) unblocks production use. Add complexity only if users experience pain.

---

## 6) Clarification

Questions for user decision:

1. **Authorization scope:** Should co-organizers with `canCurate: true` be able to edit ALL attendee profile fields, or should some fields (like contact linking) require `canEdit: true`?
>> contact linking seems like its the only thing that might be an exceptoin here since each organizer would be linking to their specific set of contacts? Otherwise, yes, either organizer should be able to add all of the other profile fields, even if someone else added the invitee

2. **Audit granularity:** Is "last edited by" sufficient, or do you need full edit history (who changed what, when, with diffs)?
>> last edited by + timestamp of that edit please

3. **Conflict handling priority:** How important is preventing lost edits from simultaneous editing? Options:
   - A) Accept last-write-wins (simple, some risk of lost work)
   - B) Add version-based conflict detection with error toast (medium effort)
   - C) Full conflict resolution UI with diffs (most effort)
   >> option A for now

4. **"Added by" tracking:** Should we track who added each attendee? This would require updating the import flow and any manual add flows.
>> yes

5. **UI indicator preference:** When an attendee has been customized, should we show WHO customized it (avatar/name) in the dashboard, or just the "Customized" badge?
>> show who did it to be consistent with my other answers above

---

## 7) Implementation Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 | Authorization fix + basic audit fields | 1-2 days |
| Phase 2 | Version-based conflict detection | 1 day |
| Phase 3 | Conflict resolution UI | 2-3 days |
| Full audit log table | Separate table + middleware | 2-3 days |

**Recommended MVP:** Phase 1 only (1-2 days) - unblocks multi-organizer use without over-engineering.

---

## 8) Sources

### Authorization & Permissions
- [RBAC Models Explained](https://dev.to/hi_meghan/rbac-models-explained-4c7i)
- [Implementing Notion Authorization Model](https://permify.co/post/modeling-notion-access-management/)
- [Figma Guide to Sharing and Permissions](https://help.figma.com/hc/en-us/articles/1500007609322)

### Audit Trails
- [Guide to Building Audit Logs](https://medium.com/@tony.infisical/guide-to-building-audit-logs-for-application-software-b0083bb58604)
- [4 Common Designs of Audit Trail](https://medium.com/techtofreedom/4-common-designs-of-audit-trail-tracking-data-changes-in-databases-c894b7bb6d18)
- [Prisma Audit Trail Discussion](https://github.com/prisma/prisma/issues/1902)

### Concurrent Editing
- [Concurrency Control in Prisma](https://gokulmahe.medium.com/concurrency-control-in-node-js-and-prisma-managing-simultaneous-updates-56b9f17859e5)
- [Optimistic Concurrency with Prisma](https://github.com/prisma/prisma/issues/4988)
- [Last Write Wins vs CRDTs](https://dzone.com/articles/conflict-resolution-using-last-write-wins-vs-crdts)

### UI Patterns
- [Confluence Collaborative Editing](https://confluence.atlassian.com/doc/collaborative-editing-858771779.html)
- [Directus Collaborative Editing](https://directus.io/blog/collaborative-editing)
