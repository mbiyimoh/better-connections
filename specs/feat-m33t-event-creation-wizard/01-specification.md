# M33T Event Creation Wizard - Feature Specification

**Status:** Draft
**Authors:** Claude Code
**Created:** 2026-01-13
**Related Spec:** `specs/feat-m33t-event-networking-platform.md`

---

## 1. Overview

Transform the M33T event creation experience from a basic single-page form into a multi-step wizard that enables organizers to:
- Add co-organizers from their contacts with granular permissions
- Configure the questionnaire attendees complete when they RSVP
- Customize which profile fields appear on attendee trading cards
- Review and edit existing events through a dedicated edit page

This feature brings the implementation in line with the original M33T design specification documented in `docs/m33t-implemenation-handoff-package/`.

---

## 2. Background / Problem Statement

### Current State

The M33T event creation flow (`/events/new`) is a single-page form with:
- Basic event info (name, date, time, venue)
- Match settings (capacity, matches per attendee, reveal timing)
- Direct submission creating event in DRAFT status

### What's Missing

1. **Edit Page** - `/events/[eventId]/edit` returns 404 (page doesn't exist)
2. **Multi-Step Wizard** - Design spec defines a 6-step flow, current implementation has 1 page
3. **Co-Organizers** - No way to add team members with permissions
4. **Questionnaire Builder** - No UI to configure what questions attendees answer
5. **Profile Card Configuration** - No UI to select which fields appear on trading cards

### Design References

- `docs/m33t-implemenation-handoff-package/M33T_Organizer_Experience_Design_Document.md` - Full design spec
- `docs/m33t-implemenation-handoff-package/EventCreationFlow.jsx` - 7-step wizard prototype (493 lines)
- `docs/m33t-implemenation-handoff-package/QuestionnaireBuilder.jsx` - Questionnaire builder prototype (848 lines)

---

## 3. Goals

- Implement the Edit Event page (`/events/[eventId]/edit`)
- Transform event creation into a 7-step wizard matching design spec
- Enable adding co-organizers from contacts with permission controls
- Build questionnaire configuration UI with 4 question types (open_text, slider, single_select, multi_select)
- Add profile card field selection with live preview
- Maintain backward compatibility with existing events

---

## 4. Non-Goals

- Real-time collaborative editing (co-organizers edit asynchronously)
- Co-organizer invitation/acceptance flow (out of scope for MVP)
- Guest list curation interface (separate feature - Prototype 2)
- Match curation dashboard (already implemented)
- Mobile-optimized wizard (desktop-first for MVP)
- Auto-save/draft resume (nice-to-have for future)

---

## 5. Technical Dependencies

### Existing Dependencies (Already in package.json)
- `react-hook-form` + `@hookform/resolvers` - Form state management
- `zod` - Schema validation
- `framer-motion` - Animations and transitions
- `lucide-react` - Icons
- `shadcn/ui` - UI components

### No New Dependencies Required
The existing stack supports all required functionality. Question reordering uses simple up/down buttons instead of drag-and-drop to avoid adding dependencies.

---

## 6. Detailed Design

### 6.1 Database Schema Changes

#### New Model: EventOrganizer

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

**Important: Co-organizers MUST have M33T access** (`hasM33tAccess: true` on User model) to be added. When adding a co-organizer:
1. Verify the user has `hasM33tAccess: true`
2. If not, show error: "This user does not have M33T access. Contact support to enable it."
3. Only users with M33T access can view/manage events

#### Update Event Model

```prisma
model Event {
  // ... existing fields ...

  // Add relation to organizers
  organizers    EventOrganizer[]

  // Add fields for new features
  eventType     String?          // networking, conference, workshop, social, other
  eventGoals    String[]         // fundraising, hiring, partnerships, learning, community
  parkingNotes  String?
  dressCode     String?          // casual, business-casual, formal, creative

  // Profile card settings (already exists as cardSettings Json)
  // Questions (already exists as questions Json)
}
```

### 6.2 Wizard Step Architecture

```
Step 1: Basics          → Event name, date, time, type, description, goals
Step 2: Venue           → Venue name, address, parking, dress code
Step 3: Co-Organizers   → Search contacts, add with permissions
Step 4: RSVP Settings   → Deadline, capacity, waitlist settings
Step 5: Trading Cards   → Select profile fields, live preview
Step 6: Questionnaire   → Configure intake questions
Step 7: Review          → Summary of all settings, create/update
```

### 6.3 File Structure

```
src/
├── app/(dashboard)/events/
│   ├── new/
│   │   └── page.tsx                    # Redirect to wizard or wizard entry
│   ├── [eventId]/
│   │   ├── page.tsx                    # Event detail (existing)
│   │   └── edit/
│   │       └── page.tsx                # Edit wizard (NEW)
│   └── create/
│       └── page.tsx                    # Multi-step wizard (NEW)
│
├── components/events/
│   ├── wizard/
│   │   ├── EventWizard.tsx             # Main wizard container
│   │   ├── WizardStepper.tsx           # Step indicator component
│   │   ├── WizardNavigation.tsx        # Back/Next/Submit buttons
│   │   ├── steps/
│   │   │   ├── BasicsStep.tsx          # Step 1: Event basics
│   │   │   ├── VenueStep.tsx           # Step 2: Venue & logistics
│   │   │   ├── OrganizersStep.tsx      # Step 3: Co-organizers
│   │   │   ├── RSVPStep.tsx            # Step 4: RSVP settings
│   │   │   ├── CardsStep.tsx           # Step 5: Trading card config
│   │   │   ├── QuestionnaireStep.tsx   # Step 6: Questionnaire config
│   │   │   └── ReviewStep.tsx          # Step 7: Review & submit
│   │   └── hooks/
│   │       └── useWizardState.ts       # Wizard state management
│   │
│   ├── questionnaire/
│   │   ├── QuestionnaireBuilder.tsx    # Full builder component
│   │   ├── QuestionCard.tsx            # Individual question display
│   │   ├── QuestionTypeSelector.tsx    # Type selection modal
│   │   ├── QuestionEditor.tsx          # Edit question modal
│   │   └── types.ts                    # Question type definitions
│   │
│   ├── organizers/
│   │   ├── OrganizerSearch.tsx         # Contact search for adding organizers
│   │   ├── OrganizerCard.tsx           # Organizer with permissions
│   │   └── PermissionCheckbox.tsx      # Individual permission toggle
│   │
│   └── cards/
│       ├── CardFieldSelector.tsx       # Field selection checkboxes
│       └── TradingCardPreview.tsx      # Live preview component
│
├── lib/m33t/
│   ├── schemas.ts                      # Add wizard schemas
│   └── questions.ts                    # Question types and defaults (NEW)
│
└── app/api/events/
    ├── [eventId]/
    │   ├── organizers/
    │   │   └── route.ts                # GET/POST organizers (NEW)
    │   └── organizers/[organizerId]/
    │       └── route.ts                # PUT/DELETE organizer (NEW)
    └── route.ts                        # Update for wizard data
```

### 6.4 Question Types and Schema

```typescript
// src/lib/m33t/questions.ts

// MVP: 4 question types (mad_lib and ranking cut for simplicity)
export const QUESTION_TYPES = [
  { id: 'open_text', label: 'Open Text', icon: 'FileText', description: 'Free-form text response' },
  { id: 'slider', label: 'Slider', icon: 'SlidersHorizontal', description: 'Spectrum between two poles' },
  { id: 'single_select', label: 'Single Select', icon: 'Circle', description: 'Choose one option' },
  { id: 'multi_select', label: 'Multi Select', icon: 'CheckSquare', description: 'Choose multiple options' },
] as const;

export const QUESTION_CATEGORIES = [
  { id: 'GOALS', label: 'Goals', description: 'What they want to achieve', required: true },
  { id: 'CONNECTIONS', label: 'Connections', description: 'Who they want to meet', required: true },
  { id: 'IDENTITY', label: 'Identity', description: 'Who they are' },
  { id: 'BACKGROUND', label: 'Background', description: 'Professional context' },
  { id: 'PREFERENCES', label: 'Preferences', description: 'How they like to interact' },
] as const;

// Two questions are ALWAYS required and cannot be removed
export const REQUIRED_QUESTIONS: Question[] = [
  {
    id: 'goals',
    type: 'open_text',
    category: 'GOALS',
    title: "What are your biggest current goals?",
    subtitle: "What are you actively working toward right now?",
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

### 6.5 Profile Card Field Configuration

```typescript
// Trading card field groups
export const CARD_FIELD_GROUPS = {
  professional: {
    label: 'Professional',
    fields: [
      { id: 'role', label: 'Current Role & Company', default: true },
      { id: 'industry', label: 'Industry', default: true },
      { id: 'expertise', label: 'Expertise Areas', default: true },
      { id: 'yearsExperience', label: 'Years of Experience', default: false },
    ],
  },
  eventSpecific: {
    label: 'Event-Specific',
    fields: [
      { id: 'lookingFor', label: 'Looking For (from interview)', default: true },
      { id: 'canHelp', label: 'Can Help With (from interview)', default: true },
      { id: 'eventGoals', label: 'Event Goals (from interview)', default: false },
    ],
  },
  personal: {
    label: 'Personal',
    fields: [
      { id: 'interests', label: 'Personal Interests', default: false },
      { id: 'funFacts', label: 'Fun Facts', default: false },
      { id: 'socialLinks', label: 'Social Links', default: false },
    ],
  },
  context: {
    label: 'Context',
    fields: [
      { id: 'whyNow', label: '"Why Now" contextual relevance', default: true },
      { id: 'mutualConnections', label: 'Mutual connections', default: true },
      { id: 'conversationStarters', label: 'Conversation starters', default: true },
    ],
  },
};
```

### 6.6 API Endpoints

#### Existing (to update)
- `POST /api/events` - Accept full wizard data including questions, cardSettings
- `PUT /api/events/[eventId]` - Accept full wizard data for updates

#### New Endpoints
```
GET    /api/events/[eventId]/organizers         # List co-organizers
POST   /api/events/[eventId]/organizers         # Add co-organizer
PUT    /api/events/[eventId]/organizers/[id]    # Update permissions
DELETE /api/events/[eventId]/organizers/[id]    # Remove co-organizer
```

### 6.7 Wizard State Management

```typescript
// src/components/events/wizard/hooks/useWizardState.ts

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  eventData: Partial<EventWizardData>;
  isDirty: boolean;
  errors: Record<string, string>;
}

interface EventWizardData {
  // Step 1: Basics
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: string;
  description?: string;
  eventGoals: string[];

  // Step 2: Venue
  venueName: string;
  venueAddress: string;
  parkingNotes?: string;
  dressCode?: string;

  // Step 3: Organizers
  organizers: {
    userId: string;
    contactId: string;
    name: string;
    role?: string;
    company?: string;
    permissions: {
      canInvite: boolean;
      canCurate: boolean;
      canEdit: boolean;
      canManage: boolean;
    };
  }[];

  // Step 4: RSVP
  rsvpDeadline?: string;
  capacity: number;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  enableWaitlist: boolean;
  requireApproval: boolean;

  // Step 5: Cards
  cardSettings: Record<string, boolean>;

  // Step 6: Questions
  questions: Question[];

  // Step 7: Review (no additional data, just confirmation)
}
```

---

## 7. User Experience

### 7.1 Create Event Flow

1. User clicks "Create Event" from Events list
2. Lands on Step 1 (Basics) with empty form
3. Fills out required fields, clicks "Continue"
4. Stepper shows progress, completed steps show checkmark
5. Can click back on stepper to edit previous steps
6. Step 6 (Questionnaire) offers "Start with Essentials" or "Build from Scratch"
7. Step 7 shows full summary with edit links
8. Click "Create Event" → POST to API → Redirect to event detail

### 7.2 Edit Event Flow

1. User clicks "Edit" from Event detail page
2. Loads wizard with existing data pre-filled
3. Steps already marked complete based on data
4. Can jump directly to any step via stepper
5. Changes tracked (isDirty state)
6. Click "Save Changes" → PUT to API → Return to event detail

### 7.3 Co-Organizer Addition

1. Step 3 shows split panel: search left, selected right
2. Search filters user's contacts in real-time
3. Click contact → Added to right panel with default permissions
4. Each organizer card shows permission checkboxes
5. Owner (event creator) always shown with "All permissions"

### 7.4 Questionnaire Configuration

1. Step 6 shows setup choice: Essentials vs Scratch
2. Selecting either initializes question list
3. 2 locked questions always at top (Goals, Ideal Connections)
4. Up/down arrow buttons for reordering non-locked questions (no drag-and-drop)
5. Click "Add Question" → Modal with type selection (4 types: open_text, slider, single_select, multi_select)
6. Expand question card → See preview and actions
7. "Edit in Builder" opens full-screen builder (stretch goal)

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// Wizard state hook
describe('useWizardState', () => {
  it('should initialize with step 0', () => {
    // Verify initial state
  });

  it('should prevent advancing when required fields missing', () => {
    // Verify validation blocks progression
  });

  it('should mark steps complete when valid data provided', () => {
    // Verify completedSteps updates
  });

  it('should preserve data when navigating between steps', () => {
    // Verify data persistence
  });
});

// Question management
describe('QuestionnaireBuilder', () => {
  it('should always include locked questions', () => {
    // Verify required questions cannot be removed
  });

  it('should enforce category requirements', () => {
    // Verify GOALS and CONNECTIONS categories always have questions
  });

  it('should update order when reordering questions', () => {
    // Verify drag-and-drop updates order field
  });
});
```

### 8.2 Integration Tests

```typescript
// API routes
describe('Event Organizers API', () => {
  it('should only allow event owner to add organizers', () => {
    // POST with non-owner should return 403
  });

  it('should prevent adding non-existent contacts', () => {
    // POST with invalid contactId should return 404
  });

  it('should enforce unique organizers per event', () => {
    // POST duplicate should return 409
  });
});
```

### 8.3 E2E Tests

```typescript
// .quick-checks/test-event-wizard.spec.ts
describe('Event Creation Wizard', () => {
  it('should complete full wizard flow and create event', async () => {
    // 1. Navigate to /events/new
    // 2. Fill each step
    // 3. Submit
    // 4. Verify redirect to event detail
    // 5. Verify all data saved correctly
  });

  it('should load existing event data in edit mode', async () => {
    // 1. Create event via API
    // 2. Navigate to /events/[id]/edit
    // 3. Verify data pre-populated
    // 4. Make changes
    // 5. Submit and verify updates
  });

  it('should add co-organizer from contacts', async () => {
    // 1. Navigate to wizard step 3
    // 2. Search for contact
    // 3. Add as organizer
    // 4. Set permissions
    // 5. Complete wizard
    // 6. Verify organizer saved
  });
});
```

---

## 9. Performance Considerations

- **Contact Search**: Debounce search input (300ms) to avoid excessive API calls
- **Form State**: Use react-hook-form's built-in optimization (uncontrolled inputs)
- **Step Rendering**: Only render active step content, not all 7 simultaneously
- **Question Reordering**: Use optimistic updates for drag-and-drop
- **Trading Card Preview**: Throttle preview updates during rapid field toggles

---

## 10. Security Considerations

- **Authorization**: Every API route must verify M33T access AND event ownership
- **Co-Organizer Permissions**: Check permissions before allowing actions
- **Input Validation**: Zod schemas on both client and server
- **CSRF**: Next.js App Router handles this via SameSite cookies
- **Data Isolation**: Contacts search limited to user's own contacts

---

## 11. Documentation

### Updates Required
- `CLAUDE.md`: Add Event Creation Wizard pattern documentation
- Create `developer-guides/event-wizard-guide.md` for implementation details

### User-Facing Documentation
- Not required for MVP (admin-only feature)

---

## 12. Implementation Phases

### Phase 1: Foundation (Critical Path)
1. Add EventOrganizer model to Prisma schema
2. Run migration
3. Create `/events/[eventId]/edit` page (basic form, not wizard)
4. Verify edit flow works end-to-end

### Phase 2: Wizard Infrastructure
1. Create EventWizard container component
2. Build WizardStepper and WizardNavigation
3. Implement useWizardState hook
4. Create step components (shells with existing form fields)
5. Wire up create flow with wizard

### Phase 3: Co-Organizers
1. Build OrganizerSearch component
2. Build OrganizerCard with permissions
3. Create organizers API endpoints
4. Integrate into Step 3

### Phase 4: Trading Cards & Questions
1. Build CardFieldSelector with live preview
2. Build QuestionnaireBuilder (simplified version)
3. Implement question types and schemas
4. Integrate into Steps 5 and 6

### Phase 5: Polish
1. Add step validation rules
2. Improve error messaging
3. Add loading states and transitions
4. Write E2E tests

---

## 13. Open Questions

1. **Co-Organizer Notifications**: Should we email co-organizers when added? (Deferred to future)
2. **Question Templates**: Should we offer industry-specific question sets? (Nice-to-have)
3. **Draft Auto-Save**: Should wizard auto-save drafts to localStorage? (Nice-to-have)
4. **Mobile Support**: What's the minimum viable mobile experience? (Desktop-first for now)

## 13.1 Resolved Decisions

1. **Co-organizers require M33T access**: Yes, users must have `hasM33tAccess: true` to be added as co-organizers
2. **Question types for MVP**: 4 types only (open_text, slider, single_select, multi_select) - mad_lib and ranking cut
3. **Question reordering**: Up/down buttons instead of drag-and-drop (no new dependencies)

---

## 14. References

- Design Spec: `docs/m33t-implemenation-handoff-package/M33T_Organizer_Experience_Design_Document.md`
- Event Wizard Prototype: `docs/m33t-implemenation-handoff-package/EventCreationFlow.jsx`
- Questionnaire Builder Prototype: `docs/m33t-implemenation-handoff-package/QuestionnaireBuilder.jsx`
- Existing M33T Spec: `specs/feat-m33t-event-networking-platform.md`
- Current Event Form: `src/app/(dashboard)/events/new/page.tsx`
- M33T Schemas: `src/lib/m33t/schemas.ts`
