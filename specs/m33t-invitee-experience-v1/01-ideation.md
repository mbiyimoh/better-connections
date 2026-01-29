# M33T Invitee Experience V1

**Slug:** m33t-invitee-experience-v1
**Author:** Claude Code
**Date:** 2026-01-27
**Branch:** feat/m33t-invitee-experience-v1
**Related:**
- `docs/question-sets-and-RSVP-flow.md`
- `developer-guides/07-m33t-architecture-guide.md`
- `developer-guides/09-m33t-landing-pages-guide.md`
- `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md`

---

## 1) Intent & Assumptions

### Task Brief
Implement authenticated invitee experience for M33T events: invite verification (SSO + phone), persistent guest accounts, profile management, event browsing, and directory access. Architecture should unify invitee accounts with core Better Contacts User model (with origin flags) to enable future activation upsells.

### Assumptions
- Invitees will authenticate via Google/Apple SSO (primary) or email+password (de-emphasized fallback)
- Phone number verification required for SMS event updates and match notifications
- Invitee accounts are "real" Better Contacts users with `accountOrigin: 'm33t-invitee'`
- Invitees do NOT get Better Contacts features (contacts, enrichment, explore) until activated
- The current token-based RSVP flow remains for initial RSVP, then auth happens during "verify your invite" step
- Multiple invitees may share the same email across different events (EventAttendee uniqueness is per-event)

### Out of Scope
- Better Contacts activation flow / upsell UI
- Cross-promotion between M33T and Better Contacts
- Better Contacts dashboard access for M33T invitees
- Post-event follow-up automation
- At-event or post-event phases of the attendee journey
- Multi-phase questionnaire drip system (separate spec)
- Match reveal experience (separate spec)

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `docs/question-sets-and-RSVP-flow.md` | Defines invite verification vision: SSO → phone confirm → authenticated session |
| `developer-guides/07-m33t-architecture-guide.md` | M33T access is gated by `hasM33tAccess` flag; EventAttendee not linked to User |
| `developer-guides/09-m33t-landing-pages-guide.md` | Token-based RSVP is stateless JWT; no persistent auth |
| `prisma/schema.prisma` (User) | No `accountOrigin` field; no OAuth provider tracking |
| `prisma/schema.prisma` (EventAttendee) | Has `contactId` (to Contact) but NO `userId` (to User) |
| `src/lib/auth.ts` | Only email+password auth via Supabase; no OAuth configured |
| `src/lib/m33t/tokens.ts` | JWT tokens for RSVP; expires 24h after event |
| `src/app/rsvp/[token]/**` | Token-verified pages: RSVP form, questionnaire, complete |
| `docs/m33t-implemenation-handoff-package/ATTENDEE_JOURNEY.md` | Full 4-phase journey defined; Phase 1 (pre-event) is relevant here |

---

## 3) Codebase Map

### Primary Components/Modules
| Path | Role |
|------|------|
| `src/app/(auth)/login/page.tsx` | Better Contacts login (email+pw only) |
| `src/app/(auth)/signup/page.tsx` | Better Contacts signup |
| `src/app/auth/callback/route.ts` | Auth callback (code exchange) |
| `src/lib/auth.ts` | Client-side auth helpers |
| `src/lib/auth-helpers.ts` | Server-side `requireAuth()`, `getCurrentUser()` |
| `src/lib/supabase/middleware.ts` | Route protection |
| `src/app/rsvp/[token]/**` | Token-based RSVP pages |
| `src/components/m33t/RSVPForm.tsx` | RSVP status selection |
| `src/app/m33t/[slug]/**` | Public event landing pages |
| `prisma/schema.prisma` | User, EventAttendee, Event models |

### Shared Dependencies
- **Supabase Auth:** `@supabase/ssr` for session management
- **Prisma ORM:** Database access
- **shadcn/ui:** Form components (Button, Input, etc.)
- **Framer Motion:** Animations
- **Twilio:** SMS notifications
- **Resend:** Email notifications

### Data Flow
```
Current:
  Invite Email → /rsvp/[token] → RSVP Form → Questionnaire → Complete
                     (stateless JWT, no account)

Proposed:
  Invite Email → /rsvp/[token] → RSVP Form → "Verify Invite" → SSO/Auth
                                                    ↓
                     Phone Verification → Account Created → Guest Dashboard
                                                    ↓
                            /guest/events → /guest/profile → /guest/directory
```

### Potential Blast Radius
- **User model:** Adding `accountOrigin`, `betterContactsActivated` fields
- **EventAttendee model:** Adding `userId` FK to link to User
- **Auth middleware:** New route protection for `/guest/**` paths
- **Supabase config:** Enable Google/Apple OAuth providers
- **RSVP flow:** Add "verify invite" step after RSVP confirmation

---

## 4) Root Cause Analysis

N/A — This is a new feature, not a bug fix.

---

## 5) Research Findings

### Approach 1: Extend User Model with Origin Flag

**Description:** Add `accountOrigin` enum to User model. Invitees become real users with limited feature access.

**Pros:**
- Single User table for all auth
- Easy to upgrade invitee → full BC user
- Unified session management
- Reuses existing auth infrastructure

**Cons:**
- Need feature gating everywhere (dashboard, contacts, etc.)
- Invitees clutter the User table
- Complex permissions logic

### Approach 2: Separate GuestUser Model

**Description:** Create a separate `GuestUser` table for M33T invitees with its own auth.

**Pros:**
- Clean separation of concerns
- No impact on Better Contacts features
- Simpler permissions (guests can't access BC at all)

**Cons:**
- Duplicate auth infrastructure
- Complex migration path to convert guest → BC user
- Two session types to manage
- More code to maintain

### Approach 3: Token-Only with Session Extension

**Description:** Keep token-based auth but extend tokens to work like sessions (longer-lived, refreshable).

**Pros:**
- Minimal changes to existing flow
- No new User records
- Simple implementation

**Cons:**
- Not a "real" account (can't log in directly)
- Phone verification harder without account
- No SSO support
- Can't track invitee across events

### Recommendation: Approach 1 (Extend User Model)

This aligns with your stated goal: "the profile we create for a m33t invitee is the same as a profile created for the core bettercontacts product." It provides the cleanest path to future activation while keeping auth unified.

**Implementation strategy:**
1. Add `accountOrigin` enum (`BETTER_CONTACTS` | `M33T_INVITEE`) to User
2. Add `betterContactsActivated` boolean (default false) to User
3. Add `userId` FK to EventAttendee (optional, populated when verified)
4. Enable Google/Apple OAuth in Supabase
5. Create `/guest/**` routes with invitee-specific middleware
6. Gate BC features based on `accountOrigin` + `betterContactsActivated`

---

## 6) Clarifications Needed

1. **SSO Provider Priority:** Should Google be primary and Apple secondary, or equal prominence? (UX question)
>> google primary. more common

2. **Phone Verification Method:** SMS OTP code? Or just trust user input? (Security vs. friction tradeoff)
>> SMS OTP but make it delightful and seamless as possible. I'm sure there's great existing libraries / patterns out there for this

3. **Email Collision Handling:** If invitee signs up with SSO and their email already exists as a BC user, should we:
   - a) Link accounts automatically (merge)
   - b) Show error "this email already has a BC account, please log in"
   - c) Allow separate accounts (different auth methods = different users)
   >> link accounts but make sure we show that to the user in the UX, a la some sort of FYI like: "we see you already have a Better Contacts profile (smart move). we will automatically link your m33t profile to that account." and then you just hit a button that says continue or whatever

4. **Guest Dashboard Scope:** Minimal viable features for V1:
   - My Profile (view/edit)
   - My Events (list of events invited to)
   - Event Detail (link to public landing page)
   - Guest Directory (browse other attendees for confirmed events)
   - Anything else needed?
   >> looks good

5. **Profile Edit Permissions:** Can invitees edit ALL their profile fields, or only certain "display" fields?
>> all fields that being displayed on the public page or in the profile details you can view by clicking on an invitee tile should be editable to the user. they should have full control over how they show up (and should be encouraged to add photos first and foremost since thats the thing we are least likely to pre-load for people)

6. **Directory Access Timing:** Can invitees see directory immediately after RSVP, or only after completing questionnaire?
>> immediately after RSVP, but, if it not already aprt and parcel fo the RSVP flow, they should first be shown their full "profile card" and informed that they can edit the fields / how they show up to others (with a button below that that takes them to view the full directory from there)

---

## 7) Proposed Spec Breakdown

Given the scope, this should be **3 separate specs**:

### Spec A: M33T Invitee Authentication & Account Creation

**Scope:**
- Supabase OAuth configuration (Google, Apple)
- User model updates (`accountOrigin`, `betterContactsActivated`)
- EventAttendee → User linking (`userId` FK)
- "Verify Your Invite" flow (SSO + phone)
- Session management for invitees
- Route protection for `/guest/**` paths
- Feature gating for BC vs M33T-invitee users

**Dependencies:** None (foundational)

**Estimated complexity:** Medium-High (auth is always tricky)

---

### Spec B: M33T Guest Dashboard & Profile Management

**Scope:**
- `/guest/events` - List events you're invited to
- `/guest/profile` - View/edit your profile
- `/guest/events/[eventId]` - Event detail (link to landing page)
- Profile editing UI (reuse/adapt existing components)
- Phone number management
- Notification preferences

**Dependencies:** Spec A (auth must exist first)

**Estimated complexity:** Medium

---

### Spec C: M33T Guest Directory Access

**Scope:**
- `/guest/events/[eventId]/directory` - Browse other attendees
- Attendee cards (reuse from landing page)
- Profile modal viewing
- Search/filter by name, tags, etc.
- Access control (only for confirmed events, only confirmed/maybe attendees)

**Dependencies:** Spec A (auth), Spec B (dashboard navigation)

**Estimated complexity:** Low-Medium (mostly reusing existing components)

---

## 8) Implementation Order

```
Phase 1: Spec A (Auth Foundation)
   ↓
Phase 2: Spec B (Dashboard + Profile)
   ↓
Phase 3: Spec C (Directory)
```

Each spec can be developed, tested, and deployed independently, building on the previous.

---

## 9) Open Questions for Product (RESOLVED)

1. **RSVP Timing:** Should invite verification happen:
   >> SSO/email auth happens BEFORE questionnaire (right after RSVP selection). Phone verification happens AFTER questionnaire with context: "this is how we'll send your matches and other cool updates as the event approaches"

2. **Returning User Flow:** If an invitee returns to `/rsvp/[token]` after already verifying, should we:
   >> Show RSVP status with "Go to Dashboard" CTA - gentle transition to the authenticated experience

3. **Guest Dashboard Branding:** Should guest dashboard be:
   >> M33T branded - feels like a separate product with clear M33T identity. No confusion with Better Contacts.

4. **Phone as Primary Channel:** Is phone number REQUIRED for verification, or can invitees opt out and use email-only?
   >> Yes, required. SMS is critical for match reveals and updates.

---

## 10) Next Steps

1. **Get clarifications** on the questions above
2. **Create Spec A** (auth foundation) as detailed specification
3. **Enable OAuth** in Supabase dashboard (can be done in parallel)
4. **Prototype** "verify your invite" UI flow
5. **Database migration** planning for User + EventAttendee changes
