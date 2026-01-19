# Research-Driven Contact Enrichment - Developer Guide

**Last Updated:** 2026-01-15
**Component:** AI-Powered Web Research for Contact Profiles

---

## 1. Architecture Overview

The Research Enrichment System uses AI-powered web research to discover publicly available information about contacts and generate structured profile enrichment recommendations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RESEARCH ENRICHMENT FLOW                               │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │  Contact Detail │                                                        │
│  │  "Research" btn │                                                        │
│  └───────┬─────────┘                                                        │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │              ResearchOptionsModal                           │            │
│  │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐     │            │
│  │  │ Profess.│ │ Expertise │ │ Interests│ │ Recent News │     │            │
│  │  │   [ ]   │ │    [ ]    │ │   [ ]    │ │     [ ]     │     │            │
│  │  └─────────┘ └───────────┘ └──────────┘ └─────────────┘     │            │
│  └──────────────────────────────┬──────────────────────────────┘            │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  POST /api/contacts/:id/research                    │    │
│  │  1. Create ContactResearchRun (status: RUNNING)                     │    │
│  │  2. Build ContactContext from contact data                          │    │
│  │  3. Call executeContactResearch()                                   │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   RESEARCH ORCHESTRATOR                              │    │
│  │                                                                       │   │
│  │  Step 1: Build Search Query                                          │   │
│  │    └── buildSearchQuery(contact, focusAreas)                         │   │
│  │                                                                       │   │
│  │  Step 2a: LinkedIn Extraction (if URL provided)                      │   │
│  │    └── extractLinkedInProfile(linkedinUrl) → Tavily Extract API      │   │
│  │                                                                       │   │
│  │  Step 2b: Web Search                                                  │   │
│  │    └── searchTavily(query) → Tavily Search API (10 results, adv)     │   │
│  │                                                                       │   │
│  │  Step 3: Synthesize Report                                           │   │
│  │    └── GPT-4o-mini + SYNTHESIS_SYSTEM_PROMPT                         │   │
│  │        → summary (bullets), fullReport (markdown), keyFindings       │   │
│  │                                                                       │   │
│  │  Step 4: Generate Recommendations                                    │   │
│  │    └── GPT-4o-mini + RECOMMENDATION_SYSTEM_PROMPT                    │   │
│  │        → fieldName, action, proposedValue, confidence, reasoning     │   │
│  │                                                                       │   │
│  │  Step 5: Filter & Deduplicate                                        │   │
│  │    └── confidence >= 0.5, !duplicate of existing value               │   │
│  │                                                                       │   │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                ResearchResultsPanel                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ Summary: • Point 1 • Point 2 • Point 3                      │    │    │
│  │  │ [Show full report]                                          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─ RecommendationCard ────────────────────────────────────────┐    │    │
│  │  │ expertise (ADD) - 85% confidence                            │    │    │
│  │  │ "AI infrastructure, distributed systems"                    │    │    │
│  │  │ [Approve] [Reject] [Edit]                                   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  [Apply N Approved Recommendations]                                  │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              POST /api/contacts/:id/research/:runId/apply           │    │
│  │  1. Apply field updates in transaction                              │    │
│  │  2. Create new tags                                                 │    │
│  │  3. Log changes (ContactEnrichmentLog)                              │    │
│  │  4. Recalculate enrichment score                                    │    │
│  │  5. Return score delta for celebration                              │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              ResearchApplyCelebration                               │    │
│  │  Score: 45 → 72 (+27)                                               │    │
│  │  Rank: #7 → #3 of 47 contacts                                       │    │
│  │  Changes: "Added job role", "Updated company", "Added 2 tags"       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies

### External Services

| Service | Purpose | API |
|---------|---------|-----|
| **Tavily** | Web search & LinkedIn extraction | `api.tavily.com/search`, `/extract` |
| **OpenAI** | Report synthesis & recommendations | GPT-4o-mini via Vercel AI SDK |

### Environment Variables

```bash
TAVILY_API_KEY=tvly-...    # Get from https://tavily.com
OPENAI_API_KEY=sk-...       # Get from https://platform.openai.com
```

### Internal Dependencies

| File | Purpose |
|------|---------|
| `src/lib/research/orchestrator.ts` | Main research execution logic |
| `src/lib/research/tavilyClient.ts` | Tavily API wrapper |
| `src/lib/research/queryBuilder.ts` | Search query construction |
| `src/lib/research/prompts.ts` | GPT system prompts |
| `src/lib/research/schemas.ts` | Zod validation schemas |
| `src/lib/research/types.ts` | TypeScript interfaces |
| `src/lib/enrichment.ts` | Score calculation |

---

## 3. User Experience Flow

### Entry Point

Contact detail page → "Research" button (requires first + last name)

### Research Flow

```
1. SELECT FOCUS AREAS
   └─> Modal with checkboxes:
       - Professional Background
       - Expertise & Skills
       - Interests & Hobbies
       - Recent News

2. RESEARCH IN PROGRESS
   └─> Progress stages displayed:
       - "Building search query..."
       - "Extracting LinkedIn profile..."
       - "Searching the web..."
       - "Analyzing findings..."
       - "Generating recommendations..."
       - "Research complete!"

3. REVIEW RESULTS
   └─> Summary (3-5 bullet points)
   └─> Full report (expandable markdown)
   └─> Recommendation cards sorted by confidence
   └─> Each card: field, action, value, reasoning, sources

4. APPROVE/REJECT/EDIT
   └─> Per-recommendation actions
   └─> Bulk "Approve All" button
   └─> Edit proposed values before applying

5. APPLY CHANGES
   └─> Single "Apply" button for all approved
   └─> Transaction-safe update
   └─> Score recalculation

6. CELEBRATION
   └─> Score improvement animation
   └─> Human-readable changes summary
   └─> Research history collapse into tile
```

---

## 4. File-by-File Mapping

### Core Research Logic

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/research/orchestrator.ts` | 1-232 | Main orchestration |
| `src/lib/research/tavilyClient.ts` | 1-229 | Tavily API calls |
| `src/lib/research/queryBuilder.ts` | 1-50 | Query construction |
| `src/lib/research/prompts.ts` | 1-200+ | GPT system prompts |
| `src/lib/research/schemas.ts` | 1-100 | Zod schemas |
| `src/lib/research/types.ts` | 1-86 | Type definitions |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/contacts/:id/research` | POST | Start research run |
| `/api/contacts/:id/research` | GET | List research history |
| `/api/contacts/:id/research/:runId` | GET | Get run details |
| `/api/contacts/:id/research/:runId/recommendations/:recId` | PATCH | Update recommendation |
| `/api/contacts/:id/research/:runId/apply` | POST | Apply recommendations |

### UI Components

| File | Purpose |
|------|---------|
| `src/components/research/ResearchButton.tsx` | Entry point button |
| `src/components/research/ResearchOptionsModal.tsx` | Focus area selection |
| `src/components/research/ResearchResultsPanel.tsx` | Results display |
| `src/components/research/RecommendationCard.tsx` | Single recommendation |
| `src/components/research/InlineDiff.tsx` | Value diff display |
| `src/components/research/ResearchRunHistory.tsx` | Past runs accordion |
| `src/components/research/ResearchRunTile.tsx` | Collapsed run tile |
| `src/components/research/ResearchApplyCelebration.tsx` | Post-apply animation |
| `src/components/research/ChangesSummaryList.tsx` | Applied changes list |

### Database Models

```prisma
model ContactResearchRun {
  id              String
  contactId       String
  userId          String
  searchQuery     String
  focusAreas      String[]        // ["professional", "expertise", ...]
  status          ResearchStatus  // PENDING, RUNNING, COMPLETED, FAILED
  progressStage   String?
  summary         String?         // Bullet summary
  fullReport      String?         // Markdown report
  sourceUrls      String[]
  executionTimeMs Int?
  appliedAt       DateTime?       // When recommendations applied
  previousScore   Int?            // Score before apply
  newScore        Int?            // Score after apply
  appliedChangesSummary String?   // JSON array of change descriptions
  recommendations ContactRecommendation[]
}

model ContactRecommendation {
  id            String
  researchRunId String
  fieldName     String    // expertise, interests, whyNow, notes, title, company, tags
  action        'ADD' | 'UPDATE'
  currentValue  String?
  proposedValue String
  tagCategory   String?   // For tag recommendations
  reasoning     String
  confidence    Float     // 0.0 - 1.0
  sourceUrls    String[]
  status        'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED'
  editedValue   String?   // User-edited value
}
```

---

## 5. Connections & Integrations

### Tavily Search API

```typescript
// src/lib/research/tavilyClient.ts
const SEARCH_CONFIG = {
  maxResults: 10,
  searchDepth: 'advanced',    // 2 credits per search
  includeRawContent: true,
};

const MIN_RELEVANCE_SCORE = 0.2;

// Search with name filtering
const findings = await searchTavily(searchQuery, fullName);
// Returns: { query, sources: TavilySearchResult[], sourcesAnalyzed }
```

### Tavily Extract API (LinkedIn)

```typescript
// Direct profile extraction
const result = await extractLinkedInProfile(linkedinUrl);
// Returns: { success, url, rawContent, error? }
```

### GPT-4o-mini Synthesis

```typescript
// src/lib/research/orchestrator.ts:100-115
const synthesisResult = await generateObject({
  model: gpt4oMini(),
  system: SYNTHESIS_SYSTEM_PROMPT,
  prompt: synthesisPrompt,
  schema: reportSynthesisSchema,
});
// Returns: { summary, fullReport, keyFindings }
```

### GPT-4o-mini Recommendations

```typescript
// src/lib/research/orchestrator.ts:131-148
const recResult = await generateObject({
  model: gpt4oMini(),
  system: RECOMMENDATION_SYSTEM_PROMPT,
  prompt: recommendationPrompt,
  schema: recommendationOutputSchema,
});
// Returns: { recommendations, noRecommendationsReason? }
```

---

## 6. Gotchas & Pitfalls

### Tavily API Limits

1. **Query Length Limit**
   - Max 400 characters
   - `queryBuilder.ts` must truncate

2. **Rate Limits**
   - Advanced search: 2 credits per call
   - Monitor credit usage

3. **LinkedIn Extraction**
   - Requires `extract_depth: 'advanced'`
   - 30 second timeout
   - May fail for private profiles

### Recommendation Filtering

1. **Confidence Threshold**
   ```typescript
   const MIN_CONFIDENCE_THRESHOLD = 0.5;
   // Recommendations below 0.5 confidence are filtered out
   ```

2. **Duplicate Detection**
   ```typescript
   // orchestrator.ts:165-173
   // Skip if proposed value matches or is contained in current value
   if (current === proposed) return false;
   if (current.includes(proposed)) return false;
   ```

3. **Field Validation**
   - Only allow: expertise, interests, whyNow, notes, title, organizationalTitle, company, location, tags
   - Tags require `tagCategory` field

### Transaction Safety

```typescript
// apply/route.ts:109-204
await prisma.$transaction(async (tx) => {
  // All updates within transaction
  // If any fail, all roll back
});
```

### Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Not checking `firstName && lastName` | Require both before research |
| Ignoring `editedValue` | Always prefer `editedValue || proposedValue` |
| Duplicate tags | Check `text` case-insensitively before create |
| Missing score recalculation | Always recalc after apply |
| Not logging changes | Create `ContactEnrichmentLog` for audit trail |

---

## 7. Development Scenarios

### Adding a New Researchable Field

1. **Update Types** (`src/lib/research/types.ts`)
   ```typescript
   export interface ContactContext {
     ...existingFields,
     newField: string | null;
   }

   export const RESEARCH_FIELD_LABELS: Record<string, string> = {
     ...existingLabels,
     newField: 'human readable label',
   };
   ```

2. **Update Schema** (`src/lib/research/schemas.ts`)
   ```typescript
   const recommendationFieldNames = z.enum([
     ...existingFields,
     'newField',
   ]);
   ```

3. **Update Prompts** (`src/lib/research/prompts.ts`)
   - Add to RECOMMENDATION_SYSTEM_PROMPT field list
   - Add examples

4. **Update Apply Route** (`apply/route.ts`)
   ```typescript
   const contactUpdates: Partial<Pick<Contact,
     ...existingFields
     | 'newField'
   >> = {};
   ```

5. **Update Orchestrator** (`orchestrator.ts`)
   ```typescript
   function getContactFieldValue(contact, fieldName) {
     case 'newField':
       return contact.newField;
   }
   ```

### Debugging Research Failures

1. **Check Tavily Response**
   ```typescript
   console.log('[Tavily Search] Raw results:', data.results?.length);
   console.log('[Tavily Search] Sources after filtering:', filteredSources.length);
   ```

2. **Check GPT Output**
   ```typescript
   console.log('[Orchestrator] Synthesis result:', synthesisResult.object);
   console.log('[Orchestrator] Recommendations:', recResult.object.recommendations);
   ```

3. **Check Database State**
   ```sql
   SELECT * FROM "ContactResearchRun" WHERE id = 'xxx';
   SELECT * FROM "ContactRecommendation" WHERE "researchRunId" = 'xxx';
   ```

### Testing Research Manually

```bash
# Start dev server
PORT=3333 npm run dev

# Navigate to contact with first + last name
open http://localhost:3333/contacts/[CONTACT_ID]

# Click "Research" button
# Select focus areas
# Monitor console for progress
# Review recommendations
# Test approve/reject/edit
# Apply and verify celebration
```

---

## 8. Testing Approach

### Manual Test Cases

| Test | Steps | Expected |
|------|-------|----------|
| Research requires name | Try research on contact without last name | Error: "must have first and last name" |
| Focus area selection | Select only "Professional" | Recommendations focused on career |
| Empty results | Research obscure name | "No recommendations" message |
| LinkedIn extraction | Provide valid LinkedIn URL | LinkedIn content in sources |
| Approve flow | Click Approve on card | Card shows "Approved" state |
| Reject flow | Click Reject on card | Card shows "Rejected" state |
| Edit flow | Edit proposed value | Edited value saved |
| Apply single | Approve 1, Apply | Single change applied |
| Apply multiple | Approve 3, Apply | All 3 changes applied |
| Score increase | Apply to low-score contact | Celebration shows score delta |
| Duplicate tags | Try to add existing tag | Tag not duplicated |

### E2E Test Approach

```typescript
test('research generates and applies recommendations', async ({ page }) => {
  // Login and navigate to contact
  await page.goto('/contacts/[id]');

  // Click Research button
  await page.click('button:has-text("Research")');

  // Select focus areas
  await page.check('text=Professional Background');
  await page.check('text=Expertise');
  await page.click('button:has-text("Start Research")');

  // Wait for completion
  await expect(page.locator('text=Research Results')).toBeVisible({ timeout: 60000 });

  // Approve a recommendation
  await page.click('.recommendation-card >> nth=0 >> button:has-text("Approve")');

  // Apply
  await page.click('button:has-text("Apply")');

  // Verify celebration
  await expect(page.locator('.research-celebration')).toBeVisible();
});
```

---

## 9. Quick Reference

### Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| MIN_CONFIDENCE_THRESHOLD | 0.5 | orchestrator.ts:20 |
| MIN_RELEVANCE_SCORE | 0.2 | tavilyClient.ts:33 |
| maxResults | 10 | tavilyClient.ts:24 |
| searchDepth | 'advanced' | tavilyClient.ts:25 |
| maxDuration | 60s | research/route.ts:10 |

### Focus Areas

| Area | Description |
|------|-------------|
| `professional` | Career, job history, companies |
| `expertise` | Skills, domains, knowledge areas |
| `interests` | Hobbies, personal activities |
| `news` | Recent mentions, articles |

### Recommendation Fields

| Field | Points | Notes |
|-------|--------|-------|
| expertise | 5 | Skills, domains |
| interests | 5 | Hobbies, passions |
| whyNow | 20 | Time-sensitive context |
| notes | 5 | General information |
| title | 10 | Job role |
| organizationalTitle | 0 | Position in org |
| company | 10 | Organization |
| location | 5 | Geographic |
| tags | 5 | Categorical labels |

### API Request/Response

```typescript
// POST /api/contacts/:id/research
Request: { focusAreas: ['professional', 'expertise'] }
Response: {
  id: string,
  status: 'COMPLETED',
  summary: string,
  fullReport: string,
  sourceUrls: string[],
  recommendations: Recommendation[]
}

// POST /api/contacts/:id/research/:runId/apply
Request: { recommendationIds?: string[] }
Response: {
  success: true,
  appliedCount: number,
  previousScore: number,
  newScore: number,
  appliedChangesSummary: string[],
  contact: { id, enrichmentScore }
}
```

### Debugging

```bash
# Check Tavily API key
echo $TAVILY_API_KEY | head -c 10

# Watch research logs
PORT=3333 npm run dev 2>&1 | grep '\[Research\]'

# Check database
npx prisma studio
# Browse ContactResearchRun and ContactRecommendation tables
```
