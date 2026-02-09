# M33T New RSVPs Notification System

**Status:** Draft
**Author:** Claude Code
**Date:** 2026-02-06
**Slug:** m33t-new-rsvps-notification
**Related:** [Ideation](./01-ideation.md), [M33T Architecture Guide](../../developer-guides/07-m33t-architecture-guide.md)

---

## Overview

Add the ability for event organizers to send SMS notifications to CONFIRMED attendees informing them that new people have RSVPed since they did. Each attendee receives a personalized count and link to a page showing only the attendees who RSVPed after them.

**Example SMS:** "7 more people RSVP'd for No Edges on March 12! See who they are: bettercontacts.ai/m33t/no-edges/new-rsvps/abc123"

---

## Background / Problem Statement

Event organizers want to drive engagement and excitement by notifying confirmed attendees about event momentum. Currently, there's no way to tell RSVPed attendees that others have joined since them. This feature leverages social proof psychology (FOMO) to:

1. Reinforce attendees' decision to RSVP
2. Encourage attendees to complete their profiles (to make a good impression)
3. Build anticipation for the event
4. Give attendees a preview of who else will be there

---

## Goals

- Allow organizers to send "new RSVPs" SMS notifications to confirmed attendees
- Each attendee sees only people who RSVPed AFTER them (personalized baseline)
- Provide a dedicated page showing these new attendees with profile cards
- Reuse existing AttendeeCard component for consistency
- Track notification history to enable follow-up notifications
- Skip attendees with zero new RSVPs (no value in empty notification)

---

## Non-Goals

- Automated/scheduled notifications (manual trigger only)
- Email channel (SMS only for MVP)
- Push notifications or in-app notifications
- Including MAYBE responses (CONFIRMED only per user decision)
- Aggregate-only mode without names
- Deep customization of the SMS message text

---

## Technical Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Twilio | existing | SMS delivery |
| Next.js | ^15.0.0 | Page routing, API routes |
| Prisma | ^6.19.1 | Database queries, migration |
| jsonwebtoken | existing | Token generation/verification |

No new dependencies required.

---

## Detailed Design

### Database Schema Change

Add one field to `EventAttendee`:

```prisma
model EventAttendee {
  // ... existing fields

  newRsvpsNotifiedAt DateTime?  // Last time "new RSVPs" notification was sent to this attendee
}
```

**Migration:** Simple `ALTER TABLE` adding nullable DateTime column.

### API Endpoint: Trigger Notification

**`POST /api/events/[eventId]/notify`**

Extend existing endpoint with new type:

```typescript
// Request body
{
  type: 'new_rsvps',
  channels: 'sms'  // Only SMS supported for this type
}

// Response
{
  success: true,
  sent: 45,
  skipped: 12,      // Attendees with 0 new RSVPs
  failed: 2,
  smsSent: 45,
  total: 59,
  channels: 'sms',
  results: [
    {
      attendeeId: string,
      name: string,
      newRsvpCount: number,
      smsSent: boolean,
      skipped: boolean,  // True if newRsvpCount was 0
      errors: string[]
    }
  ]
}
```

**Processing Logic:**

```typescript
// 1. Get all CONFIRMED attendees with phone numbers
const eligibleAttendees = await prisma.eventAttendee.findMany({
  where: {
    eventId,
    rsvpStatus: 'CONFIRMED',
    phone: { not: null },
  },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    rsvpRespondedAt: true,
  },
});

// 2. For each attendee, count new RSVPs since their RSVP
for (const attendee of eligibleAttendees) {
  const newRsvpCount = await prisma.eventAttendee.count({
    where: {
      eventId,
      rsvpStatus: 'CONFIRMED',
      rsvpRespondedAt: { gt: attendee.rsvpRespondedAt },
      id: { not: attendee.id },
    },
  });

  // 3. Skip if no new RSVPs
  if (newRsvpCount === 0) {
    results.push({ ...attendee, skipped: true, newRsvpCount: 0 });
    continue;
  }

  // 4. Generate personalized URL
  const token = generateRSVPToken(eventId, attendee.email, attendee.id, event.date);
  const url = `${baseUrl}/m33t/${event.slug}/new-rsvps/${token}`;

  // 5. Send SMS
  const sms = SMS_TEMPLATES.newRsvps({
    eventName: event.name,
    eventDate: formatEventDate(event.date),
    newCount: newRsvpCount,
    viewUrl: url,
  });

  await sendSMS({ to: attendee.phone, body: sms });

  // 6. Update notification timestamp
  await prisma.eventAttendee.update({
    where: { id: attendee.id },
    data: { newRsvpsNotifiedAt: new Date() },
  });
}
```

### SMS Template

**File:** `src/lib/notifications/sms.ts`

```typescript
interface NewRsvpsParams {
  eventName: string;
  eventDate: string;
  newCount: number;
  viewUrl: string;
}

// Add to SMS_TEMPLATES object
newRsvps: (params: NewRsvpsParams) =>
  `${params.newCount} more people RSVP'd for ${params.eventName} on ${params.eventDate}! See who they are: ${params.viewUrl}`,
```

**Character count:** ~80 chars + URL (~50 chars) = ~130 chars (under 160 limit)

### API Endpoint: Fetch New RSVPs

**`GET /api/public/events/[slug]/new-rsvps`**

**Query Parameters:**
- `token` (required): JWT token for authentication
- `since` (optional): ISO timestamp override (defaults to attendee's rsvpRespondedAt)

**Response:**

```typescript
interface NewRsvpsResponse {
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
  };
  viewer: {
    id: string;
    name: string;
    rsvpRespondedAt: string;
  };
  newAttendees: PublicAttendee[];  // Same shape as existing landing page
  totalCount: number;
}
```

**Processing Logic:**

```typescript
// 1. Verify token
const payload = verifyRSVPToken(token);
if (!payload) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}

// 2. Verify token matches event slug
const attendee = await prisma.eventAttendee.findUnique({
  where: { id: payload.attendeeId },
  include: { event: { select: { slug: true } } },
});

if (attendee?.event.slug !== slug) {
  return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
}

// 3. Get baseline timestamp
const sinceTimestamp = since
  ? new Date(since)
  : attendee.rsvpRespondedAt;

// 4. Fetch new CONFIRMED attendees
const newAttendees = await prisma.eventAttendee.findMany({
  where: {
    eventId: attendee.eventId,
    rsvpStatus: 'CONFIRMED',
    rsvpRespondedAt: { gt: sinceTimestamp },
    id: { not: attendee.id },
  },
  orderBy: { rsvpRespondedAt: 'desc' },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    rsvpRespondedAt: true,
    profile: true,
    profileOverrides: true,
    tradingCard: true,
    displayOrder: true,
    profileRichness: true,
    createdAt: true,
    // Exclude: email, phone, questionnaireResponses
  },
});

// 5. Transform to PublicAttendee format (reuse existing logic)
const publicAttendees = newAttendees.map(transformToPublicAttendee);

return NextResponse.json({
  event: { id, name, slug, date },
  viewer: { id: attendee.id, name: getAttendeeName(attendee), rsvpRespondedAt },
  newAttendees: publicAttendees,
  totalCount: publicAttendees.length,
});
```

### Public Page: View New RSVPs

**Route:** `/m33t/[slug]/new-rsvps/[token]/page.tsx`

**Server Component:**

```typescript
export default async function NewRsvpsPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  // Verify token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return <TokenInvalidMessage />;
  }

  if (isTokenExpired(token)) {
    return <TokenExpiredMessage eventName="this event" />;
  }

  return <NewRsvpsPageClient slug={slug} token={token} />;
}
```

**Client Component (`NewRsvpsPageClient.tsx`):**

```typescript
'use client';

export function NewRsvpsPageClient({ slug, token }: Props) {
  const [data, setData] = useState<NewRsvpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAttendee, setSelectedAttendee] = useState<PublicAttendee | null>(null);

  useEffect(() => {
    fetch(`/api/public/events/${slug}/new-rsvps?token=${token}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug, token]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorState />;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-secondary/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/m33t/${slug}?token=${token}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {data.event.name}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-text-primary">
              {data.totalCount} New {data.totalCount === 1 ? 'Person' : 'People'} Since You RSVP'd
            </h1>
            <p className="text-text-secondary">
              for {data.event.name}
            </p>
          </div>

          {/* Attendee grid */}
          {data.totalCount === 0 ? (
            <EmptyState message="No new RSVPs yet. Check back later!" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.newAttendees.map((attendee) => (
                <NewRsvpCard
                  key={attendee.id}
                  attendee={attendee}
                  onClick={() => setSelectedAttendee(attendee)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Profile modal */}
      {selectedAttendee && (
        <ProfileModal
          attendee={selectedAttendee}
          onClose={() => setSelectedAttendee(null)}
        />
      )}
    </div>
  );
}
```

### NewRsvpCard Component

Extends `AttendeeCard` with RSVP timestamp badge:

```typescript
interface NewRsvpCardProps {
  attendee: PublicAttendee & { rsvpRespondedAt: string };
  onClick: () => void;
}

export function NewRsvpCard({ attendee, onClick }: NewRsvpCardProps) {
  return (
    <div className="relative">
      {/* Timestamp badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-gold-subtle text-gold-primary text-xs">
          RSVP'd {formatRelativeDate(attendee.rsvpRespondedAt)}
        </Badge>
      </div>

      {/* Reuse AttendeeCard */}
      <AttendeeCard
        attendee={{ ...attendee, status: 'confirmed' }}
        onClick={onClick}
      />
    </div>
  );
}
```

### Organizer UI: NewRsvpsNotifyDialog

**File:** `src/components/events/NewRsvpsNotifyDialog.tsx`

```typescript
interface NewRsvpsNotifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: Date;
}

export function NewRsvpsNotifyDialog({ ... }: NewRsvpsNotifyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);

  // Fetch preview on open
  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    // Get eligible count and last sent timestamp
    const res = await fetch(`/api/events/${eventId}/notify/preview?type=new_rsvps`);
    const data = await res.json();
    setPreview(data);
    setLastSentAt(data.lastSentAt ? new Date(data.lastSentAt) : null);
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_rsvps', channels: 'sms' }),
      });
      const result = await res.json();
      toast.success(`Sent to ${result.sent} attendees`);
      onClose();
    } catch (error) {
      toast.error('Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  const showWarning = lastSentAt &&
    (Date.now() - lastSentAt.getTime()) < 24 * 60 * 60 * 1000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send New RSVPs Update</DialogTitle>
          <DialogDescription>
            Notify confirmed attendees about others who have RSVPed since them.
          </DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <p className="text-sm text-text-tertiary">Will receive SMS</p>
                <p className="text-2xl font-semibold text-text-primary">
                  {preview.eligibleCount}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-sm text-text-tertiary">Will be skipped</p>
                <p className="text-2xl font-semibold text-text-secondary">
                  {preview.skippedCount}
                </p>
                <p className="text-xs text-text-tertiary">No new RSVPs for them</p>
              </Card>
            </div>

            {/* Warning if sent recently */}
            {showWarning && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You sent this notification {formatRelativeDate(lastSentAt)} ago.
                  Sending again may cause notification fatigue.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview message */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Message preview</p>
              <div className="rounded-lg bg-bg-tertiary p-3 text-sm text-text-primary">
                {preview.eligibleCount > 0
                  ? `"${preview.sampleNewCount} more people RSVP'd for ${eventName} on ${formatEventDate(eventDate)}! See who they are: [link]"`
                  : 'No attendees have new RSVPs to see.'
                }
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !preview?.eligibleCount}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send to {preview?.eligibleCount ?? 0} Attendees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Integration Point: Event Dashboard

Add button to event dashboard alongside existing notification buttons:

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx`

```typescript
// In the notifications section
<Button
  variant="outline"
  onClick={() => setShowNewRsvpsDialog(true)}
  disabled={confirmedCount === 0}
>
  <Sparkles className="h-4 w-4 mr-2" />
  Send New RSVPs Update
</Button>

{showNewRsvpsDialog && (
  <NewRsvpsNotifyDialog
    isOpen={showNewRsvpsDialog}
    onClose={() => setShowNewRsvpsDialog(false)}
    eventId={eventId}
    eventName={event.name}
    eventDate={event.date}
  />
)}
```

---

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `newRsvpsNotifiedAt` field to EventAttendee |
| `src/lib/notifications/sms.ts` | Add `newRsvps` template |
| `src/app/api/events/[eventId]/notify/route.ts` | Handle `type: 'new_rsvps'` |
| `src/app/(dashboard)/events/[eventId]/page.tsx` | Add "Send New RSVPs Update" button |

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/public/events/[slug]/new-rsvps/route.ts` | Public API for fetching new RSVPs |
| `src/app/m33t/[slug]/new-rsvps/[token]/page.tsx` | Server component for new RSVPs page |
| `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpsPageClient.tsx` | Client component with grid layout |
| `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpCard.tsx` | Card with RSVP timestamp badge |
| `src/components/events/NewRsvpsNotifyDialog.tsx` | Organizer trigger dialog |

---

## User Experience

### Organizer Flow

1. Navigate to event dashboard at `/events/[eventId]`
2. In the notification section, click "Send New RSVPs Update"
3. Dialog shows:
   - Count of attendees who will receive SMS
   - Count who will be skipped (no new RSVPs for them)
   - Warning if sent within last 24h
   - Preview of message template
4. Click "Send" to dispatch SMS notifications
5. Toast confirmation shows success count

### Attendee Flow

1. Receive SMS: "7 more people RSVP'd for No Edges on March 12! See who they are: [link]"
2. Click link → opens `/m33t/no-edges/new-rsvps/[token]`
3. See page header: "7 New People Since You RSVP'd"
4. Browse cards of new attendees, each with "RSVP'd 2 hours ago" badge
5. Click any card to see full profile modal
6. "Back to event" link returns to main landing page

### Empty States

- **Organizer:** If no attendees have new RSVPs, dialog shows "No attendees have new RSVPs to see" and disables send button
- **Attendee page:** If somehow reached with 0 results, shows "No new RSVPs yet. Check back later!"

---

## Security Considerations

- **Token authentication:** Same JWT pattern as other RSVP pages
- **Slug verification:** Token must match event slug (prevents cross-event access)
- **Privacy filtering:** Same exclusions as public landing page (no email, phone, questionnaire responses)
- **Rate limiting:** 24-hour warning (soft limit) prevents notification spam
- **Phone validation:** Uses existing `normalizePhone()` for E.164 format

---

## Testing Strategy

### Unit Tests

**`response-aggregation.test.ts`:**
- SMS template generates correct message format
- Character count stays under 160

**`new-rsvps-count.test.ts`:**
- Count excludes requesting attendee
- Count only includes CONFIRMED status
- Count respects timestamp comparison (gt, not gte)

### Integration Tests

**`new-rsvps-api.test.ts`:**
- Returns 401 for invalid/missing token
- Returns 403 for token/slug mismatch
- Returns correct attendees filtered by timestamp
- Excludes private fields (email, phone)
- Sorts by rsvpRespondedAt DESC

### E2E Tests

**`new-rsvps-notification.spec.ts`:**
- Organizer can open dialog and see preview counts
- Send button disabled when no eligible attendees
- Warning shown if sent within 24h
- Attendee page loads and displays cards
- Profile modal opens on card click
- Back link navigates to landing page

---

## Performance Considerations

- **Count query optimization:** Single COUNT query per attendee during notification send (acceptable for <500 attendees)
- **Batch sending:** Could be optimized to batch SMS sends, but Twilio handles rate limiting
- **No pagination needed:** Typical new RSVP count is <50, all fit on one page

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Add `newRsvpsNotifiedAt` field to EventAttendee (migration)
2. Add `newRsvps` SMS template
3. Extend notify API to handle `type: 'new_rsvps'`

### Phase 2: Public Page
4. Create `/api/public/events/[slug]/new-rsvps` endpoint
5. Create `/m33t/[slug]/new-rsvps/[token]` page
6. Create NewRsvpCard component with timestamp badge

### Phase 3: Organizer UI
7. Create NewRsvpsNotifyDialog component
8. Add preview endpoint for eligible counts
9. Integrate button into event dashboard

### Phase 4: Polish
10. Add loading/error states
11. Mobile responsive layout
12. Update CLAUDE.md documentation

---

## Open Questions

None - all clarifications resolved in ideation phase.

---

## References

- [Ideation Document](./01-ideation.md)
- [M33T Architecture Guide](../../developer-guides/07-m33t-architecture-guide.md)
- [SMS Templates](../../src/lib/notifications/sms.ts)
- [Existing Notify API](../../src/app/api/events/[eventId]/notify/route.ts)
- [Public Landing Page](../../src/app/m33t/[slug]/page.tsx)
