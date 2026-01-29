# Multi-Phase Questionnaire - Phase A Specification

## Overview

Phase A implements the foundational data model and organizer-facing management UI for multi-phase questionnaires. This enables organizers to create, organize, and publish question sets that can be released to attendees over time.

**Core Concept:** Replace the current single-array `Event.questions` with a structured `QuestionSet` model that supports multiple sets per event, each with its own identity, lifecycle, and publish state.

---

## Design Decisions (From Clarifications)

1. **Set Naming:** Option C - Both internal ID + display title
   - Internal: `set_1`, `set_2`, etc. (auto-generated)
   - Display: User-defined title ("Starter Questions", "Deep Dive", etc.)

2. **Publishing:** Manual only - organizers must explicitly publish sets
   - Publish button offers option: "Publish & Notify Now" vs "Publish Only"
   - Nothing auto-publishes; organizers always in control

3. **Resume Support:** Attendees can return and resume incomplete sets
   - Responses saved after each answer
   - No partial answers - just unanswered questions within a set

4. **Profile Updates:** Suggest updates rather than extract/replace
   - After completing a set, AI suggests profile field updates
   - Attendee reviews and accepts/rejects suggestions
   - Preserves organizer-curated and manually-edited profile data

5. **Organizer Visibility:**
   - Which attendees completed which sets: Yes
   - Completion rates per set: Yes
   - Time-to-complete metrics: No

6. **Migration:** Simplest approach
   - Existing `Event.questions` field deprecated
   - No automatic migration - organizers re-create question sets

---

## Data Model Changes

### New: QuestionSet Model

```prisma
model QuestionSet {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Identity
  internalId  String   // Auto-generated: "set_1", "set_2", etc.
  title       String   // User-defined display title
  description String?  // Optional description shown to attendees

  // Questions (same schema as current Question type)
  questions   Json     @default("[]") // Array of Question objects

  // Lifecycle
  status      QuestionSetStatus @default(DRAFT)
  publishedAt DateTime?

  // Ordering
  order       Int      @default(0)    // Display order among sets

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  responses   QuestionSetResponse[]

  @@unique([eventId, internalId])
  @@index([eventId, status])
}

enum QuestionSetStatus {
  DRAFT      // Not visible to attendees
  PUBLISHED  // Visible and completable by attendees
  ARCHIVED   // Hidden but preserved (for data integrity)
}
```

### New: QuestionSetResponse Model

```prisma
model QuestionSetResponse {
  id              String      @id @default(cuid())
  questionSetId   String
  questionSet     QuestionSet @relation(fields: [questionSetId], references: [id], onDelete: Cascade)
  attendeeId      String
  attendee        EventAttendee @relation(fields: [attendeeId], references: [id], onDelete: Cascade)

  // Response Data
  responses       Json        // Array of { questionId, value, context?, answeredAt }

  // Completion State
  completedAt     DateTime?   // null = in progress, set = completed

  // Timestamps
  startedAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([questionSetId, attendeeId])
  @@index([attendeeId])
}
```

### Updated: EventAttendee Model

```prisma
model EventAttendee {
  // ... existing fields ...

  // NEW: Relations to question set responses
  questionSetResponses QuestionSetResponse[]

  // DEPRECATED: These fields remain for backwards compatibility but are no longer used
  // questionnaireResponses Json?
  // questionnaireCompletedAt DateTime?
}
```

### Updated: Event Model

```prisma
model Event {
  // ... existing fields ...

  // NEW: Relation to question sets
  questionSets QuestionSet[]

  // DEPRECATED: Kept for migration reference, no longer used
  // questions Json @default("[]")
}
```

---

## API Endpoints

### QuestionSet CRUD

#### GET `/api/events/[eventId]/question-sets`
Returns all question sets for an event (organizer view).

**Response:**
```typescript
{
  questionSets: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt: string | null;
    order: number;
    questionCount: number;
    completionStats: {
      total: number;      // Total eligible attendees
      completed: number;  // Attendees who completed this set
      inProgress: number; // Attendees who started but didn't finish
    };
  }[];
}
```

#### POST `/api/events/[eventId]/question-sets`
Create a new question set.

**Request:**
```typescript
{
  title: string;
  description?: string;
  questions?: Question[]; // Optional - can add later
}
```

**Response:**
```typescript
{
  questionSet: QuestionSet;
}
```

**Behavior:**
- Auto-generates `internalId` as `set_${count + 1}`
- Sets `order` to highest current order + 1
- Status defaults to `DRAFT`

#### GET `/api/events/[eventId]/question-sets/[setId]`
Get single question set with full question data.

**Response:**
```typescript
{
  questionSet: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    questions: Question[];
    status: QuestionSetStatus;
    publishedAt: string | null;
    order: number;
    completionStats: { ... };
  };
}
```

#### PATCH `/api/events/[eventId]/question-sets/[setId]`
Update question set details or questions.

**Request:**
```typescript
{
  title?: string;
  description?: string;
  questions?: Question[];
  order?: number;
}
```

**Constraints:**
- Cannot modify questions of a PUBLISHED set (only DRAFT sets)
- Can modify title/description/order of any non-ARCHIVED set

#### DELETE `/api/events/[eventId]/question-sets/[setId]`
Delete a question set.

**Constraints:**
- DRAFT sets: Hard delete
- PUBLISHED sets with responses: Soft delete (set status to ARCHIVED)
- PUBLISHED sets with no responses: Hard delete

### Publishing

#### POST `/api/events/[eventId]/question-sets/[setId]/publish`
Publish a question set.

**Request:**
```typescript
{
  notifyAttendees: boolean; // If true, send notifications immediately
}
```

**Response:**
```typescript
{
  success: true;
  questionSet: QuestionSet;
  notificationsSent?: number; // Only if notifyAttendees was true
}
```

**Behavior:**
- Sets `status` to `PUBLISHED`
- Sets `publishedAt` to current timestamp
- If `notifyAttendees: true`:
  - Sends SMS/email to all CONFIRMED attendees who haven't completed this set
  - Stores notification record for tracking

#### POST `/api/events/[eventId]/question-sets/[setId]/notify`
Send notifications for an already-published set.

**Request:**
```typescript
{
  filter?: 'all' | 'not_started' | 'in_progress';
}
```

**Response:**
```typescript
{
  success: true;
  notificationsSent: number;
}
```

### Reordering

#### POST `/api/events/[eventId]/question-sets/reorder`
Reorder question sets.

**Request:**
```typescript
{
  orderedIds: string[]; // Question set IDs in desired order
}
```

---

## Organizer UI Components

### QuestionSetsManager

**Location:** `src/components/events/question-sets/QuestionSetsManager.tsx`

**Purpose:** Main management interface for question sets.

**Features:**
- List view of all question sets with:
  - Title and internal ID
  - Status badge (Draft/Published/Archived)
  - Question count
  - Completion stats (X/Y completed)
  - Published date (if applicable)
- Drag-and-drop reordering
- Actions per set:
  - Edit (opens QuestionSetEditor)
  - Publish (with notification option dialog)
  - Send Notifications (for published sets)
  - Archive/Delete
- "Add Question Set" button

### QuestionSetEditor

**Location:** `src/components/events/question-sets/QuestionSetEditor.tsx`

**Purpose:** Create/edit a question set.

**Features:**
- Title input
- Description textarea (optional)
- Question list with:
  - Drag-and-drop reordering
  - Add/remove questions
  - Edit question inline or in modal
- Question type selector (open_text, slider, single_select, multi_select)
- Question configuration (per type)
- Save as Draft / Publish buttons

### PublishDialog

**Location:** `src/components/events/question-sets/PublishDialog.tsx`

**Purpose:** Confirmation dialog when publishing a set.

**Content:**
- Summary: "You're about to publish 'Starter Questions' with X questions"
- Warning if any required fields are missing
- Notification option:
  - Radio: "Publish & Notify Attendees Now" / "Publish Only (notify later)"
  - If notifying: Preview count of attendees to notify
- Confirm/Cancel buttons

### CompletionStatsPanel

**Location:** `src/components/events/question-sets/CompletionStatsPanel.tsx`

**Purpose:** Show completion statistics for a question set.

**Features:**
- Progress bar (completed / total)
- Breakdown: X completed, Y in progress, Z not started
- List of attendees with their status (optional expandable)

---

## Event Wizard Integration

### Updated Step: QuestionsStep

**Current Location:** `src/components/events/wizard/steps/QuestionsStep.tsx`

**Changes:**
- Replace single question list with QuestionSetsManager embed
- During event creation:
  - Start with one default DRAFT set titled "Initial Questions"
  - Pre-populated with REQUIRED_QUESTIONS
- Show simplified view during wizard (full management available after creation)

---

## Question Set Lifecycle

```
                    ┌─────────────┐
                    │   CREATE    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
              ┌────▶│    DRAFT    │◀────┐
              │     └──────┬──────┘     │
              │            │            │
              │   [Edit Questions]      │
              │            │            │
              │            ▼            │
              │     ┌─────────────┐     │
              │     │   PUBLISH   │     │
              │     └──────┬──────┘     │
              │            │            │
              │            ▼            │
              │     ┌─────────────┐     │
              └─────│  PUBLISHED  │─────┘
             [Unpublish]   │      [Edit title/desc only]
                           │
                           ▼
                    ┌─────────────┐
                    │   ARCHIVE   │
                    └─────────────┘
                           │
                           ▼
                    [Responses preserved]
                    [Not visible to attendees]
```

---

## Migration Notes

### Database Migration

```sql
-- 1. Create QuestionSet table
CREATE TABLE "QuestionSet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "internalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "questions" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "QuestionSet_eventId_internalId_key" ON "QuestionSet"("eventId", "internalId");
CREATE INDEX "QuestionSet_eventId_status_idx" ON "QuestionSet"("eventId", "status");

-- 2. Create QuestionSetResponse table
CREATE TABLE "QuestionSetResponse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "questionSetId" TEXT NOT NULL,
  "attendeeId" TEXT NOT NULL,
  "responses" JSONB NOT NULL DEFAULT '[]',
  "completedAt" TIMESTAMP,
  "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE,
  FOREIGN KEY ("attendeeId") REFERENCES "EventAttendee"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "QuestionSetResponse_questionSetId_attendeeId_key" ON "QuestionSetResponse"("questionSetId", "attendeeId");
CREATE INDEX "QuestionSetResponse_attendeeId_idx" ON "QuestionSetResponse"("attendeeId");
```

### Existing Event Questions

Per clarification: No migration needed. The existing `Event.questions` field and `EventAttendee.questionnaireResponses` are deprecated but preserved. The single existing event will have its questions re-created manually.

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── events/
│           └── [eventId]/
│               └── question-sets/
│                   ├── route.ts           # GET (list), POST (create)
│                   ├── reorder/
│                   │   └── route.ts       # POST (reorder)
│                   └── [setId]/
│                       ├── route.ts       # GET, PATCH, DELETE
│                       ├── publish/
│                       │   └── route.ts   # POST (publish)
│                       └── notify/
│                           └── route.ts   # POST (send notifications)
├── components/
│   └── events/
│       └── question-sets/
│           ├── index.ts
│           ├── QuestionSetsManager.tsx
│           ├── QuestionSetEditor.tsx
│           ├── QuestionSetCard.tsx
│           ├── PublishDialog.tsx
│           ├── CompletionStatsPanel.tsx
│           └── NotifyDialog.tsx
└── lib/
    └── m33t/
        └── question-sets.ts               # Utility functions
```

---

## Implementation Tasks

### A1: Database Schema
- Add QuestionSet model to Prisma schema
- Add QuestionSetResponse model
- Add relations to Event and EventAttendee
- Create and apply migration

### A2: QuestionSet CRUD API
- GET `/api/events/[eventId]/question-sets`
- POST `/api/events/[eventId]/question-sets`
- GET `/api/events/[eventId]/question-sets/[setId]`
- PATCH `/api/events/[eventId]/question-sets/[setId]`
- DELETE `/api/events/[eventId]/question-sets/[setId]`

### A3: Publishing API
- POST `/api/events/[eventId]/question-sets/[setId]/publish`
- POST `/api/events/[eventId]/question-sets/[setId]/notify`
- POST `/api/events/[eventId]/question-sets/reorder`

### A4: QuestionSetsManager UI
- List view component
- Status badges
- Action buttons
- Completion stats display

### A5: QuestionSetEditor UI
- Title/description form
- Question list with drag-and-drop
- Question type selector
- Save/publish buttons

### A6: Publish/Notify Dialogs
- PublishDialog with notification option
- NotifyDialog for sending notifications to specific groups

### A7: Event Wizard Integration
- Update QuestionsStep to use QuestionSetsManager
- Default set creation for new events

### A8: Completion Stats
- CompletionStatsPanel component
- Per-set completion calculations
- Attendee list with completion status

---

## Success Criteria

1. Organizers can create multiple question sets per event
2. Each set has a title and optional description
3. Sets can be reordered via drag-and-drop
4. Sets must be explicitly published to become visible
5. Publishing offers choice to notify attendees or not
6. Published sets can have notifications sent later
7. Completion stats show which attendees completed which sets
8. Draft sets can have questions edited; published sets cannot
9. Deleting published sets with responses archives them instead
10. New events start with a default draft question set
