# Task Breakdown: Multi-Phase Questionnaire System - Phase A

**Generated:** 2026-01-28
**Source:** specs/multi-phase-questionnaire-v1/01-phase-a-specification.md
**Feature Slug:** multi-phase-questionnaire-v1
**Last Decompose:** 2026-01-28

---

## Overview

Phase A implements the foundational data model and organizer-facing management UI for multi-phase questionnaires. This enables organizers to create, organize, and publish question sets that can be released to attendees over time.

**Key deliverables:**
- Database schema: QuestionSet and QuestionSetResponse models
- Complete CRUD API for question sets
- Publishing and notification APIs
- QuestionSetsManager UI component
- QuestionSetEditor UI component
- Event wizard integration

---

## Phase 1: Database Foundation

### Task 1.1: Add QuestionSet and QuestionSetResponse Models to Prisma Schema

**Description:** Add the core database models for multi-phase questionnaires to the Prisma schema.
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundational)

**Technical Requirements:**

Add to `prisma/schema.prisma`:

```prisma
// ========== MULTI-PHASE QUESTIONNAIRE MODELS ==========

enum QuestionSetStatus {
  DRAFT      // Not visible to attendees
  PUBLISHED  // Visible and completable by attendees
  ARCHIVED   // Hidden but preserved (for data integrity)
}

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

**Update Event model** - Add relation:
```prisma
model Event {
  // ... existing fields ...

  // NEW: Relation to question sets
  questionSets QuestionSet[]
}
```

**Update EventAttendee model** - Add relation:
```prisma
model EventAttendee {
  // ... existing fields ...

  // NEW: Relations to question set responses
  questionSetResponses QuestionSetResponse[]
}
```

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Add `QuestionSetStatus` enum after existing enums
3. Add `QuestionSet` model after Event model
4. Add `QuestionSetResponse` model after QuestionSet
5. Add `questionSets QuestionSet[]` relation to Event model (around line 503)
6. Add `questionSetResponses QuestionSetResponse[]` relation to EventAttendee model
7. Run `npm run db:backup` to backup database
8. Run `npx prisma migrate dev --name add-question-sets` to create migration
9. Run `npx prisma generate` to update Prisma client

**Acceptance Criteria:**
- [ ] QuestionSetStatus enum added with DRAFT, PUBLISHED, ARCHIVED values
- [ ] QuestionSet model created with all specified fields
- [ ] QuestionSetResponse model created with all specified fields
- [ ] Event model has questionSets relation
- [ ] EventAttendee model has questionSetResponses relation
- [ ] Unique constraint on [eventId, internalId] for QuestionSet
- [ ] Unique constraint on [questionSetId, attendeeId] for QuestionSetResponse
- [ ] Migration created and applied successfully
- [ ] `npx prisma studio` shows new tables

---

## Phase 2: Core CRUD API

### Task 2.1: Create QuestionSet List and Create API Route

**Description:** Implement GET (list all) and POST (create new) endpoints for question sets.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None (API foundation)

**Location:** `src/app/api/events/[eventId]/question-sets/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

// Validation schema for creating a question set
const createQuestionSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(z.any()).optional(), // Question[] type validated elsewhere
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check organizer access
  const access = await checkEventAccess(eventId, user.id, 'view');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 404 }
    );
  }

  // Get all question sets with completion stats
  const questionSets = await prisma.questionSet.findMany({
    where: { eventId },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { responses: true },
      },
      responses: {
        select: { completedAt: true },
      },
    },
  });

  // Get total eligible attendees (CONFIRMED status)
  const totalAttendees = await prisma.eventAttendee.count({
    where: {
      eventId,
      rsvpStatus: 'CONFIRMED',
    },
  });

  // Format response with completion stats
  const formattedSets = questionSets.map((set) => {
    const completed = set.responses.filter((r) => r.completedAt !== null).length;
    const inProgress = set.responses.filter((r) => r.completedAt === null).length;
    const questionsArray = set.questions as unknown[];

    return {
      id: set.id,
      internalId: set.internalId,
      title: set.title,
      description: set.description,
      status: set.status,
      publishedAt: set.publishedAt?.toISOString() || null,
      order: set.order,
      questionCount: questionsArray.length,
      completionStats: {
        total: totalAttendees,
        completed,
        inProgress,
      },
    };
  });

  return NextResponse.json({ questionSets: formattedSets });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check organizer access (need edit permission to create sets)
  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  // Parse and validate body
  const body = await req.json();
  const result = createQuestionSetSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, questions } = result.data;

  // Generate internal ID
  const existingCount = await prisma.questionSet.count({
    where: { eventId },
  });
  const internalId = `set_${existingCount + 1}`;

  // Get max order
  const maxOrder = await prisma.questionSet.aggregate({
    where: { eventId },
    _max: { order: true },
  });
  const newOrder = (maxOrder._max.order ?? -1) + 1;

  // Create question set
  const questionSet = await prisma.questionSet.create({
    data: {
      eventId,
      internalId,
      title,
      description,
      questions: questions || [],
      order: newOrder,
      status: 'DRAFT',
    },
  });

  return NextResponse.json({ questionSet }, { status: 201 });
}
```

**Implementation Steps:**
1. Create directory: `src/app/api/events/[eventId]/question-sets/`
2. Create `route.ts` with GET and POST handlers
3. Import existing helpers: `checkEventAccess`, `getCurrentUser`, `prisma`
4. Add Zod validation for create request
5. Implement GET with completion stats aggregation
6. Implement POST with auto-generated internalId and order

**Acceptance Criteria:**
- [ ] GET `/api/events/[eventId]/question-sets` returns all sets for event
- [ ] Response includes completion stats (total, completed, inProgress)
- [ ] POST creates new set with auto-generated internalId (set_1, set_2, etc.)
- [ ] POST sets order to next available value
- [ ] New sets default to DRAFT status
- [ ] Unauthorized requests return 401
- [ ] Non-organizers get 403/404
- [ ] Invalid POST body returns 400 with validation errors

---

### Task 2.2: Create QuestionSet Single Item API Route

**Description:** Implement GET (single), PATCH (update), and DELETE endpoints for individual question sets.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.3 (after 2.1 complete)

**Location:** `src/app/api/events/[eventId]/question-sets/[setId]/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

// Validation schema for updating a question set
const updateQuestionSetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  questions: z.array(z.any()).optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'view');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 404 }
    );
  }

  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
    include: {
      responses: {
        select: { completedAt: true },
      },
    },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Get total eligible attendees
  const totalAttendees = await prisma.eventAttendee.count({
    where: { eventId, rsvpStatus: 'CONFIRMED' },
  });

  const completed = questionSet.responses.filter((r) => r.completedAt !== null).length;
  const inProgress = questionSet.responses.filter((r) => r.completedAt === null).length;

  return NextResponse.json({
    questionSet: {
      id: questionSet.id,
      internalId: questionSet.internalId,
      title: questionSet.title,
      description: questionSet.description,
      questions: questionSet.questions,
      status: questionSet.status,
      publishedAt: questionSet.publishedAt?.toISOString() || null,
      order: questionSet.order,
      completionStats: {
        total: totalAttendees,
        completed,
        inProgress,
      },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  // Get existing set
  const existingSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
  });

  if (!existingSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Cannot modify archived sets
  if (existingSet.status === 'ARCHIVED') {
    return NextResponse.json(
      { error: 'Cannot modify archived question set' },
      { status: 400 }
    );
  }

  // Parse and validate body
  const body = await req.json();
  const result = updateQuestionSetSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, questions, order } = result.data;

  // Cannot modify questions of published sets
  if (existingSet.status === 'PUBLISHED' && questions !== undefined) {
    return NextResponse.json(
      { error: 'Cannot modify questions of a published set' },
      { status: 400 }
    );
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (questions !== undefined) updateData.questions = questions;
  if (order !== undefined) updateData.order = order;

  const updatedSet = await prisma.questionSet.update({
    where: { id: setId },
    data: updateData,
  });

  return NextResponse.json({ questionSet: updatedSet });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const existingSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
    include: {
      _count: { select: { responses: true } },
    },
  });

  if (!existingSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Delete behavior based on status and responses
  if (existingSet.status === 'DRAFT') {
    // DRAFT sets: Hard delete
    await prisma.questionSet.delete({
      where: { id: setId },
    });
    return NextResponse.json({ success: true, action: 'deleted' });
  }

  if (existingSet.status === 'PUBLISHED') {
    if (existingSet._count.responses > 0) {
      // PUBLISHED with responses: Soft delete (archive)
      await prisma.questionSet.update({
        where: { id: setId },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({ success: true, action: 'archived' });
    } else {
      // PUBLISHED without responses: Hard delete
      await prisma.questionSet.delete({
        where: { id: setId },
      });
      return NextResponse.json({ success: true, action: 'deleted' });
    }
  }

  // Already ARCHIVED - no action
  return NextResponse.json(
    { error: 'Cannot delete archived question set' },
    { status: 400 }
  );
}
```

**Implementation Steps:**
1. Create directory: `src/app/api/events/[eventId]/question-sets/[setId]/`
2. Create `route.ts` with GET, PATCH, DELETE handlers
3. Implement GET with full question data and stats
4. Implement PATCH with status-based restrictions
5. Implement DELETE with smart delete/archive behavior

**Acceptance Criteria:**
- [ ] GET `/api/events/[eventId]/question-sets/[setId]` returns full set with questions
- [ ] PATCH updates title/description/order for DRAFT and PUBLISHED sets
- [ ] PATCH blocks question modifications for PUBLISHED sets (returns 400)
- [ ] PATCH blocks all modifications for ARCHIVED sets (returns 400)
- [ ] DELETE removes DRAFT sets completely
- [ ] DELETE archives PUBLISHED sets with responses
- [ ] DELETE removes PUBLISHED sets without responses
- [ ] DELETE blocks action on ARCHIVED sets
- [ ] 404 returned for non-existent sets

---

### Task 2.3: Create Publish and Notify API Routes

**Description:** Implement publishing endpoint and notification sending for question sets.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2 (after 2.1 complete)

**Locations:**
- `src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts`
- `src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts`

**Technical Requirements - Publish Route:**

```typescript
// src/app/api/events/[eventId]/question-sets/[setId]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

const publishSchema = z.object({
  notifyAttendees: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = publishSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { notifyAttendees } = result.data;

  // Get the question set
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Can only publish DRAFT sets
  if (questionSet.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only DRAFT question sets can be published' },
      { status: 400 }
    );
  }

  // Check if there are questions
  const questions = questionSet.questions as unknown[];
  if (questions.length === 0) {
    return NextResponse.json(
      { error: 'Cannot publish a question set with no questions' },
      { status: 400 }
    );
  }

  // Publish the set
  const updatedSet = await prisma.questionSet.update({
    where: { id: setId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  let notificationsSent = 0;

  if (notifyAttendees) {
    // Get attendees who haven't completed this set
    const attendeesToNotify = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        rsvpStatus: 'CONFIRMED',
        questionSetResponses: {
          none: {
            questionSetId: setId,
            completedAt: { not: null },
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true },
    });

    // TODO: Send actual notifications via SMS/email
    // For now, just count eligible attendees
    notificationsSent = attendeesToNotify.length;

    // Log notification intent (actual sending handled by notification service)
    console.log(`[QuestionSet Publish] Would notify ${notificationsSent} attendees for set ${setId}`);
  }

  return NextResponse.json({
    success: true,
    questionSet: updatedSet,
    ...(notifyAttendees && { notificationsSent }),
  });
}
```

**Technical Requirements - Notify Route:**

```typescript
// src/app/api/events/[eventId]/question-sets/[setId]/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

const notifySchema = z.object({
  filter: z.enum(['all', 'not_started', 'in_progress']).optional().default('all'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'curate');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = notifySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { filter } = result.data;

  // Get the question set
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Can only notify for PUBLISHED sets
  if (questionSet.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'Can only send notifications for published question sets' },
      { status: 400 }
    );
  }

  // Build filter conditions based on notification target
  let whereClause: Record<string, unknown> = {
    eventId,
    rsvpStatus: 'CONFIRMED',
  };

  if (filter === 'all') {
    // All who haven't completed
    whereClause.questionSetResponses = {
      none: {
        questionSetId: setId,
        completedAt: { not: null },
      },
    };
  } else if (filter === 'not_started') {
    // No response at all
    whereClause.questionSetResponses = {
      none: { questionSetId: setId },
    };
  } else if (filter === 'in_progress') {
    // Have response but not completed
    whereClause.questionSetResponses = {
      some: {
        questionSetId: setId,
        completedAt: null,
      },
    };
  }

  const attendeesToNotify = await prisma.eventAttendee.findMany({
    where: whereClause,
    select: { id: true, email: true, phone: true, firstName: true },
  });

  // TODO: Send actual notifications
  const notificationsSent = attendeesToNotify.length;
  console.log(`[QuestionSet Notify] Would notify ${notificationsSent} attendees (filter: ${filter}) for set ${setId}`);

  return NextResponse.json({
    success: true,
    notificationsSent,
  });
}
```

**Implementation Steps:**
1. Create `publish/route.ts` in question-sets/[setId]/
2. Create `notify/route.ts` in question-sets/[setId]/
3. Implement publish with optional notification
4. Implement notify with filter options
5. Add validation for status checks

**Acceptance Criteria:**
- [ ] POST `/publish` transitions DRAFT to PUBLISHED
- [ ] POST `/publish` sets publishedAt timestamp
- [ ] POST `/publish` blocks publishing empty sets (no questions)
- [ ] POST `/publish` optionally triggers notifications
- [ ] POST `/publish` returns notificationsSent count when notifying
- [ ] POST `/notify` only works for PUBLISHED sets
- [ ] POST `/notify` filters by 'all', 'not_started', 'in_progress'
- [ ] POST `/notify` returns count of attendees to notify

---

### Task 2.4: Create Reorder API Route

**Description:** Implement bulk reordering of question sets.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2, 2.3

**Location:** `src/app/api/events/[eventId]/question-sets/reorder/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const result = reorderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { orderedIds } = result.data;

  // Verify all IDs belong to this event
  const existingSets = await prisma.questionSet.findMany({
    where: { eventId },
    select: { id: true },
  });

  const existingIds = new Set(existingSets.map((s) => s.id));
  const providedIds = new Set(orderedIds);

  // Check that all provided IDs exist
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return NextResponse.json(
        { error: `Question set ${id} not found in this event` },
        { status: 400 }
      );
    }
  }

  // Update order for each set
  const updates = orderedIds.map((id, index) =>
    prisma.questionSet.update({
      where: { id },
      data: { order: index },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ success: true });
}
```

**Implementation Steps:**
1. Create `reorder/route.ts` in question-sets/
2. Validate that all provided IDs belong to the event
3. Use transaction to update all orders atomically
4. Return success

**Acceptance Criteria:**
- [ ] POST accepts array of question set IDs
- [ ] Updates order field to match array position
- [ ] Validates all IDs belong to the event
- [ ] Returns error for unknown IDs
- [ ] Uses transaction for atomic updates

---

## Phase 3: Organizer UI Components

### Task 3.1: Create QuestionSetCard Component

**Description:** Create the card component that displays a single question set in the list.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1 (API available for testing)
**Can run parallel with:** Task 3.2

**Location:** `src/components/events/question-sets/QuestionSetCard.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Send,
  Archive,
  Trash2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionStats {
  total: number;
  completed: number;
  inProgress: number;
}

interface QuestionSetCardProps {
  id: string;
  internalId: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  questionCount: number;
  completionStats: CompletionStats;
  onEdit: () => void;
  onPublish: () => void;
  onNotify: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary' as const,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  PUBLISHED: {
    label: 'Published',
    variant: 'default' as const,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'outline' as const,
    className: 'bg-zinc-800/50 text-zinc-500',
  },
};

export function QuestionSetCard({
  id,
  internalId,
  title,
  description,
  status,
  publishedAt,
  questionCount,
  completionStats,
  onEdit,
  onPublish,
  onNotify,
  onDelete,
  isDragging,
  dragHandleProps,
}: QuestionSetCardProps) {
  const config = statusConfig[status];
  const completionPercent =
    completionStats.total > 0
      ? Math.round((completionStats.completed / completionStats.total) * 100)
      : 0;

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isDragging && 'opacity-50 ring-2 ring-gold-primary',
        status === 'ARCHIVED' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {status !== 'ARCHIVED' && (
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab text-text-tertiary hover:text-text-secondary"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-tertiary font-mono">
              {internalId}
            </span>
            <Badge className={cn('text-xs', config.className)}>
              {config.label}
            </Badge>
          </div>

          <h3 className="font-medium text-text-primary truncate">{title}</h3>

          {description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span>{questionCount} questions</span>
            </div>

            {status === 'PUBLISHED' && (
              <div className="flex items-center gap-1.5">
                <span>
                  {completionStats.completed}/{completionStats.total} completed
                </span>
                <span className="text-text-tertiary">({completionPercent}%)</span>
              </div>
            )}
          </div>

          {status === 'PUBLISHED' && publishedAt && (
            <p className="text-xs text-text-tertiary mt-2">
              Published {new Date(publishedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status !== 'ARCHIVED' && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}

            {status === 'DRAFT' && (
              <DropdownMenuItem onClick={onPublish}>
                <Send className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}

            {status === 'PUBLISHED' && (
              <DropdownMenuItem onClick={onNotify}>
                <Send className="h-4 w-4 mr-2" />
                Send Notifications
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 focus:text-red-400"
            >
              {status === 'PUBLISHED' ? (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
```

**Implementation Steps:**
1. Create `src/components/events/question-sets/` directory
2. Create `QuestionSetCard.tsx` component
3. Implement status badges with color coding
4. Add completion stats display
5. Add dropdown menu with context-aware actions
6. Support drag handle props for reordering

**Acceptance Criteria:**
- [ ] Card displays internalId, title, description
- [ ] Status badge shows DRAFT/PUBLISHED/ARCHIVED with colors
- [ ] Question count displayed
- [ ] Completion stats shown for published sets
- [ ] Publish date shown for published sets
- [ ] Drag handle visible for non-archived sets
- [ ] Actions menu shows appropriate options per status
- [ ] Archived sets appear dimmed

---

### Task 3.2: Create QuestionSetsManager Component

**Description:** Create the main management interface for question sets with list and actions.
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None (depends on 3.1)

**Location:** `src/components/events/question-sets/QuestionSetsManager.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { QuestionSetCard } from './QuestionSetCard';
import { PublishDialog } from './PublishDialog';
import { NotifyDialog } from './NotifyDialog';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  internalId: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  questionCount: number;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface QuestionSetsManagerProps {
  eventId: string;
  questionSets: QuestionSet[];
  onCreateSet: () => void;
  onEditSet: (setId: string) => void;
}

function SortableQuestionSetCard({
  set,
  onEdit,
  onPublish,
  onNotify,
  onDelete,
}: {
  set: QuestionSet;
  onEdit: () => void;
  onPublish: () => void;
  onNotify: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: set.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionSetCard
        {...set}
        onEdit={onEdit}
        onPublish={onPublish}
        onNotify={onNotify}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function QuestionSetsManager({
  eventId,
  questionSets,
  onCreateSet,
  onEditSet,
}: QuestionSetsManagerProps) {
  const router = useRouter();
  const [sets, setSets] = useState(questionSets);
  const [publishDialogSet, setPublishDialogSet] = useState<QuestionSet | null>(null);
  const [notifyDialogSet, setNotifyDialogSet] = useState<QuestionSet | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sets.findIndex((s) => s.id === active.id);
        const newIndex = sets.findIndex((s) => s.id === over.id);

        // Optimistic update
        const newSets = [...sets];
        const [removed] = newSets.splice(oldIndex, 1);
        newSets.splice(newIndex, 0, removed);
        setSets(newSets);

        // Persist to server
        try {
          const res = await fetch(`/api/events/${eventId}/question-sets/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderedIds: newSets.map((s) => s.id),
            }),
          });

          if (!res.ok) {
            throw new Error('Failed to reorder');
          }
        } catch (error) {
          // Revert on failure
          setSets(sets);
          toast.error('Failed to reorder question sets');
        }
      }
    },
    [sets, eventId]
  );

  const handleDelete = useCallback(
    async (setId: string) => {
      const set = sets.find((s) => s.id === setId);
      if (!set) return;

      const confirmMessage =
        set.status === 'PUBLISHED'
          ? 'This will archive the question set. Responses will be preserved.'
          : 'Are you sure you want to delete this question set?';

      if (!confirm(confirmMessage)) return;

      setIsDeleting(setId);

      try {
        const res = await fetch(
          `/api/events/${eventId}/question-sets/${setId}`,
          { method: 'DELETE' }
        );

        if (!res.ok) {
          throw new Error('Failed to delete');
        }

        const data = await res.json();

        if (data.action === 'archived') {
          toast.success('Question set archived');
        } else {
          toast.success('Question set deleted');
        }

        router.refresh();
      } catch (error) {
        toast.error('Failed to delete question set');
      } finally {
        setIsDeleting(null);
      }
    },
    [sets, eventId, router]
  );

  const activeSets = sets.filter((s) => s.status !== 'ARCHIVED');
  const archivedSets = sets.filter((s) => s.status === 'ARCHIVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Question Sets</h2>
          <p className="text-sm text-text-secondary">
            Create multiple question sets to release over time
          </p>
        </div>
        <Button onClick={onCreateSet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question Set
        </Button>
      </div>

      {/* Empty State */}
      {sets.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary mb-4">No question sets yet</p>
          <Button onClick={onCreateSet}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Set
          </Button>
        </div>
      )}

      {/* Active Sets (Sortable) */}
      {activeSets.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeSets.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {activeSets.map((set) => (
                <SortableQuestionSetCard
                  key={set.id}
                  set={set}
                  onEdit={() => onEditSet(set.id)}
                  onPublish={() => setPublishDialogSet(set)}
                  onNotify={() => setNotifyDialogSet(set)}
                  onDelete={() => handleDelete(set.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Archived Sets (Not Sortable) */}
      {archivedSets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-tertiary">Archived</h3>
          {archivedSets.map((set) => (
            <QuestionSetCard
              key={set.id}
              {...set}
              onEdit={() => {}}
              onPublish={() => {}}
              onNotify={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {publishDialogSet && (
        <PublishDialog
          isOpen={!!publishDialogSet}
          onClose={() => setPublishDialogSet(null)}
          eventId={eventId}
          questionSet={publishDialogSet}
        />
      )}

      {notifyDialogSet && (
        <NotifyDialog
          isOpen={!!notifyDialogSet}
          onClose={() => setNotifyDialogSet(null)}
          eventId={eventId}
          questionSet={notifyDialogSet}
        />
      )}
    </div>
  );
}
```

**Implementation Steps:**
1. Install @dnd-kit packages if not present: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
2. Create `QuestionSetsManager.tsx`
3. Implement drag-and-drop with @dnd-kit
4. Add optimistic reorder with rollback on error
5. Handle delete with confirmation
6. Separate archived sets at bottom (not sortable)
7. Wire up dialogs for publish and notify

**Acceptance Criteria:**
- [ ] List displays all question sets in order
- [ ] Drag-and-drop reorders sets and persists to API
- [ ] Failed reorder reverts to previous state
- [ ] Delete shows appropriate confirmation based on status
- [ ] Published sets archived instead of deleted
- [ ] Archived sets shown separately at bottom
- [ ] Empty state with create button
- [ ] Add Question Set button works

---

### Task 3.3: Create PublishDialog Component

**Description:** Create the dialog for publishing a question set with notification option.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.3 (publish API)
**Can run parallel with:** Task 3.4

**Location:** `src/components/events/question-sets/PublishDialog.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  title: string;
  questionCount: number;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  questionSet: QuestionSet;
}

export function PublishDialog({
  isOpen,
  onClose,
  eventId,
  questionSet,
}: PublishDialogProps) {
  const router = useRouter();
  const [notifyOption, setNotifyOption] = useState<'notify' | 'no_notify'>('notify');
  const [isPublishing, setIsPublishing] = useState(false);

  const eligibleToNotify = questionSet.completionStats.total;

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/question-sets/${questionSet.id}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notifyAttendees: notifyOption === 'notify',
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }

      const data = await res.json();

      if (notifyOption === 'notify' && data.notificationsSent) {
        toast.success(
          `Published and sent ${data.notificationsSent} notifications`
        );
      } else {
        toast.success('Question set published');
      }

      router.refresh();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Question Set</DialogTitle>
          <DialogDescription>
            Make this question set visible to attendees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-text-tertiary" />
              <span className="font-medium">{questionSet.title}</span>
            </div>
            <p className="text-sm text-text-secondary">
              {questionSet.questionCount} questions
            </p>
          </div>

          {/* Warning for no questions */}
          {questionSet.questionCount === 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-warning">
                Cannot publish a set with no questions
              </span>
            </div>
          )}

          {/* Notification Option */}
          {questionSet.questionCount > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Notification preference
              </Label>
              <RadioGroup
                value={notifyOption}
                onValueChange={(v) => setNotifyOption(v as 'notify' | 'no_notify')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
                  <RadioGroupItem value="notify" id="notify" />
                  <Label htmlFor="notify" className="flex-1 cursor-pointer">
                    <div className="font-medium">Publish & Notify Now</div>
                    <div className="text-sm text-text-secondary">
                      Send notification to {eligibleToNotify} confirmed attendees
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
                  <RadioGroupItem value="no_notify" id="no_notify" />
                  <Label htmlFor="no_notify" className="flex-1 cursor-pointer">
                    <div className="font-medium">Publish Only</div>
                    <div className="text-sm text-text-secondary">
                      Make visible but send notifications later
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || questionSet.questionCount === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isPublishing ? (
              'Publishing...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Implementation Steps:**
1. Create `PublishDialog.tsx`
2. Add radio group for notification option
3. Show summary of set being published
4. Display eligible attendee count
5. Handle API call with loading state
6. Show warning for empty question sets

**Acceptance Criteria:**
- [ ] Dialog shows question set name and question count
- [ ] Radio options for "Publish & Notify" vs "Publish Only"
- [ ] Shows count of attendees to be notified
- [ ] Prevents publishing empty sets
- [ ] Loading state during publish
- [ ] Success toast with notification count
- [ ] Error toast on failure
- [ ] Closes and refreshes on success

---

### Task 3.4: Create NotifyDialog Component

**Description:** Create the dialog for sending notifications to attendees for a published set.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.3 (notify API)
**Can run parallel with:** Task 3.3

**Location:** `src/components/events/question-sets/NotifyDialog.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionSet {
  id: string;
  title: string;
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface NotifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  questionSet: QuestionSet;
}

type FilterOption = 'all' | 'not_started' | 'in_progress';

export function NotifyDialog({
  isOpen,
  onClose,
  eventId,
  questionSet,
}: NotifyDialogProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isSending, setIsSending] = useState(false);

  const { total, completed, inProgress } = questionSet.completionStats;
  const notStarted = total - completed - inProgress;

  const getCount = (f: FilterOption) => {
    switch (f) {
      case 'all':
        return total - completed;
      case 'not_started':
        return notStarted;
      case 'in_progress':
        return inProgress;
    }
  };

  const handleSend = async () => {
    setIsSending(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/question-sets/${questionSet.id}/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to send notifications');
      }

      const data = await res.json();
      toast.success(`Sent ${data.notificationsSent} notifications`);
      onClose();
    } catch (error) {
      toast.error('Failed to send notifications');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Notifications</DialogTitle>
          <DialogDescription>
            Remind attendees about "{questionSet.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">
            Who should receive notifications?
          </Label>
          <RadioGroup
            value={filter}
            onValueChange={(v) => setFilter(v as FilterOption)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="font-medium">All who haven't completed</div>
                <div className="text-sm text-text-secondary">
                  {getCount('all')} attendees
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="not_started" id="not_started" />
              <Label htmlFor="not_started" className="flex-1 cursor-pointer">
                <div className="font-medium">Not started</div>
                <div className="text-sm text-text-secondary">
                  {getCount('not_started')} attendees
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-bg-secondary cursor-pointer">
              <RadioGroupItem value="in_progress" id="in_progress" />
              <Label htmlFor="in_progress" className="flex-1 cursor-pointer">
                <div className="font-medium">In progress</div>
                <div className="text-sm text-text-secondary">
                  {getCount('in_progress')} attendees
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || getCount(filter) === 0}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {getCount(filter)} attendees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Implementation Steps:**
1. Create `NotifyDialog.tsx`
2. Add filter options with counts
3. Disable sending when count is 0
4. Handle API call with loading state

**Acceptance Criteria:**
- [ ] Shows question set title
- [ ] Three filter options: all, not_started, in_progress
- [ ] Each option shows attendee count
- [ ] Button disabled when selected count is 0
- [ ] Loading state during send
- [ ] Success toast with count
- [ ] Closes on success

---

### Task 3.5: Create QuestionSetEditor Component

**Description:** Create the editor for creating/editing a question set with question management.
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.2

**Location:** `src/components/events/question-sets/QuestionSetEditor.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Save,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Question } from '@/lib/m33t/schemas';
import { QuestionEditorModal } from './QuestionEditorModal';

interface QuestionSetEditorProps {
  eventId: string;
  questionSet?: {
    id: string;
    internalId: string;
    title: string;
    description: string | null;
    questions: Question[];
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  };
  onBack: () => void;
}

function SortableQuestionItem({
  question,
  index,
  onEdit,
  onDelete,
  disabled,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-bg-secondary rounded-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-text-tertiary hover:text-text-secondary"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary font-mono">Q{index + 1}</span>
          <span className="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded">
            {question.type.replace('_', ' ')}
          </span>
          {question.required && (
            <span className="text-xs text-amber-400">Required</span>
          )}
        </div>
        <p className="font-medium text-sm mt-1 truncate">{question.title}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          disabled={disabled}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300"
          onClick={onDelete}
          disabled={disabled || question.locked}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function QuestionSetEditor({
  eventId,
  questionSet,
  onBack,
}: QuestionSetEditorProps) {
  const router = useRouter();
  const isEditing = !!questionSet;
  const isPublished = questionSet?.status === 'PUBLISHED';

  const [title, setTitle] = useState(questionSet?.title || '');
  const [description, setDescription] = useState(questionSet?.description || '');
  const [questions, setQuestions] = useState<Question[]>(
    questionSet?.questions || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((q, i) => ({
          ...q,
          order: i,
        }));
      });
    }
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);

    try {
      const url = isEditing
        ? `/api/events/${eventId}/question-sets/${questionSet.id}`
        : `/api/events/${eventId}/question-sets`;

      const method = isEditing ? 'PATCH' : 'POST';

      const body = isEditing
        ? { title, description: description || null, questions }
        : { title, description: description || null, questions };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(isEditing ? 'Question set updated' : 'Question set created');
      router.refresh();
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = (question: Question) => {
    setQuestions([...questions, { ...question, order: questions.length }]);
    setIsAddingQuestion(false);
  };

  const handleEditQuestion = (updatedQuestion: Question) => {
    setQuestions(
      questions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Question Set' : 'New Question Set'}
          </h2>
          {isEditing && (
            <p className="text-sm text-text-tertiary">
              {questionSet.internalId}
            </p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          className="bg-gold-primary hover:bg-gold-light"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Published Warning */}
      {isPublished && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400">
            This set is published. You can edit title and description but not
            questions.
          </span>
        </div>
      )}

      {/* Form */}
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Starter Questions, Deep Dive..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description shown to attendees..."
            rows={2}
          />
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Questions ({questions.length})</h3>
          {!isPublished && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingQuestion(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-text-secondary mb-3">No questions yet</p>
            {!isPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingQuestion(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <SortableQuestionItem
                    key={question.id}
                    question={question}
                    index={index}
                    onEdit={() => setEditingQuestion(question)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                    disabled={isPublished}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Question Editor Modal */}
      {(editingQuestion || isAddingQuestion) && (
        <QuestionEditorModal
          isOpen={true}
          onClose={() => {
            setEditingQuestion(null);
            setIsAddingQuestion(false);
          }}
          question={editingQuestion}
          onSave={editingQuestion ? handleEditQuestion : handleAddQuestion}
          existingIds={questions.map((q) => q.id)}
        />
      )}
    </div>
  );
}
```

**Implementation Steps:**
1. Create `QuestionSetEditor.tsx`
2. Implement title/description form
3. Add sortable question list
4. Prevent editing questions on published sets
5. Integrate with QuestionEditorModal
6. Handle create and update API calls

**Acceptance Criteria:**
- [ ] Title and description inputs work
- [ ] Questions list with drag-and-drop reorder
- [ ] Add question opens modal
- [ ] Edit question opens modal with existing data
- [ ] Delete question removes from list
- [ ] Published sets show warning and disable question editing
- [ ] Save creates new set or updates existing
- [ ] Back button returns to list
- [ ] Validation prevents saving without title

---

### Task 3.6: Create QuestionEditorModal Component

**Description:** Create the modal for adding/editing individual questions with type configuration.
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.5
**Can run parallel with:** None

**Location:** `src/components/events/question-sets/QuestionEditorModal.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Question, QuestionConfig } from '@/lib/m33t/schemas';
import { QUESTION_TYPES, QUESTION_CATEGORIES } from '@/lib/m33t/questions';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSave: (question: Question) => void;
  existingIds: string[];
}

type QuestionType = 'open_text' | 'slider' | 'single_select' | 'multi_select';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export function QuestionEditorModal({
  isOpen,
  onClose,
  question,
  onSave,
  existingIds,
}: QuestionEditorModalProps) {
  const isEditing = !!question;

  // Form state
  const [type, setType] = useState<QuestionType>(question?.type || 'open_text');
  const [category, setCategory] = useState(question?.category || 'GOALS');
  const [title, setTitle] = useState(question?.title || '');
  const [subtitle, setSubtitle] = useState(question?.subtitle || '');
  const [required, setRequired] = useState(question?.required ?? false);
  const [config, setConfig] = useState<QuestionConfig>(question?.config || {});

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      setType(question.type);
      setCategory(question.category);
      setTitle(question.title);
      setSubtitle(question.subtitle || '');
      setRequired(question.required);
      setConfig(question.config || {});
    } else {
      setType('open_text');
      setCategory('GOALS');
      setTitle('');
      setSubtitle('');
      setRequired(false);
      setConfig({});
    }
  }, [question]);

  // Options for select types
  const [options, setOptions] = useState<SelectOption[]>(
    (question?.config?.options as SelectOption[]) || [
      { value: '', label: '' },
    ]
  );

  const handleAddOption = () => {
    setOptions([...options, { value: '', label: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: keyof SelectOption,
    value: string
  ) => {
    setOptions(
      options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      )
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Build config based on type
    let finalConfig: QuestionConfig = { ...config };

    if (type === 'open_text') {
      finalConfig = {
        placeholder: config.placeholder || '',
        hint: config.hint || '',
      };
    } else if (type === 'slider') {
      finalConfig = {
        min: config.min || 0,
        max: config.max || 100,
        step: config.step || 1,
        leftLabel: config.leftLabel || '',
        rightLabel: config.rightLabel || '',
      };
    } else if (type === 'single_select' || type === 'multi_select') {
      finalConfig = {
        options: options.filter((o) => o.value && o.label),
        ...(type === 'multi_select' && { maxSelections: config.maxSelections }),
      };
    }

    const newQuestion: Question = {
      id: question?.id || nanoid(),
      type,
      category,
      title,
      subtitle: subtitle || undefined,
      required,
      locked: question?.locked || false,
      order: question?.order || 0,
      config: finalConfig,
    };

    onSave(newQuestion);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Question' : 'Add Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as QuestionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to ask?"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label>Subtitle (optional)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Additional context for the question"
            />
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Required</Label>
              <p className="text-xs text-text-secondary">
                Attendees must answer this question
              </p>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          {/* Type-specific config */}
          {type === 'open_text' && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={config.placeholder || ''}
                  onChange={(e) =>
                    setConfig({ ...config, placeholder: e.target.value })
                  }
                  placeholder="e.g., Type your answer here..."
                />
              </div>
              <div className="space-y-2">
                <Label>Hint</Label>
                <Input
                  value={config.hint || ''}
                  onChange={(e) =>
                    setConfig({ ...config, hint: e.target.value })
                  }
                  placeholder="Help text shown below the input"
                />
              </div>
            </div>
          )}

          {type === 'slider' && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Left Label</Label>
                  <Input
                    value={config.leftLabel || ''}
                    onChange={(e) =>
                      setConfig({ ...config, leftLabel: e.target.value })
                    }
                    placeholder="e.g., Strongly Disagree"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Right Label</Label>
                  <Input
                    value={config.rightLabel || ''}
                    onChange={(e) =>
                      setConfig({ ...config, rightLabel: e.target.value })
                    }
                    placeholder="e.g., Strongly Agree"
                  />
                </div>
              </div>
            </div>
          )}

          {(type === 'single_select' || type === 'multi_select') && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button variant="ghost" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.value}
                      onChange={(e) =>
                        handleOptionChange(index, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="w-24"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        handleOptionChange(index, 'label', e.target.value)
                      }
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      disabled={options.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {type === 'multi_select' && (
                <div className="space-y-2">
                  <Label>Max Selections</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.maxSelections || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maxSelections: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="No limit"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="bg-gold-primary hover:bg-gold-light"
          >
            {isEditing ? 'Update' : 'Add'} Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Implementation Steps:**
1. Create `QuestionEditorModal.tsx`
2. Implement type selector with all 4 types
3. Implement category selector
4. Add type-specific config sections
5. Handle options management for select types
6. Build final Question object on save

**Acceptance Criteria:**
- [ ] Modal opens for add/edit
- [ ] All 4 question types selectable
- [ ] All categories selectable
- [ ] Title and subtitle inputs
- [ ] Required toggle
- [ ] Open text: placeholder and hint config
- [ ] Slider: left/right labels
- [ ] Single/Multi select: dynamic options list
- [ ] Multi select: max selections config
- [ ] Save builds correct Question object
- [ ] Form resets properly between add/edit modes

---

### Task 3.7: Create CompletionStatsPanel Component

**Description:** Create the panel showing completion statistics for a question set.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2 (API for stats)
**Can run parallel with:** Task 3.3, 3.4

**Location:** `src/components/events/question-sets/CompletionStatsPanel.tsx`

**Technical Requirements:**

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendeeStatus {
  id: string;
  firstName: string;
  lastName: string | null;
  status: 'completed' | 'in_progress' | 'not_started';
  completedAt?: string;
}

interface CompletionStatsPanelProps {
  total: number;
  completed: number;
  inProgress: number;
  attendees?: AttendeeStatus[];
  showAttendeeList?: boolean;
}

export function CompletionStatsPanel({
  total,
  completed,
  inProgress,
  attendees,
  showAttendeeList = false,
}: CompletionStatsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const notStarted = total - completed - inProgress;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Completion Stats</h4>
        <span className="text-lg font-semibold text-gold-primary">
          {completionPercent}%
        </span>
      </div>

      <Progress value={completionPercent} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-2xl font-semibold text-emerald-400">
            {completed}
          </div>
          <div className="text-text-secondary">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-amber-400">
            {inProgress}
          </div>
          <div className="text-text-secondary">In Progress</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-zinc-400">
            {notStarted}
          </div>
          <div className="text-text-secondary">Not Started</div>
        </div>
      </div>

      {/* Attendee List (Optional) */}
      {showAttendeeList && attendees && attendees.length > 0 && (
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>Attendee Details</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between py-2 px-3 bg-bg-secondary rounded"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm">
                      {attendee.firstName} {attendee.lastName}
                    </span>
                  </div>
                  <Badge
                    className={cn(
                      'text-xs',
                      attendee.status === 'completed' &&
                        'bg-emerald-500/20 text-emerald-400',
                      attendee.status === 'in_progress' &&
                        'bg-amber-500/20 text-amber-400',
                      attendee.status === 'not_started' &&
                        'bg-zinc-500/20 text-zinc-400'
                    )}
                  >
                    {attendee.status === 'completed'
                      ? 'Completed'
                      : attendee.status === 'in_progress'
                        ? 'In Progress'
                        : 'Not Started'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

**Implementation Steps:**
1. Create `CompletionStatsPanel.tsx`
2. Add progress bar
3. Add stats breakdown
4. Add optional expandable attendee list

**Acceptance Criteria:**
- [ ] Shows percentage complete
- [ ] Progress bar reflects completion
- [ ] Three-column stats: completed, in progress, not started
- [ ] Optional attendee list with status badges
- [ ] List is collapsible
- [ ] Proper color coding for statuses

---

### Task 3.8: Create Barrel Export for Question Sets Components

**Description:** Create index.ts for clean exports of all question set components.
**Size:** Small
**Priority:** Low
**Dependencies:** Tasks 3.1-3.7
**Can run parallel with:** None

**Location:** `src/components/events/question-sets/index.ts`

**Technical Requirements:**

```typescript
export { QuestionSetCard } from './QuestionSetCard';
export { QuestionSetsManager } from './QuestionSetsManager';
export { QuestionSetEditor } from './QuestionSetEditor';
export { QuestionEditorModal } from './QuestionEditorModal';
export { PublishDialog } from './PublishDialog';
export { NotifyDialog } from './NotifyDialog';
export { CompletionStatsPanel } from './CompletionStatsPanel';
```

**Acceptance Criteria:**
- [ ] All components exported from index.ts
- [ ] Can import with `import { QuestionSetsManager } from '@/components/events/question-sets'`

---

## Phase 4: Integration

### Task 4.1: Integrate QuestionSetsManager into Event Detail Page

**Description:** Add QuestionSetsManager to the event management page.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.2
**Can run parallel with:** Task 4.2

**Implementation Steps:**
1. Find the event detail/management page
2. Add QuestionSetsManager component
3. Fetch question sets data server-side
4. Wire up create/edit navigation

**Acceptance Criteria:**
- [ ] Question sets section visible on event page
- [ ] List loads with completion stats
- [ ] Actions work (edit, publish, notify, delete)
- [ ] Create navigates to editor

---

### Task 4.2: Update Event Wizard QuestionsStep

**Description:** Update the wizard questions step to create a default question set.
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1 (API)
**Can run parallel with:** Task 4.1

**Location:** Need to find existing `QuestionsStep.tsx` or create new

**Technical Requirements:**

During event creation:
1. Create one default DRAFT question set titled "Initial Questions"
2. Pre-populate with REQUIRED_QUESTIONS from `@/lib/m33t/questions`
3. Show simplified QuestionSetEditor inline

**Acceptance Criteria:**
- [ ] New events get default question set
- [ ] Default set contains required questions
- [ ] Can edit questions during creation
- [ ] Set saved when event created

---

## Summary

**Total Tasks:** 14
**Phases:** 4

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1 | Database schema changes |
| 2 | 4 | Core CRUD and publishing APIs |
| 3 | 8 | UI components |
| 4 | 2 | Integration |

**Critical Path:**
1. Task 1.1 → Task 2.1 → Tasks 2.2/2.3/2.4 (parallel) → Task 3.1 → Tasks 3.2/3.5 (parallel) → Integration

**Parallel Execution Opportunities:**
- After Task 2.1: Tasks 2.2, 2.3, 2.4 can run in parallel
- After Task 3.1: Tasks 3.2, 3.3, 3.4, 3.5, 3.7 can run in parallel
- Tasks 4.1 and 4.2 can run in parallel
