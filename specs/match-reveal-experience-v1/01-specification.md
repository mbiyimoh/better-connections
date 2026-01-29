# Match Reveal Experience - Specification

## Overview

This specification defines the attendee-facing match reveal experience for M33T events. When matches are ready (based on reveal timing), attendees receive a notification and can view their curated connections through an engaging reveal interface.

**Core Experience:** Attendees access their matches via RSVP token URL, see a simple intro animation, then browse their matches in a card-based interface with modal details.

---

## Design Decisions (From Clarifications)

1. **Reveal Intro:** Option A - Simple fade-in with "Your matches are ready!" text
   - No elaborate scrollytelling animation
   - Quick, delightful, gets users to content fast

2. **Match Card Content:** All of the following (minus match score):
   - Name, photo placeholder (initials), headline
   - One-line "why you match" teaser
   - Seeking/offering preview
   - NO numeric match score shown to attendees

3. **Match Detail View:** Modal overlay
   - Faster navigation, stays in context
   - Full match details without page transition

4. **Feedback Mechanism:** Option C - No feedback collection
   - No thumbs up/down or rating
   - No viewing analytics for V1
   - Simple, frictionless experience

5. **Pre-Reveal Access:** Option B - Show "coming soon" placeholder
   - URL accessible before reveal time
   - Shows countdown or "matches coming soon" message
   - Prevents confusion from 404 errors

6. **Match Updates:** Organizer-controlled notifications
   - Organizer decides if/when to re-notify after match changes
   - No automatic re-notification
   - UI shows "Updated" indicator if matches changed since last view (future consideration)

---

## User Flows

### Flow 1: Match Reveal via Notification

```
Organizer triggers match reveal notification
    │
    ▼
Attendee receives SMS/Email
    │
    ├── SMS: "Your 5 curated connections for [Event] are ready! [link]"
    │
    └── Email: Preview of top 3 matches + CTA button
    │
    ▼
Attendee clicks link → /rsvp/[token]/matches
    │
    ▼
Intro animation: "Your matches are ready!"
    │
    ▼
Match cards grid/list displayed
    │
    ▼
Click card → Modal with full match details
    │
    ▼
Close modal → Back to grid
```

### Flow 2: Direct Access Before Reveal

```
Attendee navigates to /rsvp/[token]/matches
    │
    ▼
Check reveal conditions:
    │
    ├── Matches exist AND status = APPROVED/REVEALED? → Show matches
    │
    ├── Matches exist but reveal time not reached? → Show "Coming Soon"
    │
    └── No matches yet? → Show "Coming Soon" with explanation
```

### Flow 3: Returning After Initial Reveal

```
Attendee returns to /rsvp/[token]/matches
    │
    ▼
Skip intro animation (already seen)
    │
    ▼
Show match cards directly
    │
    ▼
(Future: Show "Updated" badge if matches changed)
```

---

## Data Model Updates

### EventAttendee Updates

```prisma
model EventAttendee {
  // ... existing fields ...

  // Match reveal tracking
  matchRevealSentAt    DateTime?  // When notification was sent (existing)
  matchesFirstViewedAt DateTime?  // NEW: When attendee first viewed matches
  matchesLastViewedAt  DateTime?  // NEW: When attendee last viewed matches
}
```

### Match Status Flow

```
PENDING → APPROVED → REVEALED
           ↓
        REJECTED
```

When attendee views matches:
- Matches remain as `APPROVED` (not changed to `REVEALED` on view)
- `REVEALED` status set when notification is sent (existing behavior)
- `matchesFirstViewedAt` tracks first actual view

---

## API Endpoints

### GET `/api/rsvp/[token]/matches`

Returns matches for an attendee via their RSVP token.

**Response (matches available):**
```typescript
{
  status: 'ready';
  event: {
    id: string;
    name: string;
    date: string;
    venueName: string;
  };
  attendee: {
    id: string;
    firstName: string;
  };
  matches: {
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
    whyMatch: string[];           // 2-3 reasons
    conversationStarters: string[]; // 2-3 prompts
  }[];
  isFirstView: boolean;  // True if this is the attendee's first time viewing
  totalMatches: number;
}
```

**Response (coming soon):**
```typescript
{
  status: 'coming_soon';
  event: {
    id: string;
    name: string;
    date: string;
  };
  attendee: {
    id: string;
    firstName: string;
  };
  message: string;  // "Your matches will be revealed soon!"
  revealTiming: 'IMMEDIATE' | 'TWENTY_FOUR_HOURS_BEFORE' | 'FORTY_EIGHT_HOURS_BEFORE';
  estimatedRevealDate: string | null;  // ISO date if calculable
}
```

**Logic:**
1. Validate RSVP token
2. Check attendee has CONFIRMED status
3. Check for APPROVED or REVEALED matches
4. If matches exist:
   - Update `matchesLastViewedAt`
   - Set `matchesFirstViewedAt` if null
   - Return matches ordered by position
5. If no matches or reveal time not reached:
   - Return "coming soon" response

### GET `/api/rsvp/[token]/matches/[matchId]`

Returns detailed information for a single match.

**Response:**
```typescript
{
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
        expertise: string[];
      };
      tradingCard: {
        currentFocus: string | null;
        seeking: string | null;
        offering: string | null;
        expertise: string[];
        conversationHooks: string[];
      };
    };
    whyMatch: string[];
    conversationStarters: string[];
  };
}
```

---

## Page Components

### Match Reveal Page

**Location:** `src/app/rsvp/[token]/matches/page.tsx`

**Purpose:** Main entry point for match reveal experience.

**States:**
1. **Loading** - Fetching match data
2. **Coming Soon** - Matches not yet available
3. **Reveal Intro** - First-time view animation
4. **Match Grid** - Browsable match cards
5. **Error** - Token invalid or access denied

### MatchRevealIntro Component

**Location:** `src/components/m33t/matches/MatchRevealIntro.tsx`

**Purpose:** Simple intro animation on first view.

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│     [Fade in]                       │
│                                     │
│     ✨ Your matches are ready!      │
│                                     │
│     You have 5 curated connections  │
│     waiting for you at [Event Name] │
│                                     │
│     [View My Matches →]             │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Fade-in animation (300-500ms)
- Auto-dismiss after 2-3 seconds OR on button click
- Skip on subsequent visits (check `matchesFirstViewedAt`)

### MatchComingSoon Component

**Location:** `src/components/m33t/matches/MatchComingSoon.tsx`

**Purpose:** Placeholder when matches aren't ready.

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│     🔮 Your matches are coming!     │
│                                     │
│     We're curating your perfect     │
│     connections for [Event Name].   │
│                                     │
│     Check back [timing description] │
│                                     │
│     [Back to Event Details]         │
│                                     │
└─────────────────────────────────────┘
```

**Timing Display:**
- `IMMEDIATE`: "once you complete your profile"
- `TWENTY_FOUR_HOURS_BEFORE`: "24 hours before the event"
- `FORTY_EIGHT_HOURS_BEFORE`: "48 hours before the event"
- If date calculable: "on [formatted date]"

### MatchGrid Component

**Location:** `src/components/m33t/matches/MatchGrid.tsx`

**Purpose:** Display match cards in a responsive grid.

**Layout:**
- Mobile: Single column, full-width cards
- Tablet: 2-column grid
- Desktop: 3-column grid

**Features:**
- Position badges (1, 2, 3, etc.)
- Click to open detail modal
- Smooth hover effects

### MatchCard Component

**Location:** `src/components/m33t/matches/MatchCard.tsx`

**Purpose:** Individual match preview card.

**Design:**
```
┌─────────────────────────────────────┐
│ [1]                                 │
│                                     │
│   [Avatar]  Sarah Chen              │
│             Product Lead at Stripe  │
│             San Francisco, CA       │
│                                     │
│   "You both are building in the     │
│   AI/ML space and seeking           │
│   technical co-founders."           │
│                                     │
│   ─────────────────────────────     │
│   Looking for: Technical advisors   │
│   Can offer: Product strategy       │
│                                     │
└─────────────────────────────────────┘
```

**Content:**
- Position badge (top-left corner)
- Avatar (photo or initials with gold background)
- Name (firstName + lastName)
- Headline (role at company, or role, or company)
- Location (if available)
- Primary "why match" reason (first item from array)
- Seeking preview (truncated)
- Offering preview (truncated)

**Interactions:**
- Hover: Subtle scale/shadow
- Click: Open MatchDetailModal

### MatchDetailModal Component

**Location:** `src/components/m33t/matches/MatchDetailModal.tsx`

**Purpose:** Full match details in modal overlay.

**Design:**
```
┌─────────────────────────────────────────────┐
│                                         [X] │
│                                             │
│   [Large Avatar]                            │
│                                             │
│   Sarah Chen                                │
│   Product Lead at Stripe                    │
│   San Francisco, CA                         │
│                                             │
│   ─────────────────────────────────────     │
│                                             │
│   WHY YOU MATCH                             │
│   • You both are building in AI/ML          │
│   • She's seeking technical advisors,       │
│     you have deep technical expertise       │
│   • Complementary experience levels         │
│                                             │
│   ─────────────────────────────────────     │
│                                             │
│   CURRENT FOCUS                             │
│   Building AI-powered analytics tools       │
│   for enterprise customers.                 │
│                                             │
│   LOOKING FOR                               │
│   Technical co-founders, AI researchers,    │
│   enterprise sales advisors                 │
│                                             │
│   CAN OFFER                                 │
│   Product strategy, user research,          │
│   startup fundraising experience            │
│                                             │
│   ─────────────────────────────────────     │
│                                             │
│   CONVERSATION STARTERS                     │
│   💬 "Ask about her transition from         │
│      big tech to startups"                  │
│   💬 "Discuss AI product challenges         │
│      in enterprise sales"                   │
│                                             │
│   ─────────────────────────────────────     │
│                                             │
│   EXPERTISE                                 │
│   [Product] [AI/ML] [Enterprise] [B2B]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Sections:**
1. Header: Avatar, name, headline, location
2. Why You Match: All reasons (2-3 items)
3. Current Focus: From tradingCard.currentFocus
4. Looking For: From tradingCard.seeking
5. Can Offer: From tradingCard.offering
6. Conversation Starters: All prompts (2-3 items)
7. Expertise: Badge chips

**Navigation:**
- Close button (X) top-right
- Click outside to close
- Escape key to close
- Optional: Previous/Next arrows to navigate matches

---

## Reveal Timing Logic

### When Are Matches Viewable?

Matches become viewable when ALL conditions are met:

1. Attendee has `rsvpStatus === 'CONFIRMED'`
2. At least one match has `status === 'APPROVED'` or `status === 'REVEALED'`
3. One of the following:
   - `revealTiming === 'IMMEDIATE'` (always viewable if matches approved)
   - `revealTiming === 'TWENTY_FOUR_HOURS_BEFORE'` AND event is within 24 hours
   - `revealTiming === 'FORTY_EIGHT_HOURS_BEFORE'` AND event is within 48 hours
   - Match notification was sent (`matchRevealSentAt !== null`)

**Note:** Organizer can override timing by manually triggering match reveal notification at any time.

### Reveal Time Calculation

```typescript
function calculateRevealTime(event: Event): Date | null {
  const eventDate = new Date(event.date);

  switch (event.revealTiming) {
    case 'IMMEDIATE':
      return null; // No specific time, available when matches approved
    case 'TWENTY_FOUR_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    case 'FORTY_EIGHT_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 48 * 60 * 60 * 1000);
  }
}

function areMatchesViewable(
  event: Event,
  attendee: EventAttendee,
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

---

## File Structure

```
src/
├── app/
│   └── rsvp/
│       └── [token]/
│           └── matches/
│               └── page.tsx           # Main match reveal page
├── api/
│   └── rsvp/
│       └── [token]/
│           └── matches/
│               ├── route.ts           # GET matches list
│               └── [matchId]/
│                   └── route.ts       # GET single match detail
└── components/
    └── m33t/
        └── matches/
            ├── index.ts
            ├── MatchRevealIntro.tsx
            ├── MatchComingSoon.tsx
            ├── MatchGrid.tsx
            ├── MatchCard.tsx
            └── MatchDetailModal.tsx
```

---

## Implementation Tasks

### M1: Database Migration
- Add `matchesFirstViewedAt` to EventAttendee
- Add `matchesLastViewedAt` to EventAttendee
- Run migration

### M2: Matches API Endpoint
- GET `/api/rsvp/[token]/matches`
- Reveal timing logic
- View tracking (first/last viewed timestamps)
- Response formatting

### M3: Single Match API Endpoint
- GET `/api/rsvp/[token]/matches/[matchId]`
- Full match detail response

### M4: MatchRevealIntro Component
- Fade-in animation
- Event name display
- Match count
- CTA button
- Auto-dismiss logic

### M5: MatchComingSoon Component
- Coming soon message
- Timing description
- Back to event link

### M6: MatchGrid Component
- Responsive grid layout
- Match card rendering
- Click handling for modal

### M7: MatchCard Component
- Avatar with initials fallback
- Name and headline
- Why match teaser
- Seeking/offering preview
- Position badge
- Hover effects

### M8: MatchDetailModal Component
- Full profile display
- All why match reasons
- Conversation starters
- Expertise badges
- Close interactions
- Optional: Previous/Next navigation

### M9: Match Reveal Page
- State management
- Data fetching
- Intro → Grid flow
- Error handling

### M10: Guest Dashboard Integration
- Link to matches from event detail
- Match count badge
- Status indicator (viewed/not viewed)

---

## Design System Integration

### Colors (from existing design system)

```typescript
// Match card
background: 'bg-bg-secondary'       // #1A1A1F
border: 'border-border'             // rgba(255,255,255,0.08)
borderHover: 'border-gold-primary'  // #d4a54a

// Position badge
background: 'bg-gold-primary'       // #d4a54a
text: 'text-bg-primary'             // #0D0D0F

// Avatar placeholder
background: 'bg-gold-subtle'        // rgba(212,165,74,0.15)
text: 'text-gold-primary'           // #d4a54a

// Why match / highlights
text: 'text-gold-light'             // #e5c766

// Expertise badges
background: 'bg-bg-tertiary'        // #252529
text: 'text-text-secondary'         // #A0A0A8
```

### Typography

- Name: `text-lg font-semibold text-text-primary`
- Headline: `text-sm text-text-secondary`
- Location: `text-xs text-text-tertiary`
- Why Match: `text-sm text-gold-light italic`
- Section Headers: `text-xs font-semibold uppercase tracking-wider text-text-tertiary`

### Spacing

- Card padding: `p-5`
- Grid gap: `gap-4`
- Section spacing: `space-y-4`

---

## Success Criteria

1. Attendees can access matches via RSVP token URL
2. First-time viewers see simple intro animation
3. Coming soon page shows when matches aren't ready
4. Match cards display name, headline, why match teaser, seeking/offering
5. No match scores shown to attendees
6. Clicking card opens modal with full details
7. Modal shows all why match reasons and conversation starters
8. View timestamps tracked (first and last)
9. Responsive layout works on mobile/tablet/desktop
10. Matches ordered by position (as curated by organizer)

---

## Future Considerations (Not in V1)

1. **Match Feedback:** Optional thumbs up/down or "looking forward to meeting"
2. **View Analytics:** Track which matches were viewed, time spent
3. **Updated Indicator:** Badge when matches changed since last view
4. **Pre-Event Chat:** Lightweight messaging between matched attendees
5. **Calendar Integration:** Add match meetings to calendar
6. **Match Sharing:** Share match profile with others (LinkedIn-style)
