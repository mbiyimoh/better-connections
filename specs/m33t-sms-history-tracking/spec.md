# SMS History Tracking - Specification

## Overview

Add SMS delivery status tracking and history viewing for M33T event notifications. Event organizers will be able to see all texts sent to any attendee with definitive delivered/failed status, and retry failed messages.

### Goals

1. **Visibility**: Organizers see delivery status for every SMS sent
2. **Debugging**: When texts fail, show specific error and actionable message
3. **Reliability**: Catch delivery failures and enable manual retry
4. **Audit Trail**: Complete history of all SMS communications per attendee

### Non-Goals

- Automated retry logic (manual retry only for MVP)
- SMS analytics/reporting dashboards (future)
- Attendee SMS opt-out preferences (separate feature)
- Two-way SMS conversations

---

## Database Schema

### New Model: SMSMessage

```prisma
model SMSMessage {
  id                  String    @id @default(cuid())

  // Twilio identifiers
  messageSid          String    @unique
  accountSid          String?
  messagingServiceSid String?

  // Message content
  toPhone             String
  fromPhone           String
  body                String?
  numSegments         Int       @default(1)

  // Status tracking
  status              String    // queued, sent, delivered, failed, undelivered
  errorCode           String?
  errorMessage        String?
  rawPayload          Json?     // Full webhook payload for debugging

  // Timestamps
  createdAt           DateTime  @default(now())
  sentAt              DateTime?
  deliveredAt         DateTime?
  statusUpdatedAt     DateTime  @updatedAt

  // Relations
  eventId             String
  event               Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  attendeeId          String
  attendee            EventAttendee @relation(fields: [attendeeId], references: [id], onDelete: Cascade)

  // Message context
  notificationType    String    // invitation, rsvp_reminder, match_reveal, event_reminder, new_rsvps, question_set

  @@index([messageSid])
  @@index([attendeeId, createdAt])
  @@index([eventId, createdAt])
  @@index([status, createdAt])
  @@index([eventId, status])
}
```

### Update Event Model

```prisma
model Event {
  // ... existing fields ...
  smsMessages         SMSMessage[]
}
```

### Update EventAttendee Model

```prisma
model EventAttendee {
  // ... existing fields ...
  smsMessages         SMSMessage[]
}
```

---

## API Endpoints

### 1. Twilio Status Webhook

**Endpoint:** `POST /api/webhooks/twilio/status`

**Purpose:** Receive delivery status updates from Twilio

**Request:** (form-urlencoded from Twilio)
```
MessageSid=SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MessageStatus=delivered
AccountSid=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
From=+15551234567
To=+15559876543
ErrorCode=30003  (only if failed/undelivered)
```

**Security:**
- Validate `X-Twilio-Signature` header using Twilio SDK
- Return 403 if signature invalid
- Return 200 within 500ms (queue heavy processing)

**Response:** `200 OK` with `{ success: true }`

**Implementation Notes:**
- Use `upsert` on messageSid for idempotency
- Handle out-of-order webhooks (delivered before sent)
- Store full payload in `rawPayload` for debugging

### 2. Get Attendee SMS History

**Endpoint:** `GET /api/events/[eventId]/attendees/[attendeeId]/sms-history`

**Purpose:** Fetch SMS history for a specific attendee

**Authorization:** Event owner or co-organizer with `view` permission

**Response:**
```typescript
{
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
  };
  messages: Array<{
    id: string;
    messageSid: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    notificationType: string;
    body: string | null;
    createdAt: string;
    sentAt: string | null;
    deliveredAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  }>;
  summary: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}
```

### 3. Retry Failed SMS

**Endpoint:** `POST /api/events/[eventId]/attendees/[attendeeId]/sms-retry`

**Purpose:** Retry a specific failed message or all failed messages

**Authorization:** Event owner or co-organizer with `curate` permission

**Request:**
```typescript
{
  messageId?: string;  // Specific message to retry
  retryAll?: boolean;  // Retry all failed messages for this attendee
}
```

**Response:**
```typescript
{
  success: boolean;
  retried: number;
  results: Array<{
    originalMessageId: string;
    newMessageId: string;
    status: 'queued' | 'failed';
    error?: string;
  }>;
}
```

**Implementation Notes:**
- Create NEW SMSMessage record (don't update old one)
- Link to same attendee/event/notificationType
- Original message stays as historical record

### 4. Get Event SMS Summary

**Endpoint:** `GET /api/events/[eventId]/sms-summary`

**Purpose:** Get aggregate SMS stats for an event

**Authorization:** Event owner or co-organizer with `view` permission

**Response:**
```typescript
{
  total: number;
  byStatus: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    undelivered: number;
  };
  byType: {
    invitation: number;
    rsvp_reminder: number;
    match_reveal: number;
    event_reminder: number;
    new_rsvps: number;
    question_set: number;
  };
  deliveryRate: number;  // delivered / (delivered + failed + undelivered)
  failedMessages: Array<{
    id: string;
    attendeeId: string;
    attendeeName: string;
    errorCode: string | null;
    createdAt: string;
  }>;
}
```

---

## Core Library Changes

### Update sendSMS Function

**File:** `src/lib/notifications/sms.ts`

**Current signature:**
```typescript
export async function sendSMS(options: SMSOptions): Promise<SMSResult>
```

**New signature:**
```typescript
export interface SMSOptions {
  to: string;
  body: string;
  // New required fields for tracking
  eventId: string;
  attendeeId: string;
  notificationType: NotificationType;
}

export type NotificationType =
  | 'invitation'
  | 'rsvp_reminder'
  | 'match_reveal'
  | 'event_reminder'
  | 'new_rsvps'
  | 'question_set';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  dbRecordId?: string;  // New: ID of SMSMessage record
  error?: string;
}
```

**New behavior:**
1. Add `statusCallback` URL to Twilio request
2. After successful Twilio send, create SMSMessage record with `status: 'queued'`
3. Return both `messageId` (Twilio SID) and `dbRecordId`

### Status Callback URL

```typescript
const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`;

const message = await client.messages.create({
  to: formattedPhone,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  body,
  statusCallback: statusCallbackUrl,
});
```

---

## UI Components

### 1. SMSHistoryPanel

**Location:** `src/components/events/SMSHistoryPanel.tsx`

**Props:**
```typescript
interface SMSHistoryPanelProps {
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  attendeePhone: string | null;
  onClose: () => void;
}
```

**Features:**
- Slide-over panel or modal
- Chronological list of SMS messages
- Status badges with colors:
  - `queued` → Gray "Sending..."
  - `sent` → Blue "Sent"
  - `delivered` → Green "Delivered"
  - `failed` → Red "Failed"
  - `undelivered` → Orange "Undelivered"
- Expandable error details for failed messages
- "Retry" button on failed messages
- "Retry All Failed" button if multiple failures
- Summary stats at bottom

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│ SMS History                                            [X] │
│ John Smith • +1 (555) 123-4567                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Feb 12, 2026 • 3:45 PM                    [Delivered ✓] ││
│ │ New RSVPs Update                                         ││
│ │ "11 more people RSVP'd for No Edges..."                 ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Feb 12, 2026 • 11:00 AM                     [Failed ✗]  ││
│ │ Match Reveal                                             ││
│ │ "Your matches for No Edges are ready..."                ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ⚠️ Error 30003: Unreachable handset                      ││
│ │ Phone may be off or out of service.                      ││
│ │                                          [Retry]         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ 5 messages • 3 delivered • 1 failed • 1 pending            │
│                                    [Retry All Failed]      │
└─────────────────────────────────────────────────────────────┘
```

### 2. SMSStatusBadge

**Location:** `src/components/events/SMSStatusBadge.tsx`

**Props:**
```typescript
interface SMSStatusBadgeProps {
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  size?: 'sm' | 'md';
}
```

**Renders:** Colored badge with icon and text

### 3. Integration Point: Attendee List

**File:** `src/components/events/AttendeeTable.tsx` (or equivalent)

**Add:** "SMS" column or icon button that opens SMSHistoryPanel

**Visual:**
- Green dot if all delivered
- Yellow dot if pending
- Red dot if any failed
- Gray if no SMS sent

---

## Notification Route Updates

### Files to Update

1. `src/app/api/events/[eventId]/notify/route.ts`
2. `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts`
3. `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts`

### Changes Required

Pass `eventId`, `attendeeId`, and `notificationType` to all `sendSMS()` calls:

**Before:**
```typescript
const smsResult = await sendSMS({ to: formattedPhone, body: smsBody });
```

**After:**
```typescript
const smsResult = await sendSMS({
  to: formattedPhone,
  body: smsBody,
  eventId,
  attendeeId: attendee.id,
  notificationType: 'new_rsvps',
});
```

---

## Webhook Security

### Signature Validation

```typescript
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
  }

  // Railway terminates SSL, so reconstruct HTTPS URL
  const url = `https://${request.headers.get('host')}${request.nextUrl.pathname}`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );

  if (!isValid) {
    console.error('[Twilio Webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Process webhook...
}
```

---

## Error Code Handling

### User-Friendly Error Messages

```typescript
const ERROR_MESSAGES: Record<string, { title: string; description: string; retryable: boolean }> = {
  '30003': {
    title: 'Unreachable handset',
    description: 'Phone may be off or out of service area. Try again later.',
    retryable: true,
  },
  '30006': {
    title: 'Landline detected',
    description: 'This number appears to be a landline and cannot receive SMS.',
    retryable: false,
  },
  '30007': {
    title: 'Carrier filtered',
    description: 'Message was blocked by the carrier. This may be a spam filter.',
    retryable: false,
  },
  '21211': {
    title: 'Invalid phone number',
    description: 'The phone number format is invalid.',
    retryable: false,
  },
  '21608': {
    title: 'Unverified number',
    description: 'The sending number is not verified with Twilio.',
    retryable: false,
  },
};

export function getErrorInfo(errorCode: string | null) {
  if (!errorCode) return null;
  return ERROR_MESSAGES[errorCode] || {
    title: `Error ${errorCode}`,
    description: 'An unexpected error occurred.',
    retryable: true,
  };
}
```

---

## Data Retention

### Cleanup Job

**Schedule:** Daily at 3 AM UTC

**Logic:**
```typescript
// Delete SMS records for events that ended >90 days ago
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

await prisma.sMSMessage.deleteMany({
  where: {
    event: {
      date: { lt: cutoffDate },
    },
  },
});
```

**Implementation:** Vercel Cron or Railway cron job

---

## Implementation Phases

### Phase 1: Core Infrastructure (~3 hours)

1. **Database Migration**
   - Add `SMSMessage` model to schema
   - Add relations to Event and EventAttendee
   - Run migration

2. **Webhook Endpoint**
   - Create `/api/webhooks/twilio/status/route.ts`
   - Implement signature validation
   - Upsert SMSMessage on status update

3. **Update sendSMS()**
   - Add new parameters (eventId, attendeeId, notificationType)
   - Add statusCallback URL to Twilio request
   - Create SMSMessage record after send

4. **Update Notification Routes**
   - Modify all routes that call sendSMS()
   - Pass required context parameters

### Phase 2: UI - Attendee History (~2 hours)

5. **API Route**
   - Create `GET /api/events/[eventId]/attendees/[attendeeId]/sms-history`

6. **SMSHistoryPanel Component**
   - Build slide-over/modal UI
   - Timeline with status badges
   - Error details expansion

7. **Integration**
   - Add SMS history trigger to attendee list/detail
   - Status indicator on attendee row

### Phase 3: Retry Functionality (~1.5 hours)

8. **Retry API**
   - Create `POST /api/events/[eventId]/attendees/[attendeeId]/sms-retry`
   - Handle single message and bulk retry

9. **Retry UI**
   - Add retry button to failed messages
   - Add "Retry All Failed" button
   - Loading states and success feedback

### Phase 4: Event Overview (~1.5 hours)

10. **Summary API**
    - Create `GET /api/events/[eventId]/sms-summary`

11. **Event SMS Dashboard**
    - Summary stats cards
    - Failed messages list
    - Link to individual attendee history

### Phase 5: Reliability (~1 hour)

12. **Reconciliation Job**
    - Poll Twilio API for stale messages (>12 hours without final status)
    - Update DB with current status

13. **Retention Job**
    - Delete SMS records >90 days after event

---

## Testing Checklist

### Unit Tests
- [ ] sendSMS creates SMSMessage record
- [ ] Webhook updates existing record
- [ ] Webhook creates record if missing (edge case)
- [ ] Signature validation rejects invalid requests
- [ ] Error code mapping returns correct messages

### Integration Tests
- [ ] Full send → webhook → delivered flow
- [ ] Failed message shows in history
- [ ] Retry creates new message
- [ ] Event summary aggregates correctly

### Manual Testing
- [ ] Send SMS via notification dialog
- [ ] Verify webhook received (check logs)
- [ ] View SMS history for attendee
- [ ] Retry failed message
- [ ] Verify status updates in real-time (poll or refresh)

### Edge Cases
- [ ] Webhook arrives before DB record created (upsert handles)
- [ ] Out-of-order webhooks (delivered before sent)
- [ ] Duplicate webhooks (idempotent handling)
- [ ] Invalid phone number format
- [ ] Attendee deleted after SMS sent

---

## Environment Variables

### Required (Production)

```bash
# Existing
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_MESSAGING_SERVICE_SID=MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# App URL for webhook callback
NEXT_PUBLIC_APP_URL=https://app.bettercontacts.ai
```

### Local Development

Use ngrok to expose local server for webhook testing:

```bash
ngrok http 3333
# Use https://abc123.ngrok.io as NEXT_PUBLIC_APP_URL temporarily
```

---

## Success Criteria

1. **Functional**
   - All SMS sends create tracking records
   - Delivery status updates within 60 seconds of Twilio webhook
   - Organizers can view SMS history for any attendee
   - Failed messages can be retried

2. **Reliability**
   - Webhook endpoint responds <500ms
   - 99%+ of webhooks processed successfully
   - Reconciliation catches missed webhooks within 24 hours

3. **UX**
   - Status is immediately visible after sending
   - Clear error messages for failed deliveries
   - Retry flow is intuitive (single click)

---

## Open Items Resolved

| Question | Decision |
|----------|----------|
| Manual retry? | Yes - single message and bulk retry supported |
| Retention period? | 90 days after event date |
| Bulk retry? | Yes - "Retry All Failed" when multiple failures |

---

## Dependencies

- `twilio` npm package (already installed)
- No new dependencies required

---

**Spec Version:** 1.0
**Created:** 2026-02-13
**Status:** Ready for validation
