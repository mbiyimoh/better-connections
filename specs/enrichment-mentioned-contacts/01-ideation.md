# Enrichment Mentioned Contacts Extraction

**Slug:** enrichment-mentioned-contacts
**Author:** Claude Code
**Date:** 2025-12-27
**Branch:** feature/enrichment-mentioned-contacts
**Related:** `specs/smart-voice-enrichment/`, `specs/enrichment-completion-gamification/`

---

## 1) Intent & Assumptions

### Task Brief
After completing a contact enrichment session (voice or text), analyze the enrichment content to detect mentions of other people. For each mentioned person: (1) match against existing contacts with exact and fuzzy matching, (2) show captured context with one-click add functionality, (3) offer quick enrichment navigation for matched contacts, and (4) provide streamlined contact creation for unknown names.

### Assumptions
- Users typically mention 1-5 other people during an enrichment session
- Most mentioned names will be partial (first name only, nickname, or informal reference)
- The feature should work with both voice transcripts and typed text input
- Users want minimal friction - one-click actions are critical
- AI extraction accuracy is more important than speed for this feature
- The existing 30-second timer enrichment flow remains unchanged
- Mentioned contact context should be additive (append to existing notes/fields)

### Out of Scope
- Real-time mention detection during the session (this is post-session processing)
- Automatic addition of context without user confirmation
- Social graph visualization (M2M relationship mapping UI)
- Importing contacts from mentioned people's social profiles
- Duplicate contact detection and merging (separate feature)
- Batch processing of historical enrichment transcripts
- Relationship strength inference from mentions

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `prisma/schema.prisma` | Contact model has `referredBy` (string) but no M2M contact relation; need to add self-referential relation or junction table |
| `src/lib/openai.ts` | `ENRICHMENT_EXTRACTION_SYSTEM_PROMPT` extracts insights for single contact only; need parallel prompt for person mentions |
| `src/lib/schemas/enrichmentInsight.ts` | Zod schema pattern for structured AI outputs; will create similar schema for `MentionedPerson` |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Session page manages transcript and bubbles; completion triggers `CompletionCelebration` component |
| `src/components/enrichment/completion/` | CompletionCelebration shows score/rank/streak; natural insertion point for "Mentioned Contacts" section |
| `src/app/api/enrichment/extract/route.ts` | POST endpoint for AI extraction; will create parallel `/api/enrichment/extract-mentions` |
| `src/app/api/contacts/route.ts` | Uses `contains` with `mode: 'insensitive'` for search; no fuzzy matching exists |
| `specs/smart-voice-enrichment/02-specification.md` | Detailed spec for current AI extraction; this feature extends that architecture |

---

## 3) Codebase Map

### Primary Components/Modules

| Path | Role |
|------|------|
| `src/app/(dashboard)/enrichment/session/page.tsx` | Main enrichment session; accumulates transcript, calls AI extraction |
| `src/components/enrichment/completion/CompletionCelebration.tsx` | Post-session celebration; receives bubbles and completionData |
| `src/lib/openai.ts` | OpenAI client and system prompts |
| `src/lib/schemas/enrichmentInsight.ts` | Zod schemas for AI extraction |
| `src/app/api/enrichment/extract/route.ts` | POST endpoint for insight extraction |
| `src/app/api/contacts/route.ts` | GET/POST for contacts; includes search |
| `prisma/schema.prisma` | Database models |

### Shared Dependencies
- **AI SDK:** `ai` + `@ai-sdk/openai` for GPT-4o-mini integration
- **Validation:** `zod` for schema validation
- **Animation:** `framer-motion` for UI transitions
- **UI Components:** `@/components/ui/*` (Button, Card, Input, etc.)
- **Supabase:** Authentication context
- **Prisma:** Database client

### Data Flow
```
Voice/Text Input
      ↓
Transcript accumulated in session state
      ↓
Session Complete triggered
      ↓
POST /api/enrichment/extract (existing - contact insights)
      ↓
NEW: POST /api/enrichment/extract-mentions (person mentions)
      ↓
NEW: POST /api/contacts/match-mentions (fuzzy matching)
      ↓
Render CompletionCelebration with new "Mentioned People" section
      ↓
User actions: Add Context / Enrich Now / Create Contact
```

### Feature Flags/Config
- None currently; could add `FEATURE_MENTIONED_CONTACTS` env var for gradual rollout

### Potential Blast Radius
- **Enrichment session page** - Minor changes to pass transcript to mention extraction
- **CompletionCelebration** - Moderate changes to add new section
- **Prisma schema** - New model/relation for contact linking
- **API routes** - Two new endpoints
- **OpenAI prompts** - New system prompt for mention extraction

---

## 4) Root Cause Analysis

**N/A** - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Potential Solutions

#### 1. Named Entity Recognition (NER) Approach

| Option | Pros | Cons |
|--------|------|------|
| **GPT-4o-mini with structured outputs** | Context-aware, understands relationships, guaranteed JSON, already in stack | API cost (~$0.0001/call), latency (~500ms) |
| **Local NER (compromise.js)** | Zero cost, fast, offline | Less accurate for context, no relationship understanding |
| **spaCy via API** | High accuracy for pure NER | Requires separate service, no context |
| **Hybrid (local pre-filter + GPT refinement)** | Best accuracy, lower cost | Implementation complexity |

**Recommendation:** GPT-4o-mini with structured outputs. The cost is negligible ($0.11/month for 500 contacts), accuracy is superior, and it already integrates with the existing stack. The hybrid approach adds complexity without meaningful cost savings.

#### 2. Fuzzy Matching Algorithm

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL pg_trgm extension** | Database-native, GIN index support, 500x faster | Requires DB migration, PostgreSQL-specific |
| **Fuse.js (client-side)** | Easy integration, no DB changes | Loads all contacts to client, doesn't scale |
| **Jaro-Winkler + Metaphone combo** | Good for names, handles phonetics | Requires custom implementation |
| **string-similarity (npm)** | Simple API, server-side | No phonetic matching |

**Recommendation:** Two-tier approach:
1. **Primary:** PostgreSQL pg_trgm for fuzzy search (requires Neon extension enablement)
2. **Fallback:** Server-side Jaro-Winkler + Metaphone for phonetic matching on voice transcripts

#### 3. Database Schema for Contact Relationships

| Option | Pros | Cons |
|--------|------|------|
| **Self-referential M2M relation** | Prisma-native, bidirectional queries | Two junction tables needed (from/to) |
| **Single junction table (ContactMention)** | Simpler, includes metadata (source, context) | Requires manual bidirectional handling |
| **JSON array on Contact** | Simplest, no migration | No referential integrity, hard to query |
| **Enhance referredBy to relation** | Minimal change | Only captures one direction |

**Recommendation:** **Explicit junction table (`ContactMention`)** with:
- `sourceContactId` (who was being enriched)
- `mentionedContactId` (who was mentioned, nullable for new contacts)
- `mentionedName` (original name as spoken)
- `extractedContext` (what was said about them)
- `confidence` (AI confidence score)
- `status` (pending, linked, dismissed, created)

This supports the full workflow: extraction → matching → user decision → linking.

#### 4. UI/UX Pattern for Mentioned People

| Option | Pros | Cons |
|--------|------|------|
| **Inline cards in CompletionCelebration** | Natural flow, no extra navigation | May clutter if many mentions |
| **Separate "Mentioned People" modal** | Clean separation, focused actions | Extra click, breaks celebration flow |
| **Accordion/collapsible section** | Progressive disclosure, compact | Less visible, may be missed |
| **Toast-based quick actions** | Non-blocking, subtle | Too transient for important decisions |

**Recommendation:** **Collapsible card section in CompletionCelebration** with:
- Section header showing count ("3 people mentioned")
- Cards for confident matches (existing contacts)
- Cards for uncertain matches (fuzzy matches with confirmation)
- Card for unknown names with quick-create CTA
- One-click actions on each card

### Cost Analysis

| Component | Cost per Session | Monthly (50 sessions) |
|-----------|-----------------|----------------------|
| Person extraction (GPT-4o-mini) | $0.0001 | $0.005 |
| Fuzzy matching (pg_trgm query) | $0 | $0 |
| Quick enrichment (optional) | $0.002 | $0.10 |
| **Total** | **~$0.002** | **~$0.11** |

---

## 6) Clarifications Needed

### UI/UX Decisions

1. **Card layout priority:** When multiple people are mentioned, how should they be ordered?
   - a) By confidence of match (highest first)
   - b) By amount of context captured (most context first)
   - c) By order of mention in transcript
   - **Suggested default:** Confidence, with matched contacts first, then fuzzy matches, then unknown names
   >> yes, I agree with your "suggested default"

2. **Maximum mentions to display:** Should there be a limit on how many mentioned people cards to show?
   - a) Show all (could be overwhelming if 10+ mentioned)
   - b) Show top 5 with "Show more" expansion
   - c) Show top 3 with "Show more" expansion
   - **Suggested default:** Show top 5 with expansion
   >> yes, I agree with your "suggested default"

3. **Context preview length:** How much of the extracted context to show on the card?
   - a) Full context (may be long)
   - b) Truncated with "..." (50 chars)
   - c) Smart preview (first sentence only)
   - **Suggested default:** Smart preview with expand on click
   >> yes, I agree with your "suggested default"

4. **Quick-create contact flow:** How minimal should the quick-create form be?
   - a) Name only (add context automatically)
   - b) Name + captured context fields (editable)
   - c) Full contact form (defeats "quick" purpose)
   - **Suggested default:** Name + auto-populated context, with option to "Add more details later"
   >> yes, I agree with your "suggested default"

### Data Decisions

5. **Context storage for existing contacts:** When adding context to an existing contact via one-click, where should it go?
   - a) Append to `notes` field only
   - b) Try to map to specific fields (howWeMet, expertise, etc.) like regular enrichment
   - c) Store in separate "mentioned by" field
   - **Suggested default:** Map to fields where possible, fallback to notes with source attribution
   >> yes, I agree with your "suggested default"

6. **Relationship direction:** Should the mention create a bidirectional link or one-way?
   - a) One-way (Contact A mentions Contact B, but not vice versa)
   - b) Bidirectional (both contacts linked to each other)
   - c) One-way with visibility note on both
   - **Suggested default:** One-way link stored, but show "mentioned by" on both contact profiles
   >> bidirectional. these aren't friend requests — if I say person A knows / is conneced to person B, then the opposite is also goign to be true

### Technical Decisions

7. **pg_trgm availability:** Does your Supabase PostgreSQL database have the pg_trgm extension enabled?
   - If yes: Use database-native fuzzy search
   - If no: Use server-side string matching (fallback)
   - *This affects implementation complexity*
   - **Resolution:** Using Supabase PostgreSQL (not Neon). pg_trgm can be enabled via SQL migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

8. **Phonetic matching priority:** For voice transcripts, how important is phonetic matching (e.g., "Jon" matching "John")?
   - a) Critical - names are often misheard/misspelled
   - b) Nice to have - exact/fuzzy is usually enough
   - c) Not needed - users will correct in UI
   - **Suggested default:** Include Metaphone for voice transcripts only
   >> nice to have until real-world usage proves it to be critical (or not)

---

## 7) Proposed Architecture

### New Database Models

```prisma
// Bidirectional relationship between contacts (if A knows B, B knows A)
model ContactRelationship {
  id                 String   @id @default(uuid())
  userId             String

  // Both contacts in the relationship (bidirectional)
  contactAId         String
  contactA           Contact  @relation("RelationshipA", fields: [contactAId], references: [id], onDelete: Cascade)

  contactBId         String
  contactB           Contact  @relation("RelationshipB", fields: [contactBId], references: [id], onDelete: Cascade)

  // How this relationship was discovered
  sourceType         RelationshipSource @default(ENRICHMENT_MENTION)
  sourceContext      String?  @db.Text // What was said that established this link

  createdAt          DateTime @default(now())

  @@unique([contactAId, contactBId]) // Prevent duplicates
  @@index([userId])
  @@index([contactAId])
  @@index([contactBId])
}

enum RelationshipSource {
  ENRICHMENT_MENTION  // Discovered during enrichment
  MANUAL              // User manually linked
  IMPORT              // From CSV/import data
}

// Track pending mentions that haven't been linked yet
model ContactMention {
  id                 String   @id @default(uuid())
  userId             String

  // Contact being enriched when this mention was detected
  sourceContactId    String
  sourceContact      Contact  @relation("MentionSource", fields: [sourceContactId], references: [id], onDelete: Cascade)

  // Matched contact (null if unknown/unlinked)
  mentionedContactId String?
  mentionedContact   Contact? @relation("MentionTarget", fields: [mentionedContactId], references: [id], onDelete: SetNull)

  // Extraction data
  mentionedName      String   // Original name as spoken
  extractedContext   String   @db.Text // What was said about them
  confidence         Float    @default(0) // 0-1 match confidence

  // Workflow state
  status             MentionStatus @default(PENDING)

  createdAt          DateTime @default(now())
  processedAt        DateTime?

  @@index([userId])
  @@index([sourceContactId])
  @@index([mentionedContactId])
}

enum MentionStatus {
  PENDING      // Awaiting user action
  LINKED       // User confirmed link → creates ContactRelationship
  CREATED      // User created new contact → creates ContactRelationship
  DISMISSED    // User dismissed the mention
}
```

### New Zod Schemas

```typescript
// Person mention extracted from transcript
export const personMentionSchema = z.object({
  name: z.string().describe("The person's name as mentioned"),
  normalizedName: z.string().describe("Cleaned/normalized version of name"),
  context: z.string().describe("What was said about this person"),
  category: z.enum(["relationship", "opportunity", "expertise", "interest"]).optional(),
  inferredDetails: z.object({
    title: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    expertise: z.string().nullable().optional(),
  }).optional(),
});

export const mentionExtractionResponseSchema = z.object({
  mentions: z.array(personMentionSchema),
  primaryContactContext: z.string().describe("Context that applies to the primary contact being enriched"),
});
```

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrichment/extract-mentions` | POST | Extract person mentions from transcript |
| `/api/contacts/match-mentions` | POST | Match names to existing contacts |
| `/api/contacts/mentions/[id]` | PATCH | Update mention status (link/dismiss/create) |

### New UI Components

| Component | Purpose |
|-----------|---------|
| `MentionedPeopleSection` | Container for mentioned people in CompletionCelebration |
| `MentionedPersonCard` | Individual card with actions for each mention |
| `FuzzyMatchConfirmation` | Inline UI for confirming fuzzy matches |
| `QuickCreateContactForm` | Minimal form for creating new contact from mention |

---

## 8) Implementation Phases

### Phase 1: Data Layer (2 days)
- Add `ContactMention` model to Prisma schema
- Create migration
- Enable pg_trgm extension on Neon (if available)
- Add fuzzy matching utility functions

### Phase 2: AI Extraction (2 days)
- Create `MENTION_EXTRACTION_SYSTEM_PROMPT`
- Create Zod schemas for mention extraction
- Build `/api/enrichment/extract-mentions` endpoint
- Write unit tests for extraction

### Phase 3: Matching Service (2 days)
- Implement exact name matching
- Implement pg_trgm fuzzy matching (or fallback)
- Add Metaphone phonetic matching for voice
- Build `/api/contacts/match-mentions` endpoint

### Phase 4: UI Components (3 days)
- Create `MentionedPersonCard` component
- Create `MentionedPeopleSection` component
- Integrate into `CompletionCelebration`
- Add one-click actions (Add Context, Enrich Now, Create)
- Add fuzzy match confirmation UI

### Phase 5: Quick Actions (2 days)
- Implement "Add Context" flow (one-click)
- Implement "Enrich Now" navigation
- Implement "Quick Create" form
- Handle dismissal and status updates

### Phase 6: Polish & Testing (2 days)
- E2E tests for full workflow
- Error handling and edge cases
- Loading states and animations
- Documentation updates

**Total Estimate:** 13 developer days

---

## 9) Success Metrics

| Metric | Target |
|--------|--------|
| Mention detection accuracy | >80% of actual mentions detected |
| Match accuracy (exact + fuzzy) | >75% correct matches |
| User action rate | >50% of mentions get an action (not dismissed) |
| Context addition rate | >30% of matched mentions have context added |
| New contact creation rate | >20% of unknown mentions become contacts |
| False positive rate | <10% of matches are incorrect |

---

## 10) Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI extracts non-person names as people | Medium | Low | Add "Not a person" dismiss option; improve prompt |
| Too many mentions overwhelm UI | Low | Medium | Limit displayed to 5, collapse with "Show more" |
| Fuzzy matching creates wrong links | Medium | Medium | Require user confirmation for <0.8 confidence |
| pg_trgm extension not available | Low | Medium | Have server-side fallback ready |
| Users ignore mentioned contacts section | Medium | Low | Clear CTA, gamify with "network discovered" count |

---

## 11) Open Questions

1. Should mentions be visible on the Contact profile page? (e.g., "Mentioned by: Sarah Chen on Dec 15")
2. Should we track mention frequency to surface "frequently mentioned" contacts?
3. Should the "Quick Enrich" flow include the captured context as pre-filled data?
4. Should dismissing a mention affect future matching (learn that "Mike" != "Michael Chen")?
