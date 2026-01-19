# M33T Event Management Guide

**Last Updated:** 2026-01-18
**Component:** Event Wizard, Attendee Management, Match Generation

---

## 1. Architecture Overview

Event management in M33T follows a wizard-driven creation flow with an 8-step process, followed by attendee management and AI-powered match generation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVENT MANAGEMENT ARCHITECTURE                          │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Wizard    │───>│   Event     │───>│  Attendee   │───>│   Match     │  │
│  │  Creation   │    │   Detail    │    │ Management  │    │ Generation  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  8-step form        Admin dashboard   RSVP tracking     AI scoring +       │
│  with validation    & quick actions   & questionnaires  explanations       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Dependencies

| Library | Purpose |
|---------|---------|
| `framer-motion` | Step transitions in wizard |
| `sonner` | Toast notifications |
| `zod` | Form validation |
| `react-hook-form` | Form state management (in individual steps) |

---

## 3. Event Wizard Structure

### 8-Step Flow

| Step | Name | Required Fields |
|------|------|-----------------|
| 0 | Basics | name, date, startTime, endTime, timezone |
| 1 | Venue | venueName, venueAddress |
| 2 | Organizers | (optional) co-organizers |
| 3 | RSVP | capacity, rsvpDeadline, matchesPerAttendee |
| 4 | Cards | Trading card display settings |
| 5 | Questionnaire | Questions for attendee profiles |
| 6 | Landing Page | Public page customization |
| 7 | Review | Summary before submission |

### Key Files

```
src/components/events/wizard/
├── EventWizard.tsx           # Main wizard container
├── WizardStepper.tsx         # Step indicator UI
├── WizardNavigation.tsx      # Back/Next/Submit buttons
├── hooks/
│   └── useWizardState.ts     # Wizard state management
└── steps/
    ├── BasicsStep.tsx        # Event name, date, time
    ├── VenueStep.tsx         # Location with Google Places
    ├── OrganizersStep.tsx    # Co-organizer permissions
    ├── RSVPStep.tsx          # Capacity, deadline, matches
    ├── CardsStep.tsx         # Trading card toggles
    ├── QuestionnaireStep.tsx # Custom questions editor
    ├── LandingPageStep.tsx   # Landing page sections
    └── ReviewStep.tsx        # Summary with edit links
```

---

## 4. Wizard State Management

### useWizardState Hook

```typescript
// src/components/events/wizard/hooks/useWizardState.ts

interface WizardState {
  currentStep: number;          // 0-7
  completedSteps: Set<number>;  // Steps with valid data
  data: EventWizardData;        // All form data
  isDirty: boolean;             // Has unsaved changes
}

export function useWizardState(initialEvent?: Event) {
  // Returns:
  return {
    currentStep,
    completedSteps,
    data,
    isDirty,
    totalSteps: 8,
    goToStep,     // Jump to specific step
    nextStep,     // Advance and mark current complete
    prevStep,     // Go back
    updateData,   // Update form data
    isStepComplete,
    canProceed,   // Validation passed for current step
  };
}
```

### EventWizardData Type

```typescript
// src/lib/events/types.ts

interface EventWizardData {
  // Step 0: Basics
  name: string;
  date: string;             // "2026-03-15"
  startTime: string;        // "18:00"
  endTime: string;          // "21:00"
  timezone: string;         // "America/Chicago"
  eventType: string;        // networking, conference, etc.
  description: string;
  eventGoals: string[];     // fundraising, hiring, etc.

  // Step 1: Venue
  venueName: string;
  venueAddress: string;
  venueLatitude: number | null;
  venueLongitude: number | null;
  googlePlaceId: string | null;
  parkingNotes: string;
  dressCode: string;

  // Step 2: Organizers
  organizers: Array<{
    id?: string;
    odId: string;           // User ID
    contactId?: string;     // Optional Contact link
    name: string;
    email?: string;
    permissions: {
      canInvite: boolean;
      canCurate: boolean;
      canEdit: boolean;
      canManage: boolean;
    };
  }>;

  // Step 3: RSVP
  capacity: number;
  rsvpDeadline: string;
  matchesPerAttendee: number;  // 1-20
  revealTiming: string;        // IMMEDIATE, TWENTY_FOUR_HOURS_BEFORE, etc.

  // Step 4: Cards
  cardSettings: Record<string, boolean>;

  // Step 5: Questionnaire
  questions: Question[];

  // Step 6: Landing Page
  whatToExpect: WhatToExpectItem[];
  landingPageSettings: LandingPageSettings;
}
```

---

## 5. Step Validation

### Validation Functions

```typescript
// src/lib/events/validation.ts

export const eventValidators = {
  basics: (data: EventWizardData): string[] => {
    const errors: string[] = [];
    if (!data.name.trim()) errors.push('Event name required');
    if (!data.date) errors.push('Date required');
    if (!data.startTime) errors.push('Start time required');
    if (!data.endTime) errors.push('End time required');
    return errors;
  },

  venue: (data: EventWizardData): string[] => {
    const errors: string[] = [];
    if (!data.venueName.trim()) errors.push('Venue name required');
    if (!data.venueAddress.trim()) errors.push('Address required');
    return errors;
  },

  // ... etc for each step
};

export function canProceedFromStep(data: EventWizardData, step: number): boolean {
  const stepValidators = [
    eventValidators.basics,
    eventValidators.venue,
    () => [],  // Organizers optional
    eventValidators.rsvp,
    () => [],  // Cards optional
    () => [],  // Questions optional
    () => [],  // Landing page optional
    () => [],  // Review always valid
  ];

  const validator = stepValidators[step];
  return validator ? validator(data).length === 0 : true;
}
```

---

## 6. Data Transforms

### Wizard to API

```typescript
// src/lib/events/transforms.ts

export function eventWizardDataToApiPayload(data: EventWizardData) {
  return {
    name: data.name,
    description: data.description || undefined,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone,
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueLatitude: data.venueLatitude,
    venueLongitude: data.venueLongitude,
    googlePlaceId: data.googlePlaceId || undefined,
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
}
```

### Event to Wizard (for editing)

```typescript
// src/lib/events/transforms.ts

export function mapEventToWizardData(event: Event): EventWizardData {
  return {
    name: event.name,
    date: event.date.toISOString().split('T')[0] ?? '',
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    // ... map all fields
  };
}
```

---

## 7. Attendee Management

### Attendee States

| Status | Description |
|--------|-------------|
| `PENDING` | Invited but hasn't responded |
| `CONFIRMED` | RSVP'd yes |
| `MAYBE` | RSVP'd maybe |
| `DECLINED` | RSVP'd no |

### Profile Extraction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ATTENDEE PROFILE EXTRACTION                            │
│                                                                             │
│  Attendee completes          GPT-4o-mini             Stored in attendee     │
│  questionnaire          ───> extracts profile   ───> record for matching    │
│                                                                             │
│  questionnaireResponses      Profile schema          EventAttendee.profile  │
│  (JSON array)                - seekingKeywords       EventAttendee.seekingKeywords │
│                              - offeringKeywords      EventAttendee.expertise │
│                              - expertise             EventAttendee.topicsOfInterest │
│                              - seniority             (denormalized for queries) │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Extracted Fields (Indexed for Matching)

```typescript
// Denormalized to EventAttendee for efficient queries
{
  goalsText: string;           // Raw text for embeddings
  idealMatchText: string;      // Raw text for embeddings
  experienceLevel: string;     // early | mid | senior | executive | founder
  topicsOfInterest: string[];  // For rule-based matching
  expertise: string[];         // For rule-based matching
  seekingKeywords: string[];   // From goals
  offeringKeywords: string[];  // From what they can help with
}
```

---

## 8. Match Generation

### API Endpoint

```typescript
// POST /api/events/[eventId]/matches/generate

// Requirements:
// - User must own event OR be organizer with canCurate permission
// - At least 2 confirmed attendees with profileExtractedAt set
// - Event not cancelled

// Response:
{
  success: true,
  generated: 50,           // Number of match records created
  attendeesMatched: 10,    // Number of attendees with matches
  matchesPerAttendee: 5,   // Configured limit
  stats: {
    pending: 50,
    approved: 0,
    rejected: 0
  }
}
```

### Authorization for Match Operations

All match operations require `curate` permission:

```typescript
import { checkEventAccess, checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';

// Check M33T access first
if (!(await checkM33tAccess(user.id))) {
  return m33tAccessDeniedResponse();
}

// Then check event-level permission
const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

### Match Generation Flow

```typescript
// src/app/api/events/[eventId]/matches/generate/route.ts

// 1. Fetch confirmed attendees with profiles
const attendees = await prisma.eventAttendee.findMany({
  where: {
    eventId,
    rsvpStatus: 'CONFIRMED',
    profileExtractedAt: { not: null },
  },
  select: {
    id: true,
    seekingKeywords: true,
    offeringKeywords: true,
    expertise: true,
    experienceLevel: true,
    topicsOfInterest: true,
  },
});

// 2. Convert to matchable profiles
const matchableProfiles: MatchableProfile[] = attendees.map(a => ({
  id: a.id,
  seekingKeywords: a.seekingKeywords,
  offeringKeywords: a.offeringKeywords,
  expertise: a.expertise,
  experienceLevel: a.experienceLevel,
  topicsOfInterest: a.topicsOfInterest,
}));

// 3. Generate matches with scoring algorithm
const matchScores = generateEventMatches(matchableProfiles, event.matchesPerAttendee);

// 4. Delete old pending matches (keep approved/rejected)
await prisma.match.deleteMany({
  where: { eventId, status: 'PENDING' },
});

// 5. Create match records with explanations
const matchRecords = matchScores.map(score => {
  const whyMatch = generateWhyMatchReasons(score, attendee, matchedWith);
  const starters = generateConversationStarters(attendee, matchedWith);

  return {
    eventId,
    attendeeId: score.attendeeId,
    matchedWithId: score.matchedWithId,
    position: calculatePosition(score),
    score: score.score,
    whyMatch,
    conversationStarters: starters,
    status: 'PENDING',
    isManual: false,
  };
});

// 6. Batch insert
await prisma.match.createMany({ data: matchRecords });
```

### Match Scoring Algorithm

```
Final Score (0-100) =
  (Seeking ↔ Offering × 0.40) +   // Most important
  (Expertise Overlap × 0.25) +
  (Experience Compatibility × 0.20) +
  (Topic Interest Match × 0.15)
```

See `src/lib/m33t/matching.ts` for implementation details.

---

## 9. Match Curation

### Organizer Actions

| Action | Effect |
|--------|--------|
| **Approve** | Match confirmed, shown to attendee |
| **Reject** | Match hidden from attendee |
| **Add Manual** | Create custom match with notes |
| **Reorder** | Change match position |

### Match Status Flow

```
PENDING ──► APPROVED (shown to attendee)
        └──► REJECTED (hidden)
```

### Manual Match Creation

Organizers can manually create matches that bypass the algorithm:

```typescript
{
  isManual: true,
  curatorNotes: "Both interested in sustainability startups",
  status: 'APPROVED',  // Manual matches auto-approved
}
```

---

## 10. API Endpoints

### Events

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/events` | List user's events |
| POST | `/api/events` | Create event |
| GET | `/api/events/[eventId]` | Get event detail |
| PUT | `/api/events/[eventId]` | Update event |
| DELETE | `/api/events/[eventId]` | Delete event |

### Attendees

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/events/[eventId]/attendees/import` | Bulk import attendees |
| POST | `/api/events/[eventId]/notify` | Send RSVP notifications |

### Matches

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/events/[eventId]/matches` | List matches |
| POST | `/api/events/[eventId]/matches/generate` | Generate matches |
| PATCH | `/api/events/[eventId]/matches/[matchId]` | Update match status |

### Organizers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/events/[eventId]/organizers` | List organizers |
| POST | `/api/events/[eventId]/organizers` | Add organizer |
| DELETE | `/api/events/[eventId]/organizers/[userId]` | Remove organizer |

---

## 11. Critical Gotchas

### Step Navigation with Incomplete Data

The wizard allows jumping to completed steps but validates before proceeding:

```typescript
const canProceed = useMemo(() => {
  return canProceedFromStep(state.data, state.currentStep);
}, [state]);
```

### Date/Time Format

- **Wizard form:** Strings (`"2026-03-15"`, `"18:00"`)
- **API input:** Coerced to Date in Zod schema
- **Database:** DateTime (Prisma)

```typescript
// API schema coerces date strings
date: z.coerce.date(),
rsvpDeadline: z.coerce.date().optional(),
```

### Venue Coordinates

Google Places provides coordinates that must be preserved:

```typescript
// Don't forget to include in API payload
venueLatitude: data.venueLatitude,
venueLongitude: data.venueLongitude,
googlePlaceId: data.googlePlaceId || undefined,
```

### Match Regeneration

Regenerating matches deletes only PENDING matches:

```typescript
await prisma.match.deleteMany({
  where: { eventId, status: 'PENDING' },  // Preserves approved/rejected
});
```

### Minimum Attendees for Matching

Match generation requires at least 2 confirmed attendees with completed profiles:

```typescript
if (attendees.length < 2) {
  return { error: 'Need at least 2 confirmed attendees' };
}
```

### Multi-Organizer Collaboration

**Use `checkEventAccess()` for all permission checks:**

```typescript
import { checkEventAccess } from '@/lib/m33t';

// Always check both M33T access AND event permission
const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

**Permission levels for different operations:**
- `view`: See event details
- `curate`: Edit attendee profiles, generate/approve matches, send notifications
- `edit`: Modify event details (name, date, venue, etc.)
- `manage`: Add/remove organizers (owner-only for mutations)

**Organizer mutations are owner-only:**
Even with `canManage: true`, only the event owner can POST/PUT/DELETE organizers. This is intentional security.

### Attendee Audit Trail

Track who added and edited attendees:

```prisma
model EventAttendee {
  addedById           String?   // Who added this attendee
  overridesEditedById String?   // Who last edited profile overrides
  overridesEditedAt   DateTime? // When last edited
}
```

**Include in API responses:**
```typescript
include: {
  addedBy: { select: { id: true, name: true } },
  overridesEditedBy: { select: { id: true, name: true } }
}
```

---

## 12. Testing Event Management

### Create Event Flow

1. Navigate to `/events/new`
2. Fill each wizard step
3. Submit and verify redirect to `/events/[id]`
4. Check database for Event record

### Attendee Import

1. Add test attendees via `/events/[id]/attendees/add`
2. Send RSVP notifications
3. Complete RSVP as attendee (incognito)
4. Verify profile extraction

### Match Generation

1. Get 2+ confirmed attendees with profiles
2. Click "Generate Matches"
3. Verify match records created
4. Check match explanations quality

---

## 13. Related Guides

- [M33T Architecture Guide](./07-m33t-architecture-guide.md) - System boundaries
- [M33T Public Landing Pages Guide](./09-m33t-landing-pages-guide.md) - Public pages, RSVP flow
- [Architecture Overview](./00-architecture-overview-guide.md) - Full system architecture
