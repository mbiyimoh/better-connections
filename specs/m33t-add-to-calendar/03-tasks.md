# Task Breakdown: M33T Add to Calendar

**Generated:** 2026-02-01
**Source:** specs/m33t-add-to-calendar/02-spec.md
**Last Decompose:** 2026-02-01

---

## Overview

Add "Add to Calendar" (Google Calendar + iCal/.ics) to the RSVP completion page and the public event landing page. Zero external dependencies -- vanilla TypeScript URL construction and ICS generation.

**Total Tasks:** 6
**Phases:** 2 (Foundation + Integration)
**Parallel Opportunities:** Tasks 1.1 and 1.2 can run in parallel. Tasks 2.1 and 2.2 can run in parallel after Phase 1.

---

## Phase 1: Foundation (Utilities + Component)

### Task 1.1: Create calendar utility functions
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

Create `src/lib/m33t/calendar.ts` with three functions and one interface, then export from barrel.

**Files to create/modify:**
- CREATE: `src/lib/m33t/calendar.ts`
- MODIFY: `src/lib/m33t/index.ts` (add barrel export)

**Implementation:**

```typescript
// src/lib/m33t/calendar.ts

export interface CalendarEventData {
  title: string;
  description: string;
  date: string;            // ISO date string
  startTime: string;       // "HH:MM" 24h format
  endTime: string;         // "HH:MM" 24h format
  timezone: string;        // IANA timezone e.g. "America/Chicago"
  venueName: string;
  venueAddress: string;
}

export function buildGoogleCalendarUrl(event: CalendarEventData): string {
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-CA', { timeZone: event.timezone });
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

export function generateICSContent(event: CalendarEventData): string {
  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-CA', { timeZone: event.timezone });
  const [year, month, day] = dateStr.split('-');

  const dtStart = `${year}${month}${day}T${event.startTime.replace(':', '')}00`;
  const dtEnd = `${year}${month}${day}T${event.endTime.replace(':', '')}00`;
  const uid = `${crypto.randomUUID()}@bettercontacts.ai`;
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

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

export function downloadICSFile(event: CalendarEventData, filename?: string): void {
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

**Barrel export addition to `src/lib/m33t/index.ts`:**
```typescript
// Calendar Integration
export {
  buildGoogleCalendarUrl,
  generateICSContent,
  downloadICSFile,
  type CalendarEventData,
} from './calendar';
```

**Acceptance Criteria:**
- [ ] `buildGoogleCalendarUrl` returns valid Google Calendar URL with correct date format (YYYYMMDDTHHmmss), timezone, location
- [ ] `generateICSContent` produces valid RFC 5545 ICS content with TZID on DTSTART/DTEND
- [ ] `downloadICSFile` creates and triggers download of .ics file
- [ ] All functions exported from `src/lib/m33t/index.ts`
- [ ] Date handling uses timezone-aware formatting (toLocaleDateString with timeZone option) consistent with the formatting.ts pattern

---

### Task 1.2: Create AddToCalendarButton component
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None (depends on 1.1)

Create `src/components/m33t/AddToCalendarButton.tsx` -- a Client Component with two variants (completion page vs landing page) that shows a bottom sheet (mobile) or modal (desktop) with Google Calendar and iCal options.

**File to create:** `src/components/m33t/AddToCalendarButton.tsx`

**Props:**
```typescript
interface AddToCalendarButtonProps {
  event: CalendarEventData;
  variant?: 'completion' | 'landing';
}
```

**Key implementation details:**

1. **Mobile detection:** Use existing `useMediaQuery` hook:
   ```typescript
   import { useMediaQuery } from '@/hooks/useMediaQuery';
   const isMobile = useMediaQuery('(max-width: 767px)');
   ```

2. **Button variants:**
   - `completion`: Full-width outlined button -- `border border-gold-primary/40 text-gold-primary bg-transparent hover:bg-gold-subtle` with Calendar icon + "Add to Calendar" text
   - `landing`: Subtle text link -- `text-amber-500 hover:text-amber-400 text-sm` with Calendar icon + "Add to Calendar" text. Must NOT compete with the primary RSVP CTA (no gold foil, no large button).

3. **Bottom sheet (mobile, < 768px):**
   - Fixed to bottom, full width, `rounded-t-2xl`
   - Background: `bg-zinc-900 border-t border-zinc-800`
   - Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
   - Framer Motion: `initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}` with `transition={{ type: 'spring', damping: 25, stiffness: 300 }}`
   - Grab handle: `w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4`
   - Two option rows (56px tall each): icon + label, separated by `border-b border-zinc-800`
   - Option hover: `hover:bg-zinc-800/50 transition-colors`

4. **Modal (desktop, >= 768px):**
   - Centered fixed, max-width 320px
   - Background: `bg-zinc-900 border border-zinc-800 rounded-xl`
   - Same backdrop as mobile
   - Framer Motion: `initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}` with `transition={{ duration: 0.15 }}`
   - Same two option rows
   - Small X close button in top-right

5. **Option rows (shared between mobile/desktop):**
   - **Google Calendar**: Inline Google "G" SVG icon (multi-color, 20x20) + "Google Calendar" label. On click: `window.open(buildGoogleCalendarUrl(event), '_blank')`
   - **iCal / Other**: Lucide `Calendar` icon (20x20, `text-gold-primary`) + "iCal / Other" label. On click: `downloadICSFile(event)`
   - After click: dismiss with ~150ms delay for tap feedback

6. **Dismiss:** Click backdrop, press Escape, or tap X button. Use `AnimatePresence` for exit animation.

7. **SSR safety:** `useMediaQuery` returns `undefined` during SSR. Render nothing (or just the button) until hydrated. The sheet/modal only opens on click so it's always client-side.

8. **Google "G" SVG:** Inline minimal Google multi-color logo (~4 paths). Keep as a small functional component within the file. Example:
   ```tsx
   function GoogleIcon({ size = 20 }: { size?: number }) {
     return (
       <svg width={size} height={size} viewBox="0 0 24 24">
         <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
         <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
         <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
         <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
       </svg>
     );
   }
   ```

**Acceptance Criteria:**
- [ ] Button renders correctly in both `completion` and `landing` variants
- [ ] Clicking button opens bottom sheet on mobile (< 768px)
- [ ] Clicking button opens centered modal on desktop (>= 768px)
- [ ] Google Calendar option opens correct URL in new tab
- [ ] iCal option triggers .ics file download
- [ ] Sheet/modal dismisses on backdrop click, Escape key, or X button
- [ ] Sheet/modal dismisses after selecting an option (~150ms delay)
- [ ] Framer Motion animations work (slide up for sheet, fade+scale for modal)
- [ ] No hydration errors (SSR-safe)

---

## Phase 2: Integration

### Task 2.1: Integrate into RSVP completion page
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** Task 2.2

Modify `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx` to:
1. Add `timezone` and `description` to the Prisma select query
2. Insert `AddToCalendarButton` between venue info and "What happens next?"

**File to modify:** `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`

**Changes:**

1. **Add imports at top:**
   ```typescript
   import { AddToCalendarButton } from '@/components/m33t/AddToCalendarButton';
   ```

2. **Update Prisma select (lines 25-34):**
   Add `description: true` and `timezone: true` to the select:
   ```typescript
   select: {
     id: true,
     name: true,
     tagline: true,
     description: true,   // ADD
     date: true,
     startTime: true,
     endTime: true,
     timezone: true,       // ADD
     venueName: true,
     venueAddress: true,
   },
   ```

3. **Insert AddToCalendarButton after line 108 (end of venue/location section), before line 110 (start of "What happens next?"):**
   ```tsx
   {/* Add to Calendar */}
   <div className="mt-6 pt-6 border-t border-border">
     <AddToCalendarButton
       event={{
         title: `${event.name}${event.tagline ? ': ' + event.tagline : ''}`,
         description: event.description || 'An intimate gathering of builders, athletes and operators exploring what\'s possible in the new world of AI on the eve of SXSW.',
         date: event.date.toISOString(),
         startTime: event.startTime,
         endTime: event.endTime,
         timezone: event.timezone,
         venueName: event.venueName,
         venueAddress: event.venueAddress,
       }}
       variant="completion"
     />
   </div>
   ```

**Acceptance Criteria:**
- [ ] Calendar button appears on completion page between venue info and "What happens next?"
- [ ] Calendar event data includes correct title (name + tagline), description, date, times, timezone, venue
- [ ] No TypeScript errors
- [ ] Page still renders correctly as Server Component with Client Component child

---

### Task 2.2: Integrate into event landing page FooterCTA
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** Task 2.1

Modify `FooterCTA.tsx` to accept calendar data props and render `AddToCalendarButton`, then update `EventLandingClient.tsx` to pass the new props.

**Files to modify:**
- `src/app/m33t/[slug]/components/FooterCTA.tsx`
- `src/app/m33t/[slug]/EventLandingClient.tsx`

**Changes to FooterCTA.tsx:**

1. **Add imports:**
   ```typescript
   import { AddToCalendarButton } from '@/components/m33t/AddToCalendarButton';
   import type { CalendarEventData } from '@/lib/m33t';
   ```

2. **Update props interface:**
   ```typescript
   interface FooterCTAProps {
     tagline?: string | null;
     date: string;
     startTime: string;       // ADD
     endTime: string;         // ADD
     location: string;
     venueAddress: string;    // ADD
     description?: string | null;  // ADD
     eventName: string;       // ADD
     rsvpUrl: string;
     inviteeContext?: InviteeContext;
   }
   ```

3. **Update destructuring to include new props**

4. **Insert AddToCalendarButton after the date/location div (after line 51), inside the `max-w-2xl` container:**
   ```tsx
   {/* Add to Calendar */}
   <div className="mt-4">
     <AddToCalendarButton
       event={{
         title: eventName,
         description: description || '',
         date,
         startTime,
         endTime,
         timezone: 'America/Chicago',
         venueName: location,
         venueAddress,
       }}
       variant="landing"
     />
   </div>
   ```

**Changes to EventLandingClient.tsx:**

Update the `FooterCTA` usage (lines 212-218) to pass additional props:
```tsx
<FooterCTA
  tagline={event.tagline}
  date={event.date}
  startTime={event.startTime}
  endTime={event.endTime}
  location={event.venueName}
  venueAddress={event.venueAddress}
  description={event.description}
  eventName={event.name}
  rsvpUrl={rsvpUrl}
  inviteeContext={inviteeContext}
/>
```

**Acceptance Criteria:**
- [ ] Calendar link appears in FooterCTA below date/location
- [ ] Landing variant renders as subtle text link (not competing with RSVP CTA)
- [ ] Calendar data populated correctly from event object
- [ ] No TypeScript errors in FooterCTA or EventLandingClient

---

### Task 2.3: Manual cross-browser testing
**Size:** Small
**Priority:** Medium
**Dependencies:** Tasks 2.1, 2.2

Test the complete flow on desktop and mobile.

**Test checklist:**
- [ ] Desktop Chrome: completion page + landing page, both calendar options work
- [ ] Desktop Safari: same as Chrome
- [ ] Mobile iOS Safari: bottom sheet appears, Google Calendar opens, .ics triggers iOS Calendar
- [ ] Mobile Android Chrome: bottom sheet appears, both options work
- [ ] ICS file: open in text editor, verify RFC 5545 structure (VCALENDAR > VEVENT, DTSTART/DTEND with TZID, correct date)
- [ ] Google Calendar: verify pre-filled title, date, time, location, description are correct
- [ ] Backdrop dismiss works on both mobile and desktop
- [ ] Escape key dismisses modal on desktop
- [ ] No console errors

---

## Dependency Graph

```
Task 1.1 (calendar.ts) ──┐
                          ├── Task 2.1 (completion page) ──┐
Task 1.2 (component)  ───┤                                 ├── Task 2.3 (testing)
                          ├── Task 2.2 (landing page)   ───┘
                          │
Task 1.1 ─── Task 1.2    │
```

**Critical path:** 1.1 → 1.2 → 2.1 or 2.2 → 2.3
**Parallel opportunities:** 2.1 and 2.2 can run in parallel after 1.2 is done.
