# Task Breakdown: M33T Questionnaire Response Viewer

**Generated:** 2026-02-01
**Source:** specs/m33t-questionnaire-response-viewer/02-spec.md
**Mode:** Full
**Last Decompose:** 2026-02-01

---

## Overview

Build a questionnaire response viewer that lets event organizers view attendee answers to published question sets. Dual-view toggle (by-question aggregate / by-attendee individual), single API call, no re-fetch on toggle. Entry point: "View Responses" in QuestionSetCard dropdown.

**Total Tasks:** 10
**Phases:** 4

---

## Phase 1: Core Infrastructure

### Task 1.1: Create response aggregation utility
**Description:** Build server-side aggregation logic for all 5 question types
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Technical Requirements:**

Create `src/lib/m33t/response-aggregation.ts` with the following:

```typescript
import type { Question } from '@/lib/m33t/schemas';

// Discriminated union for type-specific aggregation results
type QuestionAggregation =
  | { type: 'single_select'; counts: Record<string, number>; total: number }
  | { type: 'multi_select'; counts: Record<string, number>; total: number }
  | { type: 'slider'; average: number; min: number; max: number; total: number }
  | { type: 'ranking'; averageRanks: Array<{ value: string; label: string; averageRank: number }>; total: number }
  | { type: 'open_text'; total: number };

interface ResponseItem {
  questionId: string;
  value: string | number | string[];
  context?: string;
  answeredAt: string;
}

export function computeAggregation(
  question: Question,
  values: Array<string | number | string[]>
): QuestionAggregation
```

**Aggregation logic per type:**

- **single_select:** Count occurrences of each option value string. `total` = number of responses.
- **multi_select:** Iterate each response's `string[]`, count each option value across all responses. `total` = number of respondents (not total selections).
- **slider:** Parse numeric values, compute `average` (rounded to 1 decimal), `min`, `max`. `total` = count of numeric values.
- **ranking:** For each respondent's ranked array, assign rank index (0-based) to each option value. Compute average rank per option across all respondents. Sort by ascending average rank. Map to `{ value, label, averageRank }` using `question.config.options`. `total` = number of respondents.
- **open_text:** Return `{ type: 'open_text', total: values.length }`. No further aggregation.

**Edge cases:**
- Empty values array → return type-appropriate empty result (counts={}, total=0, etc.)
- Missing or null values within array → skip that entry
- Slider with non-numeric strings → skip that entry
- Ranking with different array lengths → use only positions present

**Acceptance Criteria:**
- [ ] `single_select` counts options correctly with 10+ responses
- [ ] `multi_select` counts each selected option independently, total = respondent count
- [ ] `slider` computes correct average, min, max; handles single response
- [ ] `ranking` computes correct average ranks, sorts ascending
- [ ] `open_text` returns only total count
- [ ] Empty response arrays return zero-valued results without errors
- [ ] Unexpected/missing values are silently skipped

---

### Task 1.2: Create API endpoint for responses
**Description:** Build GET endpoint that returns both view groupings in a single response
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1 (response-aggregation.ts)
**Can run parallel with:** None (depends on 1.1)

**File:** `src/app/api/events/[eventId]/question-sets/[setId]/responses/route.ts`

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';
import { computeAggregation } from '@/lib/m33t/response-aggregation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await checkEventAccess(eventId, user.id, 'view');
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch question set (validate belongs to event, not DRAFT)
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId, status: { not: 'DRAFT' } },
  });
  if (!questionSet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch all responses with attendee info
  const questionSetResponses = await prisma.questionSetResponse.findMany({
    where: { questionSetId: setId },
    include: {
      attendee: {
        select: { id: true, firstName: true, lastName: true, email: true, rsvpStatus: true },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  // Count total CONFIRMED attendees
  const totalAttendees = await prisma.eventAttendee.count({
    where: { eventId, rsvpStatus: 'CONFIRMED' },
  });

  // Parse questions from JSON
  const questions = questionSet.questions as unknown as Question[];

  // Build summary
  const completed = questionSetResponses.filter(r => r.completedAt !== null).length;
  const inProgress = questionSetResponses.filter(r => r.completedAt === null).length;
  const summary = {
    totalAttendees,
    completed,
    inProgress,
    notStarted: Math.max(0, totalAttendees - completed - inProgress),
    completionRate: totalAttendees > 0 ? Math.round((completed / totalAttendees) * 100) : 0,
  };

  // Build responsesByQuestion
  const responsesByQuestion = questions.map(question => {
    const responsesForQuestion: Array<{
      attendeeId: string;
      attendeeName: string;
      value: string | number | string[];
      context: string | null;
      answeredAt: string;
      isCompleted: boolean;
    }> = [];

    for (const qsr of questionSetResponses) {
      const items = qsr.responses as unknown as ResponseItem[];
      const item = items.find(r => r.questionId === question.id);
      if (!item) continue;

      const attendee = qsr.attendee;
      const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') || 'Anonymous';

      responsesForQuestion.push({
        attendeeId: attendee.id,
        attendeeName: name,
        value: item.value,
        context: item.context ?? null,
        answeredAt: item.answeredAt,
        isCompleted: qsr.completedAt !== null,
      });
    }

    // Sort by answeredAt descending (most recent first)
    responsesForQuestion.sort((a, b) =>
      new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
    );

    const values = responsesForQuestion.map(r => r.value);
    const aggregation = computeAggregation(question, values);

    return { question, responses: responsesForQuestion, aggregation };
  });

  // Build responsesByAttendee
  const responsesByAttendee = questionSetResponses.map(qsr => {
    const attendee = qsr.attendee;
    const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') || 'Anonymous';
    const items = qsr.responses as unknown as ResponseItem[];

    const responses = questions.map(question => {
      const item = items.find(r => r.questionId === question.id);
      return {
        question,
        value: item?.value ?? null,
        context: item?.context ?? null,
      };
    });

    return {
      attendee: {
        id: attendee.id,
        name,
        email: attendee.email,
        completedAt: qsr.completedAt?.toISOString() ?? null,
        startedAt: qsr.startedAt.toISOString(),
      },
      responses,
    };
  });

  return NextResponse.json({
    questionSet: {
      id: questionSet.id,
      title: questionSet.title,
      description: questionSet.description,
      status: questionSet.status,
      publishedAt: questionSet.publishedAt?.toISOString() ?? null,
    },
    summary,
    responsesByQuestion,
    responsesByAttendee,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
```

**Acceptance Criteria:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 404 for non-existent set, wrong event, or DRAFT status
- [ ] `summary.totalAttendees` counts only CONFIRMED attendees
- [ ] `summary.notStarted` = totalAttendees - completed - inProgress (never negative)
- [ ] `responsesByQuestion` groups responses correctly by questionId
- [ ] `responsesByAttendee` includes all questions (null value for unanswered)
- [ ] Responses sorted by answeredAt descending in by-question view
- [ ] Attendee name falls back to "Anonymous" when no firstName
- [ ] `Cache-Control: no-store` header set
- [ ] Returns ARCHIVED sets (they have responses worth viewing)

---

## Phase 2: By-Question View

### Task 2.1: Create page shell and client component
**Description:** Create the responses page with auth guard, data fetching, view toggle, and summary header
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2 (API endpoint)
**Can run parallel with:** None

**Files to create:**

1. `src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/page.tsx` -- Client component (dashboard layout handles auth):

```typescript
'use client';

import { useParams } from 'next/navigation';
import { ResponsesPageClient } from './ResponsesPageClient';

export default function ResponsesPage() {
  const params = useParams<{ eventId: string; setId: string }>();
  return <ResponsesPageClient eventId={params.eventId} setId={params.setId} />;
}
```

2. `src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/ResponsesPageClient.tsx`:

State management:
```typescript
const [data, setData] = useState<ResponsesAPIResponse | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [activeView, setActiveView] = useState<'by-question' | 'by-attendee'>('by-question');
const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
```

- Fetch from `/api/events/${eventId}/question-sets/${setId}/responses` on mount
- Store both groupings in state simultaneously
- Render: BackButton → page title "Responses: {questionSet.title}" → ResponsesSummaryHeader → ResponsesViewToggle → active view component
- Loading state: skeleton cards
- Error state: error message with retry button
- Empty state: "No responses have been submitted yet."

3. `src/components/events/question-sets/responses/ResponsesSummaryHeader.tsx`:

4 metric cards in `grid grid-cols-2 md:grid-cols-4 gap-3`:
- Total Attendees (zinc icon, `summary.totalAttendees`)
- Completed (emerald icon/text, `summary.completed`)
- In Progress (gold icon/text, `summary.inProgress`)
- Not Started (zinc, `summary.notStarted`)

Below: `<p className="text-sm text-text-secondary">{summary.completionRate}% completion rate</p>`

4. `src/components/events/question-sets/responses/ResponsesViewToggle.tsx`:

Two buttons with Framer Motion `layoutId="responses-view-indicator"` for animated gold underline:
```typescript
interface ResponsesViewToggleProps {
  activeView: 'by-question' | 'by-attendee';
  onViewChange: (view: 'by-question' | 'by-attendee') => void;
}
```

**Acceptance Criteria:**
- [ ] Page loads and fetches data from API
- [ ] Summary header shows correct counts
- [ ] View toggle switches between views without re-fetch
- [ ] Loading skeleton shown during fetch
- [ ] Error state shown with retry on API failure
- [ ] Empty state shown when no responses exist
- [ ] Back button navigates to `/events/[eventId]`

---

### Task 2.2: Build by-question view with aggregation display
**Description:** Create the by-question view showing question cards with type-specific aggregation and individual responses
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1 (page shell)
**Can run parallel with:** None

**Files to create:**

1. `src/components/events/question-sets/responses/ByQuestionView.tsx`:

Container that maps over `responsesByQuestion` array and renders a `QuestionResponseCard` for each.

2. `src/components/events/question-sets/responses/QuestionResponseCard.tsx`:

Structure per card:
- Question header: type badge + title + subtitle
- AggregationDisplay (type-specific)
- Individual responses list

Type badge colors:
```typescript
const TYPE_BADGE_STYLES: Record<string, string> = {
  open_text: 'bg-blue-500/20 text-blue-400',
  single_select: 'bg-purple-500/20 text-purple-400',
  multi_select: 'bg-indigo-500/20 text-indigo-400',
  slider: 'bg-amber-500/20 text-amber-400',
  ranking: 'bg-emerald-500/20 text-emerald-400',
};
```

For open_text: show first 5 responses, then "Show all N responses" button using `useState` toggle.

Individual response items show:
- Attendee name + relative timestamp
- "In Progress" gold badge if `isCompleted === false`
- Formatted value (use `formatResponseValue` from spec)
- Context string below value if present (italic, text-text-tertiary)

3. `src/components/events/question-sets/responses/AggregationDisplay.tsx`:

Switch on `aggregation.type`:

**single_select / multi_select:**
```tsx
// For each option in question.config.options:
<div className="flex items-center gap-3">
  <span className="w-32 truncate text-sm text-text-secondary">{option.label}</span>
  <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
    <div className="h-full rounded-full bg-gold-primary" style={{ width: `${pct}%` }} />
  </div>
  <span className="text-sm text-text-secondary w-20 text-right">{pct}% ({count})</span>
</div>
```
Percentage = `Math.round((count / total) * 100)` (guard division by zero).

**slider:**
```tsx
<div className="flex gap-6 text-sm">
  <span>Average: <strong>{aggregation.average.toFixed(1)}</strong></span>
  <span>Min: {aggregation.min}</span>
  <span>Max: {aggregation.max}</span>
  <span className="text-text-tertiary">{aggregation.total} responses</span>
</div>
```

**ranking:**
Ordered list sorted by ascending averageRank:
```tsx
{aggregation.averageRanks.map((item, i) => (
  <div key={item.value} className="flex items-center gap-2 text-sm">
    <span className="w-6 text-text-tertiary">{i + 1}.</span>
    <span className="text-text-primary">{item.label}</span>
    <span className="text-text-tertiary">(avg rank: {item.averageRank.toFixed(1)})</span>
  </div>
))}
```

**open_text:** No aggregation display (just the response list).

**Value formatting function** (include in a shared util or inline):
```typescript
function formatResponseValue(value: unknown, question: Question): string {
  if (value === null || value === undefined) return 'No answer';
  switch (question.type) {
    case 'single_select': {
      const opt = question.config?.options?.find(o => o.value === value);
      return opt?.label ?? String(value);
    }
    case 'multi_select': {
      const vals = Array.isArray(value) ? value : [value];
      return vals.map(v => {
        const opt = question.config?.options?.find(o => o.value === v);
        return opt?.label ?? String(v);
      }).join(', ');
    }
    case 'slider': return String(value);
    case 'ranking': {
      const vals = Array.isArray(value) ? value : [];
      return vals.map((v, i) => {
        const opt = question.config?.options?.find(o => o.value === v);
        return `${i + 1}. ${opt?.label ?? v}`;
      }).join(', ');
    }
    default: return String(value);
  }
}
```

**Relative date formatting** -- extract from existing `ResearchRunTile.tsx` or create lightweight version:
```typescript
function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

**Acceptance Criteria:**
- [ ] Questions rendered in original order
- [ ] Type badges show correct color per question type
- [ ] single_select/multi_select show percentage bars with counts
- [ ] slider shows average/min/max stats
- [ ] ranking shows ordered list by average rank
- [ ] open_text shows first 5 responses, "Show all N" expander works
- [ ] Individual responses show attendee name, relative time, formatted value
- [ ] "In Progress" badge shown for incomplete responses
- [ ] Context string shown below value when present
- [ ] Division by zero handled (0 responses = 0%)

---

## Phase 3: By-Attendee View

### Task 3.1: Build attendee list component
**Description:** Create the clickable attendee list with status badges and selection state
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1 (page shell with activeView state)
**Can run parallel with:** Task 3.2

**File:** `src/components/events/question-sets/responses/AttendeeList.tsx`

```typescript
interface AttendeeListProps {
  attendees: AttendeeWithResponses[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  notStartedCount: number;
}
```

**Implementation:**
- Split attendees into `completed` (completedAt !== null) and `inProgress` (completedAt === null)
- Render completed first, then in-progress
- Each item: avatar circle (first letter, gold border if completed, zinc if in-progress) + name + status badge + relative timestamp + "N/M answered" count
- Selected item: `ring-2 ring-gold-primary bg-gold-subtle` highlight
- Click toggles selection (click same = deselect)
- Below list: `"{notStartedCount} attendees haven't started"` text if > 0

Status badges:
- Completed: `bg-emerald-500/20 text-emerald-400` "Completed"
- In Progress: `bg-gold-subtle text-gold-primary` "In Progress"

Questions answered count: count non-null values in `attendee.responses`.

**Acceptance Criteria:**
- [ ] Completed attendees listed before in-progress
- [ ] Avatar shows first letter of name, gold/zinc border by status
- [ ] Selected attendee highlighted with gold ring
- [ ] Click toggles selection on/off
- [ ] Status badges correctly colored
- [ ] "N/M answered" count accurate
- [ ] "X attendees haven't started" shown when notStartedCount > 0
- [ ] Handles 0 attendees (empty state)

---

### Task 3.2: Build attendee detail component
**Description:** Create the expanded view showing selected attendee's full responses
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1 (page shell)
**Can run parallel with:** Task 3.1

**File:** `src/components/events/question-sets/responses/AttendeeDetail.tsx`

```typescript
interface AttendeeDetailProps {
  attendee: AttendeeWithResponses;
  onClose: () => void;
}
```

**Implementation:**
- Header: name + completion status + date + email + Close button (X icon)
- Body: list of all questions with their answers
- For each question in `attendee.responses`:
  - If value is null: show "(skipped)" in `text-text-tertiary italic`
  - If value present: show formatted value using `formatResponseValue`
  - Show context below value if present
- Scrollable: `max-h-[60vh] overflow-y-auto`
- Auto-scroll into view on mount: `useEffect` with `ref.scrollIntoView({ behavior: 'smooth', block: 'start' })`

**Acceptance Criteria:**
- [ ] Shows attendee name, email, completion status and date
- [ ] Close button calls onClose
- [ ] All questions shown in order, with values or "(skipped)"
- [ ] Context displayed when present
- [ ] Auto-scrolls into view when rendered
- [ ] Scrollable container for long response lists

---

### Task 3.3: Wire by-attendee view container
**Description:** Create ByAttendeeView container that combines AttendeeList and AttendeeDetail
**Size:** Small
**Priority:** High
**Dependencies:** Task 3.1, Task 3.2
**Can run parallel with:** None

**File:** `src/components/events/question-sets/responses/ByAttendeeView.tsx`

```typescript
interface ByAttendeeViewProps {
  responsesByAttendee: AttendeeWithResponses[];
  notStartedCount: number;
  selectedAttendeeId: string | null;
  onSelectAttendee: (id: string | null) => void;
}
```

Layout:
- Render `AttendeeList` with selection state
- When `selectedAttendeeId` is set, find the attendee in `responsesByAttendee` and render `AttendeeDetail` below the list
- Pass `onClose={() => onSelectAttendee(null)}` to AttendeeDetail

**Acceptance Criteria:**
- [ ] AttendeeList and AttendeeDetail rendered together
- [ ] Selecting an attendee shows their detail
- [ ] Closing detail deselects the attendee
- [ ] Selected attendee not found gracefully handled

---

## Phase 4: Integration & Polish

### Task 4.1: Add "View Responses" action to QuestionSetCard
**Description:** Add entry point from the organizer dashboard to the response viewer
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.1 (page exists to navigate to)
**Can run parallel with:** Task 4.2

**Modified files:**

1. `src/components/events/question-sets/QuestionSetCard.tsx`:

Add to interface:
```typescript
onViewResponses?: () => void;
```

Add import:
```typescript
import { Eye } from 'lucide-react';
```

Add dropdown item (first item, before Edit, inside DropdownMenuContent):
```typescript
{status === 'PUBLISHED' && onViewResponses && (
  <DropdownMenuItem onClick={onViewResponses}>
    <Eye className="h-4 w-4 mr-2" />
    View Responses
  </DropdownMenuItem>
)}
```

2. `src/components/events/question-sets/QuestionSetsManager.tsx`:

QuestionSetsManager already imports `useRouter`. Add handler:
```typescript
const handleViewResponses = (setId: string) => {
  router.push(`/events/${eventId}/question-sets/${setId}/responses`);
};
```

Pass to QuestionSetCard (in the SortableQuestionSetCard render):
```typescript
onViewResponses={() => handleViewResponses(set.id)}
```

**Acceptance Criteria:**
- [ ] "View Responses" appears in dropdown only for PUBLISHED sets
- [ ] Eye icon rendered correctly
- [ ] Clicking navigates to `/events/[eventId]/question-sets/[setId]/responses`
- [ ] DRAFT and ARCHIVED sets do not show the action
- [ ] No existing dropdown items affected

---

### Task 4.2: Loading, error, empty states and mobile responsiveness
**Description:** Polish the response viewer with proper loading/error/empty states and mobile layout
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2, Task 3.3 (all views built)
**Can run parallel with:** Task 4.1

**Implementation:**

In `ResponsesPageClient.tsx`:

Loading state:
```tsx
if (loading) return (
  <div className="space-y-4 p-6">
    <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-bg-tertiary rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="h-64 bg-bg-tertiary rounded-lg animate-pulse" />
  </div>
);
```

Error state:
```tsx
if (error) return (
  <div className="p-6 text-center">
    <p className="text-red-400 mb-4">{error}</p>
    <Button variant="outline" onClick={fetchData}>Retry</Button>
  </div>
);
```

Empty state (data loaded but no responses):
```tsx
if (data && data.summary.completed === 0 && data.summary.inProgress === 0) return (
  // Show header + summary cards (all zeros) +
  <p className="text-text-secondary text-center py-12">
    No responses have been submitted yet. Responses will appear here as attendees complete this question set.
  </p>
);
```

Mobile responsiveness:
- Summary header: `grid-cols-2` on mobile, `md:grid-cols-4` on desktop (already in spec)
- By-question cards: full width on all screens (already works)
- By-attendee: AttendeeList and AttendeeDetail stack vertically on mobile
- View toggle buttons: equal width on mobile (`flex-1`)

**Acceptance Criteria:**
- [ ] Skeleton loading state shown during fetch
- [ ] Error state with retry button on API failure
- [ ] Empty state message when no responses exist
- [ ] Summary cards stack 2x2 on mobile
- [ ] By-attendee view stacks vertically on mobile
- [ ] All text readable at mobile widths

---

### Task 4.3: Update CLAUDE.md with response viewer documentation
**Description:** Add agent protocol section for the new feature
**Size:** Small
**Priority:** Low
**Dependencies:** All other tasks complete
**Can run parallel with:** None

Add to CLAUDE.md under a new "### M33T Questionnaire Response Viewer" section:

```markdown
### M33T Questionnaire Response Viewer

**Files:** `src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/` (page), `src/components/events/question-sets/responses/` (components), `src/app/api/events/[eventId]/question-sets/[setId]/responses/route.ts` (API), `src/lib/m33t/response-aggregation.ts` (aggregation)

**Architecture:** Single API call returns both `responsesByQuestion` and `responsesByAttendee` groupings. Client stores both in state, no re-fetch on view toggle.

**Entry Point:** "View Responses" in QuestionSetCard dropdown (PUBLISHED sets only) → navigates to `/events/[eventId]/question-sets/[setId]/responses`.

**Aggregation Types:** single_select/multi_select → option counts + percentages. slider → avg/min/max. ranking → average rank per option. open_text → response count only.

**Gotchas:**
- API returns 404 for DRAFT sets (guard even though responses shouldn't exist)
- `formatResponseValue()` maps option values to labels using `question.config.options`
- Attendee name fallback: firstName + lastName → firstName → "Anonymous"
- By-attendee view shows ALL questions (null value = "skipped")
```

**Acceptance Criteria:**
- [ ] CLAUDE.md updated with file locations, architecture, and gotchas
- [ ] Section follows existing CLAUDE.md format and conventions

---

## Dependency Graph

```
Task 1.1 (aggregation) ─────────────────────────────────┐
                                                         │
Task 1.2 (API endpoint) ← depends on 1.1 ───────────────┤
                                                         │
Task 2.1 (page shell) ← depends on 1.2 ─────────────────┤
                                                         │
Task 2.2 (by-question view) ← depends on 2.1 ───────────┤
                                                         │
Task 3.1 (attendee list) ← depends on 2.1 ──┐           │
Task 3.2 (attendee detail) ← depends on 2.1 ─┤ parallel │
                                              │          │
Task 3.3 (by-attendee wire) ← depends on 3.1 + 3.2 ────┤
                                                         │
Task 4.1 (QuestionSetCard) ← depends on 2.1 ──┐ parallel│
Task 4.2 (polish) ← depends on 2.2 + 3.3 ─────┤        │
                                                │        │
Task 4.3 (docs) ← depends on all ──────────────┘────────┘
```

## Parallel Execution Opportunities

1. **Phase 1:** Task 1.1 can start immediately. Task 1.2 follows.
2. **Phase 3:** Tasks 3.1 and 3.2 can run in parallel after 2.1.
3. **Phase 4:** Tasks 4.1 and 4.2 can run in parallel.

## Execution Strategy

Recommended order for a single developer:
1. Task 1.1 → 1.2 (foundation, must be first)
2. Task 2.1 → 2.2 (page shell + primary view)
3. Task 3.1 → 3.2 → 3.3 (secondary view)
4. Task 4.1 + 4.2 (integration + polish)
5. Task 4.3 (docs, last)
