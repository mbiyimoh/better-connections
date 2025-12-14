# Better Connections MVP — Claude Code Handoff Document

## Overview

**Better Connections** is a personal CRM / contact enrichment tool that helps users maintain deeper context about their professional network. The core insight is that most contact management is "flat" — just names and emails — while valuable relationships require rich context about *why* someone matters *right now*.

### Core Value Proposition
- **The Problem:** Contact lists are shallow. When you need to reach out to someone, you can't remember how you met, why they matter, or what's relevant about them today.
- **The Solution:** A tool that makes capturing and maintaining relationship context effortless through gamified enrichment flows and AI-assisted exploration.

### Target User
- Founders, investors, networkers with 100-500+ professional contacts
- Tech-literate but not engineers
- Value relationships but struggle to maintain context at scale

---

## What's Been Built (Prototypes)

All prototypes are React/JSX files using inline styles (no Tailwind) for universal rendering. They use Framer Motion for animations and Lucide React for icons.

### File Inventory

| File | Description | Key Features |
|------|-------------|--------------|
| `BetterConnectionsPrototype.jsx` | Original gamified enrichment flow + chat exploration | Voice-first enrichment, AI chat interface, contact cards, draft intro modal |
| `AppShellContactsTable.jsx` | App shell with sidebar + contacts table | Navigation, search, filters, sorting, bulk selection, pagination |
| `ContactDetailPage.jsx` | Single contact view/edit | Profile header, Why Now section, editable fields, tags, quick actions |
| `AddContactImportPage.jsx` | Add contact form + import | Manual entry, CSV upload, field mapping, Google/iCloud/LinkedIn/Outlook integrations |
| `AuthPages.jsx` | Login, Signup, Forgot Password | Form validation, social auth buttons, password strength, success states |
| `EnrichmentQueuePage.jsx` | Priority queue of contacts needing attention | Stats card, filter tabs, priority badges, skip/enrich actions |
| `SettingsPage.jsx` | Account management | Profile editing, password change, connected accounts, notifications, export, delete account |

### Design System (Implemented in Prototypes)

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

**Typography:** System fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)

**Spacing:** 4px base scale (4, 8, 12, 16, 20, 24, 32, 48, 64)

**Border Radius:** 6px (small), 8px (medium), 12px (large), 16px (cards)

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
  
  // Why Now (Key Differentiator)
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

---

## API Endpoints Needed

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
POST   /api/contacts/import/linkedin - Import from LinkedIn
POST   /api/contacts/import/icloud  - Import from iCloud
POST   /api/contacts/import/outlook - Import from Outlook

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

GET    /api/user/connections        - Get connected account status
POST   /api/user/connections/:provider - Connect account
DELETE /api/user/connections/:provider - Disconnect account
```

---

## Technical Architecture Recommendations

### Stack Suggestion
- **Frontend:** React (Next.js recommended for SSR/routing)
- **Backend:** Node.js with Express or Next.js API routes
- **Database:** PostgreSQL (relational data, full-text search support)
- **Auth:** NextAuth.js or similar (handles OAuth flows)
- **AI:** Claude API (Anthropic) for chat exploration and content generation
- **File Storage:** S3 or similar for CSV uploads
- **Hosting:** Vercel (frontend) + Railway/Render (backend) or all-in-one with Vercel

### Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_connected BOOLEAN DEFAULT FALSE,
  google_email VARCHAR(255),
  linkedin_connected BOOLEAN DEFAULT FALSE,
  icloud_connected BOOLEAN DEFAULT FALSE,
  outlook_connected BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  enrichment_reminders BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  title VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  linkedin_url VARCHAR(500),
  phone VARCHAR(50),
  how_we_met TEXT,
  relationship_strength INTEGER DEFAULT 1 CHECK (relationship_strength BETWEEN 1 AND 4),
  last_contact_date DATE,
  relationship_history TEXT,
  why_now TEXT,
  expertise TEXT,
  interests TEXT,
  notes TEXT,
  enrichment_score INTEGER DEFAULT 0,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_enriched_at TIMESTAMP
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  text VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('relationship', 'opportunity', 'expertise', 'interest'))
);

-- Indexes for search/filter performance
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_enrichment_score ON contacts(enrichment_score);
CREATE INDEX idx_tags_contact_id ON tags(contact_id);

-- Full-text search
CREATE INDEX idx_contacts_search ON contacts USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(company, '') || ' ' || coalesce(notes, ''))
);
```

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

## Implementation Priority

### Phase 1: Core Infrastructure (Week 1-2)
1. Database setup and migrations
2. Auth system (signup, login, password reset)
3. Basic CRUD for contacts
4. Contact list with search/filter/sort

### Phase 2: Contact Management (Week 2-3)
5. Contact detail view with editing
6. Tags system
7. CSV import with field mapping
8. Export functionality

### Phase 3: Enrichment (Week 3-4)
9. Enrichment score calculation
10. Enrichment queue with prioritization
11. Basic enrichment flow (form-based first)

### Phase 4: AI Features (Week 4-5)
12. Claude integration for chat exploration
13. Draft intro generation
14. AI tag suggestions

### Phase 5: Polish (Week 5-6)
15. OAuth integrations (Google, LinkedIn)
16. Settings page functionality
17. Notifications system
18. Performance optimization

---

## Key Design Decisions Already Made

1. **Dark theme** — Not negotiable for V1, matches 33 Strategies brand
2. **Gold accent** (#C9A227) — Primary brand color throughout
3. **"Why Now" as core differentiator** — Most weighted field in enrichment score
4. **Four tag categories** — relationship, opportunity, expertise, interest (color-coded)
5. **4-level relationship strength** — Weak, Casual, Good, Strong (visual dots)
6. **Gamified enrichment** — Not a form, a guided conversation flow
7. **Chat-first exploration** — Natural language queries, not just search
8. **Source tracking** — Know where each contact came from
9. **No team/sharing in V1** — Single-user product first

---

## Files to Reference

All prototype files are in the project directory:

```
/mnt/user-data/outputs/
├── BetterConnectionsPrototype.jsx    # Original enrichment + chat
├── AppShellContactsTable.jsx         # Sidebar + contacts table
├── ContactDetailPage.jsx             # Single contact view
├── AddContactImportPage.jsx          # Add/import contacts
├── AuthPages.jsx                     # Login/signup/forgot
├── EnrichmentQueuePage.jsx           # Queue management
├── SettingsPage.jsx                  # Account settings
├── Better_Connections_MVP_Design_Spec.md  # Full design specification
└── Better_Connections_Nice_to_Haves.md    # Future features list
```

---

## Questions for Implementation

1. **Hosting preference?** — All-in-one (Vercel) vs split (Vercel + Railway)?
2. **Auth provider?** — NextAuth.js, Clerk, Auth0, or custom?
3. **Database host?** — Supabase, Neon, Railway Postgres, or PlanetScale?
4. **Claude API key management?** — Server-side only or client-side with proxy?
5. **MVP scope confirmation** — Any features to cut or add before starting?

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

*This document should give you full context to begin implementation. The prototypes show exactly how each screen should look and behave. Focus on functionality first, visual polish second — the design system is already defined.*

*Generated: December 2024*
