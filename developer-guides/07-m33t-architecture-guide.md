# M33T Architecture & Boundaries Guide

**Last Updated:** 2026-01-18
**Component:** M33T Event Networking Platform - Two-Application Architecture

---

## 1. System Overview

Better Connections hosts two distinct but integrated applications:

| Application | Purpose | Audience | URL Pattern |
|-------------|---------|----------|-------------|
| **Better Connections** | Personal CRM for contact enrichment | Authenticated users | `/contacts`, `/enrichment`, `/explore` |
| **M33T** | Event networking with AI-powered matching | Event organizers + Public attendees | Dashboard: `/events/*`, Public: `/m33t/*` |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BETTER CONNECTIONS REPOSITORY                          │
│                                                                             │
│  ┌────────────────────────────┐    ┌────────────────────────────────────┐  │
│  │   BETTER CONNECTIONS       │    │              M33T                   │  │
│  │   (Personal CRM)           │    │   (Event Networking Platform)       │  │
│  │                            │    │                                     │  │
│  │  - Contact Management      │    │  - Event Creation & Management      │  │
│  │  - Voice Enrichment        │◄───┼─ Attendees link to Contacts        │  │
│  │  - AI Research             │    │  - RSVP & Questionnaire Flow        │  │
│  │  - Explore Chat            │    │  - AI Profile Extraction            │  │
│  │                            │    │  - Intelligent Match Generation     │  │
│  │  Auth Required: YES        │    │  - Public Landing Pages             │  │
│  │  Access: All Users         │    │                                     │  │
│  │                            │    │  Auth Required: Mixed               │  │
│  └────────────────────────────┘    │  Access: hasM33tAccess = true       │  │
│              │                     └────────────────────────────────────┘  │
│              │                                    │                        │
│              └────────────────────────────────────┘                        │
│                       Shared Database (Prisma)                             │
│                       Shared UI Components                                 │
│                       Shared Auth (Supabase)                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Access Control Boundaries

### Better Connections Access
- **Requirement:** Supabase authentication
- **Access Check:** User exists in database
- **Location:** `middleware.ts` - redirects unauthenticated users to `/login`

### M33T Access
- **Requirement:** Authenticated + `hasM33tAccess = true` on User record
- **Access Check:** Explicit permission flag in database
- **Location:** `src/lib/m33t/access.ts`

```typescript
// src/lib/m33t/access.ts
export async function checkM33tAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasM33tAccess: true },
  });
  return user?.hasM33tAccess === true;
}

export function m33tAccessDeniedResponse() {
  return NextResponse.json(
    { error: 'M33T Events access required', code: 'FORBIDDEN', retryable: false },
    { status: 403 }
  );
}
```

### Public M33T Pages (No Auth)
- `/m33t/[slug]` - Public event landing page
- `/rsvp/[token]` - Token-authenticated RSVP flow
- `/api/public/events/[slug]` - Public event data API

---

## 3. Data Model Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA MODEL ARCHITECTURE                             │
│                                                                             │
│  BETTER CONNECTIONS                         M33T                            │
│  ═══════════════════                        ════                            │
│                                                                             │
│  User ───────────────────────────────────── User (hasM33tAccess)            │
│    │                                          │                             │
│    ▼                                          ▼                             │
│  Contact ◄─────── Optional Link ────────► EventAttendee                     │
│    │                                          │                             │
│    ▼                                          ▼                             │
│  Tag                                        Event ◄───── EventOrganizer     │
│                                               │                             │
│                                               ▼                             │
│                                             Match                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Contact ↔ EventAttendee Link

Event attendees can optionally link to Better Connections contacts:

```typescript
// EventAttendee model (prisma/schema.prisma)
model EventAttendee {
  // ...
  contactId       String?
  contact         Contact? @relation(fields: [contactId], references: [id])
  // ...
}
```

**Use Case:** When inviting guests, organizers can select from their Better Connections contacts, automatically filling attendee info.

---

## 4. URL Structure & Route Boundaries

### Better Connections Routes (Auth Required)
```
/                       → Redirect to /login or /contacts
/login                  → Authentication
/contacts               → Contact list
/contacts/[id]          → Contact detail
/enrichment             → Enrichment queue
/enrichment/session     → Voice enrichment
/explore                → AI chat exploration
/settings               → User settings
```

### M33T Dashboard Routes (Auth + M33T Access Required)
```
/(dashboard)/events           → Event list
/(dashboard)/events/new       → Create event wizard
/(dashboard)/events/[id]      → Event detail (admin view)
/(dashboard)/events/[id]/edit → Edit event wizard
/(dashboard)/events/[id]/matches → Match curation
/(dashboard)/events/[id]/attendees/add → Add attendees
```

### M33T Public Routes (No Auth)
```
/m33t/[slug]            → Public event landing page
/rsvp/[token]           → RSVP flow (token auth)
```

### M33T API Routes
```
/api/events/            → List/create events (M33T access)
/api/events/[eventId]/  → Event CRUD (M33T access)
/api/events/[eventId]/matches/          → Match management
/api/events/[eventId]/matches/generate  → Generate matches
/api/events/[eventId]/notify            → Send notifications
/api/events/[eventId]/attendees/import  → Import attendees
/api/events/[eventId]/organizers        → Organizer management

/api/public/events/[slug] → Public event data (no auth)
/api/rsvp/[token]/        → RSVP operations (token auth)
```

---

## 5. M33T Core Library Structure

```
src/lib/m33t/
├── index.ts          # Barrel exports (entry point)
├── access.ts         # M33T feature access control (hasM33tAccess)
├── auth.ts           # Event-level authorization (checkEventAccess)
├── schemas.ts        # Zod schemas for all M33T types
├── questions.ts      # Default questionnaire definitions
├── tokens.ts         # JWT token generation/verification
├── extraction.ts     # AI profile extraction from questionnaires
├── matching.ts       # Match scoring algorithm
├── slug.ts           # Event slug generation
└── formatting.ts     # Date/time formatting utilities
```

### Importing M33T Functionality

Always import from the barrel file:

```typescript
// CORRECT
import {
  // Feature access
  checkM33tAccess,
  m33tAccessDeniedResponse,
  // Event-level authorization
  checkEventAccess,
  type EventPermission,
  // Tokens
  generateRSVPToken,
  verifyRSVPToken,
  // Profile extraction
  extractProfile,
  // Matching
  calculateMatchScore,
  generateEventMatches,
} from '@/lib/m33t';

// AVOID direct imports (unless necessary for tree-shaking)
import { checkM33tAccess } from '@/lib/m33t/access';
```

---

## 6. M33T Event Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         M33T EVENT LIFECYCLE                                │
│                                                                             │
│  ORGANIZER FLOW                           ATTENDEE FLOW                     │
│  ══════════════                           ═════════════                     │
│                                                                             │
│  1. Create Event (Wizard)                                                   │
│        │                                                                    │
│        ▼                                                                    │
│  2. Configure Questionnaire                                                 │
│        │                                                                    │
│        ▼                                                                    │
│  3. Invite Attendees ─────────────────► 4. Receive RSVP Link               │
│        │                                      │                             │
│        │                                      ▼                             │
│        │                                5. Complete RSVP                    │
│        │                                      │                             │
│        │                                      ▼                             │
│        │                                6. Answer Questionnaire             │
│        │                                      │                             │
│        │  ◄────── Profile Extracted ─────────┘                             │
│        │                                                                    │
│        ▼                                                                    │
│  7. Generate Matches (AI)                                                   │
│        │                                                                    │
│        ▼                                                                    │
│  8. Curate Matches (Optional) ────────► 9. Receive Matches                 │
│        │                                      │                             │
│        ▼                                      ▼                             │
│  10. Publish Landing Page              11. View Trading Cards              │
│        │                                      │                             │
│        ▼                                      ▼                             │
│  EVENT DAY ─────────────────────────── NETWORKING SUCCESS!                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. AI-Powered Features

### Profile Extraction

Converts questionnaire responses into structured matchable profiles:

```typescript
// src/lib/m33t/extraction.ts
export async function extractProfile(
  attendeeName: string,
  responses: QuestionnaireInput[]
): Promise<Profile>

// Profile includes:
// - seekingKeywords: string[] (what they want)
// - offeringKeywords: string[] (what they provide)
// - expertise: string[]
// - seniority: 'early' | 'mid' | 'senior' | 'executive' | 'founder'
// - conversationHooks: string[]
```

### Match Scoring Algorithm

```
Final Match Score =
  (Seeking ↔ Offering Score × 0.40) +
  (Expertise Overlap × 0.25) +
  (Experience Compatibility × 0.20) +
  (Topic Interest Match × 0.15)
```

```typescript
// src/lib/m33t/matching.ts
export function calculateMatchScore(
  a: MatchableProfile,
  b: MatchableProfile
): MatchScore

export function generateEventMatches(
  attendees: MatchableProfile[],
  matchesPerAttendee: number
): MatchScore[]

export function generateWhyMatchReasons(
  matchScore: MatchScore,
  attendee: MatchableProfile,
  matchedWith: MatchableProfile
): string[]

export function generateConversationStarters(
  attendee: MatchableProfile,
  matchedWith: MatchableProfile
): string[]
```

---

## 8. Token-Based RSVP Authentication

Attendees access RSVP pages without Supabase auth via signed JWT tokens:

```typescript
// src/lib/m33t/tokens.ts
interface RSVPTokenPayload {
  eventId: string;
  email: string;
  attendeeId: string;
  type: 'rsvp';
  exp: number;  // Expires 24h after event
  iat: number;
}

// Generate token for email
export function generateRSVPUrl(
  eventId: string,
  email: string,
  attendeeId: string,
  eventDate: Date,
  baseUrl: string
): string

// Verify token on API calls
export function verifyRSVPToken(token: string): RSVPTokenPayload | null
```

**Token Flow:**
1. Organizer invites attendee
2. System generates JWT token with attendee info
3. Attendee receives `/rsvp/[token]` link
4. Token verified on each RSVP API call
5. Token expires 24h after event date

---

## 9. Shared vs Isolated Components

### Shared Between Applications

| Category | Components |
|----------|------------|
| **Auth** | Supabase client, session management |
| **Database** | Prisma client, schema |
| **UI Primitives** | Button, Input, Card, Modal (shadcn/ui) |
| **Design System** | `src/lib/design-system.ts` colors, typography |
| **Layout** | AppShell, Sidebar (with M33T nav items for authorized users) |

### M33T-Specific Components

```
src/components/m33t/
├── RSVPForm.tsx              # RSVP confirmation form
├── TradingCard.tsx           # Attendee display card
├── TokenExpiredMessage.tsx   # Error state
├── TokenInvalidMessage.tsx   # Error state
└── questions/                # Question type renderers
    ├── OpenTextQuestion.tsx
    ├── SliderQuestion.tsx
    ├── SingleSelectQuestion.tsx
    └── MultiSelectQuestion.tsx

src/components/events/
├── wizard/                   # Event creation wizard
│   ├── EventWizard.tsx
│   ├── WizardStepper.tsx
│   └── steps/
│       ├── BasicsStep.tsx
│       ├── VenueStep.tsx
│       ├── OrganizersStep.tsx
│       ├── RSVPStep.tsx
│       ├── CardsStep.tsx
│       ├── QuestionnaireStep.tsx
│       ├── LandingPageStep.tsx
│       └── ReviewStep.tsx
└── editor/                   # Event editing (alternative to wizard)
    └── EventEditor.tsx

src/app/m33t/[slug]/components/  # Public landing page
├── EventHero.tsx
├── VenueSection.tsx
├── AttendeeCarousel.tsx
├── AttendeeCard.tsx
├── ProfileModal.tsx
├── FullGuestListModal.tsx
├── ScheduleSection.tsx
├── HostSection.tsx
├── FooterCTA.tsx
├── WhatToExpectSection.tsx
└── ScrollytellingSection.tsx
```

---

## 10. Environment Variables

### Shared
```bash
DATABASE_URL=                    # PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=       # Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase
OPENAI_API_KEY=                 # AI features
```

### M33T-Specific
```bash
RSVP_TOKEN_SECRET=              # JWT signing for RSVP tokens
NEXT_PUBLIC_APP_URL=            # Base URL for generating RSVP links
```

---

## 11. Critical Gotchas

### Access Check in API Routes

Always check M33T access in protected routes:

```typescript
// CORRECT
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  // M33T access check
  const hasAccess = await checkM33tAccess(user.id);
  if (!hasAccess) return m33tAccessDeniedResponse();

  // Proceed...
}
```

### Event Ownership vs Organizer Access (Multi-Organizer Collaboration)

**Use the `checkEventAccess()` helper for all permission checks:**

```typescript
// src/lib/m33t/auth.ts
import { checkEventAccess } from '@/lib/m33t';

// In API routes - returns null if no access
const access = await checkEventAccess(eventId, user.id, 'curate');
if (!access) {
  return NextResponse.json(
    { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}

// Check ownership
if (access.isOwner) {
  // Owner has all permissions
}

// Check specific permission
if (access.organizer?.canEdit) {
  // Co-organizer with edit permission
}
```

**Permission Levels:**

| Level | Description | Required Field |
|-------|-------------|----------------|
| `view` | See event in list, view details | Any co-organizer |
| `curate` | Edit attendee profiles, manage matches | `canCurate: true` |
| `edit` | Modify event details | `canEdit: true` |
| `manage` | Add/remove organizers | `canManage: true` OR owner |

**CRITICAL: Event List Query Must Include Co-Organizers:**

```typescript
// src/app/api/events/route.ts
const events = await prisma.event.findMany({
  where: {
    OR: [
      { userId: user.id }, // Owner
      { organizers: { some: { userId: user.id } } }, // Co-organizer
    ],
  },
  include: {
    organizers: {
      where: { userId: user.id },
      select: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
    }
  }
});
```

Without the OR clause, co-organizers won't see events in their Events list.

### Public API Data Filtering

Never expose private data on public endpoints:

```typescript
// src/app/api/public/events/[slug]/route.ts
// EXCLUDE: email, phone, questionnaireResponses
// INCLUDE: name, title, company, tradingCard
```

### Token Expiration Handling

```typescript
// src/lib/m33t/tokens.ts
export function isTokenExpired(token: string): boolean

// Use to show appropriate error message
if (isTokenExpired(token)) {
  return <TokenExpiredMessage eventName={...} />;
}
return <TokenInvalidMessage />;
```

---

## 12. Testing M33T Features

### Enable M33T Access for Test User

```sql
UPDATE "User" SET "hasM33tAccess" = true WHERE email = 'test@example.com';
```

### Test Event Flow

1. Create event at `/events/new`
2. Complete wizard steps
3. Add test attendee
4. Generate RSVP link
5. Open RSVP link in incognito (simulates attendee)
6. Complete RSVP + questionnaire
7. Return to dashboard, generate matches
8. View public landing page at `/m33t/[slug]`

---

## 13. Related Guides

- [M33T Event Management Guide](./08-m33t-event-management-guide.md) - Wizard, attendees, matches
- [M33T Public Landing Pages Guide](./09-m33t-landing-pages-guide.md) - Public pages, RSVP flow
- [Architecture Overview](./00-architecture-overview-guide.md) - Full system architecture
