# M33T New RSVPs Notification System

**Slug:** m33t-new-rsvps-notification
**Author:** Claude Code
**Date:** 2026-02-06
**Branch:** preflight/m33t-new-rsvps-notification
**Related:** [M33T Architecture Guide](../../developer-guides/07-m33t-architecture-guide.md), [SMS Templates](../../src/lib/notifications/sms.ts)

---

## 1) Intent & Assumptions

**Task brief:** As an event organizer, I want to send SMS notifications to RSVPed attendees telling them "X more people have RSVPed since you did" with a link to a page showing those new attendees. The timestamp baseline is personalized per-attendee (each person only sees RSVPs that happened *after* their own RSVP).

**Assumptions:**
- Target audience is CONFIRMED attendees only (not MAYBE or PENDING)
- The "since" timestamp is the attendee's own `rsvpRespondedAt` field
- The new page is public (token-authenticated like other RSVP pages)
- SMS is the primary channel (email secondary/optional)
- Organizer manually triggers these notifications (not automated)
- Attendees can see names/profiles of new RSVPers (same privacy rules as existing guest list)

**Out of scope:**
- Automated/scheduled notifications (manual trigger only for MVP)
- Push notifications or in-app notifications
- "New matches" notifications (separate feature)
- Aggregate-only mode (showing just counts without names)
- Opt-out mechanism for being shown in "new RSVPs" (use existing attendee visibility settings)

---

## 2) Pre-reading Log

- `developer-guides/07-m33t-architecture-guide.md`: M33T uses token-based auth for public pages. RSVP tokens include `eventId`, `attendeeId`, `email`, expire 24h after event. Public pages at `/m33t/[slug]/*`.

- `developer-guides/09-m33t-landing-pages-guide.md`: Public landing page architecture with AttendeeCarousel, AttendeeCard, ProfileModal components. Status indicators (emerald=confirmed, amber=maybe, zinc=invited).

- `src/lib/notifications/sms.ts`: Twilio integration with lazy-loaded client. SMS_TEMPLATES object with typed template functions. `sendSMS()` accepts `to`, `body`, optional `scheduledAt`. Phone normalization via `normalizePhone()`.

- `src/app/api/events/[eventId]/notify/route.ts`: Main notification endpoint. Handles invitation, rsvp_reminder, match_reveal, event_reminder types. Filters eligible attendees, generates tokens, sends via email/SMS, updates `*SentAt` timestamps.

- `src/lib/m33t/tokens.ts`: `generateRSVPToken()`, `verifyRSVPToken()`, `generateRSVPUrl()`, `buildRsvpUrl()`. Tokens validated against event slug to prevent cross-event reuse.

- `prisma/schema.prisma` (EventAttendee): Key fields: `rsvpStatus`, `rsvpRespondedAt`, `phone`, `email`, `profile`, `tradingCard`, `displayOrder`, `profileRichness`.

- `src/app/api/public/events/[slug]/route.ts`: Public API excludes email, phone, questionnaireResponses. Transforms attendees to `PublicAttendee` format with merged profile/overrides.

- `src/app/m33t/[slug]/components/AttendeeCard.tsx`: Reusable card component showing name, title, company, expertise, currentFocus with status indicator dot.

---

## 3) Codebase Map

### Primary Components/Modules

| File | Role |
|------|------|
| `src/app/api/events/[eventId]/notify/route.ts` | Main notification dispatch (add new `new_rsvps` type) |
| `src/lib/notifications/sms.ts` | SMS sending + templates (add `newRsvps` template) |
| `src/app/m33t/[slug]/new-rsvps/[token]/page.tsx` | New public page showing RSVPs since viewer's RSVP |
| `src/app/api/public/events/[slug]/new-rsvps/route.ts` | New API endpoint returning filtered attendees |
| `src/lib/m33t/tokens.ts` | Token generation (reuse existing pattern) |
| `src/components/events/NewRsvpsDialog.tsx` | Organizer UI to trigger notification |

### Shared Dependencies

- **Notifications:** `src/lib/notifications/` (sms.ts, email.ts, utils.ts)
- **M33T Core:** `src/lib/m33t/` (tokens.ts, auth.ts, schemas.ts)
- **UI Components:** AttendeeCard, AttendeeCarousel (reuse from landing page)
- **Phone Utils:** `src/lib/phone.ts` (normalizePhone for E.164)

### Data Flow

```
Organizer triggers "Send New RSVPs Update"
    ↓
API: /api/events/[eventId]/notify (type: 'new_rsvps')
    ↓
For each CONFIRMED attendee with phone:
    1. Calculate count: RSVPs where rsvpRespondedAt > this attendee's rsvpRespondedAt
    2. Skip if count = 0
    3. Generate personalized URL: /m33t/[slug]/new-rsvps/[token]?since=[timestamp]
    4. Send SMS: "X new people RSVPed for [Event]! See who: [url]"
    5. Update attendee.newRsvpsNotifiedAt (new field)
    ↓
Attendee clicks link
    ↓
Page: /m33t/[slug]/new-rsvps/[token]
    - Verify token
    - Extract attendee's rsvpRespondedAt as baseline
    - Fetch attendees where rsvpRespondedAt > baseline AND status IN (CONFIRMED, MAYBE)
    - Display using AttendeeCard components
```

### Feature Flags/Config

- No new feature flags needed
- Reuses existing `TWILIO_*` and `RSVP_TOKEN_SECRET` env vars

### Potential Blast Radius

- **notify/route.ts**: Adding new notification type (low risk - additive)
- **EventAttendee model**: New `newRsvpsNotifiedAt` field (requires migration)
- **SMS templates**: Adding new template (low risk - additive)
- **New pages/routes**: New public page and API endpoint (isolated)

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Potential Solutions

**Approach A: Per-attendee "since" timestamp from their own RSVP**
- Pros: Personalized experience, each person sees genuinely new attendees relative to them
- Pros: No additional database tracking needed (use existing `rsvpRespondedAt`)
- Cons: Attendee who RSVPed first sees everyone, attendee who RSVPed last sees no one
- Cons: Can't show "new since last notification" (only "new since your RSVP")

**Approach B: Track "last notified" timestamp per attendee**
- Pros: Can send multiple updates, each showing only truly new people
- Pros: Attendees can receive periodic updates as more people join
- Cons: Requires new field (`newRsvpsNotifiedAt`) on EventAttendee
- Cons: More complex state management

**Approach C: Hybrid - use `rsvpRespondedAt` for baseline, but also track notifications**
- Pros: Best of both - personalized baseline + ability to send follow-up updates
- Pros: First notification shows all RSVPs after their own, subsequent shows delta
- Cons: Slightly more complex logic

### Recommendation

**Approach C (Hybrid)** - Use `rsvpRespondedAt` as the initial baseline for the first notification. Track `newRsvpsNotifiedAt` to enable follow-up notifications that show only the delta. The page URL includes a `since` timestamp so it's self-contained and doesn't require additional state.

### SMS Best Practices Applied

- **Character limit:** Keep under 160 chars (no emoji penalty). Template: `"[N] more people RSVP'd for [Event] on [Date]! See who they are: [url]"` (~100 chars + URL
- **Short links:** Use token-based URL directly (already reasonably short with slug)
- **CTA clarity:** "See who they are" is action-oriented
- **Frequency:** Organizer-controlled (manual trigger prevents spam)

### Privacy Considerations

- Existing guest list privacy applies (attendees already visible on public landing page)
- No additional PII exposure (same fields as existing AttendeeCard)
- Token authentication ensures only invited attendees can view

---

## 6) Clarifications Needed

1. **Notification frequency:** Should there be a cooldown preventing organizers from sending this notification type more than once per X hours? Or trust organizer judgment?
   - **Options:** No limit / 24h cooldown / 48h cooldown / Warn but allow
   - **Recommendation:** Warn if sent within 24h, but allow override
   >> warn if within 24 hours but allow override

2. **MAYBE vs CONFIRMED only:** Should the "new RSVPs" include MAYBE responses, or only CONFIRMED?
   - **Options:** CONFIRMED only / CONFIRMED + MAYBE / Configurable
   - **Recommendation:** CONFIRMED + MAYBE (both are positive signals)
   >> confirmed only

3. **Empty state:** If an attendee RSVPed last (no one after them), should they still receive the SMS with "0 new" or be skipped?
   - **Options:** Skip entirely / Send with different message ("You're up to date!")
   - **Recommendation:** Skip - no value in "0 new" message
   >> skip them 

4. **Page design:** Should the new RSVPs page be a full standalone page or a modal/overlay on the existing landing page?
   - **Options:** Standalone page / Modal on landing page / Tab on landing page
   - **Recommendation:** Standalone page (simpler, works with direct link, consistent with other RSVP pages)
   >> standalone

5. **Timestamp display:** Should the page show *when* each new person RSVPed (e.g., "RSVPed 2 hours ago")?
   - **Options:** Show relative time / Show date only / Don't show time
   - **Recommendation:** Show relative time (reinforces recency/momentum)
   >> relative time

6. **Sort order:** How should new RSVPs be sorted on the page?
   - **Options:** Most recent first / Alphabetical / By profile richness
   - **Recommendation:** Most recent first (emphasizes momentum)
   >> recency

---

## 7) Component Design Summary

### New Database Field

```prisma
model EventAttendee {
  // ... existing fields
  newRsvpsNotifiedAt DateTime?  // Last time this attendee received "new RSVPs" notification
}
```

### New SMS Template

```typescript
// src/lib/notifications/sms.ts
interface NewRsvpsParams {
  eventName: string;
  eventDate: string;  // "March 12"
  newCount: number;
  viewUrl: string;
}

newRsvps: (params: NewRsvpsParams) =>
  `${params.newCount} more people RSVP'd for ${params.eventName} on ${params.eventDate}! See who they are: ${params.viewUrl}`,
```

### New API Endpoint: Trigger Notification

```typescript
// POST /api/events/[eventId]/notify
// Body: { type: 'new_rsvps', channels: 'sms' | 'email' | 'both' }

// For each CONFIRMED attendee with phone:
// 1. Count RSVPs where rsvpRespondedAt > attendee.rsvpRespondedAt
// 2. If count > 0, send SMS with personalized URL
// 3. Update attendee.newRsvpsNotifiedAt = now()
```

### New API Endpoint: Fetch New RSVPs

```typescript
// GET /api/public/events/[slug]/new-rsvps?token=[jwt]&since=[iso-timestamp]

// 1. Verify token, extract attendeeId
// 2. Fetch attendees where:
//    - rsvpRespondedAt > since
//    - rsvpStatus IN (CONFIRMED, MAYBE)
//    - id != requesting attendee's id
// 3. Transform to PublicAttendee format (same as existing)
// 4. Sort by rsvpRespondedAt DESC
```

### New Page: View New RSVPs

```typescript
// /m33t/[slug]/new-rsvps/[token]/page.tsx

// 1. Verify token (same pattern as other RSVP pages)
// 2. Extract attendee's rsvpRespondedAt as baseline
// 3. Fetch from /api/public/events/[slug]/new-rsvps
// 4. Display with header: "X new people since you RSVPed"
// 5. Use AttendeeCard components in responsive grid
// 6. "Back to event" link to /m33t/[slug]
```

### Organizer UI: Trigger Dialog

```typescript
// src/components/events/NewRsvpsNotifyDialog.tsx

// - Show count of eligible recipients (CONFIRMED with phone, who have new RSVPs to see)
// - Preview message template
// - Channel selection (SMS recommended, email optional)
// - Warning if sent within last 24h
// - "Send" button
```

---

## 8) Open Questions for User

The clarifications in section 6 would benefit from your input before proceeding to the full specification. In particular:

1. **Frequency limits** - Should there be a cooldown on this notification type?
2. **MAYBE inclusion** - Include MAYBE RSVPs or only CONFIRMED?
3. **Timestamp display** - Show "RSVPed 2 hours ago" on the cards?
4. **Sort order** - Most recent first?

If you'd like, I can proceed with my recommendations (no cooldown/warn only, include MAYBE, show relative time, most recent first) and we can adjust in the spec.
