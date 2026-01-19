# M33T: Intelligent Event Networking Platform

## Status
**Draft** — Validated and simplified for V1 implementation

## Authors
- Claude Code (AI Assistant)
- Date: January 2026

---

## Overview

M33T is a feature layer on top of Better Contacts that transforms networking events from random mingling into purposeful matching. It enables event organizers to curate guest lists, collect rich attendee context through configurable questionnaires, and generate AI-powered connection recommendations.

**Core Value Proposition:**
1. Leverage existing Better Contacts profiles for attendee context
2. Enable organizers to curate guest lists from their network
3. Collect attendee context through multi-modal questionnaires
4. Generate AI-powered connection recommendations based on attendee goals
5. Facilitate meaningful conversations with contextual prompts

---

## Background / Problem Statement

### The Problem
Networking events suffer from a fundamental inefficiency: attendees have limited time but must randomly discover who they should meet. This leads to:
- Missed connections with high-potential matches
- Shallow conversations without context
- Post-event regret ("I wish I had met...")
- Organizer frustration at low perceived event value

### Why Now
- Better Contacts already has rich contact data for profile pre-fill
- AI can now reliably extract structured data from natural language
- Semantic embeddings enable "fuzzy" matching on goals/interests
- Users increasingly expect personalized, curated experiences

### Root Cause Analysis
Traditional event networking fails because:
1. **Information asymmetry** — Attendees don't know who else is coming or what they want
2. **Discovery friction** — Finding relevant people in a crowd is random chance
3. **Context gap** — Even when you meet someone, you lack conversation context
4. **Time constraints** — Limited event duration means missed opportunities

---

## Goals (V1)

- [ ] Enable organizers to create events with customizable questionnaires
- [ ] Capture attendee goals, ideal connections, and context via multi-modal intake
- [ ] Generate AI-powered match recommendations with explainable "why this match" reasoning
- [ ] Provide organizers a dashboard to review, approve, and customize matches
- [ ] Deliver match notifications via SMS and email before events
- [ ] Create "Trading Cards" that display attendee information (L1-L3)

---

## Non-Goals (V1 — Deferred to V2+)

- [ ] Push notifications (mobile app)
- [ ] At-event real-time check-in/timer features
- [ ] White-label/custom branding per event
- [ ] Multi-organizer collaboration workflows
- [ ] Waitlist management with automatic promotion
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Payment/ticketing integration
- [ ] L4 Trading Card deep-dive expandable sections
- [ ] Mad-Lib and Ranking question types
- [ ] Anti-match filtering (dealbreaker logic)
- [ ] Post-event sync to Better Contacts
- [ ] Post-event follow-up emails

---

## Technical Dependencies

### Existing (in Better Contacts)
| Dependency | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.0.0 | App Router, API routes |
| React | 19.0.0 | UI framework |
| Prisma | 6.19.1 | ORM |
| Supabase | Latest | PostgreSQL + Auth |
| OpenAI (via Vercel AI SDK) | ai@5.0.113 | GPT-4o-mini for extraction |
| Tailwind CSS | 3.4.0 | Styling |
| shadcn/ui | Latest | Component library |
| Framer Motion | 12.23.26 | Animations |

### New Dependencies Required
| Dependency | Version | Purpose |
|------------|---------|---------|
| `twilio` | ^5.x | SMS notifications |
| `resend` | ^4.x | Email notifications |
| `@react-email/components` | ^0.x | Email templates |

### Deferred Dependencies (V2)
| Dependency | Version | Purpose |
|------------|---------|---------|
| `inngest` | ^3.x | Background job processing (V2 - when >50 attendees) |
| `pgvector` | (Supabase extension) | Embedding storage (V2 - when rule-based insufficient) |

### External Services
| Service | Purpose | Pricing |
|---------|---------|---------|
| Twilio | SMS delivery | ~$0.0079/SMS (US) |
| Resend | Email delivery | Free tier: 100/day |
| OpenAI | Extraction only (V1) | GPT-4o-mini: $0.15/1M input tokens |

---

## Technical Decisions

### 1. Matching Algorithm: Rule-Based First (V1), Hybrid Later (V2)

**V1 Decision:** Start with rule-based scoring only. Add embeddings in V2 when proven necessary.

**Rationale:**
- Rule-based is simpler to implement, debug, and explain
- For <50 attendees, rule-based matching is sufficient
- Avoid pgvector setup complexity in V1
- Can always upgrade to hybrid later

**V1 Architecture (Rule-Based Only):**
```
Final Match Score =
  (Seeking ↔ Offering Score × 0.40) +
  (Expertise Overlap × 0.25) +
  (Experience Compatibility × 0.20) +
  (Topic Interest Match × 0.15)
```

**Rule-Based Components:**
| Component | Weight | Logic |
|-----------|--------|-------|
| Seeking ↔ Offering | 0.40 | Keyword overlap between goals.seeking and offerings.canHelpWith |
| Expertise Overlap | 0.25 | Jaccard similarity on expertise arrays |
| Experience Compatibility | 0.20 | Same level: 0.6, Adjacent: 0.8 (mentorship bonus), Opposite: 0.4 |
| Topic Interest Match | 0.15 | Intersection of selected topics / union |

**V2 Addition (Hybrid):**
```
Final Match Score =
  (Embedding Similarity × 0.4) +
  (Rule-Based Score × 0.4) +
  (Style Compatibility × 0.2)
```

---

### 2. Real-Time Architecture: Server-Sent Events (SSE)

**Decision:** Use SSE for real-time updates. No fallback in V1 (graceful degradation to manual refresh).

**Rationale:**
- M33T needs one-way server→client updates (not bidirectional)
- SSE is natively supported in Next.js 15 Route Handlers
- Lower complexity than WebSockets
- Auto-reconnect built into browser EventSource API
- Firewall-friendly (standard HTTP)

**Implementation Pattern:**
```typescript
// app/api/events/[eventId]/stream/route.ts
export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Simple polling-based implementation for V1
      const interval = setInterval(async () => {
        const updates = await getRecentUpdates(eventId);
        if (updates.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updates)}\n\n`));
        }
      }, 5000); // Poll every 5 seconds

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**SSE Use Cases:**
| Feature | Update Type | Payload |
|---------|-------------|---------|
| RSVP Dashboard | New RSVP, status change | `{ type: 'rsvp', attendeeId, status }` |
| Match Generation | Progress updates | `{ type: 'matchProgress', stage, percent }` |

---

### 3. LLM Extraction Pipeline: Synchronous Real-Time (V1)

**V1 Decision:** All LLM operations run synchronously. No background jobs until >50 attendees.

**Rationale:**
- Simpler architecture without Inngest
- Acceptable latency for V1 (3-5 seconds per extraction)
- User waits for immediate feedback anyway
- Add async processing in V2 when scale demands

**Model:** `gpt-4o-mini` (already in codebase)
- 100% structured output compliance with `strict: true`
- Fast enough for real-time (~2-5 seconds)
- Cost-effective for high volume

**V1 Operations (all sync):**
| Operation | Trigger | Expected Latency |
|-----------|---------|------------------|
| Questionnaire → Profile extraction | User submits | 3-5 seconds |
| Match generation (per attendee) | Organizer triggers | 1-2 seconds × n attendees |
| Trading Card generation | Profile saved | 1-2 seconds |

**V2 Addition (Async with Inngest):**
- Bulk match generation in background
- Scheduled pre-event match finalization
- Embedding generation on profile update

---

### 4. Notification System: SMS (Twilio) + Email (Resend)

**Decision:** Twilio for SMS, Resend for email. No push notifications in V1.

**SMS (Twilio):**
```typescript
// lib/notifications/sms.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string, scheduledAt?: Date) {
  return client.messages.create({
    to,
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    ...(scheduledAt && {
      scheduleType: 'fixed',
      sendAt: scheduledAt.toISOString(),
    }),
  });
}
```

**Email (Resend + React Email):**
```typescript
// lib/notifications/email.ts
import { Resend } from 'resend';
import { MatchRevealEmail } from '@/emails/MatchReveal';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMatchRevealEmail(
  attendee: { email: string; firstName: string },
  matches: Array<{ name: string; role: string; whyMatch: string[] }>,
  event: { name: string; date: Date }
) {
  return resend.emails.send({
    from: 'M33T <events@bettercontacts.app>', // Use existing domain for V1
    to: attendee.email,
    subject: `Your connections for ${event.name} are ready!`,
    react: MatchRevealEmail({ attendee, matches, event }),
  });
}
```

**V1 Notification Schedule (Simplified):**
| Event | SMS | Email | Timing |
|-------|-----|-------|--------|
| Event invitation | ❌ | ✅ | Immediate |
| RSVP confirmation | ❌ | ✅ | Immediate |
| RSVP reminder | ✅ | ✅ | 24h before deadline |
| Match reveal | ✅ | ✅ | 24-48h before event |
| Event reminder | ✅ | ✅ | Day before event |

**Phone Number Collection:**
- Required field during RSVP (for SMS notifications)
- Validate format: simple regex for V1 (upgrade to libphonenumber-js in V2)
- Store in E.164 format (+1XXXXXXXXXX)

---

## Detailed Design

### Data Models (Prisma Schema Additions) — SIMPLIFIED

```prisma
// ========== EVENT MODEL ==========

model Event {
  id                String   @id @default(cuid())
  userId            String   // Organizer
  user              User     @relation(fields: [userId], references: [id])

  // Basic Info
  name              String
  tagline           String?
  description       String?

  // Timing
  date              DateTime
  startTime         String   // "18:00"
  endTime           String   // "21:00"
  timezone          String   @default("America/Chicago")

  // Location
  venueName         String
  venueAddress      String

  // Settings
  capacity          Int      @default(50)
  rsvpDeadline      DateTime?

  // Questionnaire (inline JSON instead of separate model)
  questions         Json     @default("[]") // Array of Question objects

  // Card Display Settings
  cardSettings      Json     @default("{}") // { showCompany, showRole, showExpertise }

  // Match Settings
  matchesPerAttendee Int     @default(5)
  revealTiming       RevealTiming @default(TWENTY_FOUR_HOURS_BEFORE)

  // Status
  status            EventStatus @default(DRAFT)

  // Relations
  attendees         EventAttendee[]
  matches           Match[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([date])
  @@index([status])
}

enum EventStatus {
  DRAFT
  PUBLISHED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum RevealTiming {
  IMMEDIATE
  TWENTY_FOUR_HOURS_BEFORE
  FORTY_EIGHT_HOURS_BEFORE
}

// ========== ATTENDEE MODEL (SIMPLIFIED) ==========

model EventAttendee {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Link to Better Contacts (optional)
  contactId       String?
  contact         Contact? @relation(fields: [contactId], references: [id])

  // Basic Info
  email           String
  phone           String?  // E.164 format for SMS
  firstName       String
  lastName        String?

  // RSVP Status
  rsvpStatus      RSVPStatus @default(PENDING)
  rsvpRespondedAt DateTime?

  // Questionnaire Response (inline JSON)
  questionnaireResponses Json? // Array of { questionId, value, context?, answeredAt }
  questionnaireCompletedAt DateTime?

  // Extracted Profile (inline JSON instead of separate model)
  profile         Json?    // See ProfileSchema below
  profileExtractedAt DateTime?

  // Matching Fields (extracted and indexed for queries)
  goalsText       String?  // Raw text for future embedding
  idealMatchText  String?  // Raw text for future embedding
  experienceLevel String?  // early | mid | senior | executive | founder
  topicsOfInterest String[] // For rule-based matching
  expertise       String[] // For rule-based matching
  seekingKeywords String[] // Extracted keywords from goals
  offeringKeywords String[] // Extracted keywords from offerings

  // Trading Card (cached display data)
  tradingCard     Json?    // L1-L3 data

  // Matches
  matches         Match[]  @relation("AttendeeMatches")
  matchedWith     Match[]  @relation("MatchedWithAttendee")

  // Notification tracking (simple timestamps)
  inviteSentAt    DateTime?
  rsvpReminderSentAt DateTime?
  matchRevealSentAt DateTime?
  eventReminderSentAt DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([eventId, email])
  @@index([eventId])
  @@index([rsvpStatus])
  @@index([experienceLevel])
}

enum RSVPStatus {
  PENDING
  CONFIRMED
  MAYBE
  DECLINED
}

// ========== MATCH MODEL (SIMPLIFIED) ==========

model Match {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // The attendee receiving this match recommendation
  attendeeId      String
  attendee        EventAttendee @relation("AttendeeMatches", fields: [attendeeId], references: [id], onDelete: Cascade)

  // The person they're matched with
  matchedWithId   String
  matchedWith     EventAttendee @relation("MatchedWithAttendee", fields: [matchedWithId], references: [id], onDelete: Cascade)

  // Position in attendee's match list
  position        Int

  // Scoring (simplified)
  score           Float    // 0-100

  // Explanation
  whyMatch        String[] // Array of reasons (2-3 items)
  conversationStarters String[] // Array of prompts (2-3 items)

  // Status
  status          MatchStatus @default(PENDING)

  // Organizer curation
  isManual        Boolean  @default(false)
  curatorNotes    String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([eventId, attendeeId, matchedWithId])
  @@index([eventId])
  @@index([attendeeId])
  @@index([status])
}

enum MatchStatus {
  PENDING    // AI-generated, awaiting review
  APPROVED   // Organizer approved
  REJECTED   // Organizer rejected
  REVEALED   // Sent to attendee
}
```

### Profile Schema (JSON stored in EventAttendee.profile)

```typescript
// lib/m33t/schemas.ts
import { z } from 'zod';

export const ProfileSchema = z.object({
  // Identity
  name: z.string(),
  photoUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),

  // Professional
  role: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  seniority: z.enum(['early', 'mid', 'senior', 'executive', 'founder']).nullable().optional(),
  expertise: z.array(z.string()).default([]),

  // Goals (for matching)
  seekingSummary: z.string().nullable().optional(), // "Looking for Series A investors and AI talent"
  seekingKeywords: z.array(z.string()).default([]), // ["investors", "AI", "talent"]

  // Offerings (for matching)
  offeringSummary: z.string().nullable().optional(), // "Can help with product strategy and enterprise sales"
  offeringKeywords: z.array(z.string()).default([]), // ["product", "strategy", "sales"]

  // For display
  currentFocus: z.string().nullable().optional(), // One-liner about current priorities
  idealMatch: z.string().nullable().optional(), // Quote for trading card

  // Conversation hooks
  conversationHooks: z.array(z.string()).default([]), // ["Former D1 athlete", "Bourbon collector"]

  // Quality
  completeness: z.number().min(0).max(1).default(0),
});

export type Profile = z.infer<typeof ProfileSchema>;
```

### Question Schema (JSON stored in Event.questions)

```typescript
// lib/m33t/schemas.ts

export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['open_text', 'slider', 'single_select', 'multi_select']), // V1: 4 types only
  category: z.string(), // GOALS, CONNECTIONS, IDENTITY, BACKGROUND, PREFERENCES
  title: z.string(),
  subtitle: z.string().optional(),
  required: z.boolean().default(false),
  locked: z.boolean().default(false), // Cannot be removed (Goals & Connections)
  order: z.number(),

  // Type-specific config
  config: z.object({
    placeholder: z.string().optional(),
    hint: z.string().optional(),
    leftLabel: z.string().optional(),  // For slider
    rightLabel: z.string().optional(), // For slider
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().optional(),
    })).optional(),
    maxSelections: z.number().optional(), // For multi_select
  }).optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

// Default questions (always included)
export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'goals',
    type: 'open_text',
    category: 'GOALS',
    title: "What are your biggest current goals?",
    subtitle: "What are you actively working toward right now?",
    required: true,
    locked: true,
    order: 0,
    config: {
      placeholder: "e.g., Raising a seed round, hiring a technical co-founder...",
      hint: "The more specific you are, the better we can match you.",
    },
  },
  {
    id: 'ideal_connections',
    type: 'open_text',
    category: 'CONNECTIONS',
    title: "Who would be your ideal connections at this event?",
    subtitle: "Describe the type of people you'd most like to meet.",
    required: true,
    locked: true,
    order: 1,
    config: {
      placeholder: "e.g., Early-stage VCs focused on AI, operators who've scaled...",
      hint: "Think about who could help with your goals, or who you could help.",
    },
  },
];
```

### RSVP Token Schema

```typescript
// lib/m33t/tokens.ts
import jwt from 'jsonwebtoken';

interface RSVPTokenPayload {
  eventId: string;
  email: string;
  attendeeId: string;
  type: 'rsvp';
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

export function generateRSVPToken(eventId: string, email: string, attendeeId: string, eventDate: Date): string {
  const payload: RSVPTokenPayload = {
    eventId,
    email,
    attendeeId,
    type: 'rsvp',
    exp: Math.floor(eventDate.getTime() / 1000) + 86400, // Event date + 24h
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, process.env.RSVP_TOKEN_SECRET!);
}

export function verifyRSVPToken(token: string): RSVPTokenPayload | null {
  try {
    return jwt.verify(token, process.env.RSVP_TOKEN_SECRET!) as RSVPTokenPayload;
  } catch {
    return null;
  }
}
```

---

## Error Handling

### Failure Modes and Recovery

| Failure Mode | User Impact | Detection | Recovery Behavior |
|--------------|-------------|-----------|-------------------|
| **LLM extraction fails** | Can't complete questionnaire | API error response | Show error toast, allow retry (3 max), then offer manual entry form |
| **LLM extraction timeout** | Spinner hangs | 30s timeout | Abort request, show "Taking too long" message, suggest retry |
| **Match generation produces zero results** | Empty match list | Zero matches returned | Show "We're working on finding matches" placeholder, notify organizer |
| **Match generation partial failure** | Some attendees have no matches | Some null results in batch | Complete successful ones, retry failed ones once, log failures |
| **SMS delivery fails** | No notification received | Twilio error callback | Log error, mark attendee for email-only, alert organizer |
| **Email delivery fails** | No notification received | Resend error response | Retry once with exponential backoff, log failure |
| **SSE connection drops** | Stale dashboard data | No heartbeat for 60s | Auto-reconnect (EventSource default), show "Reconnecting..." |
| **RSVP token expired** | Can't access RSVP page | JWT verification fails | Show "Link expired" message with organizer contact |
| **RSVP token invalid** | Can't access RSVP page | JWT verification fails | Show "Invalid link" message, suggest requesting new invite |
| **Database connection fails** | API errors | Prisma connection error | Return 503, show "Service temporarily unavailable" |

### Error Response Format

```typescript
// Consistent error response structure
interface APIError {
  error: string;        // Human-readable message
  code: string;         // Machine-readable code (e.g., "EXTRACTION_FAILED")
  retryable: boolean;   // Whether client should retry
  details?: unknown;    // Additional context (dev mode only)
}

// Example responses
// 400: { error: "Phone number is invalid", code: "INVALID_PHONE", retryable: false }
// 408: { error: "Request timed out", code: "TIMEOUT", retryable: true }
// 500: { error: "Failed to generate matches", code: "MATCH_GENERATION_FAILED", retryable: true }
// 503: { error: "Service temporarily unavailable", code: "SERVICE_UNAVAILABLE", retryable: true }
```

---

## API Routes Structure

```
app/api/
├── events/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [eventId]/
│       ├── route.ts                # GET, PUT, DELETE
│       ├── publish/route.ts        # POST (publish event)
│       ├── stream/route.ts         # GET (SSE for real-time updates)
│       ├── attendees/
│       │   ├── route.ts            # GET (list), POST (add from contacts)
│       │   └── [attendeeId]/
│       │       ├── route.ts        # GET, PUT, DELETE
│       │       └── matches/route.ts # GET attendee's matches
│       ├── questions/route.ts      # GET, PUT questionnaire config
│       ├── matches/
│       │   ├── route.ts            # GET all matches
│       │   ├── generate/route.ts   # POST trigger generation
│       │   └── [matchId]/route.ts  # PUT (approve/reject), DELETE
│       └── notify/route.ts         # POST trigger notification batch
│
└── rsvp/
    └── [token]/
        ├── route.ts                # GET event info for RSVP
        ├── respond/route.ts        # POST RSVP response
        └── questionnaire/
            ├── route.ts            # GET questions
            ├── save/route.ts       # POST partial save (auto-save)
            └── complete/route.ts   # POST mark complete, trigger extraction
```

### Page Routes Structure

```
app/
├── (dashboard)/
│   └── events/
│       ├── page.tsx                # Event list
│       ├── new/page.tsx            # Event creation (simplified wizard)
│       └── [eventId]/
│           ├── page.tsx            # Event overview + quick stats
│           ├── guests/page.tsx     # Guest list curation
│           ├── questions/page.tsx  # Questionnaire builder
│           ├── rsvps/page.tsx      # RSVP dashboard with SSE
│           └── matches/page.tsx    # Curate Connections dashboard
│
└── rsvp/
    └── [token]/
        ├── page.tsx                # RSVP landing page
        ├── questionnaire/page.tsx  # Multi-modal questionnaire
        └── complete/page.tsx       # Completion confirmation + card preview
```

---

## User Experience

### Organizer Flow (Simplified for V1)
1. **Create Event** → Single form (name, date, venue, capacity)
2. **Configure Questions** → Start with defaults, add/edit as needed
3. **Add Guests** → Import from Better Contacts or enter manually
4. **Publish** → Guests receive invitation emails
5. **Monitor RSVPs** → Dashboard with real-time updates (SSE)
6. **Generate Matches** → Click button, wait ~30s for 50 attendees
7. **Review Matches** → Approve/reject/reorder per attendee
8. **Send Match Reveal** → Trigger SMS + email notifications

### Attendee Flow
1. **Receive Invite** → Email with personalized landing page
2. **RSVP** → Confirm attendance, provide phone number
3. **Complete Questionnaire** → 4 question types, 2-5 min
4. **Preview Trading Card** → See how they'll appear to others (L2)
5. **Match Reveal** → SMS + email 24-48h before event
6. **At Event** → Reference matches on phone (simple list view)

---

## Testing Strategy

### Unit Tests
| Component | Tests | Purpose |
|-----------|-------|---------|
| Matching Algorithm | `calculateMatchScore()` with various profile combinations | Verify scoring logic produces expected rankings |
| Profile Extraction | Mock LLM responses → profile fields | Verify extraction maps correctly to schema |
| Token Generation | Generate → verify roundtrip | Ensure tokens encode/decode correctly |
| Phone Validation | Various formats → E.164 | Catch invalid phone numbers before Twilio |

### Integration Tests
| Flow | Tests | Purpose |
|------|-------|---------|
| Event Creation | Create → fetch → verify fields | Ensure CRUD works end-to-end |
| RSVP Flow | Token → respond → verify status | Ensure attendee can RSVP successfully |
| Questionnaire Save | Partial save → complete → verify | Ensure responses persist correctly |
| Match Generation | Profiles → generate → verify scores | Ensure matching produces valid results |

### E2E Tests (Playwright)
| Scenario | Coverage | Purpose |
|----------|----------|---------|
| Organizer creates event | Form submission, redirect, data persistence | Happy path for event creation |
| Attendee completes RSVP | Token link, form, confirmation | Happy path for attendee flow |
| Organizer reviews matches | List view, approve/reject, status changes | Happy path for match curation |

### Edge Case Tests
| Scenario | Expected Behavior |
|----------|-------------------|
| Empty questionnaire responses | Profile has null fields, low completeness score |
| Only 2 attendees | Each gets 1 match (each other) |
| All attendees identical profiles | Random ordering (tie-breaker on createdAt) |
| SMS delivery failure | Logged, email-only fallback, organizer notified |
| LLM returns malformed JSON | Retry once, then fail with error message |

---

## Performance Considerations

### V1 Targets (Synchronous Processing)

| Operation | Target Latency | Max Attendees |
|-----------|---------------|---------------|
| Profile extraction | <5s | N/A (per-user) |
| Match generation (full event) | <60s | 50 |
| Trading card generation | <2s | N/A (per-user) |
| SSE update delivery | <500ms | N/A |

### V1 Limitations (Acceptable for MVP)

- Match generation blocks UI (show progress indicator)
- No concurrent match generation (one event at a time)
- No caching of embeddings (not using embeddings in V1)
- SSE uses polling internally (5s interval)

### V2 Scaling (When Needed)

- Add Inngest for background match generation
- Add pgvector for embedding-based matching
- Add Redis for SSE pub/sub across instances
- Increase limits: 200 attendees, <2min match generation

---

## Security Considerations

### Authentication & Authorization
- Event management requires authenticated organizer (existing Supabase auth)
- RSVP pages use signed JWT tokens (no account required)
- Match data only visible to organizer + respective attendees

### Data Privacy
- Phone numbers stored as-is in V1 (add encryption in V2)
- Attendee data scoped to event, not globally searchable
- No PII in logs (use attendee IDs only)

### RSVP Token Security
- Signed JWT with event ID + attendee ID
- Expires: event date + 24 hours
- Secret: `RSVP_TOKEN_SECRET` env var (32+ chars)

### Rate Limiting
- Notification API: 1 request per event per hour
- RSVP API: 10 requests per token per hour
- Match generation: 1 request per event per 5 minutes

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
- [ ] Database schema migration
- [ ] Event CRUD API routes
- [ ] Basic event creation UI (single form)
- [ ] RSVP token generation and verification

### Phase 2: Attendee Experience
- [ ] RSVP landing page
- [ ] Questionnaire UI (4 question types)
- [ ] Auto-save questionnaire responses
- [ ] Profile extraction via GPT-4o-mini
- [ ] Trading Card component (L1-L2)

### Phase 3: Matching & Curation
- [ ] Rule-based matching algorithm
- [ ] Match generation API
- [ ] Curate Connections dashboard
- [ ] Approve/reject/reorder matches

### Phase 4: Notifications
- [ ] Twilio SMS integration
- [ ] Resend email integration
- [ ] Notification triggering API
- [ ] Email templates (invitation, match reveal, reminder)

### Phase 5: Polish
- [ ] SSE for real-time RSVP updates
- [ ] Guest import from Better Contacts
- [ ] Question builder UI
- [ ] Error handling and edge cases

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| pgvector vs. external vector DB | **Deferred** — V1 uses rule-based only |
| Embedding update strategy | **Deferred** — V1 doesn't use embeddings |
| Match freshness | Regenerate on organizer request only (V1) |
| International SMS | V1 scope to US/Canada only |
| Email domain | Use `@bettercontacts.app` subdomain for V1 |

---

## Success Criteria

### V1 Launch Criteria
- [ ] Organizer can create event and add 10+ guests
- [ ] Attendees can RSVP and complete questionnaire
- [ ] Matches generate with <60s latency for 50 attendees
- [ ] Match reveal notifications delivered via SMS + email
- [ ] No critical bugs in happy path flows

### V1 Success Metrics
- Event creation completion rate >80%
- Questionnaire completion rate >70%
- Match reveal open rate >50%
- Organizer NPS >40

---

## References

### Documentation
- [Twilio SMS Scheduling](https://www.twilio.com/docs/messaging/features/message-scheduling)
- [Resend + Next.js](https://resend.com/docs/send-with-nextjs)
- [Next.js SSE Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)

### Internal Documentation
- `docs/m33t-implementation-handoff-package/M33T_HANDOFF_PACKAGE_v3.md`
- `docs/m33t-implementation-handoff-package/ARCHITECTURE_OVERVIEW.md`
- `docs/m33t-implementation-handoff-package/TRADING_CARD_DISPLAY.md`
