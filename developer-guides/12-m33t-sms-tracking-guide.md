# M33T SMS History Tracking Guide

## Overview

This guide covers the SMS delivery tracking system for M33T event notifications. The system provides:

- **Delivery status tracking** for all event SMS (queued → sent → delivered/failed)
- **Organizer visibility** into SMS history per attendee
- **Error explanations** with actionable guidance
- **Manual retry** capability for transient failures

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Notification   │────▶│   Twilio     │────▶│  Attendee   │
│    Routes       │     │   API        │     │   Phone     │
└────────┬────────┘     └──────┬───────┘     └─────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐     ┌──────────────┐
│  SMSMessage     │◀────│   Webhook    │
│  Database       │     │  Callback    │
└────────┬────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐
│  Organizer UI   │
│  (History Panel)│
└─────────────────┘
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | SMSMessage model definition |
| `src/lib/notifications/sms.ts` | `sendTrackedSMS()` function |
| `src/lib/notifications/sms-error-codes.ts` | Twilio error code mapping |
| `src/app/api/webhooks/twilio/status/route.ts` | Status webhook endpoint |
| `src/app/api/events/[eventId]/attendees/[attendeeId]/sms-history/route.ts` | History API |
| `src/app/api/events/[eventId]/sms/[messageId]/retry/route.ts` | Retry endpoint |
| `src/components/m33t/sms/SMSStatusBadge.tsx` | Status badge component |
| `src/components/m33t/sms/SMSHistoryPanel.tsx` | History modal component |
| `src/app/(dashboard)/events/[eventId]/page.tsx` | Integration point (attendee list) |

## Database Model

```prisma
model SMSMessage {
  id                  String    @id @default(cuid())
  messageSid          String    @unique  // Twilio Message SID
  accountSid          String?
  messagingServiceSid String?
  toPhone             String
  fromPhone           String
  body                String?   @db.Text
  numSegments         Int       @default(1)

  // Status tracking
  status              String    // queued, sending, sent, delivered, failed, undelivered
  errorCode           String?   // Twilio error code (e.g., "30006")
  errorMessage        String?   // Raw error from Twilio
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
  notificationType    String    // invitation, rsvp_reminder, match_reveal, etc.

  @@index([messageSid])
  @@index([attendeeId, createdAt])
  @@index([eventId, createdAt])
  @@index([status, createdAt])
  @@index([eventId, status])
}
```

## SMS Status Lifecycle

```
QUEUED ──▶ SENDING ──▶ SENT ──▶ DELIVERED
                          │
                          └──▶ FAILED / UNDELIVERED
```

| Status | Meaning |
|--------|---------|
| `queued` | Message accepted by Twilio, waiting to send |
| `sending` | Twilio is transmitting to carrier |
| `sent` | Carrier accepted, pending delivery confirmation |
| `delivered` | Confirmed delivered to handset |
| `failed` | Twilio couldn't send (usually account/config issue) |
| `undelivered` | Carrier rejected (invalid number, blocked, etc.) |

## Usage Patterns

### Sending Tracked SMS

```typescript
import { sendTrackedSMS, type NotificationType } from '@/lib/notifications/sms';

// For event-related notifications (most cases)
const result = await sendTrackedSMS({
  to: '+15551234567',
  body: 'Your invitation to Event Name...',
  eventId: 'event_123',
  attendeeId: 'attendee_456',
  notificationType: 'invitation', // Type-safe enum
});

if (!result.success) {
  console.error('SMS failed:', result.error);
}
```

### Notification Types

```typescript
type NotificationType =
  | 'invitation'        // Initial event invite
  | 'rsvp_reminder'     // Reminder to RSVP
  | 'match_reveal'      // Match notification
  | 'event_reminder'    // Upcoming event reminder
  | 'new_rsvps'         // New RSVPs notification
  | 'question_set'      // Question set published
  | 'phone_verification'; // OTP (use sendSMS instead)
```

### When NOT to Use sendTrackedSMS

For non-event SMS (phone verification, password reset), use the basic `sendSMS`:

```typescript
import { sendSMS } from '@/lib/notifications/sms';

// For OTP - no event/attendee context
await sendSMS({
  to: phone,
  body: `Your code is: ${otp}`,
});
```

## Webhook Security

### Production Requirements

The webhook endpoint at `/api/webhooks/twilio/status` **requires signature validation in production**:

1. Set `TWILIO_AUTH_TOKEN` environment variable
2. Twilio signs each webhook with `x-twilio-signature` header
3. Endpoint validates signature before processing

```typescript
// From route.ts
if (process.env.NODE_ENV === 'production' && !authToken) {
  return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
}

if (process.env.NODE_ENV === 'production' && !signature) {
  return NextResponse.json({ error: 'Signature required' }, { status: 403 });
}
```

### Configuring Twilio

1. Go to Twilio Console → Messaging → Services
2. Edit your messaging service
3. Set Status Callback URL: `https://bettercontacts.ai/api/webhooks/twilio/status`

## Error Code Handling

The system maps Twilio error codes to user-friendly explanations:

```typescript
import { getErrorInfo, isPermanentError } from '@/lib/notifications/sms-error-codes';

const errorInfo = getErrorInfo('30006');
// {
//   code: '30006',
//   title: 'Landline or Unreachable',
//   description: 'Message could not be delivered...',
//   action: 'Verify the phone number is a mobile...',
//   isPermanent: true,
// }

// Check if retry would help
if (!isPermanentError(errorCode)) {
  // Show retry button
}
```

### Common Error Codes

| Code | Title | Permanent? |
|------|-------|------------|
| 30003 | Unreachable Destination | No |
| 30004 | Message Blocked | Yes |
| 30005 | Unknown Destination | Yes |
| 30006 | Landline | Yes |
| 30007 | Carrier Violation | Yes |
| 30008 | Unknown Error | No |
| 21211 | Invalid Phone Number | Yes |
| 21614 | Not a Mobile | Yes |

## UI Components

### SMSStatusBadge

Color-coded badge showing delivery status:

```tsx
import { SMSStatusBadge } from '@/components/m33t/sms';

<SMSStatusBadge status="delivered" size="sm" />
<SMSStatusBadge status="failed" showIcon={true} showLabel={true} />
```

### SMSHistoryPanel

Modal showing complete SMS history for an attendee:

```tsx
import { SMSHistoryPanel } from '@/components/m33t/sms';

{smsHistoryAttendee && (
  <SMSHistoryPanel
    eventId={eventId}
    attendeeId={smsHistoryAttendee.id}
    attendeeName={smsHistoryAttendee.name}
    onClose={() => setSmsHistoryAttendee(null)}
    onRetry={async (messageId) => {
      await fetch(`/api/events/${eventId}/sms/${messageId}/retry`, {
        method: 'POST',
      });
    }}
  />
)}
```

## Retry Logic

### Retry Eligibility

A message can be retried if:
1. Status is `failed` or `undelivered`
2. Error code is NOT permanent
3. No recent retry exists (60-second deduplication window)
4. Attendee still has a valid phone number
5. Original message body is available

### Retry Deduplication

The retry endpoint prevents double-sends from rapid clicks:

```typescript
// Check for recent retry (60 seconds)
const recentRetry = await prisma.sMSMessage.findFirst({
  where: {
    eventId,
    attendeeId: originalMessage.attendeeId,
    notificationType: originalMessage.notificationType,
    body: originalMessage.body,
    createdAt: { gte: new Date(Date.now() - 60000) },
    status: { in: ['queued', 'sending', 'sent'] },
  },
});

if (recentRetry) {
  return NextResponse.json(
    { error: 'Retry already in progress', code: 'RETRY_IN_PROGRESS' },
    { status: 429 }
  );
}
```

## Race Condition Handling

Twilio webhooks can arrive before `sendTrackedSMS` completes writing to the database. The webhook handler uses an **update-only pattern**:

```typescript
// Find existing record
const existingMessage = await prisma.sMSMessage.findUnique({
  where: { messageSid },
});

if (!existingMessage) {
  // Webhook arrived early - return success
  // Twilio will send subsequent status updates
  console.warn(`Message ${messageSid} not found - deferring to next update`);
  return NextResponse.json({ success: true, deferred: true });
}

// Update existing record
await prisma.sMSMessage.update({
  where: { messageSid },
  data: { status, errorCode, errorMessage, ...timestamps },
});
```

## Testing

### Manual Testing Flow

1. Send a test notification from event dashboard
2. Check Railway logs for webhook receipt
3. View SMS history in attendee list
4. Verify status badge updates correctly

### Test Webhook Locally

Use ngrok to expose local webhook:

```bash
ngrok http 3333
# Configure Twilio webhook: https://xxx.ngrok.io/api/webhooks/twilio/status
```

### Simulating Failures

Test the retry flow by:
1. Sending to an invalid number (Twilio test number: +15005550001)
2. Observing the `failed` status in history panel
3. Attempting retry (should fail with permanent error message)

## Future Enhancements

### Phase 4 (Deferred)
- Bulk retry for all failed messages in an event
- Filter attendee list by SMS status

### Phase 5 (Deferred)
- SMS delivery metrics dashboard per event
- Automated retry for transient errors

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not receiving updates | Check Twilio console for webhook URL configuration |
| "Server misconfiguration" in production | Set `TWILIO_AUTH_TOKEN` env var |
| Status stuck on "queued" | Twilio may be delayed; check Twilio console logs |
| Retry button not showing | Error may be permanent (check `isPermanentError`) |
| History panel shows no messages | Messages sent before tracking was added won't appear |

## Environment Variables

```bash
# Required for webhook security in production
TWILIO_AUTH_TOKEN=your_auth_token_here

# Already configured (for sending)
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxx
```
