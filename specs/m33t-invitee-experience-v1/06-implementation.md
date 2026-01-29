# M33T Invitee Experience - Implementation Summary

## Overview

This document summarizes the implementation of the M33T Invitee Experience feature, which enables event attendees to access a guest-specific dashboard to view their events, manage their profiles, and browse other attendees.

## Implementation Date

2026-01-27

## Files Created/Modified

### Database Schema Changes (A1-A4)

**Modified: `prisma/schema.prisma`**
- Added `AccountOrigin` enum (`BETTER_CONTACTS`, `M33T_INVITEE`)
- Added User fields: `accountOrigin`, `betterContactsActivated`, `phone`, `phoneVerified`, `phoneVerifiedAt`
- Added `EventAttendee.userId` for linking attendees to authenticated users
- Added `PhoneVerificationOTP` model for phone verification

### Phone Verification (A5-A8)

**Created: `src/lib/m33t/phone-verification.ts`**
- OTP generation (6-digit codes)
- SHA-256 hashing for secure storage
- Phone number normalization using libphonenumber-js
- OTP validation with attempt tracking

**Created: `src/app/api/auth/send-otp/route.ts`**
- POST endpoint to send OTP via SMS
- Rate limiting (max 5 OTPs per phone per hour)
- Integration with SMS template system

**Created: `src/app/api/auth/verify-phone/route.ts`**
- POST endpoint to verify OTP
- Max 5 attempts per OTP
- 10-minute OTP expiration
- Updates user `phoneVerified` status on success

**Modified: `src/lib/auth-helpers.ts`**
- Updated `AuthUser` interface with new fields
- Added helper functions: `isM33tInvitee()`, `canAccessBetterContacts()`, `needsPhoneVerification()`
- Updated `getCurrentUser()` select statement

### Guest Dashboard (B1-B5)

**Created: `src/components/guest/GuestShell.tsx`**
- Guest-specific navigation shell
- Links to Events and Profile pages
- Mobile-responsive bottom navigation

**Created: `src/app/guest/layout.tsx`**
- Wraps all guest pages with GuestShell

**Created: `src/app/guest/events/page.tsx`**
- Lists all events where user is an attendee
- Shows RSVP status and profile completion
- Empty state for users with no events

**Created: `src/components/guest/EventCard.tsx`**
- Event card component with date, venue, attendee count
- RSVP status badge
- Profile completion warning

**Created: `src/app/guest/events/[eventId]/page.tsx`**
- Event detail page with full event information
- RSVP status and profile completion display
- Links to directory and profile editing

**Created: `src/app/guest/profile/page.tsx`**
- Server component for profile data fetching
- Event selector for multi-event profiles

**Created: `src/app/guest/profile/ProfileViewClient.tsx`**
- Client component for profile viewing/editing
- Form fields: name, role, company, location, expertise tags
- Trading card fields: currentFocus, seeking, offering

**Created: `src/app/api/guest/events/[eventId]/profile/route.ts`**
- GET/PATCH endpoints for profile data
- Validates user is attendee of event
- Updates profile and tradingCard JSON fields

### Guest Directory (C1-C3)

**Created: `src/app/guest/events/[eventId]/directory/page.tsx`**
- Server component for directory data fetching
- Excludes declined attendees

**Created: `src/app/guest/events/[eventId]/directory/DirectoryClient.tsx`**
- Client component with search and filtering
- Status filter tabs (All, Confirmed, Maybe, Invited)
- Attendee cards with profile preview
- Profile modal with full details

### Auth UI Pages (A9-A12)

**Created: `src/app/(auth)/verify-invite/page.tsx`**
- Invitation verification page
- Loading, success, and error states
- Redirects to phone verification or dashboard

**Created: `src/app/api/auth/verify-invite/route.ts`**
- POST endpoint to verify event invitations
- Links attendee to authenticated user
- Returns event info and auth requirements

**Created: `src/app/(auth)/verify-phone/page.tsx`**
- Phone verification flow UI
- Phone number input with validation
- 6-digit OTP input with auto-advance
- Resend cooldown timer
- Skip option for later verification

### Testing (T1-T3)

**Created: `.quick-checks/test-guest-dashboard.spec.ts`**
- E2E tests for guest events list
- E2E tests for event detail navigation
- E2E tests for profile viewing/editing
- E2E tests for directory filtering
- E2E tests for phone verification flow

## Key Implementation Decisions

1. **Profile Data Structure**: Profile and trading card data stored as JSON fields on EventAttendee for flexibility
2. **Phone Verification**: SHA-256 hashed OTPs with rate limiting and attempt tracking
3. **Account Linking**: M33T invitees linked via userId on EventAttendee after OAuth
4. **Directory Privacy**: Excluded declined attendees from public directory view
5. **Type Safety**: Used `String()` conversion for JSON field values to satisfy React's ReactNode type requirements

## Testing

Run E2E tests:
```bash
cd .quick-checks && npx playwright test test-guest-dashboard.spec.ts --headed
```

## Next Steps

1. Add SMS integration for actual OTP delivery (currently stubbed)
2. Implement account linking flow for returning users
3. Add profile photo upload functionality
4. Consider adding connection/networking features between attendees
