# RSVP Flow Improvements

**Slug:** rsvp-flow-improvements
**Author:** Claude Code
**Date:** 2026-01-29
**Branch:** preflight/rsvp-flow-improvements
**Related:** OG image work completed earlier this session

---

## 1) Intent & Assumptions

**Task brief:** Five improvements to the M33T RSVP attendee experience: (1) Route RSVP invite links through the event landing page with personalized CTA, (2) update the "What happens next?" completion page messaging for multi-set question flow, (3) show a profile preview tile on the completion page with a CTA to the guest experience, (4) improve phone number input UX with formatting/normalization, and (5) fix question sets not loading in production RSVP.

**Assumptions:**
- The personalized landing page uses a `?token=` query param on the existing `/m33t/[slug]` landing page
- "Request an Invitation" becomes "RSVP Here" (or similar) when an identified invitee arrives via token
- A "Welcome, {firstName}" greeting appears on the landing page for token-carrying visitors
- The completion page currently hardcodes match reveal timing -- this should be generalized
- `ProfileSuggestionReview` is skipped for the first question set; a simple profile tile replaces it
- The guest experience login CTA links to `/guest/events/[eventId]` or equivalent
- `libphonenumber-js` is already installed and used in `src/lib/m33t/phone-verification.ts`
- The question set not loading in production is likely a DRAFT vs PUBLISHED status issue

**Out of scope:**
- Changing the scrollytelling animation behavior
- Building a new guest authentication system
- Modifying the questionnaire question flow itself
- Adding new question set management UI for organizers
- AI profile suggestion review (explicitly deferred)

---

## 2) Pre-reading Log

- `src/app/m33t/[slug]/page.tsx`: Server component fetching from `/api/public/events/[slug]`. Passes `PublicEventData` to `EventLandingClient`. No token awareness.
- `src/app/m33t/[slug]/EventLandingClient.tsx`: Client component receiving `{ data: PublicEventData }`. Manages scrollytelling state, renders all sections. Destructures `rsvpUrl` from data.
- `src/app/m33t/[slug]/components/EventHero.tsx`: Shows event title (gold foil), tagline, date/venue, and hardcoded "Request an Invitation" button linked to `rsvpUrl`.
- `src/app/m33t/[slug]/components/FooterCTA.tsx`: Bottom CTA with same "Request an Invitation" button and `rsvpUrl`.
- `src/app/m33t/[slug]/types.ts`: Defines `PublicEventData` with `rsvpUrl: string`. No concept of identified invitee context.
- `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`: Completion page showing "You're all set, {firstName}!" with event details and "What happens next?" using `revealTiming` enum.
- `src/components/m33t/RSVPForm.tsx`: RSVP form with basic `<Input type="tel">` for phone. No formatting or client-side validation.
- `src/app/api/rsvp/[token]/question-sets/route.ts`: Returns question sets filtered by `status: 'PUBLISHED'`. Key line 64-68: `where: { eventId, status: 'PUBLISHED' }`.
- `src/lib/m33t/phone-verification.ts`: Already imports `parsePhoneNumber`, `isValidPhoneNumber` from `libphonenumber-js`. Has `normalizePhone()` utility.
- `src/lib/notifications/sms.ts`: Has `formatPhoneE164()` for server-side normalization.
- `src/app/api/public/events/[slug]/route.ts`: Returns generic `rsvpUrl: '/rsvp/${event.id}'`, not personalized.
- `src/app/guest/events/[eventId]/page.tsx`: Guest event detail page with profile completion %, matches, "Edit My Profile".
- `src/components/rsvp/ProfileSuggestionReview.tsx`: AI-generated profile suggestions after question set completion.

---

## 3) Codebase Map

### Primary components/modules

| File | Role |
|------|------|
| `src/app/m33t/[slug]/page.tsx` | Server component for event landing page |
| `src/app/m33t/[slug]/EventLandingClient.tsx` | Client component orchestrating all landing page sections |
| `src/app/m33t/[slug]/components/EventHero.tsx` | Hero section with CTA button |
| `src/app/m33t/[slug]/components/FooterCTA.tsx` | Footer CTA button |
| `src/app/m33t/[slug]/types.ts` | Shared types for landing page |
| `src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx` | Completion page after questionnaire |
| `src/components/m33t/RSVPForm.tsx` | RSVP form with phone input |
| `src/app/api/rsvp/[token]/question-sets/route.ts` | Question sets API endpoint |
| `src/lib/m33t/phone-verification.ts` | Phone normalization utilities |
| `src/lib/m33t/tokens.ts` | JWT RSVP token encode/decode |

### Shared dependencies
- `src/lib/design-system.ts` - `GOLD_FOIL_GRADIENT`, `GOLD_FOIL_BUTTON` constants
- `src/lib/m33t/index.ts` - Barrel exports (`formatEventDate`, `formatEventTime`, `buildRsvpUrl`)
- `src/lib/m33t/rsvp-paths.ts` - `getRsvpBasePath()` for URL construction
- `src/lib/db.ts` - Prisma client
- `src/lib/m33t/tokens.ts` - `verifyRSVPToken()`, `isTokenExpired()`

### Data flow
1. **Invite link** (`/m33t/[slug]?token=XXX`) -> Server component decodes token -> passes invitee context to client
2. **EventHero/FooterCTA** receive invitee context -> conditional "Welcome" + "RSVP Here"
3. **RSVPForm** phone input -> `libphonenumber-js` normalization -> API submit
4. **Question sets API** -> filters by `status: 'PUBLISHED'` -> client renders available sets
5. **Completion page** -> shows event details + "What happens next?" messaging

### Feature flags/config
- `event.revealTiming` enum: `IMMEDIATE`, `TWENTY_FOUR_HOURS_BEFORE`, `FORTY_EIGHT_HOURS_BEFORE`
- `QuestionSet.status` enum: `DRAFT`, `PUBLISHED`

### Potential blast radius
- **Change 1 (Personalized landing):** `page.tsx`, `EventLandingClient.tsx`, `EventHero.tsx`, `FooterCTA.tsx`, `types.ts`
- **Change 2 (Completion messaging):** `complete/page.tsx` only
- **Change 3 (Profile tile):** `complete/page.tsx`, possibly new component
- **Change 4 (Phone input):** `RSVPForm.tsx`, reuse `phone-verification.ts`
- **Change 5 (Question set loading):** Likely database status issue, not code change. May need admin tool or SQL fix.

---

## 4) Root Cause Analysis

### Issue 5: Question Sets Not Loading in Production RSVP

**Observed behavior:** The organizer's "Starter questions" question set, added via the event wizard, does not appear during the RSVP flow in production.

**Expected behavior:** Attendees who confirm RSVP should see the "Starter questions" set and be able to answer it.

**Evidence:**
- `src/app/api/rsvp/[token]/question-sets/route.ts:64-68` filters with `status: 'PUBLISHED'`
- The question set may have been created with a default `status: 'DRAFT'`
- The event wizard or question set creation flow may not automatically set status to `PUBLISHED`

**Root-cause hypotheses:**
1. **Most likely: Question set is in DRAFT status.** The creation flow doesn't auto-publish, or the organizer didn't manually publish it. This is a data issue, not a code bug. **Confidence: 85%**
2. **Possible: Question set is attached to wrong event ID.** Less likely given the wizard flow, but worth checking. **Confidence: 10%**
3. **Possible: Race condition in creation.** The set was created but the status field wasn't committed properly. **Confidence: 5%**

**Decision:** Check the database for the question set's status. If DRAFT, either publish it manually or modify the wizard to auto-publish. The API filtering logic is correct by design -- organizers should be able to have draft question sets.

---

## 5) Research

### Change 1: Personalized Landing Page via `?token=` Query Param

**Approach A: Server-side token decode in page.tsx (Recommended)**
- Parse `?token=` from searchParams in the server component
- Decode JWT to get `attendeeId` -> fetch first name from DB
- Pass `inviteeContext?: { firstName: string; rsvpUrl: string }` to `EventLandingClient`
- EventHero and FooterCTA conditionally render based on presence of invitee context
- **Pros:** No client-side token handling, secure, simple data flow
- **Cons:** Token visible in URL (acceptable -- it's already visible in RSVP links)

**Approach B: Client-side token decode**
- Parse token in EventLandingClient
- Call an API to resolve invitee info
- **Pros:** None significant
- **Cons:** Extra API call, loading states, token handling on client

**Recommendation:** Approach A. Keep token decode server-side, pass minimal context down. The `rsvpUrl` for identified invitees should point to `/m33t/[slug]/rsvp/[token]` (their personalized RSVP link) instead of the generic URL.

### Change 2: Completion Page "What Happens Next?" Messaging

**Current state:** Hardcoded messages based on `revealTiming` enum. Mentions specific timing ("48 hours before") and SMS delivery.

**Proposed approach:**
- Replace the timing-specific text with a more general message
- Mention that more question sets may come ("Stay tuned for follow-up questions that help us find your best connections")
- Mention eventual matches without specific timing ("Before the event, we'll send you your curated list of people to meet")
- Keep the SMS delivery note

**Recommendation:** Simple text update in `complete/page.tsx`. No structural changes needed.

### Change 3: Profile Preview Tile on Completion Page

**Approach A: Inline profile card (Recommended)**
- Fetch attendee profile data (title, company, expertise, etc.) in the completion page server component
- Render a compact "Your Profile" card showing what's filled in
- Add a CTA button: "View & Edit Your Profile" linking to the guest experience
- **Pros:** Simple, no new components needed, works without auth
- **Cons:** Guest experience requires login (CTA should explain this)

**Approach B: Full ProfileSuggestionReview integration**
- Render AI suggestions after first question set
- **Pros:** Richer experience
- **Cons:** User explicitly wants this skipped for first set

**Recommendation:** Approach A. Simple profile card with CTA. The link should go to `/guest/events/[eventId]` which has profile editing capability. Include a note that they'll need to create an account / log in.

### Change 4: Phone Number Input UX

**Approach A: Use `libphonenumber-js` directly with existing Input (Recommended)**
- Import `parsePhoneNumber` and `isValidPhoneNumber` from `libphonenumber-js` (already a dependency)
- Add `onBlur` handler that formats the entered number to national format
- Add real-time validation feedback (green check / red warning)
- Server-side already normalizes via `formatPhoneE164` in sms.ts
- **Pros:** No new dependencies, leverages existing code, simple
- **Cons:** No country flag picker (acceptable for US-focused event)

**Approach B: Install `react-phone-number-input` library**
- Full-featured phone input with country flags, auto-formatting
- **Pros:** Better UX with country selector, handles international formats
- **Cons:** New dependency, additional bundle size, may be overkill for a US-focused event

**Approach C: Use `input type="tel"` with `inputMode="tel"` and pattern**
- Minimal improvement, just ensure mobile keyboards show number pad
- **Pros:** Zero dependencies
- **Cons:** No formatting or validation

**Recommendation:** Approach A. Use existing `libphonenumber-js` to add `onBlur` formatting and validation. This handles all the mentioned formats (2813308004, 281-330-8004, (281)330-8004, +1...) without adding dependencies. Can always upgrade to Approach B later if international numbers become a need.

### Change 5: Question Sets Not Loading

**Approach:** Diagnose by checking the database. If the set is DRAFT, publish it. Consider adding a warning in the event wizard if sets are left in DRAFT status, or auto-publishing when the organizer completes the wizard flow.

**Recommendation:** Query the database first. If it's a DRAFT issue, publish the set and add a safeguard in the wizard.

---

## 6) Clarification

1. **Guest experience CTA destination:** The profile tile on the completion page should link to the guest event page (`/guest/events/[eventId]`). Should this link include any token or pre-auth context, or should it simply require them to log in / create an account? (Current assumption: just link to guest page, they'll need to authenticate.)
>> just link is fine

2. **Phone input scope:** Should phone formatting apply only to the RSVP form, or also to any other phone inputs in the system (e.g., contact forms, admin views)?
>> just RSVP for now

3. **"Welcome, {firstName}" placement on landing page:** Should this appear as a banner at the top of the page (above scrollytelling), or replace content within the EventHero section? (Current assumption: within EventHero, above the CTA button.)
>> within EventHero, above the CTA button

4. **Question set auto-publish:** Should the event wizard auto-publish question sets when the organizer finishes, or should there be an explicit "Publish" action? (This affects whether the fix is a data-only fix or a code change.)
>> explcicit publish
