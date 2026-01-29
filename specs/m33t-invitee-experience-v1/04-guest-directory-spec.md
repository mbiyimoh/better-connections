# M33T Guest Directory Access

**Status:** Ready for Implementation
**Author:** Claude Code
**Date:** 2026-01-27
**Slug:** m33t-invitee-experience-v1-directory
**Depends On:**
- `02-specification.md` (Auth Foundation)
- `03-guest-dashboard-spec.md` (Dashboard routes)
**Related Ideation:** `01-ideation.md` (Section 7, Spec C)

---

## Overview

Enable authenticated M33T invitees to browse other attendees for events they're invited to. The directory provides a searchable, filterable view of confirmed and maybe attendees with profile modals, reusing existing attendee card and trading card components from the public landing page.

---

## Background / Problem Statement

### Current State
- Public landing pages show attendee lists but require no authentication
- Authenticated invitees have no dedicated space to explore fellow attendees
- No search or filter capabilities on public pages
- No distinction between "you're attending this event" and "you're browsing publicly"

### Why This Matters
1. **Pre-Event Networking:** Invitees can identify people they want to meet before the event
2. **Event Value Perception:** Seeing quality attendees reinforces decision to attend
3. **Profile Completeness Motivation:** Seeing others' profiles encourages completing your own
4. **Authenticated Context:** Can show richer data than public view (within privacy bounds)

### Core Problem (First Principles)
Authenticated attendees need to browse other attendees with:
- Search by name
- Filter by RSVP status (confirmed/maybe)
- Full profile viewing via modal
- Clear indication of their own presence in the list

---

## Goals

- Create directory page at `/guest/events/[eventId]/directory`
- Enable search by attendee name
- Enable filter by RSVP status (All, Confirmed, Maybe)
- Display attendee cards in responsive grid
- Show full profile via modal on card click
- Highlight current user's card in the list
- Reuse existing AttendeeCard and ProfileModal components

---

## Non-Goals

- Real-time attendee updates (polling/websockets)
- Attendee-to-attendee messaging
- Save/favorite attendees for later
- Export attendee list
- Advanced filters (by expertise, company, etc.) - future enhancement
- Match reveal integration (separate spec)

---

## Technical Dependencies

### From Spec A (Auth Foundation)
- Authenticated session via middleware
- EventAttendee → User linking

### From Spec B (Dashboard)
- GuestShell layout
- Event detail page navigation

### Existing Components to Reuse
| Component | Location | Adaptation |
|-----------|----------|------------|
| AttendeeCard | `src/app/m33t/[slug]/components/AttendeeCard.tsx` | Direct reuse |
| ProfileModal | `src/app/m33t/[slug]/components/ProfileModal.tsx` | Direct reuse |
| TradingCard | `src/components/m33t/TradingCard.tsx` | Inside ProfileModal |

---

## Detailed Design

### 1. Route Structure

```
/guest/events/[eventId]/directory    # Attendee directory for specific event
```

### 2. Data Requirements

#### API Response Shape
```typescript
interface DirectoryAttendee {
  id: string;
  name: string;
  photoUrl: string | null;
  headline: string | null;  // role @ company
  rsvpStatus: 'CONFIRMED' | 'MAYBE';
  isCurrentUser: boolean;
  profile: {
    role?: string;
    company?: string;
    location?: string;
    expertise: string[];
    currentFocus?: string;
    seekingSummary?: string;
    offeringSummary?: string;
  };
  tradingCard: {
    // L3 trading card data for modal
    name: string;
    photoUrl?: string;
    headline?: string;
    expertise: string[];
    currentFocus?: string;
    seekingSummary?: string;
    offeringSummary?: string;
    whyMatch?: string[];
    conversationStarters?: string[];
  };
}
```

### 3. Directory Page

```typescript
// src/app/guest/events/[eventId]/directory/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { DirectoryClient } from './DirectoryClient';
import { ArrowLeft } from 'lucide-react';

export default async function GuestDirectoryPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await getCurrentUser();

  // Verify user is an attendee of this event
  const userAttendee = await prisma.eventAttendee.findFirst({
    where: {
      eventId: params.eventId,
      userId: user!.id,
    },
  });

  if (!userAttendee) {
    notFound();
  }

  // Fetch event with all confirmed/maybe attendees
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      attendees: {
        where: {
          rsvpStatus: { in: ['CONFIRMED', 'MAYBE'] },
        },
        orderBy: [
          { rsvpStatus: 'asc' }, // CONFIRMED first
          { profile: 'desc' },   // Those with profiles first (approximation)
        ],
        select: {
          id: true,
          userId: true,
          rsvpStatus: true,
          profile: true,
          tradingCard: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Transform attendees for client
  const attendees = event.attendees.map((attendee) => {
    const profile = (attendee.profile as Record<string, any>) || {};
    const tradingCard = (attendee.tradingCard as Record<string, any>) || {};

    return {
      id: attendee.id,
      name: profile.name || tradingCard.name || 'Anonymous',
      photoUrl: profile.photoUrl || tradingCard.photoUrl || null,
      headline: profile.role
        ? `${profile.role}${profile.company ? ` @ ${profile.company}` : ''}`
        : tradingCard.headline || null,
      rsvpStatus: attendee.rsvpStatus as 'CONFIRMED' | 'MAYBE',
      isCurrentUser: attendee.userId === user!.id,
      profile: {
        role: profile.role,
        company: profile.company,
        location: profile.location,
        expertise: profile.expertise || [],
        currentFocus: profile.currentFocus,
        seekingSummary: profile.seekingSummary,
        offeringSummary: profile.offeringSummary,
      },
      tradingCard: {
        name: tradingCard.name || profile.name || 'Anonymous',
        photoUrl: tradingCard.photoUrl || profile.photoUrl,
        headline: tradingCard.headline,
        expertise: tradingCard.expertise || profile.expertise || [],
        currentFocus: tradingCard.currentFocus || profile.currentFocus,
        seekingSummary: tradingCard.seekingSummary || profile.seekingSummary,
        offeringSummary: tradingCard.offeringSummary || profile.offeringSummary,
        whyMatch: tradingCard.whyMatch || [],
        conversationStarters: tradingCard.conversationStarters || [],
      },
    };
  });

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/guest/events/${params.eventId}`}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Event
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Guest Directory
        </h1>
        <p className="text-text-secondary mt-1">
          {event.name} &middot; {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Directory */}
      <DirectoryClient
        attendees={attendees}
        eventName={event.name}
      />
    </div>
  );
}
```

### 4. Directory Client Component

```typescript
// src/app/guest/events/[eventId]/directory/DirectoryClient.tsx

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, CheckCircle, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AttendeeCard } from './AttendeeCard';
import { ProfileModal } from './ProfileModal';

type RsvpFilter = 'all' | 'confirmed' | 'maybe';

interface DirectoryAttendee {
  id: string;
  name: string;
  photoUrl: string | null;
  headline: string | null;
  rsvpStatus: 'CONFIRMED' | 'MAYBE';
  isCurrentUser: boolean;
  profile: Record<string, any>;
  tradingCard: Record<string, any>;
}

interface DirectoryClientProps {
  attendees: DirectoryAttendee[];
  eventName: string;
}

export function DirectoryClient({ attendees, eventName }: DirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<DirectoryAttendee | null>(null);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.headline?.toLowerCase().includes(searchQuery.toLowerCase());

      // RSVP filter
      const matchesRsvp =
        rsvpFilter === 'all' ||
        (rsvpFilter === 'confirmed' && attendee.rsvpStatus === 'CONFIRMED') ||
        (rsvpFilter === 'maybe' && attendee.rsvpStatus === 'MAYBE');

      return matchesSearch && matchesRsvp;
    });
  }, [attendees, searchQuery, rsvpFilter]);

  // Count by status
  const confirmedCount = attendees.filter(a => a.rsvpStatus === 'CONFIRMED').length;
  const maybeCount = attendees.filter(a => a.rsvpStatus === 'MAYBE').length;

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="pl-10"
          />
        </div>

        {/* RSVP Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={rsvpFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRsvpFilter('all')}
            className={cn(
              rsvpFilter === 'all' && 'bg-gold-primary hover:bg-gold-light'
            )}
          >
            <Users className="h-4 w-4 mr-1.5" />
            All ({attendees.length})
          </Button>
          <Button
            variant={rsvpFilter === 'confirmed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRsvpFilter('confirmed')}
            className={cn(
              rsvpFilter === 'confirmed' && 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Confirmed ({confirmedCount})
          </Button>
          <Button
            variant={rsvpFilter === 'maybe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRsvpFilter('maybe')}
            className={cn(
              rsvpFilter === 'maybe' && 'bg-amber-600 hover:bg-amber-700'
            )}
          >
            <HelpCircle className="h-4 w-4 mr-1.5" />
            Maybe ({maybeCount})
          </Button>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-sm text-text-secondary">
          {filteredAttendees.length} result{filteredAttendees.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {/* Attendee Grid */}
      {filteredAttendees.length > 0 ? (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredAttendees.map((attendee) => (
              <motion.div
                key={attendee.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <AttendeeCard
                  attendee={attendee}
                  onClick={() => setSelectedAttendee(attendee)}
                  isCurrentUser={attendee.isCurrentUser}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">No attendees found</h3>
          <p className="text-text-secondary mt-1">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'No attendees match your filters'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        attendee={selectedAttendee}
        isOpen={!!selectedAttendee}
        onClose={() => setSelectedAttendee(null)}
      />
    </div>
  );
}
```

### 5. Attendee Card Component

```typescript
// src/app/guest/events/[eventId]/directory/AttendeeCard.tsx

'use client';

import { CheckCircle, HelpCircle, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AttendeeCardProps {
  attendee: {
    id: string;
    name: string;
    photoUrl: string | null;
    headline: string | null;
    rsvpStatus: 'CONFIRMED' | 'MAYBE';
    profile: {
      expertise?: string[];
    };
  };
  onClick: () => void;
  isCurrentUser?: boolean;
}

export function AttendeeCard({ attendee, onClick, isCurrentUser }: AttendeeCardProps) {
  const initials = attendee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-gold-primary/50 hover:shadow-lg',
        isCurrentUser && 'border-gold-primary ring-1 ring-gold-primary/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={attendee.photoUrl || undefined} />
              <AvatarFallback className="bg-gold-subtle text-gold-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Status Indicator */}
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-bg-primary flex items-center justify-center',
                attendee.rsvpStatus === 'CONFIRMED'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              )}
            >
              {attendee.rsvpStatus === 'CONFIRMED' ? (
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              ) : (
                <HelpCircle className="h-2.5 w-2.5 text-white" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-primary truncate">
                {attendee.name}
              </h3>
              {isCurrentUser && (
                <Badge variant="outline" className="text-gold-primary border-gold-primary/50 text-xs">
                  You
                </Badge>
              )}
            </div>
            {attendee.headline && (
              <p className="text-sm text-text-secondary truncate mt-0.5">
                {attendee.headline}
              </p>
            )}
          </div>
        </div>

        {/* Expertise Tags */}
        {attendee.profile.expertise && attendee.profile.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {attendee.profile.expertise.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gold-subtle/50 text-gold-primary text-xs"
              >
                {tag}
              </Badge>
            ))}
            {attendee.profile.expertise.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{attendee.profile.expertise.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6. Profile Modal Component

```typescript
// src/app/guest/events/[eventId]/directory/ProfileModal.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TradingCard } from '@/components/m33t/TradingCard';

interface ProfileModalProps {
  attendee: {
    id: string;
    name: string;
    isCurrentUser: boolean;
    tradingCard: Record<string, any>;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ attendee, isOpen, onClose }: ProfileModalProps) {
  if (!attendee) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bg-secondary rounded-xl border border-border shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Content */}
              <div className="p-6">
                {attendee.isCurrentUser && (
                  <div className="mb-4 px-3 py-2 bg-gold-subtle/30 rounded-lg text-sm text-gold-primary text-center">
                    This is your profile
                  </div>
                )}

                <TradingCard
                  data={attendee.tradingCard}
                  level="L3"
                  expandable={false}
                  defaultExpanded={true}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## User Experience

### Directory Access Flow
1. User navigates to event detail page (`/guest/events/[eventId]`)
2. Clicks "Browse Attendees" button
3. Arrives at directory with all confirmed/maybe attendees
4. Can search by name or filter by RSVP status
5. Clicks attendee card to view full profile in modal
6. Own card is highlighted with "You" badge

### First-Time Experience
1. After RSVP completion, user is encouraged to view their profile card
2. Profile page shows "This is how you appear to others"
3. "Browse Attendees" link takes them to directory
4. They can see how they appear alongside others

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/components/directory/AttendeeCard.test.tsx

describe('AttendeeCard', () => {
  it('renders attendee name and headline', () => {
    render(<AttendeeCard attendee={mockAttendee} onClick={jest.fn()} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineer @ Acme')).toBeInTheDocument();
  });

  it('shows "You" badge for current user', () => {
    render(<AttendeeCard attendee={mockAttendee} onClick={jest.fn()} isCurrentUser />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('limits expertise tags to 3 with overflow count', () => {
    const attendee = { ...mockAttendee, profile: { expertise: ['A', 'B', 'C', 'D', 'E'] } };
    render(<AttendeeCard attendee={attendee} onClick={jest.fn()} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
```

### E2E Tests
```typescript
// e2e/guest-directory.spec.ts

test.describe('Guest Directory', () => {
  test('can view attendee directory', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events/event-1/directory');

    await expect(page.locator('h1')).toContainText('Guest Directory');
    await expect(page.locator('[data-testid="attendee-card"]')).toHaveCountGreaterThan(0);
  });

  test('can search attendees by name', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events/event-1/directory');

    await page.fill('input[placeholder="Search by name..."]', 'John');
    await expect(page.locator('[data-testid="attendee-card"]')).toHaveCount(1);
  });

  test('can filter by RSVP status', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events/event-1/directory');

    await page.click('text=Confirmed');
    // Verify only confirmed attendees shown
  });

  test('can open attendee profile modal', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events/event-1/directory');

    await page.click('[data-testid="attendee-card"]').first();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('current user card is highlighted', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/guest/events/event-1/directory');

    await expect(page.locator('text=You')).toBeVisible();
  });
});
```

---

## Security Considerations

### Access Control
- Only authenticated users who are attendees can access directory
- Server-side verification of EventAttendee record
- No access to declined or pending attendees' profiles

### Data Privacy
- Email and phone numbers NOT exposed in directory
- Only display fields (name, role, company, expertise) shown
- Profile modal uses same data as public landing page

### Rate Limiting
- No specific rate limiting needed (read-only, attendee-only access)
- Standard API rate limits apply

---

## Performance Considerations

### Initial Load
- Server-side data fetching (no loading state needed)
- Single query with includes (no N+1)
- Attendee list cached in client state

### Client-Side Filtering
- All filtering happens in memory (no API calls)
- useMemo prevents recalculation on unrelated state changes
- Grid uses CSS grid (no virtualization needed for <100 attendees)

### Future Optimization (if needed)
- Add pagination for events with 100+ attendees
- Add react-window virtualization for very large lists
- Add search debouncing if API-based search is implemented

---

## Implementation Phases

### Phase 1: Core Directory
1. Create `/guest/events/[eventId]/directory/page.tsx`
2. Implement DirectoryClient with search and filters
3. Create AttendeeCard component
4. Create ProfileModal component

### Phase 2: Polish
1. Add empty states
2. Add loading skeleton (if needed)
3. Add animations for card transitions
4. Mobile responsive design

### Phase 3: Testing
1. Unit tests for AttendeeCard
2. E2E tests for directory flows
3. Accessibility testing

---

## Open Questions (Resolved)

All questions resolved from ideation doc:
- **Access timing:** Immediately after RSVP (per user decision)
- **Search scope:** Name only for V1 (expertise search is future)
- **Profile depth:** Full L3 trading card in modal

---

## References

- Dashboard Spec: `specs/m33t-invitee-experience-v1/03-guest-dashboard-spec.md`
- Auth Foundation: `specs/m33t-invitee-experience-v1/02-specification.md`
- Ideation: `specs/m33t-invitee-experience-v1/01-ideation.md`
- Landing Page Components: `src/app/m33t/[slug]/components/`
- TradingCard: `src/components/m33t/TradingCard.tsx`
