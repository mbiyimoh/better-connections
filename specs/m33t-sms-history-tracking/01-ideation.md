# SMS History Tracking - Ideation Document

## Problem Statement

Event organizers need visibility into SMS delivery status for messages sent to attendees. Currently:
1. **No SMS history is stored** - the `messageId` (Twilio SID) returned from sends is discarded
2. **No delivery status tracking** - organizers don't know if texts actually reached recipients
3. **No debugging capability** - when texts "fail", there's no way to investigate why

The user's specific request:
> "Event organizers should be able to, for all confirmed/RSVPed attendees, view the 'SMS history' for any given attendee. So I'm just imagining a page where you can see all of the texts that have been sent to that person and when they were sent, including, crucially a definitive 'success / delivered' vs 'failed' indication for each text."

---

## Codebase Context

### Current Implementation

**SMS Sending (`src/lib/notifications/sms.ts`):**
```typescript
export interface SMSResult {
  success: boolean;
  messageId?: string;  // ← Twilio SID returned but NOT stored
  error?: string;
}
```

**Notify Route (`src/app/api/events/[eventId]/notify/route.ts`):**
- Returns `messageId` in `newRsvpsResults` array
- Updates `newRsvpsNotifiedAt` timestamp on EventAttendee
- Does NOT persist messageId or status anywhere

**EventAttendee Schema (Notification Fields):**
```prisma
inviteSentAt         DateTime?
inviteMethod         InviteMethod?     // EMAIL, SMS, BOTH, LINK_COPIED
rsvpReminderSentAt   DateTime?
matchRevealSentAt    DateTime?
eventReminderSentAt  DateTime?
questionSetNotifiedAt DateTime?
newRsvpsNotifiedAt   DateTime?
```

These timestamps only track "when sent" but not "whether delivered".

### Files That Send SMS

1. `src/app/api/events/[eventId]/notify/route.ts` - Main notification route (all types)
2. `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts` - Question set notifications
3. `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts` - Publish notifications
4. `src/components/m33t/InviteDialog.tsx` - Invite dialog (triggers notify API)
5. `src/components/m33t/MatchRevealDialog.tsx` - Match reveal (triggers notify API)
6. `src/components/events/NewRsvpsNotifyDialog.tsx` - New RSVPs notification

---

## Research Findings: Twilio Best Practices

### Message Status Lifecycle

```
CREATE
  ↓
accepted/scheduled → queued → sending → sent → delivered ✓
                        ↓                  ↓
                     failed ✗        undelivered ✗
```

| Status | Meaning |
|--------|---------|
| `queued` | Ready to send to carrier |
| `sent` | Carrier accepted the message |
| `delivered` | Carrier confirmed delivery to handset |
| `failed` | Message failed before carrier (Twilio-level) |
| `undelivered` | Carrier reported delivery failure |

### Recommended Architecture: Webhooks + Polling Reconciliation

**Primary: Status Callback Webhooks**
- Pass `statusCallback` URL when sending messages
- Twilio POSTs status updates in real-time
- Must validate `X-Twilio-Signature` for security
- Respond within 15 seconds (ideally <500ms)

**Fallback: Daily Polling Reconciliation**
- Cron job polls Twilio API for messages stuck >12 hours
- Catches missed webhooks (network issues, endpoint downtime)
- Uses `client.messages(sid).fetch()`

### Key Implementation Details

1. **Store messageSid immediately** after sending (before webhook arrives)
2. **Handle out-of-order webhooks** - `delivered` may arrive before `sent`
3. **Validate signatures** using `twilio.validateRequest()`
4. **Store raw payload** for debugging and future-proofing
5. **Use idempotency tokens** to handle retry webhooks

---

## Design Options

### Option A: Per-Attendee SMS Log (Recommended)

**Database Model:**
```prisma
model SMSMessage {
  id              String    @id @default(cuid())

  // Twilio identifiers
  messageSid      String    @unique
  accountSid      String?
  messagingServiceSid String?

  // Message content
  to              String
  from            String
  body            String?
  numSegments     Int       @default(1)

  // Status tracking
  status          String    // queued, sent, delivered, failed, undelivered
  errorCode       String?
  errorMessage    String?
  rawPayload      Json?     // Full webhook payload for debugging

  // Timestamps
  createdAt       DateTime  @default(now())
  sentAt          DateTime?
  deliveredAt     DateTime?
  statusUpdatedAt DateTime  @updatedAt

  // Relations
  eventId         String
  event           Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  attendeeId      String
  attendee        EventAttendee @relation(fields: [attendeeId], references: [id], onDelete: Cascade)

  // Message context
  notificationType String   // invitation, rsvp_reminder, match_reveal, event_reminder, new_rsvps, question_set

  @@index([messageSid])
  @@index([attendeeId, createdAt])
  @@index([eventId, createdAt])
  @@index([status, createdAt])
}
```

**UI: SMS History Panel in Attendee Detail**
- Accessible from event attendee list → click attendee → "SMS History" tab
- Shows chronological list of all texts sent to that attendee
- Each entry shows: notification type, timestamp, status badge, message preview

**Status Badges:**
| Status | Badge | Color |
|--------|-------|-------|
| `queued` | "Sending..." | Gray |
| `sent` | "Sent" | Blue |
| `delivered` | "Delivered" | Green |
| `failed` | "Failed" | Red |
| `undelivered` | "Undelivered" | Orange |

**Pros:**
- Clean separation of concerns
- Easy to query by attendee or event
- Full audit trail
- Supports future analytics (delivery rates, etc.)

**Cons:**
- New table requires migration
- More complex than timestamp-only approach

---

### Option B: Enhanced Timestamps on EventAttendee

**Approach:** Add status fields alongside existing timestamps:

```prisma
model EventAttendee {
  // Existing
  inviteSentAt         DateTime?
  inviteMethod         InviteMethod?

  // New delivery status fields
  inviteSmsStatus      String?   // queued, sent, delivered, failed
  inviteSmsMessageId   String?   // Twilio SID
  inviteSmsErrorCode   String?

  // Repeat for each notification type...
}
```

**Pros:**
- No new table
- Simple schema

**Cons:**
- Only tracks most recent SMS per notification type
- Can't track multiple texts (e.g., send + resend)
- Pollutes EventAttendee with many fields
- No message body storage

**Verdict:** Not recommended - too limited for the use case.

---

### Option C: Event-Level SMS Log

**Approach:** Single table per event, not per attendee:

```prisma
model EventSMSLog {
  id              String @id
  eventId         String
  messageSid      String @unique
  recipientPhone  String
  attendeeId      String?  // Optional link
  status          String
  // ...
}
```

**Pros:**
- All event SMS in one place
- Good for bulk send analytics

**Cons:**
- Requires additional joins to show per-attendee view
- Same migration complexity as Option A

**Verdict:** Option A is more flexible and serves both use cases.

---

## Recommended Approach: Option A with Phased Rollout

### Phase 1: Core Infrastructure (MVP)

1. **Database: Add `SMSMessage` model**
   - Full schema as shown in Option A
   - Migration: additive only, no data loss

2. **Webhook Endpoint: `/api/webhooks/twilio/status`**
   - Validate Twilio signature
   - Upsert SMSMessage status
   - Respond <500ms

3. **Modify `sendSMS()` to accept context:**
   ```typescript
   export async function sendSMS(options: {
     to: string;
     body: string;
     eventId: string;
     attendeeId: string;
     notificationType: NotificationType;
   }): Promise<SMSResult>
   ```
   - Store message in DB immediately after send
   - Include `statusCallback` URL in Twilio request

4. **Update all notification routes** to pass eventId/attendeeId/type to sendSMS

### Phase 2: UI - Attendee SMS History

5. **API Route: `GET /api/events/[eventId]/attendees/[attendeeId]/sms-history`**
   - Returns paginated SMS messages for attendee
   - Includes status, timestamp, notification type, preview

6. **UI Component: `SMSHistoryPanel.tsx`**
   - Shows in attendee detail modal/page
   - Timeline view with status badges
   - Expandable to show full message text

### Phase 3: Event-Level Overview

7. **SMS Dashboard on Event Page**
   - Summary stats: X sent, Y delivered, Z failed
   - Filter by status, date range, notification type
   - Export capability

### Phase 4: Reliability & Monitoring

8. **Reconciliation Cron Job**
   - Daily: poll Twilio API for messages >12 hours without final status
   - Update DB with current status

9. **Alerting**
   - Notify organizers of failed messages
   - High failure rate detection

---

## UI/UX Wireframes

### Attendee SMS History Panel

```
┌─────────────────────────────────────────────────────────────┐
│ SMS History for John Smith                                  │
│ (+1 555-123-4567)                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Feb 12, 2026 • 3:45 PM                    [Delivered ✓] ││
│ │ New RSVPs Update                                         ││
│ │ "11 more people RSVP'd for No Edges..."                 ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Feb 10, 2026 • 10:22 AM                   [Delivered ✓] ││
│ │ Match Reveal                                             ││
│ │ "Your matches for No Edges are ready! See..."           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Feb 5, 2026 • 2:15 PM                     [Delivered ✓] ││
│ │ Invitation                                               ││
│ │ "You're invited to No Edges: Building at..."            ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ 3 messages sent • 3 delivered • 0 failed                   │
└─────────────────────────────────────────────────────────────┘
```

### Failed Message State

```
┌─────────────────────────────────────────────────────────────┐
│ Feb 13, 2026 • 11:00 AM                       [Failed ✗]   │
│ New RSVPs Update                                            │
│ "15 more people RSVP'd for No Edges..."                    │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Error: Unreachable handset (30003)                       │
│   Carrier could not deliver - phone may be off or           │
│   out of service area.                                      │
│                                                             │
│   [Retry]                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Event SMS Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ SMS Overview • No Edges: Building at the Speed of Thought  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   152    │  │   148    │  │    3     │  │    1     │   │
│  │  Total   │  │Delivered │  │  Failed  │  │ Pending  │   │
│  │  Sent    │  │  (97%)   │  │   (2%)   │  │   (1%)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Filter: [All Types ▼] [All Status ▼] [Last 7 Days ▼]   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Recent Messages:                                            │
│ ─────────────────────────────────────────────────────────── │
│ John Smith     New RSVPs    Feb 12, 3:45 PM    [Delivered] │
│ Jane Doe       Match Reveal Feb 12, 3:30 PM    [Delivered] │
│ Bob Wilson     Invitation   Feb 12, 2:00 PM    [Failed]    │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Considerations

### Webhook URL Configuration

**Production:** `https://app.bettercontacts.ai/api/webhooks/twilio/status`

**Local Development:** Use ngrok or similar:
```bash
ngrok http 3333
# Then use https://abc123.ngrok.io/api/webhooks/twilio/status
```

### Signature Validation

```typescript
import twilio from 'twilio';

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN!,
  request.headers.get('x-twilio-signature')!,
  request.url,  // EXACT URL including query params
  params        // Form data as key-value object
);
```

**Railway/Proxy Gotcha:** If SSL terminates at load balancer, manually construct HTTPS URL:
```typescript
const url = `https://${request.headers.get('host')}${request.nextUrl.pathname}`;
```

### Error Code Handling

| Code | Meaning | Action |
|------|---------|--------|
| 30003 | Unreachable handset | Show "phone may be off" - suggest retry later |
| 30006 | Landline | Show "cannot SMS landlines" - permanent |
| 30007 | Carrier filtered | Show "blocked by carrier" - review content |

### Migration Safety

This is an **additive change** - new table, no modifications to existing tables. Can be deployed with zero downtime:

1. Deploy migration (creates empty SMSMessage table)
2. Deploy code changes (starts writing to new table)
3. Historical SMS are not backfilled (acceptable - feature is new)

---

## Open Questions

1. **Retry UX**: Should organizers be able to manually retry failed messages? Or automatic retry with limits?

2. **Notification Preferences**: Should attendees be able to opt-out of SMS? (Currently not implemented)

3. **Message Content Storage**: Store full body text, or just notification type + template reference?

4. **Retention Policy**: How long to keep SMS history? Forever? 90 days after event?

5. **Bulk Actions**: Should there be a "Retry all failed" button at event level?

---

## Success Metrics

1. **Immediate**: Organizer can see delivery status for any attendee within 5 seconds of sending
2. **Debugging**: When SMS "fails", organizer sees specific error code and actionable message
3. **Confidence**: 97%+ of sent messages reach "delivered" status (carrier-dependent)
4. **Reliability**: Webhook endpoint has >99.9% uptime, <500ms response time

---

## Next Steps

1. Review this ideation document
2. Answer open questions
3. Create spec document with detailed implementation plan
4. Phase 1 implementation (~3-5 hours)
5. Phase 2-4 as needed

---

**Ideation Date:** 2026-02-13
**Author:** Claude Code
**Related Research:** `/tmp/research_20260213_twilio_sms_delivery_status.md`
