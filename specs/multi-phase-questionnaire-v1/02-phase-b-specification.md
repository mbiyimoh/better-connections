# Multi-Phase Questionnaire - Phase B Specification

## Overview

Phase B implements the attendee-facing experience for multi-phase questionnaires. This enables attendees to complete question sets in sequence, resume incomplete sets, and review AI-suggested profile updates based on their answers.

**Depends On:** Phase A (QuestionSet data model and organizer management UI)

---

## Design Decisions (From Clarifications)

1. **Resume Support:** Attendees can return and resume incomplete sets
   - Responses saved after each answer (auto-save)
   - No timeout/expiration on incomplete sets
   - Attendees see which questions remain unanswered

2. **Profile Updates:** Suggest updates, not extract/replace
   - After completing a set, AI analyzes responses
   - Generates specific field update suggestions
   - Attendee reviews and accepts/rejects each suggestion
   - Preserves organizer-curated and manually-edited data

3. **Set Flow:**
   - New attendees: See all published sets in order, complete sequentially
   - Returning attendees: See only sets they haven't completed
   - Partially-completed sets: Resume from where they left off

---

## Attendee Experience Flow

### Flow 1: New Attendee (First-Time RSVP)

```
RSVP Confirmed
    │
    ▼
Check Published Question Sets
    │
    ├── No sets? → Skip to completion page
    │
    ├── 1+ sets exist
    │       │
    │       ▼
    │   Start Set 1
    │       │
    │       ▼
    │   Answer questions (auto-save each)
    │       │
    │       ▼
    │   Complete Set 1
    │       │
    │       ▼
    │   Profile Suggestions (review & accept/reject)
    │       │
    │       ▼
    │   More sets? → Start Set 2 → ...
    │       │
    │       ▼
    │   All sets done → Completion page
    │
    ▼
Done
```

### Flow 2: Returning Attendee (New Set Published)

```
Notification: "New questions available"
    │
    ▼
Click link / Log in
    │
    ▼
Check for incomplete or new sets
    │
    ├── Incomplete set exists → Resume that set
    │
    ├── New published set(s) → Start next uncompleted set
    │
    ├── All sets completed → Show "You're all caught up!"
    │
    ▼
Complete remaining sets → Profile suggestions → Done
```

### Flow 3: Resume Incomplete Set

```
Return to questionnaire
    │
    ▼
Find incomplete QuestionSetResponse
    │
    ▼
Load saved responses
    │
    ▼
Jump to first unanswered question
    │
    ▼
Continue answering → Complete → Profile suggestions
```

---

## API Endpoints

### Attendee Question Set Access

#### GET `/api/rsvp/[token]/question-sets`
Returns question sets available to the attendee.

**Response:**
```typescript
{
  event: {
    id: string;
    name: string;
  };
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
  };
  questionSets: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    questionCount: number;
    order: number;
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt: string | null;
    answeredCount: number; // For progress display
  }[];
  nextSetId: string | null; // ID of the next set to complete (or resume)
}
```

**Logic:**
- Only return PUBLISHED sets
- Order by `order` field
- Calculate status per set based on QuestionSetResponse existence/completedAt
- `nextSetId` = first set that isn't completed

#### GET `/api/rsvp/[token]/question-sets/[setId]`
Get a specific question set with questions and attendee's responses.

**Response:**
```typescript
{
  questionSet: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    questions: Question[];
  };
  responses: {
    questionId: string;
    value: string | number | string[];
    answeredAt: string;
  }[];
  progress: {
    total: number;
    answered: number;
    currentIndex: number; // First unanswered question index
  };
}
```

**Constraints:**
- Set must be PUBLISHED
- Attendee must have CONFIRMED RSVP

#### POST `/api/rsvp/[token]/question-sets/[setId]/save`
Save responses for a question set (auto-save on each answer).

**Request:**
```typescript
{
  responses: {
    questionId: string;
    value: string | number | string[];
    context?: string;
  }[];
}
```

**Response:**
```typescript
{
  success: true;
  saved: number;
}
```

**Behavior:**
- Upsert QuestionSetResponse record
- Merge new responses with existing (update if questionId exists)
- Set `startedAt` on first save
- Do NOT set `completedAt` (that happens on explicit complete)

#### POST `/api/rsvp/[token]/question-sets/[setId]/complete`
Mark a question set as completed and trigger profile suggestion generation.

**Request:**
```typescript
{
  responses: {
    questionId: string;
    value: string | number | string[];
    context?: string;
  }[];
}
```

**Response:**
```typescript
{
  success: true;
  completedAt: string;
  profileSuggestions: ProfileSuggestion[];
  nextSetId: string | null; // Next set to complete, if any
}
```

**Behavior:**
1. Save final responses
2. Set `completedAt` on QuestionSetResponse
3. Generate profile suggestions via AI
4. Return suggestions for review
5. Return `nextSetId` for navigation

### Profile Suggestions

#### POST `/api/rsvp/[token]/profile-suggestions/apply`
Apply accepted profile suggestions.

**Request:**
```typescript
{
  acceptedSuggestions: {
    field: string;
    value: string | string[];
  }[];
  rejectedFields: string[]; // Fields the user explicitly rejected
}
```

**Response:**
```typescript
{
  success: true;
  updatedFields: string[];
  profile: Profile; // Updated profile
}
```

**Behavior:**
- Update EventAttendee.profile with accepted suggestions
- Merge arrays (expertise, keywords) rather than replace
- Track which suggestions were rejected (optional: store for organizer insight)

---

## Profile Suggestion System

### Suggestion Generation

When an attendee completes a question set, the system analyzes their responses and generates profile update suggestions.

**Input to AI:**
- Current profile data (from EventAttendee.profile)
- Question set responses just completed
- All previous responses (from other sets)
- Organizer-provided profile overrides (profileOverrides field)

**Output:**
```typescript
interface ProfileSuggestion {
  field: string;           // 'expertise' | 'seekingKeywords' | 'currentFocus' | etc.
  action: 'add' | 'update' | 'replace';
  currentValue: string | string[] | null;
  suggestedValue: string | string[];
  confidence: number;      // 0-1
  reason: string;          // "Based on your answer about AI experience..."
  source: {
    questionSetId: string;
    questionId: string;
  };
}
```

**Suggestion Types by Field:**

| Field | Action Logic |
|-------|--------------|
| `expertise` | ADD new items, never remove organizer-added |
| `seekingKeywords` | ADD new, UPDATE if more specific |
| `offeringKeywords` | ADD new, UPDATE if more specific |
| `currentFocus` | UPDATE if substantially different |
| `role` | UPDATE only if empty or confidence > 0.9 |
| `company` | UPDATE only if empty or confidence > 0.9 |
| `conversationHooks` | ADD new hooks |

### Suggestion Review UI

**Component:** `ProfileSuggestionReview`

**Features:**
- Show each suggestion as a card
- Display: field name, current value (if any), suggested value
- Show reason/source for suggestion
- Accept/Reject buttons per suggestion
- "Accept All" / "Reject All" bulk actions
- "Skip for Now" option (can review later)
- Preview of profile with suggestions applied

---

## Questionnaire UI Updates

### QuestionSetFlow Component

**Location:** `src/components/m33t/questionnaire/QuestionSetFlow.tsx`

**Purpose:** Orchestrates the multi-set questionnaire experience.

**Features:**
- Fetch available question sets
- Determine next set to show
- Handle set transitions (set completed → suggestions → next set)
- Show completion state when all sets done

**State:**
```typescript
interface QuestionSetFlowState {
  sets: QuestionSetSummary[];
  currentSetId: string | null;
  currentSetData: QuestionSetData | null;
  responses: Record<string, ResponseValue>;
  showingSuggestions: boolean;
  suggestions: ProfileSuggestion[];
  isComplete: boolean;
}
```

### QuestionSetQuestionnaire Component

**Location:** `src/components/m33t/questionnaire/QuestionSetQuestionnaire.tsx`

**Purpose:** Answer questions for a single set.

**Features:**
- Inherits from existing questionnaire UI pattern
- One question at a time with progress bar
- Auto-save on each answer (debounced)
- Previous/Next navigation
- "Complete Set" button on last question
- Resume support (start at first unanswered)

### SetProgressIndicator Component

**Location:** `src/components/m33t/questionnaire/SetProgressIndicator.tsx`

**Purpose:** Show progress across multiple sets.

**Features:**
- Horizontal steps or vertical timeline
- Set title + completion status per step
- Visual highlight on current set
- Checkmarks for completed sets

### ProfileSuggestionReview Component

**Location:** `src/components/m33t/questionnaire/ProfileSuggestionReview.tsx`

**Purpose:** Review and accept/reject profile suggestions after set completion.

**Features:**
- Card per suggestion with accept/reject
- Field name with icon
- Current vs suggested value display
- Confidence indicator (high/medium/low)
- Reason text
- Bulk actions
- Skip option

---

## Updated RSVP Pages

### Questionnaire Page Updates

**Current:** `src/app/rsvp/[token]/questionnaire/page.tsx`

**Changes:**
- Replace single-set logic with QuestionSetFlow
- Handle multi-set state
- Add set selection if multiple incomplete sets exist
- Add suggestion review step between sets

### New: Question Sets Overview Page

**Location:** `src/app/rsvp/[token]/questions/page.tsx`

**Purpose:** Landing page showing all question sets and their status.

**Features:**
- List of sets with status (completed/in-progress/not started)
- Progress for each set
- "Continue" or "Start" button per set
- Overall completion status

---

## Guest Dashboard Integration

### My Questionnaires Section

Add to guest dashboard (if not already complete):

**Location:** `src/app/guest/events/[eventId]/questionnaires/page.tsx`

**Features:**
- See all question sets for this event
- Status per set
- Resume or start incomplete sets
- Link to view past responses (read-only)

---

## Notification Integration

### New Set Published Notification

When a set is published with notifications enabled:

**SMS Template:**
```
New questions available for {eventName}!

{organizerMessage or default: "We've added a few more questions to help us create the perfect experience for you."}

Complete them here: {link}
```

**Email Template:**
- Subject: "New questions for {eventName}"
- Body: Event branding, explanation of why questions matter, CTA button

### Incomplete Set Reminder

Optional reminder for attendees who started but didn't finish:

**SMS Template:**
```
You're almost done! You have {X} questions left for {eventName}.

Finish here: {link}
```

---

## File Structure

```
src/
├── app/
│   ├── rsvp/
│   │   └── [token]/
│   │       ├── questionnaire/
│   │       │   └── page.tsx        # Updated for multi-set flow
│   │       └── questions/
│   │           └── page.tsx        # New: Question sets overview
│   ├── guest/
│   │   └── events/
│   │       └── [eventId]/
│   │           └── questionnaires/
│   │               └── page.tsx    # Guest view of questionnaires
│   └── api/
│       └── rsvp/
│           └── [token]/
│               ├── question-sets/
│               │   ├── route.ts           # GET (list sets)
│               │   └── [setId]/
│               │       ├── route.ts       # GET (set with questions)
│               │       ├── save/
│               │       │   └── route.ts   # POST (auto-save)
│               │       └── complete/
│               │           └── route.ts   # POST (complete set)
│               └── profile-suggestions/
│                   └── apply/
│                       └── route.ts       # POST (apply suggestions)
├── components/
│   └── m33t/
│       └── questionnaire/
│           ├── index.ts
│           ├── QuestionSetFlow.tsx
│           ├── QuestionSetQuestionnaire.tsx
│           ├── SetProgressIndicator.tsx
│           ├── ProfileSuggestionReview.tsx
│           ├── SuggestionCard.tsx
│           └── SetCompletionCelebration.tsx
└── lib/
    └── m33t/
        ├── profile-suggestions.ts  # AI suggestion generation
        └── suggestion-schema.ts    # Zod schemas for suggestions
```

---

## Implementation Tasks

### B1: Attendee Question Set API
- GET `/api/rsvp/[token]/question-sets`
- GET `/api/rsvp/[token]/question-sets/[setId]`
- POST `/api/rsvp/[token]/question-sets/[setId]/save`
- POST `/api/rsvp/[token]/question-sets/[setId]/complete`

### B2: Profile Suggestion Generation
- AI prompt for analyzing responses
- Suggestion schema and types
- Field-specific suggestion logic
- Confidence scoring

### B3: Profile Suggestion API
- POST `/api/rsvp/[token]/profile-suggestions/apply`
- Suggestion storage (optional, for analytics)

### B4: QuestionSetFlow Component
- Multi-set orchestration
- Set transition logic
- Completion state handling

### B5: QuestionSetQuestionnaire Component
- Single-set question UI
- Auto-save integration
- Resume support

### B6: SetProgressIndicator Component
- Visual progress across sets
- Current set highlighting

### B7: ProfileSuggestionReview Component
- Suggestion cards with accept/reject
- Bulk actions
- Skip functionality

### B8: Updated Questionnaire Page
- Integrate QuestionSetFlow
- Handle multi-set navigation
- Add suggestion review step

### B9: Question Sets Overview Page
- New page showing all sets
- Status and progress per set
- Start/continue actions

### B10: Guest Dashboard Integration
- Add questionnaire status to event detail
- Link to complete remaining sets

### B11: Notification Templates
- New set published SMS/email
- Incomplete set reminder (optional)

---

## Edge Cases

### 1. Set Published While Attendee in Flow
- Attendee starts Set 1
- While answering, organizer publishes Set 2
- After completing Set 1 + suggestions, check for new sets
- Show Set 2 as next

### 2. Attendee Skips Suggestion Review
- Suggestions stored but not applied
- Profile unchanged
- Can access suggestions later from profile page (future)

### 3. Set Archived While Attendee in Progress
- Attendee started Set 1 (in progress)
- Organizer archives Set 1
- Attendee can still complete (don't break mid-flow)
- But set won't appear for new attendees

### 4. Empty Response for Required Question
- Required questions must have value to complete set
- Show validation error on "Complete Set"
- Allow saving incomplete and returning later

### 5. All Suggestions Rejected
- Valid action - attendee prefers manual control
- Track rejection (optional analytics)
- Continue to next set normally

---

## Success Criteria

1. Attendees can complete multiple question sets in sequence
2. Responses are auto-saved after each answer
3. Incomplete sets can be resumed from where attendee left off
4. After completing a set, AI generates profile suggestions
5. Attendees can review and accept/reject individual suggestions
6. Accepted suggestions update the profile without overwriting organizer data
7. Progress indicator shows status across all sets
8. New sets published after initial RSVP are shown to returning attendees
9. Guest dashboard shows questionnaire completion status
10. Notifications are sent when new sets are published (if enabled)

---

## Dependencies

- **Phase A:** Must be complete (QuestionSet model, organizer UI)
- **Existing:** Question type components (OpenTextQuestion, etc.)
- **Existing:** Profile schema and profile utilities
- **Existing:** RSVP token validation
- **Existing:** SMS/notification system
