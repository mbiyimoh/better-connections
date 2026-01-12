# Contact Deep Research Feature

**Slug:** contact-deep-research
**Author:** Claude Code
**Date:** 2026-01-10
**Branch:** preflight/contact-deep-research
**Related:** `docs/research-run-technical-summary.md` (Guru Builder reference implementation)

---

## 1) Intent & Assumptions

**Task Brief:** Build functionality that enables users to run a "deep research" run on any contact in their CRM. The feature searches the internet for public information about the person, synthesizes findings into a written report with a bulleted summary, and generates discrete recommendations for profile updates (expertise, professional background, interests, tags, whyNow, etc.) that users can review, edit, and apply.

**Assumptions:**
- Users have at minimum a name for the contact; additional context (company, title, LinkedIn URL) improves research quality
- Public information is sufficient for meaningful enrichment (not requiring paid data providers)
- Research can complete in <30 seconds, avoiding need for complex background job infrastructure
- Users want human-in-the-loop control over what gets added to profiles (not auto-apply)
- Single-user product means no concurrent research rate limiting concerns initially
- Tavily API is available and suitable (already proven in Guru Builder)

**Out of Scope:**
- Paid data enrichment APIs (Clearbit, Apollo, ZoomInfo) - future consideration
- Automated/scheduled research runs (manual trigger only for V1)
- Research across multiple contacts simultaneously (batch research)
- LinkedIn scraping or authenticated API access
- Contact photo/avatar enrichment
- Real-time news monitoring or alerts

---

## 2) Pre-reading Log

- `docs/research-run-technical-summary.md`: Comprehensive 1,157-line technical breakdown of Guru Builder's research system. Key patterns: Tavily integration, Zod schemas for OpenAI structured outputs (`.nullable().optional()` pattern), two-phase async jobs with Inngest, recommendation generation with confidence filtering, refinement flow, inline diff visualization, apply transactions with audit logs.

- `prisma/schema.prisma`: Contact model with 20+ fields including enrichment targets (expertise, interests, whyNow, notes, title, company). Existing Tag model with 4 categories. EnrichmentScore 0-100 with whyNow as highest value (20 points).

- `src/lib/openai.ts`: Existing AI integration patterns - gpt4oMini model, generateObject with Zod, streamText for chat, system prompts for exploration/enrichment/tags. Lazy client initialization pattern.

- `src/lib/schemas/enrichmentInsight.ts`: Example Zod schemas for AI structured outputs. Pattern for extraction requests/responses.

- `src/app/api/enrichment/extract/route.ts`: Standard API route pattern with Supabase auth, Zod validation, generateObject call, error handling.

- `src/app/(dashboard)/explore/page.tsx`: 779-line example of chat interface with contact suggestions. Streaming responses, contact chip parsing, real-time panel updates.

- `src/lib/chat-parser.ts`: Contact reference parsing with `[CONTACT: id]` regex pattern. 3-tier matching (ID → email → name).

- `src/components/enrichment/completion/`: Gamification UI patterns - score animations, rank changes, tag suggestions with edit modal, mentioned people sections.

---

## 3) Codebase Map

### Primary Components/Modules

| File | Role |
|------|------|
| `prisma/schema.prisma` | Contact model + relations (tags, mentions) |
| `src/lib/openai.ts` | AI SDK setup, model config, system prompts |
| `src/lib/enrichment.ts` | Enrichment score calculation logic |
| `src/lib/schemas/*.ts` | Zod schemas for AI outputs |
| `src/app/api/enrichment/extract/route.ts` | Voice enrichment extraction API |
| `src/app/api/contacts/[id]/route.ts` | Contact CRUD operations |
| `src/app/api/contacts/[id]/suggest-tags/route.ts` | AI tag suggestions |
| `src/app/(dashboard)/contacts/[id]/page.tsx` | Contact detail view |
| `src/app/(dashboard)/explore/page.tsx` | Chat exploration interface |
| `src/components/enrichment/completion/` | Gamification UI components |

### Shared Dependencies

- **Theme:** `src/lib/design-system.ts` - gold accent (#d4a54a), dark theme
- **Hooks:** `src/hooks/useMediaQuery.ts` - responsive breakpoints
- **Utils:** `src/lib/db.ts` - Prisma singleton, `src/lib/utils.ts` - cn helper
- **Stores:** None currently (component state)
- **Auth:** `src/lib/supabase/server.ts` - createServerSupabaseClient

### Data Flow

```
Contact Detail Page
    ↓ "Research" button click
Research Planning Modal (new)
    ↓ User confirms research parameters
POST /api/contacts/[id]/research (new)
    ↓ Auth → Validate → Build search query
Tavily API search (new)
    ↓ Web results
GPT-4o synthesis (new)
    ↓ Structured recommendations
Database: ContactResearchRun + ContactRecommendation (new)
    ↓ Return results
Research Results UI (new)
    ↓ User reviews/edits/approves recommendations
POST /api/contacts/[id]/research/apply (new)
    ↓ Transaction: Update contact fields + tags + audit log
Recalculate enrichmentScore
    ↓ Return updated contact
Contact Detail refreshes with new data
```

### Feature Flags/Config

- None currently (feature would be always-on)
- Potential future: `ENABLE_CONTACT_RESEARCH` env var for staged rollout

### Potential Blast Radius

- **Contact model**: New relation to ResearchRun
- **Contact detail page**: New "Research" button and results panel
- **Enrichment flow**: Research as alternative to voice enrichment
- **API routes**: 3-4 new routes for research lifecycle
- **Prisma schema**: 2-3 new models (ResearchRun, Recommendation, EnrichmentLog)
- **Design system**: No changes (existing patterns sufficient)

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Web Search API Options

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Tavily** | Built for AI agents, handles search+scrape+extract in one call, 445ms latency, proven in Guru Builder | Less known, requires API key | 1,000 free/mo, $0.008/search after |
| **Serper** | Fast (150-200ms), good Google results | Just search, no extraction | 2,500 free/mo, $0.001/search |
| **SerpAPI** | Multiple engines, structured data | More complex, higher cost | $50/mo for 5,000 searches |
| **Google Custom Search** | Official Google data | Limited to 100 free/day, $5/1000 | $5/1000 searches |

**Recommendation:** **Tavily** - Already proven in Guru Builder, handles full pipeline, reasonable cost for personal CRM scale.

### Execution Architecture Options

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Inline streaming** | Simple, real-time progress, no infrastructure | Request timeout limits (60s on Vercel) | <30s operations |
| **Inngest background jobs** | Reliable retry, no timeout limits, job chaining | Additional infrastructure, complexity | >60s operations, high volume |
| **Server-Sent Events** | Real-time without WebSocket overhead | Connection management, edge runtime limits | Progressive updates |
| **Polling** | Simple, stateless, works everywhere | Slightly delayed UX, extra DB reads | When streaming not feasible |

**Recommendation:** **Inline with SSE progress** - Research typically completes in 3-15 seconds. Use streaming for progress updates, fall back to polling for status if needed. Avoid Inngest complexity for single feature.

### AI Synthesis Approach

Based on Guru Builder patterns and research:

1. **Structured outputs** with Zod schema (use `.nullable().optional()` for optional fields)
2. **Confidence scoring** using GPT-4o's logprobs or explicit 0-1 confidence in schema
3. **Source attribution** - store sourceUrls with each recommendation
4. **Conflict handling** - prompt AI to prefer more recent sources, flag conflicts for user review
5. **Filtering** - only show recommendations with confidence > 0.5 (configurable)

### UX Pattern: Progressive Disclosure

Based on LinkedIn Sales Navigator, Apollo, Clearbit patterns:

1. **Summary first** - "Found 8 insights, 5 high confidence"
2. **Grouped by category** - Professional, Expertise, Interests, Opportunity/WhyNow
3. **Expandable details** - Click to see reasoning + source URLs
4. **Edit before apply** - Inline editing of proposed values
5. **Bulk actions** - "Apply All High Confidence" + individual approve/reject
6. **Diff preview** - Show before/after for EDIT recommendations

### Privacy & Compliance

- **Data minimization** - Only store research results user explicitly requests
- **Retention policy** - Research results can be deleted; consider 90-day auto-cleanup
- **Consent model** - User initiates research (explicit consent)
- **Right to deletion** - Include in existing "Delete All Contacts" flow
- **Rate limiting** - 10 researches/hour to avoid appearing like scraping

---

## 6) Clarification Questions

### 1. Research Depth Tiers
**Question:** Should we offer multiple research depth options (Quick/Moderate/Deep) like Guru Builder, or start with a single "standard" depth?

**Options:**
- **A) Single depth**: Simpler UX, faster to build, tune based on feedback
- **B) Three tiers**: More control, matches Guru Builder pattern, but more UI complexity

**Recommendation:** Start with single "moderate" depth, add tiers if users request more control.

>> go with your recommendation

---

### 2. Research Entry Points
**Question:** Where should users be able to initiate research?

**Options:**
- **A) Contact detail page only**: Simple, contextual
- **B) Also from enrichment queue**: Research as enrichment method
- **C) Also from explore chat**: "Research this person" context action
- **D) All of the above**: Maximum flexibility

**Recommendation:** Start with (A), expand to (D) based on usage patterns.

>> go with your recommendation

---

### 3. Research History Persistence
**Question:** Should we keep history of all research runs, or just the most recent?

**Options:**
- **A) Keep all history**: Full audit trail, can compare over time
- **B) Keep last 3**: Balance storage with history
- **C) Only current results**: Simpler, but no history
- **D) User choice**: Toggle to keep/discard

**Recommendation:** (A) Keep all - storage is cheap, history is valuable for seeing how contacts evolve.

>> go with your recommendation

---

### 4. Planning Chat Phase
**Question:** The Guru Builder has an interactive planning phase where users chat with AI to refine the research plan. Is this needed for contact research?

**Options:**
- **A) No planning phase**: One-click "Research Now" with auto-generated queries
- **B) Simple options modal**: Select focus areas (professional, personal, news) before starting
- **C) Full chat planning**: Like Guru Builder, but may be overkill for person research
- **D) Optional advanced mode**: Simple by default, "Advanced" button for chat planning

**Recommendation:** (B) Simple options modal - contact research is more constrained than topic research; a few checkboxes suffice.

>> go with your recommendation

---

### 5. Recommendation Refinement
**Question:** Should users be able to chat-refine individual recommendations like in Guru Builder?

**Options:**
- **A) No refinement**: Accept/reject/edit manually only
- **B) Full refinement chat**: Like Guru Builder's per-recommendation chat
- **C) Quick edit only**: Inline text editing without AI assistance

**Recommendation:** (C) Quick edit only for V1 - refinement is powerful but adds complexity. Inline editing covers 90% of needs.

>> go with your recommendation

---

### 6. Tag Recommendations
**Question:** Should research generate tag recommendations in addition to field updates?

**Options:**
- **A) Yes, include tags**: Consistent with existing AI tag suggestion feature
- **B) No, fields only**: Simpler, use existing tag suggestion after research
- **C) Separate "Suggest Tags from Research" button**: Explicit user control

**Recommendation:** (A) Include tags - it's natural to discover tags during research (e.g., "AI enthusiast" from conference talks).

>> go with your recommendation

---

### 7. LinkedIn URL Handling
**Question:** If contact has LinkedIn URL, should we prioritize/trust that source more?

**Options:**
- **A) Yes, higher weight**: LinkedIn is authoritative for professional info
- **B) Equal weight**: Let AI decide based on recency and content
- **C) LinkedIn-first search**: Search LinkedIn profile specifically first

**Recommendation:** (A) Higher weight for LinkedIn sources - it's the most authoritative professional source, but we can't scrape it directly. Tavily may find LinkedIn-derived content elsewhere.

>> go with your recommendation

---

## 7) Proposed Architecture

### New Prisma Models

```prisma
enum ResearchStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum RecommendationStatus {
  PENDING
  APPROVED
  REJECTED
  APPLIED
}

model ContactResearchRun {
  id              String   @id @default(cuid())
  contactId       String
  userId          String

  // Research configuration
  searchQuery     String   // Optimized query used
  focusAreas      String[] // professional, expertise, interests, news

  // Status tracking
  status          ResearchStatus @default(PENDING)
  progressStage   String?
  errorMessage    String?

  // Results
  summary         String?  // Bullet summary for display
  fullReport      String?  // Detailed findings
  sourceUrls      String[] // All sources found

  // Metadata
  startedAt       DateTime?
  completedAt     DateTime?
  executionTimeMs Int?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recommendations ContactRecommendation[]

  @@index([contactId])
  @@index([userId, createdAt])
}

model ContactRecommendation {
  id              String   @id @default(cuid())
  researchRunId   String

  // What to update
  fieldName       String   // expertise, interests, whyNow, notes, title, company, location, tags
  action          String   // ADD | UPDATE
  currentValue    String?  // For comparison/diff
  proposedValue   String   // The suggested value

  // For tag recommendations specifically
  tagCategory     String?  // RELATIONSHIP | OPPORTUNITY | EXPERTISE | INTEREST

  // Justification
  reasoning       String
  confidence      Float    // 0.0 - 1.0
  sourceUrls      String[] // Where this came from

  // Status
  status          RecommendationStatus @default(PENDING)
  reviewedAt      DateTime?
  appliedAt       DateTime?

  createdAt       DateTime @default(now())

  researchRun     ContactResearchRun @relation(fields: [researchRunId], references: [id], onDelete: Cascade)

  @@index([researchRunId, status])
}

model ContactEnrichmentLog {
  id              String   @id @default(cuid())
  contactId       String

  fieldName       String
  previousValue   String?
  newValue        String
  source          String   // MANUAL | VOICE | RESEARCH | IMPORT
  researchRunId   String?

  createdAt       DateTime @default(now())

  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, createdAt])
}
```

### New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/contacts/[id]/research` | POST | Initiate research run |
| `/api/contacts/[id]/research` | GET | Get research history for contact |
| `/api/contacts/[id]/research/[runId]` | GET | Get specific research run with recommendations |
| `/api/contacts/[id]/research/[runId]/apply` | POST | Apply approved recommendations |
| `/api/contacts/[id]/research/[runId]/recommendations/[recId]` | PATCH | Update recommendation status (approve/reject) |

### New Components

| Component | Purpose |
|-----------|---------|
| `ResearchButton` | Trigger button for contact detail page |
| `ResearchOptionsModal` | Select focus areas before starting |
| `ResearchProgressIndicator` | Real-time status during research |
| `ResearchResultsPanel` | Display summary, report, recommendations |
| `RecommendationCard` | Individual recommendation with approve/reject/edit |
| `RecommendationDiff` | Before/after comparison for edits |
| `ResearchHistoryDrawer` | View past research runs |

### Integration Points

1. **Contact Detail Page** (`src/app/(dashboard)/contacts/[id]/page.tsx`)
   - Add "Research" button near enrichment score card
   - Add ResearchResultsPanel below contact info when results exist

2. **Contact Model** (`prisma/schema.prisma`)
   - Add `researchRuns ContactResearchRun[]` relation
   - Add `enrichmentLogs ContactEnrichmentLog[]` relation

3. **Enrichment Score** (`src/lib/enrichment.ts`)
   - No changes needed - score recalculates from field values

---

## 8) Implementation Phases (Rough Estimate)

### Phase 1: Foundation (Infrastructure)
- Database schema migration
- Tavily client setup
- Basic research orchestration library
- Zod schemas for recommendations

### Phase 2: Core Research Flow
- POST /api/contacts/[id]/research endpoint
- Research execution with Tavily + GPT synthesis
- Recommendation generation with confidence scoring
- Basic polling for status

### Phase 3: Review UI
- ResearchResultsPanel component
- RecommendationCard with approve/reject/edit
- Apply recommendations flow
- Enrichment score update

### Phase 4: Polish
- Progress indicator with streaming
- Research history drawer
- Error handling and retry
- Mobile responsiveness

---

## 9) Open Questions for Spec Phase

1. Should we add a `TAVILY_API_KEY` environment variable requirement to the project setup docs?
2. What's the exact Zod schema for recommendation generation? (Will detail in spec)
3. Should the research summary use the same markdown rendering as the explore chat?
4. How should we handle contacts with very common names (disambiguation)?
5. Should we track API costs per research run for user transparency?

---

## Next Steps

1. **User clarification** on questions in Section 6
2. **Create specification** once clarifications resolved
3. **Database migration** first (can proceed independently)
4. **Tavily integration** as proof-of-concept
5. **Full implementation** following spec
