# M33T Add to Calendar

**Slug:** m33t-add-to-calendar
**Author:** Claude Code
**Date:** 2026-02-01
**Branch:** preflight/m33t-add-to-calendar
**Related:** RSVP flow completion page, M33T event landing pages

---

## 1) Intent & Assumptions

- **Task brief:** Add "Add to Calendar" functionality to the M33T RSVP completion screen. After a user RSVPs and completes their profile, they see event date/time/location but have no way to add it to their calendar -- a critical UX gap. This should support Google Calendar and Apple/iOS Calendar at minimum, with a premium feel matching the 33 Strategies brand.

- **Assumptions:**
  - The primary placement is the RSVP completion page (`/m33t/[slug]/rsvp/[token]/complete`)
  - Event data already includes all necessary fields: `name`, `date`, `startTime`, `endTime`, `timezone`, `venueName`, `venueAddress`
  - No server-side calendar API integration needed (Google Calendar URL + .ics file generation are client-side only)
  - No existing calendar-related code or libraries in the codebase
  - Mobile-first audience (most invitees will RSVP from their phone)

- **Out of scope:**
  - Server-side Google Calendar API OAuth integration
  - Calendar sync / two-way updates (e.g., if event time changes)
  - Push notification reminders
  - Adding to calendar from the public event landing page (future enhancement)
  - Outlook-specific deep links (covered generically by .ics)

---

## 2) Pre-reading Log

- `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`: **The target page.** Server Component that shows success header, event details card (date/time/location), "what happens next" section, and profile preview. The calendar button would go inside the event details card, after the date/time/location info and before or alongside the "what happens next" section.
- `prisma/schema.prisma` (Event model, lines 456-528): Event has `date` (DateTime), `startTime`/`endTime` (String "HH:MM"), `timezone` (String, default "America/Chicago"), `venueName`, `venueAddress`, `name`, `tagline`, `description`.
- `src/lib/m33t/index.ts`: Barrel file for all M33T utilities. New calendar utility should be exported here.
- `src/lib/m33t/formatting.ts`: Existing date/time formatting utilities (`formatEventDate`, `formatEventTime`, `formatEventTimeRange`).
- `src/components/m33t/RSVPForm.tsx`: Gold-accent button styling patterns: `bg-gold-primary hover:bg-gold-light text-bg-primary`.
- `tailwind.config.ts`: Gold color tokens defined (`gold-primary`, `gold-light`, `gold-subtle`, `gold-glow`).
- `developer-guides/09-m33t-landing-pages-guide.md`: M33T landing page patterns and 33 Strategies brand guidelines.

---

## 3) Codebase Map

- **Primary components/modules:**
  - `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx` -- Completion page (insertion point)
  - `src/lib/m33t/formatting.ts` -- Date/time formatting utilities
  - `src/lib/m33t/index.ts` -- Barrel exports

- **New files to create:**
  - `src/lib/m33t/calendar.ts` -- Calendar URL/ICS generation utilities
  - `src/components/m33t/AddToCalendarButton.tsx` -- Client Component with dropdown/modal

- **Shared dependencies:**
  - `date-fns` (already installed -- for date manipulation)
  - `lucide-react` (already installed -- `Calendar`, `ChevronDown` icons)
  - `framer-motion` (already installed -- for dropdown/modal animation)
  - Tailwind gold tokens (`gold-primary`, `gold-light`, `gold-subtle`)

- **Data flow:**
  - Server Component fetches event from Prisma (date, startTime, endTime, timezone, venueName, venueAddress, name, description)
  - Props passed to `AddToCalendarButton` Client Component
  - Client Component generates Google Calendar URL or .ics blob on click
  - Google Calendar: opens new tab with pre-filled event
  - Apple/.ics: triggers file download, OS handles opening

- **Feature flags/config:** None needed

- **Potential blast radius:** Minimal -- only touches the completion page and adds new utility/component files. No existing code modified except inserting the button into the completion page JSX.

---

## 4) Root Cause Analysis

N/A -- This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

**1. Side-by-side buttons (Google + Apple)**

Two buttons displayed inline, each with provider icon and label.

- **Pros:** Zero interaction overhead (one tap), immediately clear what each does, no modal/dropdown to dismiss
- **Cons:** Takes more horizontal space, looks cluttered on a premium/minimal design, forces a choice immediately which can cause decision paralysis, doesn't scale if we add Outlook/Yahoo later

**2. Single button with dropdown menu**

One "Add to Calendar" button that reveals a small floating menu with provider options on click.

- **Pros:** Clean single-button aesthetic, scales to any number of providers, familiar pattern (used by Luma, modern event platforms), minimal footprint
- **Cons:** Requires two taps, dropdown positioning can be finicky on mobile

**3. Single button with bottom sheet (mobile) / modal (desktop)**

One button that opens a bottom sheet on mobile or a centered modal on desktop with provider options.

- **Pros:** Premium feel, great mobile UX (thumb-friendly), room for provider icons and descriptions, used by Partiful and other premium event apps
- **Cons:** Most complex to implement, may feel heavy for just 2-3 options

**4. Single smart button (detect platform, auto-select)**

Detect if user is on iOS/macOS and auto-download .ics, otherwise open Google Calendar.

- **Pros:** Single tap, zero decision for user, "it just works"
- **Cons:** Assumes all Apple users want Apple Calendar (many use Google Calendar on iOS), no way to choose alternative, feels opaque/magical in a bad way

**5. Zero-dependency vanilla approach vs. npm library**

- **`add-to-calendar-button`** (~60KB): Full web component, feature-rich but heavy and opinionated styling
- **`datebook`** (~15KB): Lightweight utility, generates URLs/ICS, no UI
- **Vanilla JS** (~2-3KB): Manual URL construction + ICS string generation

- **Recommendation:** Vanilla JS. The URL schemes and ICS format are well-documented standards. A library adds unnecessary bundle weight for what amounts to string concatenation. Google Calendar is just a URL with query params. ICS is a plain text format with ~15 lines.

### Recommendation

**Single "Add to Calendar" button with a compact dropdown menu.** Here's why:

1. **Premium aesthetic:** One clean button maintains the minimal, sophisticated look of 33 Strategies. Side-by-side buttons feel utilitarian.
2. **Two taps is fine:** The user just completed a multi-step RSVP flow. One extra tap to pick their calendar provider is negligible.
3. **Mobile-friendly:** A dropdown anchored below the button works well on mobile (no modal overhead). If the viewport is tight, it can flip upward.
4. **Scalable:** Easy to add Outlook or Yahoo later without layout changes.
5. **Industry standard:** Luma (the gold standard for premium event platforms) uses exactly this pattern.

**Provider options in the dropdown:**
- **Google Calendar** -- Opens `calendar.google.com` in new tab with pre-filled event
- **Apple Calendar** -- Downloads `.ics` file (works on iOS, macOS, and any app that handles .ics)
- **Outlook** -- Downloads same `.ics` file (or could use `outlook.live.com` URL)

For V1, just **Google Calendar** and **Apple Calendar (.ics)** keeps it tight. The .ics file also works as a universal fallback for Outlook, Yahoo, and any other calendar app.

**Technical approach:** Zero-dependency. Google Calendar URL construction + client-side ICS blob generation. Both are ~30 lines of TypeScript each.

**Placement:** Inside the event details card on the completion page, between the date/time/location info and the "What happens next?" section. Separated by a border-top, with the button centered or left-aligned.

---

## 6) Clarification

1. **Dropdown vs. bottom sheet on mobile?** The research suggests a dropdown is sufficient for 2-3 options. A bottom sheet would be more premium but adds complexity. Should we start with a simple dropdown (anchored to button) and upgrade to a bottom sheet later if needed, or go straight to a bottom sheet for mobile?

2. **Button placement -- event details card only, or also on the public landing page?** Currently scoped to the RSVP completion page only. Should we also add it to the public event landing page (for people who've already RSVP'd)?

3. **Event description in calendar entry:** Should the calendar event include just the event name and location, or also the tagline/description? (e.g., "No Edges -- Building at the speed of thought." as the calendar event description)

4. **Outlook as a separate option?** The .ics file from "Apple Calendar" works universally (Outlook, Yahoo, etc.). Should we show "Apple Calendar" and rely on users knowing .ics works everywhere, or label it "Download .ics" (more technical), or add a third "Outlook" option that does the same .ics download?
