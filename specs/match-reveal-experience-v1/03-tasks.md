# Task Breakdown: Match Reveal Experience V1

**Generated:** 2026-01-28
**Source:** specs/match-reveal-experience-v1/01-specification.md
**Last Decompose:** 2026-01-28

---

## Overview

Implementation of the attendee-facing match reveal experience for M33T events. Attendees receive notifications when matches are ready, access them via RSVP token URL, see a simple intro animation, then browse matches in a card-based interface with modal details.

**Key Features:**
- Simple fade-in intro animation on first view
- Match cards showing name, headline, why-match teaser, seeking/offering (no score)
- Modal overlay for full match details
- "Coming soon" placeholder for pre-reveal access
- View tracking (first/last viewed timestamps)

---

## Phase 1: Database & Infrastructure

### Task 1.1: Database Migration - Add View Tracking Fields

**Description:** Add matchesFirstViewedAt and matchesLastViewedAt fields to EventAttendee model
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**Technical Requirements:**

Add the following fields to EventAttendee in `prisma/schema.prisma`:

```prisma
model EventAttendee {
  // ... existing fields ...

  // Match reveal tracking (existing)
  matchRevealSentAt    DateTime?  // When notification was sent

  // Match view tracking (NEW)
  matchesFirstViewedAt DateTime?  // When attendee first viewed matches
  matchesLastViewedAt  DateTime?  // When attendee last viewed matches
}
```

**Implementation Steps:**
1. Edit `prisma/schema.prisma` to add the two new DateTime? fields
2. Run `npx prisma migrate dev --name add-match-view-tracking`
3. Run `npx prisma generate` to update the Prisma client

**Acceptance Criteria:**
- [ ] Two new nullable DateTime fields added to EventAttendee
- [ ] Migration runs successfully without data loss
- [ ] Prisma client regenerated with new fields
- [ ] Existing attendee records unaffected (fields null by default)

---

## Phase 2: API Endpoints

### Task 2.1: GET /api/rsvp/[token]/matches - List Matches Endpoint

**Description:** Create API endpoint to return matches for an attendee via their RSVP token
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/api/rsvp/[token]/matches/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRSVPToken } from '@/lib/m33t/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Verify RSVP token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // 2. Get attendee with event
  const attendee = await prisma.eventAttendee.findUnique({
    where: { id: payload.attendeeId },
    include: {
      event: true,
    },
  });

  if (!attendee) {
    return NextResponse.json(
      { error: 'Attendee not found' },
      { status: 404 }
    );
  }

  // 3. Check RSVP status
  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json(
      { error: 'RSVP not confirmed' },
      { status: 403 }
    );
  }

  // 4. Get approved/revealed matches
  const matches = await prisma.match.findMany({
    where: {
      attendeeId: attendee.id,
      status: { in: ['APPROVED', 'REVEALED'] },
    },
    include: {
      matchedWith: true,
    },
    orderBy: { position: 'asc' },
  });

  // 5. Check reveal timing
  const isViewable = areMatchesViewable(attendee.event, attendee, matches.length > 0);

  if (!isViewable) {
    // Return "coming soon" response
    const revealTime = calculateRevealTime(attendee.event);
    return NextResponse.json({
      status: 'coming_soon',
      event: {
        id: attendee.event.id,
        name: attendee.event.name,
        date: attendee.event.date.toISOString(),
      },
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
      },
      message: 'Your matches will be revealed soon!',
      revealTiming: attendee.event.revealTiming,
      estimatedRevealDate: revealTime?.toISOString() || null,
    });
  }

  // 6. Update view timestamps
  const isFirstView = !attendee.matchesFirstViewedAt;
  await prisma.eventAttendee.update({
    where: { id: attendee.id },
    data: {
      matchesLastViewedAt: new Date(),
      ...(isFirstView && { matchesFirstViewedAt: new Date() }),
    },
  });

  // 7. Format and return matches
  const formattedMatches = matches.map((match) => ({
    id: match.id,
    position: match.position,
    matchedWith: {
      id: match.matchedWith.id,
      firstName: match.matchedWith.firstName,
      lastName: match.matchedWith.lastName,
      profile: {
        role: (match.matchedWith.profile as any)?.role || null,
        company: (match.matchedWith.profile as any)?.company || null,
        location: (match.matchedWith.profile as any)?.location || null,
        photoUrl: (match.matchedWith.profile as any)?.photoUrl || null,
      },
      tradingCard: {
        currentFocus: (match.matchedWith.tradingCard as any)?.currentFocus || null,
        seeking: (match.matchedWith.tradingCard as any)?.seekingSummary ||
                 (match.matchedWith.tradingCard as any)?.seeking || null,
        offering: (match.matchedWith.tradingCard as any)?.offeringSummary ||
                  (match.matchedWith.tradingCard as any)?.offering || null,
        expertise: (match.matchedWith.tradingCard as any)?.expertise || [],
      },
    },
    whyMatch: match.whyMatch,
    conversationStarters: match.conversationStarters,
  }));

  return NextResponse.json({
    status: 'ready',
    event: {
      id: attendee.event.id,
      name: attendee.event.name,
      date: attendee.event.date.toISOString(),
      venueName: attendee.event.venueName,
    },
    attendee: {
      id: attendee.id,
      firstName: attendee.firstName,
    },
    matches: formattedMatches,
    isFirstView,
    totalMatches: matches.length,
  });
}

// Helper: Calculate reveal time based on event timing
function calculateRevealTime(event: { date: Date; revealTiming: string }): Date | null {
  const eventDate = new Date(event.date);

  switch (event.revealTiming) {
    case 'IMMEDIATE':
      return null;
    case 'TWENTY_FOUR_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    case 'FORTY_EIGHT_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 48 * 60 * 60 * 1000);
    default:
      return null;
  }
}

// Helper: Check if matches are viewable
function areMatchesViewable(
  event: { date: Date; revealTiming: string },
  attendee: { rsvpStatus: string; matchRevealSentAt: Date | null },
  hasApprovedMatches: boolean
): boolean {
  if (!hasApprovedMatches) return false;
  if (attendee.rsvpStatus !== 'CONFIRMED') return false;

  // If notification was sent, always viewable
  if (attendee.matchRevealSentAt) return true;

  // Check timing
  if (event.revealTiming === 'IMMEDIATE') return true;

  const revealTime = calculateRevealTime(event);
  return revealTime ? new Date() >= revealTime : false;
}
```

**Acceptance Criteria:**
- [ ] Token validation returns 401 for invalid/expired tokens
- [ ] Returns 404 if attendee not found
- [ ] Returns 403 if RSVP not confirmed
- [ ] Returns "coming_soon" status when reveal conditions not met
- [ ] Returns "ready" status with formatted matches when viewable
- [ ] Updates matchesFirstViewedAt only on first view
- [ ] Updates matchesLastViewedAt on every view
- [ ] Matches ordered by position ascending
- [ ] No match scores exposed to attendees

---

### Task 2.2: GET /api/rsvp/[token]/matches/[matchId] - Single Match Detail

**Description:** Create API endpoint for detailed single match information
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.1
**Can run parallel with:** Task 3.1, 3.2

**Technical Requirements:**

Create `src/app/api/rsvp/[token]/matches/[matchId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRSVPToken } from '@/lib/m33t/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; matchId: string }> }
) {
  const { token, matchId } = await params;

  // 1. Verify RSVP token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // 2. Get the match with matched attendee data
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      attendeeId: payload.attendeeId,
      status: { in: ['APPROVED', 'REVEALED'] },
    },
    include: {
      matchedWith: true,
      attendee: {
        include: { event: true },
      },
    },
  });

  if (!match) {
    return NextResponse.json(
      { error: 'Match not found' },
      { status: 404 }
    );
  }

  // 3. Format response with full details
  return NextResponse.json({
    match: {
      id: match.id,
      position: match.position,
      matchedWith: {
        id: match.matchedWith.id,
        firstName: match.matchedWith.firstName,
        lastName: match.matchedWith.lastName,
        profile: {
          role: (match.matchedWith.profile as any)?.role || null,
          company: (match.matchedWith.profile as any)?.company || null,
          location: (match.matchedWith.profile as any)?.location || null,
          photoUrl: (match.matchedWith.profile as any)?.photoUrl || null,
          expertise: (match.matchedWith.profile as any)?.expertise || [],
        },
        tradingCard: {
          currentFocus: (match.matchedWith.tradingCard as any)?.currentFocus || null,
          seeking: (match.matchedWith.tradingCard as any)?.seekingSummary ||
                   (match.matchedWith.tradingCard as any)?.seeking || null,
          offering: (match.matchedWith.tradingCard as any)?.offeringSummary ||
                    (match.matchedWith.tradingCard as any)?.offering || null,
          expertise: (match.matchedWith.tradingCard as any)?.expertise || [],
          conversationHooks: (match.matchedWith.tradingCard as any)?.conversationHooks || [],
        },
      },
      whyMatch: match.whyMatch,
      conversationStarters: match.conversationStarters,
    },
  });
}
```

**Acceptance Criteria:**
- [ ] Returns 401 for invalid token
- [ ] Returns 404 if match doesn't exist or belongs to different attendee
- [ ] Only returns APPROVED or REVEALED matches
- [ ] Returns full profile and tradingCard data
- [ ] No match score exposed

---

## Phase 3: UI Components

### Task 3.1: MatchRevealIntro Component

**Description:** Create simple fade-in intro animation component shown on first view
**Size:** Small
**Priority:** Medium
**Dependencies:** None (can start in parallel)
**Can run parallel with:** Task 3.2, 3.3, 3.4, 3.5

**Technical Requirements:**

Create `src/components/m33t/matches/MatchRevealIntro.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface MatchRevealIntroProps {
  eventName: string;
  matchCount: number;
  onContinue: () => void;
}

export function MatchRevealIntro({
  eventName,
  matchCount,
  onContinue,
}: MatchRevealIntroProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-6"
        >
          <Sparkles className="w-16 h-16 text-gold-primary mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-3xl font-bold text-text-primary mb-4"
        >
          Your matches are ready!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-lg text-text-secondary mb-8"
        >
          You have {matchCount} curated connection{matchCount !== 1 ? 's' : ''} waiting
          for you at {eventName}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
          >
            View My Matches
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

**Design Specifications:**
- Fade-in duration: 400ms
- Staggered animations for icon, heading, text, button
- Auto-dismiss: Not implemented (user clicks button to continue)
- Gold sparkles icon from Lucide
- Centered layout with max-width constraint

**Acceptance Criteria:**
- [ ] Smooth fade-in animation (400ms)
- [ ] Staggered element appearance
- [ ] Displays event name and match count
- [ ] Button triggers onContinue callback
- [ ] Responsive design works on mobile

---

### Task 3.2: MatchComingSoon Component

**Description:** Create placeholder component for when matches aren't ready yet
**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 3.1, 3.3, 3.4, 3.5

**Technical Requirements:**

Create `src/components/m33t/matches/MatchComingSoon.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft } from 'lucide-react';

interface MatchComingSoonProps {
  eventName: string;
  revealTiming: 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE';
  estimatedRevealDate: string | null;
  rsvpToken: string;
}

const TIMING_MESSAGES: Record<string, string> = {
  IMMEDIATE: 'once your profile is complete',
  TWENTY_FOUR_HOURS_BEFORE: '24 hours before the event',
  FORTY_EIGHT_HOURS_BEFORE: '48 hours before the event',
};

export function MatchComingSoon({
  eventName,
  revealTiming,
  estimatedRevealDate,
  rsvpToken,
}: MatchComingSoonProps) {
  const timingMessage = TIMING_MESSAGES[revealTiming] || 'soon';

  // Format date if available
  const formattedDate = estimatedRevealDate
    ? new Date(estimatedRevealDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Clock className="w-16 h-16 text-gold-primary mx-auto" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Your matches are coming!
        </h1>

        <p className="text-lg text-text-secondary mb-4">
          We&apos;re curating your perfect connections for {eventName}.
        </p>

        <p className="text-text-tertiary mb-8">
          Check back {timingMessage}
          {formattedDate && (
            <>
              <br />
              <span className="text-gold-primary font-medium">
                {formattedDate}
              </span>
            </>
          )}
        </p>

        <Link href={`/rsvp/${rsvpToken}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Event Details
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Displays appropriate timing message based on revealTiming
- [ ] Shows formatted date when estimatedRevealDate provided
- [ ] Links back to event details page
- [ ] Responsive centered layout
- [ ] Uses gold accent color for timing emphasis

---

### Task 3.3: MatchCard Component

**Description:** Create individual match preview card with name, headline, why-match teaser, seeking/offering
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 3.1, 3.2, 3.4, 3.5

**Technical Requirements:**

Create `src/components/m33t/matches/MatchCard.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    position: number;
    matchedWith: {
      firstName: string;
      lastName: string | null;
      profile: {
        role: string | null;
        company: string | null;
        location: string | null;
        photoUrl: string | null;
      };
      tradingCard: {
        seeking: string | null;
        offering: string | null;
      };
    };
    whyMatch: string[];
  };
  onClick: () => void;
  index: number;
}

export function MatchCard({ match, onClick, index }: MatchCardProps) {
  const { matchedWith, whyMatch, position } = match;
  const { firstName, lastName, profile, tradingCard } = matchedWith;

  // Build headline: "Role at Company" or just role or just company
  const headline = profile.role && profile.company
    ? `${profile.role} at ${profile.company}`
    : profile.role || profile.company || null;

  // Get initials for avatar
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';

  // Truncate text helper
  const truncate = (text: string | null, maxLength: number) => {
    if (!text) return null;
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Card
        onClick={onClick}
        className="p-5 bg-bg-secondary border-border hover:border-gold-primary transition-all cursor-pointer group"
      >
        {/* Position Badge */}
        <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gold-primary flex items-center justify-center text-sm font-bold text-bg-primary">
          {position}
        </div>

        {/* Header: Avatar + Name/Headline */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gold-subtle flex items-center justify-center text-xl font-bold text-gold-primary flex-shrink-0">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={firstName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* Name + Headline */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {firstName} {lastName}
            </h3>
            {headline && (
              <p className="text-sm text-text-secondary truncate">{headline}</p>
            )}
            {profile.location && (
              <p className="text-xs text-text-tertiary flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Why Match Teaser */}
        {whyMatch[0] && (
          <p className="text-sm text-gold-light italic mb-4 line-clamp-2">
            &ldquo;{whyMatch[0]}&rdquo;
          </p>
        )}

        {/* Seeking / Offering Preview */}
        <div className="border-t border-border pt-4 space-y-2">
          {tradingCard.seeking && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Looking for:{' '}
              </span>
              <span className="text-sm text-text-secondary">
                {truncate(tradingCard.seeking, 60)}
              </span>
            </div>
          )}
          {tradingCard.offering && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Can offer:{' '}
              </span>
              <span className="text-sm text-text-secondary">
                {truncate(tradingCard.offering, 60)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
```

**Design Specifications:**
- Position badge: Gold circle, top-left, offset outside card
- Avatar: 56px, gold-subtle background with initials or photo
- Why match: First reason only, italic, gold-light color, max 2 lines
- Seeking/offering: Truncated to 60 chars
- Hover: Border changes to gold-primary

**Acceptance Criteria:**
- [ ] Position badge displayed prominently
- [ ] Avatar shows photo or initials fallback
- [ ] Name and headline displayed with truncation
- [ ] Location shown with MapPin icon
- [ ] First whyMatch reason shown as teaser (max 2 lines)
- [ ] Seeking/offering previews truncated appropriately
- [ ] Hover effect changes border color
- [ ] Click triggers onClick callback
- [ ] Staggered animation based on index

---

### Task 3.4: MatchGrid Component

**Description:** Create responsive grid layout for displaying match cards
**Size:** Small
**Priority:** High
**Dependencies:** Task 3.3
**Can run parallel with:** Task 3.1, 3.2, 3.5

**Technical Requirements:**

Create `src/components/m33t/matches/MatchGrid.tsx`:

```typescript
'use client';

import { MatchCard } from './MatchCard';

interface Match {
  id: string;
  position: number;
  matchedWith: {
    id: string;
    firstName: string;
    lastName: string | null;
    profile: {
      role: string | null;
      company: string | null;
      location: string | null;
      photoUrl: string | null;
    };
    tradingCard: {
      currentFocus: string | null;
      seeking: string | null;
      offering: string | null;
      expertise: string[];
    };
  };
  whyMatch: string[];
  conversationStarters: string[];
}

interface MatchGridProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

export function MatchGrid({ matches, onSelectMatch }: MatchGridProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">
          No matches available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {matches.map((match, index) => (
        <MatchCard
          key={match.id}
          match={match}
          onClick={() => onSelectMatch(match)}
          index={index}
        />
      ))}
    </div>
  );
}
```

**Layout Specifications:**
- Mobile (< 768px): Single column
- Tablet (768px - 1023px): 2 columns
- Desktop (>= 1024px): 3 columns
- Gap: 24px (gap-6)

**Acceptance Criteria:**
- [ ] Responsive grid layout (1/2/3 columns)
- [ ] Empty state shown when no matches
- [ ] Passes match data and click handler to MatchCard
- [ ] Cards render in position order

---

### Task 3.5: MatchDetailModal Component

**Description:** Create modal overlay for displaying full match details
**Size:** Large
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 3.1, 3.2, 3.3, 3.4

**Technical Requirements:**

Create `src/components/m33t/matches/MatchDetailModal.tsx`:

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, Gift, MessageCircle, Lightbulb } from 'lucide-react';

interface MatchDetailModalProps {
  match: {
    id: string;
    position: number;
    matchedWith: {
      id: string;
      firstName: string;
      lastName: string | null;
      profile: {
        role: string | null;
        company: string | null;
        location: string | null;
        photoUrl: string | null;
      };
      tradingCard: {
        currentFocus: string | null;
        seeking: string | null;
        offering: string | null;
        expertise: string[];
      };
    };
    whyMatch: string[];
    conversationStarters: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailModal({
  match,
  isOpen,
  onClose,
}: MatchDetailModalProps) {
  if (!match) return null;

  const { matchedWith, whyMatch, conversationStarters, position } = match;
  const { firstName, lastName, profile, tradingCard } = matchedWith;

  // Build headline
  const headline = profile.role && profile.company
    ? `${profile.role} at ${profile.company}`
    : profile.role || profile.company || null;

  // Get initials
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Match Details: {firstName} {lastName}
          </DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="text-center mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gold-subtle flex items-center justify-center text-3xl font-bold text-gold-primary mx-auto mb-4">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={firstName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <h2 className="text-2xl font-bold text-text-primary">
            {firstName} {lastName}
          </h2>
          {headline && (
            <p className="text-text-secondary mt-1">{headline}</p>
          )}
          {profile.location && (
            <p className="text-sm text-text-tertiary flex items-center justify-center gap-1 mt-2">
              <MapPin className="w-4 h-4" />
              {profile.location}
            </p>
          )}
        </div>

        {/* Why You Match */}
        {whyMatch.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-primary" />
              Why You Match
            </h3>
            <ul className="space-y-2">
              {whyMatch.map((reason, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                  <span className="text-gold-primary mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Current Focus */}
        {tradingCard.currentFocus && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-gold-primary" />
              Current Focus
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.currentFocus}
            </p>
          </section>
        )}

        {/* Looking For */}
        {tradingCard.seeking && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-primary" />
              Looking For
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.seeking}
            </p>
          </section>
        )}

        {/* Can Offer */}
        {tradingCard.offering && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold-primary" />
              Can Offer
            </h3>
            <p className="text-sm text-text-secondary">
              {tradingCard.offering}
            </p>
          </section>
        )}

        {/* Conversation Starters */}
        {conversationStarters.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold-primary" />
              Conversation Starters
            </h3>
            <ul className="space-y-3">
              {conversationStarters.map((starter, i) => (
                <li
                  key={i}
                  className="text-sm text-text-secondary bg-bg-tertiary rounded-lg p-3 flex items-start gap-2"
                >
                  <span className="text-lg">💬</span>
                  {starter}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Expertise */}
        {tradingCard.expertise.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Expertise
            </h3>
            <div className="flex flex-wrap gap-2">
              {tradingCard.expertise.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-bg-tertiary text-text-secondary"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Sections:**
1. Header: Large avatar, name, headline, location
2. Why You Match: All reasons (2-3 items)
3. Current Focus: From tradingCard
4. Looking For: From tradingCard.seeking
5. Can Offer: From tradingCard.offering
6. Conversation Starters: All prompts
7. Expertise: Badge chips

**Acceptance Criteria:**
- [ ] Modal opens/closes properly
- [ ] Close via X button, click outside, or Escape key
- [ ] All sections display with proper icons
- [ ] Large avatar with photo or initials
- [ ] Expertise shown as badges
- [ ] Conversation starters styled distinctively
- [ ] Scrollable content for long matches
- [ ] Accessible (sr-only title)

---

### Task 3.6: Create Component Barrel Export

**Description:** Create index.ts for clean component imports
**Size:** Small
**Priority:** Low
**Dependencies:** Tasks 3.1-3.5
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/m33t/matches/index.ts`:

```typescript
export { MatchRevealIntro } from './MatchRevealIntro';
export { MatchComingSoon } from './MatchComingSoon';
export { MatchCard } from './MatchCard';
export { MatchGrid } from './MatchGrid';
export { MatchDetailModal } from './MatchDetailModal';
```

**Acceptance Criteria:**
- [ ] All components exported from index
- [ ] Clean imports work: `import { MatchGrid } from '@/components/m33t/matches'`

---

## Phase 4: Page Integration

### Task 4.1: Match Reveal Page

**Description:** Create main match reveal page with state management and flow orchestration
**Size:** Large
**Priority:** High
**Dependencies:** Tasks 2.1, 3.1-3.5
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/rsvp/[token]/matches/page.tsx`:

```typescript
import { Metadata } from 'next';
import { MatchRevealClient } from './MatchRevealClient';

export const metadata: Metadata = {
  title: 'Your Matches',
  description: 'View your curated connections',
};

export default function MatchRevealPage({
  params,
}: {
  params: { token: string };
}) {
  return <MatchRevealClient token={params.token} />;
}
```

Create `src/app/rsvp/[token]/matches/MatchRevealClient.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  MatchRevealIntro,
  MatchComingSoon,
  MatchGrid,
  MatchDetailModal,
} from '@/components/m33t/matches';

interface Match {
  id: string;
  position: number;
  matchedWith: {
    id: string;
    firstName: string;
    lastName: string | null;
    profile: {
      role: string | null;
      company: string | null;
      location: string | null;
      photoUrl: string | null;
    };
    tradingCard: {
      currentFocus: string | null;
      seeking: string | null;
      offering: string | null;
      expertise: string[];
    };
  };
  whyMatch: string[];
  conversationStarters: string[];
}

type ViewState = 'loading' | 'intro' | 'coming_soon' | 'grid' | 'error';

interface MatchesResponse {
  status: 'ready' | 'coming_soon';
  event: {
    id: string;
    name: string;
    date: string;
    venueName?: string;
  };
  attendee: {
    id: string;
    firstName: string;
  };
  // For "ready" status
  matches?: Match[];
  isFirstView?: boolean;
  totalMatches?: number;
  // For "coming_soon" status
  message?: string;
  revealTiming?: 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE';
  estimatedRevealDate?: string | null;
}

export function MatchRevealClient({ token }: { token: string }) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch(`/api/rsvp/${token}/matches`);

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load matches');
          setViewState('error');
          return;
        }

        const result: MatchesResponse = await response.json();
        setData(result);

        if (result.status === 'coming_soon') {
          setViewState('coming_soon');
        } else if (result.isFirstView) {
          setViewState('intro');
        } else {
          setViewState('grid');
        }
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('An unexpected error occurred');
        setViewState('error');
      }
    }

    fetchMatches();
  }, [token]);

  // Loading state
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  // Error state
  if (viewState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Unable to Load Matches
          </h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  // Coming soon state
  if (viewState === 'coming_soon' && data) {
    return (
      <MatchComingSoon
        eventName={data.event.name}
        revealTiming={data.revealTiming!}
        estimatedRevealDate={data.estimatedRevealDate || null}
        rsvpToken={token}
      />
    );
  }

  // Intro state (first view)
  if (viewState === 'intro' && data) {
    return (
      <MatchRevealIntro
        eventName={data.event.name}
        matchCount={data.totalMatches!}
        onContinue={() => setViewState('grid')}
      />
    );
  }

  // Grid state
  if (viewState === 'grid' && data?.matches) {
    return (
      <div className="min-h-screen bg-bg-primary">
        {/* Header */}
        <header className="border-b border-border py-6 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-text-primary">
              Your Matches for {data.event.name}
            </h1>
            <p className="text-text-secondary mt-1">
              {data.totalMatches} curated connection{data.totalMatches !== 1 ? 's' : ''}
            </p>
          </div>
        </header>

        {/* Match Grid */}
        <main className="py-8 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <MatchGrid
              matches={data.matches}
              onSelectMatch={setSelectedMatch}
            />
          </div>
        </main>

        {/* Detail Modal */}
        <MatchDetailModal
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      </div>
    );
  }

  return null;
}
```

**States:**
1. Loading - Fetching data
2. Coming Soon - Matches not ready
3. Intro - First view animation
4. Grid - Browse matches
5. Error - Invalid token or access denied

**Acceptance Criteria:**
- [ ] Loading state shows spinner
- [ ] Error state displays error message
- [ ] Coming soon shown when status = 'coming_soon'
- [ ] Intro shown on first view (isFirstView = true)
- [ ] Grid shown for returning viewers
- [ ] Clicking "View My Matches" transitions intro → grid
- [ ] Clicking card opens modal
- [ ] Modal closes and returns to grid

---

### Task 4.2: Guest Dashboard Match Integration

**Description:** Add match access link and status indicator to guest event detail page
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.1, Task 4.1
**Can run parallel with:** None

**Technical Requirements:**

Update `src/app/guest/events/[eventId]/page.tsx` to include match status section:

```typescript
// Add to existing EventDetailClient or create new section

interface MatchStatus {
  hasMatches: boolean;
  matchCount: number;
  isViewable: boolean;
  hasViewed: boolean;
}

// In the component, add section after existing content:
{matchStatus?.hasMatches && (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Users className="w-5 h-5 text-gold-primary" />
          Your Matches
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {matchStatus.matchCount} curated connection{matchStatus.matchCount !== 1 ? 's' : ''}
          {matchStatus.hasViewed && (
            <span className="text-text-tertiary"> • Viewed</span>
          )}
        </p>
      </div>

      {matchStatus.isViewable ? (
        <Link href={`/rsvp/${rsvpToken}/matches`}>
          <Button className="gap-2">
            View Matches
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : (
        <Badge variant="secondary">Coming Soon</Badge>
      )}
    </div>
  </Card>
)}
```

**API Addition:**

Add match status to existing guest event endpoint or create new:

```typescript
// In /api/guest/events/[eventId]/route.ts, add to response:
const matchStatus = {
  hasMatches: matches.length > 0,
  matchCount: matches.length,
  isViewable: areMatchesViewable(event, attendee, matches.length > 0),
  hasViewed: !!attendee.matchesFirstViewedAt,
};
```

**Acceptance Criteria:**
- [ ] Match section shown when attendee has matches
- [ ] Match count displayed
- [ ] "Viewed" indicator when matchesFirstViewedAt is set
- [ ] "View Matches" button links to reveal page (when viewable)
- [ ] "Coming Soon" badge shown when not yet viewable
- [ ] Hidden entirely when no matches exist

---

## Phase 5: Testing & Polish

### Task 5.1: E2E Tests for Match Reveal Flow

**Description:** Write Playwright tests covering the full match reveal experience
**Size:** Medium
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** Task 5.2

**Technical Requirements:**

Create `.quick-checks/test-match-reveal.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { setupTestUser, createTestEvent, createTestMatches } from './test-helpers';

test.describe('Match Reveal Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await setupTestUser(page);
  });

  test('shows coming soon when matches not yet viewable', async ({ page }) => {
    // Create event with future reveal timing
    const { rsvpToken } = await createTestEvent({
      revealTiming: 'TWENTY_FOUR_HOURS_BEFORE',
      date: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    });

    await page.goto(`/rsvp/${rsvpToken}/matches`);

    await expect(page.getByText('Your matches are coming!')).toBeVisible();
    await expect(page.getByText('24 hours before the event')).toBeVisible();
  });

  test('shows intro animation on first view', async ({ page }) => {
    const { rsvpToken } = await createTestEvent({
      revealTiming: 'IMMEDIATE',
    });
    await createTestMatches(rsvpToken, 3);

    await page.goto(`/rsvp/${rsvpToken}/matches`);

    // Should show intro
    await expect(page.getByText('Your matches are ready!')).toBeVisible();
    await expect(page.getByText('3 curated connections')).toBeVisible();

    // Click to continue
    await page.getByRole('button', { name: 'View My Matches' }).click();

    // Should show grid
    await expect(page.getByText('Your Matches for')).toBeVisible();
  });

  test('skips intro on subsequent views', async ({ page }) => {
    const { rsvpToken, attendeeId } = await createTestEvent({
      revealTiming: 'IMMEDIATE',
    });
    await createTestMatches(rsvpToken, 3);

    // Mark as already viewed
    await markMatchesAsViewed(attendeeId);

    await page.goto(`/rsvp/${rsvpToken}/matches`);

    // Should skip directly to grid
    await expect(page.getByText('Your Matches for')).toBeVisible();
    await expect(page.getByText('Your matches are ready!')).not.toBeVisible();
  });

  test('opens match detail modal on card click', async ({ page }) => {
    const { rsvpToken } = await createTestEvent({
      revealTiming: 'IMMEDIATE',
    });
    await createTestMatches(rsvpToken, 3);

    await page.goto(`/rsvp/${rsvpToken}/matches`);
    await page.getByRole('button', { name: 'View My Matches' }).click();

    // Click first match card
    await page.locator('[data-testid="match-card"]').first().click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Why You Match')).toBeVisible();
    await expect(page.getByText('Conversation Starters')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('does not expose match scores', async ({ page }) => {
    const { rsvpToken } = await createTestEvent({
      revealTiming: 'IMMEDIATE',
    });
    await createTestMatches(rsvpToken, 3);

    await page.goto(`/rsvp/${rsvpToken}/matches`);
    await page.getByRole('button', { name: 'View My Matches' }).click();

    // Should not find any score indicators
    const pageContent = await page.content();
    expect(pageContent).not.toContain('score');
    expect(pageContent).not.toContain('Score');
    expect(pageContent).not.toContain('%'); // No percentage scores
  });

  test('handles invalid token gracefully', async ({ page }) => {
    await page.goto('/rsvp/invalid-token/matches');

    await expect(page.getByText('Unable to Load Matches')).toBeVisible();
    await expect(page.getByText('Invalid or expired token')).toBeVisible();
  });
});
```

**Test Scenarios:**
1. Coming soon state displays correctly
2. Intro animation shows on first view
3. Intro skipped on subsequent views
4. Modal opens/closes correctly
5. No match scores exposed
6. Invalid token shows error
7. Responsive layout works

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] Tests are isolated and don't affect production data
- [ ] Tests run in under 60 seconds
- [ ] Coverage of happy path and error cases

---

### Task 5.2: Empty State Handling

**Description:** Add proper empty state when attendee has 0 matches but reveal time passed
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 5.1

**Technical Requirements:**

Update `src/app/rsvp/[token]/matches/MatchRevealClient.tsx`:

```typescript
// Add empty state when matches array is empty but status is 'ready'
if (viewState === 'grid' && data?.matches?.length === 0) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Users className="w-16 h-16 text-text-tertiary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          No Matches Yet
        </h1>
        <p className="text-text-secondary mb-8">
          We're still curating your perfect connections for {data.event.name}.
          Check back soon!
        </p>
        <Link href={`/rsvp/${token}`}>
          <Button variant="outline">
            Back to Event Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Empty state shown when matches array is empty
- [ ] Friendly message explains situation
- [ ] Link back to event details
- [ ] Doesn't break existing flow

---

## Summary

| Phase | Tasks | Est. Size |
|-------|-------|-----------|
| 1. Database | 1 | Small |
| 2. API | 2 | Large + Medium |
| 3. Components | 6 | 2 Small + 2 Medium + 2 Large |
| 4. Pages | 2 | Large + Medium |
| 5. Testing | 2 | Medium + Small |

**Total Tasks:** 13
**Critical Path:** 1.1 → 2.1 → 3.3 → 3.4 → 4.1

**Parallel Opportunities:**
- Tasks 3.1-3.5 can all run in parallel
- Task 5.1 and 5.2 can run in parallel

---

## Execution Recommendations

1. Start with Task 1.1 (database migration) - foundation for everything
2. Task 2.1 is the critical API - blocks page integration
3. Components (Phase 3) can be developed in parallel by multiple developers
4. Task 4.1 integrates everything - should be done after components
5. Task 4.2 (dashboard integration) can be done last
6. Testing (Phase 5) should run after all features complete
