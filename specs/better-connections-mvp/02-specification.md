# Better Connections MVP Specification

**Status:** Approved
**Authors:** Claude Code
**Date:** 2025-12-12
**Slug:** better-connections-mvp
**Related:** [01-ideation.md](./01-ideation.md)

---

## 1. Overview

Better Connections is a personal CRM / contact enrichment tool that transforms static contact data into dynamic, context-rich profiles. The core differentiator is the "Why Now" field — capturing not just who someone is, but why they matter to the user's current goals.

**Tagline:** *Your contacts are flat. Give them some depth.*

**Core Value Proposition:**
- **Problem:** Contact lists are shallow — just names and emails
- **Solution:** Gamified enrichment flows + AI-powered exploration that surfaces contextual relevance

---

## 2. Background/Problem Statement

### The Problem with Existing Contact Systems

| What They Capture | What Actually Matters |
|-------------------|----------------------|
| Name, email, phone | Why do I know this person? |
| Company, title | What are they actually good at? |
| Last contact date | When would they be relevant to something I'm working on? |
| Tags (manual) | How do they connect to my other contacts? |

**Gap:** Contact systems are structured for *storage*, not *activation*. Better Connections is structured for *leverage*.

### Target User
- Founders, investors, networkers with 100-500+ professional contacts
- Tech-literate but not engineers
- Value relationships but struggle to maintain context at scale

---

## 3. Goals

- [ ] Enable users to sign up with email/password and manage their account
- [ ] Provide full contact management (CRUD, search, filter, sort, pagination)
- [ ] Support CSV import with intelligent field mapping and duplicate detection
- [ ] Implement gamified 30-second enrichment flow with voice input
- [ ] Deliver AI-powered chat exploration with contextual "Why Now" relevance
- [ ] Generate personalized intro email drafts using GPT-4o-mini API
- [ ] Perform well with 500+ contacts
- [ ] Deploy to Railway with Docker

---

## 4. Non-Goals (Out of Scope for MVP)

- Team/collaboration features
- Mobile native applications
- Third-party data enrichment (Clearbit, Apollo, etc.)
- Calendar integration
- Email integration (Gmail, Outlook sync)
- Two-way sync with Google Contacts/LinkedIn (import only)
- Multi-language support
- Offline mode
- Browser extensions
- **OAuth authentication** (deferred to v1.1)
- **Connection outcome tracking** (deferred to v1.1)

---

## 5. Technical Dependencies

### Core Stack

| Dependency | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x+ | Full-stack framework (App Router) |
| React | 18.x+ | UI library |
| TypeScript | 5.x+ | Type safety |
| Tailwind CSS | 3.x+ | Styling |
| shadcn/ui | latest | UI component library |
| Prisma | 5.x+ | Database ORM |
| Supabase | latest | Auth + PostgreSQL hosting |

### AI & Specialized Libraries

| Dependency | Version | Purpose |
|------------|---------|---------|
| @ai-sdk/openai | latest | OpenAI GPT-4o-mini integration |
| ai (Vercel AI SDK) | 3.x+ | Streaming AI responses |
| framer-motion | 10.x+ | Physics-based animations |
| react-speech-recognition | 3.x+ | Web Speech API wrapper |
| react-resizable-panels | 2.x+ | Split-panel layouts |
| react-countdown-circle-timer | 3.x+ | Timer component |

### State Management

| Dependency | Version | Purpose |
|------------|---------|---------|
| @tanstack/react-query | 5.x+ | Server state management |
| zustand | 4.x+ | Client state management |

### Forms & Validation

| Dependency | Version | Purpose |
|------------|---------|---------|
| react-hook-form | 7.x+ | Form management |
| zod | 3.x+ | Schema validation |

### CSV Processing

| Dependency | Version | Purpose |
|------------|---------|---------|
| papaparse | 5.x+ | CSV parsing |
| react-csv-importer | latest | Import UI with field mapping |

### Icons

| Dependency | Version | Purpose |
|------------|---------|---------|
| lucide-react | latest | Icon library |

---

## 6. Detailed Design

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  App Router Pages        │  Components              │  Stores   │
│  ├── (auth)/             │  ├── ui/ (shadcn)        │  Zustand  │
│  │   ├── login           │  ├── layout/             │  TanStack │
│  │   ├── signup          │  ├── contacts/           │  Query    │
│  │   └── forgot          │  ├── enrichment/         │           │
│  └── (dashboard)/        │  ├── chat/               │           │
│      ├── contacts        │  └── import/             │           │
│      ├── enrich          │                          │           │
│      ├── explore         │                          │           │
│      └── settings        │                          │           │
├─────────────────────────────────────────────────────────────────┤
│                         API ROUTES                               │
│  /api/auth/*  /api/contacts/*  /api/enrichment/*  /api/chat/*   │
├─────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Supabase   │  │  Supabase   │  │    OpenAI GPT-4o-mini   │  │
│  │    Auth     │  │  PostgreSQL │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 File Structure

```
better-connections/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # App shell with sidebar
│   │   ├── contacts/
│   │   │   ├── page.tsx                  # Contacts table
│   │   │   ├── [id]/page.tsx             # Contact detail
│   │   │   ├── new/page.tsx              # Add contact
│   │   │   └── import/page.tsx           # CSV import
│   │   ├── enrich/
│   │   │   ├── page.tsx                  # Queue view
│   │   │   └── [id]/page.tsx             # Enrichment session
│   │   ├── explore/page.tsx              # Chat exploration
│   │   └── settings/page.tsx             # Account settings
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...supabase]/route.ts
│   │   ├── contacts/
│   │   │   ├── route.ts                  # GET (list), POST (create)
│   │   │   ├── [id]/route.ts             # GET, PUT, DELETE
│   │   │   ├── import/route.ts           # POST (CSV)
│   │   │   ├── export/route.ts           # GET (CSV)
│   │   │   └── bulk/route.ts             # DELETE, PATCH
│   │   ├── tags/route.ts                 # GET, POST
│   │   ├── enrichment/
│   │   │   ├── queue/route.ts            # GET
│   │   │   ├── stats/route.ts            # GET
│   │   │   └── [id]/skip/route.ts        # POST
│   │   └── chat/
│   │       ├── explore/route.ts          # POST (streaming)
│   │       └── draft-intro/route.ts      # POST
│   └── layout.tsx
├── components/
│   ├── ui/                               # shadcn/ui components
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── contacts/
│   │   ├── ContactsTable.tsx
│   │   ├── ContactCard.tsx
│   │   ├── ContactDetailView.tsx
│   │   ├── ContactForm.tsx
│   │   └── RelationshipStrength.tsx
│   ├── enrichment/
│   │   ├── EnrichmentTimer.tsx
│   │   ├── VoiceInput.tsx
│   │   ├── EnrichmentBubbles.tsx
│   │   ├── EnrichmentQueue.tsx
│   │   └── EnrichmentSummary.tsx
│   ├── chat/
│   │   ├── ChatExplorer.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ContactRecommendations.tsx
│   │   ├── WhyNowCard.tsx
│   │   └── DraftIntroModal.tsx
│   └── import/
│       ├── CSVUploader.tsx
│       ├── FieldMapper.tsx
│       └── ImportProgress.tsx
├── lib/
│   ├── db.ts                             # Prisma client singleton
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   └── server.ts                     # Server client
│   ├── openai.ts                         # AI SDK configuration
│   ├── enrichment.ts                     # Score calculation
│   ├── validation.ts                     # Zod schemas
│   └── utils.ts
├── stores/
│   ├── ui-store.ts                       # UI state (Zustand)
│   └── chat-store.ts                     # Chat history (Zustand)
├── hooks/
│   ├── use-contacts.ts                   # TanStack Query hooks
│   ├── use-enrichment.ts
│   └── use-speech.ts                     # Voice input hook
├── prisma/
│   └── schema.prisma
├── public/
├── styles/
│   └── globals.css
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### 6.3 Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  name                  String

  // Preferences
  emailNotifications    Boolean   @default(true)
  weeklyDigest          Boolean   @default(true)
  enrichmentReminders   Boolean   @default(false)

  // Metadata
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastLoginAt           DateTime?

  // Relations
  contacts              Contact[]
}

model Contact {
  id                    String    @id @default(uuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Basic Info
  name                  String
  email                 String?
  title                 String?
  company               String?
  location              String?
  linkedinUrl           String?
  phone                 String?

  // Relationship Context
  howWeMet              String?   @db.Text
  relationshipStrength  Int       @default(1) // 1=Weak, 2=Casual, 3=Good, 4=Strong
  lastContactDate       DateTime?
  relationshipHistory   String?   @db.Text

  // Why Now (Key Differentiator)
  whyNow                String?   @db.Text

  // Profile
  expertise             String?   @db.Text
  interests             String?   @db.Text
  notes                 String?   @db.Text

  // Metadata
  enrichmentScore       Int       @default(0) // 0-100
  source                ContactSource @default(MANUAL)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastEnrichedAt        DateTime?

  // Relations
  tags                  Tag[]

  @@index([userId])
  @@index([name])
  @@index([email])
  @@index([enrichmentScore])
}

model Tag {
  id        String      @id @default(uuid())
  contactId String
  contact   Contact     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  text      String
  category  TagCategory

  @@index([contactId])
}

enum ContactSource {
  MANUAL
  CSV
  GOOGLE
  LINKEDIN
  ICLOUD
  OUTLOOK
}

enum TagCategory {
  RELATIONSHIP
  OPPORTUNITY
  EXPERTISE
  INTEREST
}
```

### 6.4 Enrichment Score Calculation

```typescript
// lib/enrichment.ts

export function calculateEnrichmentScore(contact: Contact): number {
  let score = 0;

  // Basic Info (35 points)
  if (contact.name) score += 10;
  if (contact.email) score += 10;
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;

  // Relationship Context (35 points)
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20;  // MOST VALUABLE FIELD

  // Organization (15 points)
  if (contact.tags && contact.tags.length > 0) score += 5;
  if (contact.notes) score += 10;

  return Math.min(score, 100);
}

export function getEnrichmentPriority(contact: Contact): number {
  // Higher priority = needs enrichment more urgently
  const score = contact.enrichmentScore;
  const daysSinceCreation = getDaysSince(contact.createdAt);
  const daysSinceEnrichment = contact.lastEnrichedAt
    ? getDaysSince(contact.lastEnrichedAt)
    : Infinity;

  // Priority factors:
  // 1. Lower score = higher priority
  // 2. Newer contacts = higher priority
  // 3. Never enriched = highest priority

  let priority = (100 - score);
  if (daysSinceCreation < 7) priority += 20;
  if (daysSinceEnrichment === Infinity) priority += 30;
  if (contact.source === 'CSV') priority += 10;

  return priority;
}
```

### 6.5 API Endpoints

#### Authentication
```
POST /api/auth/signup         - Create account (Supabase)
POST /api/auth/login          - Login (returns session)
POST /api/auth/logout         - Logout
POST /api/auth/forgot         - Request password reset
POST /api/auth/reset          - Reset password with token
GET  /api/auth/session        - Get current session
```

#### Contacts
```
GET    /api/contacts          - List contacts (search, filter, sort, pagination)
POST   /api/contacts          - Create contact
GET    /api/contacts/:id      - Get single contact
PUT    /api/contacts/:id      - Update contact
DELETE /api/contacts/:id      - Delete contact
DELETE /api/contacts/bulk     - Bulk delete
PATCH  /api/contacts/bulk     - Bulk update (tags)

POST   /api/contacts/import   - Import from CSV
GET    /api/contacts/export   - Export as CSV
```

#### Tags
```
GET    /api/tags              - List all user tags
POST   /api/contacts/:id/tags - Add tag to contact
DELETE /api/contacts/:id/tags/:tagId - Remove tag
```

#### Enrichment
```
GET    /api/enrichment/queue  - Get prioritized queue
GET    /api/enrichment/stats  - Get enrichment statistics
POST   /api/enrichment/:id/skip - Skip contact in queue
```

#### AI / Chat
```
POST   /api/chat/explore      - Chat exploration (streaming)
POST   /api/chat/draft-intro  - Generate intro email
POST   /api/chat/suggest-tags - AI tag suggestions
```

#### User / Settings
```
GET    /api/user              - Get current user
PUT    /api/user              - Update profile
PUT    /api/user/password     - Change password
DELETE /api/user              - Delete account (with confirmation)
```

### 6.6 OpenAI GPT-4o-mini Integration

```typescript
// lib/openai.ts
import { openai } from '@ai-sdk/openai';

export const gpt4oMini = openai('gpt-4o-mini');

// Chat Exploration System Prompt
export const EXPLORATION_SYSTEM_PROMPT = `
You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

When suggesting contacts, format them as:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}

For each suggested contact, provide a "Why Now" explanation that:
- Is contextual to the user's current query
- References specific attributes of the contact
- Explains the strategic value of reaching out

Be helpful, concise, and focus on actionable insights about their network.
`;

// Draft Intro System Prompt
export const DRAFT_INTRO_SYSTEM_PROMPT = `
Write a brief, warm introduction message. The email should:
- Feel personal, not templated
- Reference shared context
- Have a clear but soft ask
- Match a professional but warm tone
- Be 2-3 sentences maximum
`;
```

### 6.7 API Route Example: Chat Exploration

```typescript
// app/api/chat/explore/route.ts
import { streamText } from 'ai';
import { gpt4oMini, EXPLORATION_SYSTEM_PROMPT } from '@/lib/openai';
import { createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await request.json();

  // Fetch user's contacts for context
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    include: { tags: true },
    take: 100, // Limit for context window
    orderBy: { enrichmentScore: 'desc' },
  });

  // Serialize contacts for prompt
  const contactContext = contacts.map(c => ({
    id: c.id,
    name: c.name,
    title: c.title,
    company: c.company,
    whyNow: c.whyNow,
    expertise: c.expertise,
    relationshipStrength: c.relationshipStrength,
    tags: c.tags.map(t => t.text),
  }));

  const systemPrompt = `${EXPLORATION_SYSTEM_PROMPT}

User's contacts:
${JSON.stringify(contactContext, null, 2)}
`;

  const result = await streamText({
    model: gpt4oMini,
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## 7. User Experience

### 7.1 Page Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTH FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /login ──────────────────────────────────────────┐             │
│     │                                              │             │
│     ├── Success ───────────────────────────────────┼──→ /contacts│
│     │                                              │             │
│     └── "Sign up" link ────────→ /signup ──────────┘             │
│                                     │                            │
│                                     └── Success → /contacts      │
│                                                                  │
│  /forgot-password → Email sent → /login                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MAIN APP FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /contacts (default landing) ─────────────────────────┐         │
│     │                                                  │         │
│     ├── Click contact row ──────→ /contacts/[id]      │         │
│     │                                                  │         │
│     ├── "Add Contact" ──────────→ /contacts/new       │         │
│     │                                                  │         │
│     ├── "Import CSV" ───────────→ /contacts/import    │         │
│     │                                                  │         │
│     └── Row action "Enrich" ────→ /enrich/[id]        │         │
│                                                        │         │
│  /enrich ───────────────────────────────────────────┐ │         │
│     │                                                │ │         │
│     ├── Shows queue with priorities                  │ │         │
│     │                                                │ │         │
│     └── "Start Session" or click ──→ /enrich/[id]   │ │         │
│            (gamified enrichment flow)                │ │         │
│                                                      │ │         │
│  /explore ──────────────────────────────────────────┼─┤         │
│     │                                                │ │         │
│     └── Chat → Contact cards → "Draft Intro" modal  │ │         │
│                                                      │ │         │
│  /settings ─────────────────────────────────────────┘ │         │
│     └── Profile, password, export, delete account     │         │
│                                                        │         │
└────────────────────────────────────────────────────────┘         │
```

### 7.2 Sidebar Navigation

```
┌─────────────────┐
│  BC             │  ← Logo (collapsible)
├─────────────────┤
│  ● Contacts     │  ← Badge: total count
│  ◐ Enrich       │  ← Badge: "X to enrich"
│  ○ Explore      │
│  ○ Settings     │
├─────────────────┤
│  ┌───────────┐  │
│  │ MG        │  │  ← Avatar + dropdown
│  │ Mbiyimoh  │  │
│  └───────────┘  │
└─────────────────┘
```

### 7.3 Key Component Behaviors

#### Contact Card (Chat Exploration)
- **Default:** Name, title, company, "Why Now" (truncated)
- **Hover:** + Location, last contact date, mutual connections
- **Expanded:** Full profile with all sections + action buttons

#### Enrichment Bubbles
- **Animation:** Spring physics (scale 0.8 → 1.05 → 1.0, 300ms)
- **Layout:** Organic positioning (not grid), subtle randomness
- **Colors:** Category-coded dots (blue/green/purple/amber)
- **Combo:** Clustered bubbles with gold glow for multi-category statements

#### Timer
- **Duration:** 30 seconds default
- **Controls:** +30 sec button, pause button
- **Visual:** Circular progress, color transition (gold → amber → red)
- **Pulse:** Gentle animation in last 10 seconds

---

## 8. Design System

### 8.1 Color Palette

```css
/* Background */
--bg-primary: #0D0D0F;      /* Main background */
--bg-secondary: #1A1A1F;    /* Cards, surfaces */
--bg-tertiary: #252529;     /* Elevated elements */
--bg-glass: rgba(26, 26, 31, 0.85);

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #A0A0A8;
--text-tertiary: #606068;

/* Gold Accent */
--gold-primary: #C9A227;
--gold-light: #E5C766;
--gold-subtle: rgba(201, 162, 39, 0.15);

/* Category Colors */
--category-relationship: #3B82F6;  /* Blue */
--category-opportunity: #22C55E;   /* Green */
--category-expertise: #A855F7;     /* Purple */
--category-interest: #F59E0B;      /* Amber */

/* Semantic */
--success: #4ADE80;
--warning: #FBBF24;
--error: #EF4444;

/* Border */
--border: rgba(255, 255, 255, 0.08);
```

### 8.2 Typography

```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* Scale */
--text-display: 32px;    /* H1 */
--text-heading: 24px;    /* H2 */
--text-title: 18px;      /* H3 */
--text-body: 14px;       /* Body */
--text-small: 13px;      /* Small */
--text-caption: 11px;    /* Caption (uppercase, tracked) */
```

### 8.3 Spacing & Radius

```css
/* Spacing (4px base) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;

/* Border Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### 8.4 Glassmorphism Levels

```css
/* Level 1 - Subtle */
background: rgba(26, 26, 31, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);

/* Level 2 - Medium */
background: rgba(37, 37, 41, 0.9);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.08);

/* Level 3 - Strong */
background: rgba(45, 45, 50, 0.95);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// Test enrichment score calculation
describe('calculateEnrichmentScore', () => {
  // Purpose: Verify score calculation weights each field correctly
  it('should return 0 for empty contact', () => {
    const contact = { name: '' };
    expect(calculateEnrichmentScore(contact)).toBe(0);
  });

  // Purpose: Verify "whyNow" has highest weight (20 points)
  it('should weight whyNow as 20 points', () => {
    const withWhyNow = { name: 'Test', whyNow: 'Important context' };
    const withoutWhyNow = { name: 'Test' };
    const diff = calculateEnrichmentScore(withWhyNow) - calculateEnrichmentScore(withoutWhyNow);
    expect(diff).toBe(20);
  });

  // Purpose: Verify max score is capped at 100
  it('should cap score at 100', () => {
    const fullContact = { /* all fields filled */ };
    expect(calculateEnrichmentScore(fullContact)).toBeLessThanOrEqual(100);
  });
});
```

### 9.2 Integration Tests

```typescript
// Test contact CRUD API
describe('Contacts API', () => {
  // Purpose: Verify authenticated users can create contacts
  it('should create contact for authenticated user', async () => {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Test Contact', email: 'test@example.com' }),
    });
    expect(response.status).toBe(201);
    const contact = await response.json();
    expect(contact.name).toBe('Test Contact');
    expect(contact.enrichmentScore).toBe(20); // name + email
  });

  // Purpose: Verify unauthenticated requests are rejected
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/contacts');
    expect(response.status).toBe(401);
  });
});
```

### 9.3 E2E Tests (Playwright)

```typescript
// Purpose: Verify complete user journey from signup to contact management
test('user can sign up and add first contact', async ({ page }) => {
  // Sign up
  await page.goto('/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'securepassword123');
  await page.fill('[name="name"]', 'Test User');
  await page.click('button[type="submit"]');

  // Should redirect to contacts (empty state)
  await expect(page).toHaveURL('/contacts');
  await expect(page.getByText('No contacts yet')).toBeVisible();

  // Add first contact
  await page.click('text=Add Contact');
  await page.fill('[name="name"]', 'John Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.click('button:has-text("Save")');

  // Should show in table
  await expect(page.getByText('John Doe')).toBeVisible();
});

// Purpose: Verify enrichment flow completes and updates score
test('user can enrich contact via gamified flow', async ({ page }) => {
  // Navigate to enrichment
  await page.goto('/enrich');
  await page.click('text=Start Session');

  // Verify timer starts
  await expect(page.getByText(':30')).toBeVisible();

  // Type enrichment text (simulating voice)
  await page.fill('[data-testid="enrichment-input"]',
    'Met at Google AI program. She is a potential LP with Sequoia connections.');

  // Verify bubbles appear
  await expect(page.locator('[data-testid="enrichment-bubble"]')).toHaveCount({ minimum: 2 });

  // Wait for timer or click complete
  await page.click('text=Complete');

  // Verify score updated
  await expect(page.getByText(/Enrichment score/)).toContainText(/[5-9][0-9]|100/);
});
```

### 9.4 Mocking Strategies

```typescript
// Mock Supabase Auth
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } }
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  }),
}));

// Mock OpenAI API for predictable responses
jest.mock('@ai-sdk/openai', () => ({
  openai: () => ({
    chat: jest.fn().mockResolvedValue({
      content: '[CONTACT: abc123] Sarah Chen - Relevant for F&F fundraising',
    }),
  }),
}));

// Mock Web Speech API
beforeAll(() => {
  global.webkitSpeechRecognition = class {
    start = jest.fn();
    stop = jest.fn();
    onresult = jest.fn();
    onerror = jest.fn();
  };
});
```

---

## 10. Performance Considerations

### 10.1 Database Optimization

```sql
-- Full-text search index
CREATE INDEX idx_contacts_search ON contacts USING gin(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(notes, '') || ' ' ||
    coalesce(why_now, '')
  )
);

-- Query optimization indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_enrichment_score ON contacts(enrichment_score);
CREATE INDEX idx_tags_contact_id ON tags(contact_id);
```

### 10.2 Frontend Optimization

- **Virtualization:** Use `@tanstack/react-virtual` for 500+ contact lists
- **Pagination:** 25 contacts per page default
- **Debouncing:** 300ms debounce on search input
- **Optimistic Updates:** TanStack Query mutation with rollback
- **Image Lazy Loading:** Contact avatars load on scroll

### 10.3 AI Response Optimization

- **Streaming:** All GPT-4o-mini responses use streaming
- **Context Limiting:** Top 100 contacts sent to GPT-4o-mini (sorted by enrichment score)
- **Prompt Caching:** Cache system prompts for repeated queries
- **Rate Limiting:** Client-side throttle of 1 request per second

---

## 11. Security Considerations

### 11.1 Authentication

- **Supabase Auth:** Handles password hashing, session management
- **Row-Level Security (RLS):** Users can only access their own data
- **CSRF Protection:** Next.js built-in CSRF tokens
- **Session Expiry:** 7-day refresh token, 1-hour access token

### 11.2 API Security

```typescript
// Middleware for protected routes
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && request.nextUrl.pathname.startsWith('/api')) {
    return new Response('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}
```

### 11.3 Data Protection

- **Input Validation:** Zod schemas on all API inputs
- **SQL Injection:** Prisma parameterized queries
- **XSS Prevention:** React's built-in escaping + DOMPurify for rich text
- **Rate Limiting:** Upstash Redis for API rate limiting (100 req/min)

### 11.4 Environment Security

```bash
# Required secrets (never commit!)
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

---

## 12. Documentation

### 12.1 To Create

- [ ] README.md with setup instructions
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component Storybook
- [ ] Deployment guide for Railway

### 12.2 To Update

- [ ] CLAUDE.md with implementation-specific patterns
- [ ] Database migration guides

---

## 13. Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Scope:**
1. Initialize Next.js 14 project with TypeScript
2. Configure Tailwind CSS with design system colors
3. Install and configure shadcn/ui
4. Set up Prisma with Supabase PostgreSQL
5. Implement Supabase Auth (email/password)
6. Create app shell with sidebar navigation
7. Build basic contact CRUD API
8. Create contacts table page (basic)

**Deliverables:**
- Working auth flow (signup, login, logout)
- App shell renders with navigation
- Can create/read/update/delete contacts via API
- Basic contacts table displays data

### Phase 2: Contact Management

**Scope:**
1. Complete contacts table with search/filter/sort
2. Add pagination (25 per page)
3. Build contact detail page with all sections
4. Implement tags system (CRUD + categories)
5. Create CSV import with field mapping
6. Add CSV export functionality
7. Implement bulk actions (delete, add tags)

**Deliverables:**
- Full-featured contacts table
- Contact detail view with inline editing
- Working CSV import/export
- Tag management system

### Phase 3: Enrichment System

**Scope:**
1. Implement enrichment score calculation
2. Build enrichment queue with prioritization
3. Create gamified enrichment page UI
4. Integrate react-countdown-circle-timer
5. Add voice input with react-speech-recognition
6. Build animated bubbles (Framer Motion)
7. Create post-enrichment summary view
8. Wire up enrichment saves to database

**Deliverables:**
- Enrichment queue shows prioritized contacts
- 30-second timer flow works
- Voice transcription creates bubbles
- Enrichment updates contact and score

### Phase 4: AI Features

**Scope:**
1. Configure Vercel AI SDK with OpenAI
2. Build chat exploration page layout
3. Implement streaming chat responses
4. Create contact recommendation cards
5. Add "Why Now" dynamic generation
6. Build contact pinning feature
7. Create draft intro modal
8. Implement reverse lookup feature

**Deliverables:**
- Chat exploration with GPT-4o-mini
- Contact cards with contextual relevance
- Working intro drafting with GPT-4o-mini
- Reverse lookup search

### Phase 5: Polish & Deployment

**Scope:**
1. Complete settings page functionality
2. Add comprehensive error handling
3. Implement loading states and skeletons
4. Optimize for 500+ contacts
5. Responsive design adjustments
6. Create Dockerfile and docker-compose
7. Deploy to Railway
8. Production testing and bug fixes

**Deliverables:**
- Production-ready application
- Railway deployment live
- Performance benchmarked at 500+ contacts
- All critical paths tested

---

## 14. Open Questions (Resolved)

1. **Supabase Project Configuration** ✅
   - **Project URL:** https://supabase.com/dashboard/project/hjmppbpunlhdbchbvgag
   - **Region:** Default region (as configured by Supabase)

2. **Railway Deployment** ✅
   - **Decision:** Deploy to Railway after local development is complete and verified
   - **Approach:** Full local testing first, then production deployment

3. **OpenAI API Limits** ✅
   - **Expected Usage:** Limited usage expected initially
   - **Tracking:** Defer usage tracking/alerts to post-MVP

4. **Data Migration** ✅
   - **Test Data:** Export Google Contacts as CSV for import testing
   - **Format:** CSV (Google Contacts export format)

---

## 15. References

### Design Documentation
- [Better_Connections_MVP_Design_Spec.md](../../Better_Connections_MVP_Design_Spec.md) — Page layouts and wireframes
- [Better_Connections_V1_Design_Spec.md](../../Better_Connections_V1_Design_Spec.md) — Design system and principles
- [Better_Connections_Vision.md](../../Better_Connections_Vision.md) — Product vision
- [Better_Connections_Building_Blocks.md](../../Better_Connections_Building_Blocks.md) — Library recommendations

### Prototype Files
- [BetterConnectionsPrototype.jsx](../../BetterConnectionsPrototype.jsx) — Gamified enrichment
- [AppShellContactsTable.jsx](../../AppShellContactsTable.jsx) — Contacts table
- [ContactDetailPage.jsx](../../ContactDetailPage.jsx) — Contact detail
- [AuthPages.jsx](../../AuthPages.jsx) — Auth flows

### External Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion/)
- [TanStack Query](https://tanstack.com/query/latest)

---

## 16. Test Credentials

**Development/Testing:**
- Email: mbiyimoh@gmail.com
- Password: MGinfinity09!

---

*Specification Version: 1.0*
*Last Updated: 2025-12-12*
