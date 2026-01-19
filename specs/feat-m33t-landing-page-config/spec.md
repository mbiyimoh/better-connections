# M33T Landing Page Configuration

## Status
**Draft** | Author: Claude | Created: 2026-01-15

## Overview

Add a new "Landing Page" step to the event wizard that allows organizers to configure what sections appear on their public event landing page and populate optional "What to Expect" content cards.

## Problem Statement

Currently, event landing pages show a fixed set of sections with no organizer control. Some events don't need all sections (e.g., no schedule yet, or want to hide attendee list). Additionally, there's no way to add a "What to Expect" section that describes the event experience (Sessions, Connections, Dinner, Demos, etc.).

**Core Need:** Organizers need control over which landing page sections are visible and the ability to add optional descriptive content cards.

## Goals

1. Add a new "Landing Page" wizard step (step 7, pushing Review to step 8)
2. Provide checkboxes to show/hide each landing page section
3. Allow adding/editing/removing "What to Expect" content cards
4. Render landing page sections conditionally based on settings
5. Existing events continue working (all sections visible by default)

## Non-Goals

- Reordering sections (fixed order)
- Custom section colors or themes
- Rich text editing in What to Expect descriptions
- Image uploads for What to Expect cards
- Preview of landing page within wizard
- Per-event scrollytelling configuration (NO EDGES is special-cased)

## Technical Approach

### Database Changes

Add two fields to the Event model in `prisma/schema.prisma`:

```prisma
model Event {
  // ... existing fields ...

  // Landing Page Configuration
  whatToExpect         Json?   // Array of { icon: string, title: string, description: string }
  landingPageSettings  Json    @default("{}")  // { showVenue, showSchedule, showHost, showWhatToExpect, showAttendees }
}
```

### Key Files to Modify

1. **Database:**
   - `prisma/schema.prisma` - Add new fields

2. **Wizard:**
   - `src/components/events/wizard/WizardStepper.tsx` - Add "Landing Page" step
   - `src/components/events/wizard/hooks/useWizardState.ts` - Add new data fields
   - `src/components/events/wizard/EventWizard.tsx` - Render new step, include in API payload
   - `src/components/events/wizard/steps/LandingPageStep.tsx` - **NEW** - Configuration UI

3. **Landing Page:**
   - `src/app/m33t/[slug]/components/WhatToExpectSection.tsx` - **NEW** - Display component
   - `src/app/m33t/[slug]/components/index.ts` - Export new component
   - `src/app/m33t/[slug]/EventLandingClient.tsx` - Conditional rendering
   - `src/app/m33t/[slug]/types.ts` - Extend EventData type

4. **API:**
   - `src/app/api/public/events/[slug]/route.ts` - Include new fields in response
   - `src/lib/m33t/schemas.ts` - Add Zod schemas for new fields

## Implementation Details

### 1. WhatToExpectItem Type

```typescript
interface WhatToExpectItem {
  id: string;        // cuid for React keys
  icon: string;      // Lucide icon name or simple character (e.g., "◆", "Users", "Utensils")
  title: string;     // e.g., "Sessions", "Connections"
  description: string; // e.g., "Fireside conversations and panels..."
}
```

### 2. LandingPageSettings Type

```typescript
interface LandingPageSettings {
  showVenue: boolean;      // Default: true
  showSchedule: boolean;   // Default: true
  showHost: boolean;       // Default: true
  showWhatToExpect: boolean; // Default: true (if items exist)
  showAttendees: boolean;  // Default: true
}
```

### 3. Default Behavior

When `landingPageSettings` is empty/null, all sections show (backward compatible).

```typescript
const defaultSettings: LandingPageSettings = {
  showVenue: true,
  showSchedule: true,
  showHost: true,
  showWhatToExpect: true,
  showAttendees: true,
};
```

### 4. LandingPageStep UI Layout

```
┌─────────────────────────────────────────────────┐
│ Landing Page Settings                           │
│ Configure what appears on your public event page│
├─────────────────────────────────────────────────┤
│                                                 │
│ SECTION VISIBILITY                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ ☑ Venue Information                         │ │
│ │ ☑ Event Schedule                            │ │
│ │ ☑ Host Information                          │ │
│ │ ☑ Who's Coming (Attendees)                  │ │
│ │ ☑ What to Expect                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ WHAT TO EXPECT                                  │
│ Add cards describing the event experience       │
│                                                 │
│ ┌───────────────┐ ┌───────────────┐            │
│ │ ◆ Sessions    │ │ ◇ Connections │ [+ Add]   │
│ │ Fireside...   │ │ AI-curated... │            │
│ │ [Edit][Delete]│ │ [Edit][Delete]│            │
│ └───────────────┘ └───────────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. WhatToExpectSection Component

Simple card grid matching the 33 Strategies design system:

```tsx
// Renders 2-4 cards in a responsive grid
// Dark background, gold accents
// Icon + Title + Description per card
```

### 6. EventLandingClient Conditional Rendering

```tsx
// Get settings with defaults
const settings = {
  showVenue: true,
  showSchedule: true,
  showHost: true,
  showWhatToExpect: true,
  showAttendees: true,
  ...event.landingPageSettings,
};

return (
  <>
    {settings.showVenue && <VenueSection ... />}
    {settings.showAttendees && <AttendeeCarousel ... />}
    {settings.showWhatToExpect && event.whatToExpect?.length > 0 && (
      <WhatToExpectSection items={event.whatToExpect} />
    )}
    {settings.showSchedule && event.schedule?.length > 0 && (
      <ScheduleSection ... />
    )}
    {settings.showHost && <HostSection ... />}
  </>
);
```

## Testing Approach

### Key Scenarios to Validate

1. **Wizard Step Works:**
   - New "Landing Page" step appears as step 7
   - Can toggle section visibility checkboxes
   - Can add/edit/delete What to Expect items
   - Data persists through wizard navigation

2. **Landing Page Respects Settings:**
   - Hidden sections don't render
   - Visible sections render normally
   - What to Expect section shows when items exist and enabled

3. **Backward Compatibility:**
   - Existing events without settings show all sections
   - Empty landingPageSettings defaults to all visible

4. **Edit Mode:**
   - Existing settings load correctly when editing event
   - Changes save properly

## Open Questions

1. **Icon Selection:** Should we provide a dropdown of Lucide icons, or just let organizers type icon names/characters?
   - **Recommendation:** Start simple with text input (e.g., "◆" or icon names). Add picker later if needed.

2. **Section Order:** The current order (Hero → Venue → Attendees → What to Expect → Schedule → Host → CTA) - is this the desired order?
   - **Assumption:** Keep current order, just hide/show sections.

## Future Improvements and Enhancements

**These are OUT OF SCOPE for initial implementation:**

- **Icon Picker UI:** Visual icon selector instead of text input
- **Section Reordering:** Drag-and-drop to change section order
- **Live Preview:** Preview landing page within wizard
- **Rich Text:** Markdown or rich text in What to Expect descriptions
- **Image Support:** Upload images for What to Expect cards
- **Custom Themes:** Per-event color schemes or themes
- **Analytics:** Track which sections get the most engagement
- **A/B Testing:** Test different landing page configurations
- **Template Library:** Pre-built What to Expect templates (Networking, Conference, Workshop)

## References

- Existing wizard implementation: `src/components/events/wizard/`
- Landing page components: `src/app/m33t/[slug]/components/`
- 33 Strategies design system: `CLAUDE.md` design section
- Event schema: `prisma/schema.prisma` lines 419-480
