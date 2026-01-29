# M33T Invitee Experience V1 - Task Breakdown

**Date:** 2026-01-27
**Status:** Ready for Execution
**Parallelization:** 2-Thread Approach Recommended

---

## Parallelization Strategy

### Thread 1: Auth Foundation (Sequential)
Tasks with tight dependencies that must run in order. This thread blocks Thread 2's integration tasks.

### Thread 2: UI Components (Parallel-Ready)
UI components that can be built with mock data while Thread 1 progresses. Integrates with auth after Thread 1 completes Phase 2.

```
Timeline Visualization:
────────────────────────────────────────────────────────────────
Thread 1 (Auth):     [A1]→[A2]→[A3]→[A4]→[A5]→[A6]→[A7]→[A8]
Thread 2 (UI):       [B1][B2][B3][B4][C1][C2]→[Integration]→[B5][C3]
────────────────────────────────────────────────────────────────
                     ^--- Can start immediately   ^--- Wait for A4
```

---

## Spec A: Auth Foundation Tasks

### Phase 1: Database & Schema

#### A1: Add User Model Fields
**Thread:** 1 (Sequential)
**Depends On:** None
**Blocks:** A2, A4, A5

**Changes:**
- Add `AccountOrigin` enum to Prisma schema
- Add `accountOrigin` field to User model (default: BETTER_CONTACTS)
- Add `betterContactsActivated` field to User model (default: true)
- Add `phone` field to User model (nullable)
- Add `phoneVerified` field to User model (default: false)
- Add `phoneVerifiedAt` field to User model (nullable)

**Files:**
- `prisma/schema.prisma`

**Verification:**
- [ ] Run `npx prisma validate`
- [ ] Run `npx prisma generate`

---

#### A2: Add EventAttendee User Link
**Thread:** 1 (Sequential)
**Depends On:** A1
**Blocks:** A4, A6

**Changes:**
- Add `userId` field to EventAttendee model (nullable FK to User)
- Add `linkedAttendees` inverse relation on User model
- Add index on `EventAttendee.userId`

**Files:**
- `prisma/schema.prisma`

**Verification:**
- [ ] Run `npx prisma validate`

---

#### A3: Add PhoneVerificationOTP Model
**Thread:** 1 (Sequential)
**Depends On:** None (can parallel with A1-A2)
**Blocks:** A5

**Changes:**
- Create `PhoneVerificationOTP` model with:
  - `id`, `userId`, `phone`, `code` (hashed), `expiresAt`, `attempts`, `verified`, `createdAt`
- Add indexes on `userId` and `phone`

**Files:**
- `prisma/schema.prisma`

**Verification:**
- [ ] Run `npx prisma validate`

---

#### A4: Run Database Migration
**Thread:** 1 (Sequential)
**Depends On:** A1, A2, A3
**Blocks:** A5, A6, A7

**Commands:**
```bash
npm run db:backup
npx prisma migrate dev --name add-m33t-invitee-auth
```

**Verification:**
- [ ] Migration completes without errors
- [ ] Verify new fields in Prisma Studio

---

### Phase 2: Phone Verification System

#### A5: Create Phone Verification Utilities
**Thread:** 1 (Sequential)
**Depends On:** A4
**Blocks:** A7

**Files to Create:**
- `src/lib/m33t/phone-verification.ts`

**Functions:**
- `generateOTP()` - 6-digit cryptographic random
- `hashOTP(code: string)` - SHA-256 hash
- `formatPhoneForDisplay(phone: string)` - National format
- `normalizePhone(phone: string)` - E.164 format
- Constants: `OTP_LENGTH`, `OTP_EXPIRY_MINUTES`, `MAX_ATTEMPTS`, `RATE_LIMIT_MINUTES`

**Dependencies:**
- Install `libphonenumber-js`

**Verification:**
- [ ] Unit tests pass for all functions

---

#### A6: Update Auth Callback for M33T Invitees
**Thread:** 1 (Sequential)
**Depends On:** A4
**Blocks:** A7

**Files to Modify:**
- `src/app/auth/callback/route.ts`

**Changes:**
- Handle `m33t_invitee=true` query param
- Handle `attendee_id` query param
- Create new users with `accountOrigin: 'M33T_INVITEE'`
- Link EventAttendee to User on success
- Handle existing BC user linking (show message via redirect param)

**Verification:**
- [ ] New M33T user creation works
- [ ] Existing BC user linking works
- [ ] EventAttendee gets linked

---

#### A7: Create Phone OTP API Endpoints
**Thread:** 1 (Sequential)
**Depends On:** A5, A6
**Blocks:** B4 integration

**Files to Create:**
- `src/app/api/auth/send-otp/route.ts`
- `src/app/api/auth/verify-phone/route.ts`

**POST /api/auth/send-otp:**
- Validate authenticated user
- Normalize phone number
- Check rate limiting (1/minute)
- Generate & hash OTP
- Store in PhoneVerificationOTP
- Send via Twilio SMS

**POST /api/auth/verify-phone:**
- Validate authenticated user
- Find pending OTP
- Check expiration & attempts
- Verify hashed code
- Update User phone fields
- Mark OTP as verified

**Verification:**
- [ ] Rate limiting works
- [ ] OTP generation & verification works
- [ ] SMS sends correctly

---

### Phase 3: Route Protection

#### A8: Update Middleware for Guest Routes
**Thread:** 1 (Sequential)
**Depends On:** A6
**Blocks:** Thread 2 Integration

**Files to Modify:**
- `src/lib/supabase/middleware.ts`

**Changes:**
- Define `GUEST_ROUTES = ['/guest']`
- Define `BC_ONLY_ROUTES = ['/contacts', '/enrich', '/explore', '/settings', '/onboarding']`
- Block M33T invitees from BC routes (redirect to `/guest/events`)
- Allow authenticated users on guest routes

**Files to Create:**
- `src/lib/auth-helpers.ts` additions:
  - `isM33tInvitee(user)` helper
  - `canAccessBetterContacts(user)` helper
  - Update `AuthUser` interface with new fields

**Verification:**
- [ ] M33T invitees can access /guest/*
- [ ] M33T invitees redirected from /contacts
- [ ] BC users can access both

---

## Spec B: Guest Dashboard Tasks

### Phase 1: Layout & Shell (Thread 2 - Parallel Start)

#### B1: Create Guest Shell Layout
**Thread:** 2 (Parallel)
**Depends On:** None (can use mock auth)
**Blocks:** B2, B3, B4

**Files to Create:**
- `src/app/guest/layout.tsx`
- `src/components/guest/GuestShell.tsx`

**Features:**
- M33T branded header with gold accent
- Navigation: My Events, My Profile
- User avatar in header
- Mobile responsive with hamburger menu
- Sign out button

**Mock Strategy:**
- Use mock user object until A8 completes
- Replace `getCurrentUser()` call when ready

**Verification:**
- [ ] Layout renders correctly
- [ ] Navigation works
- [ ] Mobile menu works

---

#### B2: Create Events List Page
**Thread:** 2 (Parallel)
**Depends On:** B1
**Blocks:** B3

**Files to Create:**
- `src/app/guest/events/page.tsx`
- `src/app/guest/events/EventsListClient.tsx`
- `src/components/guest/EventCard.tsx`

**Features:**
- Header: "My Events"
- List of EventCards with:
  - Event name, tagline
  - Date, time, location
  - Attendee count
  - RSVP status badge
  - Profile completion badge
- Empty state for no events

**Mock Strategy:**
- Use mock event data array
- Replace with Prisma query when A4 completes

**Verification:**
- [ ] Events render correctly
- [ ] Status badges show correctly
- [ ] Empty state works

---

#### B3: Create Event Detail Page
**Thread:** 2 (Parallel)
**Depends On:** B2
**Blocks:** None

**Files to Create:**
- `src/app/guest/events/[eventId]/page.tsx`

**Features:**
- Back link to events list
- Event header (name, tagline)
- Event details card (date, venue, attendee count)
- Your RSVP card (status, profile completion)
- Action buttons: Browse Attendees, Edit My Profile
- Incomplete profile prompt card

**Mock Strategy:**
- Use mock event + attendee data
- Replace with Prisma query when A4 completes

**Verification:**
- [ ] Event details display correctly
- [ ] Action buttons link correctly
- [ ] Incomplete profile prompt shows/hides correctly

---

### Phase 2: Profile Management

#### B4: Create Profile View/Edit Page
**Thread:** 2 (Parallel, then integrate)
**Depends On:** B1
**Blocks:** None

**Files to Create:**
- `src/app/guest/profile/page.tsx`
- `src/app/guest/profile/ProfileViewClient.tsx`

**Features:**
- Event selector dropdown (multi-event support)
- Profile preview using TradingCard component
- Edit mode with form fields:
  - Photo upload placeholder
  - Name, location, role, company
  - Expertise tags (add/remove)
  - Current focus textarea
  - Seeking/offering textareas
- Save/Cancel actions
- Photo upload encouragement card

**Mock Strategy:**
- Use mock profile data
- API call mocked until A4 completes

**Verification:**
- [ ] Preview mode renders correctly
- [ ] Edit mode form works
- [ ] Tag add/remove works
- [ ] Save triggers API call

---

#### B5: Create Profile Update API
**Thread:** 2 (After A4)
**Depends On:** A4, B4
**Blocks:** None

**Files to Create:**
- `src/app/api/guest/events/[eventId]/profile/route.ts`

**Endpoints:**
- `GET` - Fetch attendee profile
- `PATCH` - Update profile fields

**Features:**
- Verify user is attendee of event
- Zod validation for profile fields
- Update both `profile` and `tradingCard` JSON fields
- Return updated attendee

**Verification:**
- [ ] GET returns attendee profile
- [ ] PATCH updates profile correctly
- [ ] Non-attendees get 403

---

## Spec C: Guest Directory Tasks

### Phase 1: Core Directory (Thread 2 - Parallel)

#### C1: Create Directory Page
**Thread:** 2 (Parallel)
**Depends On:** B3 (event detail page exists)
**Blocks:** C2

**Files to Create:**
- `src/app/guest/events/[eventId]/directory/page.tsx`

**Features:**
- Server component with data fetching
- Back link to event detail
- Header with event name and attendee count
- Pass attendees to DirectoryClient

**Mock Strategy:**
- Use mock attendee array
- Replace with Prisma query when A4 completes

**Verification:**
- [ ] Page renders correctly
- [ ] Attendee data passes to client

---

#### C2: Create Directory Client Components
**Thread:** 2 (Parallel)
**Depends On:** C1
**Blocks:** None

**Files to Create:**
- `src/app/guest/events/[eventId]/directory/DirectoryClient.tsx`
- `src/app/guest/events/[eventId]/directory/AttendeeCard.tsx`
- `src/app/guest/events/[eventId]/directory/ProfileModal.tsx`

**DirectoryClient Features:**
- Search input (filter by name)
- RSVP filter buttons (All, Confirmed, Maybe)
- Results count when searching
- Responsive grid of AttendeeCards
- Empty state for no results
- ProfileModal for selected attendee

**AttendeeCard Features:**
- Avatar with status indicator dot
- Name with "You" badge for current user
- Headline (role @ company)
- Expertise tags (max 3 with overflow count)
- Click to open modal

**ProfileModal Features:**
- Animated backdrop + modal
- Close button
- "This is your profile" banner for current user
- TradingCard L3 view

**Mock Strategy:**
- Use mock attendee data
- Search/filter works on mock data

**Verification:**
- [ ] Search filters correctly
- [ ] RSVP filters work
- [ ] Cards render correctly
- [ ] Modal opens/closes
- [ ] Current user highlighted

---

### Phase 2: Integration & Testing

#### C3: Integration Testing
**Thread:** 2 (After A8)
**Depends On:** A8, C2
**Blocks:** None

**Tasks:**
- Remove mock data, wire up real auth
- Test full flow: Login → Events → Event Detail → Directory
- Test profile modal with real trading card data
- Test current user highlighting with real userId

**Verification:**
- [ ] Real data flows through
- [ ] Auth protection works
- [ ] All features work end-to-end

---

## Spec A Continued: UI Pages

### Phase 4: Auth UI Pages

#### A9: Create Verify Invite Page
**Thread:** 1 (Sequential)
**Depends On:** A6
**Blocks:** A10

**Files to Create:**
- `src/app/rsvp/[token]/verify/page.tsx`

**Features:**
- "Verify Your Invite" header
- Google SSO button (primary)
- Divider with "or"
- Email/password fallback form
- Redirect to questionnaire after auth

**Verification:**
- [ ] Google OAuth initiates correctly
- [ ] Email form shows on click
- [ ] Redirects work

---

#### A10: Create Phone Verification Page
**Thread:** 1 (Sequential)
**Depends On:** A7, A9
**Blocks:** A11

**Files to Create:**
- `src/app/rsvp/[token]/verify-phone/page.tsx`

**Features:**
- 3-step flow: phone → code → success
- Phone input with country code
- 6-digit code input with auto-advance
- Auto-submit on complete code
- Success animation with checkmark
- Redirect to complete page

**Verification:**
- [ ] Phone input validates correctly
- [ ] Code auto-advances between inputs
- [ ] Success animation plays
- [ ] Redirects correctly

---

#### A11: Create Account Linking Message
**Thread:** 1 (Sequential)
**Depends On:** A6
**Blocks:** None

**Files to Create:**
- `src/components/auth/AccountLinkingMessage.tsx`

**Features:**
- "Account found!" header
- Explanation: "We'll link your M33T profile to your BC account"
- Continue button

**Verification:**
- [ ] Shows for existing BC users
- [ ] Continue proceeds correctly

---

#### A12: Update RSVP Page for Returning Users
**Thread:** 1 (Sequential)
**Depends On:** A6
**Blocks:** None

**Files to Modify:**
- `src/app/rsvp/[token]/page.tsx`

**Files to Create:**
- `src/components/m33t/VerifiedAttendeeView.tsx`

**Features:**
- Check if attendee already verified
- Show status card with RSVP status
- CTAs: Complete Profile, Verify Phone, Go to Dashboard

**Verification:**
- [ ] Returning users see status view
- [ ] Correct CTAs show based on completion state

---

## Phase 5: Testing & Polish

#### T1: Unit Tests for Phone Verification
**Thread:** Either
**Depends On:** A5

**Files to Create:**
- `__tests__/lib/m33t/phone-verification.test.ts`

**Test Cases:**
- generateOTP produces 6-digit codes
- generateOTP produces different codes
- normalizePhone converts formats to E.164
- normalizePhone returns null for invalid
- hashOTP produces consistent hashes

---

#### T2: Integration Tests for Auth APIs
**Thread:** Either
**Depends On:** A7

**Files to Create:**
- `__tests__/api/auth/send-otp.test.ts`
- `__tests__/api/auth/verify-phone.test.ts`

**Test Cases:**
- Send OTP works for valid phone
- Rate limiting enforced
- Verify OTP succeeds with correct code
- Verify OTP fails with wrong code
- Max attempts enforced

---

#### T3: E2E Tests for Full Flow
**Thread:** Either
**Depends On:** All A tasks

**Files to Create:**
- `e2e/invitee-auth.spec.ts`
- `e2e/guest-dashboard.spec.ts`
- `e2e/guest-directory.spec.ts`

**Test Cases:**
- Complete RSVP with Google SSO
- Phone verification flow
- Returning user sees status page
- Guest dashboard navigation
- Profile edit and save
- Directory search and filter

---

## Execution Order Summary

### Thread 1 (Auth) - Sequential
```
A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9 → A10 → A11 → A12
```

### Thread 2 (UI) - Parallel Start, Then Sequential
```
[B1, B2 parallel] → B3 → B4 → [Wait for A4] → B5
[C1 parallel with B3] → C2 → [Wait for A8] → C3
```

### Testing - After Core Complete
```
T1 (after A5) | T2 (after A7) | T3 (after all)
```

---

## Risk Mitigation

### If Thread 1 Blocks Thread 2
- Thread 2 continues with mock data
- Integration phase handles real data connection
- No wasted work - components are ready

### If OAuth Takes Longer Than Expected
- Email/password fallback works immediately
- Google OAuth added when configured
- Apple deferred to Phase 2 already

### If Phone Verification Has Issues
- Can proceed without phone for testing
- Re-enable once Twilio integration verified
