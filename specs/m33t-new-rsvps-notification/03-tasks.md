# Task Breakdown: M33T New RSVPs Notification System

**Generated:** 2026-02-06
**Source:** specs/m33t-new-rsvps-notification/02-spec.md
**Last Decompose:** 2026-02-06

---

## Overview

Implement the ability for event organizers to send personalized SMS notifications to CONFIRMED attendees informing them about new RSVPs since their own RSVP, with a dedicated page to view those new attendees.

---

## Phase 1: Database & Core Infrastructure

### Task 1.1: Add newRsvpsNotifiedAt field to EventAttendee
**Description:** Create Prisma migration adding the notification tracking field
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**Technical Requirements:**
- Add nullable DateTime field to EventAttendee model
- Field name: `newRsvpsNotifiedAt`
- Purpose: Track when each attendee last received "new RSVPs" notification

**Implementation:**

```prisma
model EventAttendee {
  // ... existing notification tracking fields (around line 660-666)
  inviteSentAt    DateTime?
  inviteMethod    InviteMethod?
  rsvpReminderSentAt DateTime?
  matchRevealSentAt DateTime?
  eventReminderSentAt DateTime?
  questionSetNotifiedAt DateTime?

  // Add this new field:
  newRsvpsNotifiedAt DateTime?  // Last time "new RSVPs" notification was sent
}
```

**Commands to run:**
```bash
npx prisma migrate dev --name add-new-rsvps-notified-at
```

**Acceptance Criteria:**
- [ ] Migration creates successfully
- [ ] Field appears in Prisma client types
- [ ] Database has nullable DateTime column

---

### Task 1.2: Add newRsvps SMS template
**Description:** Add SMS template function to the SMS_TEMPLATES object
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**File:** `src/lib/notifications/sms.ts`

**Technical Requirements:**
- Add interface for template parameters
- Add template function that generates message under 160 characters
- Follow existing template patterns in SMS_TEMPLATES object

**Implementation:**

Add interface after line 160 (after PhoneVerificationParams):
```typescript
interface NewRsvpsParams {
  eventName: string;
  eventDate: string;  // Formatted as "March 12"
  newCount: number;
  viewUrl: string;
}
```

Add template to SMS_TEMPLATES object (around line 206, before the closing `as const`):
```typescript
/**
 * New RSVPs notification SMS
 */
newRsvps: (params: NewRsvpsParams) =>
  `${params.newCount} more people RSVP'd for ${params.eventName} on ${params.eventDate}! See who they are: ${params.viewUrl}`,
```

**Character count validation:**
- Template body: ~80 characters
- URL: ~50 characters
- Total: ~130 characters (under 160 limit)

**Acceptance Criteria:**
- [ ] Template function added to SMS_TEMPLATES
- [ ] TypeScript types compile correctly
- [ ] Message format matches spec: "{N} more people RSVP'd for {Event} on {Date}! See who they are: {url}"

---

### Task 1.3: Extend notify API to handle new_rsvps type
**Description:** Add new_rsvps notification type to the existing notify endpoint
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None

**File:** `src/app/api/events/[eventId]/notify/route.ts`

**Technical Requirements:**

1. **Update NotifyRequestSchema** (line 20-24):
```typescript
const NotifyRequestSchema = z.object({
  type: z.enum(['invitation', 'rsvp_reminder', 'match_reveal', 'event_reminder', 'new_rsvps']),
  attendeeIds: z.array(z.string()).optional(),
  channels: z.enum(['email', 'sms', 'both', 'none']).optional().default('both'),
});
```

2. **Add new_rsvps case in POST handler** (after line 256, before the results calculation):
```typescript
case 'new_rsvps':
  // Only SMS supported for this notification type
  if (channels !== 'sms') {
    return NextResponse.json(
      { error: 'new_rsvps notifications only support SMS channel', code: 'INVALID_CHANNEL' },
      { status: 400 }
    );
  }

  // Get all CONFIRMED attendees with phone numbers
  const newRsvpsAttendees = await prisma.eventAttendee.findMany({
    where: {
      eventId,
      rsvpStatus: 'CONFIRMED',
      phone: { not: null },
      rsvpRespondedAt: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      rsvpRespondedAt: true,
    },
  });

  const newRsvpsResults: Array<{
    attendeeId: string;
    name: string;
    newRsvpCount: number;
    smsSent: boolean;
    skipped: boolean;
    errors: string[];
  }> = [];

  for (const attendee of newRsvpsAttendees) {
    const attendeeName = `${attendee.firstName} ${attendee.lastName || ''}`.trim();

    // Count RSVPs after this attendee's RSVP
    const newRsvpCount = await prisma.eventAttendee.count({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        rsvpRespondedAt: { gt: attendee.rsvpRespondedAt! },
        id: { not: attendee.id },
      },
    });

    // Skip if no new RSVPs
    if (newRsvpCount === 0) {
      newRsvpsResults.push({
        attendeeId: attendee.id,
        name: attendeeName,
        newRsvpCount: 0,
        smsSent: false,
        skipped: true,
        errors: [],
      });
      continue;
    }

    // Generate personalized URL
    const token = generateRSVPToken(eventId, attendee.email, attendee.id, event.date);
    const viewUrl = `${baseUrl}/m33t/${event.slug}/new-rsvps/${token}`;

    // Format event date
    const eventDate = event.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    // Send SMS
    const formattedPhone = formatPhoneE164(attendee.phone!);
    const smsBody = SMS_TEMPLATES.newRsvps({
      eventName: event.name,
      eventDate,
      newCount: newRsvpCount,
      viewUrl,
    });

    const smsResult = await sendSMS({ to: formattedPhone, body: smsBody });

    if (smsResult.success) {
      // Update notification timestamp
      await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: { newRsvpsNotifiedAt: new Date() },
      });
    }

    newRsvpsResults.push({
      attendeeId: attendee.id,
      name: attendeeName,
      newRsvpCount,
      smsSent: smsResult.success,
      skipped: false,
      errors: smsResult.error ? [smsResult.error] : [],
    });
  }

  const newRsvpsSent = newRsvpsResults.filter(r => r.smsSent).length;
  const newRsvpsSkipped = newRsvpsResults.filter(r => r.skipped).length;
  const newRsvpsFailed = newRsvpsResults.filter(r => !r.smsSent && !r.skipped).length;

  return NextResponse.json({
    success: true,
    sent: newRsvpsSent,
    skipped: newRsvpsSkipped,
    failed: newRsvpsFailed,
    smsSent: newRsvpsSent,
    total: newRsvpsResults.length,
    channels: 'sms',
    results: newRsvpsResults,
  });
```

3. **Update updateNotificationTimestamp function** (line 422-427):
```typescript
const timestampField = {
  invitation: 'inviteSentAt',
  rsvp_reminder: 'rsvpReminderSentAt',
  match_reveal: 'matchRevealSentAt',
  event_reminder: 'eventReminderSentAt',
  new_rsvps: 'newRsvpsNotifiedAt',
}[type];
```

**Acceptance Criteria:**
- [ ] NotifyRequestSchema accepts 'new_rsvps' type
- [ ] API returns 400 if channel is not 'sms' for new_rsvps
- [ ] Each attendee gets personalized count of RSVPs after theirs
- [ ] Attendees with 0 new RSVPs are skipped (not sent SMS)
- [ ] SMS sent with correct template format
- [ ] newRsvpsNotifiedAt updated after successful send
- [ ] Response includes sent/skipped/failed counts

---

## Phase 2: Public Page & API

### Task 2.1: Create public new-rsvps API endpoint
**Description:** Create public API endpoint to fetch new RSVPs for token-authenticated attendee
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**File:** `src/app/api/public/events/[slug]/new-rsvps/route.ts`

**Technical Requirements:**
- Token-based authentication (same pattern as other public endpoints)
- Verify token matches event slug
- Return attendees who RSVPed after the requesting attendee
- Transform to PublicAttendee format (privacy filtering)
- Sort by rsvpRespondedAt DESC (most recent first)

**Full Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import type { Profile, ProfileOverrides } from '@/lib/m33t/schemas';
import { mergeProfileWithOverrides } from '@/lib/m33t/profile-utils';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

interface PublicNewRsvpAttendee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  expertise?: string[];
  currentFocus?: string;
  rsvpRespondedAt: string;
  tradingCard?: {
    background?: string;
    whyInteresting?: string;
    conversationStarters?: string[];
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    // Verify token
    const payload = verifyRSVPToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the requesting attendee and verify slug match
    const viewer = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            date: true,
          },
        },
      },
    });

    if (!viewer) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
    }

    if (viewer.event.slug !== slug) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
    }

    if (!viewer.rsvpRespondedAt) {
      return NextResponse.json({ error: 'Viewer has not RSVPed' }, { status: 400 });
    }

    // Fetch new CONFIRMED attendees (RSVPed after viewer)
    const newAttendees = await prisma.eventAttendee.findMany({
      where: {
        eventId: viewer.event.id,
        rsvpStatus: 'CONFIRMED',
        rsvpRespondedAt: { gt: viewer.rsvpRespondedAt },
        id: { not: viewer.id },
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
        // Exclude: email, phone, questionnaireResponses
      },
    });

    // Transform to public format
    const publicAttendees: PublicNewRsvpAttendee[] = newAttendees.map((attendee) => {
      const baseProfile = attendee.profile as Profile | null;
      const overrides = attendee.profileOverrides as ProfileOverrides | null;
      const displayProfile = mergeProfileWithOverrides(baseProfile, overrides);

      // Extract from trading card or profile
      let title: string | undefined;
      let company: string | undefined;
      let location: string | undefined;

      if (attendee.tradingCard && typeof attendee.tradingCard === 'object') {
        const tc = attendee.tradingCard as Record<string, unknown>;
        if (typeof tc.headline === 'string') title = tc.headline;
        if (typeof tc.company === 'string') company = tc.company;
        if (typeof tc.location === 'string') location = tc.location;
      }

      if (displayProfile) {
        if (!title && displayProfile.role) title = displayProfile.role;
        if (!company && displayProfile.company) company = displayProfile.company;
        if (!location && displayProfile.location) location = displayProfile.location;
      }

      // Parse trading card for display
      let tradingCardData: PublicNewRsvpAttendee['tradingCard'];
      if (attendee.tradingCard && typeof attendee.tradingCard === 'object') {
        const tc = attendee.tradingCard as Record<string, unknown>;
        const background = typeof tc.background === 'string' ? tc.background : undefined;
        let whyInteresting: string | undefined;
        if (Array.isArray(tc.whyMatch) && tc.whyMatch.length > 0) {
          whyInteresting = tc.whyMatch.filter(Boolean).join(' ');
        }
        let conversationStarters: string[] | undefined;
        if (Array.isArray(tc.conversationStarters) && tc.conversationStarters.length > 0) {
          conversationStarters = tc.conversationStarters.filter(
            (s): s is string => typeof s === 'string' && s.length > 0
          );
        }
        if (background || whyInteresting || conversationStarters) {
          tradingCardData = { background, whyInteresting, conversationStarters };
        }
      }

      return {
        id: attendee.id,
        name: `${attendee.firstName}${attendee.lastName ? ' ' + attendee.lastName : ''}`,
        title,
        company,
        location,
        expertise: displayProfile?.expertise,
        currentFocus: displayProfile?.currentFocus,
        rsvpRespondedAt: attendee.rsvpRespondedAt!.toISOString(),
        tradingCard: tradingCardData,
      };
    });

    return NextResponse.json(
      {
        event: {
          id: viewer.event.id,
          name: viewer.event.name,
          slug: viewer.event.slug,
          date: viewer.event.date.toISOString(),
        },
        viewer: {
          id: viewer.id,
          name: `${viewer.firstName}${viewer.lastName ? ' ' + viewer.lastName : ''}`,
          rsvpRespondedAt: viewer.rsvpRespondedAt.toISOString(),
        },
        newAttendees: publicAttendees,
        totalCount: publicAttendees.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching new RSVPs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Acceptance Criteria:**
- [ ] Returns 401 for missing/invalid token
- [ ] Returns 403 for token/slug mismatch
- [ ] Returns only CONFIRMED attendees who RSVPed after viewer
- [ ] Excludes email, phone, questionnaireResponses
- [ ] Sorts by rsvpRespondedAt DESC
- [ ] Includes rsvpRespondedAt in each attendee for timestamp badges
- [ ] Has Cache-Control: no-store header

---

### Task 2.2: Create new-rsvps server page component
**Description:** Create the server component page that verifies token and renders client component
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.3

**File:** `src/app/m33t/[slug]/new-rsvps/[token]/page.tsx`

**Full Implementation:**

```typescript
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { NewRsvpsPageClient } from './NewRsvpsPageClient';

// Reuse error components from existing RSVP pages
function TokenInvalidMessage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white">Invalid Link</h1>
        <p className="text-zinc-400">
          This link is invalid or has been tampered with.
        </p>
      </div>
    </div>
  );
}

function TokenExpiredMessage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white">Link Expired</h1>
        <p className="text-zinc-400">
          This link has expired. Please contact the event organizer for a new link.
        </p>
      </div>
    </div>
  );
}

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
    return <TokenExpiredMessage />;
  }

  return <NewRsvpsPageClient slug={slug} token={token} />;
}
```

**Acceptance Criteria:**
- [ ] Verifies token before rendering client component
- [ ] Shows invalid message for bad tokens
- [ ] Shows expired message for expired tokens
- [ ] Passes slug and token to client component

---

### Task 2.3: Create NewRsvpsPageClient component
**Description:** Create the client component that fetches and displays new RSVPs
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2

**File:** `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpsPageClient.tsx`

**Full Implementation:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewRsvpCard } from './NewRsvpCard';
import { ProfileModal } from '@/app/m33t/[slug]/components/ProfileModal';
import type { PublicAttendee } from '@/app/m33t/[slug]/types';

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
  newAttendees: Array<PublicAttendee & { rsvpRespondedAt: string }>;
  totalCount: number;
}

interface NewRsvpsPageClientProps {
  slug: string;
  token: string;
}

export function NewRsvpsPageClient({ slug, token }: NewRsvpsPageClientProps) {
  const [data, setData] = useState<NewRsvpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<(PublicAttendee & { rsvpRespondedAt: string }) | null>(null);

  useEffect(() => {
    fetch(`/api/public/events/${slug}/new-rsvps?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
          <p className="text-zinc-400">Unable to load new RSVPs. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/m33t/${slug}?token=${token}`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
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
            <h1 className="text-2xl font-semibold text-white">
              {data.totalCount} New {data.totalCount === 1 ? 'Person' : 'People'} Since You RSVP'd
            </h1>
            <p className="text-zinc-400">for {data.event.name}</p>
          </div>

          {/* Attendee grid */}
          {data.totalCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">No new RSVPs yet. Check back later!</p>
            </div>
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
          attendee={{ ...selectedAttendee, status: 'confirmed' }}
          onClose={() => setSelectedAttendee(null)}
        />
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Fetches data from new-rsvps API on mount
- [ ] Shows loading spinner while fetching
- [ ] Shows error state on fetch failure
- [ ] Displays count in header: "X New People Since You RSVP'd"
- [ ] Shows empty state if no new RSVPs
- [ ] Renders grid of NewRsvpCard components
- [ ] Opens ProfileModal on card click
- [ ] Back button links to main event page with token

---

### Task 2.4: Create NewRsvpCard component
**Description:** Create card component with RSVP timestamp badge
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 2.1, 2.2, 2.3

**File:** `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpCard.tsx`

**Full Implementation:**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { AttendeeCard } from '@/app/m33t/[slug]/components/AttendeeCard';
import { formatRelativeDate } from '@/lib/m33t/question-formatting';
import type { PublicAttendee } from '@/app/m33t/[slug]/types';

interface NewRsvpCardProps {
  attendee: PublicAttendee & { rsvpRespondedAt: string };
  onClick: () => void;
}

export function NewRsvpCard({ attendee, onClick }: NewRsvpCardProps) {
  return (
    <div className="relative">
      {/* Timestamp badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
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

**Acceptance Criteria:**
- [ ] Displays timestamp badge with relative time (e.g., "RSVP'd 2 hours ago")
- [ ] Badge uses gold/amber styling consistent with M33T brand
- [ ] Reuses existing AttendeeCard component
- [ ] Passes onClick handler through to card

---

## Phase 3: Organizer UI

### Task 3.1: Create preview API endpoint
**Description:** Add preview endpoint to get eligible counts before sending notifications
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.3
**Can run parallel with:** Task 3.2

**File:** `src/app/api/events/[eventId]/notify/preview/route.ts`

**Full Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const PreviewQuerySchema = z.object({
  type: z.enum(['new_rsvps']),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Validate query params
    const validation = PreviewQuerySchema.safeParse({ type });
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    // Auth checks
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all CONFIRMED attendees with phone numbers
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        phone: { not: null },
        rsvpRespondedAt: { not: null },
      },
      select: {
        id: true,
        rsvpRespondedAt: true,
        newRsvpsNotifiedAt: true,
      },
    });

    // Calculate eligible vs skipped
    let eligibleCount = 0;
    let skippedCount = 0;
    let sampleNewCount = 0;
    let lastSentAt: Date | null = null;

    for (const attendee of attendees) {
      // Track most recent notification sent
      if (attendee.newRsvpsNotifiedAt) {
        if (!lastSentAt || attendee.newRsvpsNotifiedAt > lastSentAt) {
          lastSentAt = attendee.newRsvpsNotifiedAt;
        }
      }

      // Count new RSVPs for this attendee
      const newRsvpCount = await prisma.eventAttendee.count({
        where: {
          eventId,
          rsvpStatus: 'CONFIRMED',
          rsvpRespondedAt: { gt: attendee.rsvpRespondedAt! },
          id: { not: attendee.id },
        },
      });

      if (newRsvpCount > 0) {
        eligibleCount++;
        if (sampleNewCount === 0) {
          sampleNewCount = newRsvpCount; // Use first eligible attendee's count for preview
        }
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      eligibleCount,
      skippedCount,
      sampleNewCount,
      lastSentAt: lastSentAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Acceptance Criteria:**
- [ ] Returns eligibleCount (attendees who will receive SMS)
- [ ] Returns skippedCount (attendees with 0 new RSVPs)
- [ ] Returns sampleNewCount for message preview
- [ ] Returns lastSentAt timestamp for 24h warning
- [ ] Requires curate permission

---

### Task 3.2: Create NewRsvpsNotifyDialog component
**Description:** Create the organizer dialog to preview and send new RSVPs notifications
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None

**File:** `src/components/events/NewRsvpsNotifyDialog.tsx`

**Full Implementation:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { formatRelativeDate } from '@/lib/m33t/question-formatting';

interface PreviewData {
  eligibleCount: number;
  skippedCount: number;
  sampleNewCount: number;
  lastSentAt: string | null;
}

interface NewRsvpsNotifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: Date;
}

export function NewRsvpsNotifyDialog({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventDate,
}: NewRsvpsNotifyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Fetch preview when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/events/${eventId}/notify/preview?type=new_rsvps`)
        .then((res) => res.json())
        .then(setPreview)
        .catch(() => toast.error('Failed to load preview'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, eventId]);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_rsvps', channels: 'sms' }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to send');
      }

      toast.success(`Sent to ${result.sent} attendees`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const lastSentAt = preview?.lastSentAt ? new Date(preview.lastSentAt) : null;
  const showWarning = lastSentAt && Date.now() - lastSentAt.getTime() < 24 * 60 * 60 * 1000;
  const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send New RSVPs Update</DialogTitle>
          <DialogDescription>
            Notify confirmed attendees about others who have RSVPed since them.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3 bg-bg-secondary">
                <p className="text-sm text-text-tertiary">Will receive SMS</p>
                <p className="text-2xl font-semibold text-text-primary">{preview.eligibleCount}</p>
              </Card>
              <Card className="p-3 bg-bg-secondary">
                <p className="text-sm text-text-tertiary">Will be skipped</p>
                <p className="text-2xl font-semibold text-text-secondary">{preview.skippedCount}</p>
                <p className="text-xs text-text-tertiary">No new RSVPs for them</p>
              </Card>
            </div>

            {/* Warning if sent recently */}
            {showWarning && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-200">
                  You sent this notification {formatRelativeDate(lastSentAt!.toISOString())} ago.
                  Sending again may cause notification fatigue.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview message */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Message preview</p>
              <div className="rounded-lg bg-bg-tertiary p-3 text-sm text-text-primary">
                {preview.eligibleCount > 0
                  ? `"${preview.sampleNewCount} more people RSVP'd for ${eventName} on ${formattedDate}! See who they are: [link]"`
                  : 'No attendees have new RSVPs to see.'}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || loading || !preview?.eligibleCount}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send to {preview?.eligibleCount ?? 0} Attendees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Fetches preview on dialog open
- [ ] Shows loading state while fetching
- [ ] Displays eligible and skipped counts
- [ ] Shows warning if sent within 24 hours
- [ ] Shows message preview with sample count
- [ ] Send button disabled when no eligible attendees or loading
- [ ] Shows success toast with sent count
- [ ] Closes dialog after successful send

---

### Task 3.3: Integrate button into event dashboard
**Description:** Add "Send New RSVPs Update" button to the event dashboard
**Size:** Small
**Priority:** High
**Dependencies:** Task 3.2
**Can run parallel with:** None

**File:** `src/app/(dashboard)/events/[eventId]/page.tsx` (or wherever notifications section is)

**Technical Requirements:**
1. Import NewRsvpsNotifyDialog component
2. Add state for dialog visibility
3. Add button to notifications section
4. Render dialog conditionally

**Implementation snippet:**

```typescript
// Add import at top
import { NewRsvpsNotifyDialog } from '@/components/events/NewRsvpsNotifyDialog';
import { Sparkles } from 'lucide-react';

// Add state in component
const [showNewRsvpsDialog, setShowNewRsvpsDialog] = useState(false);

// Add button in notifications section (near other notification buttons)
<Button
  variant="outline"
  onClick={() => setShowNewRsvpsDialog(true)}
  disabled={confirmedCount === 0}
>
  <Sparkles className="h-4 w-4 mr-2" />
  Send New RSVPs Update
</Button>

// Add dialog at end of component
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

**Acceptance Criteria:**
- [ ] Button visible in notifications section
- [ ] Button disabled when no confirmed attendees
- [ ] Dialog opens on button click
- [ ] Dialog closes and state resets on close

---

## Phase 4: Polish & Documentation

### Task 4.1: Add loading/error states and mobile responsiveness
**Description:** Ensure all components have proper loading, error, and mobile states
**Size:** Small
**Priority:** Medium
**Dependencies:** Tasks 2.2, 2.3, 3.2
**Can run parallel with:** Task 4.2

**Technical Requirements:**
- Verify loading spinners match M33T amber/gold branding
- Verify error messages are helpful
- Test grid layout at mobile (1 column), tablet (2 columns), desktop (3 columns)
- Ensure touch targets are at least 44x44px on mobile

**Files to verify:**
- `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpsPageClient.tsx`
- `src/app/m33t/[slug]/new-rsvps/[token]/NewRsvpCard.tsx`
- `src/components/events/NewRsvpsNotifyDialog.tsx`

**Acceptance Criteria:**
- [ ] Loading states use amber-500 spinner color
- [ ] Error messages are user-friendly
- [ ] Grid is responsive (1/2/3 columns)
- [ ] Cards are fully visible on mobile
- [ ] Dialog is scrollable on small screens

---

### Task 4.2: Update CLAUDE.md documentation
**Description:** Add documentation about the new RSVPs notification feature
**Size:** Small
**Priority:** Medium
**Dependencies:** All previous tasks
**Can run parallel with:** Task 4.1

**File:** `CLAUDE.md`

**Content to add** (in M33T section):

```markdown
### M33T New RSVPs Notification

**Purpose:** Allow organizers to notify CONFIRMED attendees about new people who RSVPed since them.

**Files:**
- `src/app/api/events/[eventId]/notify/route.ts` - Extended with `type: 'new_rsvps'`
- `src/app/api/events/[eventId]/notify/preview/route.ts` - Preview counts endpoint
- `src/app/api/public/events/[slug]/new-rsvps/route.ts` - Public API for fetching new RSVPs
- `src/app/m33t/[slug]/new-rsvps/[token]/` - Public page components
- `src/components/events/NewRsvpsNotifyDialog.tsx` - Organizer trigger dialog

**Flow:**
1. Organizer clicks "Send New RSVPs Update" in event dashboard
2. Dialog shows eligible count and 24h warning if applicable
3. On send, each CONFIRMED attendee with phone receives personalized SMS
4. Attendees with 0 new RSVPs after them are skipped
5. Attendee clicks link → sees page with new RSVPs sorted by recency
6. Each card shows "RSVP'd X ago" badge

**Gotchas:**
- Only SMS supported (no email channel for this notification type)
- newRsvpsNotifiedAt tracks when notification was sent per attendee
- Uses existing token authentication (same as other RSVP pages)
- Character limit: Template ~130 chars (under 160 SMS limit)
```

**Acceptance Criteria:**
- [ ] Feature documented in CLAUDE.md
- [ ] File list is accurate
- [ ] Flow is described
- [ ] Gotchas noted

---

## Summary

| Phase | Tasks | Est. Complexity |
|-------|-------|-----------------|
| Phase 1: Database & Core | 3 tasks | Medium |
| Phase 2: Public Page | 4 tasks | Medium |
| Phase 3: Organizer UI | 3 tasks | Medium |
| Phase 4: Polish | 2 tasks | Small |
| **Total** | **12 tasks** | |

**Parallel Execution Opportunities:**
- Task 1.1 and 1.2 can run in parallel
- Task 2.2, 2.3, and 2.4 can run in parallel (after 2.1)
- Task 3.1 and the first part of 3.2 can partially overlap
- Task 4.1 and 4.2 can run in parallel

**Critical Path:**
1.1 → 1.3 → 2.1 → 2.2/2.3 → 3.1 → 3.2 → 3.3 → 4.x
