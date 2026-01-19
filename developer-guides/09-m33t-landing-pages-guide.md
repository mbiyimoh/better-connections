# M33T Public Landing Pages & RSVP Flow Guide

**Last Updated:** 2026-01-15
**Component:** Public Event Pages, Scrollytelling, RSVP Flow, Questionnaire

---

## 1. Architecture Overview

M33T public pages provide a no-auth event discovery experience for attendees, using token-based authentication for RSVP actions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PUBLIC LANDING PAGE ARCHITECTURE                       │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Landing   │───>│    RSVP     │───>│ Questionnaire│───>│   Matches   │  │
│  │   Page      │    │    Form     │    │    Form      │    │   Reveal    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  /m33t/[slug]       /rsvp/[token]     /rsvp/[token]/     Before event      │
│  (no auth)          (token auth)      questionnaire      (SMS + viewing)   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Files Structure

### Landing Page

```
src/app/m33t/[slug]/
├── page.tsx                # Server Component (data fetching)
├── not-found.tsx           # 404 page
├── error.tsx               # Error boundary
├── EventLandingClient.tsx  # Client Component (interactions)
├── types.ts                # Type definitions
└── components/
    ├── index.ts            # Barrel exports
    ├── EventHero.tsx       # Event name, date, CTA
    ├── VenueSection.tsx    # Location with map
    ├── AttendeeCarousel.tsx # Horizontal scrollable list
    ├── AttendeeCard.tsx    # Individual attendee card
    ├── ProfileModal.tsx    # Detailed attendee profile
    ├── FullGuestListModal.tsx # Grid view with tabs
    ├── ScheduleSection.tsx # Event agenda timeline
    ├── WhatToExpectSection.tsx # Feature cards
    ├── HostSection.tsx     # Organizer profile
    ├── FooterCTA.tsx       # Bottom call-to-action
    └── ScrollytellingSection.tsx # NO EDGES story slides
```

### RSVP Flow

```
src/components/m33t/
├── RSVPForm.tsx             # RSVP confirmation form
├── TradingCard.tsx          # Attendee display card
├── TokenExpiredMessage.tsx  # Error state
├── TokenInvalidMessage.tsx  # Error state
└── questions/               # Question type renderers
    ├── index.ts
    ├── OpenTextQuestion.tsx
    ├── SliderQuestion.tsx
    ├── SingleSelectQuestion.tsx
    └── MultiSelectQuestion.tsx

src/app/rsvp/[token]/
├── page.tsx                 # RSVP entry point
├── questionnaire/
│   └── page.tsx             # Questionnaire flow
└── ...
```

---

## 3. Public API Endpoint

### GET `/api/public/events/[slug]`

```typescript
// No authentication required
// Privacy-filtered response

interface PublicEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    tagline?: string;
    date: string;              // ISO string
    startTime: string;         // "18:00"
    endTime: string;           // "21:00"
    venueName: string;
    venueAddress: string;
    venueLatitude?: number;
    venueLongitude?: number;
    parkingNotes?: string;
    dressCode?: string;
    schedule?: ScheduleItem[];
    whatToExpect?: WhatToExpectItem[];
    landingPageSettings: LandingPageSettings;
  };
  attendees: {
    confirmed: PublicAttendee[];
    maybe: PublicAttendee[];
    invited: PublicAttendee[];
  };
  host: {
    name: string;
    bio?: string;
    quote?: string;
  };
  rsvpUrl: string;
}

// Privacy: EXCLUDED from response
// - email
// - phone
// - questionnaireResponses
// - Declined attendees (filtered out entirely)
```

### RSVP Status Mapping

```typescript
// Database enum → Display string
PENDING   → 'invited'
CONFIRMED → 'confirmed'
MAYBE     → 'maybe'
DECLINED  → (excluded from response)
```

---

## 4. Landing Page Sections

### Section Visibility Control

```typescript
interface LandingPageSettings {
  showVenue: boolean;       // VenueSection
  showSchedule: boolean;    // ScheduleSection
  showHost: boolean;        // HostSection
  showWhatToExpect: boolean; // WhatToExpectSection
  showAttendees: boolean;   // AttendeeCarousel
}

// Default: all sections visible
const DEFAULT_LANDING_PAGE_SETTINGS = {
  showVenue: true,
  showSchedule: true,
  showHost: true,
  showWhatToExpect: true,
  showAttendees: true,
};
```

### Conditional Rendering Pattern

```typescript
// src/app/m33t/[slug]/EventLandingClient.tsx

{event.landingPageSettings.showVenue && (
  <VenueSection ... />
)}

{event.landingPageSettings.showSchedule && event.schedule?.length > 0 && (
  <ScheduleSection schedule={event.schedule} />
)}
```

---

## 5. Scrollytelling System

### NO EDGES Special Feature

Scrollytelling is enabled only for events with "NO EDGES" in the name:

```typescript
// src/app/m33t/[slug]/EventLandingClient.tsx:29
const isNoEdgesEvent = event.name.toUpperCase().includes('NO EDGES');
```

### 5-Slide Structure

| Slide | Title | Content |
|-------|-------|---------|
| 0 | The Wrong Question | "How do we adopt AI?" → Wrong framing |
| 1 | The Thesis | Constraints no longer exist |
| 2 | The Gap | Speed/Cost/Quality convergence |
| 3 | The Reframe | "What would you build from scratch?" |
| 4 | The Promise | Event reveal + CTA |

### Scroll Position Calculation

```typescript
// src/app/m33t/[slug]/components/ScrollytellingSection.tsx

// Calculate which slide is active based on scroll
const vh = window.innerHeight;
const activeSlide = Math.min(Math.floor((scrollY + vh * 0.4) / vh), 4);

// Fade between slides
className={`transition-opacity duration-700 ${
  activeSlide === 0 ? 'opacity-100' : 'opacity-20'
}`}
```

### Progress Bar

```typescript
// Fixed progress indicator
function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 z-50"
      style={{
        scaleX,
        transformOrigin: 'left',
        background: `linear-gradient(to right, #b45309, ${GOLD})`,
      }}
    />
  );
}
```

### Completion Detection

```typescript
// Transition to main content after scrolling
useEffect(() => {
  if (scrollY > vh * 4.5) {
    onComplete();  // Hide scrollytelling, show main content
  }
}, [scrollY, vh, onComplete]);
```

---

## 6. Attendee Carousels

### Status-Based Carousels

```typescript
// Three carousels by RSVP status
<AttendeeCarousel
  title="Confirmed"
  subtitle="They're in. Are you?"
  attendees={attendees.confirmed}
  statusColor="bg-emerald-500"
  onSelectAttendee={handleSelectAttendee}
/>

<AttendeeCarousel
  title="Maybe"
  attendees={attendees.maybe}
  statusColor="bg-amber-500"
/>

<AttendeeCarousel
  title="Invited"
  attendees={attendees.invited}
  statusColor="bg-zinc-600"
/>
```

### Profile Modal Flow

```typescript
// Click attendee → Open modal
const [selectedAttendee, setSelectedAttendee] = useState<PublicAttendee | null>(null);

// From carousel or full list
const handleSelectAttendee = (attendee: PublicAttendee) => {
  setSelectedAttendee(attendee);
  setShowFullGuestList(false);  // Close full list if open
};

<ProfileModal
  attendee={selectedAttendee}
  onClose={() => setSelectedAttendee(null)}
/>
```

---

## 7. RSVP Token Flow

### Token-Based Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RSVP TOKEN FLOW                                   │
│                                                                             │
│  Organizer               Email/SMS              Attendee                    │
│  ─────────               ─────────              ────────                    │
│      │                       │                      │                       │
│      │  Generate Token       │                      │                       │
│      │──────────────────────>│                      │                       │
│      │                       │                      │                       │
│      │                       │  /rsvp/{token}       │                       │
│      │                       │─────────────────────>│                       │
│      │                       │                      │                       │
│      │                       │                      │ Verify Token          │
│      │                       │                      │ Show RSVP Form        │
│      │                       │                      │                       │
│      │                       │                      │ Submit RSVP           │
│      │                       │                      │──────────>            │
│      │                       │                      │                       │
│      │                       │                      │ (If confirmed)        │
│      │                       │                      │ /rsvp/{token}/questionnaire │
│      │                       │                      │──────────>            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Generation

```typescript
// src/lib/m33t/tokens.ts

interface RSVPTokenPayload {
  eventId: string;
  email: string;
  attendeeId: string;
  type: 'rsvp';
  exp: number;   // Expires 24h after event
  iat: number;
}

export function generateRSVPToken(
  eventId: string,
  email: string,
  attendeeId: string,
  eventDate: Date
): string {
  const expiresAt = new Date(eventDate);
  expiresAt.setHours(expiresAt.getHours() + 24);

  return jwt.sign(payload, RSVP_TOKEN_SECRET, {
    expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}
```

### Token Verification

```typescript
export function verifyRSVPToken(token: string): RSVPTokenPayload | null {
  try {
    const decoded = jwt.verify(token, RSVP_TOKEN_SECRET) as RSVPTokenPayload;
    if (decoded.type !== 'rsvp') return null;
    return decoded;
  } catch {
    return null;  // Invalid or expired
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, RSVP_TOKEN_SECRET);
    return false;
  } catch (error) {
    return error instanceof jwt.TokenExpiredError;
  }
}
```

---

## 8. RSVP Form Component

### State-Based Rendering

```typescript
// src/components/m33t/RSVPForm.tsx

// Already responded - show status
if (attendee.rsvpRespondedAt && attendee.rsvpStatus !== 'PENDING') {
  return (
    <Card>
      {attendee.rsvpStatus === 'CONFIRMED' && <Check />}
      {attendee.rsvpStatus === 'DECLINED' && <X />}
      {attendee.rsvpStatus === 'MAYBE' && <HelpCircle />}

      {/* Prompt to complete questionnaire if not done */}
      {!attendee.questionnaireCompletedAt && (
        <Button onClick={() => router.push(`/rsvp/${token}/questionnaire`)}>
          Complete Your Profile
        </Button>
      )}
    </Card>
  );
}

// Not yet responded - show form
return (
  <RadioGroup value={status} onValueChange={setStatus}>
    <RadioGroupItem value="CONFIRMED" label="Yes, I'll be there!" />
    <RadioGroupItem value="MAYBE" label="Maybe" />
    <RadioGroupItem value="DECLINED" label="Can't make it" />
  </RadioGroup>
);
```

### Phone Requirement

```typescript
// Phone required for confirmed attendees (for match notifications)
{status === 'CONFIRMED' && (
  <Input
    type="tel"
    placeholder="+1 (512) 555-0123"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
  />
)}

const handleSubmit = async () => {
  if (status === 'CONFIRMED' && !phone) {
    toast.error('Phone number is required to receive match notifications');
    return;
  }
  // ...
};
```

---

## 9. Questionnaire Flow

### Question Types

| Type | Component | Value Type |
|------|-----------|------------|
| `open_text` | `OpenTextQuestion` | `string` |
| `slider` | `SliderQuestion` | `number` (1-10) |
| `single_select` | `SingleSelectQuestion` | `string` |
| `multi_select` | `MultiSelectQuestion` | `string[]` |

### Question Configuration

```typescript
interface Question {
  id: string;
  type: 'open_text' | 'slider' | 'single_select' | 'multi_select';
  category: string;
  title: string;
  subtitle?: string;
  required: boolean;
  locked: boolean;    // Can't be removed by organizer
  order: number;
  config?: {
    placeholder?: string;
    hint?: string;
    leftLabel?: string;   // Slider
    rightLabel?: string;  // Slider
    options?: Array<{
      value: string;
      label: string;
      description?: string;
    }>;
    maxSelections?: number;  // Multi-select
  };
}
```

### Response Storage

```typescript
// Stored in EventAttendee.questionnaireResponses (JSON)
interface QuestionnaireResponse {
  questionId: string;
  value: string | number | string[];
  context?: string;
  answeredAt: Date;
}
```

---

## 10. Design System (33 Strategies Brand)

### Colors

```typescript
// Background
'bg-zinc-950'  // Main page background

// Gold accent
'text-amber-500'  // Primary text accent
'bg-amber-500'    // Buttons, highlights

// Status colors
'bg-emerald-500'  // Confirmed
'bg-amber-500'    // Maybe
'bg-zinc-600'     // Invited (pending)
```

### Typography

```css
/* Headings use Georgia serif */
font-family: Georgia, serif;

/* Section labels */
font-size: 0.875rem;
font-weight: 500;
letter-spacing: 0.05em;
text-transform: uppercase;
color: #f59e0b; /* amber-500 */
```

---

## 11. Critical Gotchas

### Force Dynamic Rendering

Public pages must not be statically generated:

```typescript
// src/app/m33t/[slug]/page.tsx
export const dynamic = 'force-dynamic';

// src/app/api/public/events/[slug]/route.ts
export const dynamic = 'force-dynamic';
```

### Cache-Control Header

```typescript
return NextResponse.json(response, {
  headers: {
    'Cache-Control': 'no-store',  // Ensure fresh data
  },
});
```

### Title/Company Extraction

Data may be in different locations:

```typescript
// Try trading card first
if (attendee.tradingCard?.headline) {
  title = attendee.tradingCard.headline;
}

// Fallback to profile
if (!title && attendee.profile?.title) {
  title = attendee.profile.title;
}
```

### Empty States

```typescript
// No attendees yet
{totalAttendees === 0 ? (
  <p className="text-center text-zinc-500">Be the first to RSVP!</p>
) : (
  <AttendeeCarousel ... />
)}
```

### Scrollytelling Transition

```typescript
// Hide scrollytelling when complete
<div className={isNoEdgesEvent && !scrollytellingComplete ? 'opacity-0' : 'opacity-100 transition-opacity duration-700'}>
  {/* Main Content */}
</div>
```

---

## 12. Testing Public Pages

### Manual Testing

1. Create event via dashboard
2. Add test attendees
3. Open `/m33t/[slug]` in incognito
4. Verify no auth redirect
5. Test attendee carousels
6. Click "RSVP" button
7. Complete RSVP flow
8. Return to landing page, verify status updated

### Test Scenarios

| Scenario | Expected |
|----------|----------|
| Event not found | 404 page |
| No attendees | "Be the first to RSVP!" |
| NO EDGES event | Scrollytelling shown first |
| Regular event | Direct to landing page |
| Expired token | Token expired message |
| Invalid token | Token invalid message |
| Already RSVP'd | Status card with next action |

---

## 13. Related Guides

- [M33T Architecture Guide](./07-m33t-architecture-guide.md) - System boundaries
- [M33T Event Management Guide](./08-m33t-event-management-guide.md) - Wizard, matches
- [Architecture Overview](./00-architecture-overview-guide.md) - Full system architecture
