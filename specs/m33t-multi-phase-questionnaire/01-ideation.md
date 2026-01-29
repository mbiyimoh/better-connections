# M33T Multi-Phase Questionnaire System

**Slug:** m33t-multi-phase-questionnaire
**Author:** Claude Code
**Date:** 2026-01-27
**Branch:** feat/m33t-multi-phase-questionnaire
**Related:**
- `docs/question-sets-and-RSVP-flow.md` (core design vision)
- `specs/m33t-invitee-experience-v1/01-ideation.md` (invitee auth - dependency)
- `developer-guides/09-m33t-landing-pages-guide.md`
- `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md`

---

## 1) Intent & Assumptions

### Task Brief
Implement a multi-phase questionnaire system allowing organizers to create multiple question sets that can be released over time (drip strategy). New guests complete all available sets; returning guests only see new sets they haven't completed. Automatic notifications alert attendees when new questions are available.

### Assumptions
- Question sets are event-specific (each event has its own sets)
- Sets can be created at any time (before or after RSVPs open)
- Sets can be auto-published based on timing (e.g., "14 days before event")
- Profile extraction happens per-set (incremental enrichment)
- Responses are stored with set context (not flat array)
- Token-based access remains for now; authenticated access (Spec A) is separate
- SMS/email notifications use existing Twilio/Resend infrastructure

### Out of Scope
- Invitee authentication (covered in `m33t-invitee-experience-v1`)
- Match reveal experience (separate spec)
- Conditional/branching questions (skip logic)
- Question dependencies across sets
- Real-time collaborative editing of question sets

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `docs/question-sets-and-RSVP-flow.md` | Core vision: Phase 1 (starter), Phase 2 (core matching), Phase 3+ (drip). Sets can be added after RSVPs live. Returning guests only see new sets. |
| `prisma/schema.prisma` | Current: `Event.questions` is flat JSON array. `EventAttendee.questionnaireResponses` is single array with `questionnaireCompletedAt` timestamp. No multi-set support. |
| `src/lib/m33t/schemas.ts` | `QuestionSchema` exists. No `QuestionSetSchema`. Responses keyed by `questionId` only. |
| `src/lib/m33t/questions.ts` | `REQUIRED_QUESTIONS` and `STARTER_QUESTIONS` are just arrays, not "sets" in the system sense. |
| `src/app/rsvp/[token]/questionnaire/page.tsx` | Single-flow UI: fetches all questions, shows one at a time, single completion. |
| `src/app/api/rsvp/[token]/questionnaire/save/route.ts` | Saves all responses to single JSON array. `isComplete` flag marks entire questionnaire done. |
| `src/components/events/wizard/steps/QuestionnaireStep.tsx` | Event wizard adds questions to flat array. No set management UI. |

---

## 3) Codebase Map

### Primary Components/Modules
| Path | Role |
|------|------|
| `prisma/schema.prisma` | Event, EventAttendee models (need schema changes) |
| `src/lib/m33t/schemas.ts` | Zod schemas for Question, Response (need QuestionSet) |
| `src/lib/m33t/questions.ts` | Default question arrays |
| `src/app/rsvp/[token]/questionnaire/page.tsx` | Attendee questionnaire UI |
| `src/app/api/rsvp/[token]/questionnaire/**` | Questionnaire API routes |
| `src/components/events/wizard/steps/QuestionnaireStep.tsx` | Organizer question editor |
| `src/components/m33t/questions/*.tsx` | Question type components (reusable) |
| `src/lib/notifications/` | Email/SMS infrastructure |
| `src/app/api/events/[eventId]/notify/route.ts` | Notification endpoint |

### Shared Dependencies
- Question type components (4 types: open_text, slider, single_select, multi_select)
- Profile extraction via GPT-4o (`/api/rsvp/[token]/questionnaire/complete`)
- Notification services (Twilio SMS, Resend email)
- Token verification (`lib/m33t/tokens.ts`)

### Data Flow
```
Current:
  Event.questions (flat array) → Attendee answers all → questionnaireResponses (flat) → Profile extraction

Proposed:
  Event.questionSets (array of sets)
       ↓
  Attendee sees: "Which sets are available AND not completed?"
       ↓
  Complete Set 1 → Extract profile increment → Store in completedSets
       ↓
  [Time passes, new set published]
       ↓
  Notification: "New questions available"
       ↓
  Complete Set 2 → Merge into profile → Update completedSets
```

### Potential Blast Radius
- **Event model:** `questions` → `questionSets` migration
- **EventAttendee model:** New fields for tracking completed sets
- **Questionnaire API:** All 3 routes need multi-set awareness
- **Event wizard:** New "Question Sets" management UI
- **Attendee UI:** Multi-set flow with set selection/progress
- **Notifications:** New "new questions available" type

---

## 4) Root Cause Analysis

N/A — This is a new feature, not a bug fix.

---

## 5) Research Findings

### Storage Pattern Options

#### Option A: JSON Array on Event (Recommended for V1)
```prisma
model Event {
  questionSets Json?  // Array of QuestionSet objects
}

type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  order: number;
  publishedAt?: DateTime;
  autoPublishDaysBefore?: number;
}
```

**Pros:** Simple migration, no new table, consistent with current `questions` pattern
**Cons:** No relational queries on sets, harder to track completion per-set across events

#### Option B: Separate QuestionSet Model
```prisma
model QuestionSet {
  id        String   @id
  eventId   String
  event     Event    @relation(...)
  title     String
  questions Json
  order     Int
  publishedAt DateTime?
  autoPublishDaysBefore Int?

  @@unique([eventId, order])
}
```

**Pros:** Relational integrity, can query across events, cleaner schema
**Cons:** More complex migration, joins required

#### Recommendation: Option A for V1
Start with JSON storage (matches current pattern), migrate to separate model if needed for scale.

### Completion Tracking Options

#### Option A: Array of Completed Set IDs
```prisma
model EventAttendee {
  completedQuestionSetIds String[]  // ["starter", "core"]
}
```

**Pros:** Simple, fast to check
**Cons:** No timestamps, no per-set metadata

#### Option B: JSON Object with Metadata (Recommended)
```prisma
model EventAttendee {
  completedQuestionSets Json?  // [{ setId, completedAt, responseCount }]
}
```

**Pros:** Rich metadata, timestamps, extensible
**Cons:** Slightly more complex queries

#### Recommendation: Option B
Timestamps are valuable for analytics and debugging.

### Response Storage Options

#### Option A: Keep Flat Array (Current)
All responses in single `questionnaireResponses` array, no set context.

**Pros:** No migration needed, backward compatible
**Cons:** Can't identify which responses belong to which set

#### Option B: Add setId to Each Response (Recommended)
```typescript
interface QuestionnaireResponse {
  questionId: string;
  setId: string;  // NEW
  value: string | number | string[];
  answeredAt: DateTime;
}
```

**Pros:** Full context, can filter by set, backward compatible (old responses have no setId)
**Cons:** Slightly larger storage

#### Recommendation: Option B
Adding `setId` to responses is minimal overhead and enables powerful filtering.

---

## 6) Clarifications Needed

1. **Set Naming Convention:** Should sets have user-defined titles, or use standard names?
   - Option A: Free-form titles ("Starter Questions", "Deep Dive", "Fun Facts")
   - Option B: Standard phases ("Phase 1", "Phase 2", "Phase 3")
   - Option C: Both (internal ID + display title)
   >> option C

2. **Auto-Publish Behavior:** When a set auto-publishes:
   - Should it immediately send notifications to all eligible attendees?
   - Or wait for organizer to trigger notification separately?
   >> nothing should auto-publish — organizers should always have to explicitly publish sets of new questions before they are sent out / made available to invitees. and when you hit the publish button, you should have the option to immediately send out notifications vs choosing to send out the notification later (if the user wants to test the new questoins in production before alerting invitees, for example)

3. **Incomplete Set Handling:** If attendee starts a set but doesn't finish:
   - Can they come back later and resume?
   - Is there a timeout/expiration?
   - Do partial responses count toward anything?
   >> should be able to come back and resume. responses should be saved after each answer is provided. there shouldnt be any "partial answers" — maybe just 1 or 2 questions from a question set just not being answered at all

4. **Profile Extraction Strategy:**
   - Extract profile after EACH set completion?
   - Or wait until ALL available sets are complete?
   - Merge strategy for conflicting fields across sets?
   >> this should not be an "extract profile" step but rather a, "suggest updates to the existing profile" since all invitees will start with a profile created / curated by the organizers (and may have made some manual edits to it as well)

5. **Organizer Visibility:** Can organizers see:
   - Which attendees have completed which sets?
   - Completion rates per set?
   - Time-to-complete metrics?
   >> the first two yes, "time-to-complete" no

6. **Migration Strategy:** For existing events with questions:
   - Wrap existing questions in a "Legacy" set?
   - Or require organizer to re-organize into sets?
   >> theres only one existing event and I was gonna redo the questions fpr it anyways, so do whatever 's easiest / least complexity

---

## 7) Proposed Implementation Breakdown

This should be **2 specs** to keep scope manageable:

### Spec A: Multi-Phase Questionnaire Infrastructure

**Scope:**
- Database schema changes (QuestionSet storage, completion tracking)
- Type definitions (`QuestionSetSchema`, updated response schema)
- Migration for existing events (wrap in default set)
- API endpoints for set management (CRUD for organizers)
- API endpoints for attendee set status (which sets to show)
- Core logic for "which sets are available for this attendee"

**Dependencies:** None (foundational)

**Estimated complexity:** Medium

---

### Spec B: Multi-Phase Questionnaire UX

**Scope:**
- Event wizard: Question Sets management UI
  - Create/edit/delete sets
  - Set ordering and timing
  - Auto-publish configuration
- Attendee questionnaire: Multi-set flow
  - Set selection/progress indicators
  - Resume incomplete sets
  - Celebration per-set completion
- Notifications: "New questions available" type
  - SMS/email templates
  - Trigger endpoint
  - Background job for auto-publish + notify

**Dependencies:** Spec A (infrastructure must exist)

**Estimated complexity:** Medium-High

---

## 8) Schema Changes (Draft)

### Event Model Update
```prisma
model Event {
  // Deprecate (but keep for migration)
  questions    Json     @default("[]")

  // New: Multi-set storage
  questionSets Json?    // QuestionSet[]
}
```

### EventAttendee Model Update
```prisma
model EventAttendee {
  // Keep existing
  questionnaireResponses     Json?       // Now includes setId per response
  questionnaireCompletedAt   DateTime?   // Marks ALL sets complete

  // New: Per-set tracking
  completedQuestionSets      Json?       // [{ setId, completedAt, responseCount }]
  lastQuestionSetNotifiedAt  DateTime?   // When we last notified about new sets
}
```

### Type Definitions
```typescript
// New schema
export const QuestionSetSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
  order: z.number(),
  publishedAt: z.date().optional(),
  autoPublishDaysBefore: z.number().optional(),
});

// Updated response schema
export const QuestionnaireResponseSchema = z.object({
  questionId: z.string(),
  setId: z.string().optional(),  // NEW - optional for backward compat
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  answeredAt: z.coerce.date(),
});

// Completion tracking
export const CompletedSetSchema = z.object({
  setId: z.string(),
  completedAt: z.date(),
  responseCount: z.number(),
});
```

---

## 9) API Endpoints (Draft)

### Organizer Endpoints
```
GET  /api/events/[eventId]/question-sets
POST /api/events/[eventId]/question-sets
PUT  /api/events/[eventId]/question-sets/[setId]
DELETE /api/events/[eventId]/question-sets/[setId]
POST /api/events/[eventId]/question-sets/[setId]/publish
POST /api/events/[eventId]/question-sets/[setId]/notify
```

### Attendee Endpoints
```
GET  /api/rsvp/[token]/question-sets/status
     → { completedSets, pendingSets, currentSet? }

GET  /api/rsvp/[token]/question-sets/[setId]
     → { set, responses }

POST /api/rsvp/[token]/question-sets/[setId]/save
     → { success, responsesCount }

POST /api/rsvp/[token]/question-sets/[setId]/complete
     → { success, completedAt, profileUpdated }
```

---

## 10) Open Questions for Product

1. **Minimum Sets:** Should every event have at least one set, or can it have zero (skip questionnaire entirely)?

2. **Set Visibility to Attendees:** Should attendees see:
   - Only the current set they need to complete?
   - A list of all upcoming sets (for expectation setting)?
   - Progress across all sets ("2 of 3 complete")?

3. **Notification Frequency:** If multiple sets become available simultaneously:
   - Send one notification per set?
   - Bundle into single "3 new question sets available" notification?

4. **Questionnaire Completion Definition:** When is the overall questionnaire "complete"?
   - When all CURRENTLY published sets are done?
   - When ALL sets (including future ones) are done?
   - Let organizer define "complete" threshold?

5. **Set Dependencies:** Can a set require a previous set to be completed first?
   - Example: "Core Questions" only available after "Starter Questions" complete
   - Or are all published sets always available?

---

## 11) Next Steps

1. **Get clarifications** on product questions above
2. **Create Spec A** (infrastructure) as detailed specification
3. **Plan migration** for existing events with questions
4. **Prototype** multi-set UI flow (wireframes)
5. **Coordinate** with invitee auth spec (determines how attendees return)
