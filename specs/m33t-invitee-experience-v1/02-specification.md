# M33T Invitee Authentication & Account Creation

**Status:** Ready for Implementation
**Author:** Claude Code
**Date:** 2026-01-27
**Slug:** m33t-invitee-experience-v1
**Related Ideation:** `specs/m33t-invitee-experience-v1/01-ideation.md`

---

## Overview

Implement a unified authentication system enabling M33T event invitees to create persistent accounts, verify their phone numbers, and access guest-specific features. This foundational layer creates "real" Better Contacts users with origin flags, enabling future activation flows while keeping the auth infrastructure unified.

The system transforms the current stateless token-based RSVP flow into an authenticated experience where invitees can return to edit their profiles, browse other attendees, and receive personalized event updates via SMS.

---

## Background / Problem Statement

### Current State
- Invitees interact with M33T events via stateless JWT tokens (`/rsvp/[token]/**`)
- No persistent account or session exists for invitees
- Phone numbers are stored at the `EventAttendee` level, not verified
- Invitees cannot return to edit their profile or browse attendees without a new token
- No connection between M33T attendance and Better Contacts user base

### Why This Matters
1. **User Experience:** Invitees should be able to return and manage their profile anytime
2. **Data Quality:** Verified phone numbers ensure match notifications reach attendees
3. **Future Activation:** Creating real User records enables "activate your Better Contacts account" flows post-event
4. **Cross-Event Identity:** Same user attending multiple events should have one identity

### Core Problem (First Principles)
We need to convert anonymous event attendees into authenticated users while:
- Minimizing friction (SSO-first, not forms-first)
- Maintaining the unified User model (not creating a separate guest system)
- Verifying communication channels (phone) to ensure match reveals work
- Enabling feature gating (guests can't access full Better Contacts)

---

## Goals

- Enable invitees to authenticate via Google SSO (primary) or email/password (fallback); Apple SSO deferred to Phase 2
- Verify phone numbers via SMS OTP with delightful UX
- Create/link User records with `accountOrigin: 'M33T_INVITEE'` flag
- Link EventAttendee records to User accounts after verification
- Handle email collisions by linking to existing Better Contacts users
- Protect guest routes (`/guest/**`) with authentication middleware
- Gate Better Contacts features based on `accountOrigin` and `betterContactsActivated`
- Provide clear returning-user experience with dashboard CTA

---

## Non-Goals

- Better Contacts activation flow / upsell UI (future work)
- Cross-promotion between M33T and Better Contacts in UI
- Better Contacts dashboard access for M33T invitees
- Multi-phase questionnaire drip system (separate spec)
- Match reveal experience (separate spec)
- Guest dashboard and profile management UI (Spec B)
- Guest directory access (Spec C)

---

## Technical Dependencies

### External Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.x | Client-side auth |
| `@supabase/ssr` | ^0.x | Server-side session management |
| `twilio` | ^5.x | SMS OTP sending (already installed) |
| `libphonenumber-js` | ^1.x | Phone parsing/validation (NEW) |

### Infrastructure Requirements
- **Supabase Dashboard:** Enable Google OAuth provider
- **Supabase Dashboard:** Enable Apple OAuth provider (requires Apple Developer account)
- **Environment Variables:**
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_KEY_ID`, `APPLE_TEAM_ID`
  - Existing Twilio variables (already configured)

### Existing Patterns to Follow
- Auth flow: `src/app/(auth)/login/page.tsx`
- Supabase client: `src/lib/supabase/server.ts`
- Token verification: `src/lib/m33t/tokens.ts`
- SMS sending: `src/lib/notifications/sms.ts`
- Route protection: `src/lib/supabase/middleware.ts`

---

## Detailed Design

### 1. Database Schema Changes

#### User Model Updates
```prisma
// Add to prisma/schema.prisma

enum AccountOrigin {
  BETTER_CONTACTS
  M33T_INVITEE
}

model User {
  // ... existing fields ...

  // NEW: Account origin tracking
  accountOrigin           AccountOrigin @default(BETTER_CONTACTS)
  betterContactsActivated Boolean       @default(true)  // false for M33T_INVITEE

  // NEW: Phone verification
  phone                   String?       // E.164 format
  phoneVerified           Boolean       @default(false)
  phoneVerifiedAt         DateTime?

  // NEW: Linked attendees (inverse relation)
  linkedAttendees         EventAttendee[] @relation("AttendeeLinkedUser")
}
```

#### EventAttendee Model Updates
```prisma
model EventAttendee {
  // ... existing fields ...

  // NEW: Link to authenticated user
  userId    String?
  user      User?   @relation("AttendeeLinkedUser", fields: [userId], references: [id])

  // Add index for user lookup
  @@index([userId])
}
```

#### Phone Verification OTP Storage
```prisma
model PhoneVerificationOTP {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  phone       String   // Phone being verified
  code        String   // 6-digit code (hashed)
  expiresAt   DateTime
  attempts    Int      @default(0)
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([phone, code])
}
```

### 2. OAuth Provider Configuration

#### Supabase Dashboard Setup
1. **Google OAuth:**
   - Navigate to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add OAuth credentials from Google Cloud Console
   - Set redirect URL: `{APP_URL}/auth/callback`

2. **Apple OAuth:** *(Deferred to Phase 2)*
   - Enable Apple provider in Supabase
   - Configure Apple Developer credentials
   - Set Services ID and redirect URL

#### Environment Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple OAuth (deferred to Phase 2)
# APPLE_CLIENT_ID=your-apple-service-id
# APPLE_CLIENT_SECRET=your-apple-client-secret
```

### 3. Authentication Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RSVP + AUTH FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Invite Email → /rsvp/[token]                                       │
│           ↓                                                             │
│  2. RSVP Form (CONFIRMED/MAYBE/DECLINED)                               │
│           ↓ (if CONFIRMED or MAYBE)                                    │
│  3. /rsvp/[token]/verify                                               │
│     ┌─────────────────────────────────────────┐                        │
│     │  "Verify Your Invite"                   │                        │
│     │                                         │                        │
│     │  [G] Continue with Google  ← PRIMARY    │                        │
│     │                                         │                        │
│     │  ─────── or ───────                     │                        │
│     │  Use email instead  ← SECONDARY         │                        │
│     └─────────────────────────────────────────┘                        │
│           ↓                                                             │
│  4. OAuth/Email Flow                                                    │
│     • New user: Create with accountOrigin: 'M33T_INVITEE'              │
│     • Existing BC user: Show linking message, proceed                   │
│     • Link EventAttendee.userId to User.id                             │
│           ↓                                                             │
│  5. /rsvp/[token]/questionnaire (existing flow, now authenticated)     │
│           ↓                                                             │
│  6. /rsvp/[token]/verify-phone                                         │
│     ┌─────────────────────────────────────────┐                        │
│     │  "Stay in the loop"                     │                        │
│     │                                         │                        │
│     │  This is how we'll send your matches    │                        │
│     │  and event updates.                     │                        │
│     │                                         │                        │
│     │  📱 [+1 (___) ___-____]                 │                        │
│     │  [Send Code]                            │                        │
│     │                                         │                        │
│     │  [ _ ] [ _ ] [ _ ] [ _ ] [ _ ] [ _ ]   │                        │
│     │  [Verify]                               │                        │
│     └─────────────────────────────────────────┘                        │
│           ↓                                                             │
│  7. /rsvp/[token]/complete (with profile card preview)                 │
│     • "Go to Dashboard" CTA                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Phone Verification System

#### OTP Generation & Validation
```typescript
// src/lib/m33t/phone-verification.ts

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_MINUTES = 1; // Between sends

export function generateOTP(): string {
  // Generate cryptographically secure 6-digit code
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOTP(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function formatPhoneForDisplay(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone, 'US');
    return parsed?.formatNational() || phone;
  } catch {
    return phone;
  }
}

export function normalizePhone(phone: string): string | null {
  try {
    if (!isValidPhoneNumber(phone, 'US')) return null;
    const parsed = parsePhoneNumber(phone, 'US');
    return parsed?.format('E.164') || null;
  } catch {
    return null;
  }
}
```

#### SMS OTP Templates
```typescript
// Add to src/lib/notifications/sms.ts

SMS_TEMPLATES.phoneVerification = (code: string, eventName: string) =>
  `Your M33T verification code is ${code}. ` +
  `This confirms your number for ${eventName} match notifications. ` +
  `Code expires in 5 minutes.`;
```

### 5. API Routes

#### Send OTP Endpoint
```typescript
// src/app/api/auth/send-otp/route.ts

// POST /api/auth/send-otp
// Body: { phone: string, eventId?: string }
// Returns: { success: boolean, message: string }

// Flow:
// 1. Validate user is authenticated
// 2. Normalize phone number
// 3. Check rate limiting (1 code per minute)
// 4. Generate OTP, hash it, store in PhoneVerificationOTP
// 5. Send SMS via Twilio
// 6. Return success
```

#### Verify OTP Endpoint
```typescript
// src/app/api/auth/verify-phone/route.ts

// POST /api/auth/verify-phone
// Body: { code: string }
// Returns: { success: boolean, verified: boolean }

// Flow:
// 1. Validate user is authenticated
// 2. Find pending OTP record for user
// 3. Check expiration
// 4. Check attempts (max 3)
// 5. Verify hashed code matches
// 6. Update User: phone, phoneVerified, phoneVerifiedAt
// 7. Mark OTP as verified
// 8. Return success
```

#### Link Attendee Endpoint
```typescript
// src/app/api/auth/link-attendee/route.ts

// POST /api/auth/link-attendee
// Body: { token: string } (RSVP token)
// Returns: { success: boolean, attendeeId: string }

// Flow:
// 1. Validate user is authenticated
// 2. Verify RSVP token
// 3. Find EventAttendee by token
// 4. Update EventAttendee.userId = current user
// 5. Return success
```

### 6. Auth Callback Enhancement

```typescript
// src/app/auth/callback/route.ts (enhanced)

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirect_to');
  const isM33tInvitee = requestUrl.searchParams.get('m33t_invitee') === 'true';
  const attendeeId = requestUrl.searchParams.get('attendee_id');

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (user && !error) {
      // Check if user exists in Prisma
      let dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (dbUser) {
        // EXISTING USER - Show linking message via redirect param
        if (dbUser.accountOrigin === 'BETTER_CONTACTS') {
          // Redirect with linking flag
          return NextResponse.redirect(
            `${requestUrl.origin}${redirectTo || '/guest/events'}?linked=true`
          );
        }
      } else {
        // NEW USER - Create with appropriate origin
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email!.split('@')[0],
            accountOrigin: isM33tInvitee ? 'M33T_INVITEE' : 'BETTER_CONTACTS',
            betterContactsActivated: !isM33tInvitee,
          }
        });
      }

      // Link attendee if token provided
      if (attendeeId) {
        await prisma.eventAttendee.update({
          where: { id: attendeeId },
          data: { userId: dbUser.id }
        });
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectTo || '/guest/events'}`);
}
```

### 7. Middleware Updates

```typescript
// src/lib/supabase/middleware.ts (additions)

// Define route access by account origin
const GUEST_ROUTES = ['/guest'];
const BC_ONLY_ROUTES = ['/contacts', '/enrich', '/explore', '/settings', '/onboarding'];
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/m33t', '/rsvp', '/events'];

export async function updateSession(request: NextRequest) {
  // ... existing session refresh logic ...

  const pathname = request.nextUrl.pathname;
  const user = await getCurrentUser();

  // Public routes - allow all
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return response;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Guest routes - allow authenticated users
  if (GUEST_ROUTES.some(route => pathname.startsWith(route))) {
    return response;
  }

  // BC-only routes - block M33T invitees without activation
  if (BC_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountOrigin: true, betterContactsActivated: true }
    });

    if (dbUser?.accountOrigin === 'M33T_INVITEE' && !dbUser?.betterContactsActivated) {
      // Redirect M33T invitees to guest dashboard
      return NextResponse.redirect(new URL('/guest/events', request.url));
    }
  }

  return response;
}
```

### 8. Auth Helper Extensions

```typescript
// src/lib/auth-helpers.ts (additions)

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hasM33tAccess?: boolean;
  accountOrigin: AccountOrigin;        // NEW
  betterContactsActivated: boolean;    // NEW
  phoneVerified: boolean;              // NEW
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // ... existing Supabase auth check ...

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hasM33tAccess: true,
      accountOrigin: true,           // NEW
      betterContactsActivated: true, // NEW
      phoneVerified: true,           // NEW
    }
  });

  return dbUser;
}

export function isM33tInvitee(user: AuthUser): boolean {
  return user.accountOrigin === 'M33T_INVITEE' && !user.betterContactsActivated;
}

export function canAccessBetterContacts(user: AuthUser): boolean {
  return user.accountOrigin === 'BETTER_CONTACTS' || user.betterContactsActivated;
}
```

### 9. Verify Invite Page

```typescript
// src/app/rsvp/[token]/verify/page.tsx

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VerifyInvitePage({ params }: { params: { token: string } }) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?` +
          `redirect_to=/rsvp/${params.token}/questionnaire&` +
          `m33t_invitee=true&` +
          `attendee_id=${attendeeId}`,
      }
    });
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            Verify Your Invite
          </h1>
          <p className="mt-2 text-text-secondary">
            Create your M33T profile to complete your RSVP
          </p>
        </div>

        <div className="space-y-4">
          {/* Primary: Google */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100"
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          {/* Apple OAuth - Deferred to Phase 2 */}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-primary px-2 text-text-tertiary">or</span>
            </div>
          </div>

          {/* Tertiary: Email */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full text-sm text-text-secondary hover:text-text-primary"
            >
              Use email instead
            </button>
          ) : (
            <EmailSignUpForm token={params.token} attendeeId={attendeeId} />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 10. Phone Verification Page

```typescript
// src/app/rsvp/[token]/verify-phone/page.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function VerifyPhonePage({ params }: { params: { token: string } }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError('');

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });

    if (res.ok) {
      setStep('code');
      // Auto-focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to send code');
    }

    setIsLoading(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every(d => d) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleVerify = async (fullCode: string) => {
    setIsLoading(true);
    setError('');

    const res = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code: fullCode }),
    });

    if (res.ok) {
      setStep('success');
      // Redirect after celebration
      setTimeout(() => {
        window.location.href = `/rsvp/${params.token}/complete`;
      }, 2000);
    } else {
      const data = await res.json();
      setError(data.error || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-text-primary">
                Stay in the loop
              </h1>
              <p className="mt-2 text-text-secondary">
                This is how we'll send your matches and event updates
              </p>
            </div>

            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder="(555) 123-4567"
              className="text-lg"
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              onClick={handleSendCode}
              disabled={!phone || isLoading}
              className="w-full h-12 bg-gold-primary hover:bg-gold-light"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Send Code'}
            </Button>
          </motion.div>
        )}

        {step === 'code' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-text-primary">
                Enter your code
              </h1>
              <p className="mt-2 text-text-secondary">
                We sent a 6-digit code to {formatPhoneForDisplay(phone)}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      inputRefs.current[i - 1]?.focus();
                    }
                  }}
                  className="w-12 h-14 text-center text-2xl font-mono
                    bg-bg-secondary border border-border rounded-lg
                    focus:border-gold-primary focus:ring-1 focus:ring-gold-primary
                    text-text-primary"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={() => { setStep('phone'); setError(''); }}
              className="w-full text-sm text-text-secondary hover:text-text-primary"
            >
              Use a different number
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h2 className="text-xl font-semibold text-text-primary">
              Phone verified!
            </h2>
            <p className="text-text-secondary">
              You're all set to receive your matches
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 11. Email Collision Handling UI

```typescript
// src/components/auth/AccountLinkingMessage.tsx

'use client';

import { motion } from 'framer-motion';
import { Link2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccountLinkingMessageProps {
  onContinue: () => void;
}

export function AccountLinkingMessage({ onContinue }: AccountLinkingMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-6 bg-bg-secondary rounded-xl border border-border"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gold-subtle rounded-lg">
          <Link2 className="w-5 h-5 text-gold-primary" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          Account found!
        </h2>
      </div>

      <p className="text-text-secondary mb-6">
        We see you already have a Better Contacts profile (smart move).
        We'll automatically link your M33T profile to that account.
      </p>

      <Button
        onClick={onContinue}
        className="w-full bg-gold-primary hover:bg-gold-light"
      >
        Continue
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </motion.div>
  );
}
```

### 12. Returning User Flow Update

```typescript
// src/app/rsvp/[token]/page.tsx (modifications)

// Add to existing page logic:

// Check if user is already authenticated
const session = await supabase.auth.getSession();
const isAuthenticated = !!session.data.session;

// Check if this attendee is already linked to a user
const attendee = await prisma.eventAttendee.findFirst({
  where: { id: tokenPayload.attendeeId },
  include: { user: true }
});

const isVerified = !!attendee?.userId;
const hasCompletedQuestionnaire = !!attendee?.questionnaireCompletedAt;
const hasVerifiedPhone = attendee?.user?.phoneVerified || false;

// Render appropriate view
if (isVerified) {
  return (
    <VerifiedAttendeeView
      attendee={attendee}
      event={event}
      hasCompletedQuestionnaire={hasCompletedQuestionnaire}
      hasVerifiedPhone={hasVerifiedPhone}
      token={params.token}
    />
  );
}

// Otherwise render normal RSVP form
```

```typescript
// src/components/m33t/VerifiedAttendeeView.tsx

export function VerifiedAttendeeView({
  attendee,
  event,
  hasCompletedQuestionnaire,
  hasVerifiedPhone,
  token,
}: VerifiedAttendeeViewProps) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Status Card */}
        <div className="p-6 bg-bg-secondary rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-text-primary">You're {attendee.rsvpStatus.toLowerCase()}</p>
              <p className="text-sm text-text-secondary">{event.name}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!hasCompletedQuestionnaire && (
            <Button
              asChild
              className="w-full bg-gold-primary hover:bg-gold-light"
            >
              <Link href={`/rsvp/${token}/questionnaire`}>
                Complete Your Profile
              </Link>
            </Button>
          )}

          {hasCompletedQuestionnaire && !hasVerifiedPhone && (
            <Button
              asChild
              className="w-full bg-gold-primary hover:bg-gold-light"
            >
              <Link href={`/rsvp/${token}/verify-phone`}>
                Verify Your Phone
              </Link>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link href="/guest/events">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## User Experience

### First-Time Invitee Flow
1. Receives email invitation with RSVP link
2. Clicks link → arrives at `/rsvp/[token]`
3. Selects CONFIRMED or MAYBE
4. Redirected to `/rsvp/[token]/verify` → SSO options
5. Authenticates via Google (primary) or Apple/email
6. If email exists → sees linking message → continues
7. Redirected to `/rsvp/[token]/questionnaire` → answers questions
8. Redirected to `/rsvp/[token]/verify-phone` → enters phone
9. Receives SMS code → enters code → verified
10. Redirected to `/rsvp/[token]/complete` → sees profile card
11. Can click "Go to Dashboard" to access `/guest/events`

### Returning User Flow
1. Returns to `/rsvp/[token]` (or directly to `/guest/events`)
2. If not logged in → redirected to login
3. If logged in → sees status card with relevant CTAs
4. Can complete any missing steps or go to dashboard

### Better Contacts User Flow
1. Existing BC user receives M33T invite
2. Goes through RSVP → verify flow
3. Sees "Account found!" linking message
4. Continues → EventAttendee linked to existing User
5. Can access both `/guest/**` and `/contacts/**` routes

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/lib/m33t/phone-verification.test.ts

describe('Phone Verification', () => {
  describe('generateOTP', () => {
    it('should generate 6-digit numeric code', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate different codes on each call', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateOTP()));
      expect(codes.size).toBeGreaterThan(90); // Allow some collision
    });
  });

  describe('normalizePhone', () => {
    it('should convert US number to E.164', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
      expect(normalizePhone('555-123-4567')).toBe('+15551234567');
      expect(normalizePhone('5551234567')).toBe('+15551234567');
    });

    it('should return null for invalid numbers', () => {
      expect(normalizePhone('123')).toBeNull();
      expect(normalizePhone('not-a-phone')).toBeNull();
    });
  });

  describe('hashOTP', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = hashOTP('123456');
      const hash2 = hashOTP('123456');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hashOTP('123456');
      const hash2 = hashOTP('654321');
      expect(hash1).not.toBe(hash2);
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/api/auth/send-otp.test.ts

describe('POST /api/auth/send-otp', () => {
  it('should send OTP for valid phone', async () => {
    // Mock authenticated user
    // Mock Twilio client
    const res = await POST(request);
    expect(res.status).toBe(200);
    // Verify OTP record created
    // Verify Twilio called
  });

  it('should rate limit repeated requests', async () => {
    // Send first request
    const res1 = await POST(request);
    expect(res1.status).toBe(200);

    // Send second request immediately
    const res2 = await POST(request);
    expect(res2.status).toBe(429);
  });

  it('should reject unauthenticated requests', async () => {
    // No session
    const res = await POST(request);
    expect(res.status).toBe(401);
  });
});
```

### E2E Tests
```typescript
// e2e/invitee-auth.spec.ts

test.describe('Invitee Authentication Flow', () => {
  test('complete RSVP with Google SSO', async ({ page }) => {
    // Navigate to RSVP page
    await page.goto('/rsvp/test-token');

    // Select CONFIRMED
    await page.click('text=I\'m coming');
    await page.click('text=Confirm');

    // Should redirect to verify page
    await expect(page).toHaveURL(/\/rsvp\/.*\/verify/);

    // Click Google SSO (will need mock)
    await page.click('text=Continue with Google');

    // After OAuth callback, should be on questionnaire
    await expect(page).toHaveURL(/\/rsvp\/.*\/questionnaire/);
  });

  test('phone verification flow', async ({ page }) => {
    // Navigate to phone verification (authenticated)
    await page.goto('/rsvp/test-token/verify-phone');

    // Enter phone number
    await page.fill('input[type="tel"]', '5551234567');
    await page.click('text=Send Code');

    // Should show code input
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Enter code (mock OTP)
    const codeInputs = page.locator('input[type="text"]');
    await codeInputs.nth(0).fill('1');
    await codeInputs.nth(1).fill('2');
    await codeInputs.nth(2).fill('3');
    await codeInputs.nth(3).fill('4');
    await codeInputs.nth(4).fill('5');
    await codeInputs.nth(5).fill('6');

    // Should show success
    await expect(page.locator('text=Phone verified!')).toBeVisible();
  });

  test('returning user sees status page', async ({ page }) => {
    // Set up verified attendee
    // Navigate to RSVP page
    await page.goto('/rsvp/test-token');

    // Should see status card
    await expect(page.locator('text=You\'re confirmed')).toBeVisible();
    await expect(page.locator('text=Go to Dashboard')).toBeVisible();
  });
});
```

---

## Performance Considerations

### OTP Rate Limiting
- Max 1 OTP per phone per minute (prevent abuse)
- Max 5 OTPs per phone per hour (prevent spam)
- Use Redis or in-memory cache for rate limiting

### Database Indexing
```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON "PhoneVerificationOTP"("userId");
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON "PhoneVerificationOTP"("phone");
CREATE INDEX IF NOT EXISTS idx_event_attendee_user ON "EventAttendee"("userId");
```

### Session Caching
- Use Supabase's built-in session caching
- Avoid redundant database lookups in middleware

---

## Security Considerations

### OTP Security
- Store OTP codes hashed (SHA-256)
- 5-minute expiration
- Max 3 verification attempts
- Delete OTP records after verification

### OAuth Security
- Use PKCE flow for OAuth (Supabase default)
- Validate redirect URLs
- Check email verification status from provider

### Route Protection
- All `/guest/**` routes require authentication
- Validate EventAttendee ownership for profile access
- Use RSVP token + user session for cross-validation

### Phone Number Privacy
- Phone stored only on User (not exposed in public APIs)
- E.164 format validation prevents injection
- Rate limiting prevents enumeration attacks

---

## Documentation

### Files to Create/Update
- `developer-guides/12-m33t-invitee-auth-guide.md` - New guide
- `CLAUDE.md` - Add invitee auth patterns section
- `.env.example` - Add OAuth environment variables

### Environment Variables Documentation
```bash
# OAuth Providers (Supabase)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

# Phone Verification (existing Twilio vars used)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Implementation Phases

### Phase 1: Database & OAuth Setup
1. Add Prisma schema changes (User fields, PhoneVerificationOTP model)
2. Run migration
3. Configure Google OAuth in Supabase dashboard
4. Update auth callback to handle M33T invitees

### Phase 2: Verify Invite Flow
1. Create `/rsvp/[token]/verify/page.tsx`
2. Implement SSO buttons
3. Implement email/password fallback
4. Add email collision handling UI
5. Link EventAttendee to User on success

### Phase 3: Phone Verification
1. Create phone verification utilities
2. Add SMS OTP endpoint
3. Add verify phone endpoint
4. Create `/rsvp/[token]/verify-phone/page.tsx`
5. Implement delightful OTP input UI

### Phase 4: Route Protection & Feature Gating
1. Update middleware for guest routes
2. Add feature gating helpers
3. Update RSVP page for returning users
4. Add VerifiedAttendeeView component

### Phase 5: Testing & Polish
1. Write unit tests for phone verification
2. Write integration tests for API routes
3. Write E2E tests for full flow
4. Add error handling and edge cases
5. Performance testing and optimization

---

## Resolved Questions

1. **Apple OAuth Priority:** ✅ **Deferred to Phase 2.** Google OAuth is primary and sufficient for V1. Apple OAuth requires Apple Developer account setup which would delay launch. Can be added post-launch.

2. **Phone Pre-fill:** ✅ **Yes, pre-fill.** If the EventAttendee already has a phone number from the invite list, pre-populate it in the verification screen. User can still change it before sending OTP.

3. **OTP Resend Cooldown:** ✅ **1 minute is fine.** Standard cooldown balances security with UX. Show countdown timer so users know when they can resend.

4. **Session Duration:** ✅ **Same as BC users.** No special session handling needed. Supabase's default session management works for both user types.

5. **Skip Phone Option:** ✅ **No skip option.** Phone verification is required per product decision. SMS is critical for match reveals and event updates. Users who don't verify phone cannot receive their matches.

---

## References

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [libphonenumber-js Documentation](https://www.npmjs.com/package/libphonenumber-js)
- Related ideation: `specs/m33t-invitee-experience-v1/01-ideation.md`
- M33T Architecture: `developer-guides/07-m33t-architecture-guide.md`
