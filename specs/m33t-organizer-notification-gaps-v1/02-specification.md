# M33T Organizer Notification Gaps - Specification

**Created:** 2026-01-29
**Status:** Specification
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## Overview

This specification addresses 6 gaps in organizer notification controls and invitee experience for the M33T event management system. All gaps involve adding UI controls to trigger existing API functionality.

### User Decisions (from ideation)
- Notification buttons will show confirmation dialogs with recipient count preview
- Match reveal notification will be on the matches page
- Notification buttons will be context-specific (not consolidated)
- Manual matches will create reciprocal matches by default

---

## Phase 1: Critical Path

### 1.1 Match Reveal Notification Button

**Location:** `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

**New Component:** `src/components/m33t/MatchRevealDialog.tsx`

#### UI Placement
Add to the Actions Bar, after "Approve All" button:

```tsx
<Button
  variant="outline"
  onClick={() => setShowRevealDialog(true)}
  disabled={eligibleForReveal === 0}
>
  <Send className="w-4 h-4 mr-2" />
  Send Match Reveals ({eligibleForReveal})
</Button>
```

#### Dialog Component

```tsx
interface MatchRevealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}
```

**Dialog Content:**
- Title: "Send Match Reveal Notifications"
- Description: "Notify attendees about their curated matches"
- Preview: "{X} attendees will receive email and SMS notifications"
- Note: "Only confirmed attendees with approved matches who haven't been notified yet"
- Actions: [Cancel] [Send Notifications]

#### Eligibility Calculation
Fetch from API or calculate client-side:
```typescript
// Eligible = CONFIRMED + has approved matches + matchRevealSentAt == null
const eligibleForReveal = attendees.filter(a =>
  a.rsvpStatus === 'CONFIRMED' &&
  a.hasApprovedMatches &&
  !a.matchRevealSentAt
).length;
```

#### API Call
```typescript
await fetch(`/api/events/${eventId}/notify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'match_reveal' }),
});
```

---

### 1.2 Manual Match Creation

**Location:** `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

**New Component:** `src/components/m33t/ManualMatchDialog.tsx`

#### UI Placement
Add button in Actions Bar:

```tsx
<Button
  variant="outline"
  onClick={() => setShowManualMatchDialog(true)}
>
  <UserPlus className="w-4 h-4 mr-2" />
  Add Match
</Button>
```

#### Dialog Component

```tsx
interface ManualMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendees: AttendeeOption[];
  onSuccess: () => void;
}

interface AttendeeOption {
  id: string;
  name: string;
  email: string | null;
}
```

**Dialog Content:**
- Title: "Add Manual Match"
- Form fields:
  - "First Attendee" - searchable dropdown
  - "Second Attendee" - searchable dropdown (excludes selected first)
  - "Curator Notes" - optional textarea
  - "Create reciprocal match" - checkbox (default: checked)
- Validation: Both attendees required, can't match self
- Actions: [Cancel] [Add Match]

#### API Calls
```typescript
// Primary match: A → B
await fetch(`/api/events/${eventId}/matches`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attendeeId: firstAttendeeId,
    matchedWithId: secondAttendeeId,
    curatorNotes: notes,
  }),
});

// Reciprocal match: B → A (if checkbox checked)
if (createReciprocal) {
  await fetch(`/api/events/${eventId}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attendeeId: secondAttendeeId,
      matchedWithId: firstAttendeeId,
      curatorNotes: notes,
    }),
  });
}
```

---

### 1.3 Profile Suggestion Flow Verification

**No new code required.** Verification checklist:

1. [ ] Invitee completes a question set with responses
2. [ ] `/api/rsvp/[token]/question-sets/[setId]/complete` returns suggestions
3. [ ] Suggestions are stored in `QuestionSetResponse.suggestions` JSON field
4. [ ] `ProfileSuggestionReview` component displays suggestions correctly
5. [ ] Apply flow updates attendee profile via `/api/rsvp/[token]/question-sets/[setId]/apply-suggestions`
6. [ ] Skip flow returns to question set list
7. [ ] Profile changes visible in organizer's attendee list

---

## Phase 2: Notification Controls

### 2.1 RSVP Reminder Button

**Location:** `src/app/(dashboard)/events/[eventId]/page.tsx` (Quick Actions section)

**New Component:** `src/components/m33t/RsvpReminderDialog.tsx`

#### UI Placement
Add after "Send Invitations" button:

```tsx
<Button
  variant="outline"
  onClick={() => setShowReminderDialog(true)}
  disabled={eligibleForReminder === 0}
>
  <Bell className="w-4 h-4 mr-2" />
  Send RSVP Reminder ({eligibleForReminder})
</Button>
```

#### Eligibility Calculation
```typescript
// Eligible = PENDING + inviteSentAt != null + rsvpReminderSentAt == null
const eligibleForReminder = attendees.filter(a =>
  a.rsvpStatus === 'PENDING' &&
  a.inviteSentAt &&
  !a.rsvpReminderSentAt
).length;
```

#### Dialog Content
- Title: "Send RSVP Reminders"
- Description: "Remind attendees who haven't responded to their invitation"
- Preview: "{X} attendees will receive a reminder"
- Actions: [Cancel] [Send Reminders]

#### API Call
```typescript
await fetch(`/api/events/${eventId}/notify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'rsvp_reminder' }),
});
```

---

### 2.2 Event Reminder Button

**Location:** `src/app/(dashboard)/events/[eventId]/page.tsx` (Quick Actions section)

**New Component:** `src/components/m33t/EventReminderDialog.tsx`

#### UI Placement
Add to Quick Actions:

```tsx
<Button
  variant="outline"
  onClick={() => setShowEventReminderDialog(true)}
  disabled={eligibleForEventReminder === 0}
>
  <CalendarClock className="w-4 h-4 mr-2" />
  Send Event Reminder ({eligibleForEventReminder})
</Button>
```

#### Eligibility Calculation
```typescript
// Eligible = CONFIRMED + eventReminderSentAt == null
const eligibleForEventReminder = attendees.filter(a =>
  a.rsvpStatus === 'CONFIRMED' &&
  !a.eventReminderSentAt
).length;
```

#### Dialog Content
- Title: "Send Event Reminders"
- Description: "Remind confirmed attendees about the upcoming event"
- Preview: "{X} attendees will receive a reminder with event details"
- Actions: [Cancel] [Send Reminders]

#### API Call
```typescript
await fetch(`/api/events/${eventId}/notify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'event_reminder' }),
});
```

---

## Phase 3: Enhancements

### 3.1 Question Set "Announce" Option

**Location:** `src/components/events/question-sets/NotifyDialog.tsx`

#### Changes

1. Update `FilterOption` type:
```typescript
type FilterOption = 'all' | 'not_started' | 'in_progress' | 'announce';
```

2. Add new radio option:
```tsx
<div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
  <RadioGroupItem value="announce" id="announce" />
  <Label htmlFor="announce" className="flex-1 cursor-pointer">
    <div className="font-medium">Announce to all attendees</div>
    <div className="text-sm text-text-secondary">
      {total} attendees (including completed)
    </div>
  </Label>
</div>
```

3. Update count calculation:
```typescript
const getCount = (f: FilterOption) => {
  switch (f) {
    case 'all': return total - completed;
    case 'not_started': return notStarted;
    case 'in_progress': return inProgress;
    case 'announce': return total;  // All attendees
  }
};
```

4. API call passes filter to backend (backend needs to handle `'announce'`):
```typescript
body: JSON.stringify({ filter, includeCompleted: filter === 'announce' }),
```

---

## File Structure

```
src/components/m33t/
├── MatchRevealDialog.tsx      (NEW - Phase 1)
├── ManualMatchDialog.tsx      (NEW - Phase 1)
├── RsvpReminderDialog.tsx     (NEW - Phase 2)
├── EventReminderDialog.tsx    (NEW - Phase 2)
└── index.ts                   (UPDATE - exports)

src/app/(dashboard)/events/[eventId]/
├── page.tsx                   (UPDATE - add reminder buttons)
└── matches/page.tsx           (UPDATE - add reveal + manual match buttons)

src/components/events/question-sets/
└── NotifyDialog.tsx           (UPDATE - add announce option)
```

---

## Data Requirements

### Existing API Endpoints (no changes needed)
- `POST /api/events/[eventId]/notify` - handles all notification types
- `POST /api/events/[eventId]/matches` - creates manual matches
- `GET /api/events/[eventId]` - returns attendee data with notification timestamps

### Required Attendee Data
The event detail API already returns attendees with:
- `rsvpStatus`
- `inviteSentAt`
- `rsvpReminderSentAt`
- `matchRevealSentAt`
- `eventReminderSentAt`

### Match Count for Reveal Eligibility
Need to fetch or include:
- Count of approved matches per attendee
- Or add to event detail response

---

## Implementation Tasks

### Phase 1 (Critical)
- [ ] Create `MatchRevealDialog` component
- [ ] Create `ManualMatchDialog` component
- [ ] Add buttons to matches page
- [ ] Add state management for dialogs
- [ ] Fetch/calculate eligibility counts
- [ ] Test match reveal flow
- [ ] Test manual match creation (with reciprocal)
- [ ] Verify profile suggestion E2E flow

### Phase 2 (Notification Controls)
- [ ] Create `RsvpReminderDialog` component
- [ ] Create `EventReminderDialog` component
- [ ] Add buttons to event dashboard
- [ ] Add eligibility data to event fetch
- [ ] Test RSVP reminder flow
- [ ] Test event reminder flow

### Phase 3 (Enhancements)
- [ ] Update `NotifyDialog` with announce option
- [ ] Update question set notify API if needed
- [ ] Test announce flow

---

## Success Criteria

1. **Match Reveal:** Organizer can click "Send Match Reveals" on matches page, see confirmation with count, and successfully notify attendees
2. **Manual Match:** Organizer can add manual match between any two attendees with optional notes, reciprocal by default
3. **RSVP Reminder:** Organizer can send reminders to non-responders from event dashboard
4. **Event Reminder:** Organizer can send day-of reminders to confirmed attendees
5. **Profile Suggestions:** Invitee completes questionnaire, reviews AI suggestions, applies selected ones to profile
6. **Question Set Announce:** Organizer can announce new question set to all attendees

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| API already handles all types | Low risk - just adding UI |
| Eligibility calculation mismatch | Use same logic as API |
| Duplicate notifications | API tracks timestamps, prevents duplicates |
| Manual match duplicates | API returns 409 if match exists |

---

## Testing Plan

### Manual Testing
1. Create event with 3+ attendees
2. Generate matches
3. Approve some matches
4. Test match reveal notification
5. Test manual match creation
6. Test RSVP reminder
7. Test event reminder
8. Complete questionnaire as invitee
9. Review and apply suggestions

### E2E Tests (optional)
- Match reveal button disabled when no eligible attendees
- Manual match creates reciprocal when checked
- Notification counts update after sending
