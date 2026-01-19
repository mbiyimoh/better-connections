# Architecture Overview & Developer Guide Index

**Last Updated:** 2026-01-15
**Component:** System-Wide Architecture

---

## 1. Architecture Overview

Better Connections is a **dual-layer application** consisting of:

1. **Better Connections (CRM Layer)** - Personal contact management and enrichment
2. **M33T (Event Layer)** - Event networking platform built on top of the CRM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                        │
├──────────────────────────────┬──────────────────────────────────────┤
│     Better Connections       │              M33T                     │
│   ┌─────────────────────┐    │    ┌──────────────────────────────┐  │
│   │ Contacts Dashboard  │    │    │ Events Dashboard (Protected) │  │
│   │ Enrichment Flow     │    │    │ Public Landing (/m33t/[slug])│  │
│   │ Explore (AI Chat)   │    │    │ RSVP Flow (/rsvp/[token])    │  │
│   │ Import/Export       │    │    │ Attendee Management          │  │
│   │ Settings            │    │    │ Matching Interface           │  │
│   └─────────────────────┘    │    └──────────────────────────────┘  │
├──────────────────────────────┴──────────────────────────────────────┤
│                         API LAYER (Next.js)                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  /api/contacts/*     /api/enrichment/*    /api/chat/*           ││
│  │  /api/events/*       /api/rsvp/*          /api/public/*         ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER (src/lib/*)                       │
│  ┌────────────────┬──────────────────┬─────────────────────────────┐│
│  │ enrichment.ts  │ research/*       │ m33t/*                      ││
│  │ chat-parser.ts │ vcf-parser.ts    │ events/*                    ││
│  │ contact-utils  │ area-codes.ts    │ notifications/*             ││
│  └────────────────┴──────────────────┴─────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│                       DATA LAYER (Prisma ORM)                       │
│  ┌────────────────────────────┬─────────────────────────────────────┐│
│  │    Better Connections      │              M33T                    ││
│  │  User, Contact, Tag        │  Event, EventAttendee, Match        ││
│  │  ContactResearchRun        │  EventOrganizer                     ││
│  │  EnrichmentStreak          │                                     ││
│  └────────────────────────────┴─────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                                 │
│  ┌──────────────┬──────────────┬──────────────┬────────────────────┐│
│  │ Supabase     │ OpenAI       │ Tavily       │ Twilio (Future)    ││
│  │ (Auth + DB)  │ (GPT-4o-mini)│ (AI Search)  │ (SMS)              ││
│  └──────────────┴──────────────┴──────────────┴────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Core Value Proposition

**Better Connections:** "Your contacts are flat. Give them some depth."
- Most CRMs store names/emails; Better Connections stores *why someone matters right now*
- Key differentiator: **"Why Now"** field (20 points in enrichment score)

**M33T:** Event-driven networking with AI matching
- Transforms BetterConnections contacts into event attendees
- Generates AI-powered match recommendations
- Public landing pages for event promotion

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui, Framer Motion, Lucide React icons |
| **Backend** | Next.js API Routes (Route Handlers) |
| **Database** | PostgreSQL (Supabase-hosted), Prisma ORM |
| **Authentication** | Supabase Auth (email/password) |
| **AI/ML** | OpenAI GPT-4o-mini (chat, suggestions), Tavily (web search) |
| **Voice** | Web Speech Recognition API |
| **File Parsing** | vcard4-ts (VCF), Papa Parse (CSV) |
| **State** | React hooks, URL state (searchParams) |

---

## 3. Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup, forgot-password)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── contacts/             # Contact management
│   │   ├── enrichment/           # Enrichment queue & session
│   │   ├── explore/              # AI chat exploration
│   │   ├── events/               # M33T event dashboard
│   │   ├── settings/             # User settings
│   │   └── onboarding/           # First-time user flow
│   ├── m33t/[slug]/              # Public event landing pages
│   ├── rsvp/[token]/             # RSVP flow (questionnaire, complete)
│   ├── api/                      # API route handlers
│   │   ├── contacts/             # Contact CRUD, import, export
│   │   ├── enrichment/           # Enrichment operations
│   │   ├── chat/                 # AI chat endpoints
│   │   ├── events/               # M33T event management
│   │   ├── rsvp/                 # RSVP processing
│   │   └── public/               # Public API (no auth)
│   └── feedback/                 # Feedback submission
│
├── components/                   # React components
│   ├── chat/                     # Chat UI (ContactChip, MessageContent)
│   ├── contacts/                 # Contact cards, forms, tables
│   ├── enrichment/               # Enrichment session UI
│   │   └── completion/           # Celebration animations
│   ├── events/                   # M33T event components
│   ├── import/                   # VCF/CSV import flows
│   ├── layout/                   # AppShell, Sidebar, BottomNav
│   ├── m33t/                     # M33T-specific components
│   ├── onboarding/               # Story slides
│   ├── research/                 # Research results UI
│   ├── ui/                       # shadcn/ui primitives
│   └── whats-new/                # Update notification modal
│
├── lib/                          # Business logic & utilities
│   ├── supabase/                 # Supabase client (client.ts, server.ts)
│   ├── research/                 # Contact research (Tavily + GPT)
│   ├── m33t/                     # M33T utilities (slug, matching, tokens)
│   ├── events/                   # Event validation, transforms
│   ├── notifications/            # Email/SMS (future)
│   ├── updates/                  # What's New system
│   ├── schemas/                  # Zod schemas
│   ├── validations/              # Form validations
│   ├── enrichment.ts             # Enrichment score calculation
│   ├── chat-parser.ts            # Contact reference parsing
│   ├── vcf-parser.ts             # VCF file parsing
│   ├── area-codes.ts             # Phone area code lookup
│   ├── design-system.ts          # Brand colors, constants
│   └── db.ts                     # Prisma client singleton
│
├── hooks/                        # Custom React hooks
│   ├── useMediaQuery.ts          # Responsive breakpoints
│   └── useSpeechRecognition.ts   # Voice input
│
├── types/                        # TypeScript type definitions
│   └── contact.ts                # Contact, Tag, TagCategory
│
└── prisma/
    └── schema.prisma             # Database schema (source of truth)
```

---

## 4. Data Models Overview

### Better Connections Models

```
User (1) ────────────< Contact (n)
     │                     │
     │                     ├────────< Tag (n)
     │                     │
     │                     ├────────< ContactResearchRun (n)
     │                     │              │
     │                     │              └────< ContactRecommendation (n)
     │                     │
     │                     └────────< ContactEnrichmentLog (n)
     │
     └────────────────────< EnrichmentStreak (n)
```

### M33T Models

```
User (1) ────────────< Event (n)
                           │
                           ├────────< EventOrganizer (n) ───> User
                           │
                           ├────────< EventAttendee (n) ────> Contact (optional)
                           │              │
                           │              └────────< Match (n)
                           │
                           └────────< Match (n)
```

### Key Relationships

| Relationship | Description |
|--------------|-------------|
| `Contact → EventAttendee` | Optional link - attendee can exist without contact |
| `EventAttendee → Match` | One attendee has many match recommendations |
| `User → EventOrganizer` | Co-organizer permissions per event |
| `ContactResearchRun → ContactRecommendation` | Research generates recommendations |

---

## 5. Feature Domains

### Better Connections Features

| Feature | Entry Point | Key Files |
|---------|-------------|-----------|
| **Contact Management** | `/contacts` | `app/(dashboard)/contacts/page.tsx` |
| **Voice Enrichment** | `/enrichment/session` | `app/(dashboard)/enrichment/session/page.tsx` |
| **Research Enrichment** | Contact detail "Research" button | `lib/research/orchestrator.ts` |
| **AI Explore** | `/explore` | `app/(dashboard)/explore/page.tsx` |
| **VCF Import** | `/contacts/import` | `lib/vcf-parser.ts`, `app/api/contacts/import/vcf/route.ts` |
| **Gamification** | Post-enrichment celebration | `components/enrichment/completion/` |
| **Onboarding** | `/onboarding` | `components/onboarding/StoryOnboarding.tsx` |

### M33T Features

| Feature | Entry Point | Key Files |
|---------|-------------|-----------|
| **Event Creation** | `/events/new` | `app/(dashboard)/events/new/page.tsx` |
| **Event Management** | `/events/[eventId]` | `app/(dashboard)/events/[eventId]/page.tsx` |
| **Attendee Management** | Event detail page | `components/events/AttendeeTable.tsx` |
| **Public Landing Page** | `/m33t/[slug]` | `app/m33t/[slug]/page.tsx` |
| **RSVP Flow** | `/rsvp/[token]` | `app/rsvp/[token]/page.tsx` |
| **Match Generation** | Event matches tab | `lib/m33t/matching.ts` |

---

## 6. API Endpoint Index

### Contact APIs
```
GET     /api/contacts               # List contacts (with filters)
POST    /api/contacts               # Create contact
GET     /api/contacts/:id           # Get single contact
PUT     /api/contacts/:id           # Update contact
DELETE  /api/contacts/:id           # Delete contact
DELETE  /api/contacts/bulk          # Bulk delete
DELETE  /api/contacts/delete-all    # Delete all contacts

POST    /api/contacts/import/vcf    # Analyze VCF file
POST    /api/contacts/import/vcf/commit  # Commit VCF import
POST    /api/contacts/import/csv    # Import CSV

GET     /api/contacts/:id/ranking   # Get contact ranking
POST    /api/contacts/:id/suggest-tags  # AI tag suggestions
POST    /api/contacts/match-mentions    # Match mentioned names
```

### Research APIs
```
POST    /api/contacts/:id/research         # Start research run
GET     /api/contacts/:id/research         # List research runs
GET     /api/contacts/:id/research/:runId  # Get research run
PATCH   /api/contacts/:id/research/:runId/recommendations/:recId  # Update recommendation
POST    /api/contacts/:id/research/:runId/apply  # Apply recommendations
```

### Enrichment APIs
```
GET     /api/enrichment/queue       # Get enrichment queue
GET     /api/enrichment/stats       # Get enrichment stats
POST    /api/enrichment/extract     # AI extract from voice transcript
POST    /api/enrichment/extract-mentions  # Extract mentioned contacts
GET     /api/enrichment/completion-data   # Post-enrichment celebration data
```

### Chat APIs
```
POST    /api/chat/explore           # Explore chat (contact suggestions)
POST    /api/chat/draft-intro       # Draft introduction message
```

### M33T Event APIs
```
GET     /api/events                 # List user's events
POST    /api/events                 # Create event
GET     /api/events/:id             # Get event details
PATCH   /api/events/:id             # Update event
DELETE  /api/events/:id             # Delete event

GET     /api/events/:id/attendees   # List attendees
POST    /api/events/:id/attendees   # Add attendee
PATCH   /api/events/:id/attendees/:aid  # Update attendee
DELETE  /api/events/:id/attendees/:aid  # Remove attendee

GET     /api/events/:id/matches     # Get matches
POST    /api/events/:id/matches/generate  # Generate AI matches
```

### RSVP APIs
```
GET     /api/rsvp/:token            # Get RSVP details
POST    /api/rsvp/:token            # Submit RSVP response
POST    /api/rsvp/:token/questionnaire  # Submit questionnaire
```

### Public APIs (No Auth)
```
GET     /api/public/events/:slug    # Public event data
```

---

## 7. Design System Reference

### Brand Colors

```typescript
// Primary brand gold
BRAND_GOLD.primary   = "#d4a54a"
BRAND_GOLD.light     = "#e5c766"
BRAND_GOLD.subtle    = "rgba(212, 165, 74, 0.15)"

// Background (dark theme)
bg.primary     = "#0D0D0F"
bg.secondary   = "#1A1A1F"
bg.tertiary    = "#252529"

// Tag categories
RELATIONSHIP   = blue-500
OPPORTUNITY    = green-500
EXPERTISE      = purple-500
INTEREST       = amber-500
```

### Key Patterns

- **Dark theme mandatory** - 33 Strategies brand
- **Glassmorphism** - `backdrop-blur` with rgba backgrounds
- **No emojis** - Use Lucide React icons instead
- **Framer Motion** - All animations
- **Mobile-first** - Touch targets min 44px

---

## 8. Developer Guide Index

The following guides provide deep-dives into specific features:

### Better Connections Guides

| Guide | Description | Status |
|-------|-------------|--------|
| [Voice Enrichment Guide](./01-voice-enrichment-guide.md) | Voice-first contact enrichment with Web Speech API | Pending |
| [Research Enrichment Guide](./02-research-enrichment-guide.md) | AI-powered web research for contact profiles | Pending |
| [Gamification Guide](./03-gamification-elements-guide.md) | Scores, ranks, streaks, animations, sounds | Pending |
| [Voice Parsing Guide](./04-voice-parsing-guide.md) | Web Speech API integration patterns | Pending |
| [Explore Function Guide](./05-explore-function-guide.md) | AI chat contact discovery | Pending |
| [Contact Import Guide](./06-contact-import-guide.md) | VCF/CSV import with duplicate handling | Pending |

### M33T Guides

| Guide | Description | Status |
|-------|-------------|--------|
| [M33T Architecture Guide](./07-m33t-architecture-guide.md) | Boundaries between Better Connections and M33T | Pending |
| [M33T Event Management Guide](./08-m33t-event-management-guide.md) | Event creation, attendees, organizers | Pending |
| [M33T Public Landing Pages Guide](./09-m33t-landing-pages-guide.md) | Public event pages, scrollytelling | Pending |

---

## 9. Common Development Scenarios

### Starting the Dev Server

```bash
# Standard start (port 3333)
PORT=3333 npm run dev

# Clean restart (kills only port 3333)
lsof -ti:3333 | xargs kill -9 2>/dev/null || true
rm -rf .next
PORT=3333 npm run dev
```

### Database Operations

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Open database GUI
npx prisma studio

# Create migration
npx prisma migrate dev --name descriptive-name
```

### Adding a New Feature

1. Define data model in `prisma/schema.prisma`
2. Create API route in `src/app/api/`
3. Add service functions in `src/lib/`
4. Build UI components in `src/components/`
5. Create page in `src/app/(dashboard)/`
6. Update this guide index if significant

### Testing Flows

- **Manual QA:** Run dev server, test in browser
- **Quick E2E:** Use `.quick-checks/` for ephemeral Playwright tests
- **Authentication:** Dev server uses real Supabase auth

---

## 10. Quick Reference

### Environment Variables

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

### Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| Dev Port | 3333 | CLAUDE.md |
| Gold Primary | #d4a54a | `lib/design-system.ts` |
| Max Enrichment Score | 100 | `lib/enrichment.ts` |
| Why Now Points | 20 | `lib/enrichment.ts` |
| How We Met Points | 15 | `lib/enrichment.ts` |

### Critical Files

| Purpose | File |
|---------|------|
| Database Schema | `prisma/schema.prisma` |
| Design System | `src/lib/design-system.ts` |
| Enrichment Scoring | `src/lib/enrichment.ts` |
| Chat Parsing | `src/lib/chat-parser.ts` |
| Auth Helpers | `src/lib/auth.ts`, `src/lib/auth-helpers.ts` |
| VCF Parser | `src/lib/vcf-parser.ts` |
| Research Orchestrator | `src/lib/research/orchestrator.ts` |
| M33T Matching | `src/lib/m33t/matching.ts` |

---

## 11. Architectural Decisions

### Why Two-Layer Architecture?

- **Separation of Concerns:** CRM functionality is independent of event features
- **Feature Flagging:** `User.hasM33tAccess` controls M33T visibility
- **Data Reuse:** `EventAttendee.contactId` links to existing contacts
- **Public vs Protected:** M33T has public routes (`/m33t/[slug]`), Better Connections is all authenticated

### Why Prisma over Raw SQL?

- Type-safe queries with TypeScript
- Schema as source of truth
- Easy migrations with `prisma migrate`
- Relations handled automatically

### Why Supabase for Auth?

- Handles auth complexity (sessions, tokens, password reset)
- PostgreSQL hosting included
- Row Level Security available (not currently used)
- Simple client SDK

### Why Web Speech API over Whisper?

- Zero latency (runs in browser)
- No API costs
- Good accuracy for conversational input
- Chrome/Safari support sufficient for target users

---

## 12. Maintenance Notes

### Updating This Guide

When making significant architectural changes:
1. Update the ASCII diagram if structure changes
2. Add new endpoints to the API index
3. Link new features to their guides
4. Update the "Key Files" section if critical files move

### Creating New Developer Guides

Use the `/create-dev-guide` slash command template. Each guide should include:
1. Architecture Overview
2. Dependencies
3. User Experience Flow
4. File-by-File Mapping
5. Connections & Integrations
6. Gotchas & Pitfalls
7. Development Scenarios
8. Testing Approach
9. Quick Reference
