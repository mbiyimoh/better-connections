# Better Connections MVP

**Slug:** better-connections-mvp
**Author:** Claude Code
**Date:** 2025-12-12
**Branch:** preflight/better-connections-mvp
**Related:** Design specs, prototype JSX files, building blocks research

---

## 1) Intent & Assumptions

### Task Brief
Build the Better Connections MVP — a personal CRM / contact enrichment tool that helps users maintain deeper context about their professional network. Core features include gamified enrichment flows with voice input, chat-based network exploration using AI, and AI-assisted intro email drafting. Full stack implementation using Next.js, PostgreSQL, Prisma, and Claude API integration.

### Assumptions
- **Single-user product** — No team/sharing features in V1
- **Target: 500+ contacts** — Must perform well at this scale
- **Desktop-first** — Primary target is desktop, responsive for tablet/mobile secondary
- **Chrome primary browser** — Web Speech API works best in Chrome
- **User is tech-literate** — Founders, investors, networkers who understand value of CRM
- **Dark theme mandatory** — Matches 33 Strategies brand, non-negotiable
- **Voice input optional** — Should work with text input as fallback
- **No external enrichment APIs** — All enrichment comes from user input (no Clearbit, etc.)

### Out of Scope
- Team/collaboration features
- Mobile native apps
- Third-party data enrichment (Clearbit, Apollo, etc.)
- Calendar integration
- Email integration (Gmail, Outlook sync)
- Two-way sync with Google Contacts/LinkedIn (import only)
- Multi-language support
- Offline mode
- Browser extensions

---

## 2) Pre-reading Log

### Documentation Files
- `Better_Connections_Claude_Code_Handoff.md`: Complete technical handoff with data models, API endpoints, database schema, implementation phases, and tech stack recommendations
- `Better_Connections_MVP_Design_Spec.md`: Detailed UI/UX specifications for all pages including wireframes, component states, and interaction patterns
- `Better_Connections_V1_Design_Spec.md`: Design principles, color palette, typography, animation specifications, and progressive disclosure patterns
- `Better_Connections_Vision.md`: Product strategy, platform vs application model, strategic context for 33 Strategies
- `Better_Connections_Nice_to_Haves.md`: Future enhancements prioritized (P1/P2/P3), keyboard shortcuts, analytics dashboard
- `Better_Connections_Building_Blocks.md`: Library research with recommendations — Framer Motion, react-speech-recognition, shadcn/ui, react-resizable-panels

### Prototype Files (JSX with inline styles)
- `BetterConnectionsPrototype.jsx`: Original gamified enrichment + chat exploration interface
- `AppShellContactsTable.jsx`: Sidebar navigation + contacts table with search/filter/sort
- `AppShellWithContactDetail.jsx`: Combined shell with detail panel
- `ContactDetailPage.jsx`: Single contact view/edit with all fields
- `AddContactImportPage.jsx`: Manual entry + CSV import with field mapping
- `AuthPages.jsx`: Login, signup, forgot password flows
- `EnrichmentQueuePage.jsx`: Priority queue with stats and skip functionality
- `SettingsPage.jsx`: Account management, export, delete account

---

## 3) Codebase Map

### Current State: Greenfield Project
This is a brand new project with no existing application code. Only documentation and visual prototypes exist.

### Primary Components/Modules (To Be Built)
```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx                    # App shell with sidebar
│   ├── contacts/
│   │   ├── page.tsx                  # Contacts table
│   │   ├── [id]/page.tsx             # Contact detail
│   │   ├── new/page.tsx              # Add contact
│   │   └── import/page.tsx           # CSV import
│   ├── enrich/page.tsx               # Enrichment queue
│   ├── explore/page.tsx              # Chat exploration
│   └── settings/page.tsx             # Account settings
├── api/
│   ├── auth/[...nextauth]/route.ts   # Auth endpoints
│   ├── contacts/route.ts             # Contact CRUD
│   ├── contacts/[id]/route.ts
│   ├── contacts/import/route.ts      # CSV import
│   ├── contacts/export/route.ts      # CSV export
│   ├── enrichment/route.ts           # Queue management
│   ├── chat/explore/route.ts         # Claude chat
│   ├── chat/draft-intro/route.ts     # Intro drafting
│   └── tags/route.ts                 # Tag management

components/
├── ui/                               # shadcn/ui components
├── layout/
│   ├── AppShell.tsx                  # Sidebar + main area
│   ├── Sidebar.tsx
│   └── Header.tsx
├── contacts/
│   ├── ContactsTable.tsx
│   ├── ContactCard.tsx
│   ├── ContactDetailView.tsx
│   └── ContactForm.tsx
├── enrichment/
│   ├── EnrichmentTimer.tsx
│   ├── VoiceInput.tsx
│   ├── EnrichmentBubbles.tsx
│   └── EnrichmentQueue.tsx
├── chat/
│   ├── ChatExplorer.tsx
│   ├── ChatMessage.tsx
│   ├── ContactRecommendations.tsx
│   └── DraftIntroModal.tsx
└── import/
    ├── CSVUploader.tsx
    └── FieldMapper.tsx

lib/
├── db.ts                             # Prisma client
├── auth.ts                           # Auth helpers
├── claude.ts                         # Claude API client
├── enrichment.ts                     # Score calculation
└── utils.ts                          # Shared utilities

prisma/
└── schema.prisma                     # Database schema
```

### Shared Dependencies (To Be Installed)
- **UI Framework:** shadcn/ui, Tailwind CSS, Framer Motion, Lucide React
- **State:** TanStack Query (server state), Zustand (client state)
- **Forms:** React Hook Form, Zod (validation)
- **Database:** Prisma ORM
- **Auth:** Supabase Auth
- **AI:** Vercel AI SDK + Anthropic Claude
- **Voice:** react-speech-recognition
- **Panels:** react-resizable-panels
- **Timer:** react-countdown-circle-timer
- **CSV:** react-csv-importer or papaparse

### Data Flow
```
User Input → React Component → API Route → Prisma → PostgreSQL
                                    ↓
                              Claude API (for AI features)
                                    ↓
                              Streaming Response → UI Update
```

### Feature Flags/Config
- `ENABLE_VOICE_INPUT`: Toggle voice transcription (browser support varies)
- `ENABLE_AI_FEATURES`: Toggle Claude integration (for dev without API key)
- Environment variables for API keys (ANTHROPIC_API_KEY, etc.)

### Potential Blast Radius
Since this is greenfield, all code is new. Key integration points:
- **Auth ↔ All protected routes** — Auth decisions affect everything
- **Database schema ↔ All features** — Schema changes ripple through entire app
- **Claude API ↔ Chat + Enrichment + Drafting** — AI integration affects 3 major features

---

## 4) Root Cause Analysis

**Not applicable** — This is a new feature build, not a bug fix.

---

## 5) Research Findings

### 1. Authentication Strategy

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Supabase Auth** | Integrated DB + auth, RLS built-in, OAuth support, great DX | Vendor lock-in, less customizable | **RECOMMENDED** |
| NextAuth.js | Flexible, many providers, self-hosted | More setup, separate DB needed, v5 still maturing | Good alternative |

**Recommendation:** Supabase Auth
- Row-Level Security for multi-user future
- Built-in OAuth for Google/Apple
- Session management included
- Single service for auth + database

### 2. Database Hosting

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Supabase** | Integrated with auth, real-time, generous free tier | Less flexible Postgres | Free tier good |
| Railway | Simple deploy, good DX | No serverless scaling | $5/month minimum |

**Recommendation:** Supabase PostgreSQL (integrated with Supabase Auth)
- Serverless scale-to-zero for MVP cost efficiency
- Database branching for dev/staging
- Sufficient for 500+ contacts

### 3. Real-time Speech-to-Text

| Option | Pros | Cons |
|--------|------|------|
| **Web Speech API (react-speech-recognition)** | Free, browser-native, real-time | Chrome-only optimal, no offline |
| Azure Speech Services | Production quality, many languages | Paid, additional complexity |
| Deepgram | Fast, accurate | Paid |

**Recommendation:** Web Speech API via react-speech-recognition
- Zero cost for MVP
- Sufficient quality for enrichment use case
- Can upgrade to Azure/Deepgram later if needed

**Implementation Pattern:**
```typescript
const { transcript, listening, resetTranscript } = useSpeechRecognition();

// Use interimResults for real-time bubble updates
// Parse transcript to extract structured data for bubbles
```

### 4. Claude API Integration

**Recommendation:** Vercel AI SDK v4+ with Anthropic provider
- Native Next.js integration
- Streaming responses built-in
- Token counting and management
- Prompt caching reduces costs by 90%

**Code Pattern:**
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const result = await streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages: [...],
  system: systemPrompt,
});

return result.toDataStreamResponse();
```

**Rate Limiting:** Implement at API route level with Upstash Redis or in-memory for MVP.

### 5. CSV Import

| Option | Pros | Cons |
|--------|------|------|
| **react-csv-importer** | Complete UI, drag-drop field mapping | Less customizable UI |
| papaparse + custom UI | Full control, streaming support | More dev time |

**Recommendation:** react-csv-importer for MVP
- Built-in field mapping UI
- Handles large files with streaming
- Can customize styling to match dark theme

**Duplicate Detection:** Hash on email, show preview before import.

### 6. Contact Search/Filter

**Recommendation:** PostgreSQL Full-Text Search (built-in)
- Sufficient for 500+ contacts
- Zero additional cost
- GIN indexes for performance

**Schema:**
```sql
CREATE INDEX idx_contacts_search ON contacts USING gin(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(notes, '')
  )
);
```

**Upgrade path:** Meilisearch or Algolia if search becomes bottleneck.

### 7. State Management

**Recommendation:** TanStack Query + Zustand (complementary)
- **TanStack Query:** Server state (contacts, user data)
- **Zustand:** Client state (UI state, chat history, filters)

**Pattern:**
```typescript
// TanStack Query for server data
const { data: contacts } = useQuery({
  queryKey: ['contacts', filters],
  queryFn: () => fetchContacts(filters),
});

// Zustand for UI state
const useUIStore = create((set) => ({
  selectedContactId: null,
  chatHistory: [],
  setSelectedContact: (id) => set({ selectedContactId: id }),
}));
```

### 8. Animation Library

**Recommendation:** Framer Motion (already decided in Building Blocks)
- Physics-based spring animations for bubbles
- AnimatePresence for mount/unmount
- Layout animations for list reordering

---

## 6) Clarifications Needed

Before implementation, the following decisions would benefit from user input:

### 1. Hosting Provider
**Question:** All-in-one Supabase (auth + database) or split services?
- **Option A:** Supabase for everything — Simpler, integrated, good for MVP
- **Option B:** Split auth and database providers — More flexible, better Postgres features
- **Recommendation:** Option A for faster MVP
>> Option A

### 2. Deployment Platform
**Question:** Where should we deploy?
- **Option A:** Vercel — Best Next.js integration, free tier
- **Option B:** Railway — More control, Docker support
- **Option C:** Fly.io — Edge deployment
- **Recommendation:** Vercel for simplicity
>> Railway

### 3. Claude Model Selection
**Question:** Which Claude model for chat/drafting?
- **Option A:** Claude Sonnet 4 — Best balance of quality and cost
- **Option B:** Claude Haiku — Faster, cheaper, may suffice for drafting
- **Recommendation:** Sonnet for exploration, Haiku for intro drafting
>> I'm aligned with your recommendation

### 4. MVP Scope Trimming
**Question:** Any features to defer from initial release?
- Voice input (use text-only first)
- Google/LinkedIn OAuth (email/password only)
- Intro drafting (chat exploration first)
- Reverse lookup
- Connection outcome tracking
>> email/password only for now (we'll add OAuth later); and connection outcome tracking. keep the rest 

### 5. Test Credentials
**Question:** What email/password for development testing?
- Need test account credentials for auth flow development
email: mbiyimoh@gmail.com
pw: MGinfinity09!

### 6. Environment Setup
**Question:** Do you have existing accounts for:
- Supabase (or preferred auth/DB provider)
- Anthropic API key
- Vercel (or preferred hosting)
>> yes, I have all of those

---

## 7) Recommended Implementation Approach

### Architecture Decision: Monolithic Next.js
Given MVP scope and single-developer context, recommend:
- **Next.js 14+ App Router** for full stack
- **API Routes** for backend (no separate Express)
- **Server Components** for data fetching where possible
- **Client Components** for interactive features

### Phased Implementation (from Handoff Doc)

#### Phase 1: Core Infrastructure (Foundation)
1. Project setup (Next.js, Tailwind, shadcn/ui, Prisma)
2. Database schema and migrations
3. Supabase Auth integration (email/password)
4. App shell with sidebar navigation
5. Basic contact CRUD

#### Phase 2: Contact Management
6. Contacts table with search/filter/sort
7. Contact detail view with editing
8. Tags system (CRUD, categories)
9. CSV import with field mapping
10. CSV export

#### Phase 3: Enrichment System
11. Enrichment score calculation
12. Enrichment queue with prioritization
13. Basic enrichment flow (form-based)
14. Gamified timer + voice input
15. Real-time bubble animations

#### Phase 4: AI Features
16. Claude API integration (Vercel AI SDK)
17. Chat exploration interface
18. Contact recommendations with "Why Now"
19. Draft intro generation

#### Phase 5: Polish
20. OAuth (Google, Apple)
21. Settings page functionality
22. Error handling and loading states
23. Performance optimization
24. Responsive adjustments

### Success Criteria
- [ ] User can sign up with email/password
- [ ] User can log in and see contacts table
- [ ] User can add contacts manually
- [ ] User can import contacts from CSV
- [ ] User can view, edit, and delete contacts
- [ ] User can search and filter contacts
- [ ] User can enrich contacts through guided flow
- [ ] User can explore network via chat with AI
- [ ] User can generate intro email drafts
- [ ] User can export all contacts
- [ ] App performs well with 500+ contacts

---

## 8) Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Web Speech API browser support | Medium | Text input fallback, browser detection |
| Claude API rate limits | Medium | Implement backoff, queue requests |
| CSV import performance (large files) | Low | Streaming parser, chunked processing |
| State sync (optimistic updates) | Medium | TanStack Query cache invalidation |
| Auth session management | High | Use Supabase built-in session handling |
| Scope creep | High | Strict adherence to MVP feature set |

---

## Next Steps

1. **User confirms clarifications** (hosting, model selection, scope)
2. **Create detailed specification** using `/spec:create` or `/spec:ideate-to-spec`
3. **Initialize project** with Next.js + dependencies
4. **Begin Phase 1 implementation**

---

*Document generated: 2025-12-12*
*Ready for specification phase*
