# Ideation: Event Editor UX Overhaul

## Overview

Redesign the event creation/editing experience from a linear step-by-step wizard to a more flexible, navigable interface. Also complete the missing question options editor functionality.

---

## Problem Statement

### Current Issues

1. **Linear Wizard Friction**
   - Must click "Continue" 5-7 times to reach a later section
   - No way to jump directly to a specific section (e.g., Questions or Landing Page)
   - Poor experience for editing existing events where you just want to tweak one thing
   - 8 small step bubbles across the top don't scale well visually

2. **Missing Question Options Editor**
   - `single_select` and `multi_select` question types exist in the schema
   - Starter questions include options (experience_level, topics)
   - **But the QuestionEditModal has no UI for adding/editing options**
   - Users can select these question types but cannot configure the answer choices
   - This makes custom select questions effectively broken

---

## Proposed Solution

### Part 1: Sidebar + Scrollable Sections Layout

Replace the wizard stepper with a two-column layout:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Events               [Unsaved Changes]   [Save]   │
├─────────────────┬────────────────────────────────────────────┤
│                 │                                            │
│  Event Details  │  ┌─────────────────────────────────────┐   │
│  ─────────────  │  │ BASICS                          ▢   │   │
│                 │  │                                     │   │
│  ○ Basics       │  │ Event Name *                        │   │
│  ○ Venue        │  │ [                              ]    │   │
│  ○ Team         │  │                                     │   │
│  ○ RSVP         │  │ Date *        Start    End          │   │
│  ○ Cards        │  │ [       ]  [      ] - [      ]      │   │
│  ○ Questions    │  │                                     │   │
│  ○ Landing Page │  │ Description                         │   │
│  ○ Preview      │  │ [                              ]    │   │
│                 │  └─────────────────────────────────────┘   │
│                 │                                            │
│  ─────────────  │  ┌─────────────────────────────────────┐   │
│                 │  │ VENUE                           ▢   │   │
│  Completeness   │  │                                     │   │
│  ████████░░ 75% │  │ Venue Name *                        │   │
│                 │  │ [                              ]    │   │
│  Missing:       │  │                                     │   │
│  • Schedule     │  │ Address *                           │   │
│  • Host bio     │  │ [                              ]    │   │
│                 │  │                                     │   │
│                 │  │ Parking Notes                       │   │
│                 │  │ [                              ]    │   │
│                 │  └─────────────────────────────────────┘   │
│                 │                                            │
│                 │  ... more sections scroll vertically ...   │
│                 │                                            │
└─────────────────┴────────────────────────────────────────────┘
```

#### Key Features

1. **Fixed Left Sidebar**
   - Section links with active state highlighting
   - Click to smooth-scroll to section
   - Visual indicator for sections with validation errors
   - Completeness indicator at bottom

2. **Scrollable Main Content**
   - All sections visible in one scrollable area
   - Section headers are sticky briefly as you scroll past
   - IntersectionObserver tracks active section for sidebar sync

3. **Global Actions**
   - Single "Save" button at top-right
   - "Unsaved Changes" indicator appears when dirty
   - "Back to Events" returns to event list

4. **Mobile Adaptation**
   - Sidebar becomes a dropdown/sheet at <768px
   - Or horizontal scrollable pills at top
   - Sections stack vertically with collapse/expand

---

### Part 2: Question Options Editor

Add the missing UI for configuring answer options in the QuestionEditModal.

#### For `single_select` Questions

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Question                                          [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Question Title *                                            │
│ [Which best describes your professional stage?        ]     │
│                                                             │
│ Question Type                                               │
│ [Single Select                               ▼]             │
│                                                             │
│ Answer Options                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡  Early Career                            [Edit] [X]   │ │
│ │    0-5 years                                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ≡  Mid-Career                              [Edit] [X]   │ │
│ │    5-15 years                                           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ≡  Senior / Executive                      [Edit] [X]   │ │
│ │    15+ years                                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ≡  Founder                                 [Edit] [X]   │ │
│ │    Building your own company                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Option]                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

#### For `multi_select` Questions

Same as single_select, plus:

```
│ Max Selections                                              │
│ [ 3 ▼]  (leave empty for unlimited)                        │
```

#### Option Editor (Inline or Modal)

When adding/editing an option:

```
┌─────────────────────────────────────────────────────────────┐
│ Option Label *                                              │
│ [Early Career                                          ]    │
│                                                             │
│ Description (optional)                                      │
│ [0-5 years                                             ]    │
│                                                             │
│ Value (auto-generated)                                      │
│ [early_career                                          ]    │
│ ℹ️ Used internally for data storage                         │
│                                                             │
│                                    [Cancel]  [Save Option]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Part 1: Sidebar Layout

#### New Components

1. **`EventEditorLayout.tsx`**
   - Two-column layout container
   - Handles sidebar + content split
   - Responsive breakpoint logic

2. **`EventEditorSidebar.tsx`**
   - Section navigation links
   - Active section highlighting
   - Completeness indicator
   - Validation status per section

3. **`EventEditorContent.tsx`**
   - Scrollable container for all sections
   - Contains section components directly (not in steps)
   - Manages IntersectionObserver for scroll tracking

4. **`useActiveSection.ts` hook**
   - IntersectionObserver to track which section is in view
   - Returns `activeSection` for sidebar highlighting
   - Uses `rootMargin` to trigger slightly before section top hits viewport

#### Migration Strategy

- Keep existing step components (`BasicsStep.tsx`, `VenueStep.tsx`, etc.)
- Refactor to remove "step" logic, just be section forms
- Rename to `BasicsSection.tsx`, `VenueSection.tsx`, etc.
- Or keep same names but change how they're composed

#### State Management

- Single `useEventEditor` hook that holds all form data
- Auto-save draft to localStorage (optional enhancement)
- Dirty state tracking for "Unsaved Changes" indicator
- Validation runs on all sections, errors shown inline + in sidebar

### Part 2: Options Editor

#### Files to Modify

1. **`QuestionEditModal.tsx`**
   - Add `OptionsEditor` component for `single_select` and `multi_select` types
   - Add `maxSelections` input for `multi_select`

2. **New: `OptionsEditor.tsx`**
   - List of options with drag-to-reorder (using existing drag pattern)
   - Add/edit/delete individual options
   - Each option has: label (required), description (optional), value (auto-generated)

#### Option Value Generation

```typescript
// Auto-generate value from label
function generateOptionValue(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
```

---

## UX Considerations

### Sidebar Navigation

| Interaction | Behavior |
|-------------|----------|
| Click sidebar link | Smooth scroll to section, section briefly highlights |
| Scroll main content | Sidebar updates active state via IntersectionObserver |
| Section has errors | Show red indicator dot next to section name |
| All required fields filled | Show green checkmark next to section name |

### Save Behavior

| Scenario | Behavior |
|----------|----------|
| No changes | "Save" button disabled or hidden |
| Unsaved changes | Show "Unsaved Changes" badge, enable "Save" |
| Click "Save" | Show loading state, then success toast |
| Navigate away with unsaved | Show confirmation dialog |
| Validation errors | Scroll to first error, highlight in sidebar |

### Mobile

| Viewport | Sidebar Behavior |
|----------|------------------|
| Desktop (≥1024px) | Fixed left sidebar, always visible |
| Tablet (768-1023px) | Collapsible sidebar (hamburger toggle) |
| Mobile (<768px) | Horizontal scrollable section pills OR bottom sheet |

---

## Section Breakdown

### Sections (in order)

1. **Basics** - Name, date, time, timezone, type, description, goals
2. **Venue** - Name, address, parking notes, dress code
3. **Team** - Organizers with permissions (existing OrganizersStep)
4. **RSVP** - Capacity, deadline, matches per attendee, reveal timing
5. **Cards** - Trading card field toggles (existing CardsStep)
6. **Questions** - Questionnaire builder (existing QuestionnaireStep)
7. **Landing Page** - Section visibility + What to Expect cards (newly added)
8. **Preview** - Read-only summary (replaces ReviewStep, maybe with live preview link)

### Completeness Calculation

```typescript
const sections = {
  basics: {
    required: ['name', 'date', 'startTime', 'endTime'],
    optional: ['description', 'eventType', 'eventGoals'],
  },
  venue: {
    required: ['venueName', 'venueAddress'],
    optional: ['parkingNotes', 'dressCode'],
  },
  // ... etc
};

function calculateCompleteness(data: EventWizardData): number {
  let filled = 0;
  let total = 0;

  for (const section of Object.values(sections)) {
    total += section.required.length;
    filled += section.required.filter(f => !!data[f]).length;
  }

  return Math.round((filled / total) * 100);
}
```

---

## Open Questions

1. **Should sections be collapsible?**
   - Pro: Reduces visual overwhelm
   - Con: Extra click to expand, harder to scan
   - Recommendation: No collapse, let users scroll. Sidebar provides quick nav.
   >> go with your rec

2. **Auto-save vs manual save?**
   - Auto-save reduces anxiety about losing work
   - But can cause confusion ("wait, did that save?")
   - Recommendation: Manual save with clear "Unsaved Changes" indicator. Consider auto-save to localStorage draft.
   >> go with your rec

3. **Preview section or separate page?**
   - Could show live preview in an iframe/embed
   - Or just a link to "View Public Page"
   - Recommendation: Simple link + summary for MVP. Live preview is nice-to-have.
   >> go with your rec

4. **New event vs edit event?**
   - New events could still show a brief intro/wizard for first-timers
   - Or just land on the same editor with empty fields
   - Recommendation: Same UI for both. Simpler to maintain.
   >> go with your rec

---

## Priority & Effort

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Options editor for questions | **P0** | 2-3 hours | Blocking - can't create custom select questions |
| Sidebar + sections layout | P1 | 4-6 hours | Main UX improvement |
| Active section scroll sync | P1 | 1-2 hours | Part of sidebar implementation |
| Mobile responsive sidebar | P2 | 2-3 hours | Can ship desktop-first initially |
| Completeness indicator | P2 | 1 hour | Nice visual feedback |
| Unsaved changes warning | P2 | 1 hour | Prevents accidental data loss |
| Live preview embed | P3 | 3-4 hours | Nice-to-have |

---

## Success Metrics

- Time to edit a single field on existing event: Currently ~6 clicks, target <2 clicks
- Users can create custom single/multi-select questions with options
- Sidebar stays in sync with scroll position
- No regression in mobile usability

---

## Related Files

### Existing (to be refactored)
- `src/components/events/wizard/EventWizard.tsx`
- `src/components/events/wizard/WizardStepper.tsx`
- `src/components/events/wizard/WizardNavigation.tsx`
- `src/components/events/wizard/hooks/useWizardState.ts`
- `src/components/events/wizard/steps/*.tsx` (all step components)
- `src/components/events/wizard/QuestionEditModal.tsx`

### New (to be created)
- `src/components/events/editor/EventEditorLayout.tsx`
- `src/components/events/editor/EventEditorSidebar.tsx`
- `src/components/events/editor/EventEditorContent.tsx`
- `src/components/events/editor/hooks/useActiveSection.ts`
- `src/components/events/wizard/OptionsEditor.tsx` (for question options)

### Schemas (no changes needed)
- `src/lib/m33t/schemas.ts` - Already supports `options` in QuestionConfig
- `src/lib/m33t/questions.ts` - Has examples of options usage

---

## References

- [Baymard Institute - Accordion and Tab Design](https://baymard.com/blog/accordion-and-tab-design)
- [UX Collective - Tabs vs. Accordions](https://uxdesign.cc/little-things-in-ux-design-part-1-tabs-v-s-accordions-47390e4910c3)
- [SetProduct - Settings UI Design](https://www.setproduct.com/blog/settings-ui-design)
- [Medium - Designing Profile/Settings Pages](https://medium.com/design-bootcamp/designing-profile-account-and-setting-pages-for-better-ux-345ef4ca1490)
- [Mobbin - Sidebar UI Design](https://mobbin.com/glossary/sidebar)
