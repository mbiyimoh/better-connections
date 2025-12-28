# Better Connections - Claude Code Project Documentation

## Overview

**Better Connections** is a personal CRM / contact enrichment tool that helps users maintain deeper context about their professional network. The core insight is that most contact management is "flat" — just names and emails — while valuable relationships require rich context about *why* someone matters *right now*.

**Tagline:** *Your contacts are flat. Give them some depth.*

**Target User:** Founders, investors, networkers with 100-500+ professional contacts who are tech-literate but not engineers.

---

## Working with This User

**User Profile:** Technically literate product owner but NOT an engineer. Claude handles 100% of technical operations.

**Critical Rules:**
- NEVER ask user to run CLI commands - execute them directly via Bash
- NEVER ask user to check database - use Prisma CLI or SQL via Bash
- Run ALL commands proactively (npm, git, docker, prisma, etc.)
- Handle errors autonomously; only escalate when user input truly needed

---

## Design System (33 Strategies Brand)

**When modifying ANY frontend/UI code, follow the Better Connections design system.**

### Colors
```javascript
const colors = {
  bg: {
    primary: '#0D0D0F',    // Main background
    secondary: '#1A1A1F',  // Cards, surfaces
    tertiary: '#252529',   // Elevated elements
    glass: 'rgba(26, 26, 31, 0.85)', // Glassmorphism
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A8',
    tertiary: '#606068',
  },
  gold: {
    primary: '#C9A227',    // Primary accent
    light: '#E5C766',      // Hover states
    subtle: 'rgba(201, 162, 39, 0.15)', // Backgrounds
  },
  category: {
    relationship: '#3B82F6', // Blue
    opportunity: '#22C55E',  // Green
    expertise: '#A855F7',    // Purple
    interest: '#F59E0B',     // Amber
  },
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#4ADE80',
  error: '#EF4444',
  warning: '#FBBF24',
};
```

### Typography
```
Font Family:    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Heading 1:      32px / 700
Heading 2:      24px / 600
Heading 3:      18px / 600
Body:           14px / 400
Small:          13px / 400
Caption:        11px / 600 / uppercase / letter-spacing: 1px
```

### Spacing Scale
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Border Radius
```
Small:    6px
Medium:   8px
Large:    12px
Cards:    16px
```

### Key Patterns
- **Dark theme is mandatory** - matches 33 Strategies brand
- **Gold accent (#C9A227)** - Primary brand color throughout
- **Glassmorphism** - Use backdrop-blur with rgba backgrounds for elevated surfaces
- **No emojis in UI** - Use Lucide React icons instead
- **Framer Motion** - All animations use Framer Motion

---

## Key Design Decisions (Non-Negotiable for V1)

1. **Dark theme** — Not negotiable for V1, matches 33 Strategies brand
2. **Gold accent** (#C9A227) — Primary brand color throughout
3. **"Why Now" as core differentiator** — Most weighted field in enrichment score (20 points)
4. **Four tag categories** — relationship, opportunity, expertise, interest (color-coded)
5. **4-level relationship strength** — Weak, Casual, Good, Strong (visual dots)
6. **Gamified enrichment** — Not a form, a guided conversation flow with 30-second timer
7. **Chat-first exploration** — Natural language queries, not just search
8. **Source tracking** — Know where each contact came from
9. **No team/sharing in V1** — Single-user product first

---

## Tech Stack (Actual)

### Core
- **Frontend:** Next.js 14+ (App Router) + React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Animation:** Framer Motion (physics-based, gesture support)
- **Icons:** Lucide React

### Backend
- **API:** Next.js API routes
- **Database:** Supabase PostgreSQL (hosted at `pooler.supabase.com`)
- **ORM:** Prisma
- **Auth:** Supabase Auth (email/password)

### AI Integration
- **Enrichment Extraction:** OpenAI GPT-4o-mini (via Vercel AI SDK)
- **Notes Merging:** OpenAI GPT-4o-mini
- **Chat/Exploration:** OpenAI GPT-4o-mini

### Special Features
- **Speech-to-Text:** react-speech-recognition (Web Speech API)
- **Split Panels:** react-resizable-panels
- **Countdown Timer:** react-countdown-circle-timer (for enrichment flow)

---

## Data Models

### Contact
```typescript
interface Contact {
  id: string;
  userId: string;

  // Basic Info
  name: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  phone?: string;

  // Relationship Context
  howWeMet?: string;
  relationshipStrength: 1 | 2 | 3 | 4; // Weak, Casual, Good, Strong
  lastContactDate?: Date;
  relationshipHistory?: string;

  // Why Now (Key Differentiator - 20 points in enrichment score)
  whyNow?: string;

  // Profile
  expertise?: string;
  interests?: string;

  // Organization
  tags: Tag[];
  notes?: string;

  // Metadata
  enrichmentScore: number; // 0-100, calculated from field completeness
  source: 'manual' | 'csv' | 'google' | 'linkedin' | 'icloud' | 'outlook';
  createdAt: Date;
  updatedAt: Date;
  lastEnrichedAt?: Date;
}
```

### Enrichment Score Calculation
```typescript
function calculateEnrichmentScore(contact: Contact): number {
  let score = 0;

  if (contact.name) score += 10;
  if (contact.email) score += 10;
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20;  // Most valuable field
  if (contact.tags.length > 0) score += 5;
  if (contact.notes) score += 10;

  return score; // Max 100
}
```

### Tag
```typescript
interface Tag {
  id: string;
  text: string;
  category: 'relationship' | 'opportunity' | 'expertise' | 'interest';
}
```

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;

  // Connected Accounts
  googleConnected: boolean;
  googleEmail?: string;
  linkedinConnected: boolean;
  icloudConnected: boolean;
  outlookConnected: boolean;

  // Preferences
  emailNotifications: boolean;
  weeklyDigest: boolean;
  enrichmentReminders: boolean;

  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
}
```

---

## API Endpoints

### Auth
```
POST /api/auth/signup        - Create account
POST /api/auth/login         - Login (returns JWT)
POST /api/auth/logout        - Logout
POST /api/auth/forgot        - Request password reset
POST /api/auth/reset         - Reset password with token
POST /api/auth/google        - OAuth with Google
POST /api/auth/apple         - OAuth with Apple
```

### Contacts
```
GET    /api/contacts                - List contacts (with search, filter, sort, pagination)
GET    /api/contacts/:id            - Get single contact
POST   /api/contacts                - Create contact
PUT    /api/contacts/:id            - Update contact
DELETE /api/contacts/:id            - Delete contact
DELETE /api/contacts/bulk           - Bulk delete

POST   /api/contacts/import/csv     - Import from CSV
POST   /api/contacts/import/google  - Import from Google Contacts
GET    /api/contacts/export         - Export all contacts as CSV
```

### Tags
```
GET    /api/tags                    - List all tags for user
POST   /api/contacts/:id/tags       - Add tag to contact
DELETE /api/contacts/:id/tags/:tagId - Remove tag from contact
```

### Enrichment Queue
```
GET    /api/enrichment/queue        - Get prioritized queue
GET    /api/enrichment/stats        - Get enrichment stats
POST   /api/enrichment/:id/skip     - Skip contact in queue
```

### AI / Chat (Claude Integration)
```
POST   /api/chat/explore            - Send exploration query, get response + contact suggestions
POST   /api/chat/draft-intro        - Generate intro draft for contact
POST   /api/chat/suggest-tags       - Get AI tag suggestions for contact
```

### User / Settings
```
GET    /api/user                    - Get current user
PUT    /api/user                    - Update user profile
PUT    /api/user/password           - Change password
DELETE /api/user                    - Delete account
```

---

## Page Architecture

```
/                       → Redirect to /login or /contacts
/login                  → Login page
/signup                 → Signup page
/forgot-password        → Password reset request
/contacts               → Main contacts table (default landing after auth)
/contacts/new           → Add contact manually
/contacts/import        → Import contacts (CSV, integrations)
/contacts/:id           → Contact detail/edit page
/enrich                 → Enrichment queue page
/explore                → Chat-based network exploration
/settings               → Account settings
```

### App Shell
- Sidebar width: 240px (expanded), 64px (collapsed)
- Background: #0D0D0F
- Border-right: 1px solid rgba(255,255,255,0.08)
- Active nav state: Gold left border + subtle gold background

---

## Claude AI Integration

### Chat Exploration Prompt Template
```
You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

User's contacts: {serialized_contacts}

User query: {user_message}

Respond conversationally and suggest relevant contacts from their network.
When suggesting contacts, format them as:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}

Be helpful, concise, and focus on actionable insights about their network.
```

### Draft Intro Prompt Template
```
Write a brief, warm introduction message for the following context:

Contact: {contact_name}
Their role: {contact_title} at {contact_company}
How we know each other: {how_we_met}
Why reaching out now: {why_now}
User's goal: {user_intent if provided}

Write a 2-3 sentence intro that:
- Feels personal, not templated
- References shared context
- Has a clear but soft ask
- Matches a professional but warm tone
```

---

## Prototype Files Reference

All prototype files are JSX using inline styles (no Tailwind) for universal rendering.
They use Framer Motion for animations and Lucide React for icons.

| File | Description |
|------|-------------|
| `BetterConnectionsPrototype.jsx` | Original gamified enrichment + chat |
| `AppShellContactsTable.jsx` | Sidebar nav + contacts table |
| `AppShellWithContactDetail.jsx` | Combined shell with detail view |
| `ContactDetailPage.jsx` | Single contact view/edit |
| `AddContactImportPage.jsx` | Add/import contacts |
| `AuthPages.jsx` | Login/signup/forgot |
| `EnrichmentQueuePage.jsx` | Queue management |
| `SettingsPage.jsx` | Account settings |

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Database setup and migrations
2. Auth system (signup, login, password reset)
3. Basic CRUD for contacts
4. Contact list with search/filter/sort

### Phase 2: Contact Management
5. Contact detail view with editing
6. Tags system
7. CSV import with field mapping
8. Export functionality

### Phase 3: Enrichment
9. Enrichment score calculation
10. Enrichment queue with prioritization
11. Basic enrichment flow (form-based first)
12. Gamified enrichment with timer (voice-first)

### Phase 4: AI Features
13. Claude integration for chat exploration
14. Draft intro generation
15. AI tag suggestions

### Phase 5: Polish
16. OAuth integrations (Google, LinkedIn)
17. Settings page functionality
18. Notifications system
19. Performance optimization

---

## Success Metrics for V1

- User can sign up and log in
- User can add contacts manually
- User can import contacts from CSV
- User can view, edit, and delete contacts
- User can search and filter contacts
- User can enrich contacts through guided flow
- User can explore network via chat
- User can export all contacts
- App performs well with 500+ contacts

---

## Key Documentation Files

| File | Purpose |
|------|---------|
| `Better_Connections_Claude_Code_Handoff.md` | Full technical handoff |
| `Better_Connections_MVP_Design_Spec.md` | Detailed UI/UX specifications |
| `Better_Connections_Vision.md` | Product vision and strategy |
| `Better_Connections_Nice_to_Haves.md` | Future enhancements |
| `Better_Connections_Building_Blocks.md` | Library/framework research |
| `Better_Connections_V1_Design_Spec.md` | V1 specific design spec |

---

## Quick Reference

**Project:** Better Connections (Personal CRM)
**Stack:** Next.js 14 + Supabase PostgreSQL + Prisma + OpenAI GPT-4o-mini + shadcn/ui
**Auth:** Supabase Auth (email/password)
**Design:** Dark theme, gold accents (#C9A227), glassmorphism
**Core Feature:** "Why Now" contextual relevance for contacts
**Last Updated:** 2025-12-27
