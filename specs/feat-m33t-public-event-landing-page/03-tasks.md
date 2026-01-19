# M33T Public Event Landing Page - Task Breakdown

## Status
**In Progress** — Tasks ready for implementation

---

## Phase 1: Core Infrastructure

### Task 1.1: Database Schema Updates
**Priority**: Critical (blocking)
**Estimated Complexity**: Low

Add new fields to Event model for landing page support.

**Files to modify:**
- `prisma/schema.prisma`

**Implementation:**
```prisma
model Event {
  // Add new fields
  slug            String    @unique  // URL-safe identifier
  schedule        Json?               // Array of { time, title, description }
  hostBio         String?
  hostQuote       String?
}
```

**Commands:**
```bash
npm run migrate:safe -- add-event-landing-page-fields
```

**Acceptance criteria:**
- [ ] slug field added with unique constraint
- [ ] schedule JSON field added
- [ ] hostBio and hostQuote string fields added
- [ ] Migration runs without errors

---

### Task 1.2: Slug Generation Utility
**Priority**: Critical (blocking)
**Estimated Complexity**: Low

Create utility for generating URL-safe slugs with collision handling.

**Files to create:**
- `src/lib/m33t/slug.ts`

**Implementation:**
```typescript
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;

  if (await checkExists(slug)) {
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}
```

**Acceptance criteria:**
- [ ] generateSlug converts name to URL-safe string
- [ ] generateUniqueSlug appends random suffix on collision
- [ ] Special characters and spaces handled correctly

---

### Task 1.3: Public API Endpoint
**Priority**: Critical (blocking)
**Estimated Complexity**: Medium

Create public API endpoint for fetching event data with privacy filtering.

**Files to create:**
- `src/app/api/events/[slug]/route.ts`

**Implementation notes:**
- NO authentication required (public endpoint)
- Filter out email, phone, questionnaireResponses
- Map RSVPStatus enum to display strings (PENDING → 'invited')
- Exclude DECLINED attendees entirely
- Return 404 for non-existent slugs

**Response structure:**
```typescript
{
  event: { id, slug, name, tagline, date, startTime, endTime, venueName, venueAddress, parkingNotes, dressCode, schedule },
  attendees: { confirmed: [], maybe: [], invited: [] },
  host: { name, title, bio, quote },
  rsvpUrl: string
}
```

**Acceptance criteria:**
- [ ] Returns event data for valid slug
- [ ] Returns 404 for invalid slug
- [ ] Privacy filtering removes sensitive data
- [ ] RSVPStatus properly mapped to display strings
- [ ] DECLINED attendees excluded

---

### Task 1.4: Page Structure
**Priority**: Critical
**Estimated Complexity**: Low

Create the page files and basic structure.

**Files to create:**
- `src/app/events/[slug]/page.tsx` — Server Component
- `src/app/events/[slug]/not-found.tsx` — 404 page
- `src/app/events/[slug]/EventLandingClient.tsx` — Client Component

**page.tsx implementation:**
```typescript
import { notFound } from 'next/navigation';
import { EventLandingClient } from './EventLandingClient';

async function getEventData(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const data = await getEventData(params.slug);
  if (!data) notFound();
  return <EventLandingClient {...data} />;
}
```

**Acceptance criteria:**
- [ ] page.tsx fetches data and passes to client component
- [ ] not-found.tsx displays styled 404 page
- [ ] EventLandingClient receives and renders data

---

### Task 1.5: EventHero Component
**Priority**: High
**Estimated Complexity**: Medium

Implement the main event branding and primary CTA section.

**Files to create:**
- `src/app/events/[slug]/components/EventHero.tsx`

**Design specs:**
- Event name: `text-6xl md:text-7xl lg:text-8xl`, Georgia serif, gold accent on first word
- Tagline: `text-xl md:text-2xl`, italic, zinc-300
- Decorative divider: `w-20 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent`
- CTA button: `px-8 py-4 bg-amber-500 text-black font-semibold rounded-xl`

**Acceptance criteria:**
- [ ] Displays event name with gold first word
- [ ] Shows tagline in italic
- [ ] Renders date and location
- [ ] CTA button links to RSVP URL

---

### Task 1.6: VenueSection Component
**Priority**: High
**Estimated Complexity**: Low

Implement venue information display with placeholder image.

**Files to create:**
- `src/app/events/[slug]/components/VenueSection.tsx`

**Design specs:**
- Section marker: "THE VENUE" in amber uppercase tracking-widest
- Image placeholder: `aspect-video bg-zinc-900 rounded-3xl`
- Venue details: centered text in zinc-400/500

**Acceptance criteria:**
- [ ] Displays section marker
- [ ] Shows venue placeholder image
- [ ] Renders venue name and address
- [ ] Shows parking notes and dress code if present

---

## Phase 2: Attendee Display

### Task 2.1: AttendeeCard Component
**Priority**: High
**Estimated Complexity**: Low

Implement individual attendee card for carousel and grid.

**Files to create:**
- `src/app/events/[slug]/components/AttendeeCard.tsx`

**Design specs (single size w-44):**
- Avatar: `w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800` with initials
- Status dot: positioned bottom-right with border
- Name: `text-white text-sm font-medium truncate`
- Title + Company: `text-xs text-zinc-500 truncate`

**Status colors:**
- confirmed: `bg-emerald-500`
- maybe: `bg-amber-500`
- invited: `bg-zinc-600`

**Acceptance criteria:**
- [ ] Renders avatar with initials
- [ ] Shows status-colored dot
- [ ] Displays name, title, company
- [ ] Hover state changes border/background
- [ ] Click handler works

---

### Task 2.2: AttendeeCarousel Component
**Priority**: High
**Estimated Complexity**: Medium

Implement horizontal scrollable attendee list.

**Files to create:**
- `src/app/events/[slug]/components/AttendeeCarousel.tsx`

**Design specs:**
- Header: Status dot + title + count + subtitle
- Container: `overflow-x-auto` with hidden scrollbar
- Navigation: Round buttons appear based on scroll position
- Fade gradients at edges

**Scroll behavior:**
- 300px per button click
- Left button hidden when scrollLeft <= 0
- Right button hidden at end

**Acceptance criteria:**
- [ ] Horizontal scroll works with touch/mouse
- [ ] Navigation buttons appear/hide correctly
- [ ] Click on card opens profile modal
- [ ] Fade gradients at edges

---

### Task 2.3: ProfileModal Component
**Priority**: High
**Estimated Complexity**: Medium

Implement full attendee profile modal.

**Files to create:**
- `src/app/events/[slug]/components/ProfileModal.tsx`

**Design specs:**
- Backdrop: `fixed inset-0 z-50 bg-black/80 backdrop-blur-sm`
- Modal: `bg-zinc-900 rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto`
- Section labels: amber uppercase tracking-widest

**Content sections:**
- Background (from tradingCard.background)
- Why They're Interesting (from tradingCard.whyMatch)
- Conversation Starters (bulleted list)

**Empty state handling:**
- Hide sections with no content
- Never show empty headers

**Acceptance criteria:**
- [ ] Modal opens/closes properly
- [ ] Shows all available profile data
- [ ] Hides empty sections
- [ ] Close button works
- [ ] Click outside closes modal

---

### Task 2.4: FullGuestListModal Component
**Priority**: High
**Estimated Complexity**: Medium

Implement grid view of all attendees with filtering tabs.

**Files to create:**
- `src/app/events/[slug]/components/FullGuestListModal.tsx`

**Design specs:**
- Header: "THE ROOM" marker + "Full Guest List" title
- Tab bar: Rounded container with colored tabs
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

**Tab styling:**
- Active: `bg-{color}-500/20 text-{color}-400`
- Inactive: `text-zinc-500 hover:text-zinc-300`

**Acceptance criteria:**
- [ ] Modal opens/closes properly
- [ ] Tabs filter attendees by status
- [ ] Shows counts in tab labels
- [ ] Grid displays AttendeeCards
- [ ] Click on card opens ProfileModal

---

## Phase 3: Event Details

### Task 3.1: ScheduleSection Component
**Priority**: Medium
**Estimated Complexity**: Low

Implement event agenda timeline.

**Files to create:**
- `src/app/events/[slug]/components/ScheduleSection.tsx`

**Design specs:**
- Section marker: "THE AGENDA"
- Title: Georgia serif, "How the Evening Unfolds"
- Timeline items: time (amber mono) + title + description

**Empty state:**
- If no schedule, hide entire section

**Acceptance criteria:**
- [ ] Renders timeline with correct styling
- [ ] Each item shows time, title, description
- [ ] Hidden when schedule is empty/null

---

### Task 3.2: HostSection Component
**Priority**: Medium
**Estimated Complexity**: Low

Implement organizer/host information section.

**Files to create:**
- `src/app/events/[slug]/components/HostSection.tsx`

**Design specs:**
- Section marker: "YOUR HOST"
- Name: Georgia serif
- Layout: Avatar + bio column
- Quote: italic Georgia serif if provided

**Acceptance criteria:**
- [ ] Displays host name and title
- [ ] Shows avatar with initials
- [ ] Renders bio if present
- [ ] Shows quote in italic if present

---

### Task 3.3: FooterCTA Component
**Priority**: Medium
**Estimated Complexity**: Low

Implement bottom call-to-action section.

**Files to create:**
- `src/app/events/[slug]/components/FooterCTA.tsx`

**Design specs:**
- Quote/tagline with gold highlight
- Large CTA button: `px-10 py-5 bg-amber-500 rounded-xl text-lg`
- Event details: smaller text below
- Atmospheric glow: amber blur behind

**Acceptance criteria:**
- [ ] Displays tagline with highlight
- [ ] CTA button links to RSVP
- [ ] Shows event date and location
- [ ] Glow effect renders correctly

---

## Phase 4: Scrollytelling

### Task 4.1: ScrollytellingSection Component
**Priority**: Medium
**Estimated Complexity**: High

Implement scroll-based story slides (hardcoded NO EDGES content).

**Files to create:**
- `src/app/events/[slug]/components/ScrollytellingSection.tsx`

**Content (5 slides):**
1. "FOUNDERS..." - animated particles
2. "INVESTORS..." - animated particles
3. "OPERATORS..." - Venn diagram converging
4. "NO EDGES" - bold title
5. Final slide with event context

**Animation specs:**
- activeSlide = floor((scrollY + vh * 0.4) / vh)
- Slides transition opacity: active = 1, inactive = 0.2
- Duration: 700ms

**V1 behavior:**
- Only shown for events with "NO EDGES" in name
- Otherwise skip to EventHero

**Acceptance criteria:**
- [ ] Scroll triggers slide transitions
- [ ] SVG animations render correctly
- [ ] Conditional display based on event name
- [ ] Smooth opacity transitions

---

## Phase 5: Polish

### Task 5.1: Mobile Responsiveness Testing
**Priority**: High
**Estimated Complexity**: Medium

Test and fix all components on 375px viewport.

**Test checklist:**
- [ ] EventHero text sizes scale properly
- [ ] VenueSection image maintains aspect ratio
- [ ] Carousels are touch-scrollable
- [ ] ProfileModal fits within viewport
- [ ] FullGuestListModal grid is 2 columns
- [ ] All touch targets >= 44px
- [ ] No horizontal overflow

**Acceptance criteria:**
- [ ] All components render correctly on 375px
- [ ] Touch interactions work smoothly
- [ ] No layout breaking issues

---

### Task 5.2: E2E Test Suite
**Priority**: High
**Estimated Complexity**: Medium

Create Playwright tests for landing page.

**Files to create:**
- `tests/event-landing-page.spec.ts`

**Tests to implement:**
- Event details display
- Attendee carousel navigation
- Profile modal open/close
- Full guest list modal with tabs
- 404 for invalid slug
- CTA button href

**Acceptance criteria:**
- [ ] All tests pass
- [ ] Tests cover happy path and error cases
- [ ] Mobile viewport tests included

---

### Task 5.3: Documentation Update
**Priority**: Medium
**Estimated Complexity**: Low

Update CLAUDE.md with Event Landing Page pattern.

**Files to modify:**
- `CLAUDE.md`

**Content to add:**
- Event Landing Page Pattern section
- Key files and locations
- URL structure
- Component hierarchy
- API response structure

**Acceptance criteria:**
- [ ] Pattern documented in CLAUDE.md
- [ ] All key files listed
- [ ] Data flow explained

---

## Dependencies

```
Task 1.1 (Schema) → Task 1.2 (Slug) → Task 1.3 (API) → Task 1.4 (Page)
                                                    ↓
                    Task 2.1 (Card) → Task 2.2 (Carousel) → Task 2.4 (FullList)
                           ↓
                    Task 2.3 (ProfileModal)
                           ↓
Phase 3 (Details) → Phase 4 (Scrollytelling) → Phase 5 (Polish)
```

---

*Last Updated: January 2026*
