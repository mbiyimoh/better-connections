# M33T Add to Calendar - Implementation Spec

**Slug:** m33t-add-to-calendar
**Author:** Claude Code
**Date:** 2026-02-01
**Status:** Draft
**Ideation:** `specs/m33t-add-to-calendar/01-ideation.md`

---

## Summary

Add "Add to Calendar" functionality to two locations in the M33T event flow:
1. **RSVP completion page** -- after the user finishes their RSVP + questionnaire
2. **Public event landing page** -- in the FooterCTA section for anyone viewing the event

Users tap a single "Add to Calendar" button, which opens a **bottom sheet** (mobile) or **centered modal** (desktop) with two options:
- **Google Calendar** -- opens `calendar.google.com` in a new tab with pre-filled event details
- **iCal / Other** -- downloads a `.ics` file (works with Apple Calendar, Outlook, Yahoo, and any standards-compliant calendar app)

Zero external dependencies. All URL/ICS generation is vanilla TypeScript.

---

## User Decisions

| Question | Decision |
|----------|----------|
| Dropdown vs. bottom sheet on mobile? | **Bottom sheet** for premium feel |
| Placement scope? | **Both** completion page AND public landing page |
| Calendar event description? | Event name: "No Edges: Building at the Speed of Thought"; Description: "An intimate gathering of builders, athletes and operators exploring what's possible in the new world of AI on the eve of SXSW." |
| .ics option label? | **"iCal / Other"** |

---

## New Files

### 1. `src/lib/m33t/calendar.ts` -- Calendar URL & ICS Generation

Pure utility functions, no React. Exported via the `src/lib/m33t/index.ts` barrel.

```typescript
/**
 * M33T Calendar Integration Utilities
 *
 * Generates Google Calendar URLs and ICS file content for event calendar integration.
 * Zero dependencies -- uses standard URL params and RFC 5545 ICS format.
 */

export interface CalendarEventData {
  title: string;           // Event name (e.g., "No Edges: Building at the Speed of Thought")
  description: string;     // Event description
  date: string;            // ISO date string
  startTime: string;       // "HH:MM" format (24h)
  endTime: string;         // "HH:MM" format (24h)
  timezone: string;        // IANA timezone (e.g., "America/Chicago")
  venueName: string;       // Venue name
  venueAddress: string;    // Full address
}

/**
 * Build a Google Calendar URL with pre-filled event details.
 * Opens in a new tab -- user clicks "Save" in Google Calendar.
 *
 * Google Calendar URL format:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&location=...&details=...&ctz=...
 *
 * Date format: YYYYMMDDTHHmmss (local time, paired with ctz param)
 */
export function buildGoogleCalendarUrl(event: CalendarEventData): string;

/**
 * Generate ICS file content string (RFC 5545).
 * Can be downloaded as a .ics file, which is handled by the OS calendar app.
 *
 * ICS format notes:
 * - DTSTART/DTEND use TZID parameter for timezone-aware local times
 * - UID must be globally unique (use crypto.randomUUID or similar)
 * - DESCRIPTION uses escaped newlines (\\n)
 * - Lines must be folded at 75 octets (not enforced here -- modern parsers handle it)
 */
export function generateICSContent(event: CalendarEventData): string;

/**
 * Trigger download of an ICS file in the browser.
 * Creates a Blob, generates an object URL, clicks a hidden anchor, then cleans up.
 */
export function downloadICSFile(event: CalendarEventData, filename?: string): void;
```

**Implementation details:**

**Google Calendar URL construction:**
```typescript
function buildGoogleCalendarUrl(event: CalendarEventData): string {
  // Parse the ISO date to get the calendar date in the event's timezone
  const eventDate = new Date(event.date);

  // Format: YYYYMMDDTHHmmss (local time)
  // We need the date portion in the event's timezone
  const dateStr = eventDate.toLocaleDateString('en-CA', { timeZone: event.timezone }); // "2026-03-12"
  const [year, month, day] = dateStr.split('-');

  const startFormatted = `${year}${month}${day}T${event.startTime.replace(':', '')}00`;
  const endFormatted = `${year}${month}${day}T${event.endTime.replace(':', '')}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startFormatted}/${endFormatted}`,
    location: `${event.venueName}, ${event.venueAddress}`,
    details: event.description,
    ctz: event.timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

**ICS file generation:**
```typescript
function generateICSContent(event: CalendarEventData): string {
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-CA', { timeZone: event.timezone });
  const [year, month, day] = dateStr.split('-');

  const dtStart = `${year}${month}${day}T${event.startTime.replace(':', '')}00`;
  const dtEnd = `${year}${month}${day}T${event.endTime.replace(':', '')}00`;
  const uid = `${crypto.randomUUID()}@bettercontacts.ai`;
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  // Escape special characters per RFC 5545
  const escapeICS = (str: string) => str.replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Better Contacts//M33T//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${event.timezone}:${dtStart}`,
    `DTEND;TZID=${event.timezone}:${dtEnd}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(`${event.venueName}, ${event.venueAddress}`)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
```

**ICS download trigger:**
```typescript
function downloadICSFile(event: CalendarEventData, filename?: string): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

---

### 2. `src/components/m33t/AddToCalendarButton.tsx` -- Client Component

A `'use client'` component that renders a button and manages the bottom sheet / modal.

**Props:**
```typescript
interface AddToCalendarButtonProps {
  event: CalendarEventData;
  /** Visual variant for different contexts */
  variant?: 'completion' | 'landing';
}
```

**Behavior:**
1. Renders a gold-accented button with a Calendar icon and "Add to Calendar" text
2. On click, opens a bottom sheet (on mobile, `< 768px`) or a small centered modal (on desktop)
3. Bottom sheet / modal contains two options:
   - **Google Calendar** -- with a Google icon (simple SVG inline) and label. On click: `window.open(googleCalendarUrl, '_blank')`
   - **iCal / Other** -- with a Calendar icon (Lucide) and label. On click: `downloadICSFile(event)`
4. Backdrop click or X button dismisses the sheet/modal
5. After selecting an option, the sheet/modal dismisses automatically

**Visual Design:**

*Button:*
- `completion` variant: Full-width, outlined style -- `border border-gold-primary/40 text-gold-primary bg-transparent hover:bg-gold-subtle` with Calendar icon. Sits inside the event details card below the venue info, separated by `border-t border-border mt-6 pt-6`.
- `landing` variant: Compact, subtle -- `text-amber-500 hover:text-amber-400` text link style, placed below the date/location in the FooterCTA. No gold foil -- should not compete with the primary RSVP CTA button.

*Bottom Sheet (mobile):*
- Fixed to bottom, full width, rounded top corners (`rounded-t-2xl`)
- Background: `bg-zinc-900 border-t border-zinc-800`
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Framer Motion: slide up from bottom (`y: '100%'` to `y: 0`) with spring physics
- Grab handle bar at top (small centered pill: `w-10 h-1 bg-zinc-700 rounded-full`)
- Two option rows, each 56px tall with icon + label, separated by `border-b border-zinc-800`
- Option hover/active: `bg-zinc-800/50`
- Gold icon color for both options: `text-gold-primary` / `text-amber-500`

*Modal (desktop):*
- Centered, fixed, max-width `320px`
- Background: `bg-zinc-900 border border-zinc-800 rounded-xl`
- Backdrop: same as mobile
- Framer Motion: fade + scale from 0.95
- Same two option rows as bottom sheet
- Small "x" close button in top-right

**Animation:**
```typescript
// Bottom sheet
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
/>

// Modal
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15 }}
/>
```

**Mobile detection:**
Use the existing `useMediaQuery` hook from `src/hooks/useMediaQuery.ts`:
```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';
const isMobile = useMediaQuery('(max-width: 767px)');
```

**Google SVG icon:**
Inline a minimal Google "G" SVG (~4 paths, the standard Google multi-color logo mark) as a small component within the file. No external asset needed. Approx 16x16 or 20x20.

---

## Modified Files

### 3. `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`

**Change:** Add `AddToCalendarButton` inside the event details card, between the venue info (line 108) and the "What happens next?" section (line 110).

The completion page is a **Server Component**, so we need to:
1. Add `timezone` to the Prisma `select` query (line 25-34)
2. Add `description` to the Prisma `select` query
3. Create the `CalendarEventData` object from the fetched event data
4. Render `<AddToCalendarButton>` (Client Component) with the event data as props

**Insertion point (after line 108, before line 110):**
```tsx
{/* Add to Calendar */}
<div className="mt-6 pt-6 border-t border-border">
  <AddToCalendarButton
    event={{
      title: `${event.name}${event.tagline ? ': ' + event.tagline : ''}`,
      description: event.description || '',
      date: event.date.toISOString(),
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: 'America/Chicago', // From DB, hardcoded for now
      venueName: event.venueName,
      venueAddress: event.venueAddress,
    }}
    variant="completion"
  />
</div>
```

**Note:** The existing "What happens next?" section (line 110) already has `mt-6 pt-6 border-t border-border`. This should remain unchanged -- the calendar button gets its own bordered section between venue info and "what happens next."

**Updated Prisma select:**
```typescript
select: {
  id: true,
  name: true,
  tagline: true,
  description: true,  // ADD
  date: true,
  startTime: true,
  endTime: true,
  timezone: true,      // ADD
  venueName: true,
  venueAddress: true,
},
```

---

### 4. `src/app/m33t/[slug]/components/FooterCTA.tsx`

**Change:** Add "Add to Calendar" as a subtle text link below the date/location info in the footer CTA section.

This component needs additional props for calendar data. Since `FooterCTA` is already a Client Component (used inside `EventLandingClient`), we can directly use `AddToCalendarButton`.

**Updated props:**
```typescript
interface FooterCTAProps {
  tagline?: string | null;
  date: string;
  startTime: string;     // ADD
  endTime: string;       // ADD
  timezone: string;      // ADD
  location: string;
  venueAddress: string;  // ADD
  description?: string | null;  // ADD
  eventName: string;     // ADD
  rsvpUrl: string;
  inviteeContext?: InviteeContext;
}
```

**Insertion point (after the date/location `<div>` at line 48-51, inside the `max-w-2xl` container):**
```tsx
{/* Add to Calendar link */}
<div className="mt-4">
  <AddToCalendarButton
    event={{
      title: eventName,
      description: description || '',
      date,
      startTime,
      endTime,
      timezone,
      venueName: location,
      venueAddress,
    }}
    variant="landing"
  />
</div>
```

---

### 5. `src/app/m33t/[slug]/EventLandingClient.tsx`

**Change:** Pass the additional props to `FooterCTA` (line 212-218).

```tsx
<FooterCTA
  tagline={event.tagline}
  date={event.date}
  startTime={event.startTime}     // ADD
  endTime={event.endTime}         // ADD
  timezone="America/Chicago"      // ADD (or from event data if available in API response)
  location={event.venueName}
  venueAddress={event.venueAddress}  // ADD
  description={event.description}    // ADD
  eventName={event.name}             // ADD
  rsvpUrl={rsvpUrl}
  inviteeContext={inviteeContext}
/>
```

**Note:** The `EventData` type in `types.ts` does not currently include `timezone`. We need to either:
- Add `timezone` to the `EventData` interface and the public API response, OR
- Hardcode `"America/Chicago"` in the component (simpler for V1, since all current events are in Austin)

**Recommendation:** Hardcode for V1, add to API later when multi-timezone events exist.

---

### 6. `src/lib/m33t/index.ts`

**Change:** Add barrel export for the new calendar utilities.

```typescript
// Calendar Integration
export {
  buildGoogleCalendarUrl,
  generateICSContent,
  downloadICSFile,
  type CalendarEventData,
} from './calendar';
```

---

## Event Data for "No Edges"

For the NO EDGES event, the calendar entry should be:

| Field | Value |
|-------|-------|
| **Title** | No Edges: Building at the Speed of Thought |
| **Description** | An intimate gathering of builders, athletes and operators exploring what's possible in the new world of AI on the eve of SXSW. |
| **Date** | March 12, 2026 |
| **Start Time** | 18:00 (6 PM) |
| **End Time** | 22:00 (10 PM) |
| **Timezone** | America/Chicago (CST) |
| **Location** | {venueName}, {venueAddress} (from database) |

The title and description are constructed from `event.name` and `event.description` database fields. The description value above should be stored in the `description` field of the Event record.

---

## Edge Cases & Gotchas

1. **Mobile Safari ICS handling:** Safari on iOS opens `.ics` files directly in the Calendar app. The `Blob` + anchor download approach works correctly. No special handling needed.

2. **Android Chrome ICS handling:** Android may show "Open with..." dialog for `.ics` files. Google Calendar is typically an option. This is expected behavior.

3. **Google Calendar in WebViews:** Some in-app browsers (Instagram, Twitter) may not handle `window.open` well. The Google Calendar URL will still work -- it just opens in the WebView's browser. This is acceptable.

4. **Timezone handling:** Using `DTSTART;TZID=America/Chicago:20260312T180000` format in ICS. This is timezone-aware and correctly handles DST. Google Calendar URL uses the `ctz` parameter for the same purpose.

5. **Date parsing:** The event `date` field is a DateTime in the database. On the completion page (Server Component), it's a Date object. On the landing page (from API), it's an ISO string. The utility functions accept both via `new Date(event.date)`.

6. **SSR safety:** `AddToCalendarButton` is a Client Component (`'use client'`). The `downloadICSFile` function uses `document.createElement` which is browser-only -- this is fine since it's only called on user click, never during SSR.

7. **`crypto.randomUUID()`:** Available in all modern browsers and Node.js 19+. Used for ICS UID generation. Falls back is not needed for our target audience.

8. **Bottom sheet dismiss on option select:** After the user taps Google Calendar or iCal, the sheet should dismiss with a small delay (~200ms) so the user sees the tap feedback before the sheet slides away.

---

## Testing Plan

1. **Manual verification on desktop:**
   - Click "Add to Calendar" on completion page -- modal appears
   - Click "Google Calendar" -- new tab opens with pre-filled event in Google Calendar
   - Click "iCal / Other" -- `.ics` file downloads, opens in default calendar app
   - Click backdrop -- modal dismisses
   - Verify on landing page FooterCTA as well

2. **Manual verification on mobile (iOS Safari):**
   - Tap "Add to Calendar" -- bottom sheet slides up
   - Tap "Google Calendar" -- opens Google Calendar in browser
   - Tap "iCal / Other" -- opens iOS Calendar with pre-filled event
   - Swipe down or tap backdrop -- sheet dismisses

3. **Manual verification on mobile (Android Chrome):**
   - Same flow as iOS
   - Verify `.ics` triggers "Open with..." or directly opens calendar

4. **ICS file validation:**
   - Open generated `.ics` file in a text editor
   - Verify RFC 5545 compliance (VCALENDAR wrapper, VEVENT block, proper DTSTART/DTEND with TZID)
   - Import into Google Calendar, Apple Calendar, Outlook -- verify all fields populate correctly

---

## Implementation Order

1. Create `src/lib/m33t/calendar.ts` (utility functions)
2. Update `src/lib/m33t/index.ts` (barrel export)
3. Create `src/components/m33t/AddToCalendarButton.tsx` (Client Component)
4. Update `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx` (completion page)
5. Update `src/app/m33t/[slug]/components/FooterCTA.tsx` (new props + button)
6. Update `src/app/m33t/[slug]/EventLandingClient.tsx` (pass new props)
7. Manual testing across browsers/devices
