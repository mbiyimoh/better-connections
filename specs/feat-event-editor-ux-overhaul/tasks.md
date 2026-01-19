# Task Breakdown: Event Editor UX Overhaul

**Generated**: 2026-01-15
**Source**: specs/feat-event-editor-ux-overhaul/spec.md
**Last Decompose**: 2026-01-15

## Overview

Redesign the event creation/editing experience from a linear 8-step wizard to a flexible sidebar + scrollable sections layout. Also implement the missing question options editor for `single_select` and `multi_select` question types.

## Summary

- **Total Tasks**: 12
- **Phase 1 (P0 - Options Editor)**: 3 tasks
- **Phase 2 (P1 - Editor Layout)**: 7 tasks
- **Phase 3 (Integration)**: 2 tasks

---

## Phase 1: Question Options Editor (P0 - Critical)

### Task 1.1: Create OptionsEditor Component

**Description**: Build the OptionsEditor component for managing single_select and multi_select answer options
**Size**: Medium
**Priority**: High (P0)
**Dependencies**: None
**Can run parallel with**: None (critical path)

**File**: `src/components/events/wizard/OptionsEditor.tsx`

**Technical Requirements**:
- Display list of options with label and optional description
- Add new option button
- Edit option inline (click to edit)
- Delete option with X button
- Up/down arrows for reordering (simplified from drag)
- Auto-generate `value` from `label` (slug format)
- For multi_select: show maxSelections input

**Implementation**:

```typescript
'use client';

import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

function generateOptionValue(label: string, existingValues: string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  if (!base) base = 'option';

  let value = base;
  let counter = 1;
  while (existingValues.includes(value)) {
    value = `${base}_${counter}`;
    counter++;
  }
  return value;
}

export function OptionsEditor({
  options,
  onChange,
  showMaxSelections = false,
  maxSelections,
  onMaxSelectionsChange,
}: OptionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAddOption = () => {
    const existingValues = options.map((o) => o.value);
    const newOption: OptionItem = {
      value: generateOptionValue('New Option', existingValues),
      label: 'New Option',
      description: '',
    };
    onChange([...options, newOption]);
    // Start editing the new option
    setEditingIndex(options.length);
    setEditLabel('New Option');
    setEditDescription('');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditLabel(options[index]?.label || '');
    setEditDescription(options[index]?.description || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const existingValues = options
      .filter((_, i) => i !== editingIndex)
      .map((o) => o.value);

    const updatedOptions = options.map((opt, i) =>
      i === editingIndex
        ? {
            ...opt,
            label: editLabel.trim() || 'Untitled',
            description: editDescription.trim() || undefined,
            value: generateOptionValue(editLabel.trim() || 'Untitled', existingValues),
          }
        : opt
    );

    onChange(updatedOptions);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= options.length) return;

    const newOptions = [...options];
    const temp = newOptions[index];
    newOptions[index] = newOptions[newIndex]!;
    newOptions[newIndex] = temp!;
    onChange(newOptions);
  };

  return (
    <div className="space-y-4">
      <Label>Answer Options</Label>

      {options.length === 0 ? (
        <div className="text-sm text-text-tertiary p-4 bg-bg-tertiary rounded-lg text-center">
          No options yet. Add at least 2 options for this question type.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={option.value}
              className="flex items-start gap-2 p-3 bg-bg-tertiary rounded-lg group"
            >
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} className="text-text-tertiary" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === options.length - 1}
                  className="p-0.5 rounded hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} className="text-text-tertiary" />
                </button>
              </div>

              {/* Option content */}
              {editingIndex === index ? (
                <div className="flex-1 space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Option label"
                    className="bg-bg-secondary"
                    autoFocus
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="bg-bg-secondary"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleStartEdit(index)}
                >
                  <p className="text-white text-sm font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-text-tertiary">{option.description}</p>
                  )}
                </div>
              )}

              {/* Delete button */}
              {editingIndex !== index && (
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="p-1 rounded hover:bg-bg-secondary text-text-tertiary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddOption}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>

      {options.length > 0 && options.length < 2 && (
        <p className="text-xs text-warning">
          Select questions require at least 2 options
        </p>
      )}

      {showMaxSelections && (
        <div className="pt-4 border-t border-border space-y-2">
          <Label htmlFor="maxSelections">Max Selections</Label>
          <Input
            id="maxSelections"
            type="number"
            min={1}
            max={options.length || 10}
            value={maxSelections || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onMaxSelectionsChange?.(isNaN(val) ? undefined : val);
            }}
            placeholder="Leave empty for unlimited"
            className="bg-bg-tertiary w-32"
          />
          <p className="text-xs text-text-tertiary">
            Leave empty to allow selecting all options
          </p>
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Can add new options with auto-generated values
- [ ] Can edit option label and description inline
- [ ] Can delete options
- [ ] Can reorder options with up/down arrows
- [ ] Shows warning when fewer than 2 options
- [ ] maxSelections input appears for multi_select only
- [ ] Values are unique and slug-formatted

---

### Task 1.2: Integrate OptionsEditor into QuestionEditModal

**Description**: Add OptionsEditor to the question edit modal for single_select and multi_select types
**Size**: Small
**Priority**: High (P0)
**Dependencies**: Task 1.1
**Can run parallel with**: None

**File**: `src/components/events/wizard/QuestionEditModal.tsx`

**Changes**:

1. Add import at top:
```typescript
import { OptionsEditor } from './OptionsEditor';
```

2. Add after the slider config section (~line 192), before the locked question notice:
```typescript
{(editedQuestion.type === 'single_select' || editedQuestion.type === 'multi_select') && (
  <OptionsEditor
    options={editedQuestion.config?.options || []}
    onChange={(options) => updateConfig('options', options)}
    showMaxSelections={editedQuestion.type === 'multi_select'}
    maxSelections={editedQuestion.config?.maxSelections}
    onMaxSelectionsChange={(max) => updateConfig('maxSelections', max)}
  />
)}
```

3. Add validation before save (update handleSave function):
```typescript
const handleSave = () => {
  if (!editedQuestion) return;

  // Validate select questions have at least 2 options
  if (
    (editedQuestion.type === 'single_select' || editedQuestion.type === 'multi_select') &&
    (!editedQuestion.config?.options || editedQuestion.config.options.length < 2)
  ) {
    // Don't save - validation message shown in OptionsEditor
    return;
  }

  onSave(editedQuestion);
  onClose();
};
```

**Acceptance Criteria**:
- [ ] OptionsEditor appears when editing single_select questions
- [ ] OptionsEditor appears when editing multi_select questions
- [ ] maxSelections input only shows for multi_select
- [ ] Cannot save question with fewer than 2 options
- [ ] Options are persisted when saving

---

### Task 1.3: Test Question Options Editor

**Description**: Manual testing of the options editor functionality
**Size**: Small
**Priority**: High (P0)
**Dependencies**: Task 1.2

**Test Scenarios**:
1. Create new single_select question → add 3 options → save → verify options persisted
2. Create new multi_select question → set maxSelections to 2 → save → verify config saved
3. Edit existing question with options → modify options → save → verify changes
4. Try to save with 0 options → should be prevented
5. Try to save with 1 option → should be prevented
6. Reorder options → verify order persisted
7. Delete option → verify removed
8. Edit option label → verify value auto-updates

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Options work in both create and edit flows

---

## Phase 2: Sidebar + Scrollable Sections Layout (P1)

### Task 2.1: Create useActiveSection Hook

**Description**: Build IntersectionObserver hook for tracking scroll position
**Size**: Small
**Priority**: Medium (P1)
**Dependencies**: None
**Can run parallel with**: Task 2.2, 2.3

**File**: `src/components/events/editor/hooks/useActiveSection.ts`

**Implementation**:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

export function useActiveSection(sectionIds: readonly string[]): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const sectionIdsRef = useRef(sectionIds);

  // Update ref when sectionIds change
  useEffect(() => {
    sectionIdsRef.current = sectionIds;
  }, [sectionIds]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find intersecting sections
        const intersecting = entries
          .filter((e) => e.isIntersecting)
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

    // Use stable ref for observation
    const ids = sectionIdsRef.current;
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [JSON.stringify(sectionIds)]); // Stable comparison

  return activeSection;
}
```

**Acceptance Criteria**:
- [ ] Returns first section ID by default
- [ ] Updates active section as user scrolls
- [ ] Cleans up observer on unmount
- [ ] Handles section ID changes

---

### Task 2.2: Create useEventEditor Hook

**Description**: Build form state management hook for the editor
**Size**: Medium
**Priority**: Medium (P1)
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.3

**File**: `src/components/events/editor/hooks/useEventEditor.ts`

**Implementation**:

```typescript
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Event } from '@prisma/client';
import { toast } from 'sonner';
import type { EventWizardData } from '@/components/events/wizard/hooks/useWizardState';
import { type Question, type WhatToExpectItem, type LandingPageSettings, DEFAULT_LANDING_PAGE_SETTINGS } from '@/lib/m33t/schemas';
import { STARTER_QUESTIONS } from '@/lib/m33t/questions';

const DEFAULT_CARD_SETTINGS: Record<string, boolean> = {
  role: true,
  company: true,
  expertise: true,
  lookingFor: true,
  canHelp: true,
  whyNow: true,
  conversationStarters: true,
};

const DEFAULT_DATA: EventWizardData = {
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  timezone: 'America/Chicago',
  eventType: '',
  description: '',
  eventGoals: [],
  venueName: '',
  venueAddress: '',
  parkingNotes: '',
  dressCode: '',
  organizers: [],
  capacity: 50,
  rsvpDeadline: '',
  matchesPerAttendee: 5,
  revealTiming: 'TWENTY_FOUR_HOURS_BEFORE',
  cardSettings: DEFAULT_CARD_SETTINGS,
  questions: [],
  whatToExpect: [],
  landingPageSettings: DEFAULT_LANDING_PAGE_SETTINGS,
};

function mapEventToEditorData(event: Event): EventWizardData {
  const eventWithExtras = event as Event & {
    eventType?: string;
    eventGoals?: string[];
    parkingNotes?: string;
    dressCode?: string;
    whatToExpect?: WhatToExpectItem[];
    landingPageSettings?: LandingPageSettings;
  };

  return {
    name: event.name,
    date: event.date.toISOString().split('T')[0] ?? '',
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    eventType: eventWithExtras.eventType || '',
    description: event.description || '',
    eventGoals: eventWithExtras.eventGoals || [],
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    parkingNotes: eventWithExtras.parkingNotes || '',
    dressCode: eventWithExtras.dressCode || '',
    organizers: [],
    capacity: event.capacity,
    rsvpDeadline: event.rsvpDeadline?.toISOString().split('T')[0] || '',
    matchesPerAttendee: event.matchesPerAttendee,
    revealTiming: event.revealTiming,
    cardSettings: (event.cardSettings as Record<string, boolean>) || DEFAULT_CARD_SETTINGS,
    questions: (event.questions as Question[]) || STARTER_QUESTIONS,
    whatToExpect: (eventWithExtras.whatToExpect as WhatToExpectItem[]) || [],
    landingPageSettings: (eventWithExtras.landingPageSettings as LandingPageSettings) || DEFAULT_LANDING_PAGE_SETTINGS,
  };
}

type ValidationStatus = 'valid' | 'invalid' | 'incomplete';

interface UseEventEditorReturn {
  data: EventWizardData;
  update: (updates: Partial<EventWizardData>) => void;
  isDirty: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  validationStatus: Record<string, ValidationStatus>;
}

export function useEventEditor(initialEvent?: Event): UseEventEditorReturn {
  const [data, setData] = useState<EventWizardData>(() =>
    initialEvent ? mapEventToEditorData(initialEvent) : DEFAULT_DATA
  );
  const [originalData] = useState(() =>
    initialEvent ? mapEventToEditorData(initialEvent) : DEFAULT_DATA
  );
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const isDirty = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(originalData),
    [data, originalData]
  );

  const update = useCallback((updates: Partial<EventWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const validationStatus = useMemo((): Record<string, ValidationStatus> => {
    const validateBasics = (): ValidationStatus => {
      if (!data.name || !data.date || !data.startTime || !data.endTime) {
        return data.name || data.date ? 'incomplete' : 'invalid';
      }
      return 'valid';
    };

    const validateVenue = (): ValidationStatus => {
      if (!data.venueName || !data.venueAddress) {
        return data.venueName || data.venueAddress ? 'incomplete' : 'invalid';
      }
      return 'valid';
    };

    const validateRSVP = (): ValidationStatus => {
      if (data.capacity < 2 || data.capacity > 200) return 'invalid';
      return 'valid';
    };

    const validateQuestions = (): ValidationStatus => {
      if (data.questions.length < 2) return 'incomplete';
      // Check select questions have options
      const hasInvalidSelect = data.questions.some(
        (q) =>
          (q.type === 'single_select' || q.type === 'multi_select') &&
          (!q.config?.options || q.config.options.length < 2)
      );
      if (hasInvalidSelect) return 'invalid';
      return 'valid';
    };

    return {
      basics: validateBasics(),
      venue: validateVenue(),
      team: 'valid',
      rsvp: validateRSVP(),
      cards: 'valid',
      questions: validateQuestions(),
      'landing-page': 'valid',
      preview: 'valid',
    };
  }, [data]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const url = initialEvent ? `/api/events/${initialEvent.id}` : '/api/events';
      const method = initialEvent ? 'PUT' : 'POST';

      // Transform data for API
      const apiData = {
        name: data.name,
        tagline: '', // Not in wizard data
        description: data.description || undefined,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        capacity: data.capacity,
        rsvpDeadline: data.rsvpDeadline || undefined,
        matchesPerAttendee: data.matchesPerAttendee,
        revealTiming: data.revealTiming,
        eventType: data.eventType || undefined,
        eventGoals: data.eventGoals.length > 0 ? data.eventGoals : undefined,
        parkingNotes: data.parkingNotes || undefined,
        dressCode: data.dressCode || undefined,
        cardSettings: data.cardSettings,
        questions: data.questions,
        whatToExpect: data.whatToExpect.length > 0 ? data.whatToExpect : undefined,
        landingPageSettings: data.landingPageSettings,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save');
      }

      const savedEvent = await response.json();
      toast.success(initialEvent ? 'Event updated!' : 'Event created!');
      router.push(`/events/${savedEvent.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }, [data, initialEvent, router]);

  return { data, update, isDirty, isSaving, save, validationStatus };
}
```

**Acceptance Criteria**:
- [ ] Initializes with default data for new events
- [ ] Initializes with event data for edit mode
- [ ] isDirty tracks changes correctly
- [ ] validationStatus returns correct status per section
- [ ] save() creates new event (POST) or updates (PUT)
- [ ] Error handling with toast notifications

---

### Task 2.3: Create EventEditorSidebar Component

**Description**: Build the sidebar navigation component
**Size**: Medium
**Priority**: Medium (P1)
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2

**File**: `src/components/events/editor/EventEditorSidebar.tsx`

**Implementation**:

```typescript
'use client';

import { FileText, MapPin, Users, Mail, CreditCard, HelpCircle, Layout, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

export type SectionId = (typeof SECTIONS)[number]['id'];

type ValidationStatus = 'valid' | 'invalid' | 'incomplete';

interface EventEditorSidebarProps {
  activeSection: string;
  validationStatus: Record<string, ValidationStatus>;
  onSectionClick: (sectionId: string) => void;
}

export function EventEditorSidebar({
  activeSection,
  validationStatus,
  onSectionClick,
}: EventEditorSidebarProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)');

  if (isMobile) {
    return (
      <div className="sticky top-0 z-10 bg-bg-primary border-b border-border overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const status = validationStatus[section.id];

            return (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-gold-subtle text-gold-primary'
                    : 'text-text-secondary hover:text-white hover:bg-bg-tertiary',
                  status === 'invalid' && 'ring-1 ring-error/50'
                )}
              >
                {section.label}
                {status === 'invalid' && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-error inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-secondary sticky top-0 h-screen overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-medium text-text-secondary mb-4">Event Details</h2>

        <nav className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const status = validationStatus[section.id];

            return (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  isActive
                    ? 'bg-gold-subtle text-gold-primary border-l-2 border-gold-primary -ml-0.5 pl-[calc(0.75rem+2px)]'
                    : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
                )}
              >
                <Icon size={16} />
                <span className="flex-1">{section.label}</span>
                {status === 'invalid' && (
                  <span className="w-2 h-2 rounded-full bg-error" />
                )}
                {status === 'incomplete' && (
                  <span className="w-2 h-2 rounded-full bg-warning" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export { SECTIONS };
```

**Acceptance Criteria**:
- [ ] Desktop: vertical sidebar with icons and labels
- [ ] Mobile: horizontal scrollable pills
- [ ] Active section highlighted with gold
- [ ] Invalid sections show red dot
- [ ] Incomplete sections show yellow dot
- [ ] Click triggers onSectionClick callback

---

### Task 2.4: Create EventEditorHeader Component

**Description**: Build the header with back button, title, and save button
**Size**: Small
**Priority**: Medium (P1)
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2, 2.3

**File**: `src/components/events/editor/EventEditorHeader.tsx`

**Implementation**:

```typescript
'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EventEditorHeaderProps {
  isNew: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export function EventEditorHeader({
  isNew,
  isDirty,
  isSaving,
  onSave,
}: EventEditorHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-bg-primary border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/events"
            className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Events</span>
          </Link>
        </div>

        <h1 className="text-lg font-semibold text-white">
          {isNew ? 'Create' : 'Edit'} Event
        </h1>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-warning px-2 py-1 bg-warning/10 rounded">
              Unsaved changes
            </span>
          )}
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
```

**Acceptance Criteria**:
- [ ] Back button links to /events
- [ ] Title shows "Create Event" or "Edit Event"
- [ ] "Unsaved changes" badge when isDirty
- [ ] Save button disabled when not dirty or saving
- [ ] Save button shows spinner when saving

---

### Task 2.5: Create Section Wrapper Component

**Description**: Build reusable section wrapper for consistent styling
**Size**: Small
**Priority**: Medium (P1)
**Dependencies**: None
**Can run parallel with**: All Phase 2 tasks

**File**: `src/components/events/editor/Section.tsx`

**Implementation**:

```typescript
interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 py-8 border-b border-border last:border-b-0"
    >
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

**Acceptance Criteria**:
- [ ] Renders section with id for scroll targeting
- [ ] scroll-mt-20 accounts for sticky header
- [ ] Title and optional description
- [ ] Border between sections

---

### Task 2.6: Create EventEditor Main Component

**Description**: Build the main EventEditor container that orchestrates all parts
**Size**: Large
**Priority**: Medium (P1)
**Dependencies**: Task 2.1, 2.2, 2.3, 2.4, 2.5

**File**: `src/components/events/editor/EventEditor.tsx`

**Implementation**:

```typescript
'use client';

import type { Event } from '@prisma/client';
import { useEventEditor } from './hooks/useEventEditor';
import { useActiveSection } from './hooks/useActiveSection';
import { EventEditorHeader } from './EventEditorHeader';
import { EventEditorSidebar, SECTIONS } from './EventEditorSidebar';
import { Section } from './Section';

// Import existing step components (we'll use their content)
import { BasicsStep } from '@/components/events/wizard/steps/BasicsStep';
import { VenueStep } from '@/components/events/wizard/steps/VenueStep';
import { OrganizersStep } from '@/components/events/wizard/steps/OrganizersStep';
import { RSVPStep } from '@/components/events/wizard/steps/RSVPStep';
import { CardsStep } from '@/components/events/wizard/steps/CardsStep';
import { QuestionnaireStep } from '@/components/events/wizard/steps/QuestionnaireStep';
import { LandingPageStep } from '@/components/events/wizard/steps/LandingPageStep';
import { ReviewStep } from '@/components/events/wizard/steps/ReviewStep';

const SECTION_IDS = SECTIONS.map((s) => s.id);

interface EventEditorProps {
  event?: Event;
}

export function EventEditor({ event }: EventEditorProps) {
  const editor = useEventEditor(event);
  const activeSection = useActiveSection(SECTION_IDS);

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
      />

      <div className="flex">
        <EventEditorSidebar
          activeSection={activeSection}
          validationStatus={editor.validationStatus}
          onSectionClick={scrollToSection}
        />

        <main className="flex-1 max-w-4xl mx-auto px-6">
          <Section id="basics" title="Basics" description="Event name, date, and time">
            <BasicsStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="venue" title="Venue" description="Location and logistics">
            <VenueStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="team" title="Team" description="Organizers and permissions">
            <OrganizersStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="rsvp" title="RSVP" description="Capacity and timing settings">
            <RSVPStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="cards" title="Cards" description="Trading card field configuration">
            <CardsStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="questions" title="Questions" description="Attendee questionnaire">
            <QuestionnaireStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="landing-page" title="Landing Page" description="Public page configuration">
            <LandingPageStep data={editor.data} onChange={editor.update} />
          </Section>

          <Section id="preview" title="Preview" description="Review your event">
            <ReviewStep data={editor.data} onEdit={scrollToSection} />
          </Section>
        </main>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Renders header, sidebar, and all sections
- [ ] Scroll tracking updates sidebar active state
- [ ] Click sidebar item scrolls to section
- [ ] All existing step components render correctly
- [ ] Form data flows through editor hook

---

### Task 2.7: Create Barrel Export

**Description**: Create index file for clean imports
**Size**: Small
**Priority**: Medium (P1)
**Dependencies**: Task 2.6

**File**: `src/components/events/editor/index.ts`

**Implementation**:

```typescript
export { EventEditor } from './EventEditor';
export { useEventEditor } from './hooks/useEventEditor';
export { useActiveSection } from './hooks/useActiveSection';
```

**Acceptance Criteria**:
- [ ] Can import EventEditor from '@/components/events/editor'

---

## Phase 3: Integration

### Task 3.1: Update Route Pages

**Description**: Update new and edit event pages to use EventEditor
**Size**: Small
**Priority**: Medium (P1)
**Dependencies**: Task 2.7

**Files**:

1. `src/app/(dashboard)/events/new/page.tsx`:
```typescript
import { EventEditor } from '@/components/events/editor';

export default function NewEventPage() {
  return <EventEditor />;
}
```

2. `src/app/(dashboard)/events/[eventId]/edit/page.tsx`:
```typescript
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { EventEditor } from '@/components/events/editor';

interface EditEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
  });

  if (!event) {
    notFound();
  }

  return <EventEditor event={event} />;
}
```

**Acceptance Criteria**:
- [ ] /events/new renders EventEditor (new mode)
- [ ] /events/[id]/edit renders EventEditor with event data
- [ ] Auth redirect works
- [ ] Not found handling works

---

### Task 3.2: End-to-End Testing

**Description**: Manual E2E testing of the full flow
**Size**: Medium
**Priority**: Medium (P1)
**Dependencies**: Task 3.1

**Test Scenarios**:

1. **New Event Flow**:
   - Navigate to /events/new
   - Verify all 8 sections visible
   - Fill in required fields (basics, venue)
   - Add questions with options
   - Configure landing page
   - Save → verify redirect to event detail
   - Edit again → verify data loaded

2. **Edit Event Flow**:
   - Navigate to existing event edit page
   - Verify data pre-populated
   - Make changes
   - Verify "Unsaved changes" appears
   - Save → verify changes persisted

3. **Sidebar Navigation**:
   - Click each sidebar item → verify smooth scroll
   - Scroll manually → verify sidebar updates
   - On mobile → verify horizontal pills work

4. **Validation**:
   - Leave required fields empty → verify red dots in sidebar
   - Add invalid select question (1 option) → verify error indicator
   - Fix issues → verify indicators clear

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] Existing wizard still works (not broken during transition)

---

## Execution Order

**Critical Path** (must be sequential):
1. Task 1.1 → 1.2 → 1.3 (Options Editor - P0)

**Parallel Work** (after P0 complete):
- Tasks 2.1, 2.2, 2.3, 2.4, 2.5 can all run in parallel
- Task 2.6 depends on all above
- Task 2.7 depends on 2.6
- Task 3.1 depends on 2.7
- Task 3.2 depends on 3.1

**Recommended Order**:
```
Phase 1 (P0): 1.1 → 1.2 → 1.3
Phase 2 (P1): [2.1, 2.2, 2.3, 2.4, 2.5] → 2.6 → 2.7
Phase 3: 3.1 → 3.2
```

---

## Risk Mitigation

1. **Step component coupling**: Keep existing wizard functional until new editor is complete
2. **State management complexity**: Reuse existing EventWizardData type
3. **Mobile layout**: Test early on real devices
4. **Scroll tracking edge cases**: Use JSON.stringify for stable deps (per CLAUDE.md pattern)
