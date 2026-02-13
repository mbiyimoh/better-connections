# Task Breakdown: SMS History Tracking

**Generated**: 2026-02-13
**Source**: specs/m33t-sms-history-tracking/spec.md
**Last Decompose**: 2026-02-13
**Scope**: Phases 1-3 (MVP)

## Overview

Implement SMS delivery status tracking for M33T event notifications. This enables event organizers to see delivery status (delivered/failed) for all texts sent to attendees, with retry capability for failed messages.

**MVP Scope (Phases 1-3)**:
- Database schema for SMS message tracking
- Twilio webhook endpoint for status updates
- Updated sendSMS() with tracking context
- Attendee SMS history UI with retry functionality

**Deferred (Phases 4-5)**:
- Event-level SMS dashboard
- Reconciliation cron job
- Retention cleanup job

---

## Phase 1: Core Infrastructure

### Task 1.1: Add SMSMessage Prisma Model

**Description**: Create new database model for tracking SMS messages with Twilio status
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (foundation task)

**Technical Requirements**:

Add to `prisma/schema.prisma`:

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

Also add relations to existing models:

```prisma
// In Event model
smsMessages         SMSMessage[]

// In EventAttendee model
smsMessages         SMSMessage[]
```

**Implementation Steps**:
1. Open `prisma/schema.prisma`
2. Add SMSMessage model with all fields and indexes
3. Add `smsMessages SMSMessage[]` to Event model
4. Add `smsMessages SMSMessage[]` to EventAttendee model
5. Run `npx prisma migrate dev --name add-sms-message-tracking`
6. Verify migration success

**Acceptance Criteria**:
- [ ] SMSMessage model created with all specified fields
- [ ] Relations to Event and EventAttendee established
- [ ] Indexes created for query performance
- [ ] Migration runs successfully without errors
- [ ] `npx prisma generate` completes

---

### Task 1.2: Create Twilio Status Webhook Endpoint

**Description**: Build webhook endpoint to receive SMS delivery status updates from Twilio
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (SMSMessage model)
**Can run parallel with**: None

**Technical Requirements**:

Create `src/app/api/webhooks/twilio/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data from Twilio
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // 2. Validate Twilio signature
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      console.error('[Twilio Webhook] Missing X-Twilio-Signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
    }

    // Railway terminates SSL, so reconstruct HTTPS URL
    const host = request.headers.get('host');
    const url = `https://${host}${request.nextUrl.pathname}`;

    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[Twilio Webhook] Missing TWILIO_AUTH_TOKEN');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const isValid = twilio.validateRequest(authToken, signature, url, params);

    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature', { url, params: Object.keys(params) });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 3. Extract webhook data
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      From,
      To,
      AccountSid,
    } = params;

    console.log('[Twilio Webhook] Received status update', {
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode || null,
    });

    // 4. Upsert SMS message record (idempotent)
    const now = new Date();
    await prisma.sMSMessage.upsert({
      where: { messageSid: MessageSid },
      update: {
        status: MessageStatus,
        errorCode: ErrorCode || null,
        rawPayload: params,
        statusUpdatedAt: now,
        ...(MessageStatus === 'sent' && { sentAt: now }),
        ...(MessageStatus === 'delivered' && { deliveredAt: now }),
      },
      create: {
        // If webhook arrives before we create the record (race condition),
        // create a placeholder that will be updated when we have full context
        messageSid: MessageSid,
        status: MessageStatus,
        toPhone: To || '',
        fromPhone: From || '',
        errorCode: ErrorCode || null,
        rawPayload: params,
        accountSid: AccountSid,
        // These will be null for race condition case - acceptable
        eventId: '', // Will fail FK constraint - see note below
        attendeeId: '',
        notificationType: 'unknown',
        statusUpdatedAt: now,
        ...(MessageStatus === 'sent' && { sentAt: now }),
        ...(MessageStatus === 'delivered' && { deliveredAt: now }),
      },
    });

    // 5. Log failures for monitoring
    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      console.error('[Twilio Webhook] Message delivery failed', {
        messageSid: MessageSid,
        status: MessageStatus,
        errorCode: ErrorCode,
      });
    }

    // 6. Respond quickly (< 500ms target)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[Twilio Webhook] Processing error:', error);
    // Return 200 to prevent Twilio retries on non-recoverable errors
    return NextResponse.json(
      { error: 'Internal error', processed: false },
      { status: 200 }
    );
  }
}
```

**Note on race condition**: The upsert create block may fail due to FK constraints if webhook arrives before sendSMS creates the record. This is acceptable - the update path will succeed when the record exists. We can add a "pending" records table later if needed.

**Simplified approach**: Only update existing records, ignore webhooks for unknown message SIDs:

```typescript
// Alternative: Only update, don't create
const existingMessage = await prisma.sMSMessage.findUnique({
  where: { messageSid: MessageSid },
});

if (!existingMessage) {
  console.warn('[Twilio Webhook] Unknown messageSid, ignoring', { MessageSid });
  return NextResponse.json({ success: true, ignored: true }, { status: 200 });
}

await prisma.sMSMessage.update({
  where: { messageSid: MessageSid },
  data: {
    status: MessageStatus,
    errorCode: ErrorCode || null,
    rawPayload: params,
    statusUpdatedAt: now,
    ...(MessageStatus === 'sent' && { sentAt: now }),
    ...(MessageStatus === 'delivered' && { deliveredAt: now }),
  },
});
```

**Implementation Steps**:
1. Create directory `src/app/api/webhooks/twilio/status/`
2. Create `route.ts` with webhook handler
3. Implement signature validation using Twilio SDK
4. Implement upsert/update logic for SMS status
5. Add logging for debugging
6. Test with ngrok for local development

**Acceptance Criteria**:
- [ ] Webhook endpoint responds to POST requests
- [ ] Signature validation rejects invalid requests (403)
- [ ] Valid webhooks update SMSMessage status
- [ ] Out-of-order webhooks handled correctly (delivered before sent)
- [ ] Response time < 500ms
- [ ] Errors logged but return 200 to prevent retries

---

### Task 1.3: Update sendSMS Function with Tracking

**Description**: Modify sendSMS() to accept tracking context and create SMSMessage records
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (SMSMessage model)
**Can run parallel with**: Task 1.2

**Technical Requirements**:

Update `src/lib/notifications/sms.ts`:

```typescript
import type { Twilio } from 'twilio';
import { normalizePhone } from '@/lib/phone';
import { prisma } from '@/lib/db';

// ... existing client code ...

export type NotificationType =
  | 'invitation'
  | 'rsvp_reminder'
  | 'match_reveal'
  | 'event_reminder'
  | 'new_rsvps'
  | 'question_set';

export interface SMSOptions {
  to: string;
  body: string;
  // New required fields for tracking
  eventId: string;
  attendeeId: string;
  notificationType: NotificationType;
  // Existing optional field
  scheduledAt?: Date;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  dbRecordId?: string;  // New: ID of SMSMessage record
  error?: string;
}

/**
 * Send an SMS message via Twilio with delivery tracking
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  const { to, body, eventId, attendeeId, notificationType, scheduledAt } = options;

  try {
    const client = await getClient();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!messagingServiceSid && !fromNumber) {
      throw new Error('Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER');
    }

    // Build status callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';
    const statusCallbackUrl = `${appUrl}/api/webhooks/twilio/status`;

    // Build message options
    const messageOptions: {
      to: string;
      body: string;
      messagingServiceSid?: string;
      from?: string;
      statusCallback: string;
      scheduleType?: 'fixed';
      sendAt?: Date;
    } = {
      to,
      body,
      statusCallback: statusCallbackUrl,
    };

    if (messagingServiceSid) {
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (fromNumber) {
      messageOptions.from = fromNumber;
    }

    // Add scheduling if provided
    if (scheduledAt) {
      const now = new Date();
      const scheduleTime = new Date(scheduledAt);
      if (scheduleTime.getTime() - now.getTime() >= 15 * 60 * 1000) {
        messageOptions.scheduleType = 'fixed';
        messageOptions.sendAt = scheduleTime;
      }
    }

    // Send via Twilio
    const message = await client.messages.create(messageOptions);

    // Create tracking record in database
    const smsRecord = await prisma.sMSMessage.create({
      data: {
        messageSid: message.sid,
        accountSid: message.accountSid,
        messagingServiceSid: messagingServiceSid || null,
        toPhone: message.to,
        fromPhone: message.from,
        body: body,
        status: message.status, // Usually 'queued' initially
        numSegments: message.numSegments || 1,
        eventId,
        attendeeId,
        notificationType,
      },
    });

    console.log('[sendSMS] Message sent and tracked', {
      messageSid: message.sid,
      dbRecordId: smsRecord.id,
      to: message.to,
      status: message.status,
    });

    return {
      success: true,
      messageId: message.sid,
      dbRecordId: smsRecord.id,
    };
  } catch (error) {
    console.error('[sendSMS] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Implementation Steps**:
1. Update SMSOptions interface with new required fields
2. Update SMSResult interface with dbRecordId
3. Add statusCallback URL to Twilio message options
4. Create SMSMessage record after successful Twilio send
5. Return both messageId and dbRecordId
6. Update any type exports

**Acceptance Criteria**:
- [ ] SMSOptions requires eventId, attendeeId, notificationType
- [ ] SMSResult includes dbRecordId
- [ ] statusCallback URL included in Twilio request
- [ ] SMSMessage record created after successful send
- [ ] TypeScript compiles without errors
- [ ] Existing callers will show type errors (expected - need update)

---

### Task 1.4: Update Notification Routes to Pass Tracking Context

**Description**: Modify all routes that call sendSMS() to pass required tracking parameters
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.3 (sendSMS update)
**Can run parallel with**: None

**Files to Update**:

1. `src/app/api/events/[eventId]/notify/route.ts`
2. `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts`
3. `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts`

**Changes Required**:

For each sendSMS() call, change from:
```typescript
const smsResult = await sendSMS({ to: formattedPhone, body: smsBody });
```

To:
```typescript
const smsResult = await sendSMS({
  to: formattedPhone,
  body: smsBody,
  eventId,
  attendeeId: attendee.id,
  notificationType: 'new_rsvps', // or appropriate type
});
```

**Specific Updates**:

**1. notify/route.ts** (main notification route):
- Line ~230: `new_rsvps` type SMS
- Line ~445: `invitation`, `rsvp_reminder`, `match_reveal`, `event_reminder` types

**2. question-sets/[setId]/notify/route.ts**:
- Add `notificationType: 'question_set'`

**3. question-sets/[setId]/publish/route.ts**:
- Add `notificationType: 'question_set'`

**Implementation Steps**:
1. Update notify/route.ts - new_rsvps section
2. Update notify/route.ts - standard notification section
3. Update question-sets notify/route.ts
4. Update question-sets publish/route.ts
5. Run TypeScript compiler to verify no errors
6. Test each notification type manually

**Acceptance Criteria**:
- [ ] All sendSMS() calls pass eventId, attendeeId, notificationType
- [ ] TypeScript compiles without errors
- [ ] Each notification type maps to correct notificationType value
- [ ] SMS sends still work (manual test)

---

## Phase 2: UI - Attendee History

### Task 2.1: Create SMS History API Endpoint

**Description**: Build API route to fetch SMS history for a specific attendee
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (SMSMessage model)
**Can run parallel with**: None

**Technical Requirements**:

Create `src/app/api/events/[eventId]/attendees/[attendeeId]/sms-history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEventAccess, checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Check event access (view permission sufficient)
    const access = await checkEventAccess(eventId, user.id, 'view');
    if (!access) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    // Fetch attendee info
    const attendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    // Fetch SMS history
    const messages = await prisma.sMSMessage.findMany({
      where: { attendeeId, eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        messageSid: true,
        status: true,
        notificationType: true,
        body: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        errorCode: true,
        errorMessage: true,
      },
    });

    // Calculate summary
    const summary = {
      total: messages.length,
      delivered: messages.filter(m => m.status === 'delivered').length,
      failed: messages.filter(m => m.status === 'failed' || m.status === 'undelivered').length,
      pending: messages.filter(m => ['queued', 'sent'].includes(m.status)).length,
    };

    return NextResponse.json({
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        phone: attendee.phone,
      },
      messages,
      summary,
    });

  } catch (error) {
    console.error('[SMS History] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS history' }, { status: 500 });
  }
}
```

**Implementation Steps**:
1. Create directory structure for route
2. Implement GET handler with auth checks
3. Query attendee and SMS messages
4. Calculate summary statistics
5. Return formatted response

**Acceptance Criteria**:
- [ ] Endpoint requires authentication
- [ ] Checks event access (view permission)
- [ ] Returns attendee info with phone
- [ ] Returns all SMS messages for attendee, newest first
- [ ] Includes summary stats (total, delivered, failed, pending)
- [ ] 404 if attendee not found in event

---

### Task 2.2: Create Error Code Utility

**Description**: Build utility for mapping Twilio error codes to user-friendly messages
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1

**Technical Requirements**:

Create `src/lib/notifications/sms-errors.ts`:

```typescript
interface ErrorInfo {
  title: string;
  description: string;
  retryable: boolean;
}

const ERROR_MESSAGES: Record<string, ErrorInfo> = {
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
  '30008': {
    title: 'Unknown destination',
    description: 'The destination phone number is unknown or invalid.',
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
  '21610': {
    title: 'Blocked number',
    description: 'The recipient has opted out of messages from this number.',
    retryable: false,
  },
};

export function getErrorInfo(errorCode: string | null): ErrorInfo | null {
  if (!errorCode) return null;

  return ERROR_MESSAGES[errorCode] || {
    title: `Error ${errorCode}`,
    description: 'An unexpected error occurred while sending the message.',
    retryable: true, // Default to retryable for unknown errors
  };
}

export function isRetryable(errorCode: string | null): boolean {
  if (!errorCode) return true;
  const info = getErrorInfo(errorCode);
  return info?.retryable ?? true;
}
```

**Acceptance Criteria**:
- [ ] Maps common Twilio error codes to user-friendly messages
- [ ] Returns null for null/undefined error codes
- [ ] Returns generic message for unknown error codes
- [ ] isRetryable helper works correctly

---

### Task 2.3: Create SMSStatusBadge Component

**Description**: Build reusable status badge component for SMS delivery status
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2

**Technical Requirements**:

Create `src/components/events/SMSStatusBadge.tsx`:

```typescript
import { Check, Clock, AlertCircle, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';

interface SMSStatusBadgeProps {
  status: SMSStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<SMSStatus, {
  label: string;
  icon: typeof Check;
  className: string;
}> = {
  queued: {
    label: 'Sending...',
    icon: Clock,
    className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  delivered: {
    label: 'Delivered',
    icon: Check,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  failed: {
    label: 'Failed',
    icon: X,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  undelivered: {
    label: 'Undelivered',
    icon: AlertCircle,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

export function SMSStatusBadge({ status, size = 'md' }: SMSStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </span>
  );
}
```

**Acceptance Criteria**:
- [ ] Renders correct icon and label for each status
- [ ] Colors match design system (emerald=success, red=error, etc.)
- [ ] Supports sm and md sizes
- [ ] TypeScript types are strict (only valid statuses)

---

### Task 2.4: Create SMSHistoryPanel Component

**Description**: Build the main SMS history panel/modal for viewing attendee SMS history
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1, 2.2, 2.3
**Can run parallel with**: None

**Technical Requirements**:

Create `src/components/events/SMSHistoryPanel.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SMSStatusBadge } from './SMSStatusBadge';
import { getErrorInfo, isRetryable } from '@/lib/notifications/sms-errors';
import { toast } from 'sonner';
import { formatRelativeDate } from '@/lib/m33t/question-formatting';

interface SMSMessage {
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
}

interface SMSHistoryData {
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
  };
  messages: SMSMessage[];
  summary: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}

interface SMSHistoryPanelProps {
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  attendeePhone: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  invitation: 'Invitation',
  rsvp_reminder: 'RSVP Reminder',
  match_reveal: 'Match Reveal',
  event_reminder: 'Event Reminder',
  new_rsvps: 'New RSVPs Update',
  question_set: 'Question Set',
};

export function SMSHistoryPanel({
  eventId,
  attendeeId,
  attendeeName,
  attendeePhone,
  isOpen,
  onClose,
}: SMSHistoryPanelProps) {
  const [data, setData] = useState<SMSHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Fetch SMS history when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, eventId, attendeeId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}/sms-history`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Failed to load SMS history');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (messageId: string) => {
    setRetrying(messageId);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}/sms-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Retry failed');
      }

      toast.success('Message resent');
      fetchHistory(); // Refresh to show new message
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAll = async () => {
    setRetrying('all');
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/${attendeeId}/sms-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retryAll: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Retry failed');
      }

      const result = await res.json();
      toast.success(`Resent ${result.retried} message(s)`);
      fetchHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  if (!isOpen) return null;

  const failedCount = data?.summary.failed || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS History
            </h2>
            <p className="text-sm text-text-secondary">
              {attendeeName} {attendeePhone && `• ${attendeePhone}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : data?.messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-text-tertiary mb-2" />
              <p className="text-text-secondary">No SMS messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.messages.map((message) => {
                const errorInfo = getErrorInfo(message.errorCode);
                const canRetry = isRetryable(message.errorCode);
                const isFailed = message.status === 'failed' || message.status === 'undelivered';

                return (
                  <div
                    key={message.id}
                    className="bg-bg-tertiary rounded-lg p-3 space-y-2"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {NOTIFICATION_TYPE_LABELS[message.notificationType] || message.notificationType}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {formatRelativeDate(message.createdAt)}
                        </p>
                      </div>
                      <SMSStatusBadge status={message.status} size="sm" />
                    </div>

                    {/* Message preview */}
                    {message.body && (
                      <p className="text-sm text-text-secondary line-clamp-2">
                        "{message.body}"
                      </p>
                    )}

                    {/* Error details */}
                    {isFailed && errorInfo && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 mt-2">
                        <p className="text-sm font-medium text-red-400">
                          {errorInfo.title}
                        </p>
                        <p className="text-xs text-red-300/80">
                          {errorInfo.description}
                        </p>
                        {canRetry && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleRetry(message.id)}
                            disabled={retrying === message.id}
                          >
                            {retrying === message.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {data && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-tertiary">
                {data.summary.total} message{data.summary.total !== 1 ? 's' : ''} •{' '}
                {data.summary.delivered} delivered •{' '}
                {data.summary.failed} failed
              </p>
              {failedCount > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={retrying === 'all'}
                >
                  {retrying === 'all' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Retry All Failed
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Modal opens/closes correctly
- [ ] Fetches and displays SMS history
- [ ] Shows loading state
- [ ] Shows empty state when no messages
- [ ] Displays each message with type, date, status badge, preview
- [ ] Shows error details for failed messages
- [ ] Retry button works for individual messages
- [ ] "Retry All Failed" button appears when multiple failures
- [ ] Summary stats shown in footer

---

### Task 2.5: Add SMS History Trigger to Attendee List

**Description**: Add SMS history icon/button to attendee table rows
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.4
**Can run parallel with**: None

**Technical Requirements**:

Find the attendee list component (likely `src/components/events/AttendeeTable.tsx` or similar) and add:

1. Import SMSHistoryPanel
2. Add state for selected attendee
3. Add MessageSquare icon button to row actions
4. Render SMSHistoryPanel modal

**Example integration**:

```typescript
import { MessageSquare } from 'lucide-react';
import { SMSHistoryPanel } from './SMSHistoryPanel';

// In component state:
const [smsHistoryAttendee, setSmsHistoryAttendee] = useState<{
  id: string;
  name: string;
  phone: string | null;
} | null>(null);

// In row actions:
<Button
  variant="ghost"
  size="icon"
  onClick={() => setSmsHistoryAttendee({
    id: attendee.id,
    name: `${attendee.firstName} ${attendee.lastName || ''}`.trim(),
    phone: attendee.phone,
  })}
  title="View SMS History"
>
  <MessageSquare className="h-4 w-4" />
</Button>

// At component bottom:
<SMSHistoryPanel
  eventId={eventId}
  attendeeId={smsHistoryAttendee?.id || ''}
  attendeeName={smsHistoryAttendee?.name || ''}
  attendeePhone={smsHistoryAttendee?.phone || null}
  isOpen={!!smsHistoryAttendee}
  onClose={() => setSmsHistoryAttendee(null)}
/>
```

**Implementation Steps**:
1. Find attendee list/table component
2. Add state for tracking which attendee's SMS history to show
3. Add MessageSquare button to row actions
4. Import and render SMSHistoryPanel
5. Test opening panel for different attendees

**Acceptance Criteria**:
- [ ] MessageSquare icon visible in attendee row actions
- [ ] Clicking icon opens SMS history panel for that attendee
- [ ] Panel shows correct attendee's history
- [ ] Panel closes properly

---

## Phase 3: Retry Functionality

### Task 3.1: Create SMS Retry API Endpoint

**Description**: Build API route to retry failed SMS messages
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.3 (sendSMS with tracking)
**Can run parallel with**: None

**Technical Requirements**:

Create `src/app/api/events/[eventId]/attendees/[attendeeId]/sms-retry/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkEventAccess, checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';
import { sendSMS, NotificationType } from '@/lib/notifications/sms';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string; attendeeId: string }>;
};

const RetryRequestSchema = z.object({
  messageId: z.string().optional(),
  retryAll: z.boolean().optional(),
}).refine(
  (data) => data.messageId || data.retryAll,
  { message: 'Either messageId or retryAll must be provided' }
);

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId, attendeeId } = await context.params;

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Check event access (curate permission for retry)
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    // Parse request
    const body = await request.json();
    const { messageId, retryAll } = RetryRequestSchema.parse(body);

    // Get attendee info (need phone number)
    const attendee = await prisma.eventAttendee.findFirst({
      where: { id: attendeeId, eventId },
      select: { id: true, phone: true, firstName: true },
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    if (!attendee.phone) {
      return NextResponse.json({ error: 'Attendee has no phone number' }, { status: 400 });
    }

    // Get messages to retry
    const whereClause: {
      eventId: string;
      attendeeId: string;
      status: { in: string[] };
      id?: string;
    } = {
      eventId,
      attendeeId,
      status: { in: ['failed', 'undelivered'] },
    };

    if (messageId) {
      whereClause.id = messageId;
    }

    const failedMessages = await prisma.sMSMessage.findMany({
      where: whereClause,
      select: {
        id: true,
        body: true,
        notificationType: true,
      },
    });

    if (failedMessages.length === 0) {
      return NextResponse.json({
        success: true,
        retried: 0,
        results: [],
        message: messageId ? 'Message not found or not failed' : 'No failed messages to retry',
      });
    }

    // Retry each message
    const results: Array<{
      originalMessageId: string;
      newMessageId: string | null;
      status: 'queued' | 'failed';
      error?: string;
    }> = [];

    for (const msg of failedMessages) {
      if (!msg.body) {
        results.push({
          originalMessageId: msg.id,
          newMessageId: null,
          status: 'failed',
          error: 'Original message body not available',
        });
        continue;
      }

      const smsResult = await sendSMS({
        to: attendee.phone,
        body: msg.body,
        eventId,
        attendeeId,
        notificationType: msg.notificationType as NotificationType,
      });

      results.push({
        originalMessageId: msg.id,
        newMessageId: smsResult.dbRecordId || null,
        status: smsResult.success ? 'queued' : 'failed',
        error: smsResult.error,
      });
    }

    const retriedCount = results.filter((r) => r.status === 'queued').length;

    return NextResponse.json({
      success: true,
      retried: retriedCount,
      results,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error('[SMS Retry] Error:', error);
    return NextResponse.json({ error: 'Failed to retry message(s)' }, { status: 500 });
  }
}
```

**Implementation Steps**:
1. Create route file with proper directory structure
2. Implement auth and permission checks
3. Parse and validate request body
4. Fetch failed messages
5. Retry each message using sendSMS()
6. Return results

**Acceptance Criteria**:
- [ ] Requires authentication and curate permission
- [ ] Retries single message when messageId provided
- [ ] Retries all failed messages when retryAll is true
- [ ] Creates new SMSMessage records (doesn't modify originals)
- [ ] Returns detailed results for each retry attempt
- [ ] Handles missing message body gracefully

---

## Summary

### Task Count by Phase

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 4 | Core infrastructure (schema, webhook, sendSMS, route updates) |
| Phase 2 | 5 | UI for SMS history (API, errors util, badge, panel, integration) |
| Phase 3 | 1 | Retry functionality (retry API) |
| **Total** | **10** | MVP implementation |

### Dependency Graph

```
Phase 1:
Task 1.1 (Schema) → Task 1.2 (Webhook)
                 → Task 1.3 (sendSMS) → Task 1.4 (Route updates)

Phase 2:
Task 1.1 → Task 2.1 (History API)
         → Task 2.2 (Error util)   → Task 2.4 (Panel)
         → Task 2.3 (Badge)        → Task 2.5 (Integration)

Phase 3:
Task 1.3 → Task 3.1 (Retry API)
Task 2.4 → Task 3.1 (uses retry in UI)
```

### Parallel Execution Opportunities

- **Task 1.2 and 1.3** can run in parallel after 1.1
- **Task 2.1, 2.2, 2.3** can all run in parallel after 1.1
- **Task 2.4** depends on 2.1, 2.2, 2.3

### Estimated Time

- Phase 1: ~3 hours
- Phase 2: ~2 hours
- Phase 3: ~1.5 hours
- **Total: ~6.5 hours**
