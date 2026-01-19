# Task Breakdown: M33T Intelligent Event Networking Platform

**Generated:** 2026-01-12
**Source:** specs/feat-m33t-event-networking-platform.md
**Last Decompose:** 2026-01-12
**Mode:** Full (first-time decompose)

---

## Overview

This task breakdown implements M33T, an intelligent event networking platform that layers on top of Better Contacts. The implementation is divided into 5 phases following the spec's implementation plan.

**Total Tasks:** 25
**Estimated Scope:** V1 MVP with rule-based matching, SMS/email notifications, and L1-L3 trading cards

---

## Phase 1: Core Infrastructure (Foundation)

### Task 1.1: Database Schema Migration
**Description:** Add M33T models to Prisma schema and run migration
**Size:** Medium
**Priority:** Critical
**Dependencies:** None
**Can run parallel with:** Task 1.2 (can prepare validation schemas while migration runs)

**Technical Requirements:**

Add the following to `prisma/schema.prisma`:

```prisma
// ========== M33T ENUMS ==========

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

enum RSVPStatus {
  PENDING
  CONFIRMED
  MAYBE
  DECLINED
}

enum MatchStatus {
  PENDING    // AI-generated, awaiting review
  APPROVED   // Organizer approved
  REJECTED   // Organizer rejected
  REVEALED   // Sent to attendee
}

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

// ========== ATTENDEE MODEL ==========

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
  profile         Json?    // See ProfileSchema
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

// ========== MATCH MODEL ==========

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

  // Scoring
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
```

**Implementation Steps:**
1. Add models to `prisma/schema.prisma`
2. Add `events EventAttendee[]` relation to Contact model
3. Add `events Event[]` relation to User model
4. Run `npm run db:backup` (CRITICAL - always backup first)
5. Run `npx prisma migrate dev --name add-m33t-models`
6. Verify migration with `npx prisma studio`

**Acceptance Criteria:**
- [ ] All three models (Event, EventAttendee, Match) created in database
- [ ] Enums (EventStatus, RevealTiming, RSVPStatus, MatchStatus) available
- [ ] Foreign key relationships working (cascade deletes)
- [ ] Indexes created for query performance
- [ ] Contact model has `events` relation
- [ ] User model has `events` relation
- [ ] Migration runs without data loss

---

### Task 1.2: Create Zod Validation Schemas
**Description:** Create Zod schemas for M33T data validation
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1 (need types from Prisma)
**Can run parallel with:** None

**Technical Requirements:**

Create `src/lib/m33t/schemas.ts`:

```typescript
import { z } from 'zod';

// ========== PROFILE SCHEMA ==========
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
  seekingSummary: z.string().nullable().optional(),
  seekingKeywords: z.array(z.string()).default([]),

  // Offerings (for matching)
  offeringSummary: z.string().nullable().optional(),
  offeringKeywords: z.array(z.string()).default([]),

  // For display
  currentFocus: z.string().nullable().optional(),
  idealMatch: z.string().nullable().optional(),

  // Conversation hooks
  conversationHooks: z.array(z.string()).default([]),

  // Quality
  completeness: z.number().min(0).max(1).default(0),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ========== QUESTION SCHEMA ==========
export const QuestionConfigSchema = z.object({
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
});

export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['open_text', 'slider', 'single_select', 'multi_select']),
  category: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  required: z.boolean().default(false),
  locked: z.boolean().default(false),
  order: z.number(),
  config: QuestionConfigSchema.optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

// ========== DEFAULT QUESTIONS ==========
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

// ========== EVENT SCHEMAS ==========
export const EventCreateSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  timezone: z.string().default("America/Chicago"),
  venueName: z.string().min(1, "Venue name is required"),
  venueAddress: z.string().min(1, "Venue address is required"),
  capacity: z.number().int().min(2).max(200).default(50),
  rsvpDeadline: z.coerce.date().optional(),
  matchesPerAttendee: z.number().int().min(1).max(20).default(5),
  revealTiming: z.enum(['IMMEDIATE', 'TWENTY_FOUR_HOURS_BEFORE', 'FORTY_EIGHT_HOURS_BEFORE']).default('TWENTY_FOUR_HOURS_BEFORE'),
});

export const EventUpdateSchema = EventCreateSchema.partial();

export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;

// ========== ATTENDEE SCHEMAS ==========
export const AttendeeCreateSchema = z.object({
  email: z.string().email("Valid email is required"),
  phone: z.string().regex(/^\+1\d{10}$/, "Phone must be E.164 format (+1XXXXXXXXXX)").optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  contactId: z.string().optional(), // Link to Better Contacts
});

export const RSVPResponseSchema = z.object({
  status: z.enum(['CONFIRMED', 'MAYBE', 'DECLINED']),
  phone: z.string().regex(/^\+1\d{10}$/, "Phone must be E.164 format").optional(),
});

export const QuestionnaireResponseSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  context: z.string().optional(),
  answeredAt: z.coerce.date().default(() => new Date()),
});

export type AttendeeCreate = z.infer<typeof AttendeeCreateSchema>;
export type RSVPResponse = z.infer<typeof RSVPResponseSchema>;
export type QuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;

// ========== MATCH SCHEMAS ==========
export const MatchUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  position: z.number().int().min(1).optional(),
  curatorNotes: z.string().optional(),
});

export type MatchUpdate = z.infer<typeof MatchUpdateSchema>;

// ========== ERROR SCHEMA ==========
export const APIErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  retryable: z.boolean(),
  details: z.unknown().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;
```

**Acceptance Criteria:**
- [ ] All schemas export correctly
- [ ] ProfileSchema validates nested objects
- [ ] QuestionSchema supports all 4 question types
- [ ] DEFAULT_QUESTIONS array has goals and ideal_connections
- [ ] Phone validation enforces E.164 format
- [ ] Time validation enforces HH:MM format
- [ ] APIError schema matches spec error format

---

### Task 1.3: Event CRUD API Routes
**Description:** Implement Event API routes with authentication
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** Task 1.4

**Technical Requirements:**

Create `src/app/api/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { EventCreateSchema, DEFAULT_QUESTIONS } from '@/lib/m33t/schemas';

// GET /api/events - List user's events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    const events = await prisma.event.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { attendees: true, matches: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = EventCreateSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        ...validatedData,
        userId: user.id,
        questions: DEFAULT_QUESTIONS, // Initialize with default questions
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', code: 'CREATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
```

Create `src/app/api/events/[eventId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { EventUpdateSchema } from '@/lib/m33t/schemas';

// GET /api/events/[eventId]
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    const event = await prisma.event.findFirst({
      where: {
        id: params.eventId,
        userId: user.id
      },
      include: {
        attendees: {
          include: {
            contact: { select: { id: true, name: true, primaryEmail: true } }
          }
        },
        matches: true,
        _count: {
          select: {
            attendees: true,
            matches: { where: { status: 'APPROVED' } }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Verify ownership
    const existing = await prisma.event.findFirst({
      where: { id: params.eventId, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = EventUpdateSchema.parse(body);

    const event = await prisma.event.update({
      where: { id: params.eventId },
      data: validatedData,
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', code: 'UPDATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Verify ownership
    const existing = await prisma.event.findFirst({
      where: { id: params.eventId, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    // Cascade delete handles attendees and matches
    await prisma.event.delete({
      where: { id: params.eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', code: 'DELETE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] GET /api/events returns user's events with counts
- [ ] POST /api/events creates event with default questions
- [ ] GET /api/events/[id] returns event with attendees
- [ ] PUT /api/events/[id] updates event fields
- [ ] DELETE /api/events/[id] deletes event with cascades
- [ ] All routes check authentication
- [ ] All routes verify event ownership
- [ ] Validation errors return 400 with code
- [ ] Not found returns 404
- [ ] Server errors return 500 with retryable: true

---

### Task 1.4: RSVP Token Generation and Verification
**Description:** Implement JWT token system for passwordless RSVP access
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.3

**Technical Requirements:**

Install dependency:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

Create `src/lib/m33t/tokens.ts`:

```typescript
import jwt from 'jsonwebtoken';

const RSVP_TOKEN_SECRET = process.env.RSVP_TOKEN_SECRET;

if (!RSVP_TOKEN_SECRET) {
  throw new Error('RSVP_TOKEN_SECRET environment variable is required');
}

export interface RSVPTokenPayload {
  eventId: string;
  email: string;
  attendeeId: string;
  type: 'rsvp';
  exp: number;
  iat: number;
}

/**
 * Generate a signed JWT token for RSVP access
 * Token expires 24 hours after the event date
 */
export function generateRSVPToken(
  eventId: string,
  email: string,
  attendeeId: string,
  eventDate: Date
): string {
  const payload: Omit<RSVPTokenPayload, 'exp' | 'iat'> = {
    eventId,
    email,
    attendeeId,
    type: 'rsvp',
  };

  // Expire 24 hours after event date
  const expiresAt = new Date(eventDate);
  expiresAt.setHours(expiresAt.getHours() + 24);

  return jwt.sign(payload, RSVP_TOKEN_SECRET!, {
    expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}

/**
 * Verify and decode an RSVP token
 * Returns null if token is invalid or expired
 */
export function verifyRSVPToken(token: string): RSVPTokenPayload | null {
  try {
    const decoded = jwt.verify(token, RSVP_TOKEN_SECRET!) as RSVPTokenPayload;

    // Verify it's an RSVP token
    if (decoded.type !== 'rsvp') {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Check if a token is expired (for showing different error messages)
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, RSVP_TOKEN_SECRET!);
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    return false; // Invalid token, not expired
  }
}
```

Add to `.env`:
```
RSVP_TOKEN_SECRET=your-32-character-or-longer-secret-here
```

**Acceptance Criteria:**
- [ ] generateRSVPToken creates valid JWT with all payload fields
- [ ] Token expiration is event date + 24 hours
- [ ] verifyRSVPToken returns payload for valid tokens
- [ ] verifyRSVPToken returns null for invalid tokens
- [ ] verifyRSVPToken returns null for expired tokens
- [ ] isTokenExpired distinguishes expired vs invalid tokens
- [ ] Environment variable validation on startup
- [ ] Tests: roundtrip encode/decode works
- [ ] Tests: expired tokens return null

---

### Task 1.5: Event Creation UI (Single Form)
**Description:** Build the event creation form for organizers
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.3 (needs API)
**Can run parallel with:** None

**Technical Requirements:**

Create `src/app/(dashboard)/events/new/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventCreateSchema, type EventCreate } from '@/lib/m33t/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

export default function NewEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventCreate>({
    resolver: zodResolver(EventCreateSchema),
    defaultValues: {
      timezone: 'America/Chicago',
      capacity: 50,
      matchesPerAttendee: 5,
      revealTiming: 'TWENTY_FOUR_HOURS_BEFORE',
    },
  });

  const onSubmit = async (data: EventCreate) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create event');
      }

      const event = await response.json();
      toast.success('Event created successfully!');
      router.push(`/events/${event.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="bg-bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Event</CardTitle>
          <CardDescription>Set up your networking event in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Austin Founder Mixer"
                {...form.register('name')}
                className="bg-bg-tertiary"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-error">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="e.g., Connecting founders with investors"
                {...form.register('tagline')}
                className="bg-bg-tertiary"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register('date')}
                  className="bg-bg-tertiary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Start *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                  className="bg-bg-tertiary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register('endTime')}
                  className="bg-bg-tertiary"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.watch('timezone')}
                onValueChange={(value) => form.setValue('timezone', value)}
              >
                <SelectTrigger className="bg-bg-tertiary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venueName">
                <MapPin className="inline w-4 h-4 mr-1" />
                Venue Name *
              </Label>
              <Input
                id="venueName"
                placeholder="e.g., The Capital Factory"
                {...form.register('venueName')}
                className="bg-bg-tertiary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueAddress">Venue Address *</Label>
              <Input
                id="venueAddress"
                placeholder="e.g., 701 Brazos St, Austin, TX 78701"
                {...form.register('venueAddress')}
                className="bg-bg-tertiary"
              />
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity">
                <Users className="inline w-4 h-4 mr-1" />
                Capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                min={2}
                max={200}
                {...form.register('capacity', { valueAsNumber: true })}
                className="bg-bg-tertiary w-32"
              />
              <p className="text-sm text-text-secondary">Maximum 200 attendees for V1</p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Form renders with all required fields
- [ ] Validation shows inline errors
- [ ] Timezone dropdown works
- [ ] Date/time inputs work correctly
- [ ] Submit creates event via API
- [ ] Success redirects to event page
- [ ] Error shows toast notification
- [ ] Loading state shows spinner
- [ ] Form uses Better Contacts design system (dark theme, gold accents)

---

## Phase 2: Attendee Experience

### Task 2.1: RSVP Landing Page
**Description:** Build the public RSVP page accessed via token link
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.4 (tokens), Task 1.1 (schema)
**Can run parallel with:** Task 2.2

**Technical Requirements:**

Create `src/app/rsvp/[token]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { RSVPForm } from '@/components/m33t/RSVPForm';
import { TokenExpiredMessage } from '@/components/m33t/TokenExpiredMessage';
import { TokenInvalidMessage } from '@/components/m33t/TokenInvalidMessage';
import { format } from 'date-fns';

interface RSVPPageProps {
  params: { token: string };
}

export default async function RSVPPage({ params }: RSVPPageProps) {
  const { token } = params;

  // Check if token is expired (show different message)
  if (isTokenExpired(token)) {
    return <TokenExpiredMessage />;
  }

  // Verify token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return <TokenInvalidMessage />;
  }

  // Fetch event and attendee data
  const [event, attendee] = await Promise.all([
    prisma.event.findUnique({
      where: { id: payload.eventId },
      select: {
        id: true,
        name: true,
        tagline: true,
        date: true,
        startTime: true,
        endTime: true,
        timezone: true,
        venueName: true,
        venueAddress: true,
        status: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        rsvpStatus: true,
        rsvpRespondedAt: true,
        questionnaireCompletedAt: true,
      },
    }),
  ]);

  if (!event || !attendee) {
    return notFound();
  }

  // Check if event is still accepting RSVPs
  if (event.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Event Cancelled</h1>
          <p className="text-text-secondary">
            Sorry, {event.name} has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Event Header */}
      <div className="bg-bg-secondary border-b border-border py-8">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm text-gold-primary mb-2">You're invited to</p>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{event.name}</h1>
          {event.tagline && (
            <p className="text-lg text-text-secondary mb-4">{event.tagline}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <span>📅 {format(event.date, 'EEEE, MMMM d, yyyy')}</span>
            <span>🕐 {event.startTime} - {event.endTime}</span>
            <span>📍 {event.venueName}</span>
          </div>
        </div>
      </div>

      {/* RSVP Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <RSVPForm
          token={token}
          event={event}
          attendee={attendee}
        />
      </div>
    </div>
  );
}
```

Create `src/components/m33t/RSVPForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, X, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RSVPFormProps {
  token: string;
  event: {
    id: string;
    name: string;
  };
  attendee: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    rsvpStatus: string;
    rsvpRespondedAt: Date | null;
    questionnaireCompletedAt: Date | null;
  };
}

export function RSVPForm({ token, event, attendee }: RSVPFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(attendee.rsvpStatus);
  const [phone, setPhone] = useState(attendee.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already responded - show status
  if (attendee.rsvpRespondedAt && attendee.rsvpStatus !== 'PENDING') {
    return (
      <Card className="bg-bg-secondary border-border">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            {attendee.rsvpStatus === 'CONFIRMED' ? (
              <Check className="w-12 h-12 text-success mx-auto" />
            ) : attendee.rsvpStatus === 'DECLINED' ? (
              <X className="w-12 h-12 text-error mx-auto" />
            ) : (
              <HelpCircle className="w-12 h-12 text-warning mx-auto" />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {attendee.rsvpStatus === 'CONFIRMED' && "You're attending!"}
            {attendee.rsvpStatus === 'DECLINED' && "You declined this event"}
            {attendee.rsvpStatus === 'MAYBE' && "You're a maybe"}
          </h2>
          {attendee.rsvpStatus === 'CONFIRMED' && !attendee.questionnaireCompletedAt && (
            <Button
              onClick={() => router.push(`/rsvp/${token}/questionnaire`)}
              className="mt-4 bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              Complete Your Profile
            </Button>
          )}
          {attendee.rsvpStatus === 'CONFIRMED' && attendee.questionnaireCompletedAt && (
            <p className="text-text-secondary mt-2">
              Profile complete! You'll receive your matches before the event.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'CONFIRMED' && !phone) {
      toast.error('Phone number is required to receive match notifications');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/rsvp/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, phone: phone || undefined }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit RSVP');
      }

      toast.success(
        status === 'CONFIRMED'
          ? "You're in! Now let's set up your profile."
          : 'RSVP submitted successfully'
      );

      if (status === 'CONFIRMED') {
        router.push(`/rsvp/${token}/questionnaire`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-bg-secondary border-border">
      <CardHeader>
        <CardTitle>RSVP for {event.name}</CardTitle>
        <CardDescription>
          Hi {attendee.firstName}! Will you be joining us?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup value={status} onValueChange={setStatus}>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="CONFIRMED" id="confirmed" />
              <Label htmlFor="confirmed" className="flex-1 cursor-pointer">
                <span className="text-success">Yes, I'll be there!</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="MAYBE" id="maybe" />
              <Label htmlFor="maybe" className="flex-1 cursor-pointer">
                <span className="text-warning">Maybe</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer">
              <RadioGroupItem value="DECLINED" id="declined" />
              <Label htmlFor="declined" className="flex-1 cursor-pointer">
                <span className="text-error">Can't make it</span>
              </Label>
            </div>
          </RadioGroup>

          {status === 'CONFIRMED' && (
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number (for match notifications) *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (512) 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-bg-tertiary"
              />
              <p className="text-xs text-text-secondary">
                We'll text you your curated matches before the event
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Submit RSVP'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Page loads with valid token
- [ ] Expired tokens show appropriate message
- [ ] Invalid tokens show appropriate message
- [ ] Event details display correctly
- [ ] RSVP radio buttons work
- [ ] Phone field shows only for CONFIRMED
- [ ] Phone validation works
- [ ] Submit updates attendee status
- [ ] CONFIRMED redirects to questionnaire
- [ ] Already-responded shows status summary
- [ ] Design matches Better Contacts theme

---

### Task 2.2: Questionnaire UI (4 Question Types)
**Description:** Build the multi-question intake form with auto-save
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.3

**Technical Requirements:**

Create `src/app/rsvp/[token]/questionnaire/page.tsx` and question type components:

1. `OpenTextQuestion` - Textarea with character count
2. `SliderQuestion` - Range slider with labels
3. `SingleSelectQuestion` - Radio group
4. `MultiSelectQuestion` - Checkbox group with max selections

Each question component should:
- Accept question config from schema
- Emit onChange for auto-save
- Show validation state
- Match dark theme styling

Auto-save implementation:
```typescript
// Use debounced save (500ms delay)
const debouncedSave = useDebouncedCallback(async (responses) => {
  await fetch(`/api/rsvp/${token}/questionnaire/save`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });
}, 500);
```

**Acceptance Criteria:**
- [ ] All 4 question types render correctly
- [ ] Auto-save triggers on change (debounced 500ms)
- [ ] Progress indicator shows completion
- [ ] Required questions block submission
- [ ] Submit triggers profile extraction
- [ ] Loading state during extraction
- [ ] Success redirects to complete page

---

### Task 2.3: Profile Extraction via GPT-4o-mini
**Description:** Implement LLM extraction from questionnaire responses
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.2, Task 1.2 (schemas)
**Can run parallel with:** Task 2.4

**Technical Requirements:**

Create `src/lib/m33t/extraction.ts`:

```typescript
import { openai } from '@/lib/openai';
import { ProfileSchema, type Profile } from './schemas';

const EXTRACTION_PROMPT = `You are an expert at extracting structured professional profile data from questionnaire responses.

Given the following questionnaire responses from an event attendee, extract a structured profile.

IMPORTANT:
- Extract keywords for "seekingKeywords" from their goals (what they're looking for)
- Extract keywords for "offeringKeywords" from what they can help others with
- Infer their seniority from context clues (years of experience, role titles)
- Generate 2-3 conversation hooks from interesting personal/professional details
- Calculate completeness as a 0-1 score based on how much useful info was extracted

Questionnaire Responses:
{{RESPONSES}}

Return a JSON object matching this exact schema:
{
  "name": "string",
  "role": "string | null",
  "company": "string | null",
  "seniority": "early | mid | senior | executive | founder | null",
  "expertise": ["string"],
  "seekingSummary": "string | null",
  "seekingKeywords": ["string"],
  "offeringSummary": "string | null",
  "offeringKeywords": ["string"],
  "currentFocus": "string | null",
  "idealMatch": "string | null",
  "conversationHooks": ["string"],
  "completeness": 0.0-1.0
}`;

export async function extractProfile(
  attendeeName: string,
  responses: Array<{ questionId: string; questionTitle: string; value: string | number | string[] }>
): Promise<Profile> {
  // Format responses for prompt
  const formattedResponses = responses
    .map(r => `Q: ${r.questionTitle}\nA: ${Array.isArray(r.value) ? r.value.join(', ') : r.value}`)
    .join('\n\n');

  const prompt = EXTRACTION_PROMPT.replace('{{RESPONSES}}', formattedResponses);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Extract profile for attendee: ${attendeeName}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Low temperature for consistent extraction
  });

  const rawProfile = JSON.parse(completion.choices[0].message.content || '{}');

  // Validate with Zod schema
  const profile = ProfileSchema.parse({
    name: attendeeName,
    ...rawProfile,
  });

  return profile;
}
```

Create API route `src/app/api/rsvp/[token]/questionnaire/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { extractProfile } from '@/lib/m33t/extraction';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const payload = verifyRSVPToken(params.token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN', retryable: false },
        { status: 401 }
      );
    }

    // Get attendee with responses
    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      include: {
        event: { select: { questions: true } }
      }
    });

    if (!attendee || !attendee.questionnaireResponses) {
      return NextResponse.json(
        { error: 'Questionnaire not started', code: 'NO_RESPONSES', retryable: false },
        { status: 400 }
      );
    }

    // Parse questions and responses
    const questions = attendee.event.questions as Array<{ id: string; title: string }>;
    const responses = attendee.questionnaireResponses as Array<{ questionId: string; value: any }>;

    // Format for extraction
    const formattedResponses = responses.map(r => {
      const question = questions.find(q => q.id === r.questionId);
      return {
        questionId: r.questionId,
        questionTitle: question?.title || r.questionId,
        value: r.value,
      };
    });

    // Extract profile via LLM (with 30s timeout)
    const profile = await Promise.race([
      extractProfile(
        `${attendee.firstName} ${attendee.lastName || ''}`.trim(),
        formattedResponses
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timeout')), 30000)
      ),
    ]);

    // Update attendee with profile
    await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        profile,
        profileExtractedAt: new Date(),
        questionnaireCompletedAt: new Date(),
        // Index fields for matching
        goalsText: responses.find(r => r.questionId === 'goals')?.value as string,
        idealMatchText: responses.find(r => r.questionId === 'ideal_connections')?.value as string,
        experienceLevel: profile.seniority,
        expertise: profile.expertise,
        seekingKeywords: profile.seekingKeywords,
        offeringKeywords: profile.offeringKeywords,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Profile extraction failed:', error);

    if (error instanceof Error && error.message === 'Extraction timeout') {
      return NextResponse.json(
        { error: 'Extraction taking too long', code: 'TIMEOUT', retryable: true },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract profile', code: 'EXTRACTION_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] extractProfile generates valid Profile schema
- [ ] Keywords extracted from goals and offerings
- [ ] Seniority inferred from context
- [ ] Conversation hooks generated
- [ ] Completeness score calculated
- [ ] 30-second timeout implemented
- [ ] Profile saved to database
- [ ] Index fields populated for matching
- [ ] Retry logic for failures (3 max)
- [ ] Manual entry fallback if extraction fails

---

### Task 2.4: Trading Card Component (L1-L2)
**Description:** Build the visual trading card for attendee display
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.3 (needs profile data)
**Can run parallel with:** Task 2.5

**Technical Requirements:**

Create `src/components/m33t/TradingCard.tsx`:

Implement L1-L3 progressive disclosure:
- **L1 (Glance):** Name, photo, role/company, 1-line tagline
- **L2 (Scan):** L1 + expertise tags, seeking/offering summaries
- **L3 (Engage):** L2 + conversation starters, "why this match" reasoning

Design:
- Dark card with subtle border
- Gold accent on name/key info
- Glassmorphism effect for depth
- Smooth expand/collapse animation (Framer Motion)
- Mobile-responsive (full width on mobile)

**Acceptance Criteria:**
- [ ] L1 renders name, photo, role, company
- [ ] L2 adds expertise tags, summaries
- [ ] L3 adds conversation starters
- [ ] Expand/collapse animation smooth
- [ ] Mobile responsive
- [ ] Matches Better Contacts design system

---

### Task 2.5: RSVP API Routes
**Description:** Implement the RSVP response and questionnaire save endpoints
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4
**Can run parallel with:** Task 2.4

Create:
- `POST /api/rsvp/[token]/respond` - Submit RSVP status
- `GET /api/rsvp/[token]/questionnaire` - Get questions for event
- `POST /api/rsvp/[token]/questionnaire/save` - Auto-save responses

**Acceptance Criteria:**
- [ ] Respond endpoint updates attendee status
- [ ] Phone number validated and stored
- [ ] Questionnaire endpoint returns event questions
- [ ] Save endpoint persists partial responses
- [ ] All endpoints validate token

---

## Phase 3: Matching & Curation

### Task 3.1: Rule-Based Matching Algorithm
**Description:** Implement the V1 matching algorithm with 4 scoring components
**Size:** Large
**Priority:** Critical
**Dependencies:** Task 2.3 (needs profiles)
**Can run parallel with:** None

**Technical Requirements:**

Create `src/lib/m33t/matching.ts`:

```typescript
/**
 * V1 Matching Algorithm - Rule-Based Scoring
 *
 * Final Match Score =
 *   (Seeking ↔ Offering Score × 0.40) +
 *   (Expertise Overlap × 0.25) +
 *   (Experience Compatibility × 0.20) +
 *   (Topic Interest Match × 0.15)
 */

interface MatchableProfile {
  id: string;
  seekingKeywords: string[];
  offeringKeywords: string[];
  expertise: string[];
  experienceLevel: string | null;
  topicsOfInterest: string[];
}

interface MatchScore {
  attendeeId: string;
  matchedWithId: string;
  score: number;
  components: {
    seekingOffering: number;
    expertise: number;
    experience: number;
    topics: number;
  };
}

const WEIGHTS = {
  seekingOffering: 0.40,
  expertise: 0.25,
  experience: 0.20,
  topics: 0.15,
};

const EXPERIENCE_LEVELS = ['early', 'mid', 'senior', 'executive', 'founder'];

/**
 * Calculate Jaccard similarity between two arrays
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;

  const setA = new Set(a.map(s => s.toLowerCase()));
  const setB = new Set(b.map(s => s.toLowerCase()));

  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate seeking ↔ offering score
 * A's seeking keywords matched against B's offering keywords, and vice versa
 */
function calculateSeekingOfferingScore(a: MatchableProfile, b: MatchableProfile): number {
  const aSeeksBOffering = jaccardSimilarity(a.seekingKeywords, b.offeringKeywords);
  const bSeeksAOffering = jaccardSimilarity(b.seekingKeywords, a.offeringKeywords);

  // Average of bidirectional matching (both benefit)
  return (aSeeksBOffering + bSeeksAOffering) / 2;
}

/**
 * Calculate experience compatibility
 * Adjacent levels get bonus (mentorship potential)
 */
function calculateExperienceCompatibility(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5; // Neutral if unknown

  const indexA = EXPERIENCE_LEVELS.indexOf(a);
  const indexB = EXPERIENCE_LEVELS.indexOf(b);

  if (indexA === -1 || indexB === -1) return 0.5;

  const distance = Math.abs(indexA - indexB);

  if (distance === 0) return 0.6; // Same level
  if (distance === 1) return 0.8; // Adjacent (mentorship bonus)
  if (distance === 2) return 0.5; // Moderate gap
  return 0.4; // Large gap
}

/**
 * Calculate full match score between two profiles
 */
export function calculateMatchScore(a: MatchableProfile, b: MatchableProfile): MatchScore {
  const components = {
    seekingOffering: calculateSeekingOfferingScore(a, b),
    expertise: jaccardSimilarity(a.expertise, b.expertise),
    experience: calculateExperienceCompatibility(a.experienceLevel, b.experienceLevel),
    topics: jaccardSimilarity(a.topicsOfInterest, b.topicsOfInterest),
  };

  const score =
    components.seekingOffering * WEIGHTS.seekingOffering +
    components.expertise * WEIGHTS.expertise +
    components.experience * WEIGHTS.experience +
    components.topics * WEIGHTS.topics;

  return {
    attendeeId: a.id,
    matchedWithId: b.id,
    score: Math.round(score * 100), // Convert to 0-100 scale
    components,
  };
}

/**
 * Generate matches for all attendees in an event
 */
export async function generateEventMatches(
  attendees: MatchableProfile[],
  matchesPerAttendee: number = 5
): Promise<MatchScore[]> {
  const allMatches: MatchScore[] = [];

  // Calculate all pairwise scores
  for (let i = 0; i < attendees.length; i++) {
    for (let j = i + 1; j < attendees.length; j++) {
      const score = calculateMatchScore(attendees[i], attendees[j]);
      allMatches.push(score);

      // Also add reverse direction
      allMatches.push({
        ...score,
        attendeeId: attendees[j].id,
        matchedWithId: attendees[i].id,
      });
    }
  }

  // Group by attendee and take top N
  const matchesByAttendee = new Map<string, MatchScore[]>();

  for (const match of allMatches) {
    const existing = matchesByAttendee.get(match.attendeeId) || [];
    existing.push(match);
    matchesByAttendee.set(match.attendeeId, existing);
  }

  // Select top matches per attendee
  const finalMatches: MatchScore[] = [];

  for (const [attendeeId, matches] of matchesByAttendee) {
    const sorted = matches.sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, matchesPerAttendee);
    finalMatches.push(...top);
  }

  return finalMatches;
}
```

**Acceptance Criteria:**
- [ ] Seeking ↔ Offering bidirectional scoring works
- [ ] Jaccard similarity calculates correctly
- [ ] Experience compatibility gives mentorship bonus
- [ ] Topic interest matching works
- [ ] Weights sum to 1.0
- [ ] Scores normalized to 0-100
- [ ] Top N matches selected per attendee
- [ ] Edge case: 2 attendees get 1 match each
- [ ] Edge case: identical profiles use createdAt tiebreaker
- [ ] Tests: various profile combinations produce expected rankings

---

### Task 3.2: Match Generation API
**Description:** API endpoint to trigger match generation for an event
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.3

Create `POST /api/events/[eventId]/matches/generate`:
- Verify organizer owns event
- Fetch all confirmed attendees with profiles
- Run matching algorithm
- Generate "why this match" explanations via LLM
- Store matches in database
- Return match count

**Acceptance Criteria:**
- [ ] Only organizer can trigger generation
- [ ] Filters to CONFIRMED attendees only
- [ ] Filters to attendees with completed profiles
- [ ] Generates explanations for each match
- [ ] Stores matches with position ordering
- [ ] Returns count and summary
- [ ] <60s for 50 attendees

---

### Task 3.3: Curate Connections Dashboard
**Description:** Build the organizer UI for reviewing and curating matches
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.2
**Can run parallel with:** None

Create `src/app/(dashboard)/events/[eventId]/matches/page.tsx`:

Features:
- Grid/list view of attendees with their matches
- Expand to see match details and explanations
- Approve/reject individual matches
- Drag to reorder match priority
- Add manual matches from attendee list
- Bulk approve all pending matches
- Filter by match status

**Acceptance Criteria:**
- [ ] Shows all attendees with match counts
- [ ] Expandable match details
- [ ] Approve/reject buttons work
- [ ] Drag reordering updates position
- [ ] Manual match addition works
- [ ] Bulk approve works
- [ ] Status filters work
- [ ] Real-time updates via SSE (or refresh)

---

### Task 3.4: Match Status API Routes
**Description:** Endpoints for approving/rejecting/reordering matches
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.3

Create:
- `PUT /api/events/[eventId]/matches/[matchId]` - Update status, position, notes
- `DELETE /api/events/[eventId]/matches/[matchId]` - Remove match
- `POST /api/events/[eventId]/matches` - Add manual match

**Acceptance Criteria:**
- [ ] Status updates (APPROVED, REJECTED) work
- [ ] Position reordering works
- [ ] Curator notes save
- [ ] Delete removes match
- [ ] Manual match creation works
- [ ] All verify organizer ownership

---

## Phase 4: Notifications

### Task 4.1: Twilio SMS Integration
**Description:** Set up Twilio SDK and SMS sending utilities
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 4.2

**Technical Requirements:**

```bash
npm install twilio
```

Create `src/lib/notifications/sms.ts`:

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  to: string,
  body: string,
  scheduledAt?: Date
): Promise<SMSResult> {
  try {
    const message = await client.messages.create({
      to,
      body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      ...(scheduledAt && {
        scheduleType: 'fixed',
        sendAt: scheduledAt.toISOString(),
      }),
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('SMS send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// SMS Templates
export const SMS_TEMPLATES = {
  rsvpReminder: (eventName: string, rsvpUrl: string) =>
    `Reminder: Please RSVP for ${eventName}. Complete your profile to get matched with the right people! ${rsvpUrl}`,

  matchReveal: (eventName: string, matchCount: number, viewUrl: string) =>
    `Your ${matchCount} curated connections for ${eventName} are ready! See who you should meet: ${viewUrl}`,

  eventReminder: (eventName: string, time: string, venue: string) =>
    `Reminder: ${eventName} is tomorrow at ${time}. Location: ${venue}. Don't forget to review your matches!`,
};
```

**Acceptance Criteria:**
- [ ] Twilio client initializes correctly
- [ ] SMS sends successfully
- [ ] Scheduled SMS works
- [ ] Error handling returns structured result
- [ ] Templates format correctly
- [ ] Environment variables documented

---

### Task 4.2: Resend Email Integration
**Description:** Set up Resend SDK and email templates with React Email
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 4.1

**Technical Requirements:**

```bash
npm install resend @react-email/components
```

Create email templates in `src/emails/`:
- `InvitationEmail.tsx` - Event invitation
- `MatchRevealEmail.tsx` - Match reveal with trading cards
- `ReminderEmail.tsx` - Event reminder

Create `src/lib/notifications/email.ts`:

```typescript
import { Resend } from 'resend';
import { InvitationEmail } from '@/emails/InvitationEmail';
import { MatchRevealEmail } from '@/emails/MatchRevealEmail';
import { ReminderEmail } from '@/emails/ReminderEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'M33T <events@bettercontacts.app>';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendInvitationEmail(
  to: string,
  attendeeName: string,
  event: { name: string; date: Date; venueName: string },
  rsvpUrl: string
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You're invited to ${event.name}`,
      react: InvitationEmail({ attendeeName, event, rsvpUrl }),
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendMatchRevealEmail(
  to: string,
  attendeeName: string,
  event: { name: string; date: Date },
  matches: Array<{ name: string; role: string; company: string; whyMatch: string[] }>,
  viewUrl: string
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your connections for ${event.name} are ready!`,
      react: MatchRevealEmail({ attendeeName, event, matches, viewUrl }),
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

**Acceptance Criteria:**
- [ ] Resend client initializes
- [ ] Invitation email sends
- [ ] Match reveal email sends with match list
- [ ] Reminder email sends
- [ ] Email templates render correctly
- [ ] Error handling structured
- [ ] Templates use Better Contacts branding

---

### Task 4.3: Notification Triggering API
**Description:** Endpoint to trigger batch notifications for an event
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1, Task 4.2
**Can run parallel with:** Task 4.4

Create `POST /api/events/[eventId]/notify`:

Request body:
```typescript
{
  type: 'invitation' | 'rsvp_reminder' | 'match_reveal' | 'event_reminder';
  attendeeIds?: string[]; // Optional, defaults to all eligible
}
```

Logic:
- Filter attendees based on notification type eligibility
- Skip already-notified (check timestamp fields)
- Send SMS + Email in parallel
- Update notification timestamp fields
- Return success/failure counts

**Acceptance Criteria:**
- [ ] Invitation sends to PENDING attendees
- [ ] RSVP reminder sends to PENDING 24h before deadline
- [ ] Match reveal sends to CONFIRMED with approved matches
- [ ] Event reminder sends to CONFIRMED day before
- [ ] Tracks sent timestamps to prevent duplicates
- [ ] Returns counts (sent, failed, skipped)

---

### Task 4.4: Email Templates (React Email)
**Description:** Design and build email templates
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 4.2
**Can run parallel with:** Task 4.3

Create:
1. **InvitationEmail** - Event details, CTA to RSVP
2. **MatchRevealEmail** - Event summary, top 3 matches with mini trading cards
3. **ReminderEmail** - Event date/time/venue, link to view matches

All templates should:
- Match Better Contacts brand (dark theme viable in email?)
- Be mobile responsive
- Include clear CTAs
- Have text fallback

**Acceptance Criteria:**
- [ ] All 3 templates implemented
- [ ] Mobile responsive
- [ ] Clear CTAs
- [ ] Text fallback works
- [ ] Preview in React Email dev server

---

## Phase 5: Polish

### Task 5.1: SSE for Real-Time RSVP Updates
**Description:** Implement Server-Sent Events for live dashboard updates
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.3
**Can run parallel with:** Task 5.2

Create `GET /api/events/[eventId]/stream`:

Implementation per spec (polling-based SSE):
- 5-second polling interval
- 30-second heartbeat
- Send RSVP status changes
- Send match generation progress

Client integration in RSVPs dashboard:
```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/events/${eventId}/stream`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'rsvp') {
      // Update attendee in local state
    }
  };

  return () => eventSource.close();
}, [eventId]);
```

**Acceptance Criteria:**
- [ ] SSE endpoint streams updates
- [ ] Client receives and processes events
- [ ] Auto-reconnect on disconnect
- [ ] Heartbeat keeps connection alive
- [ ] Dashboard updates in real-time

---

### Task 5.2: Guest Import from Better Contacts
**Description:** Allow importing existing contacts as event guests
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.3
**Can run parallel with:** Task 5.1

Create contact picker component:
- Search/filter contacts
- Multi-select with checkboxes
- Show existing attendee status
- Bulk add selected

API: `POST /api/events/[eventId]/attendees/import`:
```typescript
{
  contactIds: string[];
}
```

**Acceptance Criteria:**
- [ ] Contact picker shows all user's contacts
- [ ] Search filters work
- [ ] Already-added contacts shown differently
- [ ] Bulk import creates attendees
- [ ] Pre-fills attendee data from contact

---

### Task 5.3: Question Builder UI
**Description:** Allow organizers to customize event questionnaire
**Size:** Large
**Priority:** Low
**Dependencies:** Task 1.2
**Can run parallel with:** Task 5.4

Create `src/app/(dashboard)/events/[eventId]/questions/page.tsx`:

Features:
- List current questions (defaults locked)
- Add new questions (4 types)
- Edit question text/config
- Reorder via drag
- Delete custom questions
- Preview mode

**Acceptance Criteria:**
- [ ] Shows default questions (locked)
- [ ] Add question with type selection
- [ ] Edit question config
- [ ] Drag reordering
- [ ] Delete non-locked questions
- [ ] Preview shows attendee view

---

### Task 5.4: Error Handling and Edge Cases
**Description:** Implement comprehensive error handling per spec
**Size:** Medium
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** Task 5.3

Implement error handling from spec's failure modes table:
- LLM extraction retry (3 max) + manual fallback
- SMS failure → email-only fallback
- Match generation partial failure handling
- SSE reconnection UI
- Token expiry handling

**Acceptance Criteria:**
- [ ] LLM extraction retries 3 times
- [ ] Manual entry form on extraction failure
- [ ] SMS failure flags attendee for email-only
- [ ] Partial match failures logged
- [ ] SSE shows "Reconnecting..." state
- [ ] Expired token shows clear message

---

### Task 5.5: Event List and Overview Pages
**Description:** Build the organizer's event management dashboard
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 1.3
**Can run parallel with:** Task 5.1

Create:
- `src/app/(dashboard)/events/page.tsx` - Event list with status filters
- `src/app/(dashboard)/events/[eventId]/page.tsx` - Event overview with quick stats

Features:
- Event cards with date, venue, attendee count
- Status badges (Draft, Published, Active, Completed)
- Quick actions (Edit, Delete, Publish)
- Overview shows RSVP stats, match stats, next actions

**Acceptance Criteria:**
- [ ] Event list shows all user's events
- [ ] Status filters work
- [ ] Cards show key info
- [ ] Overview shows stats
- [ ] Quick actions work
- [ ] Responsive layout

---

## Execution Strategy

### Critical Path

```
1.1 (Schema) → 1.2 (Validation) → 1.3 (Event API) → 1.5 (Event UI)
              ↓
           1.4 (Tokens) → 2.1 (RSVP Page) → 2.2 (Questionnaire) → 2.3 (Extraction)
                                                                     ↓
                                                                  3.1 (Matching) → 3.2 (Generate API) → 3.3 (Curation UI)
                                                                                                          ↓
                                                                                                       4.1-4.4 (Notifications)
```

### Parallel Opportunities

- Tasks 1.3 and 1.4 can run in parallel after 1.1
- Tasks 2.1 and 2.2 can start simultaneously after tokens
- Tasks 4.1 (Twilio) and 4.2 (Resend) are independent
- Phase 5 tasks are largely independent

### Risk Areas

1. **LLM Extraction** - May need prompt tuning for quality
2. **Matching Algorithm** - May need weight adjustment after testing
3. **SMS Deliverability** - Twilio setup can be complex
4. **Email Domain** - DNS configuration for Resend

### Recommended Execution Order

1. **Week 1:** Phase 1 (all tasks) - Get foundation solid
2. **Week 2:** Phase 2 (Tasks 2.1-2.5) - Attendee flow complete
3. **Week 3:** Phase 3 (Tasks 3.1-3.4) - Matching working
4. **Week 4:** Phase 4 (Tasks 4.1-4.4) - Notifications live
5. **Week 5:** Phase 5 (polish) - SSE, import, edge cases

---

## Summary

| Phase | Tasks | Priority Tasks |
|-------|-------|----------------|
| Phase 1: Foundation | 5 | 1.1 (Schema), 1.3 (Event API) |
| Phase 2: Attendee | 5 | 2.1 (RSVP), 2.3 (Extraction) |
| Phase 3: Matching | 4 | 3.1 (Algorithm), 3.3 (Curation) |
| Phase 4: Notifications | 4 | 4.1 (SMS), 4.2 (Email) |
| Phase 5: Polish | 5 | 5.4 (Error Handling) |
| **Total** | **23** | |

