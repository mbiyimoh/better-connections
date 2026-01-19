# M33T Public Event Landing Page

## Status
**Approved** — Ready for implementation

## Authors
- Claude Code (AI Assistant)
- Date: January 2026

---

## Overview

This specification defines the public-facing event landing page for M33T events — a rich, Eventbrite-style page that showcases event details, displays attendees by RSVP status, and entices invitees to RSVP. Based on the `33-strategies-event-page-v2.jsx` prototype which establishes the standard template.

The landing page serves as the primary entry point for invited attendees and serves dual purposes:
1. **Marketing/conversion**: Convince invitees to RSVP by showing who else is coming
2. **Information hub**: Provide event details (venue, schedule, host, dress code)

**Core insight**: Unlike generic event pages, M33T landing pages leverage the rich profile data collected during RSVP to show "why each attendee is interesting" — creating FOMO that drives RSVPs.

---

## Background / Problem Statement

### The Problem
The current RSVP experience is transactional: users receive an invite, click a link, and see a basic form. There's no:
- Visibility into who else is coming
- Context about why they should attend
- Information about the event agenda
- Premium visual experience befitting 33 Strategies brand

### Why This Matters
- **Conversion**: Seeing interesting attendees creates FOMO → higher RSVP rates
- **Preparation**: Attendees can pre-research people they want to meet
- **Brand**: The landing page represents the event brand before attendees arrive
- **Value demonstration**: Shows the M33T value prop (curated connections) before the event

### Relationship to Existing Specs
This spec addresses **Screen 1.1: Invite Landing** from `ATTENDEE_JOURNEY.md` and extends it significantly based on the prototype. The existing spec mentioned:
> "Premium feel, not a form. Mobile-first. Should feel exclusive, not transactional."

The prototype realizes this vision with scrollytelling, attendee carousels, profile modals, and sophisticated visual design.

---

## Goals (V1)

- [ ] Display event details (name, tagline, date, time, venue, dress code)
- [ ] Show attendees grouped by RSVP status (Confirmed, Maybe, Pending/Invited)
- [ ] Enable profile modal viewing for each attendee (background, "why interesting", conversation starters)
- [ ] Provide full guest list modal with tabbed filtering
- [ ] Display event schedule timeline
- [ ] Show host/organizer section
- [ ] Support optional scrollytelling intro (hardcoded NO EDGES for V1)
- [ ] Mobile-responsive design with horizontal carousels
- [ ] Match 33 Strategies brand (dark theme, gold accents, Georgia serif)
- [ ] CTA buttons for RSVP action (links to questionnaire flow)

### Success Criteria
- Page loads in <2 seconds on 3G connection
- Mobile-first design renders correctly on 375px viewport
- All attendee carousels are touch-scrollable on mobile
- 404 page displays for invalid slugs

---

## Non-Goals (V1 — Deferred)

- [ ] RSVP form on the landing page itself (separate questionnaire flow handles this)
- [ ] Real-time attendee count updates (static on page load)
- [ ] Social sharing / OG image generation (V2)
- [ ] Event-specific custom branding (V2 - all events use 33 Strategies brand)
- [ ] Venue photo gallery upload (V2 - using placeholders)
- [ ] Attendee photo upload (using initials placeholders)
- [ ] RSVP reminder sending from landing page
- [ ] Edit permissions for organizers from this page
- [ ] Map/directions integration
- [ ] Calendar add button (on landing page — exists on confirmation)
- [ ] ProgressBar scroll indicator (V2 - deferred for simplicity)
- [ ] Custom scrollytelling configuration (V2 - hardcode NO EDGES only)

---

## Technical Dependencies

### Existing (in Better Contacts)
| Dependency | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.0.0 | App Router, API routes |
| React | 19.0.0 | UI framework |
| Prisma | 6.19.1 | ORM |
| Tailwind CSS | 3.4.0 | Styling |
| shadcn/ui | Latest | Component library |
| Framer Motion | 12.23.26 | Animations |
| Lucide React | Latest | Icons |

### Database Models (Already Exist)
- `Event` — Event details, venue, settings (has `tagline`, needs `slug`, `schedule`)
- `EventAttendee` — Attendee profiles with RSVP status, tradingCard JSON
- `EventOrganizer` — Host/organizer information

### RSVPStatus Mapping
The database uses Prisma enum `RSVPStatus` with values:
- `PENDING` → Displayed as "Invited" (not yet responded)
- `CONFIRMED` → Displayed as "Confirmed"
- `MAYBE` → Displayed as "Maybe"
- `DECLINED` → Not displayed on landing page

### External Documentation
- [Framer Motion docs](https://motion.dev/) — Animation patterns
- [Tailwind CSS docs](https://tailwindcss.com/docs) — Utility classes

---

## Detailed Design

### URL Structure

```
/events/[slug]    → Public landing page (new)
/rsvp/[token]     → RSVP questionnaire flow (existing concept, not yet built)
```

**Slug generation algorithm**:
When creating an event, generate a URL-safe slug from the event name:
1. Convert to lowercase
2. Replace spaces and special characters with hyphens
3. Remove consecutive hyphens
4. If slug already exists, append `-xxxx` where xxxx is 4 random alphanumeric characters

Example:
- "NO EDGES – 33 Strategies Launch" → `no-edges-33-strategies-launch`
- If collision: `no-edges-33-strategies-launch-a7b2`

### Responsive Breakpoints
Using standard Tailwind CSS breakpoints:
- **Mobile**: < 640px (default styles)
- **sm**: 640px+ (small tablets)
- **md**: 768px+ (tablets, small laptops)
- **lg**: 1024px+ (desktops)

### Page Architecture

```
src/app/events/[slug]/
├── page.tsx                    # Server Component - data fetching
├── not-found.tsx               # 404 page for invalid slugs
├── EventLandingClient.tsx      # Client Component - interactions
└── components/
    ├── ScrollytellingSection.tsx  # Optional intro slides (NO EDGES hardcoded)
    ├── EventHero.tsx              # Event name, tagline, CTA
    ├── VenueSection.tsx           # Venue details + placeholder
    ├── AttendeeCarousel.tsx       # Horizontal scrollable attendees
    ├── AttendeeCard.tsx           # Individual attendee card (single size)
    ├── ProfileModal.tsx           # Full attendee profile modal
    ├── FullGuestListModal.tsx     # Grid view with tabs
    ├── ScheduleSection.tsx        # Timeline agenda
    ├── HostSection.tsx            # Organizer profile
    └── FooterCTA.tsx              # Bottom RSVP call-to-action
```

### Component Specifications

#### 1. ScrollytellingSection (Optional)
**Purpose**: Event-specific storytelling intro before main content

This component is **optional per event**. For V1, we hardcode the NO EDGES scrollytelling content. Custom configuration is deferred to V2.

**Behavior**:
- Each slide occupies full viewport height
- Slides fade based on scroll position (activeSlide = floor((scrollY + vh * 0.4) / vh))
- After scrollytelling completes, event details fade in

**Animation specs** (from prototype):
```typescript
// Slide opacity based on active state
className={`transition-opacity duration-700 ${activeSlide === index ? 'opacity-100' : 'opacity-20'}`}

// SVG animations use CSS keyframes
@keyframes float-particle {
  0% { transform: translate(0, 0); opacity: 0.6; }
  50% { opacity: 0.8; }
  100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}
```

**For V1**: Check if event name contains "NO EDGES" to enable scrollytelling. Otherwise, skip directly to EventHero.

---

#### 2. EventHero
**Purpose**: Main event branding and primary CTA

```typescript
interface EventHeroProps {
  name: string;            // "NO EDGES"
  tagline?: string;        // "The lines have moved. Have you?"
  date: Date;
  startTime: string;
  endTime: string;
  location: string;        // "Austin, Texas"
  rsvpUrl: string;         // Link to RSVP flow
  ctaText?: string;        // Default: "Request an Invitation"
}
```

**Design**:
- Centered layout, full viewport height (`min-h-screen`)
- Event name: `text-6xl md:text-7xl lg:text-8xl`, Georgia serif, gold accent on first word
- Tagline: `text-xl md:text-2xl`, italic, zinc-300
- Decorative gradient divider: `w-20 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent`
- Date/location: `text-zinc-400 tracking-widest uppercase`
- CTA button: `px-8 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400`

---

#### 3. VenueSection
**Purpose**: Display venue information with photo placeholder

```typescript
interface VenueSectionProps {
  venueName: string;
  venueAddress: string;
  parkingNotes?: string;
  dressCode?: string;
}
```

**Design**:
- Section marker: `text-amber-500 text-sm font-medium tracking-widest uppercase` → "THE VENUE"
- Hero image placeholder: `aspect-video bg-zinc-900 rounded-3xl` with centered placeholder text
- Venue name and address: `text-zinc-500 text-center`

**V1**: Use placeholder with "Venue Photography Coming Soon" text.

---

#### 4. AttendeeCarousel
**Purpose**: Horizontal scrollable list of attendees by status

```typescript
interface AttendeeCarouselProps {
  title: string;           // "Confirmed", "Maybe", "Invited"
  subtitle?: string;       // "They're in. Are you?"
  attendees: PublicAttendee[];
  statusColor: string;     // "bg-emerald-500", "bg-amber-500", "bg-zinc-600"
  onSelectAttendee: (attendee: PublicAttendee) => void;
}
```

**Design**:
- Header row: Status dot (w-2 h-2) + title + count + subtitle
- Horizontal scroll: `overflow-x-auto scrollbar-hide` with `style={{ scrollbarWidth: 'none' }}`
- Navigation buttons: Appear based on scroll position, `w-10 h-10 rounded-full bg-zinc-900/90`
- Fade gradients: `w-12 bg-gradient-to-r from-zinc-950 to-transparent` at edges
- Card width: `w-44` (single size for all carousels)

**Scroll behavior**:
- Scroll 300px per button click
- Left button hidden when `scrollLeft <= 0`
- Right button hidden when `scrollLeft >= scrollWidth - clientWidth - 10`

---

#### 5. AttendeeCard
**Purpose**: Individual attendee in carousel or grid

```typescript
interface AttendeeCardProps {
  attendee: PublicAttendee;
  onClick: () => void;
}
```

**Design** (single size, `w-44 p-5`):
- Avatar: `w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800` with initials
- Status dot: `w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5` with border
- Name: `text-white text-sm font-medium truncate`
- Title + Company: `text-xs text-zinc-500/600 truncate`
- Hover: `hover:border-amber-500/50 hover:bg-zinc-900`

**Status colors**:
- Confirmed (CONFIRMED): `bg-emerald-500`
- Maybe (MAYBE): `bg-amber-500`
- Invited (PENDING): `bg-zinc-600`

---

#### 6. ProfileModal
**Purpose**: Full-screen modal showing attendee details

```typescript
interface ProfileModalProps {
  attendee: PublicAttendee | null;
  onClose: () => void;
}
```

**Content**:
- Large avatar: `w-20 h-20 rounded-2xl` with initials
- Name: `text-2xl`, Georgia serif
- Title, Company: `text-zinc-400`
- Location: `text-zinc-600 text-sm`
- Status badge: Colored dot + text
- **Background** section: `EventAttendee.tradingCard.background` or profile bio
- **Why They're Interesting** section: `tradingCard.whyMatch` joined as paragraph
- **Conversation Starters** section: Bulleted list from `tradingCard.conversationStarters`

**Design**:
- Backdrop: `fixed inset-0 z-50 bg-black/80 backdrop-blur-sm`
- Modal: `bg-zinc-900 border-zinc-800 rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto`
- Close button: `absolute top-6 right-6 text-2xl text-zinc-500 hover:text-white`
- Section labels: `text-amber-500 text-sm font-medium tracking-widest uppercase mb-3`

**Empty state handling**: If `tradingCard` is incomplete:
- Show available data only
- Hide sections with no content (don't show empty headers)
- Always show name, title, company if available

---

#### 7. FullGuestListModal
**Purpose**: Grid view of all attendees with status filtering

```typescript
interface FullGuestListModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: PublicAttendee[];
  onSelectAttendee: (attendee: PublicAttendee) => void;
}
```

**Design**:
- Header: Section marker "THE ROOM" + title "Full Guest List"
- Tab bar: `flex gap-2 bg-zinc-900 rounded-xl p-1.5 inline-flex`
- Tabs: Confirmed (emerald), Maybe (amber), Invited (zinc) with counts
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
- Cards: Same as AttendeeCard, click opens ProfileModal

**Tab styling**:
- Active: `bg-{color}-500/20 text-{color}-400`
- Inactive: `text-zinc-500 hover:text-zinc-300`

---

#### 8. ScheduleSection
**Purpose**: Display event agenda timeline

```typescript
interface ScheduleSectionProps {
  schedule: Array<{
    time: string;        // "3:00"
    title: string;       // "Building at the Speed of Thought"
    description: string; // "Fireside conversation..."
  }>;
}
```

**Design**:
- Section marker: "THE AGENDA"
- Title: `text-3xl md:text-4xl`, Georgia serif, "How the Evening Unfolds"
- Timeline items: `flex gap-6 pb-4 border-b border-zinc-800`
- Time: `text-amber-500 font-mono text-sm w-12 flex-shrink-0`
- Title: `text-white font-medium mb-1`
- Description: `text-zinc-500 text-sm`

**Empty state**: If no schedule, hide entire section.

---

#### 9. HostSection
**Purpose**: Display event organizer/host information

```typescript
interface HostSectionProps {
  name: string;
  title?: string;        // "Founder, 33 Strategies"
  bio?: string;
  quote?: string;
}
```

**Design**:
- Section marker: "YOUR HOST"
- Name: `text-3xl md:text-4xl`, Georgia serif
- Layout: Avatar (w-24 h-24) + bio column on md+
- Quote: `text-xl`, italic, Georgia serif, if provided
- Bio context: `text-zinc-500 text-sm`

**Data source**: The primary organizer is `Event.userId` (the user who created the event).
Host bio/quote come from `Event.hostBio` and `Event.hostQuote` fields.
Host name/title come from the User record associated with `Event.userId`.

---

#### 10. FooterCTA
**Purpose**: Bottom call-to-action section

```typescript
interface FooterCTAProps {
  eventName: string;
  tagline?: string;
  date: string;
  location: string;
  rsvpUrl: string;
}
```

**Design**:
- Quote/tagline: `text-2xl md:text-3xl`, Georgia serif, gold highlight on key phrase
- CTA button: `px-10 py-5 bg-amber-500 text-black font-semibold rounded-xl text-lg`
- Event details: `text-zinc-500/600 text-sm`
- Atmospheric glow: `w-80 h-56 bg-amber-500/5 rounded-full blur-3xl` positioned behind

---

### Error Handling

#### 404 Not Found
When event slug doesn't exist, display a custom 404 page:

```typescript
// src/app/events/[slug]/not-found.tsx
export default function EventNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl text-white font-medium mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Event Not Found
        </h1>
        <p className="text-zinc-400 mb-8">
          This event doesn't exist or may have been removed.
        </p>
        <a href="/" className="text-amber-500 hover:text-amber-400">
          Return Home
        </a>
      </div>
    </div>
  );
}
```

#### Empty Attendee List
If an event has no attendees in a status category:
- Hide that carousel entirely (don't show empty carousel)
- If ALL categories empty, show message: "Be the first to RSVP!"

#### Incomplete Trading Card
If attendee has incomplete `tradingCard` data:
- Show the card in carousel (name is always available from firstName/lastName)
- In ProfileModal, hide sections that have no content
- Never show empty section headers

---

### Data Model Additions

**Event model additions** (Prisma schema):

```prisma
model Event {
  // Existing fields...

  // New fields for landing page
  slug            String    @unique  // URL-safe identifier, auto-generated
  schedule        Json?               // Array of { time, title, description }

  // Host bio (stored on event, not organizer)
  hostBio         String?
  hostQuote       String?
}
```

Note: `tagline` already exists in schema. `heroImageUrl` and `scrollytelling` JSON deferred to V2.

---

### API Endpoints

#### GET /api/events/[slug]
**Purpose**: Fetch public event data for landing page

**Authentication**: None (public endpoint)

**Error responses**:
- 404: Event not found → `{ error: "Event not found" }`
- 500: Server error → `{ error: "Internal server error" }`

**Success response**:
```typescript
interface PublicEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    tagline?: string;
    date: string;          // ISO date string
    startTime: string;
    endTime: string;
    venueName: string;
    venueAddress: string;
    parkingNotes?: string;
    dressCode?: string;
    schedule?: ScheduleItem[];
  };
  attendees: {
    confirmed: PublicAttendee[];  // RSVPStatus.CONFIRMED
    maybe: PublicAttendee[];      // RSVPStatus.MAYBE
    invited: PublicAttendee[];    // RSVPStatus.PENDING
  };
  host: {
    name: string;
    title?: string;
    bio?: string;
    quote?: string;
  };
  rsvpUrl: string;  // Generic RSVP URL (token-based URLs are per-invitee)
}

interface PublicAttendee {
  id: string;
  name: string;              // firstName + lastName
  title?: string;            // From tradingCard.headline or profile
  company?: string;
  location?: string;
  status: 'confirmed' | 'maybe' | 'invited';  // Mapped from RSVPStatus enum
  tradingCard?: {
    background?: string;
    whyInteresting?: string;        // Joined from whyMatch[]
    conversationStarters?: string[];
  };
}
```

**Privacy filtering**:
- Exclude: email, phone, questionnaireResponses, internal IDs
- Include only: display-safe profile data from tradingCard
- Filter out DECLINED attendees entirely

---

### User Experience

#### User Journey (Invitee)

1. **Entry**: User clicks invite link in email/SMS
2. **First impression**: Scrollytelling begins (if NO EDGES event)
3. **Scroll through story**: Absorb event narrative/thesis
4. **Hero section**: See event name, date, location, primary CTA
5. **Browse venue**: See where the event takes place
6. **Explore attendees**: Browse confirmed/maybe/invited carousels
7. **View profiles**: Click attendee → profile modal → conversation starters
8. **Full guest list**: Click "View Full Guest List" → modal with tabs
9. **Check schedule**: See what to expect during the event
10. **Learn about host**: See who's organizing
11. **CTA**: Click "Request an Invitation" → redirected to RSVP flow

#### Mobile Experience

- All carousels support touch/swipe (native scroll)
- Modals are full-screen with `max-h-[90vh]`
- Touch targets minimum 44px × 44px
- Responsive grid: 2 cols on mobile, 3-4 on desktop

---

## Testing Strategy

### Unit Tests
- `AttendeeCard` renders correctly with all status types
- `AttendeeCarousel` scroll buttons appear/hide based on scroll position
- `ProfileModal` displays available sections, hides empty ones
- Status color mapping: CONFIRMED→emerald, MAYBE→amber, PENDING→zinc

### Integration Tests
- `/api/events/[slug]` returns correct data structure
- Privacy filtering removes email, phone, sensitive data
- Slug generation produces unique slugs with collision handling
- 404 returned for non-existent slugs

### E2E Tests (Playwright)
```typescript
// tests/event-landing-page.spec.ts

test('displays event details and attendees', async ({ page }) => {
  await page.goto('/events/no-edges-33-strategies-launch');

  // Verify event name
  await expect(page.getByText('NO EDGES')).toBeVisible();

  // Verify attendee carousels
  await expect(page.getByText('Confirmed')).toBeVisible();

  // Click attendee card
  await page.locator('[data-testid="attendee-card"]').first().click();

  // Verify modal opens with content
  await expect(page.getByText('Background')).toBeVisible();
});

test('full guest list modal filters by status', async ({ page }) => {
  await page.goto('/events/no-edges-33-strategies-launch');

  await page.getByText('View Full Guest List').click();

  // Verify tabs exist
  await expect(page.getByRole('button', { name: /Confirmed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Maybe/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Invited/ })).toBeVisible();

  // Switch tabs
  await page.getByRole('button', { name: /Maybe/ }).click();
});

test('shows 404 for invalid slug', async ({ page }) => {
  await page.goto('/events/this-event-does-not-exist');

  await expect(page.getByText('Event Not Found')).toBeVisible();
});

test('CTA button has correct href', async ({ page }) => {
  await page.goto('/events/no-edges-33-strategies-launch');

  const cta = page.getByText('Request an Invitation').first();
  await expect(cta).toBeVisible();
});
```

---

## Performance Considerations

### Initial Load
- Server-render event details and attendee lists
- No lazy-loading needed for V1 (attendee counts expected <200)
- If >50 attendees, consider pagination in V2

### Animation Performance
- Use CSS transforms for carousel scroll (GPU-accelerated)
- Scrollytelling uses CSS `opacity` transitions (not JS animation)
- Framer Motion reserved for modal enter/exit only

---

## Security Considerations

### Public Data Exposure
- Only expose display-safe data: name, title, company, location
- No email addresses, phone numbers, or questionnaire responses
- Trading card data is curated for public display

### RSVP Token Security
- Generic RSVP URL on landing page (not personalized)
- Individual invite tokens handled in RSVP flow (separate spec)

### Rate Limiting
- Rate limit `/api/events/[slug]` to 60 requests/minute per IP
- Consider adding to existing rate limiting middleware

---

## Documentation

### Files to Create/Update
- [ ] `src/app/events/[slug]/page.tsx` — Server Component
- [ ] `src/app/events/[slug]/not-found.tsx` — 404 page
- [ ] `src/app/events/[slug]/EventLandingClient.tsx` — Client Component
- [ ] `src/app/events/[slug]/components/*.tsx` — All sub-components
- [ ] `src/app/api/events/[slug]/route.ts` — Public API endpoint
- [ ] `prisma/schema.prisma` — Add slug, schedule, hostBio, hostQuote
- [ ] `src/lib/m33t/slug.ts` — Slug generation utility
- [ ] `CLAUDE.md` — Add "Event Landing Page Pattern" section

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Add Event schema fields (slug, schedule, hostBio, hostQuote)
- [ ] Create slug generation utility with collision handling
- [ ] Create `/api/events/[slug]` public endpoint with privacy filtering
- [ ] Create page structure: page.tsx, not-found.tsx, EventLandingClient.tsx
- [ ] Implement EventHero component
- [ ] Implement VenueSection component

### Phase 2: Attendee Display
- [ ] Implement AttendeeCard component (single size)
- [ ] Implement AttendeeCarousel with scroll behavior
- [ ] Implement ProfileModal with empty-state handling
- [ ] Implement FullGuestListModal with tabs

### Phase 3: Event Details
- [ ] Implement ScheduleSection
- [ ] Implement HostSection
- [ ] Implement FooterCTA

### Phase 4: Scrollytelling
- [ ] Implement ScrollytellingSection with hardcoded NO EDGES content
- [ ] Add scroll-based opacity transitions
- [ ] Add SVG visualizations (dissolving boundary, Venn convergence)

### Phase 5: Polish
- [ ] Mobile responsiveness testing on 375px viewport
- [ ] Touch/swipe carousel testing
- [ ] E2E test suite
- [ ] Update CLAUDE.md documentation

---

## Open Questions (Resolved)

1. ~~**Slug uniqueness**~~ → **Resolved**: Append `-xxxx` random suffix on collision

2. ~~**Attendee visibility toggle**~~ → **Deferred to V2**: All attendees public for now

3. ~~**RSVP required for viewing**~~ → **Resolved**: Fully public, no RSVP required

4. ~~**Schedule data entry**~~ → **Resolved**: JSON field, wizard step in V2

5. ~~**Trading card completeness**~~ → **Resolved**: Show available data, hide empty sections

6. ~~**Host data source**~~ → **Resolved**: Event.userId is host, bio/quote on Event model

---

## References

### Prototype
- `33-strategies-event-page-v2.jsx` — Complete prototype with all components

### Related Specs
- `specs/feat-m33t-event-networking-platform.md` — Core M33T platform spec
- `specs/feat-m33t-event-creation-wizard/` — Event creation wizard spec
- `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md` — Phase 1 journey

### Design System
- `CLAUDE.md` — Design system colors, typography, patterns
- `docs/m33t-implemenation-handoff-package/TRADING_CARD_DISPLAY.md` — Card display rules

---

*Last Updated: January 2026*
