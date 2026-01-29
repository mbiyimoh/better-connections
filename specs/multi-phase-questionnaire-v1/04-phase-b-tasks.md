# Multi-Phase Questionnaire - Phase B Task Breakdown

## Overview

Phase B implements the attendee-facing experience for multi-phase questionnaires:
- Attendee API endpoints for accessing and completing question sets
- Auto-save and resume functionality
- AI-powered profile suggestion generation
- Profile suggestion review UI
- Question set flow orchestration
- Integration with existing RSVP pages

**Depends On:** Phase A (complete)

---

## Phase 1: Attendee API Endpoints

### Task B1.1: Question Sets List API

**Description:** Create endpoint for attendees to list available question sets with their status.
**Size:** Medium
**Priority:** High
**Dependencies:** Phase A complete

**Location:** `src/app/api/rsvp/[token]/question-sets/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRSVPToken } from '@/lib/m33t/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token and get attendee
  const validation = await validateRSVPToken(token);
  if (!validation.valid || !validation.attendee) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { attendee, event } = validation;

  // Only CONFIRMED attendees can access question sets
  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Must be confirmed to access questions' }, { status: 403 });
  }

  // Get all PUBLISHED question sets for the event
  const questionSets = await prisma.questionSet.findMany({
    where: {
      eventId: event.id,
      status: 'PUBLISHED',
    },
    orderBy: { order: 'asc' },
    include: {
      responses: {
        where: { attendeeId: attendee.id },
        select: {
          responses: true,
          completedAt: true,
          startedAt: true,
        },
      },
    },
  });

  // Format response with status per set
  const formattedSets = questionSets.map((set) => {
    const response = set.responses[0];
    const questions = set.questions as unknown[];
    const questionsArray = Array.isArray(questions) ? questions : [];
    const responsesArray = response?.responses as unknown[];
    const answeredCount = Array.isArray(responsesArray) ? responsesArray.length : 0;

    let status: 'not_started' | 'in_progress' | 'completed';
    if (response?.completedAt) {
      status = 'completed';
    } else if (response?.startedAt) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }

    return {
      id: set.id,
      internalId: set.internalId,
      title: set.title,
      description: set.description,
      questionCount: questionsArray.length,
      order: set.order,
      status,
      completedAt: response?.completedAt?.toISOString() || null,
      answeredCount,
    };
  });

  // Find the next set to complete
  const nextSet = formattedSets.find((s) => s.status !== 'completed');

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
    },
    attendee: {
      id: attendee.id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
    },
    questionSets: formattedSets,
    nextSetId: nextSet?.id || null,
  });
}
```

**Acceptance Criteria:**
- [ ] Returns only PUBLISHED question sets
- [ ] Status per set: not_started, in_progress, completed
- [ ] Includes answeredCount for progress display
- [ ] Returns nextSetId (first incomplete set)
- [ ] Only CONFIRMED attendees can access

---

### Task B1.2: Single Question Set API

**Description:** Get a specific question set with questions and attendee's saved responses.
**Size:** Medium
**Priority:** High
**Dependencies:** Task B1.1

**Location:** `src/app/api/rsvp/[token]/question-sets/[setId]/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateRSVPToken } from '@/lib/m33t/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; setId: string }> }
) {
  const { token, setId } = await params;

  const validation = await validateRSVPToken(token);
  if (!validation.valid || !validation.attendee) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { attendee, event } = validation;

  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Must be confirmed' }, { status: 403 });
  }

  // Get the question set
  const questionSet = await prisma.questionSet.findFirst({
    where: {
      id: setId,
      eventId: event.id,
      status: 'PUBLISHED',
    },
    include: {
      responses: {
        where: { attendeeId: attendee.id },
        select: {
          responses: true,
          completedAt: true,
          startedAt: true,
        },
      },
    },
  });

  if (!questionSet) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
  }

  const questions = questionSet.questions as unknown[];
  const questionsArray = Array.isArray(questions) ? questions : [];
  const savedResponse = questionSet.responses[0];
  const savedResponses = savedResponse?.responses as unknown[];
  const responsesArray = Array.isArray(savedResponses) ? savedResponses : [];

  // Calculate progress
  const answeredIds = new Set(
    responsesArray
      .filter((r): r is { questionId: string } => typeof r === 'object' && r !== null && 'questionId' in r)
      .map((r) => r.questionId)
  );

  const currentIndex = questionsArray.findIndex(
    (q): q is { id: string } => typeof q === 'object' && q !== null && 'id' in q && !answeredIds.has(q.id)
  );

  return NextResponse.json({
    questionSet: {
      id: questionSet.id,
      internalId: questionSet.internalId,
      title: questionSet.title,
      description: questionSet.description,
      questions: questionsArray,
    },
    responses: responsesArray,
    progress: {
      total: questionsArray.length,
      answered: answeredIds.size,
      currentIndex: currentIndex === -1 ? questionsArray.length : currentIndex,
    },
  });
}
```

**Acceptance Criteria:**
- [ ] Returns full questions array
- [ ] Returns saved responses if any
- [ ] Calculates progress (answered count, current index)
- [ ] Only returns PUBLISHED sets
- [ ] 404 if set not found or not published

---

### Task B1.3: Save Responses API (Auto-Save)

**Description:** Auto-save responses as attendee answers questions.
**Size:** Medium
**Priority:** High
**Dependencies:** Task B1.2

**Location:** `src/app/api/rsvp/[token]/question-sets/[setId]/save/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateRSVPToken } from '@/lib/m33t/tokens';

const saveResponsesSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
    context: z.string().optional(),
  })),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; setId: string }> }
) {
  const { token, setId } = await params;

  const validation = await validateRSVPToken(token);
  if (!validation.valid || !validation.attendee) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { attendee, event } = validation;

  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Must be confirmed' }, { status: 403 });
  }

  // Validate body
  const body = await req.json();
  const result = saveResponsesSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify question set exists and is published
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId: event.id, status: 'PUBLISHED' },
  });

  if (!questionSet) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
  }

  // Get existing response record or create new
  const existingResponse = await prisma.questionSetResponse.findUnique({
    where: {
      questionSetId_attendeeId: {
        questionSetId: setId,
        attendeeId: attendee.id,
      },
    },
  });

  const existingResponses = existingResponse?.responses as unknown[];
  const existingArray = Array.isArray(existingResponses) ? existingResponses : [];

  // Merge new responses with existing (update if questionId matches)
  const newResponses = result.data.responses;
  const mergedResponses = [...existingArray];

  for (const newResp of newResponses) {
    const existingIdx = mergedResponses.findIndex(
      (r): r is { questionId: string } =>
        typeof r === 'object' && r !== null && 'questionId' in r && r.questionId === newResp.questionId
    );

    const responseWithTimestamp = {
      ...newResp,
      answeredAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      mergedResponses[existingIdx] = responseWithTimestamp;
    } else {
      mergedResponses.push(responseWithTimestamp);
    }
  }

  // Upsert the response record
  await prisma.questionSetResponse.upsert({
    where: {
      questionSetId_attendeeId: {
        questionSetId: setId,
        attendeeId: attendee.id,
      },
    },
    create: {
      questionSetId: setId,
      attendeeId: attendee.id,
      responses: mergedResponses,
      startedAt: new Date(),
    },
    update: {
      responses: mergedResponses,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    saved: newResponses.length,
  });
}
```

**Acceptance Criteria:**
- [ ] Merges new responses with existing (doesn't replace all)
- [ ] Sets startedAt on first save
- [ ] Updates answeredAt timestamp per response
- [ ] Does NOT set completedAt (that's the complete endpoint)
- [ ] Validates question set exists and is published

---

### Task B1.4: Complete Set API

**Description:** Mark a question set as completed and trigger profile suggestion generation.
**Size:** Large
**Priority:** High
**Dependencies:** Task B1.3, Task B2.1

**Location:** `src/app/api/rsvp/[token]/question-sets/[setId]/complete/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateRSVPToken } from '@/lib/m33t/tokens';
import { generateProfileSuggestions } from '@/lib/m33t/profile-suggestions';

const completeSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
    context: z.string().optional(),
  })),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; setId: string }> }
) {
  const { token, setId } = await params;

  const validation = await validateRSVPToken(token);
  if (!validation.valid || !validation.attendee) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { attendee, event } = validation;

  if (attendee.rsvpStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Must be confirmed' }, { status: 403 });
  }

  const body = await req.json();
  const result = completeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Get question set with questions
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId: event.id, status: 'PUBLISHED' },
  });

  if (!questionSet) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
  }

  // Validate required questions are answered
  const questions = questionSet.questions as { id: string; required?: boolean }[];
  const responseMap = new Map(result.data.responses.map(r => [r.questionId, r.value]));

  const missingRequired = questions.filter(q => q.required && !responseMap.has(q.id));
  if (missingRequired.length > 0) {
    return NextResponse.json({
      error: 'Missing required questions',
      missingIds: missingRequired.map(q => q.id),
    }, { status: 400 });
  }

  // Save final responses and mark as completed
  const completedAt = new Date();

  await prisma.questionSetResponse.upsert({
    where: {
      questionSetId_attendeeId: {
        questionSetId: setId,
        attendeeId: attendee.id,
      },
    },
    create: {
      questionSetId: setId,
      attendeeId: attendee.id,
      responses: result.data.responses.map(r => ({
        ...r,
        answeredAt: completedAt.toISOString(),
      })),
      startedAt: completedAt,
      completedAt,
    },
    update: {
      responses: result.data.responses.map(r => ({
        ...r,
        answeredAt: completedAt.toISOString(),
      })),
      completedAt,
    },
  });

  // Get current profile for suggestion generation
  const fullAttendee = await prisma.eventAttendee.findUnique({
    where: { id: attendee.id },
    select: { profile: true, profileOverrides: true },
  });

  // Generate profile suggestions
  const profileSuggestions = await generateProfileSuggestions({
    currentProfile: fullAttendee?.profile as Record<string, unknown> || {},
    profileOverrides: fullAttendee?.profileOverrides as Record<string, unknown> || {},
    questions,
    responses: result.data.responses,
    questionSetId: setId,
  });

  // Check for next set
  const nextSet = await prisma.questionSet.findFirst({
    where: {
      eventId: event.id,
      status: 'PUBLISHED',
      id: { not: setId },
      responses: {
        none: {
          attendeeId: attendee.id,
          completedAt: { not: null },
        },
      },
    },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    completedAt: completedAt.toISOString(),
    profileSuggestions,
    nextSetId: nextSet?.id || null,
  });
}
```

**Acceptance Criteria:**
- [ ] Validates all required questions are answered
- [ ] Sets completedAt timestamp
- [ ] Generates profile suggestions via AI
- [ ] Returns nextSetId for navigation
- [ ] Returns 400 if required questions missing

---

## Phase 2: Profile Suggestion System

### Task B2.1: Profile Suggestion Generator

**Description:** Create AI-powered system to generate profile update suggestions from responses.
**Size:** Large
**Priority:** High
**Dependencies:** Task B1.3

**Locations:**
- `src/lib/m33t/profile-suggestions.ts`
- `src/lib/m33t/suggestion-schema.ts`

**Technical Requirements:**

```typescript
// src/lib/m33t/suggestion-schema.ts
import { z } from 'zod';

export const ProfileSuggestionSchema = z.object({
  field: z.enum([
    'expertise',
    'seekingKeywords',
    'offeringKeywords',
    'currentFocus',
    'role',
    'company',
    'conversationHooks',
  ]),
  action: z.enum(['add', 'update', 'replace']),
  currentValue: z.union([z.string(), z.array(z.string()), z.null()]),
  suggestedValue: z.union([z.string(), z.array(z.string())]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  source: z.object({
    questionSetId: z.string(),
    questionId: z.string(),
  }),
});

export type ProfileSuggestion = z.infer<typeof ProfileSuggestionSchema>;

// src/lib/m33t/profile-suggestions.ts
import OpenAI from 'openai';
import type { ProfileSuggestion } from './suggestion-schema';

const openai = new OpenAI();

interface GenerateSuggestionsInput {
  currentProfile: Record<string, unknown>;
  profileOverrides: Record<string, unknown>;
  questions: { id: string; title: string; type: string; category: string }[];
  responses: { questionId: string; value: string | number | string[] }[];
  questionSetId: string;
}

export async function generateProfileSuggestions(
  input: GenerateSuggestionsInput
): Promise<ProfileSuggestion[]> {
  const { currentProfile, profileOverrides, questions, responses, questionSetId } = input;

  const systemPrompt = `You are analyzing questionnaire responses to suggest profile updates for an event networking platform.

Current profile:
${JSON.stringify(currentProfile, null, 2)}

Organizer overrides (DO NOT suggest changes to these):
${JSON.stringify(profileOverrides, null, 2)}

Guidelines:
- expertise: ADD new items, never remove existing
- seekingKeywords/offeringKeywords: ADD new, UPDATE if more specific
- currentFocus: UPDATE only if substantially different
- role/company: UPDATE only if empty or very high confidence (>0.9)
- conversationHooks: ADD new hooks

For each suggestion, provide:
- field: which profile field
- action: 'add', 'update', or 'replace'
- currentValue: what's there now (null if empty)
- suggestedValue: what to change to
- confidence: 0-1 score
- reason: why this suggestion
- source: which question prompted this

Return JSON array of suggestions. Be conservative - only suggest changes with clear evidence.`;

  const userPrompt = `Questions and responses:
${questions.map(q => {
  const response = responses.find(r => r.questionId === q.id);
  return `Q (${q.category}): ${q.title}\nA: ${JSON.stringify(response?.value || 'No response')}`;
}).join('\n\n')}

Generate profile update suggestions based on these responses.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  try {
    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    // Add questionSetId to source
    return suggestions.map((s: ProfileSuggestion) => ({
      ...s,
      source: { ...s.source, questionSetId },
    }));
  } catch (error) {
    console.error('Failed to parse suggestions:', error);
    return [];
  }
}
```

**Acceptance Criteria:**
- [ ] Generates suggestions based on responses
- [ ] Respects organizer overrides (doesn't suggest changes)
- [ ] Follows field-specific action logic
- [ ] Includes confidence scores
- [ ] Provides reason for each suggestion
- [ ] Links suggestions to source questions

---

### Task B2.2: Apply Suggestions API

**Description:** API endpoint to apply accepted profile suggestions.
**Size:** Medium
**Priority:** High
**Dependencies:** Task B2.1

**Location:** `src/app/api/rsvp/[token]/profile-suggestions/apply/route.ts`

**Technical Requirements:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateRSVPToken } from '@/lib/m33t/tokens';

const applySchema = z.object({
  acceptedSuggestions: z.array(z.object({
    field: z.string(),
    value: z.union([z.string(), z.array(z.string())]),
  })),
  rejectedFields: z.array(z.string()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const validation = await validateRSVPToken(token);
  if (!validation.valid || !validation.attendee) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { attendee } = validation;

  const body = await req.json();
  const result = applySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Get current profile
  const currentAttendee = await prisma.eventAttendee.findUnique({
    where: { id: attendee.id },
    select: { profile: true },
  });

  const currentProfile = (currentAttendee?.profile || {}) as Record<string, unknown>;
  const updatedProfile = { ...currentProfile };

  // Apply each accepted suggestion
  for (const suggestion of result.data.acceptedSuggestions) {
    const { field, value } = suggestion;

    // Handle array fields (merge, don't replace)
    if (Array.isArray(value)) {
      const existing = updatedProfile[field];
      if (Array.isArray(existing)) {
        // Merge and dedupe
        const combined = [...new Set([...existing as string[], ...value])];
        updatedProfile[field] = combined;
      } else {
        updatedProfile[field] = value;
      }
    } else {
      updatedProfile[field] = value;
    }
  }

  // Update the profile
  await prisma.eventAttendee.update({
    where: { id: attendee.id },
    data: { profile: updatedProfile },
  });

  return NextResponse.json({
    success: true,
    updatedFields: result.data.acceptedSuggestions.map(s => s.field),
    profile: updatedProfile,
  });
}
```

**Acceptance Criteria:**
- [ ] Merges array fields (don't replace)
- [ ] Updates profile with accepted suggestions
- [ ] Returns updated fields list
- [ ] Returns full updated profile

---

## Phase 3: UI Components

### Task B3.1: QuestionSetFlow Component

**Description:** Main orchestrator for the multi-set questionnaire experience.
**Size:** Large
**Priority:** High
**Dependencies:** Tasks B1.1, B1.2, B1.4

**Location:** `src/components/m33t/questionnaire/QuestionSetFlow.tsx`

**Features:**
- Fetches available question sets
- Determines next set to show
- Handles set transitions
- Shows suggestions after each set
- Completion state when all done

---

### Task B3.2: QuestionSetQuestionnaire Component

**Description:** Single-set question answering UI with auto-save.
**Size:** Large
**Priority:** High
**Dependencies:** Task B1.3

**Location:** `src/components/m33t/questionnaire/QuestionSetQuestionnaire.tsx`

**Features:**
- One question at a time display
- Progress bar
- Auto-save on each answer (debounced)
- Previous/Next navigation
- Resume from first unanswered
- Complete Set button

---

### Task B3.3: SetProgressIndicator Component

**Description:** Visual indicator showing progress across multiple sets.
**Size:** Small
**Priority:** Medium
**Dependencies:** Task B3.1

**Location:** `src/components/m33t/questionnaire/SetProgressIndicator.tsx`

**Features:**
- Horizontal steps showing all sets
- Completed checkmarks
- Current set highlighted
- In-progress indicator

---

### Task B3.4: ProfileSuggestionReview Component

**Description:** Review and accept/reject AI-generated profile suggestions.
**Size:** Large
**Priority:** High
**Dependencies:** Task B2.1

**Location:** `src/components/m33t/questionnaire/ProfileSuggestionReview.tsx`

**Features:**
- Card per suggestion
- Accept/Reject buttons
- Current vs suggested value display
- Confidence indicator
- Reason text
- Bulk actions (Accept All / Reject All)
- Skip option

---

### Task B3.5: SuggestionCard Component

**Description:** Individual suggestion card for the review screen.
**Size:** Medium
**Priority:** High
**Dependencies:** Task B3.4

**Location:** `src/components/m33t/questionnaire/SuggestionCard.tsx`

**Features:**
- Field name with icon
- Current value (strikethrough if updating)
- Suggested value (highlighted)
- Confidence badge
- Reason/source info
- Accept/Reject buttons

---

### Task B3.6: SetCompletionCelebration Component

**Description:** Celebration UI shown after completing a set.
**Size:** Small
**Priority:** Low
**Dependencies:** Task B3.1

**Location:** `src/components/m33t/questionnaire/SetCompletionCelebration.tsx`

**Features:**
- Animated celebration
- Set title "completed!"
- Quick preview of suggestions count
- Continue button

---

## Phase 4: Page Integration

### Task B4.1: Update Questionnaire Page

**Description:** Update existing questionnaire page to use multi-set flow.
**Size:** Large
**Priority:** High
**Dependencies:** Tasks B3.1, B3.2, B3.4

**Location:** `src/app/rsvp/[token]/questionnaire/page.tsx`

**Changes:**
- Replace single-set logic with QuestionSetFlow
- Handle multi-set navigation
- Add suggestion review between sets

---

### Task B4.2: Question Sets Overview Page

**Description:** New landing page showing all question sets and status.
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task B1.1

**Location:** `src/app/rsvp/[token]/questions/page.tsx`

**Features:**
- List all sets with status
- Progress per set
- Start/Continue buttons
- Overall completion status

---

### Task B4.3: Guest Dashboard Integration

**Description:** Add questionnaire status to guest event view.
**Size:** Medium
**Priority:** Low
**Dependencies:** Task B1.1

**Location:** Update `src/app/guest/events/[eventId]/page.tsx`

**Features:**
- Questionnaire completion status card
- Link to complete remaining sets
- Progress indicator

---

## Phase 5: Component Barrel Exports

### Task B5.1: Create Questionnaire Components Index

**Description:** Barrel export for all questionnaire components.
**Size:** Small
**Priority:** Low
**Dependencies:** All Phase 3 tasks

**Location:** `src/components/m33t/questionnaire/index.ts`

```typescript
export { QuestionSetFlow } from './QuestionSetFlow';
export { QuestionSetQuestionnaire } from './QuestionSetQuestionnaire';
export { SetProgressIndicator } from './SetProgressIndicator';
export { ProfileSuggestionReview } from './ProfileSuggestionReview';
export { SuggestionCard } from './SuggestionCard';
export { SetCompletionCelebration } from './SetCompletionCelebration';
```

---

## Summary

**Total Tasks:** 15
**Phases:** 5

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 4 | Attendee API endpoints |
| 2 | 2 | Profile suggestion system |
| 3 | 6 | UI components |
| 4 | 3 | Page integration |
| 5 | 1 | Barrel exports |

**Critical Path:**
1. B1.1 → B1.2 → B1.3 → B1.4
2. B2.1 → B2.2
3. B3.1 → B3.2 → B3.4 → B4.1

**Parallel Execution Opportunities:**
- After B1.3: B1.4 and B2.1 can run in parallel
- B3.3, B3.5, B3.6 can run in parallel after B3.1
- B4.2 and B4.3 can run in parallel after B1.1

**Estimated Complexity:**
- Phase 1: Medium-High (API + validation logic)
- Phase 2: High (AI integration, prompt engineering)
- Phase 3: Medium-High (Multiple components, state management)
- Phase 4: Medium (Integration with existing pages)
- Phase 5: Low (Simple exports)
