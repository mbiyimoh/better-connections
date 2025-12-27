# Smart Voice Enrichment - AI-Powered Insight Extraction

**Slug:** smart-voice-enrichment
**Author:** Claude Code
**Date:** 2025-12-26
**Branch:** feature/smart-voice-enrichment
**Related:** `specs/voice-enrichment-input/`, `/enrichment/session/page.tsx`

---

## 1) Intent & Assumptions

**Task Brief:**
Replace the current keyword-matching approach for voice enrichment with an AI-powered system that intelligently extracts structured CRM insights from any naturally-spoken context. Users should be able to say anything about a contact (e.g., "He manages money for Thaddeus Young") and the system should recognize this as valuable context worth capturing, categorizing it appropriately without requiring specific keyword phrases.

**Assumptions:**
- The app already has OpenAI integration via Vercel AI SDK (GPT-4o-mini)
- Users will speak naturally about their contacts without using specific keyword patterns
- Real-time feedback is critical - users need to see their speech being captured and processed
- The existing bubble UI for displaying extracted insights will be reused
- Cost is not a primary constraint (GPT-4o-mini is extremely cheap: ~$0.02/user/month)

**Out of Scope:**
- Changing the speech-to-text provider (keeping Web Speech API for now)
- Adding speaker diarization or multi-speaker support
- Batch processing for non-real-time scenarios
- Changing the overall enrichment flow or timer mechanism
- Migration to Deepgram STT (future enhancement)

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `src/app/(dashboard)/enrichment/session/page.tsx` | Current voice session uses `extractInsights()` function with hardcoded keyword arrays. Processes transcript incrementally via useEffect. Uses `react-speech-recognition` hook. |
| `src/lib/openai.ts` | OpenAI client already configured with `gpt-4o-mini`. Exports `gpt4oMini` model for use with Vercel AI SDK. Has system prompts for exploration and intro drafting. |
| `src/app/api/chat/explore/route.ts` | Pattern for streaming AI responses using `streamText` from Vercel AI SDK. Good reference for structured output handling. |
| `src/app/api/chat/draft-intro/route.ts` | Pattern for non-streaming AI responses using `generateText`. |
| `prisma/schema.prisma` | Contact model has all target fields: `howWeMet`, `whyNow`, `expertise`, `interests`, `notes`, `title`, `company`, `relationshipStrength` (1-4 int). |
| `src/lib/enrichment.ts` | Enrichment score calculation weights: `whyNow` = 20pts (highest), `howWeMet` = 15pts, `title`/`company` = 10pts each. |
| `src/components/enrichment/EnrichmentBubbles.tsx` | Bubble display component with 4 categories: relationship (blue), opportunity (green), expertise (purple), interest (amber). |
| `specs/voice-enrichment-input/spec.md` | Original spec focused on voice input mechanics, not AI extraction. |

---

## 3) Codebase Map

### Primary Components/Modules

| Path | Role |
|------|------|
| `src/app/(dashboard)/enrichment/session/page.tsx` | Main voice session UI - needs modification to call AI extraction API |
| `src/lib/openai.ts` | OpenAI client & system prompts - add new enrichment extraction prompt |
| `src/app/api/` | API routes - add new `/api/enrichment/extract` endpoint |
| `src/components/enrichment/EnrichmentBubbles.tsx` | Bubble display - no changes needed |
| `src/lib/enrichment.ts` | Score calculation - no changes needed |

### Shared Dependencies

- **AI SDK:** `ai`, `@ai-sdk/openai`, `@ai-sdk/react` (already installed)
- **Validation:** `zod` (already installed, use for structured outputs)
- **Voice:** `react-speech-recognition` (existing)
- **UI State:** React useState/useEffect (existing pattern)

### Data Flow

```
Current (Keyword-Based):
Voice → transcript → extractInsights(keywords) → bubbles → save to contact

Proposed (AI-Powered):
Voice → transcript → pause detection → POST /api/enrichment/extract
    → GPT-4o-mini (structured output) → stream partial → bubbles → save to contact
```

### Potential Blast Radius

- **enrichment/session/page.tsx** - Replace `extractInsights()` with API call
- **lib/openai.ts** - Add new system prompt for CRM extraction
- **api/enrichment/extract/route.ts** - NEW endpoint for AI extraction
- **lib/schemas/contactInsight.ts** - NEW Zod schema for structured output

---

## 4) Root Cause Analysis

### Problem Description
**Observed:** Users speak naturally about contacts ("He manages money for Thaddeus Young") but no bubbles appear unless they use specific keyword phrases like "expert in" or "met at".

**Expected:** Any meaningful context about a contact should be captured and categorized appropriately.

### Evidence

From `enrichment/session/page.tsx` lines 58-121:

```typescript
// Current keyword-only extraction
function extractInsights(text: string): { text: string; category: BubbleCategory }[] {
  const relationshipKeywords = [
    "met at", "introduced by", "worked with", "known from", ...
  ];
  // Only matches exact keyword phrases
  for (const keyword of relationshipKeywords) {
    if (lowerText.includes(keyword)) { ... }
  }
}
```

**Root Cause:** The `extractInsights()` function uses static keyword arrays which:
1. Cannot understand semantic meaning ("manages money" = financial/investment opportunity)
2. Require exact phrase matches (misses paraphrases)
3. Have no contextual understanding (can't infer role from description)
4. Cannot extract implicit information (Thaddeus Young = NBA player = athlete wealth management)

### Decision
Replace keyword matching with LLM-based semantic extraction using OpenAI GPT-4o-mini with structured outputs for guaranteed schema compliance.

---

## 5) Research Findings

### Potential Solutions

#### Solution 1: Real-time Streaming with GPT-4o-mini ✅ RECOMMENDED

**Description:** Send transcript chunks to GPT-4o-mini on pause detection (~1 second of silence), stream structured insights back to UI.

**Pros:**
- Sub-second perceived latency (insights stream in <500ms)
- Semantic understanding (captures meaning, not just keywords)
- 100% schema compliance with Vercel AI SDK structured outputs
- Already have infrastructure (OpenAI client, Vercel AI SDK)
- Negligible cost ($0.02-$0.20/user/month)
- Real-time feedback as user speaks

**Cons:**
- Requires new API endpoint
- Slight latency vs instant (1-2s per chunk, but acceptable)
- May need session memory for multi-chunk context

**Implementation Complexity:** Medium (2-3 days)

---

#### Solution 2: Process on Session Complete

**Description:** Collect entire transcript, process when user finishes speaking.

**Pros:**
- Full context available
- Single API call
- Simpler implementation

**Cons:**
- No real-time feedback (poor UX)
- Long wait time after speaking
- Doesn't match conversational mental model

**Implementation Complexity:** Low (1 day)

**Verdict:** ❌ Rejected - Poor UX for voice interface

---

#### Solution 3: Enhanced Keyword Lists + Fallback to Notes

**Description:** Expand keyword lists significantly, add any unmatched content as notes.

**Pros:**
- No API costs
- Instant processing
- Simpler architecture

**Cons:**
- Still can't understand semantic meaning
- Would need hundreds of keywords
- Misses nuanced context
- Poor categorization accuracy

**Implementation Complexity:** Low (1 day)

**Verdict:** ❌ Rejected - Doesn't solve core problem

---

#### Solution 4: Hybrid - Client-side Quick Match + Server-side AI Refinement

**Description:** Use fast client-side keyword matching for immediate feedback, then refine with AI in background.

**Pros:**
- Instant initial feedback
- AI enhances accuracy

**Cons:**
- Complex dual-system
- UI updates twice (confusing)
- Over-engineered for the use case

**Implementation Complexity:** High (4-5 days)

**Verdict:** ⚠️ Consider for v2 if latency is problematic

---

### Recommendation

**Solution 1: Real-time Streaming with GPT-4o-mini** is the clear winner.

**Key Implementation Details:**

1. **Pause Detection:** Use 1000ms silence threshold to detect complete thoughts
2. **Streaming:** Use Vercel AI SDK `streamText` with `Output.object()` for partial updates
3. **Schema:** Define Zod schema with `.describe()` on each field to guide extraction
4. **Model:** GPT-4o-mini (60% cheaper than GPT-3.5, <500ms latency)
5. **Structured Outputs:** Use `strict: true` for 100% schema compliance

**Zod Schema Design:**

```typescript
const contactInsightSchema = z.object({
  // What was captured (for display)
  capturedText: z.string()
    .describe('The key phrase or fact extracted from speech'),

  // Category for bubble color
  category: z.enum(['relationship', 'opportunity', 'expertise', 'interest'])
    .describe('Category: relationship=how you know them, opportunity=business potential, expertise=what they do, interest=personal hobbies'),

  // Enrichment fields (for saving to contact)
  howWeMet: z.string().nullable().optional()
    .describe('How the user met this contact - events, introductions, shared history'),

  whyNow: z.string().nullable().optional()
    .describe('Time-sensitive relevance - why this contact matters right now'),

  title: z.string().nullable().optional()
    .describe('Job title or professional role'),

  company: z.string().nullable().optional()
    .describe('Company or organization'),

  expertise: z.string().nullable().optional()
    .describe('Professional skills or domain expertise'),

  interests: z.string().nullable().optional()
    .describe('Personal interests or hobbies'),

  notes: z.string().nullable().optional()
    .describe('Any other relevant context'),

  relationshipStrength: z.enum(['weak', 'casual', 'good', 'strong']).nullable().optional()
    .describe('Inferred relationship strength from context'),
});
```

**System Prompt:**

```
You are a CRM insight extraction assistant. Extract structured professional relationship context from spoken transcripts.

Key Guidelines:
- Extract ONLY explicitly stated or strongly implied information
- Use null for missing/uncertain fields (never guess)
- Focus on relationship context and "why now" signals
- Infer relationship strength from tone and context clues

Field Priority (by enrichment score value):
1. whyNow (20 points) - Time-sensitive relevance
2. howWeMet (15 points) - Relationship origin
3. title, company (10 points each) - Professional context

Example:
Input: "He manages money for Thaddeus Young"
Output: {
  "capturedText": "Manages money for NBA players",
  "category": "opportunity",
  "title": "Financial Manager",
  "expertise": "Athlete wealth management",
  "whyNow": null,
  "howWeMet": null,
  "notes": "Connection to Thaddeus Young (NBA)",
  "relationshipStrength": null
}
```

---

## 6) Clarifications Needed

1. **Pause Threshold:** Should we use 1000ms (industry standard) or allow user configuration (800-1500ms)?
   - *Recommendation:* Start with 1000ms, iterate based on feedback
   >> go with your rec

2. **Multi-Bubble Extraction:** Should a single transcript chunk generate multiple bubbles if multiple insights are detected?
   - *Recommendation:* Yes, return an array of insights from the API
   >> yes for sure, thats exactly what we want people to do and exactly what we want them to see when they do it

3. **Existing Data Merge:** When saving, should AI-extracted fields overwrite existing contact data or append?
   - *Recommendation:* Append for text fields (notes, expertise), overwrite only if empty for structured fields (title, company)
   >> yup, go with your rec, but maybe also try and detect when something from the enrichment directly conflicts within something in one of the structured fields and surface those cases at the end of the enrichment, giving the user the ability to decide whether to overwrite those conflicted fields as well or not (separate decision for each conflict)

4. **Confidence Threshold:** Should we show low-confidence extractions differently or hide them?
   - *Recommendation:* Show all extractions initially, add confidence indicators in v2
   >> go with your rec

5. **Rate Limiting:** Should we debounce API calls if user pauses frequently?
   - *Recommendation:* Yes, 500ms debounce after pause detection to batch rapid pauses
   >> yes, go with your rec

---

## 7) Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Voice Enrichment Session                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Web Speech   │───▶│   Pause      │───▶│ POST /api/       │   │
│  │    API       │    │  Detection   │    │ enrichment/      │   │
│  │              │    │  (1000ms)    │    │ extract          │   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
│         │                                          │              │
│         ▼                                          ▼              │
│  ┌──────────────┐                      ┌──────────────────────┐  │
│  │ Live         │                      │   GPT-4o-mini        │  │
│  │ Transcript   │                      │   + Zod Schema       │  │
│  │ Display      │                      │   + Structured       │  │
│  └──────────────┘                      │   Outputs            │  │
│                                        └────────┬─────────────┘  │
│                                                  │                │
│                         ◀────── SSE Stream ──────┘                │
│                         │                                         │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Enrichment Bubbles (Real-time)              │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │    │
│  │  │ Blue   │  │ Green  │  │ Purple │  │ Amber  │         │    │
│  │  │Relation│  │Opport. │  │Expert. │  │Interest│         │    │
│  │  └────────┘  └────────┘  └────────┘  └────────┘         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                         │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │           Complete Session → Save to Prisma              │    │
│  │     (howWeMet, whyNow, expertise, interests, notes)      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8) Implementation Tasks

### Phase 1: Core AI Extraction (Day 1)

- [ ] Create Zod schema for contact insights (`lib/schemas/contactInsight.ts`)
- [ ] Add CRM extraction system prompt to `lib/openai.ts`
- [ ] Create `/api/enrichment/extract` streaming endpoint
- [ ] Test extraction accuracy with sample transcripts

### Phase 2: Session Integration (Day 2)

- [ ] Replace `extractInsights()` with API call in session page
- [ ] Implement pause detection (1000ms threshold)
- [ ] Add debouncing for rapid pauses (500ms)
- [ ] Stream partial insights to bubble UI
- [ ] Handle errors and loading states

### Phase 3: Polish & Testing (Day 3)

- [ ] Add session memory for multi-chunk context
- [ ] Optimize system prompt based on real usage
- [ ] Add fallback for API failures
- [ ] Test on production deployment
- [ ] Document new approach

---

## 9) Success Criteria

1. **Semantic Understanding:** "He manages money for Thaddeus Young" creates a bubble categorized as "opportunity" or "expertise"
2. **Real-time Feedback:** Users see insights appear within 1-2 seconds of pausing
3. **Accuracy:** >90% of spoken context captured (vs current ~20% with keywords)
4. **No Regressions:** Existing flows (text input, timer, save) work unchanged
5. **Performance:** <500ms time to first streamed insight
6. **Cost:** <$0.50/user/month in API costs

---

## 10) Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API latency too high | Low | Medium | Stream partial results, show loading state |
| Extraction inaccuracy | Medium | Medium | Add few-shot examples to prompt, iterate |
| Rate limiting by OpenAI | Low | High | Debounce calls, add backoff retry |
| Cost unexpectedly high | Very Low | Low | GPT-4o-mini is cheap, monitor usage |
| Web Speech API issues | Medium | Medium | Already handled with transcript display |
