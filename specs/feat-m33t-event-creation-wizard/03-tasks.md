# Task Breakdown: M33T Event Creation Wizard

**Generated:** 2026-01-14
**Source:** `specs/feat-m33t-event-creation-wizard/01-specification.md`
**Last Decompose:** 2026-01-14

---

## Overview

Transform M33T event creation from a single-page form into a 7-step wizard with co-organizers, questionnaire configuration, and trading card settings.

**Total Tasks:** 18 tasks across 5 phases
**Critical Path:** Phase 1 → Phase 2 → Phases 3-4 (parallel) → Phase 5

---

## Phase 1: Foundation (Critical Path)

### Task 1.1: Add EventOrganizer model to Prisma schema
**Description:** Create new EventOrganizer model and update Event model with new fields
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (blocks all other tasks)

**Technical Requirements:**
- Add EventOrganizer model with permissions (canInvite, canCurate, canEdit, canManage)
- Add relation to Event model
- Add new Event fields: eventType, eventGoals, parkingNotes, dressCode
- Add proper indexes for performance

**Implementation:**

Add to `prisma/schema.prisma`:

```prisma
model EventOrganizer {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  // Permissions
  canInvite   Boolean @default(true)   // Can add guests from their contacts
  canCurate   Boolean @default(true)   // Can suggest/override match recommendations
  canEdit     Boolean @default(false)  // Can modify event details
  canManage   Boolean @default(false)  // Can add/remove other organizers

  // Invitation tracking (for future use)
  invitedAt   DateTime @default(now())
  acceptedAt  DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
}
```

Update Event model - add these fields:
```prisma
  // Add relation to organizers
  organizers    EventOrganizer[]

  // Add fields for new features
  eventType     String?          // networking, conference, workshop, social, other
  eventGoals    String[]         // fundraising, hiring, partnerships, learning, community
  parkingNotes  String?
  dressCode     String?          // casual, business-casual, formal, creative
```

Update User model - add relation:
```prisma
  eventOrganizers EventOrganizer[]
```

**Acceptance Criteria:**
- [ ] EventOrganizer model added with all fields
- [ ] Event model has organizers relation and new fields
- [ ] User model has eventOrganizers relation
- [ ] Schema validates with `npx prisma validate`

---

### Task 1.2: Run database migration
**Description:** Apply schema changes to database
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Implementation:**
```bash
npx prisma db push
```

**Acceptance Criteria:**
- [ ] Migration runs without errors
- [ ] Database has new EventOrganizer table
- [ ] Event table has new columns
- [ ] Prisma client regenerated

---

### Task 1.3: Create Edit Event page (basic form)
**Description:** Create `/events/[eventId]/edit` page to fix the current 404
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** None

**Technical Requirements:**
- Server component to fetch event data
- Client component for form
- Reuse existing form fields from `/events/new`
- Add authorization check (owner only)
- Handle form submission with PUT to API

**Implementation:**

Create `src/app/(dashboard)/events/[eventId]/edit/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { EditEventForm } from '@/components/events/EditEventForm';

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

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <EditEventForm event={event} />
    </div>
  );
}
```

Create `src/components/events/EditEventForm.tsx`:
- Copy structure from `/events/new/page.tsx`
- Pre-populate form with event data
- Change submit to PUT instead of POST
- Add "Back to Event" link
- Show success toast and redirect on save

**Acceptance Criteria:**
- [ ] Edit page loads at `/events/[eventId]/edit`
- [ ] Form pre-populated with existing event data
- [ ] Only event owner can access edit page
- [ ] Changes save successfully via PUT
- [ ] Redirects to event detail after save
- [ ] Non-owner gets 404

---

### Task 1.4: Update Event API for edit support
**Description:** Ensure PUT endpoint accepts all event fields
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Update PUT handler in `/api/events/[eventId]/route.ts`
- Accept new fields (eventType, eventGoals, parkingNotes, dressCode)
- Validate with updated schema

**Implementation:**

Update `src/app/api/events/[eventId]/route.ts` PUT handler to include new fields:

```typescript
// Update the Prisma update call to include new fields
const updatedEvent = await prisma.event.update({
  where: { id: eventId },
  data: {
    name: body.name,
    tagline: body.tagline,
    description: body.description,
    date: new Date(body.date),
    startTime: body.startTime,
    endTime: body.endTime,
    timezone: body.timezone,
    venueName: body.venueName,
    venueAddress: body.venueAddress,
    capacity: body.capacity,
    matchesPerAttendee: body.matchesPerAttendee,
    revealTiming: body.revealTiming,
    // New fields
    eventType: body.eventType,
    eventGoals: body.eventGoals || [],
    parkingNotes: body.parkingNotes,
    dressCode: body.dressCode,
    questions: body.questions,
    cardSettings: body.cardSettings,
  },
});
```

**Acceptance Criteria:**
- [ ] PUT accepts all new fields
- [ ] Validation works for new fields
- [ ] Existing events can be updated

---

## Phase 2: Wizard Infrastructure

### Task 2.1: Create wizard state management hook
**Description:** Build useWizardState hook for managing multi-step form state
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.2

**Technical Requirements:**
- Track current step (0-6)
- Track completed steps
- Store form data across all steps
- Track dirty state for unsaved changes
- Provide navigation functions

**Implementation:**

Create `src/components/events/wizard/hooks/useWizardState.ts`:

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Event } from '@prisma/client';

export interface EventWizardData {
  // Step 1: Basics
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  eventType: string;
  description: string;
  eventGoals: string[];

  // Step 2: Venue
  venueName: string;
  venueAddress: string;
  parkingNotes: string;
  dressCode: string;

  // Step 3: Organizers
  organizers: Array<{
    id?: string;
    userId: string;
    contactId?: string;
    name: string;
    email?: string;
    permissions: {
      canInvite: boolean;
      canCurate: boolean;
      canEdit: boolean;
      canManage: boolean;
    };
  }>;

  // Step 4: RSVP
  capacity: number;
  rsvpDeadline: string;
  matchesPerAttendee: number;
  revealTiming: string;

  // Step 5: Cards
  cardSettings: Record<string, boolean>;

  // Step 6: Questions
  questions: Question[];
}

export interface Question {
  id: string;
  type: 'open_text' | 'slider' | 'single_select' | 'multi_select';
  category: string;
  title: string;
  subtitle?: string;
  required: boolean;
  locked: boolean;
  order: number;
  options?: Array<{ value: string; label: string; description?: string }>;
  maxSelections?: number;
  leftLabel?: string;
  rightLabel?: string;
}

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  data: EventWizardData;
  isDirty: boolean;
}

const TOTAL_STEPS = 7;

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
  cardSettings: {
    role: true,
    company: true,
    expertise: true,
    lookingFor: true,
    canHelp: true,
    whyNow: true,
    conversationStarters: true,
  },
  questions: [],
};

export function useWizardState(initialEvent?: Event) {
  const [state, setState] = useState<WizardState>(() => ({
    currentStep: 0,
    completedSteps: new Set(initialEvent ? [0, 1, 2, 3, 4, 5, 6] : []),
    data: initialEvent ? mapEventToWizardData(initialEvent) : DEFAULT_DATA,
    isDirty: false,
  }));

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setState(prev => ({ ...prev, currentStep: step }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
      completedSteps: new Set([...prev.completedSteps, prev.currentStep]),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const updateData = useCallback((updates: Partial<EventWizardData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
      isDirty: true,
    }));
  }, []);

  const isStepComplete = useCallback((step: number) => {
    return state.completedSteps.has(step);
  }, [state.completedSteps]);

  const canProceed = useMemo(() => {
    const { data, currentStep } = state;
    switch (currentStep) {
      case 0: // Basics
        return !!(data.name && data.date && data.startTime && data.endTime);
      case 1: // Venue
        return !!(data.venueName && data.venueAddress);
      case 2: // Organizers
        return true; // Optional
      case 3: // RSVP
        return data.capacity > 0;
      case 4: // Cards
        return true; // Always valid
      case 5: // Questions
        return data.questions.length >= 2; // At least required questions
      case 6: // Review
        return true;
      default:
        return false;
    }
  }, [state]);

  return {
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    data: state.data,
    isDirty: state.isDirty,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    isStepComplete,
    canProceed,
  };
}

function mapEventToWizardData(event: Event): EventWizardData {
  return {
    name: event.name,
    date: event.date.toISOString().split('T')[0],
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    eventType: (event as any).eventType || '',
    description: event.description || '',
    eventGoals: (event as any).eventGoals || [],
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    parkingNotes: (event as any).parkingNotes || '',
    dressCode: (event as any).dressCode || '',
    organizers: [],
    capacity: event.capacity,
    rsvpDeadline: event.rsvpDeadline?.toISOString().split('T')[0] || '',
    matchesPerAttendee: event.matchesPerAttendee,
    revealTiming: event.revealTiming,
    cardSettings: (event.cardSettings as Record<string, boolean>) || DEFAULT_DATA.cardSettings,
    questions: (event.questions as Question[]) || [],
  };
}
```

**Acceptance Criteria:**
- [ ] Hook tracks current step correctly
- [ ] Navigation functions work (next, prev, goTo)
- [ ] Data persists across step navigation
- [ ] Dirty state tracked on changes
- [ ] Step validation works per step requirements

---

### Task 2.2: Create WizardStepper component
**Description:** Build step indicator showing progress through wizard
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1

**Implementation:**

Create `src/components/events/wizard/WizardStepper.tsx`:

```typescript
'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
}

const STEPS: Step[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'venue', label: 'Venue' },
  { id: 'organizers', label: 'Team' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'cards', label: 'Cards' },
  { id: 'questions', label: 'Questions' },
  { id: 'review', label: 'Review' },
];

interface WizardStepperProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function WizardStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: WizardStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8 px-4">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => index < currentStep && onStepClick(index)}
            disabled={index > currentStep && !completedSteps.has(index)}
            className={cn(
              'flex flex-col items-center gap-2 transition-all duration-300',
              index < currentStep ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border',
                index === currentStep && 'bg-gold-primary text-bg-primary border-gold-primary scale-110',
                index < currentStep && 'bg-gold-subtle text-gold-primary border-gold-primary',
                index > currentStep && 'bg-bg-tertiary text-text-tertiary border-border'
              )}
            >
              {completedSteps.has(index) && index < currentStep ? (
                <Check size={16} />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block',
                index === currentStep ? 'text-gold-primary' : 'text-text-tertiary'
              )}
            >
              {step.label}
            </span>
          </button>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px mx-2 min-w-[20px]',
                index < currentStep ? 'bg-gold-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows all 7 steps with labels
- [ ] Current step highlighted with gold
- [ ] Completed steps show checkmark
- [ ] Clicking completed step navigates back
- [ ] Progress lines colored appropriately

---

### Task 2.3: Create WizardNavigation component
**Description:** Build Back/Next/Submit navigation buttons
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1, 2.2

**Implementation:**

Create `src/components/events/wizard/WizardNavigation.tsx`:

```typescript
'use client';

import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  canProceed,
  isSubmitting,
  isEditMode,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={isFirstStep ? 'opacity-0 pointer-events-none' : ''}
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {isEditMode ? 'Save Changes' : 'Create Event'}
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Back button hidden on first step
- [ ] Next button disabled when validation fails
- [ ] Submit button shows on last step
- [ ] Loading state during submission
- [ ] Different text for edit vs create mode

---

### Task 2.4: Create EventWizard container component
**Description:** Main wizard component that orchestrates steps
**Size:** Medium
**Priority:** High
**Dependencies:** Tasks 2.1, 2.2, 2.3
**Can run parallel with:** None

**Implementation:**

Create `src/components/events/wizard/EventWizard.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Event } from '@prisma/client';
import { useWizardState } from './hooks/useWizardState';
import { WizardStepper } from './WizardStepper';
import { WizardNavigation } from './WizardNavigation';
import { BasicsStep } from './steps/BasicsStep';
import { VenueStep } from './steps/VenueStep';
import { OrganizersStep } from './steps/OrganizersStep';
import { RSVPStep } from './steps/RSVPStep';
import { CardsStep } from './steps/CardsStep';
import { QuestionnaireStep } from './steps/QuestionnaireStep';
import { ReviewStep } from './steps/ReviewStep';
import { Card, CardContent } from '@/components/ui/card';

interface EventWizardProps {
  event?: Event;
  mode: 'create' | 'edit';
}

export function EventWizard({ event, mode }: EventWizardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wizard = useWizardState(event);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const url = mode === 'edit'
        ? `/api/events/${event!.id}`
        : '/api/events';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizard.data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save event');
      }

      const savedEvent = await response.json();
      toast.success(mode === 'edit' ? 'Event updated!' : 'Event created!');
      router.push(`/events/${savedEvent.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return <BasicsStep data={wizard.data} onChange={wizard.updateData} />;
      case 1:
        return <VenueStep data={wizard.data} onChange={wizard.updateData} />;
      case 2:
        return <OrganizersStep data={wizard.data} onChange={wizard.updateData} />;
      case 3:
        return <RSVPStep data={wizard.data} onChange={wizard.updateData} />;
      case 4:
        return <CardsStep data={wizard.data} onChange={wizard.updateData} />;
      case 5:
        return <QuestionnaireStep data={wizard.data} onChange={wizard.updateData} />;
      case 6:
        return <ReviewStep data={wizard.data} onEdit={wizard.goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold">
          <span className="text-gold-primary">{mode === 'edit' ? 'Edit' : 'Create'}</span> Event
        </h1>
        <p className="text-text-secondary mt-2">
          {mode === 'edit' ? 'Update your event details' : 'Set up your networking event in minutes'}
        </p>
      </div>

      <WizardStepper
        currentStep={wizard.currentStep}
        completedSteps={wizard.completedSteps}
        onStepClick={wizard.goToStep}
      />

      <Card className="bg-bg-secondary border-border">
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      <WizardNavigation
        currentStep={wizard.currentStep}
        totalSteps={wizard.totalSteps}
        canProceed={wizard.canProceed}
        isSubmitting={isSubmitting}
        isEditMode={mode === 'edit'}
        onBack={wizard.prevStep}
        onNext={wizard.nextStep}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders correct step component based on currentStep
- [ ] Passes data and onChange to each step
- [ ] Submit creates/updates event via API
- [ ] Shows appropriate title for create vs edit
- [ ] Navigation integrates with wizard state

---

### Task 2.5: Create step components (Steps 1-4)
**Description:** Build BasicsStep, VenueStep, OrganizersStep (placeholder), RSVPStep
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.4
**Can run parallel with:** Task 2.6

**Implementation:**

Create `src/components/events/wizard/steps/BasicsStep.tsx`:

```typescript
'use client';

import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventWizardData } from '../hooks/useWizardState';

interface BasicsStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

const EVENT_TYPES = [
  { value: 'networking', label: 'Networking' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const GOAL_OPTIONS = ['Fundraising', 'Hiring', 'Partnerships', 'Learning', 'Community'];

export function BasicsStep({ data, onChange }: BasicsStepProps) {
  const toggleGoal = (goal: string) => {
    const newGoals = data.eventGoals.includes(goal)
      ? data.eventGoals.filter(g => g !== goal)
      : [...data.eventGoals, goal];
    onChange({ eventGoals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Event Basics</h2>
        <p className="text-text-secondary">Let's start with the essential details</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Event Name <span className="text-gold-primary">*</span></Label>
        <Input
          id="name"
          placeholder="e.g., Austin Founder Mixer"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="bg-bg-tertiary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">
            <Calendar className="inline w-4 h-4 mr-1" />
            Date <span className="text-gold-primary">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="bg-bg-tertiary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">
            <Clock className="inline w-4 h-4 mr-1" />
            Start <span className="text-gold-primary">*</span>
          </Label>
          <Input
            id="startTime"
            type="time"
            value={data.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="bg-bg-tertiary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End <span className="text-gold-primary">*</span></Label>
          <Input
            id="endTime"
            type="time"
            value={data.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className="bg-bg-tertiary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Event Type</Label>
          <Select value={data.eventType} onValueChange={(v) => onChange({ eventType: v })}>
            <SelectTrigger className="bg-bg-tertiary">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={data.timezone} onValueChange={(v) => onChange({ timezone: v })}>
            <SelectTrigger className="bg-bg-tertiary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Tell attendees what to expect..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="bg-bg-tertiary min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Event Goals</Label>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                data.eventGoals.includes(goal)
                  ? 'bg-gold-primary text-bg-primary'
                  : 'bg-bg-tertiary text-text-secondary border border-border'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Create similar components for VenueStep, RSVPStep (using existing form patterns).

Create placeholder `OrganizersStep.tsx`:
```typescript
export function OrganizersStep({ data, onChange }: OrganizersStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Co-Organizers</h2>
        <p className="text-text-secondary">Invite others to help manage this event</p>
      </div>
      <div className="text-center py-8 text-text-secondary">
        <p>Co-organizer management coming soon.</p>
        <p className="text-sm mt-2">You can skip this step for now.</p>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] BasicsStep captures all required fields
- [ ] VenueStep captures venue details
- [ ] OrganizersStep shows placeholder
- [ ] RSVPStep captures capacity and settings
- [ ] All fields update wizard state correctly

---

### Task 2.6: Create step components (Steps 5-7)
**Description:** Build CardsStep (placeholder), QuestionnaireStep, ReviewStep
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.4
**Can run parallel with:** Task 2.5

**Implementation:**

Create placeholder `CardsStep.tsx`:
```typescript
export function CardsStep({ data, onChange }: CardsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Trading Card Display</h2>
        <p className="text-text-secondary">Choose what attendees see on each other's cards</p>
      </div>
      <div className="text-center py-8 text-text-secondary">
        <p>Card field configuration coming soon.</p>
        <p className="text-sm mt-2">Default settings will be used.</p>
      </div>
    </div>
  );
}
```

Create `QuestionnaireStep.tsx` with simplified implementation:
```typescript
import { REQUIRED_QUESTIONS, STARTER_QUESTIONS } from '@/lib/m33t/questions';

export function QuestionnaireStep({ data, onChange }: QuestionnaireStepProps) {
  const [initialized, setInitialized] = useState(data.questions.length > 0);

  const startWithEssentials = () => {
    onChange({ questions: [...STARTER_QUESTIONS] });
    setInitialized(true);
  };

  const startFromScratch = () => {
    onChange({ questions: [...REQUIRED_QUESTIONS] });
    setInitialized(true);
  };

  if (!initialized) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Attendee Questionnaire</h2>
          <p className="text-text-secondary">Configure what you ask guests when they RSVP</p>
        </div>

        <div className="space-y-4">
          <button onClick={startWithEssentials} className="w-full p-5 rounded-xl text-left bg-bg-tertiary border border-border hover:border-gold-primary transition-all">
            <h3 className="text-white font-semibold text-lg">Start with Essentials</h3>
            <p className="text-sm mt-1 text-text-secondary">4 pre-configured questions. Edit and add more as needed.</p>
          </button>

          <button onClick={startFromScratch} className="w-full p-5 rounded-xl text-left bg-bg-tertiary border border-border hover:border-gold-primary transition-all">
            <h3 className="text-white font-semibold text-lg">Build from Scratch</h3>
            <p className="text-sm mt-1 text-text-secondary">Start with just the 2 required questions.</p>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-gold-subtle border border-gold-primary/30">
          <p className="text-sm text-text-secondary">
            <strong className="text-white">Two questions are always required:</strong> "What are your goals?" and "Who are your ideal connections?"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Attendee Questionnaire</h2>
          <p className="text-text-secondary">{data.questions.length} questions configured</p>
        </div>
        <button onClick={() => setInitialized(false)} className="text-sm text-text-secondary hover:text-text-primary">
          Start over
        </button>
      </div>

      <div className="space-y-3">
        {data.questions.map((q, idx) => (
          <div key={q.id} className="p-4 rounded-xl bg-bg-tertiary border border-border">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gold-subtle text-gold-primary">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-white text-sm">{q.title}</p>
                <p className="text-xs text-text-secondary">{q.type.replace('_', ' ')} • {q.category}</p>
              </div>
              {q.locked && <span className="text-xs text-gold-primary">Required</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Create `ReviewStep.tsx`:
```typescript
export function ReviewStep({ data, onEdit }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Review & Create</h2>
        <p className="text-text-secondary">Confirm your event details</p>
      </div>

      <div className="space-y-4">
        {/* Event Details Section */}
        <div className="p-4 rounded-xl bg-bg-tertiary border border-border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gold-primary">Event Details</h3>
            <button onClick={() => onEdit(0)} className="text-xs text-gold-primary hover:underline">Edit</button>
          </div>
          <p className="text-white font-medium text-lg">{data.name || 'Untitled Event'}</p>
          <p className="text-sm text-text-secondary mt-1">{data.date} • {data.startTime} - {data.endTime}</p>
        </div>

        {/* Venue Section */}
        <div className="p-4 rounded-xl bg-bg-tertiary border border-border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gold-primary">Venue</h3>
            <button onClick={() => onEdit(1)} className="text-xs text-gold-primary hover:underline">Edit</button>
          </div>
          <p className="text-white">{data.venueName}</p>
          <p className="text-sm text-text-secondary">{data.venueAddress}</p>
        </div>

        {/* Questionnaire Section */}
        <div className="p-4 rounded-xl bg-bg-tertiary border border-border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gold-primary">Questionnaire</h3>
            <button onClick={() => onEdit(5)} className="text-xs text-gold-primary hover:underline">Edit</button>
          </div>
          <p className="text-white">{data.questions.length} questions configured</p>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] CardsStep shows placeholder message
- [ ] QuestionnaireStep offers Essentials vs Scratch choice
- [ ] QuestionnaireStep shows question list after choice
- [ ] ReviewStep summarizes all data with edit links
- [ ] Edit links navigate to correct steps

---

### Task 2.7: Wire up wizard pages
**Description:** Update /events/new and /events/[eventId]/edit to use wizard
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.4
**Can run parallel with:** None

**Implementation:**

Update `src/app/(dashboard)/events/new/page.tsx`:
```typescript
import { EventWizard } from '@/components/events/wizard/EventWizard';

export default function NewEventPage() {
  return <EventWizard mode="create" />;
}
```

Update `src/app/(dashboard)/events/[eventId]/edit/page.tsx`:
```typescript
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { EventWizard } from '@/components/events/wizard/EventWizard';

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

  return <EventWizard event={event} mode="edit" />;
}
```

**Acceptance Criteria:**
- [ ] /events/new shows wizard in create mode
- [ ] /events/[id]/edit shows wizard in edit mode with data
- [ ] Edit mode pre-fills all existing data
- [ ] Both modes submit correctly

---

## Phase 3: Co-Organizers (Can run parallel with Phase 4)

### Task 3.1: Create Organizers API endpoints
**Description:** Build API routes for managing co-organizers
**Size:** Medium
**Priority:** Medium
**Dependencies:** Phase 2 complete
**Can run parallel with:** Phase 4 tasks

**Implementation:**

Create `src/app/api/events/[eventId]/organizers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = { params: Promise<{ eventId: string }> };

const AddOrganizerSchema = z.object({
  userId: z.string(),
  canInvite: z.boolean().default(true),
  canCurate: z.boolean().default(true),
  canEdit: z.boolean().default(false),
  canManage: z.boolean().default(false),
});

// GET /api/events/[eventId]/organizers
export async function GET(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkM33tAccess(user.id))) {
    return m33tAccessDeniedResponse();
  }

  // Check user is owner or organizer
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: {
      organizers: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const isOwner = event.userId === user.id;
  const isOrganizer = event.organizers.some(o => o.userId === user.id);

  if (!isOwner && !isOrganizer) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json(event.organizers);
}

// POST /api/events/[eventId]/organizers
export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkM33tAccess(user.id))) {
    return m33tAccessDeniedResponse();
  }

  // Only owner can add organizers
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
  }

  const body = await request.json();
  const data = AddOrganizerSchema.parse(body);

  // Check target user has M33T access
  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, hasM33tAccess: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!targetUser.hasM33tAccess) {
    return NextResponse.json({
      error: 'This user does not have M33T access. Contact support to enable it.'
    }, { status: 400 });
  }

  // Create organizer
  const organizer = await prisma.eventOrganizer.create({
    data: {
      eventId,
      userId: data.userId,
      canInvite: data.canInvite,
      canCurate: data.canCurate,
      canEdit: data.canEdit,
      canManage: data.canManage,
    },
  });

  return NextResponse.json(organizer, { status: 201 });
}
```

**Acceptance Criteria:**
- [ ] GET returns organizers for event
- [ ] POST adds new organizer with permissions
- [ ] Only event owner can add organizers
- [ ] Target user must have M33T access
- [ ] Proper error responses for all cases

---

### Task 3.2: Build OrganizersStep component
**Description:** Full co-organizer management UI for Step 3
**Size:** Large
**Priority:** Medium
**Dependencies:** Task 3.1
**Can run parallel with:** None

**Implementation:**

Replace placeholder in `OrganizersStep.tsx` with full implementation:
- Contact search with debounce
- Add organizer from search results
- Permission toggles per organizer
- Remove organizer button
- Owner always shown with all permissions

**Acceptance Criteria:**
- [ ] Search filters user's contacts
- [ ] Adding contact creates organizer entry
- [ ] Permission checkboxes update state
- [ ] Owner always shown, cannot be removed
- [ ] Only M33T-enabled contacts can be added

---

## Phase 4: Trading Cards & Questions (Can run parallel with Phase 3)

### Task 4.1: Create question types and defaults
**Description:** Build question type definitions and starter questions
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 2 complete
**Can run parallel with:** Phase 3 tasks

**Implementation:**

Create `src/lib/m33t/questions.ts`:

```typescript
export type QuestionType = 'open_text' | 'slider' | 'single_select' | 'multi_select';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  category: 'GOALS' | 'CONNECTIONS' | 'IDENTITY' | 'BACKGROUND' | 'PREFERENCES';
  title: string;
  subtitle?: string;
  required: boolean;
  locked: boolean;
  order: number;
  // Type-specific
  options?: QuestionOption[];
  maxSelections?: number;
  leftLabel?: string;
  rightLabel?: string;
  placeholder?: string;
}

export const QUESTION_TYPES = [
  { id: 'open_text', label: 'Open Text', icon: 'FileText', description: 'Free-form text response' },
  { id: 'slider', label: 'Slider', icon: 'SlidersHorizontal', description: 'Spectrum between two poles' },
  { id: 'single_select', label: 'Single Select', icon: 'Circle', description: 'Choose one option' },
  { id: 'multi_select', label: 'Multi Select', icon: 'CheckSquare', description: 'Choose multiple options' },
] as const;

export const QUESTION_CATEGORIES = [
  { id: 'GOALS', label: 'Goals', description: 'What they want to achieve', required: true },
  { id: 'CONNECTIONS', label: 'Connections', description: 'Who they want to meet', required: true },
  { id: 'IDENTITY', label: 'Identity', description: 'Who they are', required: false },
  { id: 'BACKGROUND', label: 'Background', description: 'Professional context', required: false },
  { id: 'PREFERENCES', label: 'Preferences', description: 'How they like to interact', required: false },
] as const;

export const REQUIRED_QUESTIONS: Question[] = [
  {
    id: 'goals',
    type: 'open_text',
    category: 'GOALS',
    title: "What are your biggest current goals?",
    subtitle: "What are you actively working toward right now?",
    placeholder: "e.g., Raising a seed round, hiring a technical co-founder...",
    required: true,
    locked: true,
    order: 0,
  },
  {
    id: 'ideal_connections',
    type: 'open_text',
    category: 'CONNECTIONS',
    title: "Who would be your ideal connections at this event?",
    subtitle: "Describe the type of people you'd most like to meet.",
    placeholder: "e.g., Early-stage VCs, operators who've scaled to 100 employees...",
    required: true,
    locked: true,
    order: 1,
  },
];

export const STARTER_QUESTIONS: Question[] = [
  ...REQUIRED_QUESTIONS,
  {
    id: 'experience_level',
    type: 'single_select',
    category: 'BACKGROUND',
    title: "Which best describes your professional stage?",
    options: [
      { value: 'early', label: 'Early Career', description: '0-5 years' },
      { value: 'mid', label: 'Mid-Career', description: '5-15 years' },
      { value: 'senior', label: 'Senior / Executive', description: '15+ years' },
      { value: 'founder', label: 'Founder', description: 'Building your own company' },
    ],
    required: false,
    locked: false,
    order: 2,
  },
  {
    id: 'topics',
    type: 'multi_select',
    category: 'PREFERENCES',
    title: "What topics are you most excited to discuss?",
    maxSelections: 3,
    options: [
      { value: 'ai_ml', label: 'AI & Machine Learning' },
      { value: 'fundraising', label: 'Fundraising & Investment' },
      { value: 'product', label: 'Product Development' },
      { value: 'growth', label: 'Growth & Marketing' },
      { value: 'hiring', label: 'Hiring & Team Building' },
      { value: 'operations', label: 'Operations & Scale' },
    ],
    required: false,
    locked: false,
    order: 3,
  },
];
```

**Acceptance Criteria:**
- [ ] Question type exported
- [ ] All 4 question types defined
- [ ] 5 categories defined
- [ ] REQUIRED_QUESTIONS has 2 locked questions
- [ ] STARTER_QUESTIONS has 4 total questions

---

### Task 4.2: Build CardsStep component
**Description:** Full card field selection UI for Step 5
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.3

**Implementation:**

Update `CardsStep.tsx` with full implementation:
- Field groups (Professional, Event-Specific, Personal, Context)
- Checkboxes for each field
- Live preview component showing sample card

**Acceptance Criteria:**
- [ ] Field groups display correctly
- [ ] Checkboxes toggle field visibility
- [ ] Preview updates in real-time
- [ ] Defaults applied correctly

---

### Task 4.3: Build QuestionnaireStep with full functionality
**Description:** Complete questionnaire builder for Step 6
**Size:** Large
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 4.2

**Implementation:**

Enhance `QuestionnaireStep.tsx`:
- Add Question modal with type selection
- Question card with expand/collapse
- Up/down reordering buttons
- Delete button (for non-locked questions)
- Question edit modal

**Acceptance Criteria:**
- [ ] Can add new questions via modal
- [ ] Questions display in cards
- [ ] Locked questions cannot be deleted
- [ ] Reordering works with up/down buttons
- [ ] Question order persists

---

## Phase 5: Polish

### Task 5.1: Add step validation and error messaging
**Description:** Improve validation feedback across all steps
**Size:** Medium
**Priority:** Low
**Dependencies:** Phases 2-4 complete
**Can run parallel with:** Task 5.2

**Implementation:**
- Add field-level error states
- Show validation messages on Continue attempt
- Highlight incomplete required fields

**Acceptance Criteria:**
- [ ] Required fields show error when empty
- [ ] Error messages are helpful
- [ ] Validation runs on Continue click

---

### Task 5.2: Add loading states and transitions
**Description:** Improve UX with loading indicators and animations
**Size:** Small
**Priority:** Low
**Dependencies:** Phases 2-4 complete
**Can run parallel with:** Task 5.1

**Implementation:**
- Add framer-motion transitions between steps
- Loading skeleton for edit page data fetch
- Button loading states

**Acceptance Criteria:**
- [ ] Smooth transitions between steps
- [ ] Loading states during async operations
- [ ] No layout shifts

---

### Task 5.3: Write E2E tests
**Description:** Create Playwright tests for wizard flow
**Size:** Medium
**Priority:** Low
**Dependencies:** Phases 2-4 complete
**Can run parallel with:** Tasks 5.1, 5.2

**Implementation:**

Create `.quick-checks/test-event-wizard.spec.ts`:
- Test complete create flow
- Test edit flow with existing event
- Test validation prevents invalid submission
- Test step navigation

**Acceptance Criteria:**
- [ ] Create flow test passes
- [ ] Edit flow test passes
- [ ] Validation test passes
- [ ] Navigation test passes

---

## Execution Summary

| Phase | Tasks | Can Parallelize |
|-------|-------|-----------------|
| Phase 1: Foundation | 1.1, 1.2, 1.3, 1.4 | 1.3 + 1.4 after 1.2 |
| Phase 2: Wizard Infrastructure | 2.1-2.7 | 2.1 + 2.2 + 2.3, then 2.5 + 2.6 |
| Phase 3: Co-Organizers | 3.1, 3.2 | Can run with Phase 4 |
| Phase 4: Cards & Questions | 4.1, 4.2, 4.3 | Can run with Phase 3 |
| Phase 5: Polish | 5.1, 5.2, 5.3 | All can parallelize |

**Critical Path:** Phase 1 → Phase 2 → (Phase 3 || Phase 4) → Phase 5

**Recommended Order:**
1. Complete Phase 1 first (unblocks edit page)
2. Complete Phase 2 (wizard infrastructure)
3. Run Phases 3 and 4 in parallel
4. Polish in Phase 5
