# Task Breakdown: M33T Organizer Notification Gaps

**Generated:** 2026-01-29
**Source:** specs/m33t-organizer-notification-gaps-v1/02-specification.md
**Last Decompose:** 2026-01-29

---

## Overview

This task breakdown addresses 6 gaps in organizer notification controls. All work is frontend-only since APIs already exist.

**Total Tasks:** 8
**Phases:** 3
**Estimated Effort:** Small-Medium (UI components + page integrations)

---

## Phase 1: Critical Path (4 tasks)

### Task 1.1: Create MatchRevealDialog Component

**Description:** Create confirmation dialog for sending match reveal notifications
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Location:** `src/components/m33t/MatchRevealDialog.tsx`

**Implementation:**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface MatchRevealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

export function MatchRevealDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: MatchRevealDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'match_reveal' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send notifications');
      }

      const data = await res.json();
      toast.success(`Sent match reveals to ${data.sent} attendees`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Match Reveal Notifications</DialogTitle>
          <DialogDescription>
            Notify attendees about their curated matches
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-text-primary mb-2">
            <span className="font-semibold">{eligibleCount}</span> attendees will receive email and SMS notifications.
          </p>
          <p className="text-sm text-text-secondary">
            Only confirmed attendees with approved matches who haven't been notified yet.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || eligibleCount === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Notifications
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Dialog opens/closes correctly
- [ ] Shows eligible count in message
- [ ] Loading state during send
- [ ] Success toast shows count sent
- [ ] Error handling with toast
- [ ] Calls onSuccess callback after send

---

### Task 1.2: Create ManualMatchDialog Component

**Description:** Create dialog for manually adding matches between attendees
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**Location:** `src/components/m33t/ManualMatchDialog.tsx`

**Implementation:**

```tsx
'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface AttendeeOption {
  id: string;
  name: string;
  email: string | null;
}

interface ManualMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendees: AttendeeOption[];
  onSuccess: () => void;
}

export function ManualMatchDialog({
  isOpen,
  onClose,
  eventId,
  attendees,
  onSuccess,
}: ManualMatchDialogProps) {
  const [firstAttendeeId, setFirstAttendeeId] = useState<string>('');
  const [secondAttendeeId, setSecondAttendeeId] = useState<string>('');
  const [curatorNotes, setCuratorNotes] = useState('');
  const [createReciprocal, setCreateReciprocal] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Filter out first attendee from second dropdown
  const secondAttendeeOptions = useMemo(
    () => attendees.filter((a) => a.id !== firstAttendeeId),
    [attendees, firstAttendeeId]
  );

  const resetForm = () => {
    setFirstAttendeeId('');
    setSecondAttendeeId('');
    setCuratorNotes('');
    setCreateReciprocal(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!firstAttendeeId || !secondAttendeeId) {
      toast.error('Please select both attendees');
      return;
    }

    setIsCreating(true);
    try {
      // Create primary match: A → B
      const res1 = await fetch(`/api/events/${eventId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: firstAttendeeId,
          matchedWithId: secondAttendeeId,
          curatorNotes: curatorNotes || undefined,
        }),
      });

      if (!res1.ok) {
        const error = await res1.json();
        throw new Error(error.error || 'Failed to create match');
      }

      // Create reciprocal match: B → A (if checkbox checked)
      if (createReciprocal) {
        const res2 = await fetch(`/api/events/${eventId}/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendeeId: secondAttendeeId,
            matchedWithId: firstAttendeeId,
            curatorNotes: curatorNotes || undefined,
          }),
        });

        // 409 is acceptable if reciprocal already exists
        if (!res2.ok && res2.status !== 409) {
          const error = await res2.json();
          throw new Error(error.error || 'Failed to create reciprocal match');
        }
      }

      toast.success(createReciprocal ? 'Created mutual match!' : 'Match created!');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create match');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Match</DialogTitle>
          <DialogDescription>
            Create a match between two attendees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="first-attendee">First Attendee</Label>
            <Select value={firstAttendeeId} onValueChange={setFirstAttendeeId}>
              <SelectTrigger id="first-attendee">
                <SelectValue placeholder="Select attendee..." />
              </SelectTrigger>
              <SelectContent>
                {attendees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.email && `(${a.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="second-attendee">Second Attendee</Label>
            <Select
              value={secondAttendeeId}
              onValueChange={setSecondAttendeeId}
              disabled={!firstAttendeeId}
            >
              <SelectTrigger id="second-attendee">
                <SelectValue placeholder="Select attendee..." />
              </SelectTrigger>
              <SelectContent>
                {secondAttendeeOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.email && `(${a.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curator-notes">Curator Notes (optional)</Label>
            <Textarea
              id="curator-notes"
              placeholder="Why should these two meet?"
              value={curatorNotes}
              onChange={(e) => setCuratorNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reciprocal"
              checked={createReciprocal}
              onCheckedChange={(checked) => setCreateReciprocal(checked === true)}
            />
            <Label htmlFor="reciprocal" className="text-sm cursor-pointer">
              Create reciprocal match (both see each other)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !firstAttendeeId || !secondAttendeeId}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Match
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Both dropdowns populated with attendees
- [ ] First selection filters second dropdown
- [ ] Curator notes optional textarea works
- [ ] Reciprocal checkbox defaults to checked
- [ ] Creates A→B match on submit
- [ ] Creates B→A match if reciprocal checked
- [ ] Handles 409 duplicate gracefully
- [ ] Form resets on close
- [ ] Success/error toasts

---

### Task 1.3: Integrate Dialogs into Matches Page

**Description:** Add Match Reveal and Manual Match buttons to matches page
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2

**Location:** `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

**Changes Required:**

1. Import new components and icons
2. Add state for dialog visibility
3. Fetch attendee list for manual match dialog
4. Calculate eligibility for match reveal
5. Add buttons to actions bar

**Implementation details:**

Add imports:
```tsx
import { MatchRevealDialog } from '@/components/m33t/MatchRevealDialog';
import { ManualMatchDialog } from '@/components/m33t/ManualMatchDialog';
import { Send, UserPlus } from 'lucide-react';
```

Add state:
```tsx
const [showRevealDialog, setShowRevealDialog] = useState(false);
const [showManualMatchDialog, setShowManualMatchDialog] = useState(false);
```

Add eligibility calculation:
```tsx
// Need to fetch attendees with notification timestamps and match counts
// This requires the event detail API update (already done)
const [attendees, setAttendees] = useState<AttendeeData[]>([]);

// Calculate eligible for reveal
const eligibleForReveal = attendees.filter(a =>
  a.rsvpStatus === 'CONFIRMED' &&
  a._count?.matches > 0 &&
  !a.matchRevealSentAt
).length;

// Prepare attendee options for manual match
const attendeeOptions = attendees.map(a => ({
  id: a.id,
  name: `${a.firstName} ${a.lastName || ''}`.trim(),
  email: a.email,
}));
```

Add buttons to actions bar (after existing buttons):
```tsx
<Button
  variant="outline"
  onClick={() => setShowManualMatchDialog(true)}
>
  <UserPlus className="w-4 h-4 mr-2" />
  Add Match
</Button>

<Button
  variant="outline"
  onClick={() => setShowRevealDialog(true)}
  disabled={eligibleForReveal === 0}
>
  <Send className="w-4 h-4 mr-2" />
  Send Match Reveals ({eligibleForReveal})
</Button>
```

Add dialogs at bottom:
```tsx
<MatchRevealDialog
  isOpen={showRevealDialog}
  onClose={() => setShowRevealDialog(false)}
  eventId={eventId}
  eligibleCount={eligibleForReveal}
  onSuccess={fetchData}
/>

<ManualMatchDialog
  isOpen={showManualMatchDialog}
  onClose={() => setShowManualMatchDialog(false)}
  eventId={eventId}
  attendees={attendeeOptions}
  onSuccess={fetchData}
/>
```

**Acceptance Criteria:**
- [ ] "Add Match" button visible in actions bar
- [ ] "Send Match Reveals" button shows count
- [ ] Reveal button disabled when count is 0
- [ ] Clicking buttons opens correct dialogs
- [ ] Data refreshes after successful operations
- [ ] Attendee list populated for manual match

---

### Task 1.4: Verify Profile Suggestion E2E Flow

**Description:** Manually verify the profile suggestion flow works end-to-end
**Size:** Small
**Priority:** High
**Dependencies:** None (verification only)

**Verification Steps:**

1. As organizer: Create event with question set, publish it
2. As invitee: Access RSVP via token
3. Navigate to question sets page
4. Complete a question set with meaningful answers
5. Verify AI suggestions appear after completion
6. Select some suggestions, click Apply
7. Verify profile updated
8. As organizer: Check attendee profile shows changes

**Acceptance Criteria:**
- [ ] Question set completion triggers AI suggestion generation
- [ ] Suggestions display in ProfileSuggestionReview component
- [ ] Apply button updates attendee profile
- [ ] Skip returns to list without changes
- [ ] Profile changes visible to organizer

---

## Phase 2: Notification Controls (2 tasks)

### Task 2.1: Create Notification Dialogs for Event Dashboard

**Description:** Create RSVP Reminder and Event Reminder dialogs
**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 2.2

**Location:** Create two components:
- `src/components/m33t/RsvpReminderDialog.tsx`
- `src/components/m33t/EventReminderDialog.tsx`

**RsvpReminderDialog Implementation:**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface RsvpReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

export function RsvpReminderDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: RsvpReminderDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rsvp_reminder' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send reminders');
      }

      const data = await res.json();
      toast.success(`Sent RSVP reminders to ${data.sent} attendees`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send RSVP Reminders</DialogTitle>
          <DialogDescription>
            Remind attendees who haven't responded to their invitation
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-text-primary">
            <span className="font-semibold">{eligibleCount}</span> attendees will receive a reminder.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || eligibleCount === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**EventReminderDialog Implementation:**

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface EventReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number;
  onSuccess: () => void;
}

export function EventReminderDialog({
  isOpen,
  onClose,
  eventId,
  eligibleCount,
  onSuccess,
}: EventReminderDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event_reminder' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send reminders');
      }

      const data = await res.json();
      toast.success(`Sent event reminders to ${data.sent} attendees`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Event Reminders</DialogTitle>
          <DialogDescription>
            Remind confirmed attendees about the upcoming event
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-text-primary">
            <span className="font-semibold">{eligibleCount}</span> attendees will receive a reminder with event details.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || eligibleCount === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Both dialogs show correct titles/descriptions
- [ ] Loading state during send
- [ ] Success toast with count
- [ ] Error handling
- [ ] Buttons disabled when count is 0

---

### Task 2.2: Integrate Reminder Buttons into Event Dashboard

**Description:** Add RSVP and Event reminder buttons to event dashboard Quick Actions
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1

**Location:** `src/app/(dashboard)/events/[eventId]/page.tsx`

**Changes Required:**

1. Import new dialog components
2. Add state for dialog visibility
3. Calculate eligibility counts from attendee data
4. Add buttons to Quick Actions section

**Implementation:**

Add imports:
```tsx
import { RsvpReminderDialog } from '@/components/m33t/RsvpReminderDialog';
import { EventReminderDialog } from '@/components/m33t/EventReminderDialog';
import { Bell, CalendarClock } from 'lucide-react';
```

Add state:
```tsx
const [showRsvpReminderDialog, setShowRsvpReminderDialog] = useState(false);
const [showEventReminderDialog, setShowEventReminderDialog] = useState(false);
```

Calculate eligibility (use attendee data already fetched):
```tsx
// RSVP Reminder: PENDING + inviteSentAt exists + rsvpReminderSentAt null
const eligibleForRsvpReminder = event.attendees.filter(a =>
  a.rsvpStatus === 'PENDING' &&
  a.inviteSentAt &&
  !a.rsvpReminderSentAt
).length;

// Event Reminder: CONFIRMED + eventReminderSentAt null
const eligibleForEventReminder = event.attendees.filter(a =>
  a.rsvpStatus === 'CONFIRMED' &&
  !a.eventReminderSentAt
).length;
```

Add buttons to Quick Actions (after existing Send Invitations button):
```tsx
<Button
  variant="outline"
  onClick={() => setShowRsvpReminderDialog(true)}
  disabled={eligibleForRsvpReminder === 0}
>
  <Bell className="w-4 h-4 mr-2" />
  Send RSVP Reminder ({eligibleForRsvpReminder})
</Button>

<Button
  variant="outline"
  onClick={() => setShowEventReminderDialog(true)}
  disabled={eligibleForEventReminder === 0}
>
  <CalendarClock className="w-4 h-4 mr-2" />
  Send Event Reminder ({eligibleForEventReminder})
</Button>
```

Add dialogs at bottom:
```tsx
<RsvpReminderDialog
  isOpen={showRsvpReminderDialog}
  onClose={() => setShowRsvpReminderDialog(false)}
  eventId={eventId}
  eligibleCount={eligibleForRsvpReminder}
  onSuccess={fetchEvent}
/>

<EventReminderDialog
  isOpen={showEventReminderDialog}
  onClose={() => setShowEventReminderDialog(false)}
  eventId={eventId}
  eligibleCount={eligibleForEventReminder}
  onSuccess={fetchEvent}
/>
```

**Acceptance Criteria:**
- [ ] Both buttons visible in Quick Actions
- [ ] Correct counts displayed
- [ ] Buttons disabled when count is 0
- [ ] Dialogs open on click
- [ ] Data refreshes after send

---

## Phase 3: Enhancements (1 task)

### Task 3.1: Add "Announce" Option to Question Set Notify

**Description:** Add option to announce question set to all attendees including those who completed
**Size:** Small
**Priority:** Low
**Dependencies:** None

**Location:** `src/components/events/question-sets/NotifyDialog.tsx`

**Changes Required:**

1. Update FilterOption type
2. Add new radio button option
3. Update count calculation
4. Update API call to pass includeCompleted flag

**Implementation:**

Update type:
```tsx
type FilterOption = 'all' | 'not_started' | 'in_progress' | 'announce';
```

Update getCount:
```tsx
const getCount = (f: FilterOption) => {
  switch (f) {
    case 'all':
      return total - completed;
    case 'not_started':
      return notStarted;
    case 'in_progress':
      return inProgress;
    case 'announce':
      return total;
  }
};
```

Add new radio option (after in_progress option):
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

Update API call body:
```tsx
body: JSON.stringify({
  filter,
  includeCompleted: filter === 'announce',
}),
```

**Note:** Backend may need update to handle `includeCompleted` flag. If not supported, this task includes updating the question set notify API.

**Acceptance Criteria:**
- [ ] Fourth radio option visible
- [ ] Shows total count (including completed)
- [ ] Sends to all attendees when selected
- [ ] Backend handles includeCompleted flag

---

## Export Updates

### Task (included in Phase 1): Update component exports

**Location:** `src/components/m33t/index.ts`

Add exports:
```tsx
export { MatchRevealDialog } from './MatchRevealDialog';
export { ManualMatchDialog } from './ManualMatchDialog';
export { RsvpReminderDialog } from './RsvpReminderDialog';
export { EventReminderDialog } from './EventReminderDialog';
```

---

## Summary

| Phase | Tasks | Priority | Status |
|-------|-------|----------|--------|
| Phase 1 | 4 tasks | High | Pending |
| Phase 2 | 2 tasks | Medium | Pending |
| Phase 3 | 1 task | Low | Pending |
| **Total** | **7 implementation + 1 verification** | | |

**Parallel Execution Opportunities:**
- Task 1.1 and 1.2 can run in parallel
- Task 2.1 can start once Phase 1 is done
- Task 3.1 is independent

**Critical Path:**
1. Tasks 1.1, 1.2 (parallel)
2. Task 1.3 (depends on 1.1, 1.2)
3. Task 1.4 (verification, can run anytime)
4. Tasks 2.1, 2.2 (sequential)
5. Task 3.1 (independent)
