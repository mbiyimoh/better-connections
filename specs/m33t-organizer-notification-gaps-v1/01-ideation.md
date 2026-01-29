# M33T Organizer Notification Gaps - Ideation Document

**Created:** 2026-01-29
**Status:** Ideation
**Scope:** Address 6 identified gaps in organizer notification controls and invitee experience

---

## Problem Statement

After implementing the Invitee Experience V1, Multi-Phase Questionnaire V1, and Match Reveal Experience V1, a comprehensive gap analysis revealed 6 missing pieces that prevent organizers from having full control over event communications and invitees from having a complete experience.

---

## Gap Analysis Summary

### Gap 1: Match Reveal Notification Button (CRITICAL)

**What exists:**
- `POST /api/events/[eventId]/notify` with `type: 'match_reveal'` - fully functional
- Email template: `generateMatchRevealEmail()` in `src/lib/notifications/email.ts`
- SMS template: `SMS_TEMPLATES.matchReveal()` in `src/lib/notifications/sms.ts`
- Eligibility logic filters for CONFIRMED attendees with approved matches who haven't received reveal

**What's missing:**
- **NO UI button** on the matches page to trigger match reveal notifications
- Organizer must currently use API directly or have no way to send match reveals

**Impact:** HIGH - This is the most critical gap. Organizers cannot notify attendees about their matches through the UI.

---

### Gap 2: Manual Match Creation UI

**What exists:**
- `POST /api/events/[eventId]/matches` - fully functional manual match endpoint
- Schema validates `attendeeId`, `matchedWithId`, `position`, `curatorNotes`
- Manual matches are auto-approved with `status: 'APPROVED'`

**What's missing:**
- **NO UI dialog/button** on the matches page to add manual matches
- The match curation page shows existing matches but no "Add Match" action

**Impact:** MEDIUM - Organizers may need to manually pair specific attendees who should meet.

---

### Gap 3: Profile Suggestion Flow Completion

**What exists:**
- `QuestionSetFlow.tsx` - lists question sets with progress
- `QuestionSetQuestionnaire.tsx` - questionnaire answering flow
- `ProfileSuggestionReview.tsx` - AI suggestion review UI
- Complete API at `/api/rsvp/[token]/question-sets/[setId]/complete`
- Apply API at `/api/rsvp/[token]/question-sets/[setId]/apply-suggestions`

**What needs verification:**
- End-to-end flow from questionnaire → AI suggestions → apply to profile
- Suggestions JSON field properly stored and retrieved
- UI correctly displays suggestions and handles apply/skip

**Impact:** MEDIUM - Core multi-phase questionnaire value proposition.

---

### Gap 4: RSVP Reminder Notification Button

**What exists:**
- `POST /api/events/[eventId]/notify` with `type: 'rsvp_reminder'` - fully functional
- Email template uses invitation template
- SMS template: `SMS_TEMPLATES.rsvpReminder()`
- Eligibility logic filters for PENDING attendees who were invited but haven't responded

**What's missing:**
- **UI button** on event dashboard to send RSVP reminders
- Currently only "Send Invitations" button exists for pending attendees

**Current state:** Event dashboard page has "Send Invitations" button but no separate "Send Reminders" for those already invited.

**Impact:** MEDIUM - Organizers need to nudge non-responders.

---

### Gap 5: Event Reminder Notification

**What exists:**
- `POST /api/events/[eventId]/notify` with `type: 'event_reminder'` - fully functional
- Email template: `generateReminderEmail()` in `src/lib/notifications/email.ts`
- SMS template: `SMS_TEMPLATES.eventReminder()`
- Eligibility logic filters for CONFIRMED attendees who haven't received event reminder

**What's missing:**
- **NO UI button** anywhere to trigger event reminders
- This is typically sent day-of or day-before to remind confirmed attendees

**Impact:** LOW-MEDIUM - Nice to have for day-of communications.

---

### Gap 6: Question Set "Announce New Set" Notification

**What exists:**
- `NotifyDialog.tsx` for question sets - sends reminders about incomplete sets
- Can filter by: all who haven't completed, not started, in progress

**What's missing:**
- Option to announce a **newly published** question set to all attendees
- Current dialog assumes attendees already know about the set

**Impact:** LOW - Would be nice for announcing new question sets to all attendees.

---

## Proposed Solutions

### Solution 1: Match Reveal Notification Button

**Location:** Add to `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

**UI Design:**
```
┌──────────────────────────────────────────────────┐
│ Actions Bar (existing)                            │
│ [Filter Dropdown] [Approve All] [Generate] [⟲]   │
│                                                   │
│ NEW: Add "Notify Attendees" dropdown:            │
│ [▼ Notify Attendees]                             │
│   ├─ Send Match Reveals (X eligible)             │
│   ├─ Send Event Reminder (X eligible)            │
│   └─ Send RSVP Reminder (X eligible)             │
└──────────────────────────────────────────────────┘
```

**Implementation:**
1. Add state for notification dialog
2. Create `MatchRevealDialog` component with:
   - Preview of eligible attendees count
   - Confirmation before sending
   - Loading state during send
   - Success/error toast
3. Call `POST /api/events/${eventId}/notify` with `type: 'match_reveal'`

---

### Solution 2: Manual Match Creation UI

**Location:** Add to `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

**UI Design:**
```
┌──────────────────────────────────────────────────┐
│ Empty State (if no matches):                     │
│ [Generate Matches] [+ Add Manual Match]          │
│                                                   │
│ OR in Actions Bar:                               │
│ [Filter] [Approve All] [Generate] [+ Manual] [⟲] │
└──────────────────────────────────────────────────┘
```

**Dialog UI:**
```
┌──────────────────────────────────────────────────┐
│ Add Manual Match                                  │
├──────────────────────────────────────────────────┤
│ Select First Attendee: [Dropdown ▼]              │
│ Select Second Attendee: [Dropdown ▼]             │
│                                                   │
│ Curator Notes (optional):                        │
│ ┌──────────────────────────────────────────────┐ │
│ │ These two should meet because...             │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ ☑ Create reciprocal match (A→B and B→A)         │
│                                                   │
│ [Cancel] [Add Match]                             │
└──────────────────────────────────────────────────┘
```

**Implementation:**
1. Create `ManualMatchDialog` component
2. Fetch attendee list for dropdowns
3. POST to `/api/events/${eventId}/matches`
4. If reciprocal checked, make two calls

---

### Solution 3: Profile Suggestion Flow - E2E Verification

**Verification checklist:**
1. Complete a question set with AI-enabled questions
2. Verify suggestions are generated on complete
3. Verify suggestions are stored in `QuestionSetResponse.suggestions`
4. Verify `ProfileSuggestionReview` displays them correctly
5. Test apply flow updates attendee profile
6. Test skip flow returns to list

**No new code needed** - just verification that existing implementation works.

---

### Solution 4: RSVP Reminder Button

**Location:** Add to event dashboard Quick Actions

**UI Design:**
```
┌──────────────────────────────────────────────────┐
│ Quick Actions                                     │
├──────────────────────────────────────────────────┤
│ [Edit Event] [Send Invitations (X)]              │
│ [Send RSVP Reminder (X)] [Reorder] [Matches]     │
└──────────────────────────────────────────────────┘
```

**Implementation:**
1. Add button to event dashboard page
2. Calculate eligible count (PENDING + inviteSentAt != null + rsvpReminderSentAt == null)
3. Show confirmation dialog
4. Call `POST /api/events/${eventId}/notify` with `type: 'rsvp_reminder'`

---

### Solution 5: Event Reminder Button

**Location:** Add to event dashboard Quick Actions or matches page dropdown

**Implementation:**
1. Add button with eligible count (CONFIRMED + eventReminderSentAt == null)
2. Show confirmation dialog
3. Call `POST /api/events/${eventId}/notify` with `type: 'event_reminder'`

---

### Solution 6: Question Set Announce Option

**Location:** Modify `NotifyDialog.tsx` in question-sets

**UI Design:**
Add fourth option:
```
Who should receive notifications?
○ All who haven't completed (X attendees)
○ Not started (X attendees)
○ In progress (X attendees)
● Announce to all (X attendees) ← NEW
```

**Implementation:**
1. Add `'announce'` to FilterOption type
2. Calculate count as all attendees
3. API call sends to everyone regardless of completion status

---

## Implementation Priority

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Gap 1: Match Reveal Button | Small | High |
| P1 | Gap 2: Manual Match Dialog | Medium | Medium |
| P1 | Gap 3: E2E Verification | Small | Medium |
| P2 | Gap 4: RSVP Reminder Button | Small | Medium |
| P2 | Gap 5: Event Reminder Button | Small | Low-Med |
| P3 | Gap 6: Announce New Set | Small | Low |

---

## Recommended Approach

### Phase 1: Critical Path (Gaps 1, 3)
1. Add Match Reveal notification button to matches page
2. Verify profile suggestion flow works end-to-end
3. Test complete organizer → invitee flow

### Phase 2: Notification Controls (Gaps 4, 5)
1. Add RSVP Reminder button to event dashboard
2. Add Event Reminder button (either dashboard or matches page)
3. Consider unified "Notifications" dropdown to consolidate

### Phase 3: Nice to Have (Gaps 2, 6)
1. Add Manual Match creation dialog
2. Add "Announce to all" option for question sets

---

## Technical Notes

### Existing API Capabilities
All notification types are already supported by `POST /api/events/[eventId]/notify`:
- `invitation` - Initial invite
- `rsvp_reminder` - Reminder for non-responders
- `match_reveal` - Notify about matches
- `event_reminder` - Day-of reminder

### Eligibility Logic (already implemented)
```typescript
switch (type) {
  case 'invitation':     // inviteSentAt == null
  case 'rsvp_reminder':  // PENDING + invited + not reminded
  case 'match_reveal':   // CONFIRMED + has matches + not revealed
  case 'event_reminder': // CONFIRMED + not reminded
}
```

### Timestamp Tracking (already implemented)
```typescript
// EventAttendee model
inviteSentAt: DateTime?
rsvpReminderSentAt: DateTime?
matchRevealSentAt: DateTime?
eventReminderSentAt: DateTime?
```

---

## Questions to Resolve

1. Should notification buttons show confirmation dialogs before sending?
   - **Recommendation:** Yes, with preview of recipient count
   >> yes

2. Should match reveal notification be on matches page or event dashboard?
   - **Recommendation:** Matches page (context-appropriate)
   >> matches page

3. Should all notification buttons be consolidated into one dropdown?
   - **Recommendation:** No, keep context-specific placement
   >> no, keep context-specific placement

4. For manual matches, should reciprocal be default?
   - **Recommendation:** Yes, most use cases expect bidirectional matches
   >> yes

---

## Success Criteria

1. Organizer can send match reveal notifications from UI
2. Organizer can manually create matches between specific attendees
3. Organizer can send RSVP reminders to non-responders
4. Organizer can send event reminders to confirmed attendees
5. Profile suggestion flow works end-to-end (verified)
6. All notification buttons show accurate eligible counts

---

## Next Steps

1. Convert this ideation to specification
2. Implement Phase 1 (Critical Path)
3. Test complete flow with real data
4. Implement remaining phases
