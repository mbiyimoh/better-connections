# Spec: Event Editor UX Overhaul

## Overview

Redesign the event creation/editing experience from a linear 8-step wizard to a flexible sidebar + scrollable sections layout. Also implement the missing question options editor for `single_select` and `multi_select` question types.

**Scope:**
1. Replace wizard stepper with sidebar navigation
2. All sections visible on one scrollable page
3. Add question options editor (currently missing)
4. Same UI for new events and editing existing events

---

## Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Collapsible sections | No - sections remain expanded, sidebar provides quick nav |
| Save behavior | Manual save with "Unsaved Changes" indicator |
| Preview | Simple link + summary, no live embed for MVP |
| New vs edit | Same UI for both |

---

## Part 1: Question Options Editor (P0)

### Problem

The `single_select` and `multi_select` question types exist in the schema but have no UI for configuring answer options. Users can select these types but cannot add/edit the choices.

### Solution

Add an `OptionsEditor` component to `QuestionEditModal.tsx` that appears when the question type is `single_select` or `multi_select`.

### Implementation

#### 1.1 Create OptionsEditor Component

**File:** `src/components/events/wizard/OptionsEditor.tsx`

```typescript
interface OptionItem {
  value: string;
  label: string;
  description?: string;
}

interface OptionsEditorProps {
  options: OptionItem[];
  onChange: (options: OptionItem[]) => void;
  showMaxSelections?: boolean;
  maxSelections?: number;
  onMaxSelectionsChange?: (max: number | undefined) => void;
}
```

**Features:**
- Display list of options with label and optional description
- Add new option button
- Edit option inline or via popover
- Delete option with confirmation
- Drag-to-reorder using existing drag pattern (GripVertical icon)
- Auto-generate `value` from `label` (slug format)

**Option Value Generation:**
```typescript
function generateOptionValue(label: string, existingValues: string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  // Ensure uniqueness
  let value = base;
  let counter = 1;
  while (existingValues.includes(value)) {
    value = `${base}_${counter}`;
    counter++;
  }
  return value;
}
```

#### 1.2 Update QuestionEditModal

**File:** `src/components/events/wizard/QuestionEditModal.tsx`

Add after the slider config section (~line 192):

```typescript
{(editedQuestion.type === 'single_select' || editedQuestion.type === 'multi_select') && (
  <div className="space-y-4">
    <OptionsEditor
      options={editedQuestion.config?.options || []}
      onChange={(options) => updateConfig('options', options)}
      showMaxSelections={editedQuestion.type === 'multi_select'}
      maxSelections={editedQuestion.config?.maxSelections}
      onMaxSelectionsChange={(max) => updateConfig('maxSelections', max)}
    />
  </div>
)}
```

#### 1.3 UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Answer Options                                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⠿  Early Career                                    [×]  │ │
│ │    0-5 years                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⠿  Mid-Career                                      [×]  │ │
│ │    5-15 years                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⠿  Senior / Executive                              [×]  │ │
│ │    15+ years                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Option]                                              │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ Max Selections (multi-select only)                          │
│ [ 3 ]  Leave empty for unlimited                           │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click option row to edit inline
- Drag grip (⠿) to reorder
- Click [×] to delete (with confirmation if >0 options)
- "Add Option" opens inline form or focuses new empty row

#### 1.4 Validation

- At least 2 options required for select questions
- Each option must have a non-empty label
- Values must be unique
- Show validation error in modal if conditions not met

---

## Part 2: Sidebar + Scrollable Sections Layout (P1)

### Current State

- Linear wizard with 8 steps
- WizardStepper shows bubbles across top
- Must click "Continue" repeatedly to reach later sections
- Separate navigation component at bottom

### Target State

- Two-column layout: fixed sidebar (left) + scrollable content (right)
- All 8 sections visible on one page
- Click sidebar link to smooth-scroll to section
- Sidebar highlights active section as user scrolls
- Single "Save" button in header

### Implementation

#### 2.1 New Component Structure

```
src/components/events/editor/
├── EventEditor.tsx           # Main container (replaces EventWizard)
├── EventEditorHeader.tsx     # Back button, title, save button
├── EventEditorSidebar.tsx    # Section navigation
├── EventEditorContent.tsx    # Scrollable sections container
├── sections/                 # Section components (refactored from steps)
│   ├── BasicsSection.tsx
│   ├── VenueSection.tsx
│   ├── TeamSection.tsx
│   ├── RSVPSection.tsx
│   ├── CardsSection.tsx
│   ├── QuestionsSection.tsx
│   ├── LandingPageSection.tsx
│   └── PreviewSection.tsx
└── hooks/
    ├── useEventEditor.ts     # Form state management
    └── useActiveSection.ts   # Scroll position tracking
```

#### 2.2 EventEditor Layout

**File:** `src/components/events/editor/EventEditor.tsx`

```typescript
interface EventEditorProps {
  event?: Event;  // undefined for new, populated for edit
}

export function EventEditor({ event }: EventEditorProps) {
  const editor = useEventEditor(event);
  const activeSection = useActiveSection(SECTION_IDS);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <EventEditorHeader
        isNew={!event}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        onSave={editor.save}
        onBack={() => router.push('/events')}
      />

      <div className="flex">
        <EventEditorSidebar
          sections={SECTIONS}
          activeSection={activeSection}
          validationStatus={editor.validationStatus}
          onSectionClick={scrollToSection}
        />

        <EventEditorContent ref={contentRef}>
          <BasicsSection id="basics" data={editor.data} onChange={editor.update} />
          <VenueSection id="venue" data={editor.data} onChange={editor.update} />
          <TeamSection id="team" data={editor.data} onChange={editor.update} />
          <RSVPSection id="rsvp" data={editor.data} onChange={editor.update} />
          <CardsSection id="cards" data={editor.data} onChange={editor.update} />
          <QuestionsSection id="questions" data={editor.data} onChange={editor.update} />
          <LandingPageSection id="landing-page" data={editor.data} onChange={editor.update} />
          <PreviewSection id="preview" data={editor.data} eventId={event?.id} />
        </EventEditorContent>
      </div>
    </div>
  );
}
```

#### 2.3 Section Configuration

```typescript
const SECTIONS = [
  { id: 'basics', label: 'Basics', icon: FileText },
  { id: 'venue', label: 'Venue', icon: MapPin },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'rsvp', label: 'RSVP', icon: Mail },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'landing-page', label: 'Landing Page', icon: Layout },
  { id: 'preview', label: 'Preview', icon: Eye },
] as const;

const SECTION_IDS = SECTIONS.map(s => s.id);
```

#### 2.4 EventEditorHeader

**File:** `src/components/events/editor/EventEditorHeader.tsx`

```typescript
interface EventEditorHeaderProps {
  isNew: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onBack: () => void;
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Events          Create Event    [Unsaved] [Save]    │
└────────────────────────────────────────────────────────────────┘
```

- "Back to Events" returns to `/events` (with unsaved warning if dirty)
- Title shows "Create Event" or "Edit Event" based on mode
- "Unsaved" badge appears when `isDirty` is true
- "Save" button disabled when not dirty, shows spinner when saving

#### 2.5 EventEditorSidebar

**File:** `src/components/events/editor/EventEditorSidebar.tsx`

```typescript
interface EventEditorSidebarProps {
  sections: typeof SECTIONS;
  activeSection: string;
  validationStatus: Record<string, 'valid' | 'invalid' | 'incomplete'>;
  onSectionClick: (sectionId: string) => void;
}
```

**Layout:**
```
┌─────────────────┐
│ Event Details   │
│ ────────────────│
│                 │
│ ● Basics        │  ← Active (gold highlight)
│ ○ Venue         │
│ ○ Team          │
│ ○ RSVP          │
│ ○ Cards         │
│ ● Questions  ⚠  │  ← Has validation error
│ ○ Landing Page  │
│ ○ Preview       │
│                 │
│ ────────────────│
│ Completeness    │
│ ████████░░ 75%  │
└─────────────────┘
```

**Styling:**
- Active section: gold text, gold left border
- Invalid section: red dot or warning icon
- Hover: subtle background highlight
- Fixed position on desktop, sticky on scroll

#### 2.6 useActiveSection Hook

**File:** `src/components/events/editor/hooks/useActiveSection.ts`

```typescript
export function useActiveSection(sectionIds: string[]): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first section that's intersecting
        const intersecting = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (intersecting[0]) {
          setActiveSection(intersecting[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px', // Trigger when section is in top 30%
        threshold: 0,
      }
    );

    sectionIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}
```

#### 2.7 useEventEditor Hook

**File:** `src/components/events/editor/hooks/useEventEditor.ts`

```typescript
interface UseEventEditorReturn {
  data: EventWizardData;
  update: (updates: Partial<EventWizardData>) => void;
  isDirty: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  validationStatus: Record<string, 'valid' | 'invalid' | 'incomplete'>;
  errors: Record<string, string[]>;
}

export function useEventEditor(initialEvent?: Event): UseEventEditorReturn {
  const [data, setData] = useState<EventWizardData>(() =>
    initialEvent ? mapEventToEditorData(initialEvent) : DEFAULT_DATA
  );
  const [originalData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const isDirty = useMemo(() =>
    JSON.stringify(data) !== JSON.stringify(originalData),
    [data, originalData]
  );

  const validationStatus = useMemo(() => {
    return {
      basics: validateBasics(data),
      venue: validateVenue(data),
      team: 'valid', // Always valid (optional)
      rsvp: validateRSVP(data),
      cards: 'valid', // Always valid
      questions: validateQuestions(data),
      'landing-page': 'valid', // Always valid
      preview: 'valid',
    };
  }, [data]);

  const save = async () => {
    setIsSaving(true);
    try {
      const url = initialEvent
        ? `/api/events/${initialEvent.id}`
        : '/api/events';
      const method = initialEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformDataForAPI(data)),
      });

      if (!response.ok) throw new Error('Failed to save');

      const savedEvent = await response.json();
      toast.success(initialEvent ? 'Event updated!' : 'Event created!');
      router.push(`/events/${savedEvent.id}`);
    } catch (error) {
      toast.error('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  return { data, update: setData, isDirty, isSaving, save, validationStatus, errors: {} };
}
```

#### 2.8 Section Components

Refactor existing step components to be section components. Key changes:

1. Remove step-specific props (onNext, onBack, etc.)
2. Add `id` prop for scroll targeting
3. Wrap in section container with consistent styling

**Example Section Wrapper:**

```typescript
interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-b border-border last:border-b-0">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
```

#### 2.9 Mobile Responsive Design

**Breakpoints:**
- Desktop (≥1024px): Fixed sidebar, scrollable content
- Tablet (768-1023px): Collapsible sidebar (hamburger)
- Mobile (<768px): Horizontal scrollable section pills at top

**Mobile Section Pills:**
```
┌────────────────────────────────────────────────────────────┐
│ [Basics] [Venue] [Team] [RSVP] [Cards] [Quest...] →        │
└────────────────────────────────────────────────────────────┘
```

Implementation in `EventEditorSidebar.tsx`:
```typescript
// Desktop: vertical sidebar
// Mobile: horizontal scrollable pills
const isMobile = useMediaQuery('(max-width: 1023px)');

if (isMobile) {
  return <MobileSectionPills {...props} />;
}
return <DesktopSidebar {...props} />;
```

---

## Part 3: Route Updates

### 3.1 Update New Event Page

**File:** `src/app/(dashboard)/events/new/page.tsx`

```typescript
import { EventEditor } from '@/components/events/editor';

export default function NewEventPage() {
  return <EventEditor />;
}
```

### 3.2 Update Edit Event Page

**File:** `src/app/(dashboard)/events/[eventId]/edit/page.tsx`

```typescript
import { EventEditor } from '@/components/events/editor';

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  // ... fetch event ...
  return <EventEditor event={event} />;
}
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/events/wizard/OptionsEditor.tsx` | Question options editor component |
| `src/components/events/editor/EventEditor.tsx` | Main editor layout |
| `src/components/events/editor/EventEditorHeader.tsx` | Header with save button |
| `src/components/events/editor/EventEditorSidebar.tsx` | Section navigation |
| `src/components/events/editor/EventEditorContent.tsx` | Scrollable content container |
| `src/components/events/editor/hooks/useEventEditor.ts` | Form state management |
| `src/components/events/editor/hooks/useActiveSection.ts` | Scroll tracking |
| `src/components/events/editor/sections/*.tsx` | 8 section components |
| `src/components/events/editor/index.ts` | Barrel export |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/events/wizard/QuestionEditModal.tsx` | Add OptionsEditor for select types |
| `src/app/(dashboard)/events/new/page.tsx` | Use EventEditor instead of EventWizard |
| `src/app/(dashboard)/events/[eventId]/edit/page.tsx` | Use EventEditor instead of EventWizard |

### Deprecated Files (Keep for Reference)

| File | Status |
|------|--------|
| `src/components/events/wizard/EventWizard.tsx` | Replace with EventEditor |
| `src/components/events/wizard/WizardStepper.tsx` | Replace with sidebar |
| `src/components/events/wizard/WizardNavigation.tsx` | Remove (save button in header) |
| `src/components/events/wizard/steps/*.tsx` | Refactor to sections |

---

## Validation Rules

### Per-Section Validation

```typescript
const SECTION_VALIDATION = {
  basics: {
    required: ['name', 'date', 'startTime', 'endTime'],
    rules: {
      name: (v: string) => v.length > 0 || 'Event name is required',
      date: (v: string) => v.length > 0 || 'Date is required',
      startTime: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Invalid time format',
      endTime: (v: string) => /^\d{2}:\d{2}$/.test(v) || 'Invalid time format',
    },
  },
  venue: {
    required: ['venueName', 'venueAddress'],
    rules: {
      venueName: (v: string) => v.length > 0 || 'Venue name is required',
      venueAddress: (v: string) => v.length > 0 || 'Address is required',
    },
  },
  rsvp: {
    required: ['capacity'],
    rules: {
      capacity: (v: number) => v >= 2 && v <= 200 || 'Capacity must be 2-200',
    },
  },
  questions: {
    required: [],
    rules: {
      questions: (v: Question[]) => v.length >= 2 || 'At least 2 questions required',
      selectOptions: (q: Question) => {
        if (q.type === 'single_select' || q.type === 'multi_select') {
          return (q.config?.options?.length || 0) >= 2 || 'Select questions need at least 2 options';
        }
        return true;
      },
    },
  },
};
```

---

## Testing Checklist

### Question Options Editor
- [ ] Can add options to single_select question
- [ ] Can add options to multi_select question
- [ ] Can edit option label and description
- [ ] Can delete options
- [ ] Can reorder options via drag
- [ ] maxSelections config works for multi_select
- [ ] Validation prevents save with <2 options
- [ ] Values are auto-generated and unique

### Sidebar Navigation
- [ ] Click sidebar item scrolls to section
- [ ] Active section highlights as user scrolls
- [ ] Validation errors show indicator in sidebar
- [ ] Completeness percentage updates correctly

### Save Behavior
- [ ] "Unsaved Changes" appears when data changes
- [ ] Save button disabled when not dirty
- [ ] Save creates new event (POST)
- [ ] Save updates existing event (PUT)
- [ ] Navigation away warns about unsaved changes

### Mobile
- [ ] Section pills scroll horizontally on mobile
- [ ] Tapping pill scrolls to section
- [ ] All forms are usable on mobile viewport

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Clicks to edit single field | 6-7 | 1-2 |
| Can create custom select questions | No | Yes |
| Time to find specific section | ~10s | <3s |

---

## Out of Scope

- Live preview embed (future enhancement)
- Auto-save to server (manual save only)
- Drag-to-reorder sections
- Keyboard navigation between sections
- Undo/redo functionality
