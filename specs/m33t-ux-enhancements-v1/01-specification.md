# M33T UX Enhancements - Specification

**Status:** Ready for Implementation
**Author:** Claude Code
**Date:** 2026-01-28
**Slug:** m33t-ux-enhancements-v1

---

## Overview

This specification addresses five UX gaps identified during the M33T V1 implementation review. These enhancements improve organizer workflows and complete the invitee experience with profile suggestions after questionnaire completion.

**Gaps Addressed:**
1. **Gap 2:** Match Reveal Notification UI (organizer)
2. **Gap 3:** Questionnaire Reminder Notification (organizer)
3. **Gap 4:** Profile Suggestions After Questionnaire (invitee)
4. **Gap 5:** Deferred - Question Sets Overview Page (depends on Multi-Phase Questionnaire)
5. **Gap 6:** Manual Match Creation UI (organizer)

---

## Gap 2: Match Reveal Notification UI

### Problem
Organizers must use the API directly to send match reveal notifications. The "Send Match Reveals" action should be accessible from the match curation page.

### Solution
Add a "Send Match Reveals" button to the match curation page quick actions bar.

### Implementation

#### UI Changes

**Location:** `src/app/(dashboard)/events/[eventId]/matches/page.tsx`

Add button in quick actions section:

```typescript
<Button
  variant="default"
  onClick={() => setShowMatchRevealDialog(true)}
  disabled={approvedCount === 0 || sendingNotifications}
  className="bg-gold-primary hover:bg-gold-light"
>
  <Send className="w-4 h-4 mr-2" />
  Send Match Reveals
</Button>
```

#### MatchRevealDialog Component

**Location:** `src/components/events/matches/MatchRevealDialog.tsx`

```typescript
interface MatchRevealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eligibleCount: number; // CONFIRMED attendees with APPROVED matches who haven't received reveal
  onSuccess: (sentCount: number) => void;
}
```

**Content:**
- Header: "Send Match Reveals"
- Summary: "X attendees will receive their curated connections"
- Eligibility criteria display:
  - RSVP status: CONFIRMED
  - Has at least 1 APPROVED match
  - Hasn't received match reveal notification yet
- Preview of attendee list (collapsible)
- Confirm/Cancel buttons

#### API Integration

Uses existing endpoint:
```typescript
POST /api/events/[eventId]/notify
{ type: 'match_reveal' }
```

### Success Criteria
- [x] Button visible on match curation page
- [x] Dialog shows eligible attendee count
- [x] Successful send updates UI and shows toast
- [x] Button disabled when no eligible attendees

---

## Gap 3: Questionnaire Reminder Notification

### Problem
No way to remind attendees who started but didn't complete their questionnaire.

### Solution
Add `questionnaire_reminder` notification type and UI button on event overview.

### Implementation

#### API Changes

**Location:** `src/app/api/events/[eventId]/notify/route.ts`

Add to notification type enum:
```typescript
type: z.enum([
  'invitation',
  'rsvp_reminder',
  'match_reveal',
  'event_reminder',
  'questionnaire_reminder' // NEW
])
```

Eligibility filter for `questionnaire_reminder`:
```typescript
case 'questionnaire_reminder':
  return {
    rsvpStatus: 'CONFIRMED',
    questionnaireCompletedAt: null, // Started but not completed
    questionnaireReminderSentAt: null, // Haven't sent reminder yet
  };
```

#### Database Changes

**Add to EventAttendee model:**
```prisma
questionnaireReminderSentAt DateTime?
```

#### Email/SMS Templates

**SMS Template:**
```typescript
SMS_TEMPLATES.questionnaireReminder = (eventName: string) =>
  `Don't forget to complete your profile for ${eventName}! ` +
  `Your answers help us create better connections. Finish here: {link}`;
```

**Email Template:**
- Subject: "Complete your profile for {eventName}"
- Body: Progress indicator, remaining question count, CTA button

#### UI Changes

**Location:** Event overview page, quick actions section

Add "Send Questionnaire Reminders (N)" button where N is count of incomplete profiles.

### Success Criteria
- [x] API accepts `questionnaire_reminder` type
- [x] Filters to CONFIRMED attendees without completed questionnaire
- [x] Button shows count of eligible attendees
- [x] SMS and email sent successfully

---

## Gap 4: Profile Suggestions After Questionnaire

### Problem
After completing the questionnaire, profile data is extracted automatically without user review. Users should be able to review and accept/reject AI-suggested profile updates.

### Solution
Implement a profile suggestion review flow that mirrors the Better Contacts research enrichment pattern.

### Design Principles

**Pattern Alignment with Better Contacts:**
1. **Per-item loading state** - Use `{id, action}` object pattern
2. **Accept/reject per field** - Not bulk-only
3. **Edit before accept** - Allow modification of suggested values
4. **Manual dismiss** - Celebration/summary requires user action
5. **Inline diff** - Show changes for UPDATE actions
6. **Confidence indicators** - Color-code by confidence level

### Data Model

#### New: ProfileSuggestion Type

```typescript
interface ProfileSuggestion {
  id: string;
  field: ProfileField; // 'role' | 'company' | 'expertise' | 'seeking' | 'offering' | 'currentFocus'
  action: 'ADD' | 'UPDATE';
  currentValue: string | string[] | null;
  suggestedValue: string | string[];
  confidence: number; // 0.0 - 1.0
  reasoning: string; // "Based on your answer about..."
  sourceQuestion: {
    id: string;
    text: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  editedValue?: string | string[]; // If user modified before accepting
}

type ProfileField =
  | 'role'
  | 'company'
  | 'expertise'
  | 'seeking'
  | 'offering'
  | 'currentFocus'
  | 'location';
```

#### Field Mapping from Questionnaire

| Question Category | Profile Fields Updated |
|-------------------|----------------------|
| IDENTITY | role, company, location |
| GOALS | seeking, offering, currentFocus |
| BACKGROUND | expertise |
| PREFERENCES | conversationHooks |

### API Endpoints

#### POST `/api/rsvp/[token]/questionnaire/complete`

**Enhanced Response:**
```typescript
{
  success: true;
  completedAt: string;
  profileSuggestions: ProfileSuggestion[];
  attendeeId: string;
}
```

**Suggestion Generation Logic:**
1. Analyze questionnaire responses
2. Compare to current profile fields
3. Generate suggestions only where:
   - Field is empty (action: ADD)
   - Response provides more specific/accurate info (action: UPDATE)
4. Calculate confidence based on:
   - Question type (open_text = higher confidence)
   - Response length/specificity
   - Semantic match to field purpose

#### POST `/api/rsvp/[token]/profile-suggestions/apply`

**Request:**
```typescript
{
  suggestions: {
    id: string;
    status: 'ACCEPTED' | 'REJECTED';
    editedValue?: string | string[]; // If modified
  }[];
}
```

**Response:**
```typescript
{
  success: true;
  appliedCount: number;
  updatedFields: string[];
  profile: TradingCardProfile; // Updated profile
}
```

### UI Components

#### ProfileSuggestionReview Component

**Location:** `src/components/m33t/questionnaire/ProfileSuggestionReview.tsx`

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ✨ Review Your Profile Updates                              │
│                                                              │
│  Based on your answers, we've identified some profile       │
│  updates. Review each suggestion below.                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ROLE                                           [High]  │ │
│  │                                                        │ │
│  │ Suggested: Product Manager at Stripe                   │ │
│  │                                                        │ │
│  │ Based on your answer: "I lead product for the         │ │
│  │ payments API team at Stripe"                          │ │
│  │                                                        │ │
│  │ [Edit] [Accept ✓] [Reject ✗]                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ EXPERTISE                                     [Medium] │ │
│  │                                                        │ │
│  │ Add: API Design, Payments, Developer Experience       │ │
│  │                                                        │ │
│  │ Based on your answer about technical background       │ │
│  │                                                        │ │
│  │ [Edit] [Accept ✓] [Reject ✗]                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Skip All] [Accept All]          [Apply 2 Suggestions →]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Card per suggestion with accept/reject buttons
- Confidence indicator (High/Medium/Low with color)
- Source question reference
- Edit button opens inline editor
- Bulk actions: Accept All, Skip All
- Apply button shows accepted count

#### SuggestionCard Component

**Location:** `src/components/m33t/questionnaire/SuggestionCard.tsx`

**Pattern:** Mirror `RecommendationCard` from research flow

```typescript
interface SuggestionCardProps {
  suggestion: ProfileSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (newValue: string | string[]) => void;
  isLoading?: boolean;
  loadingAction?: 'accept' | 'reject';
}
```

**Confidence Colors:**
- High (≥80%): `text-emerald-400`
- Medium (60-79%): `text-amber-400`
- Low (<60%): `text-orange-400`

#### InlineSuggestionDiff Component

**Location:** `src/components/m33t/questionnaire/InlineSuggestionDiff.tsx`

Reuse pattern from `src/components/research/InlineDiff.tsx`:
- Strikethrough (red) for removed text
- Bold-italic (green) for added text

### Integration Flow

```
Questionnaire Complete
       │
       ▼
POST /api/rsvp/[token]/questionnaire/complete
       │
       ├── No suggestions? → Skip to /rsvp/[token]/complete
       │
       ├── Has suggestions?
       │       │
       │       ▼
       │   ProfileSuggestionReview
       │       │
       │       ├── Accept/Reject each
       │       │
       │       ▼
       │   Apply Accepted
       │       │
       │       ▼
       │   POST /api/rsvp/[token]/profile-suggestions/apply
       │       │
       │       ▼
       └───────┴── /rsvp/[token]/complete (with celebration)
```

### Updated Questionnaire Page

**Location:** `src/app/rsvp/[token]/questionnaire/page.tsx`

Add state for suggestion review:
```typescript
const [showSuggestions, setShowSuggestions] = useState(false);
const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);

// After completing questionnaire:
if (result.profileSuggestions?.length > 0) {
  setSuggestions(result.profileSuggestions);
  setShowSuggestions(true);
} else {
  router.push(`/rsvp/${token}/complete`);
}
```

### Success Criteria
- [x] Suggestions generated from questionnaire responses
- [x] Review UI matches Better Contacts patterns
- [x] Accept/reject works per-item with loading states
- [x] Edit before accept works
- [x] Bulk actions work (Accept All, Skip All)
- [x] Applied suggestions update profile correctly
- [x] Skip navigates to completion page

---

## Gap 6: Manual Match Creation UI

### Problem
Organizers can only create manual matches via API. Should be accessible from match curation UI.

### Solution
Add "Add Match" button that opens a dialog to select two attendees.

### Implementation

#### ManualMatchDialog Component

**Location:** `src/components/events/matches/ManualMatchDialog.tsx`

```typescript
interface ManualMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  attendees: EventAttendee[];
  onSuccess: () => void;
}
```

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Add Manual Match                                       [X] │
│                                                              │
│  Create a curator-recommended connection between two        │
│  attendees.                                                 │
│                                                              │
│  For Attendee:                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Search attendees...]                            ▼   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Match With:                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Search attendees...]                            ▼   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Curator Notes (optional):                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Why are you recommending this connection?            │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│                              [Cancel]  [Create Match]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Searchable attendee dropdowns
- Prevents selecting same attendee twice
- Prevents duplicate matches (checks existing)
- Optional curator notes field
- Match auto-approved (isManual = true)

#### UI Integration

**Location:** Match curation page quick actions

```typescript
<Button
  variant="outline"
  onClick={() => setShowManualMatchDialog(true)}
>
  <Plus className="w-4 h-4 mr-2" />
  Add Match
</Button>
```

### API Usage

Uses existing endpoint:
```typescript
POST /api/events/[eventId]/matches
{
  attendeeId: string;
  matchedWithId: string;
  curatorNotes?: string;
}
```

### Success Criteria
- [x] Button visible on match curation page
- [x] Dialog allows selecting two attendees
- [x] Duplicate prevention works
- [x] Match created with isManual = true
- [x] UI refreshes after creation

---

## Implementation Tasks

### Phase 1: Notification Enhancements (Gaps 2 & 3)

**1.1: Match Reveal Button**
- Add button to match curation page
- Create MatchRevealDialog component
- Wire up to existing notify API

**1.2: Questionnaire Reminder**
- Add `questionnaire_reminder` to notify API
- Add `questionnaireReminderSentAt` to schema
- Add SMS/email templates
- Add button to event overview page

### Phase 2: Profile Suggestions (Gap 4)

**2.1: Backend**
- Create suggestion generation logic in questionnaire/complete
- Create `/api/rsvp/[token]/profile-suggestions/apply` endpoint
- Add suggestion types and schemas

**2.2: Frontend**
- Create ProfileSuggestionReview component
- Create SuggestionCard component (mirror RecommendationCard)
- Create InlineSuggestionDiff component
- Integrate into questionnaire flow

### Phase 3: Manual Match UI (Gap 6)

**3.1: Component**
- Create ManualMatchDialog component
- Implement attendee search/selection
- Wire up to existing matches API

**3.2: Integration**
- Add button to match curation page
- Add success feedback and refresh

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── rsvp/
│           └── [token]/
│               └── profile-suggestions/
│                   └── apply/
│                       └── route.ts         # NEW
├── components/
│   ├── events/
│   │   └── matches/
│   │       ├── MatchRevealDialog.tsx        # NEW
│   │       └── ManualMatchDialog.tsx        # NEW
│   └── m33t/
│       └── questionnaire/
│           ├── ProfileSuggestionReview.tsx  # NEW
│           ├── SuggestionCard.tsx           # NEW
│           └── InlineSuggestionDiff.tsx     # NEW
└── lib/
    └── m33t/
        └── profile-suggestions.ts           # NEW - Generation logic
```

---

## Dependencies

- Existing notify API (`/api/events/[eventId]/notify`)
- Existing matches API (`/api/events/[eventId]/matches`)
- Existing questionnaire complete API (enhanced)
- InlineDiff pattern from research flow
- RecommendationCard pattern from research flow

---

## Success Metrics

1. Organizers can send match reveals from curation page
2. Organizers can send questionnaire reminders from overview
3. Invitees review and approve/reject profile suggestions
4. Profile suggestion UX feels consistent with Better Contacts research flow
5. Manual matches can be created via UI
