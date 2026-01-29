# Fix Question Set Notifications & Multiple Sets Flow

## Status
Implemented

## Authors
Claude | 2026-01-29

## Overview
Implement actual email/SMS sending for question set notifications (currently stubbed with TODO comments) and verify the multiple question sets flow works correctly for invitees. This is a bugfix for incomplete functionality.

## Problem Statement

### Gap 1: Question Set Notifications (P0 - Critical)
When organizers click "Notify Attendees" on a question set (via the NotifyDialog or when publishing with `notifyAttendees: true`), the system:
- Correctly queries eligible attendees
- Returns success with count
- **But never actually sends any emails or SMS**

The code has explicit TODO comments at:
- `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts:108-110`
- `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts:98-103`

### Gap 2: Multiple Question Sets Flow (P1)
The invitee UI (`/rsvp/[token]/question-sets/page.tsx`) exists and appears to support multiple sets, but needs verification that:
- All published sets display in correct order
- Progress tracking works across sets
- Completion state is accurate

## Goals
- [x] Implement email/SMS sending in the question set notify endpoint
- [x] Implement email/SMS sending in the question set publish endpoint (when `notifyAttendees: true`)
- [x] Verify multiple question sets flow works end-to-end
- [x] Auto-redirect from RSVP confirmation to first incomplete question set
- [x] Add notification timestamp tracking to prevent duplicate notifications
- [x] Add delivery status tracking (success/failure per attendee in response)
- [x] Add retry logic for failed notifications

## Non-Goals
- Creating new notification templates beyond what's needed (reuse existing patterns)
- Adding notification scheduling/automation
- Changing the NotifyDialog UI (already works)
- Adding new filter options beyond existing (announce, all, not_started, in_progress)
- Performance optimizations for large attendee lists
- Response viewing/export for organizers (separate feature)

## Technical Approach

### Key Files to Modify
1. `src/lib/notifications/email.ts` - Add `generateQuestionSetEmail()` template
2. `src/lib/notifications/sms.ts` - Add `SMS_TEMPLATES.QUESTION_SET` template
3. `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts` - Replace TODO with actual sending + timestamp tracking + delivery status
4. `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts` - Replace TODO with actual sending + timestamp tracking + delivery status
5. `prisma/schema.prisma` - Add `questionSetNotifiedAt` field to EventAttendee (or per-set tracking)
6. `src/app/rsvp/[token]/page.tsx` - Add auto-redirect to question sets after RSVP confirmation

### Integration Points
- Uses existing `sendEmail()` and `sendSMS()` functions
- Uses existing `generateRSVPToken()` for URL generation
- Follows exact patterns from `/api/events/[eventId]/notify/route.ts`

## Implementation Details

### 1. Add Email Template (`src/lib/notifications/email.ts`)

```typescript
interface QuestionSetEmailParams {
  attendeeName: string;
  event: EventInfo;
  questionSetTitle: string;
  questionSetUrl: string;
  isNewSet: boolean; // true for publish, false for reminder
}

export function generateQuestionSetEmail(params: QuestionSetEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { attendeeName, event, questionSetTitle, questionSetUrl, isNewSet } = params;
  const formattedDate = formatEventDate(event.date);

  const subject = isNewSet
    ? `New questions for ${event.name}`
    : `Reminder: Complete "${questionSetTitle}" for ${event.name}`;

  // Follow existing template patterns (minimal HTML, clear CTA)
  const html = `...`; // Similar structure to generateInvitationEmail
  const text = `...`;

  return { subject, html, text };
}
```

### 2. Add SMS Template (`src/lib/notifications/sms.ts`)

```typescript
export const SMS_TEMPLATES = {
  // ... existing templates ...
  QUESTION_SET: (params: {
    eventName: string;
    questionSetTitle: string;
    url: string;
    isNewSet: boolean;
  }) => {
    const action = params.isNewSet ? 'New questions available' : 'Reminder';
    return `${action} for ${params.eventName}: "${params.questionSetTitle}". Complete here: ${params.url}`;
  },
};
```

### 3. Update Notify Route (`notify/route.ts`)

Replace lines 108-110:
```typescript
// TODO: Send actual notifications
const notificationsSent = attendeesToNotify.length;
console.log(`[QuestionSet Notify] Would notify...`);
```

With:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';
let successCount = 0;

for (const attendee of attendeesToNotify) {
  const token = generateRSVPToken(eventId, attendee.email, attendee.id, event.date);
  const questionSetUrl = `${baseUrl}/rsvp/${token}/question-sets`;

  // Send email
  if (attendee.email) {
    const emailContent = generateQuestionSetEmail({
      attendeeName: attendee.firstName,
      event: { name: event.name, date: event.date, ... },
      questionSetTitle: questionSet.title,
      questionSetUrl,
      isNewSet: filter === 'announce',
    });
    const emailResult = await sendEmail({
      to: attendee.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    if (emailResult.success) successCount++;
  }

  // Send SMS if phone available
  if (attendee.phone && isValidE164(attendee.phone)) {
    await sendSMS({
      to: attendee.phone,
      body: SMS_TEMPLATES.QUESTION_SET({
        eventName: event.name,
        questionSetTitle: questionSet.title,
        url: questionSetUrl,
        isNewSet: filter === 'announce',
      }),
    });
  }
}

return NextResponse.json({
  success: true,
  notificationsSent: successCount,
});
```

### 4. Update Publish Route (`publish/route.ts`)

Same pattern - replace the TODO block with actual notification sending. Can extract shared logic into a helper function to avoid duplication.

### 5. Notification Timestamp Tracking

Add field to track when attendee was last notified about question sets:

```prisma
model EventAttendee {
  // ... existing fields ...
  questionSetNotifiedAt DateTime? // Last time notified about question sets
}
```

In notify/publish routes, update this timestamp after successful notification:
```typescript
await prisma.eventAttendee.update({
  where: { id: attendee.id },
  data: { questionSetNotifiedAt: new Date() },
});
```

### 6. Delivery Status Tracking

Return detailed results in API response:
```typescript
interface NotificationResult {
  attendeeId: string;
  attendeeName: string;
  email: { success: boolean; error?: string };
  sms: { success: boolean; error?: string } | null;
}

return NextResponse.json({
  success: true,
  sent: successCount,
  failed: failedCount,
  results: results, // Array of NotificationResult
});
```

### 7. Retry Logic for Failed Notifications

Simple retry with exponential backoff for transient failures:
```typescript
async function sendWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}
```

### 8. Auto-Redirect from RSVP to Question Sets

In `src/app/rsvp/[token]/page.tsx`, after successful RSVP confirmation:
```typescript
// After RSVP is confirmed, check for incomplete question sets
const checkQuestionSets = async () => {
  const res = await fetch(`/api/rsvp/${token}/question-sets`);
  if (res.ok) {
    const data = await res.json();
    const hasIncomplete = data.questionSets.some(
      (s: QuestionSetSummary) => s.status !== 'completed'
    );
    if (hasIncomplete) {
      router.push(`/rsvp/${token}/question-sets`);
    }
  }
};
```

### 9. Verify Multiple Sets Flow

The existing `QuestionSetFlow` component already:
- Fetches all question sets via `/api/rsvp/[token]/question-sets`
- Displays them in order with status (not_started, in_progress, completed)
- Tracks `nextSetId` for sequential completion
- Shows progress bar across all sets
- Redirects to `/complete` when all done

**Verification needed:**
- Create event with 2+ question sets
- Publish sets in order
- Complete first set as invitee
- Verify second set becomes "Up Next"
- Complete all sets, verify redirect to completion page

## Testing Approach

### Manual Testing (Minimal)
1. **Notify Route**: Create event with published question set, click "Send Notifications" in NotifyDialog, verify email/SMS received
2. **Publish Route**: Create question set, publish with "Notify attendees" checked, verify email/SMS received
3. **Multiple Sets**: Create 2 question sets, complete them in sequence as invitee, verify flow works

### Edge Cases to Verify
- Attendee with email only (no phone) - should send email only
- Attendee with phone only (no email) - should send SMS only
- Empty eligible list - should return success with count 0

## Open Questions
None - implementation is straightforward, following existing patterns exactly.

---

## Future Improvements and Enhancements

**Everything below is OUT OF SCOPE for initial implementation.**

### Notification Enhancements
- Add "preview notification" feature before sending
- Per-question-set notification tracking (instead of single timestamp)

### Flow Enhancements
- Add estimated completion time per question set
- Add "save and continue later" functionality
- Add progress persistence across devices

### Organizer Features
- View individual attendee responses per question set
- Export responses to CSV
- Add completion deadline warnings
- Scheduled notification sending

### Performance
- Batch notification sending for large attendee lists
- Background job processing via Inngest for >50 attendees

---

## References
- Existing notify implementation: `src/app/api/events/[eventId]/notify/route.ts`
- Email templates: `src/lib/notifications/email.ts`
- SMS templates: `src/lib/notifications/sms.ts`
- Question set flow: `src/app/rsvp/[token]/question-sets/page.tsx`
- NotifyDialog: `src/components/events/question-sets/NotifyDialog.tsx`
