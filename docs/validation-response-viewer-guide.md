# Validation Response Viewer — Technical Guide

A reference guide for the "view questionnaire responses" system in the Persona Sharpener module. This documents the full architecture — data model, API, dual-view UI, alignment scoring, and confidence tracking — so it can be replicated in another project.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [API Layer](#api-layer)
4. [Client Architecture](#client-architecture)
5. [View Mode 1: By Question](#view-mode-1-by-question)
6. [View Mode 2: By Session (Respondent)](#view-mode-2-by-session-respondent)
7. [Alignment Scoring](#alignment-scoring)
8. [Confidence Thresholds](#confidence-thresholds)
9. [Value Formatting](#value-formatting)
10. [Key Patterns and Gotchas](#key-patterns-and-gotchas)
11. [File Reference](#file-reference)
12. [Adapting to Another Project](#adapting-to-another-project)

---

## System Overview

The validation response viewer lets the **creator** of a questionnaire (the "founder") review all responses collected from external respondents who completed the questionnaire via a shared link. It provides two complementary views:

- **By Question** — For each question, see all responses side-by-side with the founder's original assumption
- **By Session** — For each respondent, see their complete set of answers compared against the founder's assumptions

The page also shows summary statistics (total sessions, total responses, overall alignment score, questions validated) and highlights questions that need attention (lowest alignment scores).

### High-Level Flow

```
Founder creates questionnaire
    → Generates shareable validation link (slug-based URL)
    → External respondents complete questionnaire (creates ValidationSession + Response records)
    → Founder visits /validation-responses page
    → API fetches all responses, groups them by-question AND by-session
    → Client renders summary header + dual-view toggle + appropriate view
```

---

## Data Model

Three core models drive the response viewing system. The key relationship chain is:

```
Persona → ValidationLink → ValidationSession[] → Response[]
```

### ValidationLink

One per persona. Holds the shareable slug and aggregate counters.

```prisma
model ValidationLink {
  id        String  @id @default(cuid())
  personaId String  @unique
  persona   Persona @relation(fields: [personaId], references: [id])

  slug     String  @unique          // 16-char hex, used in public URL
  isActive Boolean @default(true)

  totalResponses Int @default(0)    // Denormalized counter
  totalSessions  Int @default(0)    // Denormalized counter

  sessions ValidationSession[]

  @@index([slug])
}
```

### ValidationSession

One per respondent who starts the questionnaire. Tracks their progress and identity.

```prisma
model ValidationSession {
  id     String         @id @default(cuid())
  linkId String
  link   ValidationLink @relation(fields: [linkId], references: [id])

  respondentName  String?
  respondentEmail String?

  status            String @default("in_progress")  // 'in_progress' | 'completed' | 'abandoned'
  questionsAnswered Int    @default(0)
  questionsSkipped  Int    @default(0)

  startedAt   DateTime  @default(now())
  completedAt DateTime?

  responses Response[]

  @@index([linkId])
}
```

### Response

Individual answers. The same model stores both the founder's assumptions (`responseType: 'assumption'`) and validator responses (`responseType: 'validation'`). They're distinguished by `responseType` and which session FK is populated.

```prisma
model Response {
  id        String @id @default(cuid())
  personaId String

  // Mutually exclusive foreign keys:
  sessionId           String?           // Founder's sharpener session
  validationSessionId String?           // External validator's session

  questionId String
  field      String                     // e.g., 'demographics.ageRange'
  value      Json                       // Flexible: string, number, string[], object

  isUnsure          Boolean @default(false)
  confidence        Int     @default(50)  // 0-100
  additionalContext String?
  responseType      String               // 'assumption' or 'validation'

  respondentId   String
  respondentRole String                  // 'founder' or role identifier
  respondentName String?

  @@index([personaId])
  @@index([questionId])
  @@index([validationSessionId])
}
```

**The critical distinction:** When querying for viewer display, you filter on `responseType: 'validation'` and `validationSessionId: { not: null }` to get external responses, then separately query `responseType: 'assumption'` for the founder's baseline.

---

## API Layer

**Endpoint:** `GET /api/.../personas/[personaId]/validation-responses`

**Source:** `app/api/clarity-canvas/modules/persona-sharpener/personas/[personaId]/validation-responses/route.ts`

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `view` | `'by-question' \| 'by-session'` | `'by-question'` | Requested view mode |
| `questionId` | `string?` | — | Filter to single question |
| `sessionId` | `string?` | — | Filter to single session |

### Response Shape

The API **always returns both groupings** regardless of the `view` param. This is critical — the client initializes both data structures on first load and never re-fetches when toggling views.

```typescript
{
  view: ValidationViewMode;
  personaName: string;
  totalSessions: number;
  totalResponses: number;
  sessions: ValidationSessionSummary[];
  responsesByQuestion: Record<string, ValidationResponseByQuestion>;  // Always included
  responsesBySession: ValidationResponseBySession[];                   // Always included
  summary: ValidationSummary;
}
```

### API Processing Steps

1. **Authenticate** — Verify the requesting user owns the persona
2. **Load customized question text** — The text validators actually saw (may differ from base question)
3. **Fetch validation responses** — `responseType: 'validation'`, `validationSessionId: { not: null }`
4. **Fetch founder assumptions** — `responseType: 'assumption'` for the same persona
5. **Build `responsesByQuestion`** — Group validation responses by `questionId`, attach founder assumption per question
6. **Build `responsesBySession`** — Group validation responses by `validationSessionId`, attach founder assumption per response
7. **Compute summary** — Alignment scores, confidence level, top misalignments

### Key Type Definitions

```typescript
// Founder's original answer for comparison
interface FounderAssumption {
  value: unknown;
  confidence: number;  // 0-100
  isUnsure: boolean;
}

// Single validator response item
interface ValidationResponseItem {
  sessionId: string;
  respondentName: string | null;
  value: unknown;
  confidence: number;
  isUnsure: boolean;
  additionalContext: string | null;
  createdAt: Date;
}

// By-question grouping: one question, all responses
interface ValidationResponseByQuestion {
  questionId: string;
  field: string;
  founderAssumption: FounderAssumption | null;
  validationResponses: ValidationResponseItem[];
  validationContextualizedText?: string | null;  // Text validators actually saw
}

// By-session: single response with founder comparison attached
interface SessionResponseWithComparison {
  questionId: string;
  field: string;
  value: unknown;
  confidence: number;
  isUnsure: boolean;
  additionalContext: string | null;
  founderAssumption: FounderAssumption | null;
}

// By-session grouping: one respondent, all their responses
interface ValidationResponseBySession {
  session: ValidationSessionSummary;
  responses: SessionResponseWithComparison[];
}

// Summary statistics
interface ValidationSummary {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  abandonedSessions: number;
  totalResponses: number;
  questionsWithResponses: number;
  totalQuestions: number;
  overallAlignmentScore: number | null;
  confidenceLevel: ConfidenceLevel;
  topMisalignments: Array<{
    questionId: string;
    questionText: string;
    category: string;
    alignmentScore: number;
    responseCount: number;
  }>;
  questionAlignments: Array<{
    questionId: string;
    alignmentScore: number;
    responseCount: number;
  }>;
}
```

---

## Client Architecture

**Source:** `ValidationResponsesPageClient.tsx`

The client component manages all state and delegates rendering to child components. It fetches data once on mount and stores both groupings in state simultaneously.

### State Structure

```typescript
// View mode toggle
const [activeView, setActiveView] = useState<'by-question' | 'by-session'>('by-question');
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);

// Data (populated from single API call)
const [summary, setSummary] = useState<ValidationSummary | null>(null);
const [responsesByQuestion, setResponsesByQuestion] = useState<Record<string, ValidationResponseByQuestion>>({});
const [sessions, setSessions] = useState<ValidationSessionSummary[]>([]);
const [sessionResponses, setSessionResponses] = useState<Map<string, SessionResponse[]>>(new Map());
```

### Component Tree

```
ValidationResponsesPageClient
├── ValidationSummaryHeader        // 4 metric cards + "Needs Attention" list
├── ConfidenceCallout              // Confidence progress bar + next milestone
├── ValidationViewToggle           // Tab toggle (by-question / by-session)
│
├── [if by-question]
│   └── ValidationByQuestionView   // Per-question cards with all responses
│
└── [if by-session]
    ├── ValidationSessionList      // Clickable respondent list
    ├── (empty sessions toggle)    // Show/hide 0-answer sessions
    └── ValidationSessionDetail    // Expanded view of selected respondent
```

### Data Flow

```
1. Component mounts → single GET request to API
2. API returns { responsesByQuestion, responsesBySession, sessions, summary }
3. Client stores BOTH groupings in state
4. User toggles view → no re-fetch, just swaps which state is rendered
5. In by-session view, clicking a session sets selectedSessionId
   → auto-scrolls to ValidationSessionDetail
6. In by-question view, clicking "Needs Attention" item sets focusedQuestionId
   → scrolls to that question card and highlights it
```

---

## View Mode 1: By Question

**Source:** `ValidationByQuestionView.tsx`

Shows one card per question. Each card contains:

1. **Question header** — Category label (mono, uppercase, zinc-500) + question text
2. **Customized text callout** — If validators saw different text, shown in italic
3. **Founder's assumption** — Gold-tinted box with the founder's original answer + confidence %
4. **All customer responses** — Green-tinted cards, each showing the value, confidence, respondent name, and optional additional context
5. **Comparison insight** — Shows alignment percentage (only if 2+ responses and founder wasn't "unsure")

### Comparison Insight Logic (simplified)

```typescript
// Simple JSON.stringify comparison for exact matches
const matchCount = validationValues.filter(
  v => JSON.stringify(v) === JSON.stringify(founderValue)
).length;
const matchPercent = Math.round((matchCount / validationValues.length) * 100);

// Thresholds:
// 70%+ → Green "Strong alignment"
// 40-70% → Amber "Partial alignment"
// <40% → Red "Low alignment"
```

### Scroll-to-Question Feature

When the user clicks a "Needs Attention" item in the summary header, the parent sets `focusedQuestionId`. The by-question view scrolls to that card and applies a gold ring highlight:

```typescript
useEffect(() => {
  if (focusedQuestionId) {
    document.getElementById(`question-${focusedQuestionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onFocusHandled?.();  // Clear focus after scrolling
  }
}, [focusedQuestionId]);
```

---

## View Mode 2: By Session (Respondent)

This mode uses two components working together: a **session list** and a **session detail** panel.

### ValidationSessionList

**Source:** `ValidationSessionList.tsx`

A clickable list of respondents. Each item shows:
- Avatar initial (first letter of name) in a circle
- Respondent name (falls back to "Anonymous Respondent N")
- Relative timestamp (e.g., "2h ago", "Yesterday")
- Status badge (green=completed, gold=in-progress, red=abandoned)
- Questions answered + skipped counts

Selected session gets a gold border + subtle gold background.

The parent component splits sessions into two groups:
- `sessionsWithAnswers` — always visible
- `emptySessions` — hidden behind a toggle button

### ValidationSessionDetail

**Source:** `ValidationSessionDetail.tsx`

When a session is selected, this expands below the list. Shows a two-column comparison for every response in that session:

```
┌──────────────────────────────────────────┐
│ Question text                             │
│                                           │
│  Your Assumption     │  Their Response    │
│  (gold dot)          │  (green dot)       │
│  "Value A"           │  "Value B"         │
│                                           │
│  alignment.explanation     72% match      │
└──────────────────────────────────────────┘
```

Key details:
- Uses `calculateAlignment()` per response to get score, matchType, and explanation
- Match badge is color-coded: green (exact), gold (partial), red (none)
- Scrollable with `max-h-[60vh] overflow-y-auto`
- Close button in header to deselect session
- Auto-scrolls into view when selected (via ref + `scrollIntoView`)

---

## Alignment Scoring

**Source:** `alignment-calculator.ts`

### Per-Response Alignment: `calculateAlignment(questionId, founderValue, validatorValue)`

Returns `{ score: 0-100, matchType: 'exact'|'partial'|'none', explanation: string }`

Scoring varies by question type:

| Type | Scoring Method |
|------|---------------|
| `this-or-that` | 100% if exact match, 0% otherwise |
| `slider` | Proximity: <=10 diff = 100%, linear decay to 0% at 100 diff |
| `ranking` | Weighted position comparison (1st=30pts, 2nd=25pts, ..., 6th=3pts) |
| `multi-select` | Jaccard similarity (intersection / union * 100) |
| `fill-blank` | Per-blank word overlap with 0.5x partial credit |
| `scenario` | Keyword overlap (stopwords removed), 40% floor for subjectivity |
| default | JSON.stringify equality (100% or 0%) |

### Per-Question Aggregate: `calculateQuestionAlignment(questionId, founderValue, validatorValues[])`

Averages all individual alignment scores. Also counts how many scored >= 70% ("matches").

```typescript
Returns { averageScore: number, matchCount: number, total: number }
```

### Overall Alignment: `calculateOverallAlignment(questionAlignments[])`

Weighted average across all questions. Each question weighted by `min(responseCount, 5)` — this caps influence of any single question at 5 responses.

```typescript
weightedSum += averageScore * min(responseCount, 5)
totalWeight += min(responseCount, 5)
return round(weightedSum / totalWeight)
```

### Summary: Top Misalignments

The API filters to questions with >= 2 responses, sorts by ascending alignment score, and takes the top 3. These are displayed in a red "Needs Attention" callout in the summary header.

---

## Confidence Thresholds

**Source:** `confidence-thresholds.ts`

Progressive confidence based on **session count** (not response count):

| Sessions | Confidence | Label |
|----------|-----------|-------|
| 0 | 0% | No Data |
| 1-2 | 50% | Early Signal |
| 3-4 | 90% | Statistically Meaningful |
| 5-11 | 95% | High Confidence |
| 12+ | 99% | Very High Confidence |

Each level includes a `message` (explanatory text) and `nextLevel` (milestone target, e.g., "5 more responses for 95%").

Color coding:
- >= 95% → Green (#4ADE80)
- >= 90% → Gold (#D4A84B)
- Otherwise → Orange (#FB923C)

---

## Value Formatting

**Source:** `validation-utils.ts` — `formatResponseValue(value, truncate?)`

Handles all response data types for display:

| Type | Formatting |
|------|-----------|
| `null/undefined` | "No answer" (or "Skipped" if truncate) |
| `string` | As-is |
| `number` | String conversion |
| `boolean` | "Yes" / "No" |
| `array` | Map items (extract `label`/`text`/`value`/`id` from objects), join with commas. Truncate to 2 items if `truncate=true` |
| `object` | Try `label` → `text` → `value` → `id` props. Fallback: join all string values. Last resort: JSON.stringify |

Also provides `formatRelativeDate(date)` for timestamps: "Just now", "5m ago", "2h ago", "Yesterday", "3 days ago", "Jan 15".

---

## Key Patterns and Gotchas

### 1. Always Return Both Groupings from the API

The client stores `responsesByQuestion` and `responsesBySession` in separate state variables and never re-fetches when toggling views. If the API only returns one format, the other view will show "0 responses."

### 2. Filter Responses by Type

When querying for the viewer, always include both conditions:
```typescript
responseType: 'validation',
validationSessionId: { not: null }
```
Without both, you'll mix in the founder's own assumption responses.

### 3. Founder Comparison is Per-Question, Not Per-Session

When building `responsesByQuestion`, the founder's assumption is attached at the question level (since there's only one assumption per question). When building `responsesBySession`, the same assumption is copied into each individual response comparison.

### 4. Customized Question Text

If your system has question text that differs per context (e.g., the founder sees one version, the respondent sees another), store that mapping and send it alongside the responses so the viewer can display "Validators saw: '...'" for context.

### 5. Summary Statistics are Calculated Server-Side

Don't calculate alignment scores or confidence levels on the client. The API computes everything and sends pre-calculated summaries. This keeps the client simple and avoids shipping scoring logic to the browser.

### 6. Empty State Handling

The client separates sessions into "with answers" and "empty" groups. Empty sessions are hidden behind a toggle to keep the default view clean.

### 7. Auto-Scroll on Selection

Both views use `scrollIntoView({ behavior: 'smooth' })`:
- By-question: scrolls to focused question when clicking "Needs Attention"
- By-session: scrolls to session detail panel when selecting a respondent

---

## File Reference

| File | Role |
|------|------|
| `validation-responses/page.tsx` | Server component wrapper (auth, error boundary) |
| `validation-responses/ValidationResponsesPageClient.tsx` | Main client component, state management, data fetching |
| `validation-responses/route.ts` | API endpoint — fetches, groups, and scores responses |
| `components/ValidationSummaryHeader.tsx` | 4 metric cards + "Needs Attention" misalignment list |
| `components/ConfidenceCallout.tsx` | Confidence level indicator with progress to next milestone |
| `components/ValidationViewToggle.tsx` | Tab toggle between by-question and by-session (Framer Motion) |
| `components/ValidationByQuestionView.tsx` | Per-question response cards with founder comparison |
| `components/ValidationBySessionView.tsx` | Per-respondent cards with response preview |
| `components/ValidationSessionList.tsx` | Clickable respondent list with status badges |
| `components/ValidationSessionDetail.tsx` | Expanded two-column comparison for selected respondent |
| `lib/.../alignment-calculator.ts` | Per-response, per-question, and overall alignment scoring |
| `lib/.../confidence-thresholds.ts` | Session-count-based confidence levels |
| `lib/.../validation-types.ts` | All TypeScript interfaces |
| `lib/.../validation-utils.ts` | Value formatting + relative date formatting |

---

## Adapting to Another Project

To replicate this system for a different questionnaire project, here's what to extract and what to replace:

### Keep As-Is (Generic Patterns)
- **Dual-view architecture** — The by-question / by-session toggle with single-fetch, dual-grouping API
- **Type definitions** — `ValidationResponseByQuestion`, `ValidationResponseBySession`, `ValidationSummary` (rename domain-specific fields)
- **Value formatting** — `formatResponseValue()` handles all JSON value types
- **Confidence thresholds** — Adjust numbers but keep the progressive milestone pattern
- **Session list + detail** — The list-click-to-expand-detail pattern with auto-scroll
- **Summary header** — Metric cards + "Needs Attention" misalignment callout

### Replace (Domain-Specific)
- **Alignment scoring** — The current calculator is built around specific question types (this-or-that, slider, ranking, etc.). Replace `calculateAlignment()` with scoring appropriate to your question types. If your questionnaire doesn't have a "founder assumption" to compare against, you can simplify to just display raw responses without alignment.
- **Question registry** — References to `questionSequence` and `getQuestionById()` assume a static question list. Replace with your questionnaire's question source (could be database-driven).
- **Customized question text** — The `validationContextualizedText` pattern assumes questions were customized per-persona. If your questions are static, remove this layer.
- **Auth/ownership** — Replace `ensureUserFromUnifiedSession()` and persona ownership check with your auth system.

### Minimal Implementation Checklist

1. **Database:** Create `Questionnaire`, `QuestionnaireSession`, and `Response` models (mirror the schema above)
2. **API route:** Single GET endpoint that returns `{ responsesByQuestion, responsesBySession, sessions, summary }`
3. **Client component:** Single page with `activeView` state toggle, single fetch on mount
4. **By-question view:** Map over `responsesByQuestion` entries, render question card with all responses
5. **By-session view:** Session list + expandable detail panel
6. **Summary:** Calculate totals, completion rates, and any scoring server-side

The core insight: **one API call, two data groupings, zero re-fetches on view toggle**. The API does the heavy lifting of grouping and scoring; the client is a thin rendering layer.
