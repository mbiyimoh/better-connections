# RSVP Flow Improvements - Specification

**Date:** 2026-01-29
**Status:** Ready for implementation
**Ideation:** `specs/rsvp-flow-improvements/01-ideation.md`

---

## Change 1: Personalized Event Landing Page

### Summary
When an invitee clicks their RSVP link, they land on the event landing page with a personalized greeting and direct RSVP button instead of the generic "Request an Invitation" CTA.

### URL Structure
```
/m33t/[slug]?token=XXXXX
```
The token query param is optional. Without it, the page behaves exactly as today.

### Implementation

**`src/app/m33t/[slug]/page.tsx`** (Server Component):
- Read `searchParams.token` from the page props
- If token present, decode with `verifyRSVPToken()` and fetch attendee first name
- Build personalized RSVP URL: `/m33t/[slug]/rsvp/[token]`
- Pass optional `inviteeContext` to `EventLandingClient`

**`src/app/m33t/[slug]/types.ts`**:
- Add to `PublicEventData`:
  ```typescript
  inviteeContext?: {
    firstName: string;
    rsvpUrl: string;
  };
  ```

**`src/app/m33t/[slug]/EventLandingClient.tsx`**:
- Destructure `inviteeContext` from data (in addition to `rsvpUrl`)
- Pass `inviteeContext` to `EventHero` and `FooterCTA`

**`src/app/m33t/[slug]/components/EventHero.tsx`**:
- Accept optional `inviteeContext` prop
- When present, show "Welcome, {firstName}" text above the CTA button
- Change CTA text from "Request an Invitation" to "RSVP Here"
- Change CTA href to `inviteeContext.rsvpUrl`

**`src/app/m33t/[slug]/components/FooterCTA.tsx`**:
- Same conditional logic as EventHero

### Edge Cases
- Invalid/expired token: Fall back to generic landing page (no error shown)
- Token without matching attendee: Fall back to generic
- SEO: Token in query param doesn't affect OG metadata (already set without token)

---

## Change 2: Completion Page "What Happens Next?" Messaging

### Summary
Update the completion page messaging to be appropriate for a multi-question-set flow and avoid hardcoding match reveal timing.

### Current Text
```
"You'll receive your matches 48 hours before the event."
"We'll send you an SMS with your curated list of people to meet."
```

### New Text
```
"What happens next?"
- "Stay tuned -- we may send you follow-up questions to help us find your best connections."
- "Before the event, you'll receive your curated list of people to meet via SMS."
```

### Implementation
**`src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`**:
- Remove `revealTiming` from the event query select
- Remove `revealMessage` object mapping
- Replace with two static `<p>` elements with the new messaging

---

## Change 3: Profile Preview Tile on Completion Page

### Summary
Show a compact profile card on the completion page with what the attendee has filled in, plus a CTA to log into the guest experience to view/edit their full profile.

### Implementation
**`src/app/m33t/[slug]/rsvp/[token]/complete/page.tsx`**:
- Expand attendee query to include profile fields: `title`, `company`, `location`, `expertise`, `interests`
- Also fetch from `tradingCard` JSON if populated
- Render a "Your Profile" card below the event details card showing filled-in fields
- Add a CTA button: "View & Edit Your Profile" linking to `/guest/events/[eventId]`
- Include subtle text: "You'll need to create an account or log in to access the full guest experience."

### Profile Card Design
- Same card styling as event details card (`bg-bg-secondary border-border`)
- Header: "Your Profile" with a user icon
- Show: name, title, company, location (if populated)
- Show tags/expertise/interests as pills if populated
- If nothing beyond name is populated, show encouraging message: "Complete your profile to get better matches!"

---

## Change 4: Phone Input UX

### Summary
Add client-side phone formatting and validation to the RSVP form using the existing `libphonenumber-js` dependency.

### Implementation
**`src/components/m33t/RSVPForm.tsx`**:
- Import `parsePhoneNumber`, `isValidPhoneNumber` from `libphonenumber-js`
- Add `onBlur` handler to format phone to national format (e.g., "(281) 330-8004")
- Add validation state: valid (green check), invalid (red warning), empty (neutral)
- Show validation icon inline in the input
- On form submit, normalize to E.164 format before sending to API

### Behavior
| Input | On Blur Display | Submitted Value |
|-------|----------------|-----------------|
| `2813308004` | `(281) 330-8004` | `+12813308004` |
| `281-330-8004` | `(281) 330-8004` | `+12813308004` |
| `(281)330-8004` | `(281) 330-8004` | `+12813308004` |
| `+12813308004` | `(281) 330-8004` | `+12813308004` |
| `abc` | `abc` (red warning) | blocked |

### Edge Cases
- Default country: `US` (matches event audience)
- International numbers with `+` prefix: handled by `libphonenumber-js`
- Empty phone: allowed (phone is optional in RSVP)

---

## Change 5: Fix Question Sets Not Loading

### Summary
Diagnose and fix why the organizer's "Starter questions" set isn't appearing during the production RSVP flow.

### Implementation
1. Query the database for the event's question sets and check their status
2. If DRAFT, publish the set manually via SQL or Prisma Studio
3. The API correctly filters for `status: 'PUBLISHED'` -- this is correct behavior
4. Organizer has explicit publish control (per user decision) -- no auto-publish changes needed
5. Consider adding a warning banner in the event dashboard if question sets are still in DRAFT

### No Code Changes Required
This is a data issue. The organizer needs to publish the question set. The API behavior is correct by design.
