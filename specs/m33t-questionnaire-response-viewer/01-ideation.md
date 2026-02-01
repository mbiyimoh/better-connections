# M33T Questionnaire Response Viewer for Event Organizers

**Slug:** m33t-questionnaire-response-viewer
**Author:** Claude Code
**Date:** 2026-02-01
**Branch:** preflight/m33t-questionnaire-response-viewer
**Related:** `docs/validation-response-viewer-guide.md` (reference architecture), `specs/m33t-add-to-calendar/`

---

## 1) Intent & Assumptions

- **Task brief:** Event organizers currently send question sets to attendees via M33T but have no way to view the collected responses. We need to build a response viewer that lets organizers see aggregate and individual questionnaire responses from the organizer dashboard, modeled after the dual-view pattern documented in the Validation Response Viewer guide.
- **Assumptions:**
  - The existing `QuestionSet` and `QuestionSetResponse` Prisma models already store everything we need -- no schema changes required
  - The viewer is organizer-only (not public-facing), protected by `checkEventAccess`
  - Responses are tied to confirmed attendees and stored as JSON arrays in `QuestionSetResponse.responses`
  - Question types to support: `open_text`, `slider`, `single_select`, `multi_select`, `ranking`
  - AI-generated `suggestions` on responses are out of scope for this viewer (they're attendee-facing)
- **Out of scope:**
  - Alignment scoring against a "correct" answer (no founder assumptions -- this is pure response collection)
  - Editing or deleting individual responses
  - Real-time/live polling (responses trickle in pre-event, not during)
  - Charts or data visualizations (keep it simple with formatted values and counts)
  - PDF export (CSV is sufficient for MVP)

---

## 2) Pre-reading Log

- `docs/validation-response-viewer-guide.md`: Complete reference architecture for a dual-view response viewer. Key patterns: single API fetch returning both groupings, no re-fetch on view toggle, server-side summary computation, scroll-to-question from summary header, session list + detail panel for by-respondent view.
- `prisma/schema.prisma` (lines 532-585): `QuestionSet` stores questions as JSON, `QuestionSetResponse` stores responses as JSON with `completedAt` for completion tracking. Unique constraint on `[questionSetId, attendeeId]`.
- `src/app/api/events/[eventId]/question-sets/route.ts`: Existing GET returns sets with completion stats (completed/inProgress/total). Already counts only CONFIRMED attendees.
- `src/components/events/question-sets/QuestionSetCard.tsx`: Shows completion percentage, has dropdown menu where "View Responses" action would go. Currently has Edit, Publish, Send Notifications, Archive/Delete.
- `src/lib/m33t/schemas.ts`: Question schema defines types (`open_text`, `slider`, `single_select`, `multi_select`, `ranking`) with `QuestionConfigSchema` holding options, labels, etc.
- `src/lib/m33t/questions.ts`: Default questions (goals, ideal_connections, experience_level, topics).
- `src/components/rsvp/QuestionSetQuestionnaire.tsx`: Attendee-facing questionnaire. Response format: `{ questionId, value, context?, answeredAt }`.
- `src/app/(dashboard)/events/[eventId]/page.tsx`: Main organizer dashboard. Question sets section uses `QuestionSetsManager` component.
- `src/components/events/question-sets/QuestionSetsManager.tsx`: Manages question set list with drag-to-reorder, handles edit/publish/notify/delete actions.
- `src/lib/m33t/formatting.ts`: Existing date/time formatting utilities we can reuse.

---

## 3) Codebase Map

### Primary Components/Modules
| File | Role |
|------|------|
| `src/app/(dashboard)/events/[eventId]/page.tsx` | Event dashboard (parent page, contains QuestionSetsManager) |
| `src/components/events/question-sets/QuestionSetsManager.tsx` | Question set list, drag-reorder, action routing |
| `src/components/events/question-sets/QuestionSetCard.tsx` | Individual set card with status, stats, dropdown actions |
| `src/app/api/events/[eventId]/question-sets/route.ts` | GET all sets with completion stats |
| `src/app/api/events/[eventId]/question-sets/[setId]/route.ts` | GET/PATCH/DELETE single set |

### Shared Dependencies
- **Auth:** `checkEventAccess` from `@/lib/m33t/auth.ts` (permission levels: view, curate, edit, manage)
- **DB:** `prisma` from `@/lib/db` -- Prisma client
- **Schemas:** `QuestionSchema`, `QuestionConfigSchema` from `@/lib/m33t/schemas`
- **UI:** shadcn/ui components (Card, Badge, Button, DropdownMenu, Tabs)
- **Animation:** Framer Motion for tab toggles and transitions
- **Icons:** Lucide React
- **Formatting:** `formatEventDate`, `formatEventTime` from `@/lib/m33t/formatting`

### Data Flow
```
QuestionSet (questions: Json[])
    ↓
QuestionSetResponse (responses: Json[], completedAt, attendeeId)
    ↓
EventAttendee (firstName, lastName, email, rsvpStatus, profile: Json)
```

**Response item structure:**
```typescript
{ questionId: string, value: string | number | string[], context?: string, answeredAt: Date }
```

### Potential Blast Radius
- `QuestionSetCard.tsx` -- needs new `onViewResponses` prop and dropdown item
- `QuestionSetsManager.tsx` -- needs to handle navigation to response viewer
- Event dashboard page -- may need router navigation handler
- New files only beyond that (API route, page, components)

---

## 4) Root Cause Analysis

N/A -- This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

#### Approach A: Dedicated Page with Dual-View Toggle (Recommended)

**Route:** `/events/[eventId]/question-sets/[setId]/responses`

Mirror the Validation Response Viewer architecture: a dedicated page with a by-question / by-attendee toggle. Single API call returns both groupings. No re-fetch on view toggle.

**Pros:**
- Proven pattern already documented in the codebase (validation-response-viewer-guide.md)
- Clean separation from the main dashboard
- Room for detailed views, filters, and future export
- Follows existing event detail page pattern (`/events/[eventId]/matches`)
- Handles large response sets without cluttering the dashboard

**Cons:**
- More files to create (page + API + components)
- Extra navigation step from dashboard

#### Approach B: Modal/Drawer from QuestionSetCard

Open a slide-over drawer or modal directly from the question set card's dropdown menu.

**Pros:**
- Quick access, no page navigation
- Contextually close to the question set

**Cons:**
- Modals are poor for large datasets (50-200 attendees x 5-10 questions)
- Hard to add filtering, export, dual-view toggle in a modal
- Doesn't scale if we add more response analysis features later

#### Approach C: Expandable Panel Inline on Dashboard

Expand the QuestionSetCard to show responses inline on the event dashboard.

**Pros:**
- No navigation at all
- Quick glance

**Cons:**
- Makes the dashboard extremely long/cluttered
- Hard to show detailed per-attendee views
- Conflicts with drag-to-reorder UX
- Poor for 10+ responses

### Recommendation

**Approach A (Dedicated Page)** is the clear winner. It matches the proven dual-view pattern from the validation response viewer, aligns with existing event dashboard navigation patterns (like the matches page), and provides room for future enhancements without architectural changes.

The entry point is a "View Responses" action in the QuestionSetCard dropdown (for PUBLISHED sets with responses), which navigates to the dedicated page.

---

### Proposed Architecture

#### API Endpoint

**`GET /api/events/[eventId]/question-sets/[setId]/responses`**

Returns both groupings in a single response:

```typescript
{
  questionSet: { id, title, description, questionCount, status },
  summary: {
    totalAttendees: number,        // CONFIRMED attendees
    completedResponses: number,    // completedAt !== null
    inProgressResponses: number,   // completedAt === null
    completionRate: number,        // percentage
    notStarted: number,            // no QuestionSetResponse record
  },
  responsesByQuestion: Array<{
    questionId: string,
    question: Question,            // Full question object (type, title, config)
    responses: Array<{
      attendeeId: string,
      attendeeName: string,
      value: string | number | string[],
      context: string | null,
      answeredAt: string,
    }>,
    aggregation: QuestionAggregation,  // Pre-computed server-side
  }>,
  responsesByAttendee: Array<{
    attendee: {
      id: string,
      name: string,
      email: string,
      rsvpStatus: string,
      completedAt: string | null,
      startedAt: string,
    },
    responses: Array<{
      questionId: string,
      question: Question,
      value: string | number | string[],
      context: string | null,
    }>,
  }>,
}
```

#### Question Aggregation (Server-Side)

Pre-compute summaries per question type:

| Type | Aggregation |
|------|-------------|
| `single_select` | Count per option (e.g., `{ "option_a": 12, "option_b": 8 }`) + percentages |
| `multi_select` | Count per option (each attendee can pick multiple) + percentages |
| `slider` | Average value, min, max, distribution |
| `ranking` | Weighted average rank per item (1st=N points, 2nd=N-1, etc.) |
| `open_text` | Response count only (no aggregation -- display raw list) |

#### Component Tree

```
ResponsesPage (server component - auth, data fetch)
├── ResponsesPageClient (client - state management, view toggle)
│   ├── ResponsesSummaryHeader (4 metric cards: total, completed, in-progress, completion %)
│   ├── ResponsesViewToggle (by-question / by-attendee tabs, Framer Motion)
│   │
│   ├── [if by-question]
│   │   └── ByQuestionView
│   │       └── QuestionResponseCard (per question)
│   │           ├── QuestionHeader (type badge, title, subtitle)
│   │           ├── AggregationDisplay (type-specific: bars, average, ranked list)
│   │           └── IndividualResponsesList (expandable, shows all responses)
│   │
│   └── [if by-attendee]
│       ├── AttendeeResponseList (clickable list with status badges)
│       └── AttendeeResponseDetail (expanded view of selected attendee's answers)
│
└── ExportButton (CSV download)
```

#### New Files

```
src/app/(dashboard)/events/[eventId]/question-sets/[setId]/responses/
├── page.tsx                        (server wrapper: auth, params)
└── ResponsesPageClient.tsx         (client: state, fetch, view toggle)

src/components/events/question-sets/responses/
├── ResponsesSummaryHeader.tsx      (metric cards)
├── ResponsesViewToggle.tsx         (tab toggle)
├── ByQuestionView.tsx              (by-question container)
├── QuestionResponseCard.tsx        (single question with responses)
├── AggregationDisplay.tsx          (type-specific aggregation rendering)
├── ByAttendeeView.tsx              (attendee list + detail)
├── AttendeeResponseList.tsx        (clickable attendee list)
├── AttendeeResponseDetail.tsx      (selected attendee's full responses)
└── ExportButton.tsx                (CSV export)

src/app/api/events/[eventId]/question-sets/[setId]/responses/
└── route.ts                        (GET - returns both groupings)

src/lib/m33t/
└── response-aggregation.ts         (server-side aggregation logic per question type)
```

#### Modified Files

```
src/components/events/question-sets/QuestionSetCard.tsx
  → Add onViewResponses prop + "View Responses" dropdown item (PUBLISHED sets only)

src/components/events/question-sets/QuestionSetsManager.tsx
  → Pass onViewResponses handler that navigates to response page
```

---

## 6) Clarification

1. **Scope of by-question aggregation:** Should we show simple counts/percentages (e.g., "Option A: 65%, Option B: 35%") or include visual bars/charts? Recommendation: Start with formatted text + simple horizontal percentage bars (CSS-only, no chart library).
>> simple counts and perventages are fine for now

2. **CSV export format:** Should the CSV be one-row-per-attendee (columns = questions) or one-row-per-response (columns = attendee, question, value)? Recommendation: One-row-per-attendee is more natural for spreadsheet analysis.
>> go with your rec, thats fine. I don't plan to use export anytime soon though

3. **Access permission level:** Should viewing responses require `'view'` permission (any co-organizer can see) or `'curate'` permission (only curators and above)? Recommendation: `'view'` -- responses aren't sensitive in an event context where organizers already see attendee profiles.
>> view is sufficient

4. **Empty/in-progress responses:** Should we show partially completed response sets in the viewer, or only completed ones? Recommendation: Show both, with a clear status indicator and the ability to filter.
>> agreed re: your recommendation

5. **Open text response display:** For open-text questions with many responses, should we show all responses expanded by default or collapsed behind a "Show all N responses" toggle? Recommendation: Show first 5, expand on click.
>> I like your recommendation, thats fine

6. **Cross-set view:** Should there be a way to view responses across all question sets at once, or always per-set? Recommendation: Per-set only for MVP. A cross-set summary could be added later on the main event dashboard.
>> per set is sufficient for now
