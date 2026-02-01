# M33T Questionnaire Response Viewer

**Status:** Draft
**Author:** Claude Code
**Date:** 2026-02-01
**Slug:** m33t-questionnaire-response-viewer
**Related:** [Ideation](./01-ideation.md), [Validation Response Viewer Guide](../../docs/validation-response-viewer-guide.md), [Multi-Phase Questionnaire Spec](../multi-phase-questionnaire-v1/)

---

## Overview

Add a dedicated response viewer page that lets event organizers view attendee answers to published question sets. The viewer provides two complementary views -- **by-question** (aggregate responses per question) and **by-attendee** (individual respondent's full answer set) -- toggled without re-fetching data.

Entry point: a "View Responses" action on the `QuestionSetCard` dropdown menu for PUBLISHED sets that navigates to `/events/[eventId]/question-sets/[setId]/responses`.

---

## Background / Problem Statement

Event organizers currently send multi-phase question sets to attendees via M33T. The `QuestionSet` and `QuestionSetResponse` models store all questions and answers, and the organizer dashboard shows aggregate completion stats (e.g., "45/100 completed (45%)"). However, **there is no way for organizers to see what attendees actually answered**. The data exists in the database but has no UI for viewing it.

This is a critical gap: organizers need response data to prepare for events, understand attendee goals, curate better matches, and evaluate which questions are producing useful signal.

---

## Goals

- Allow organizers to view all responses for a published question set
- Provide a by-question view showing aggregate responses with counts/percentages per option
- Provide a by-attendee view showing each respondent's complete answer set
- Show completion summary (total, completed, in-progress, not started)
- Support all 5 question types: `open_text`, `slider`, `single_select`, `multi_select`, `ranking`
- Show both completed and in-progress response sets with clear status indicators
- Use a single API call that returns both view groupings (no re-fetch on toggle)
- Require only `'view'` permission level (any co-organizer can access)

---

## Non-Goals

- Alignment scoring or comparison against "correct" answers (no founder assumption pattern)
- Data visualizations or charts (simple text counts/percentages only)
- CSV/PDF export (deferred -- not needed soon)
- Cross-set aggregate view (per-set only for now)
- Editing or deleting individual responses from this viewer
- Real-time polling or WebSocket updates
- AI-powered response analysis or summarization
- Anonymous response mode (attendee identity always visible to organizers)

---

## Technical Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Next.js | ^15.0.0 | App Router, server components |
| React | ^19.0.0 | UI rendering |
| Prisma | ^6.19.1 | Database queries |
| Framer Motion | ^12.23.26 | View toggle animation |
| shadcn/ui (Radix) | latest | Card, Badge, Button, Tabs components |
| Lucide React | latest | Icons |
| Zod | ^4.1.13 | Response validation |

No new dependencies required.

---

## Detailed Design

### Data Model

No schema changes required. The feature reads from existing models:

**QuestionSet** -- `questions` field (JSON array of `Question` objects):
```typescript
interface Question {
  id: string;
  type: 'open_text' | 'slider' | 'single_select' | 'multi_select' | 'ranking';
  category: string;
  title: string;
  subtitle?: string;
  required: boolean;
  locked: boolean;
  order: number;
  config?: {
    placeholder?: string;
    hint?: string;
    leftLabel?: string;    // slider
    rightLabel?: string;   // slider
    options?: Array<{ value: string; label: string; description?: string }>;
    maxSelections?: number; // multi_select
  };
}
```

**QuestionSetResponse** -- `responses` field (JSON array):
```typescript
interface ResponseItem {
  questionId: string;
  value: string | number | string[];
  context?: string;
  answeredAt: string; // ISO date
}
```

### API Endpoint

**`GET /api/events/[eventId]/question-sets/[setId]/responses`**

**File:** `src/app/api/events/[eventId]/question-sets/[setId]/responses/route.ts`

**Auth:** `checkEventAccess(eventId, userId, 'view')`

**Response shape:**

```typescript
interface ResponsesAPIResponse {
  questionSet: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    publishedAt: string | null;
  };
  summary: ResponsesSummary;
  responsesByQuestion: QuestionWithResponses[];
  responsesByAttendee: AttendeeWithResponses[];
}

interface ResponsesSummary {
  totalAttendees: number;       // CONFIRMED attendees count
  completed: number;            // QuestionSetResponses with completedAt set
  inProgress: number;           // QuestionSetResponses with completedAt null
  notStarted: number;           // CONFIRMED attendees with no QuestionSetResponse
  completionRate: number;       // (completed / totalAttendees) * 100, rounded
}

interface QuestionWithResponses {
  question: Question;           // Full question object from QuestionSet.questions
  responses: Array<{
    attendeeId: string;
    attendeeName: string;       // "firstName lastName" or "firstName" or "Anonymous"
    value: string | number | string[];
    context: string | null;
    answeredAt: string;
    isCompleted: boolean;       // Whether the parent QuestionSetResponse is completed
  }>;
  aggregation: QuestionAggregation;
}

interface AttendeeWithResponses {
  attendee: {
    id: string;
    name: string;
    email: string;
    completedAt: string | null;
    startedAt: string;
  };
  responses: Array<{
    question: Question;
    value: string | number | string[];
    context: string | null;
  }>;
}
```

**API Processing Steps:**

1. Authenticate user and verify `'view'` access to the event
2. Fetch the `QuestionSet` by `setId` (validate it belongs to `eventId`)
3. Return 404 if set not found or is in DRAFT status (no responses to view)
4. Fetch all `QuestionSetResponse` records for this set, including `attendee` relation (select: `id`, `firstName`, `lastName`, `email`, `rsvpStatus`)
5. Count total CONFIRMED attendees for the event
6. Parse `QuestionSet.questions` JSON to get question definitions
7. Parse each `QuestionSetResponse.responses` JSON to get answer arrays
8. Build `responsesByQuestion`: group all answer items by `questionId`, attach attendee info, compute aggregation
9. Build `responsesByAttendee`: group by attendee, attach all their answers with question metadata
10. Compute summary stats
11. Return both groupings in a single response

### Question Aggregation Logic

**File:** `src/lib/m33t/response-aggregation.ts`

Compute server-side, per question type:

```typescript
type QuestionAggregation =
  | { type: 'single_select'; counts: Record<string, number>; total: number }
  | { type: 'multi_select'; counts: Record<string, number>; total: number }
  | { type: 'slider'; average: number; min: number; max: number; total: number }
  | { type: 'ranking'; averageRanks: Array<{ value: string; label: string; averageRank: number }>; total: number }
  | { type: 'open_text'; total: number };
```

**single_select:** Count occurrences of each option value. `total` = number of responses.

**multi_select:** Count occurrences of each option value across all responses (one attendee can contribute to multiple counts). `total` = number of respondents.

**slider:** Compute average, min, max from numeric values. `total` = number of responses.

**ranking:** For each option, compute its average rank position across all respondents. Lower average = higher ranked. `total` = number of respondents.

**open_text:** Just the response count. No aggregation -- raw responses displayed in UI.

### Page Architecture

**Route:** `/events/[eventId]/question-sets/[setId]/responses`

**Server Component** (`page.tsx`):
- Extract `eventId` and `setId` from params
- Authenticate user via `getCurrentUser()`
- Verify access via `checkEventAccess(eventId, userId, 'view')`
- Redirect to `/events/[eventId]` if no access
- Render `ResponsesPageClient` with `eventId` and `setId` props

**Client Component** (`ResponsesPageClient.tsx`):
- Fetches data from API on mount
- Manages state for both view groupings (stored simultaneously, no re-fetch on toggle)
- Handles view toggle, attendee selection, and scroll behavior

### Component Tree

```
page.tsx (server: auth guard)
└── ResponsesPageClient.tsx (client: fetch, state, layout)
    ├── BackButton (link back to /events/[eventId])
    ├── ResponsesSummaryHeader.tsx
    │   ├── 4 metric cards (Total Attendees, Completed, In Progress, Not Started)
    │   └── Completion rate percentage
    ├── ResponsesViewToggle.tsx (Framer Motion animated tabs)
    │
    ├── [if by-question]
    │   └── ByQuestionView.tsx
    │       └── QuestionResponseCard.tsx (one per question)
    │           ├── Question header (type badge + title)
    │           ├── AggregationDisplay.tsx (type-specific)
    │           │   ├── SelectAggregation (option counts with percentage bars)
    │           │   ├── SliderAggregation (avg / min / max display)
    │           │   └── RankingAggregation (ordered list by average rank)
    │           └── ResponsesList (individual responses, first 5 shown for open_text)
    │
    └── [if by-attendee]
        └── ByAttendeeView.tsx
            ├── AttendeeList.tsx (clickable list with status badges)
            └── AttendeeDetail.tsx (expanded response view for selected attendee)
```

### Component Specifications

#### ResponsesSummaryHeader

4 metric cards in a responsive grid (`grid-cols-2 md:grid-cols-4`):

| Card | Value | Style |
|------|-------|-------|
| Total Attendees | `summary.totalAttendees` | Default (zinc) |
| Completed | `summary.completed` | Green text (`text-emerald-400`) |
| In Progress | `summary.inProgress` | Gold text (`text-gold-primary`) |
| Not Started | `summary.notStarted` | Default (zinc) |

Below the cards: a text line showing completion rate (e.g., "67% completion rate").

#### ResponsesViewToggle

Two tabs: "By Question" and "By Attendee". Uses Framer Motion `layoutId` for the animated underline indicator (same pattern as the validation response viewer toggle). Active tab gets gold underline.

```typescript
const [activeView, setActiveView] = useState<'by-question' | 'by-attendee'>('by-question');
```

#### QuestionResponseCard

One card per question. Structure:

```
┌─────────────────────────────────────────────┐
│ [TYPE BADGE]  Question Title                │
│ Optional subtitle text                       │
│                                              │
│ ┌─ Aggregation ──────────────────────────┐  │
│ │ Option A  ████████████████  65% (13)   │  │
│ │ Option B  ████████         35% (7)     │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ▼ 20 responses                               │
│ ┌─ Response ──────────────────────────────┐ │
│ │ Jane Smith · 2h ago                     │ │
│ │ "Option A"                              │ │
│ └─────────────────────────────────────────┘ │
│ ┌─ Response ──────────────────────────────┐ │
│ │ John Doe · Yesterday    [In Progress]   │ │
│ │ "Option B"                              │ │
│ └─────────────────────────────────────────┘ │
│ ... Show all 20 responses                    │
└─────────────────────────────────────────────┘
```

**Type badge colors:**
| Type | Badge |
|------|-------|
| `open_text` | `bg-blue-500/20 text-blue-400` |
| `single_select` | `bg-purple-500/20 text-purple-400` |
| `multi_select` | `bg-indigo-500/20 text-indigo-400` |
| `slider` | `bg-amber-500/20 text-amber-400` |
| `ranking` | `bg-emerald-500/20 text-emerald-400` |

**For open_text questions:** Show first 5 responses by default with a "Show all N responses" toggle.

**For select questions:** Show aggregation (counts + percentage bars) above the individual response list. Percentage bars are simple CSS `div` elements with `bg-gold-primary` at proportional width.

**For slider:** Show "Average: X.X | Min: X | Max: X" in the aggregation area.

**For ranking:** Show ordered list: "1. Option C (avg rank: 1.3) | 2. Option A (avg rank: 2.1) | ..."

**Individual responses** show attendee name, relative time, and the formatted value. In-progress responses get a gold "In Progress" badge.

#### AggregationDisplay

Renders type-specific aggregation. For select types, each option gets a row:

```typescript
// Percentage bar (CSS only, no chart library)
<div className="flex items-center gap-3">
  <span className="w-32 truncate text-sm text-text-secondary">{option.label}</span>
  <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
    <div
      className="h-full rounded-full bg-gold-primary"
      style={{ width: `${percentage}%` }}
    />
  </div>
  <span className="text-sm text-text-secondary w-20 text-right">
    {percentage}% ({count})
  </span>
</div>
```

#### AttendeeList

Clickable list of respondents. Each item shows:
- First letter avatar circle (gold border if completed, zinc if in-progress)
- Name (or "Anonymous" if no name)
- Status badge: green "Completed" or gold "In Progress"
- Relative timestamp (started or completed date)
- Questions answered count (e.g., "5/8 answered")

Selected attendee gets `ring-2 ring-gold-primary` highlight.

Separate sections:
- Completed respondents (shown first)
- In-progress respondents
- "Not started" count shown as text below the list (no individual cards since they have no data)

#### AttendeeDetail

When an attendee is selected, expands below the list (or alongside on desktop). Shows every question with their answer:

```
┌─────────────────────────────────────────────┐
│ Jane Smith · Completed Jan 28               │
│ jane@example.com                    [Close] │
├─────────────────────────────────────────────┤
│ Q1: What are your biggest current goals?    │
│ "Raising seed round, building team"         │
│                                              │
│ Q2: Experience level?                        │
│ "Senior (10+ years)"                         │
│                                              │
│ Q3: Topics of interest?                      │
│ "AI/ML, Fundraising, Leadership"             │
│                                              │
│ (skipped) Q4: Rank these priorities          │
└─────────────────────────────────────────────┘
```

Unanswered questions show "(skipped)" in `text-text-tertiary`.

Auto-scrolls into view when attendee selected via `scrollIntoView({ behavior: 'smooth', block: 'start' })`.

### Modified Files

**`src/components/events/question-sets/QuestionSetCard.tsx`:**
- Add `onViewResponses` prop to `QuestionSetCardProps`
- Add "View Responses" `DropdownMenuItem` with `Eye` icon, shown only when `status === 'PUBLISHED'`
- Place it as the first item in the dropdown (before Edit) since it's the most common action for published sets

```typescript
// New prop
onViewResponses?: () => void;

// In dropdown, after DropdownMenuContent align="end":
{status === 'PUBLISHED' && onViewResponses && (
  <DropdownMenuItem onClick={onViewResponses}>
    <Eye className="h-4 w-4 mr-2" />
    View Responses
  </DropdownMenuItem>
)}
```

**`src/components/events/question-sets/QuestionSetsManager.tsx`:**
- Add `onViewResponses` handler that navigates to the response page
- Pass it through to `QuestionSetCard`

```typescript
const router = useRouter();

const handleViewResponses = (setId: string) => {
  router.push(`/events/${eventId}/question-sets/${setId}/responses`);
};

// In QuestionSetCard render:
onViewResponses={() => handleViewResponses(set.id)}
```

### New Files

```
src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/
├── page.tsx                              (server component: auth, render client)
└── ResponsesPageClient.tsx               (client: state, fetch, view toggle)

src/components/events/question-sets/responses/
├── ResponsesSummaryHeader.tsx            (4 metric cards)
├── ResponsesViewToggle.tsx               (by-question / by-attendee tabs)
├── ByQuestionView.tsx                    (question list container)
├── QuestionResponseCard.tsx              (single question card with aggregation + responses)
├── AggregationDisplay.tsx                (type-specific aggregation rendering)
├── ByAttendeeView.tsx                    (attendee list + detail container)
├── AttendeeList.tsx                      (clickable attendee list)
└── AttendeeDetail.tsx                    (expanded response view)

src/app/api/events/[eventId]/question-sets/[setId]/responses/
└── route.ts                              (GET endpoint)

src/lib/m33t/
└── response-aggregation.ts               (aggregation computation per question type)
```

### Value Formatting

Reusable formatting for response values displayed in both views:

```typescript
function formatResponseValue(
  value: string | number | string[],
  question: Question
): string {
  if (value === null || value === undefined) return 'No answer';

  switch (question.type) {
    case 'single_select': {
      // Map value to option label
      const option = question.config?.options?.find(o => o.value === value);
      return option?.label ?? String(value);
    }
    case 'multi_select': {
      // Map each value to option label, join with ", "
      const values = Array.isArray(value) ? value : [value];
      return values.map(v => {
        const option = question.config?.options?.find(o => o.value === v);
        return option?.label ?? String(v);
      }).join(', ');
    }
    case 'slider':
      return String(value);
    case 'ranking': {
      // Display as ordered list: "1. Option, 2. Option, ..."
      const values = Array.isArray(value) ? value : [];
      return values.map((v, i) => {
        const option = question.config?.options?.find(o => o.value === v);
        return `${i + 1}. ${option?.label ?? v}`;
      }).join(', ');
    }
    case 'open_text':
    default:
      return String(value);
  }
}
```

### Relative Date Formatting

Reuse existing `formatRelativeDate` pattern or implement a lightweight version:

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

---

## User Experience

### Entry Flow

1. Organizer opens event dashboard at `/events/[eventId]`
2. Scrolls to Question Sets section, sees published set with completion stats
3. Clicks the `...` dropdown on a PUBLISHED question set card
4. Selects "View Responses"
5. Navigates to `/events/[eventId]/question-sets/[setId]/responses`

### Response Viewer Page

1. **Header area:** Back arrow + "Responses: {Set Title}" heading
2. **Summary cards:** 4 metric cards showing completion breakdown
3. **View toggle:** "By Question" (default) | "By Attendee" tabs
4. **Content area:** Renders the active view

### By-Question View

- Questions listed in their original order
- Each card shows the question title, type badge, aggregation summary, and individual responses
- For `open_text`: first 5 responses shown, "Show all N" expander
- For select types: percentage bars above individual responses
- Individual responses show attendee name, timestamp, and "In Progress" badge if applicable
- Clicking on a response does not navigate (read-only view)

### By-Attendee View

- Left side: scrollable list of respondents grouped by status (completed first, then in-progress)
- Shows "N attendees haven't started" count at the bottom
- Clicking an attendee selects them and shows their full response detail
- Detail panel shows all questions with their answers (or "skipped" for unanswered)
- Close button to deselect

### Empty States

- **No responses yet:** "No responses have been submitted yet. Responses will appear here as attendees complete this question set."
- **DRAFT set accessed via URL:** Redirect to event dashboard (guard in page.tsx)

---

## Testing Strategy

### Unit Tests

**`response-aggregation.test.ts`:**
- Test `single_select` aggregation counts correctly with multiple responses
- Test `multi_select` aggregation handles arrays, counts each selected option independently
- Test `slider` aggregation computes correct average, min, max
- Test `ranking` aggregation computes correct average rank positions
- Test `open_text` returns only total count
- Test with empty response arrays (zero responses per question)
- Test with responses containing unexpected/missing values (defensive parsing)

### Integration Tests

**API route tests (`responses/route.test.ts`):**
- Returns 401 for unauthenticated requests
- Returns 404 for non-existent set or event
- Returns 404 for DRAFT status sets
- Returns correct `responsesByQuestion` grouping with attendee names
- Returns correct `responsesByAttendee` grouping with question metadata
- Counts only CONFIRMED attendees in `totalAttendees`
- Includes in-progress (non-completed) responses with correct `isCompleted: false`
- Handles sets with zero responses (empty arrays, correct summary counts)
- Handles attendees with partial responses (only some questions answered)

### E2E Tests

**`question-set-responses.spec.ts`:**
- Navigate to published set's "View Responses" from dropdown menu
- Verify summary header shows correct counts
- Toggle between by-question and by-attendee views
- Verify question aggregation displays for each type
- Select an attendee and verify their responses appear in detail panel
- Verify "Show all" expander works for open_text with 5+ responses
- Verify back button returns to event dashboard

---

## Performance Considerations

- **Single fetch:** Both view groupings returned in one API call. No re-fetch on view toggle.
- **Query efficiency:** Use Prisma `include` to fetch responses with attendee in a single query. Avoid N+1 by not fetching attendees separately.
- **JSON parsing:** `QuestionSet.questions` and `QuestionSetResponse.responses` are JSON fields. Parse once on the server, send structured data to the client.
- **Response size:** For 200 attendees x 10 questions = 2000 response items. This is well within reasonable payload size (~50-100KB JSON). No pagination needed for MVP.
- **If response count grows beyond 500 attendees:** Consider server-side pagination of individual responses within by-question view (aggregate stats would still be computed over all responses).

---

## Security Considerations

- **Auth required:** Server component verifies user session before rendering
- **Permission check:** API route verifies `'view'` permission via `checkEventAccess`
- **No cross-event access:** API validates `questionSet.eventId === eventId`
- **No sensitive data exposure:** Response viewer shows attendee name and email (already visible in the attendee list on the dashboard). No additional PII is exposed.
- **DRAFT set protection:** API returns 404 for DRAFT sets (responses shouldn't exist for unpublished sets, but guard anyway)
- **Cache-Control:** API response should include `Cache-Control: no-store` for fresh data on each load

---

## Documentation

- Update `CLAUDE.md` with a new "M33T Questionnaire Response Viewer" agent protocol section documenting:
  - File locations for new components and API route
  - The dual-view architecture pattern
  - Aggregation types per question type
  - Integration point on QuestionSetCard

---

## Implementation Phases

### Phase 1: Core Infrastructure

- Create API endpoint (`GET /api/events/[eventId]/question-sets/[setId]/responses/route.ts`)
- Implement `response-aggregation.ts` with aggregation logic for all 5 question types
- Create server component page with auth guard
- Create `ResponsesPageClient` with data fetching and view state management

### Phase 2: By-Question View

- `ResponsesSummaryHeader` with 4 metric cards
- `ResponsesViewToggle` with Framer Motion animation
- `ByQuestionView` container
- `QuestionResponseCard` with question header and response list
- `AggregationDisplay` with type-specific rendering (percentage bars for selects, stats for slider, ranked list for ranking)
- "Show all N" expander for open_text with 5+ responses

### Phase 3: By-Attendee View

- `AttendeeList` with status badges and selection
- `AttendeeDetail` with full response display
- Auto-scroll on selection
- Empty/skipped question handling

### Phase 4: Integration & Polish

- Add `onViewResponses` prop and dropdown item to `QuestionSetCard`
- Wire navigation in `QuestionSetsManager`
- Empty state handling (no responses, draft set redirect)
- Loading and error states
- Mobile responsive layout (stack metric cards, full-width views)

---

## Open Questions

1. **Response ordering in by-question view:** Should individual responses be sorted by `answeredAt` (chronological) or by attendee name (alphabetical)? Leaning toward chronological (most recent first) since organizers want to see latest responses.

2. **Context field display:** Some responses include an optional `context` string (additional notes from the attendee). Should this be shown inline below the value, or hidden behind an expand toggle? Leaning toward inline if present, since it's additional signal.

---

## References

- [Validation Response Viewer Guide](../../docs/validation-response-viewer-guide.md) -- Reference architecture for dual-view pattern
- [Ideation Document](./01-ideation.md) -- Problem analysis and approach evaluation
- [Multi-Phase Questionnaire Spec](../multi-phase-questionnaire-v1/) -- Original question set implementation
- Existing API: `GET /api/events/[eventId]/question-sets` (completion stats pattern)
- Existing component: `QuestionSetCard.tsx` (dropdown action pattern)
- Existing page: `/events/[eventId]/matches/page.tsx` (sub-page navigation pattern)
