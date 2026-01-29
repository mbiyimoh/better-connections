# M33T Match Reveal Experience

**Slug:** m33t-match-reveal-experience
**Author:** Claude Code
**Date:** 2026-01-27
**Branch:** feat/m33t-match-reveal-experience
**Related:**
- `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md` (Phase 2 design)
- `specs/m33t-invitee-experience-v1/01-ideation.md` (invitee auth)
- `developer-guides/08-m33t-event-management-guide.md`
- `prisma/schema.prisma` (Match model, RevealTiming enum)

---

## 1) Intent & Assumptions

### Task Brief
Implement the attendee-facing match reveal experience: the moment when attendees discover their curated connections before the event. This includes the reveal UI (viewing matches), automatic reveal scheduling based on event timing, and feedback collection on match quality.

### Assumptions
- Matches are already generated and curated by organizers (existing functionality)
- Reveal timing is configured per-event (`IMMEDIATE`, `24_HOURS_BEFORE`, `48_HOURS_BEFORE`)
- Attendees access matches via token-based URL (sent in SMS/email notification)
- Match reveal is a "moment" — should feel special, not transactional
- Feedback collection is lightweight (thumbs up/down, not detailed surveys)
- Initially token-based; authenticated access comes with invitee auth spec

### Out of Scope
- Match generation algorithm improvements
- Organizer match curation UI (already exists)
- Real-time match updates during event
- Post-event follow-up or connection requests
- LinkedIn/email integration for contacting matches

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `prisma/schema.prisma` | `Match` model complete with status (PENDING/APPROVED/REJECTED/REVEALED), whyMatch, conversationStarters. `RevealTiming` enum exists. `EventAttendee.matchRevealSentAt` tracks notification. |
| `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md` | Phase 2 design: Reveal Notification → Reveal Intro → Match Cards (carousel) → Match Detail (trading card, why matched, starters, actions). |
| `src/app/api/events/[eventId]/notify/route.ts` | `match_reveal` notification type exists. Sends email + SMS with `viewUrl: /rsvp/${token}/matches`. But that route doesn't exist! |
| `src/lib/notifications/email.ts` | `generateMatchRevealEmail()` template exists — shows top 3 matches with names, roles, one whyMatch reason. |
| `src/lib/notifications/sms.ts` | `SMS_TEMPLATES.matchReveal()` exists — "Your X curated connections are ready!" |
| `src/app/(dashboard)/events/[eventId]/matches/page.tsx` | Organizer curation UI complete: stats, match cards, approve/reject, regenerate. |
| `src/app/rsvp/[token]/complete/page.tsx` | Completion page shows reveal timing message but no link to matches view. |

---

## 3) Codebase Map

### Primary Components/Modules
| Path | Role | Status |
|------|------|--------|
| `prisma/schema.prisma` | Match model, RevealTiming enum | ✅ Complete |
| `src/app/api/events/[eventId]/matches/**` | Match CRUD, generation | ✅ Complete |
| `src/app/api/events/[eventId]/notify/route.ts` | Notification sending | ✅ Complete |
| `src/lib/notifications/` | Email/SMS templates | ✅ Complete |
| `src/app/(dashboard)/events/[eventId]/matches/page.tsx` | Organizer curation | ✅ Complete |
| `src/app/rsvp/[token]/matches/**` | Attendee match view | ❌ **MISSING** |
| `src/components/m33t/MatchCard.tsx` | Match card component | ❌ **MISSING** |
| Background job for auto-reveal | Scheduled reveal trigger | ❌ **MISSING** |

### Shared Dependencies
- Token verification (`lib/m33t/tokens.ts`)
- Trading card components (can adapt from landing page)
- Profile modal patterns (from landing page)
- Framer Motion for reveal animations

### Data Flow
```
Current (Organizer Side):
  Generate Matches → Curate (Approve/Reject) → Send Notification
       ↓                                              ↓
  Match.status = APPROVED                    matchRevealSentAt set
                                                     ↓
                              Email/SMS sent with /rsvp/[token]/matches link
                                                     ↓
                                              404 Page Not Found! 😱

Proposed:
  ... → Send Notification → Attendee clicks link
                                    ↓
                           /rsvp/[token]/matches
                                    ↓
                           Fetch attendee's approved matches
                                    ↓
                           Reveal intro animation → Match cards → Details
                                    ↓
                           Attendee gives feedback (optional)
                                    ↓
                           Match.status → REVEALED (or keep APPROVED?)
```

### Potential Blast Radius
- **New routes:** `/rsvp/[token]/matches`, `/rsvp/[token]/matches/[matchId]`
- **New API:** `/api/rsvp/[token]/matches`
- **New components:** MatchCard, MatchRevealIntro, MatchDetail
- **Match model:** May need `viewedAt` field for analytics
- **Background jobs:** Auto-reveal scheduler (Inngest or cron)
- **Token handling:** Same token system, new route protection

---

## 4) Root Cause Analysis

N/A — This is a new feature, not a bug fix.

---

## 5) Research Findings

### Reveal Experience Patterns

#### Option A: All-at-Once Reveal
Show all matches immediately in a list/grid.

**Pros:** Simple, fast access
**Cons:** No anticipation, less "special" feeling

#### Option B: Sequential Reveal (Tinder-style)
Show matches one at a time, swipe through stack.

**Pros:** Creates anticipation, gamified, focused attention
**Cons:** More complex UI, can feel slow if many matches

#### Option C: Carousel with Intro (Recommended)
Brief intro animation → carousel of match cards → tap for detail.

**Pros:** Balance of anticipation and accessibility, matches handoff design
**Cons:** Medium complexity

#### Recommendation: Option C
Aligns with ATTENDEE_JOURNEY.md design. Intro creates moment, carousel gives overview, detail provides depth.

### Match Status Lifecycle

#### Current States
```
PENDING → APPROVED → REVEALED
              ↓
          REJECTED
```

#### Question: When does APPROVED → REVEALED?
- **Option A:** When notification is sent
- **Option B:** When attendee first views matches
- **Option C:** Keep as APPROVED, add separate `viewedAt` timestamp

#### Recommendation: Option C
Keep status clean (APPROVED = curated by organizer), add `viewedAt` for analytics.

### Auto-Reveal Scheduling

#### Option A: Cron Job
Traditional scheduled task checking for events approaching reveal time.

**Pros:** Simple, well-understood
**Cons:** Requires server infrastructure, timing granularity issues

#### Option B: Inngest Background Job (Recommended)
Event-driven scheduling with precise timing.

**Pros:** Already in codebase (used elsewhere), precise scheduling, retries
**Cons:** Additional Inngest function to maintain

#### Option C: Manual Only
Organizer must click "Send Reveals" button.

**Pros:** Full control
**Cons:** Easy to forget, bad UX for organizers

#### Recommendation: Option B + Option C
Auto-schedule reveal with Inngest, but also allow manual trigger. Organizer can override timing.

---

## 6) Clarifications Needed

1. **Reveal Intro:** How elaborate should the intro animation be?
   - Option A: Simple fade-in with "Your matches are ready!" text
   - Option B: Full storytelling sequence (like landing page scrollytelling)
   - Option C: Skippable intro with "Skip to matches" option
   >> option A

2. **Match Card Content:** What should match cards show at a glance?
   - Name, photo, headline (minimum)
   - + Match score / strength indicator?
   - + One-line "why you match" teaser?
   - + Seeking/offering preview?
   >> all of this minus match score

3. **Match Detail View:** Separate page or modal?
   - Option A: Modal overlay (faster, stays in context)
   - Option B: Separate page (`/rsvp/[token]/matches/[matchId]`)
   - Option C: Expandable card (accordion-style)
   >> modal

4. **Feedback Mechanism:** What feedback do we collect?
   - Option A: Simple thumbs up/down per match
   - Option B: "Looks Great" / "Not a Fit" with optional note
   - Option C: No feedback (just viewing analytics)
   >> option C, and no viewing analytics eitherfor v1

5. **Viewing Without Notification:** Can attendees access `/rsvp/[token]/matches` before reveal time?
   - Option A: No — 404 until reveal time
   - Option B: Yes — show "coming soon" placeholder
   - Option C: Yes — if matches exist and are approved
   >> option B

6. **Multiple Reveals:** If organizer regenerates matches after initial reveal:
   - Notify attendees again?
   - Show "updated matches" indicator?
   - Preserve feedback on unchanged matches?
   >> organizer should have control over if and when attendees get notified again if matches change but it should be unlikely that the MAIN pre-event matches change (although we may need to do some quick hot-swapping) at the event itself if some people who RSVP-ed don't show, for example

---

## 7) Proposed Implementation Breakdown

This should be **2 specs**:

### Spec A: Match Reveal Core (API + Basic UI)

**Scope:**
- API endpoint: `GET /api/rsvp/[token]/matches` (fetch attendee's matches)
- Pages: `/rsvp/[token]/matches` (match list/carousel view)
- Components: MatchCard, MatchDetail (modal or page)
- Match data: Adapt trading card display for match context
- Token verification: Ensure attendee can only see their matches
- Analytics: Track `viewedAt` timestamp per match

**Dependencies:** None (uses existing Match model)

**Estimated complexity:** Medium

---

### Spec B: Match Reveal Automation & Polish

**Scope:**
- Auto-reveal scheduling: Inngest background job
  - Check events approaching reveal time
  - Send notifications automatically
  - Handle timezone considerations
- Reveal intro animation: Brief, skippable intro
- Feedback collection: Simple "helpful" / "not helpful" buttons
- Manual trigger: Organizer "Send Reveals Now" button
- Status updates: Track which matches were viewed

**Dependencies:** Spec A (core reveal must exist)

**Estimated complexity:** Medium

---

## 8) Schema Changes (Draft)

### Match Model Update (Optional)
```prisma
model Match {
  // Existing fields
  status   MatchStatus  // PENDING, APPROVED, REJECTED, REVEALED

  // New: Analytics
  viewedAt DateTime?    // When attendee first viewed this match
  feedback String?      // "helpful" | "not_helpful" | null

  // New: Tracking
  revealedAt DateTime?  // When match was revealed (via notification)
}
```

### EventAttendee Update (Optional)
```prisma
model EventAttendee {
  // Existing
  matchRevealSentAt DateTime?

  // New: First view tracking
  matchesFirstViewedAt DateTime?
}
```

---

## 9) API Endpoints (Draft)

### Attendee Match Access
```
GET /api/rsvp/[token]/matches
    → { matches: Match[], event: Event, attendee: EventAttendee }
    Requires: Valid token, matches exist for this attendee

GET /api/rsvp/[token]/matches/[matchId]
    → { match: Match, matchedWith: EventAttendee }
    Requires: Match belongs to this attendee

POST /api/rsvp/[token]/matches/[matchId]/view
    → { success: true }
    Side effect: Sets match.viewedAt if null

POST /api/rsvp/[token]/matches/[matchId]/feedback
    Body: { feedback: "helpful" | "not_helpful" }
    → { success: true }
```

### Organizer Actions
```
POST /api/events/[eventId]/matches/reveal
    → { success: true, matchesRevealed: number, notificationsSent: number }
    Manual trigger for immediate reveal
```

---

## 10) UI Components (Draft)

### Match Reveal Page Structure
```
/rsvp/[token]/matches

┌─────────────────────────────────────┐
│         [Reveal Intro]              │  ← Optional, skippable
│   "Your connections are ready!"     │
│         [View Matches →]            │
└─────────────────────────────────────┘
              ↓ (auto or click)
┌─────────────────────────────────────┐
│  ┌───────┐  ┌───────┐  ┌───────┐   │
│  │ Match │  │ Match │  │ Match │   │  ← Carousel or grid
│  │   1   │  │   2   │  │   3   │   │
│  │ Photo │  │ Photo │  │ Photo │   │
│  │ Name  │  │ Name  │  │ Name  │   │
│  │ Role  │  │ Role  │  │ Role  │   │
│  └───────┘  └───────┘  └───────┘   │
│                                     │
│         [← prev]  [next →]          │
└─────────────────────────────────────┘
              ↓ (tap card)
┌─────────────────────────────────────┐
│        [Match Detail Modal]         │
│   ┌─────────────────────────────┐   │
│   │       Trading Card (L3)     │   │
│   └─────────────────────────────┘   │
│                                     │
│   Why You're Matched                │
│   • "Both interested in AI"         │
│   • "Complementary expertise"       │
│                                     │
│   Conversation Starters             │
│   • "Ask about their work on..."    │
│   • "You both love..."              │
│                                     │
│   [👍 Helpful]  [👎 Not a Fit]      │
│                                     │
│   [Close]                           │
└─────────────────────────────────────┘
```

### Reusable Components
- `MatchCard` — Photo, name, headline, score badge
- `MatchDetailModal` — Full trading card + why match + starters
- `RevealIntro` — Animation/splash before showing matches
- `FeedbackButtons` — Helpful/Not helpful toggle

---

## 11) Open Questions for Product

1. **Match Score Display:** Should attendees see the match "score" (0-100)?
   - Pro: Transparency, shows algorithm confidence
   - Con: Might bias perception, awkward if low score

2. **Match Ordering:** How are matches ordered for attendee?
   - By score (highest first)?
   - By organizer's curated position?
   - Randomized?

3. **Conversation Starters:** How many to show?
   - 2-3 seems right, but what if AI generated more?

4. **"Not a Fit" Consequences:** What happens if attendee marks a match as not helpful?
   - Just analytics?
   - Notify organizer?
   - Affect future matching (different events)?

5. **Pre-Event Reminder:** Should we remind attendees to review matches closer to event?
   - "Event is tomorrow! Review your 3 matches"

6. **Match Reveal Timing Edge Cases:**
   - What if event date changes after reveal timing is set?
   - What if matches are regenerated after reveal?
   - What if attendee RSVP changes to DECLINED after reveal?

---

## 12) Next Steps

1. **Get clarifications** on product questions above
2. **Create Spec A** (core API + basic UI) as detailed specification
3. **Design** match card and detail UI (can reuse trading card patterns)
4. **Coordinate** with invitee auth spec (authenticated match access)
5. **Plan** Inngest job for auto-reveal scheduling
