# Task Breakdown: Contact Deep Research

**Generated:** 2026-01-10
**Source:** specs/contact-deep-research/02-spec.md
**Feature Slug:** contact-deep-research

---

## Overview

This task breakdown implements the Contact Deep Research feature, enabling users to run AI-powered web research on any contact in their CRM. The system searches the internet via Tavily API, synthesizes findings with GPT-4o-mini, and generates profile update recommendations that users can review, edit, and apply.

**Total Tasks:** 18
**Phases:** 4
**Estimated Complexity:** Large feature

---

## Re-decompose Metadata

### Decompose History
| Session | Date | Mode | Tasks Created | Notes |
|---------|------|------|---------------|-------|
| 1 | 2026-01-10 | Full | 18 | Initial decomposition |

### Last Decompose: 2026-01-10

---

## Phase 1: Database Foundation (4 tasks)

### Task 1.1: Add Research Enums to Prisma Schema
**Description:** Add ResearchStatus, RecommendationStatus, and RecommendationAction enums to prisma/schema.prisma
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (must be first)

**Technical Requirements:**
Add the following enum definitions to prisma/schema.prisma:

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

enum RecommendationAction {
  ADD
  UPDATE
}
```

**Implementation Steps:**
1. Open prisma/schema.prisma
2. Add the three enum definitions after existing enums (after FeedbackStatus)
3. Verify syntax is correct

**Acceptance Criteria:**
- [ ] Three new enums added to schema
- [ ] Prisma generate succeeds without errors
- [ ] Enums match specification exactly

---

### Task 1.2: Create ContactResearchRun Model
**Description:** Add ContactResearchRun model for tracking research runs
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**
Add the ContactResearchRun model to prisma/schema.prisma:

```prisma
model ContactResearchRun {
  id              String         @id @default(cuid())
  contactId       String
  userId          String

  // Research configuration
  searchQuery     String         // Optimized query sent to Tavily
  focusAreas      String[]       // ["professional", "expertise", "interests", "news"]

  // Status tracking
  status          ResearchStatus @default(PENDING)
  progressStage   String?        // "Searching...", "Analyzing...", "Generating recommendations..."
  errorMessage    String?

  // Results
  summary         String?        @db.Text  // Bullet summary for quick display
  fullReport      String?        @db.Text  // Detailed markdown report
  sourceUrls      String[]       // All sources found during research

  // Metadata
  startedAt       DateTime?
  completedAt     DateTime?
  executionTimeMs Int?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  contact         Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  recommendations ContactRecommendation[]

  @@index([contactId])
  @@index([userId, createdAt])
  @@index([status])
}
```

**Also update Contact model** to add relation:
```prisma
model Contact {
  // ... existing fields ...
  researchRuns    ContactResearchRun[]
}
```

**Also update User model** to add relation:
```prisma
model User {
  // ... existing fields ...
  researchRuns    ContactResearchRun[]
}
```

**Implementation Steps:**
1. Add ContactResearchRun model after ContactMention model
2. Add researchRuns relation to Contact model
3. Add researchRuns relation to User model
4. Use @db.Text for summary and fullReport (can be long)
5. Add proper indexes for common queries

**Acceptance Criteria:**
- [ ] ContactResearchRun model matches specification
- [ ] Contact model has researchRuns relation
- [ ] User model has researchRuns relation
- [ ] All indexes defined correctly
- [ ] onDelete: Cascade configured for both FK relations

---

### Task 1.3: Create ContactRecommendation Model
**Description:** Add ContactRecommendation model for storing AI-generated recommendations
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** None

**Technical Requirements:**
Add the ContactRecommendation model to prisma/schema.prisma:

```prisma
model ContactRecommendation {
  id              String               @id @default(cuid())
  researchRunId   String

  // What to update
  fieldName       String               // expertise | interests | whyNow | notes | title | company | location | tags
  action          RecommendationAction // ADD (empty field) | UPDATE (existing value)
  currentValue    String?              @db.Text  // For comparison/diff display
  proposedValue   String               @db.Text  // The suggested new value

  // For tag recommendations (fieldName = "tags")
  tagCategory     String?              // RELATIONSHIP | OPPORTUNITY | EXPERTISE | INTEREST

  // Justification
  reasoning       String               @db.Text  // Why this recommendation was made
  confidence      Float                // 0.0 - 1.0
  sourceUrls      String[]             // Specific sources for this recommendation

  // Status
  status          RecommendationStatus @default(PENDING)
  editedValue     String?              @db.Text  // User-edited value (if different from proposed)
  reviewedAt      DateTime?
  appliedAt       DateTime?

  createdAt       DateTime             @default(now())

  // Relations
  researchRun     ContactResearchRun   @relation(fields: [researchRunId], references: [id], onDelete: Cascade)

  @@index([researchRunId, status])
  @@index([researchRunId, fieldName])
}
```

**Implementation Steps:**
1. Add ContactRecommendation model after ContactResearchRun
2. Ensure relation to ContactResearchRun uses onDelete: Cascade
3. Use @db.Text for all potentially long text fields
4. Add composite indexes for common query patterns

**Acceptance Criteria:**
- [ ] ContactRecommendation model matches specification
- [ ] Relation to ContactResearchRun works correctly
- [ ] All text fields use @db.Text
- [ ] Indexes support efficient querying by runId + status

---

### Task 1.4: Create ContactEnrichmentLog Model and Run Migration
**Description:** Add ContactEnrichmentLog for audit logging and run the database migration
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3
**Can run parallel with:** None

**Technical Requirements:**
Add the ContactEnrichmentLog model to prisma/schema.prisma:

```prisma
model ContactEnrichmentLog {
  id              String   @id @default(cuid())
  contactId       String

  fieldName       String
  previousValue   String?  @db.Text
  newValue        String   @db.Text
  source          String   // MANUAL | VOICE | RESEARCH | IMPORT
  researchRunId   String?  // Reference to research run if source = RESEARCH

  createdAt       DateTime @default(now())

  // Relations
  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, createdAt])
  @@index([source])
}
```

**Also update Contact model** to add relation:
```prisma
model Contact {
  // ... existing fields ...
  enrichmentLogs  ContactEnrichmentLog[]
}
```

**Implementation Steps:**
1. Add ContactEnrichmentLog model
2. Add enrichmentLogs relation to Contact model
3. Run `npx prisma migrate dev --name add_contact_research`
4. Verify migration succeeds
5. Run `npx prisma generate` to update client

**Acceptance Criteria:**
- [ ] ContactEnrichmentLog model matches specification
- [ ] Contact model has enrichmentLogs relation
- [ ] Migration runs successfully without data loss
- [ ] Prisma client is regenerated
- [ ] All three new models accessible via prisma client

---

## Phase 2: Research Library (6 tasks)

### Task 2.1: Create Research Types and Schemas
**Description:** Create TypeScript types and Zod schemas for the research system
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4
**Can run parallel with:** Task 2.2

**Technical Requirements:**
Create `src/lib/research/types.ts`:

```typescript
export interface ContactContext {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  expertise: string | null;
  interests: string | null;
  whyNow: string | null;
  notes: string | null;
}

export type FocusArea = 'professional' | 'expertise' | 'interests' | 'news';

export interface ResearchOptions {
  contact: ContactContext;
  focusAreas: FocusArea[];
  onProgress?: (stage: string) => void | Promise<void>;
}

export interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface ResearchFindings {
  query: string;
  sources: TavilySearchResult[];
  sourcesAnalyzed: number;
}

export interface SynthesizedReport {
  summary: string;      // 3-5 bullet points
  fullReport: string;   // Detailed markdown
  sourceUrls: string[];
}

export interface GeneratedRecommendation {
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  currentValue: string | null;
  proposedValue: string;
  tagCategory?: string;
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
}

export interface ResearchResult {
  success: boolean;
  searchQuery: string;
  findings: ResearchFindings | null;
  report: SynthesizedReport | null;
  recommendations: GeneratedRecommendation[];
  executionTimeMs: number;
  error?: string;
}
```

Create `src/lib/research/schemas.ts`:

```typescript
import { z } from 'zod';

export const focusAreaSchema = z.enum(['professional', 'expertise', 'interests', 'news']);

export const researchRequestSchema = z.object({
  focusAreas: z.array(focusAreaSchema).min(1).max(4),
});

export const updateRecommendationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  editedValue: z.string().optional(),
});

export const applyRecommendationsSchema = z.object({
  recommendationIds: z.array(z.string()).optional(),
});

// Schema for GPT structured output - recommendations
// CRITICAL: Use .nullable().optional() pattern for OpenAI structured outputs
export const recommendationOutputSchema = z.object({
  recommendations: z.array(z.object({
    fieldName: z.enum([
      'expertise',
      'interests',
      'whyNow',
      'notes',
      'title',
      'company',
      'location',
      'tags'
    ]),
    action: z.enum(['ADD', 'UPDATE']),
    proposedValue: z.string(),
    tagCategory: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']).nullable().optional(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    sourceUrls: z.array(z.string()),
  })),
  noRecommendationsReason: z.string().nullable().optional(),
});

// Schema for GPT structured output - report synthesis
export const reportSynthesisSchema = z.object({
  summary: z.string(),      // 3-5 bullet points
  fullReport: z.string(),   // Detailed markdown
  keyFindings: z.array(z.object({
    category: z.enum(['professional', 'expertise', 'interests', 'news', 'other']),
    finding: z.string(),
    confidence: z.number().min(0).max(1),
    sourceUrl: z.string().nullable().optional(),
  })),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
export type ReportSynthesis = z.infer<typeof reportSynthesisSchema>;
```

Create `src/lib/research/index.ts`:

```typescript
export * from './types';
export * from './schemas';
export { buildSearchQuery } from './queryBuilder';
export { searchTavily } from './tavilyClient';
export { executeContactResearch } from './orchestrator';
```

**Implementation Steps:**
1. Create src/lib/research/ directory
2. Create types.ts with all interfaces
3. Create schemas.ts with Zod schemas
4. Create index.ts barrel export
5. Verify all exports work correctly

**Acceptance Criteria:**
- [ ] All TypeScript interfaces defined correctly
- [ ] Zod schemas use .nullable().optional() for optional OpenAI fields
- [ ] Barrel exports work for clean imports
- [ ] No TypeScript errors in the module

---

### Task 2.2: Create Tavily Client
**Description:** Build the Tavily API client for web search
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.3

**Technical Requirements:**
Create `src/lib/research/tavilyClient.ts`:

```typescript
import type { TavilySearchResult, ResearchFindings } from './types';

interface TavilyConfig {
  maxResults: number;
  searchDepth: 'basic' | 'advanced';
  includeRawContent: boolean;
}

const MODERATE_CONFIG: TavilyConfig = {
  maxResults: 10,
  searchDepth: 'basic',
  includeRawContent: true,
};

// Lazy initialization pattern (same as openai.ts)
let _tavilyApiKey: string | null = null;

function getTavilyApiKey(): string {
  if (!_tavilyApiKey) {
    _tavilyApiKey = process.env.TAVILY_API_KEY || '';
    if (!_tavilyApiKey) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }
  }
  return _tavilyApiKey;
}

export async function searchTavily(query: string): Promise<ResearchFindings> {
  const apiKey = getTavilyApiKey();

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: MODERATE_CONFIG.searchDepth,
      max_results: MODERATE_CONFIG.maxResults,
      include_raw_content: MODERATE_CONFIG.includeRawContent,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  const sources: TavilySearchResult[] = (data.results || []).map((r: any) => ({
    url: r.url,
    title: r.title,
    content: r.content || r.raw_content || '',
    score: r.score || 0,
    publishedDate: r.published_date,
  }));

  return {
    query,
    sources,
    sourcesAnalyzed: sources.length,
  };
}
```

**Implementation Steps:**
1. Create tavilyClient.ts
2. Use lazy initialization for API key (build-safe)
3. Implement searchTavily function with proper error handling
4. Map Tavily response to internal TavilySearchResult type

**Acceptance Criteria:**
- [ ] Tavily client uses lazy initialization pattern
- [ ] searchTavily returns properly typed ResearchFindings
- [ ] Error handling includes status code and error message
- [ ] API key validation throws clear error if missing

---

### Task 2.3: Create Query Builder
**Description:** Build search query construction with Tavily's 400-char limit
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2

**Technical Requirements:**
Create `src/lib/research/queryBuilder.ts`:

```typescript
import type { ContactContext, FocusArea } from './types';

const TAVILY_MAX_QUERY_LENGTH = 400;

export function buildSearchQuery(
  contact: ContactContext,
  focusAreas: FocusArea[]
): string {
  const parts: string[] = [];

  // Always include full name in quotes for exact match
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  parts.push(`"${fullName}"`);

  // Add professional context for disambiguation
  if (contact.company) {
    parts.push(contact.company);
  }
  if (contact.title) {
    parts.push(contact.title);
  }
  if (contact.location) {
    parts.push(contact.location);
  }

  // Add focus-specific terms
  if (focusAreas.includes('professional')) {
    parts.push('career background work experience');
  }
  if (focusAreas.includes('expertise')) {
    parts.push('expertise skills specialization');
  }
  if (focusAreas.includes('interests')) {
    parts.push('interests hobbies personal');
  }
  if (focusAreas.includes('news')) {
    parts.push('news announcement recent 2024 2025 2026');
  }

  // Combine and enforce character limit
  let query = parts.join(' ');

  if (query.length > TAVILY_MAX_QUERY_LENGTH) {
    // Prioritize: name + company + title, truncate the rest
    const essential = [
      `"${fullName}"`,
      contact.company,
      contact.title,
    ].filter(Boolean).join(' ');

    const remaining = TAVILY_MAX_QUERY_LENGTH - essential.length - 1;
    const focusTerms = parts.slice(3).join(' ').slice(0, remaining);
    query = `${essential} ${focusTerms}`.trim();
  }

  // ALWAYS enforce limit (GPT doesn't always respect limits)
  return query.slice(0, TAVILY_MAX_QUERY_LENGTH);
}
```

**Implementation Steps:**
1. Create queryBuilder.ts
2. Build query with name in quotes for exact match
3. Add disambiguation context (company, title, location)
4. Add focus-specific search terms
5. CRITICAL: Always enforce 400-char limit with slice()

**Acceptance Criteria:**
- [ ] Query always <= 400 characters
- [ ] Name is quoted for exact match
- [ ] Focus areas add appropriate search terms
- [ ] Truncation preserves essential info (name, company, title)

---

### Task 2.4: Create AI Prompts
**Description:** Build system prompts for synthesis and recommendation generation
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2, 2.3

**Technical Requirements:**
Create `src/lib/research/prompts.ts`:

```typescript
import type { ContactContext, FocusArea, TavilySearchResult } from './types';

export function buildSynthesisPrompt(
  contact: ContactContext,
  focusAreas: FocusArea[],
  sources: TavilySearchResult[]
): string {
  const focusDescription = focusAreas.map(f => {
    switch (f) {
      case 'professional': return 'career and professional background';
      case 'expertise': return 'skills, expertise, and domain knowledge';
      case 'interests': return 'personal interests, hobbies, and passions';
      case 'news': return 'recent news, announcements, and updates';
    }
  }).join(', ');

  return `You are analyzing web search results about a person to create a research report.

PERSON:
- Name: ${contact.firstName} ${contact.lastName}
- Current Title: ${contact.title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Location: ${contact.location || 'Unknown'}
- LinkedIn: ${contact.linkedinUrl || 'Not provided'}

FOCUS AREAS: ${focusDescription}

SEARCH RESULTS:
${sources.map((s, i) => `
[Source ${i + 1}] ${s.title}
URL: ${s.url}
${s.publishedDate ? `Published: ${s.publishedDate}` : ''}
Content: ${s.content.slice(0, 2000)}
`).join('\n---\n')}

INSTRUCTIONS:
1. Analyze the search results to find relevant information about this person
2. Prioritize information from LinkedIn and professional sources
3. Be skeptical of information that might be about a different person with the same name
4. Focus on the requested areas: ${focusDescription}

Generate a structured report with:
- summary: 3-5 bullet points (each 60-100 characters) summarizing key findings
- fullReport: Detailed markdown report (300-800 words) organized by topic
- keyFindings: Array of specific findings with confidence scores (0-1)

Only include findings you can attribute to specific sources.
If you cannot verify information is about this specific person, lower the confidence score.`;
}

export function buildRecommendationPrompt(
  contact: ContactContext,
  synthesizedReport: string,
  keyFindings: { category: string; finding: string; confidence: number; sourceUrl?: string | null }[]
): string {
  return `You are generating profile update recommendations based on research findings.

CURRENT CONTACT PROFILE:
- Name: ${contact.firstName} ${contact.lastName}
- Title: ${contact.title || 'Not set'}
- Company: ${contact.company || 'Not set'}
- Location: ${contact.location || 'Not set'}
- Expertise: ${contact.expertise || 'Not documented'}
- Interests: ${contact.interests || 'Not documented'}
- Why Now (reason to reach out): ${contact.whyNow || 'Not documented'}
- Notes: ${contact.notes || 'None'}

RESEARCH REPORT:
${synthesizedReport}

KEY FINDINGS:
${keyFindings.map(f => `- [${f.category}] ${f.finding} (confidence: ${f.confidence})`).join('\n')}

INSTRUCTIONS:
Generate recommendations for updating this person's profile. For each recommendation:
1. fieldName: Which field to update (expertise, interests, whyNow, notes, title, company, location, or tags)
2. action: "ADD" if field is empty, "UPDATE" if adding to/replacing existing content
3. proposedValue: The suggested new content
4. tagCategory: If fieldName is "tags", specify RELATIONSHIP, OPPORTUNITY, EXPERTISE, or INTEREST
5. reasoning: Brief explanation of why this update is valuable (1-2 sentences)
6. confidence: 0.0-1.0 based on source reliability and relevance
7. sourceUrls: URLs where this information was found

GUIDELINES:
- Only suggest updates with confidence >= 0.5
- For "whyNow", focus on recent news, role changes, or timely opportunities
- For "expertise", use specific skills and domains (not generic terms)
- For "interests", include both professional and personal interests
- For "tags", suggest 2-4 relevant tags that categorize this person
- Prefer specific, verifiable information over general inferences
- If current value exists and is accurate, don't suggest redundant updates
- Maximum 10 recommendations total`;
}

export const SYNTHESIS_SYSTEM_PROMPT = `You are a professional research analyst specializing in gathering information about individuals for CRM enrichment. You are thorough, accurate, and careful to distinguish between people with similar names. You prioritize verifiable information from authoritative sources.`;

export const RECOMMENDATION_SYSTEM_PROMPT = `You are a CRM enrichment specialist who helps users maintain accurate and useful contact profiles. You generate specific, actionable recommendations that add value to professional relationships. You are conservative with confidence scores and only recommend updates you can substantiate.`;
```

**Implementation Steps:**
1. Create prompts.ts
2. Implement buildSynthesisPrompt with source content truncation
3. Implement buildRecommendationPrompt with current profile context
4. Define system prompts for both AI calls
5. Ensure prompts guide AI to be conservative with confidence

**Acceptance Criteria:**
- [ ] Synthesis prompt includes all source content (truncated to 2000 chars each)
- [ ] Recommendation prompt includes current contact profile for comparison
- [ ] Prompts instruct AI to be skeptical of common name confusion
- [ ] Confidence guidance included (only >= 0.5 recommended)

---

### Task 2.5: Create Research Orchestrator
**Description:** Build the main orchestration function that coordinates the full research flow
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1, 2.2, 2.3, 2.4
**Can run parallel with:** None

**Technical Requirements:**
Create `src/lib/research/orchestrator.ts`:

```typescript
import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';
import type {
  ContactContext,
  FocusArea,
  ResearchResult,
  GeneratedRecommendation,
  SynthesizedReport
} from './types';
import { reportSynthesisSchema, recommendationOutputSchema } from './schemas';
import { buildSearchQuery } from './queryBuilder';
import { searchTavily } from './tavilyClient';
import {
  buildSynthesisPrompt,
  buildRecommendationPrompt,
  SYNTHESIS_SYSTEM_PROMPT,
  RECOMMENDATION_SYSTEM_PROMPT
} from './prompts';

const MIN_CONFIDENCE_THRESHOLD = 0.5;

export async function executeContactResearch(
  options: {
    contact: ContactContext;
    focusAreas: FocusArea[];
    onProgress?: (stage: string) => void | Promise<void>;
  }
): Promise<ResearchResult> {
  const { contact, focusAreas, onProgress } = options;
  const startTime = Date.now();

  try {
    // Step 1: Build search query
    await onProgress?.('Building search query...');
    const searchQuery = buildSearchQuery(contact, focusAreas);

    // Step 2: Execute Tavily search
    await onProgress?.('Searching the web...');
    const findings = await searchTavily(searchQuery);

    if (findings.sources.length === 0) {
      return {
        success: true,
        searchQuery,
        findings,
        report: null,
        recommendations: [],
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Step 3: Synthesize report with GPT
    await onProgress?.('Analyzing findings...');
    const synthesisPrompt = buildSynthesisPrompt(contact, focusAreas, findings.sources);

    const synthesisResult = await generateObject({
      model: gpt4oMini,
      system: SYNTHESIS_SYSTEM_PROMPT,
      prompt: synthesisPrompt,
      schema: reportSynthesisSchema,
    });

    const report: SynthesizedReport = {
      summary: synthesisResult.object.summary,
      fullReport: synthesisResult.object.fullReport,
      sourceUrls: [...new Set(findings.sources.map(s => s.url))],
    };

    // Step 4: Generate recommendations
    await onProgress?.('Generating recommendations...');
    const recommendationPrompt = buildRecommendationPrompt(
      contact,
      report.fullReport,
      synthesisResult.object.keyFindings
    );

    const recResult = await generateObject({
      model: gpt4oMini,
      system: RECOMMENDATION_SYSTEM_PROMPT,
      prompt: recommendationPrompt,
      schema: recommendationOutputSchema,
    });

    // Step 5: Filter and enrich recommendations
    const recommendations: GeneratedRecommendation[] = recResult.object.recommendations
      .filter(r => r.confidence >= MIN_CONFIDENCE_THRESHOLD)
      .map(r => ({
        fieldName: r.fieldName,
        action: r.action,
        currentValue: getContactFieldValue(contact, r.fieldName),
        proposedValue: r.proposedValue,
        tagCategory: r.tagCategory || undefined,
        reasoning: r.reasoning,
        confidence: r.confidence,
        sourceUrls: r.sourceUrls,
      }));

    await onProgress?.('Research complete!');

    return {
      success: true,
      searchQuery,
      findings,
      report,
      recommendations,
      executionTimeMs: Date.now() - startTime,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      searchQuery: '',
      findings: null,
      report: null,
      recommendations: [],
      executionTimeMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

function getContactFieldValue(contact: ContactContext, fieldName: string): string | null {
  switch (fieldName) {
    case 'expertise': return contact.expertise;
    case 'interests': return contact.interests;
    case 'whyNow': return contact.whyNow;
    case 'notes': return contact.notes;
    case 'title': return contact.title;
    case 'company': return contact.company;
    case 'location': return contact.location;
    case 'tags': return null; // Tags handled separately
    default: return null;
  }
}
```

**Key Implementation Notes:**
- Uses gpt4oMini from existing @/lib/openai (NOT direct openai import)
- Progress callback updates database in API route
- Filters recommendations to >= 0.5 confidence
- Catches errors and returns success: false with error message

**Implementation Steps:**
1. Create orchestrator.ts
2. Import gpt4oMini from @/lib/openai
3. Implement 5-step flow with progress callbacks
4. Add confidence filtering (MIN_CONFIDENCE_THRESHOLD = 0.5)
5. Implement getContactFieldValue helper for currentValue population
6. Add comprehensive error handling

**Acceptance Criteria:**
- [ ] Uses existing gpt4oMini from @/lib/openai
- [ ] Progress callbacks called at each stage
- [ ] Recommendations filtered to >= 0.5 confidence
- [ ] Error handling returns structured error response
- [ ] Execution time tracked accurately

---

### Task 2.6: Create Error Types
**Description:** Build custom error classes for the research system
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2, 2.3, 2.4

**Technical Requirements:**
Create `src/lib/research/errors.ts`:

```typescript
export class ResearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}

export class TavilyError extends ResearchError {
  constructor(message: string) {
    super(message, 'TAVILY_ERROR', 502);
  }
}

export class SynthesisError extends ResearchError {
  constructor(message: string) {
    super(message, 'SYNTHESIS_ERROR', 500);
  }
}

export class InsufficientDataError extends ResearchError {
  constructor(message: string = 'Contact does not have enough data for research') {
    super(message, 'INSUFFICIENT_DATA', 400);
  }
}
```

**Implementation Steps:**
1. Create errors.ts
2. Define base ResearchError with code and statusCode
3. Create specific error types for different failure modes
4. Export from index.ts

**Acceptance Criteria:**
- [ ] All error types extend ResearchError
- [ ] Each error has appropriate status code
- [ ] Errors can be caught and handled in API routes

---

## Phase 3: API Routes (4 tasks)

### Task 3.1: Create Research Initiation Route (POST)
**Description:** Build the main endpoint to start a research run
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.5
**Can run parallel with:** None

**Technical Requirements:**
Create `src/app/api/contacts/[id]/research/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { researchRequestSchema } from '@/lib/research/schemas';
import { executeContactResearch } from '@/lib/research/orchestrator';
import type { ContactContext } from '@/lib/research/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for research

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await request.json();
    const parseResult = researchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { focusAreas } = parseResult.data;

    // Get contact
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Validate contact has minimum required data
    if (!contact.firstName || !contact.lastName) {
      return NextResponse.json(
        { error: 'Contact must have first and last name for research' },
        { status: 400 }
      );
    }

    // Create research run record
    const researchRun = await prisma.contactResearchRun.create({
      data: {
        contactId: contact.id,
        userId: user.id,
        searchQuery: '', // Will be updated
        focusAreas,
        status: 'RUNNING',
        progressStage: 'Initializing...',
        startedAt: new Date(),
      },
    });

    // Build contact context
    const contactContext: ContactContext = {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName || '',
      primaryEmail: contact.primaryEmail,
      title: contact.title,
      company: contact.company,
      location: contact.location,
      linkedinUrl: contact.linkedinUrl,
      expertise: contact.expertise,
      interests: contact.interests,
      whyNow: contact.whyNow,
      notes: contact.notes,
    };

    // Execute research
    const result = await executeContactResearch({
      contact: contactContext,
      focusAreas,
      onProgress: async (stage) => {
        await prisma.contactResearchRun.update({
          where: { id: researchRun.id },
          data: { progressStage: stage },
        });
      },
    });

    if (!result.success) {
      // Update run with error
      await prisma.contactResearchRun.update({
        where: { id: researchRun.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
          completedAt: new Date(),
          executionTimeMs: result.executionTimeMs,
        },
      });

      return NextResponse.json(
        { error: 'Research failed', message: result.error },
        { status: 500 }
      );
    }

    // Save recommendations
    if (result.recommendations.length > 0) {
      await prisma.contactRecommendation.createMany({
        data: result.recommendations.map((rec) => ({
          researchRunId: researchRun.id,
          fieldName: rec.fieldName,
          action: rec.action,
          currentValue: rec.currentValue,
          proposedValue: rec.proposedValue,
          tagCategory: rec.tagCategory || null,
          reasoning: rec.reasoning,
          confidence: rec.confidence,
          sourceUrls: rec.sourceUrls,
          status: 'PENDING',
        })),
      });
    }

    // Update run with results
    const completedRun = await prisma.contactResearchRun.update({
      where: { id: researchRun.id },
      data: {
        status: 'COMPLETED',
        searchQuery: result.searchQuery,
        summary: result.report?.summary || null,
        fullReport: result.report?.fullReport || null,
        sourceUrls: result.report?.sourceUrls || [],
        completedAt: new Date(),
        executionTimeMs: result.executionTimeMs,
        progressStage: null,
      },
      include: {
        recommendations: {
          orderBy: { confidence: 'desc' },
        },
      },
    });

    return NextResponse.json(completedRun, {
      status: 201,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });

  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Also add GET handler for research history in the same file:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: any = {
      contactId: id,
      userId: user.id,
    };
    if (status) {
      where.status = status;
    }

    const [runs, total] = await Promise.all([
      prisma.contactResearchRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          _count: { select: { recommendations: true } },
          recommendations: {
            where: { status: 'APPLIED' },
            select: { id: true },
          },
        },
      }),
      prisma.contactResearchRun.count({ where }),
    ]);

    return NextResponse.json({
      runs: runs.map(r => ({
        id: r.id,
        status: r.status,
        summary: r.summary,
        recommendationCount: r._count.recommendations,
        appliedCount: r.recommendations.length,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
      })),
      total,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });

  } catch (error) {
    console.error('Get research history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Implementation Notes:**
- Uses `{ params }: { params: Promise<{ id: string }> }` pattern (Next.js 14+)
- maxDuration = 60 for Vercel/Railway timeout
- Progress updates written to database
- No-cache headers prevent stale data

**Implementation Steps:**
1. Create route.ts in src/app/api/contacts/[id]/research/
2. Implement POST handler with auth, validation, execution
3. Implement GET handler for history
4. Use Promise<{ id: string }> params pattern
5. Set maxDuration and dynamic exports
6. Add no-cache headers

**Acceptance Criteria:**
- [ ] POST creates research run and executes research
- [ ] Progress stages update in database
- [ ] Recommendations saved on completion
- [ ] GET returns paginated research history
- [ ] Both handlers require authentication
- [ ] Contact must have firstName and lastName

---

### Task 3.2: Create Research Run Detail Route
**Description:** Build endpoint to get a specific research run with recommendations
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.3

**Technical Requirements:**
Create `src/app/api/contacts/[id]/research/[runId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const researchRun = await prisma.contactResearchRun.findFirst({
      where: {
        id: runId,
        contactId: id,
        userId: user.id,
      },
      include: {
        recommendations: {
          orderBy: { confidence: 'desc' },
        },
      },
    });

    if (!researchRun) {
      return NextResponse.json({ error: 'Research run not found' }, { status: 404 });
    }

    return NextResponse.json(researchRun, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });

  } catch (error) {
    console.error('Get research run error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create [runId] directory under research/
2. Create route.ts with GET handler
3. Verify run belongs to contact and user
4. Include recommendations ordered by confidence

**Acceptance Criteria:**
- [ ] Returns full research run with recommendations
- [ ] Validates user owns the contact and run
- [ ] 404 if run not found
- [ ] Recommendations sorted by confidence descending

---

### Task 3.3: Create Recommendation Update Route
**Description:** Build endpoint to approve/reject/edit recommendations
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.2

**Technical Requirements:**
Create `src/app/api/contacts/[id]/research/[runId]/recommendations/[recId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { updateRecommendationSchema } from '@/lib/research/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string; recId: string }> }
) {
  try {
    const { id, runId, recId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const parseResult = updateRecommendationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership through research run
    const researchRun = await prisma.contactResearchRun.findFirst({
      where: {
        id: runId,
        contactId: id,
        userId: user.id,
      },
    });

    if (!researchRun) {
      return NextResponse.json({ error: 'Research run not found' }, { status: 404 });
    }

    // Get and update recommendation
    const recommendation = await prisma.contactRecommendation.findFirst({
      where: {
        id: recId,
        researchRunId: runId,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (parseResult.data.status) {
      updateData.status = parseResult.data.status;
      updateData.reviewedAt = new Date();
    }
    if (parseResult.data.editedValue !== undefined) {
      updateData.editedValue = parseResult.data.editedValue;
    }

    const updated = await prisma.contactRecommendation.update({
      where: { id: recId },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      editedValue: updated.editedValue,
      reviewedAt: updated.reviewedAt?.toISOString() || null,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });

  } catch (error) {
    console.error('Update recommendation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Implementation Steps:**
1. Create recommendations/[recId] directory structure
2. Create route.ts with PATCH handler
3. Validate ownership through research run lookup
4. Allow updating status and/or editedValue
5. Set reviewedAt timestamp when status changes

**Acceptance Criteria:**
- [ ] PATCH updates recommendation status or editedValue
- [ ] Validates user owns the research run
- [ ] Sets reviewedAt on status change
- [ ] Returns updated recommendation data

---

### Task 3.4: Create Apply Recommendations Route
**Description:** Build endpoint to apply approved recommendations to contact
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1, 3.3
**Can run parallel with:** None

**Technical Requirements:**
Create `src/app/api/contacts/[id]/research/[runId]/apply/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { applyRecommendationsSchema } from '@/lib/research/schemas';
import { calculateEnrichmentScore } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = applyRecommendationsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Verify research run belongs to user
    const researchRun = await prisma.contactResearchRun.findFirst({
      where: { id: runId, contactId: id, userId: user.id },
    });

    if (!researchRun) {
      return NextResponse.json({ error: 'Research run not found' }, { status: 404 });
    }

    // Get recommendations to apply
    const whereClause: any = {
      researchRunId: runId,
      status: 'APPROVED',
    };
    if (parseResult.data.recommendationIds) {
      whereClause.id = { in: parseResult.data.recommendationIds };
    }

    const recommendations = await prisma.contactRecommendation.findMany({
      where: whereClause,
    });

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No approved recommendations to apply' },
        { status: 400 }
      );
    }

    // Get current contact state
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Apply in transaction
    const changes: { fieldName: string; previousValue: string | null; newValue: string }[] = [];

    await prisma.$transaction(async (tx) => {
      const contactUpdates: Record<string, string> = {};
      const newTags: { text: string; category: string }[] = [];

      for (const rec of recommendations) {
        const valueToApply = rec.editedValue || rec.proposedValue;

        if (rec.fieldName === 'tags' && rec.tagCategory) {
          // Handle tag recommendation
          newTags.push({
            text: valueToApply,
            category: rec.tagCategory,
          });
        } else {
          // Handle field recommendation
          const previousValue = (contact as any)[rec.fieldName] || null;
          contactUpdates[rec.fieldName] = valueToApply;

          changes.push({
            fieldName: rec.fieldName,
            previousValue,
            newValue: valueToApply,
          });

          // Create enrichment log
          await tx.contactEnrichmentLog.create({
            data: {
              contactId: id,
              fieldName: rec.fieldName,
              previousValue,
              newValue: valueToApply,
              source: 'RESEARCH',
              researchRunId: runId,
            },
          });
        }

        // Mark recommendation as applied
        await tx.contactRecommendation.update({
          where: { id: rec.id },
          data: { status: 'APPLIED', appliedAt: new Date() },
        });
      }

      // Update contact fields
      if (Object.keys(contactUpdates).length > 0) {
        await tx.contact.update({
          where: { id },
          data: {
            ...contactUpdates,
            lastEnrichedAt: new Date(),
          },
        });
      }

      // Create new tags
      for (const tag of newTags) {
        // Check if tag already exists for this contact
        const existingTag = await tx.tag.findFirst({
          where: {
            contactId: id,
            text: { equals: tag.text, mode: 'insensitive' },
          },
        });

        if (!existingTag) {
          await tx.tag.create({
            data: {
              contactId: id,
              text: tag.text,
              category: tag.category as any,
            },
          });

          changes.push({
            fieldName: 'tags',
            previousValue: null,
            newValue: `${tag.text} (${tag.category})`,
          });
        }
      }
    });

    // Recalculate enrichment score
    const contactWithTags = await prisma.contact.findUnique({
      where: { id },
      include: { tags: true },
    });

    const newScore = calculateEnrichmentScore(contactWithTags!);

    await prisma.contact.update({
      where: { id },
      data: { enrichmentScore: newScore },
    });

    return NextResponse.json({
      success: true,
      appliedCount: recommendations.length,
      contact: {
        id: contactWithTags!.id,
        enrichmentScore: newScore,
      },
      changes,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });

  } catch (error) {
    console.error('Apply recommendations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Implementation Notes:**
- Uses existing calculateEnrichmentScore from @/lib/enrichment
- Transaction ensures atomic application
- Creates enrichment log for each field change
- Handles tags separately (creates Tag records)
- Deduplicates tags by case-insensitive match

**Implementation Steps:**
1. Create apply/ directory under [runId]
2. Create route.ts with POST handler
3. Implement transaction for atomic updates
4. Create ContactEnrichmentLog entries
5. Handle tag creation with deduplication
6. Recalculate enrichment score after apply

**Acceptance Criteria:**
- [ ] Applies all APPROVED recommendations (or specific IDs)
- [ ] Creates enrichment log for each change
- [ ] Handles tags separately with deduplication
- [ ] Recalculates enrichment score
- [ ] Returns applied changes summary
- [ ] All changes atomic via transaction

---

## Phase 4: UI Components (4 tasks)

### Task 4.1: Create ResearchButton and ResearchOptionsModal
**Description:** Build the trigger button and focus area selection modal
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 4.2

**Technical Requirements:**
Create `src/components/research/ResearchButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResearchOptionsModal } from './ResearchOptionsModal';

interface ResearchButtonProps {
  contactId: string;
  contactName: string;
  disabled?: boolean;
  onResearchComplete?: () => void;
}

export function ResearchButton({
  contactId,
  contactName,
  disabled = false,
  onResearchComplete,
}: ResearchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        Research
      </Button>

      <ResearchOptionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactId={contactId}
        contactName={contactName}
        onResearchComplete={onResearchComplete}
      />
    </>
  );
}
```

Create `src/components/research/ResearchOptionsModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Brain, Heart, Newspaper, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FocusArea = 'professional' | 'expertise' | 'interests' | 'news';

interface FocusOption {
  id: FocusArea;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: 'professional',
    label: 'Professional Background',
    description: 'Career history, roles, and companies',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: 'expertise',
    label: 'Expertise & Skills',
    description: 'Domain knowledge and specializations',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'interests',
    label: 'Personal Interests',
    description: 'Hobbies, passions, and causes',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    id: 'news',
    label: 'Recent News',
    description: 'Latest announcements and updates',
    icon: <Newspaper className="h-4 w-4" />,
  },
];

interface ResearchOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onResearchComplete?: () => void;
}

export function ResearchOptionsModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  onResearchComplete,
}: ResearchOptionsModalProps) {
  const router = useRouter();
  const [selectedAreas, setSelectedAreas] = useState<FocusArea[]>([
    'professional',
    'expertise',
  ]);
  const [isResearching, setIsResearching] = useState(false);
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleArea = (area: FocusArea) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleStartResearch = async () => {
    if (selectedAreas.length === 0) return;

    setIsResearching(true);
    setProgressStage('Initializing...');
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusAreas: selectedAreas }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Research failed');
      }

      onResearchComplete?.();
      onClose();
      router.refresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsResearching(false);
      setProgressStage(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Research {contactName}</DialogTitle>
          <DialogDescription>
            Select what you want to learn about this person. We'll search the
            web and generate recommendations for their profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {FOCUS_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                selectedAreas.includes(option.id)
                  ? 'border-gold-primary bg-gold-subtle'
                  : 'border-border hover:border-gold-primary/50'
              )}
              onClick={() => !isResearching && toggleArea(option.id)}
            >
              <Checkbox
                checked={selectedAreas.includes(option.id)}
                disabled={isResearching}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <Label className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
            {error}
          </div>
        )}

        {isResearching && progressStage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progressStage}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isResearching}>
            Cancel
          </Button>
          <Button
            onClick={handleStartResearch}
            disabled={selectedAreas.length === 0 || isResearching}
            className="gap-2"
          >
            {isResearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              'Start Research'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Create `src/components/research/index.ts`:

```typescript
export { ResearchButton } from './ResearchButton';
export { ResearchOptionsModal } from './ResearchOptionsModal';
export { RecommendationCard } from './RecommendationCard';
export { ResearchResultsPanel } from './ResearchResultsPanel';
```

**Implementation Steps:**
1. Create src/components/research/ directory
2. Create ResearchButton.tsx
3. Create ResearchOptionsModal.tsx with focus area selection
4. Create index.ts barrel export
5. Use gold design system colors for selection state

**Acceptance Criteria:**
- [ ] Button opens modal when clicked
- [ ] Modal shows 4 focus area options with icons
- [ ] Selected areas highlighted with gold border/background
- [ ] Default selection: professional + expertise
- [ ] Error state displays clearly
- [ ] Loading state with spinner during research
- [ ] Modal closes and page refreshes on completion

---

### Task 4.2: Create RecommendationCard Component
**Description:** Build the individual recommendation display with approve/reject/edit actions
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.3
**Can run parallel with:** Task 4.1

**Technical Requirements:**
Create `src/components/research/RecommendationCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Check, X, Edit2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';

interface Recommendation {
  id: string;
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  currentValue: string | null;
  proposedValue: string;
  tagCategory: string | null;
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  editedValue: string | null;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, editedValue: string) => void;
  disabled?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  expertise: 'Expertise',
  interests: 'Interests',
  whyNow: 'Why Now',
  notes: 'Notes',
  title: 'Title',
  company: 'Company',
  location: 'Location',
  tags: 'Tag',
};

export function RecommendationCard({
  recommendation,
  onApprove,
  onReject,
  onEdit,
  disabled = false,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    recommendation.editedValue || recommendation.proposedValue
  );

  const confidenceColor =
    recommendation.confidence >= 0.8
      ? 'text-green-500'
      : recommendation.confidence >= 0.6
      ? 'text-yellow-500'
      : 'text-orange-500';

  const handleSaveEdit = () => {
    onEdit(recommendation.id, editValue);
    setIsEditing(false);
  };

  const displayValue = recommendation.editedValue || recommendation.proposedValue;

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        recommendation.status === 'APPROVED' && 'border-green-500/50 bg-green-500/5',
        recommendation.status === 'REJECTED' && 'border-red-500/50 bg-red-500/5 opacity-60',
        recommendation.status === 'APPLIED' && 'border-blue-500/50 bg-blue-500/5',
        recommendation.status === 'PENDING' && 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              {FIELD_LABELS[recommendation.fieldName] || recommendation.fieldName}
            </Badge>
            <Badge variant={recommendation.action === 'ADD' ? 'default' : 'secondary'}>
              {recommendation.action}
            </Badge>
            {recommendation.tagCategory && (
              <Badge
                style={{
                  backgroundColor: TAG_CATEGORY_COLORS[recommendation.tagCategory as keyof typeof TAG_CATEGORY_COLORS],
                }}
              >
                {recommendation.tagCategory}
              </Badge>
            )}
            <span className={cn('text-sm font-medium', confidenceColor)}>
              {Math.round(recommendation.confidence * 100)}% confidence
            </span>
          </div>

          {/* Value preview */}
          <div className="mt-2">
            {recommendation.action === 'UPDATE' && recommendation.currentValue && (
              <div className="text-sm text-muted-foreground line-through mb-1">
                {recommendation.currentValue.slice(0, 100)}
                {recommendation.currentValue.length > 100 && '...'}
              </div>
            )}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditValue(recommendation.editedValue || recommendation.proposedValue);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">
                {displayValue.slice(0, 200)}
                {displayValue.length > 200 && '...'}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {recommendation.status === 'PENDING' && !isEditing && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onApprove(recommendation.id)}
              disabled={disabled}
              className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
              title="Approve"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReject(recommendation.id)}
              disabled={disabled}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              title="Reject"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {recommendation.status !== 'PENDING' && (
          <Badge
            variant={
              recommendation.status === 'APPROVED'
                ? 'default'
                : recommendation.status === 'APPLIED'
                ? 'secondary'
                : 'destructive'
            }
          >
            {recommendation.status}
          </Badge>
        )}
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {isExpanded ? 'Hide details' : 'Show reasoning & sources'}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Reasoning</h4>
            <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
          </div>

          {recommendation.sourceUrls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Sources</h4>
              <ul className="space-y-1">
                {recommendation.sourceUrls.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(url).hostname}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Implementation Steps:**
1. Create RecommendationCard.tsx
2. Import TAG_CATEGORY_COLORS from @/lib/design-system
3. Implement status-based styling (APPROVED=green, REJECTED=red, APPLIED=blue)
4. Add inline editing with save/cancel
5. Add expandable reasoning and sources section
6. Confidence color coding (>=80% green, >=60% yellow, else orange)

**Acceptance Criteria:**
- [ ] Shows field name, action, and confidence
- [ ] Tag recommendations show category with correct color
- [ ] Approve/reject/edit buttons visible for PENDING only
- [ ] Inline editing saves via onEdit callback
- [ ] Expandable section shows reasoning and source URLs
- [ ] Status badge shows for non-PENDING recommendations
- [ ] UPDATE action shows strikethrough current value

---

### Task 4.3: Create ResearchResultsPanel Component
**Description:** Build the main panel showing research results and managing recommendations
**Size:** Large
**Priority:** High
**Dependencies:** Task 4.2, 3.4
**Can run parallel with:** None

**Technical Requirements:**
Create `src/components/research/ResearchResultsPanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecommendationCard } from './RecommendationCard';

interface Recommendation {
  id: string;
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  currentValue: string | null;
  proposedValue: string;
  tagCategory: string | null;
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  editedValue: string | null;
}

interface ResearchRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  recommendations: Recommendation[];
}

interface ResearchResultsPanelProps {
  contactId: string;
  researchRun: ResearchRun;
}

export function ResearchResultsPanel({
  contactId,
  researchRun,
}: ResearchResultsPanelProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState(researchRun.recommendations);
  const [isApplying, setIsApplying] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  const pendingCount = recommendations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = recommendations.filter((r) => r.status === 'APPROVED').length;
  const appliedCount = recommendations.filter((r) => r.status === 'APPLIED').length;

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/recommendations/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      }
    } catch (error) {
      console.error('Failed to update recommendation:', error);
    }
  };

  const handleEdit = async (id: string, editedValue: string) => {
    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/recommendations/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editedValue }),
        }
      );

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, editedValue } : r))
        );
      }
    } catch (error) {
      console.error('Failed to edit recommendation:', error);
    }
  };

  const handleApplyAll = async () => {
    const approvedIds = recommendations
      .filter((r) => r.status === 'APPROVED')
      .map((r) => r.id);

    if (approvedIds.length === 0) return;

    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendationIds: approvedIds }),
        }
      );

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) =>
            approvedIds.includes(r.id) ? { ...r, status: 'APPLIED' as const } : r
          )
        );
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to apply recommendations:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApproveAll = () => {
    recommendations
      .filter((r) => r.status === 'PENDING')
      .forEach((r) => handleUpdateStatus(r.id, 'APPROVED'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Research Results</h3>
          <p className="text-sm text-muted-foreground">
            {researchRun.executionTimeMs
              ? `Completed in ${(researchRun.executionTimeMs / 1000).toFixed(1)}s`
              : 'Processing...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-500">
            <CheckCircle className="h-3 w-3" />
            {approvedCount} approved
          </Badge>
          {appliedCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {appliedCount} applied
            </Badge>
          )}
        </div>
      </div>

      {/* Summary */}
      {researchRun.summary && (
        <div className="bg-secondary/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="text-sm whitespace-pre-wrap">{researchRun.summary}</div>
          {researchRun.fullReport && (
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="text-sm text-gold-primary hover:underline mt-2"
            >
              {showFullReport ? 'Hide full report' : 'Show full report'}
            </button>
          )}
          {showFullReport && researchRun.fullReport && (
            <div className="mt-4 pt-4 border-t prose prose-invert prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: researchRun.fullReport }} />
            </div>
          )}
        </div>
      )}

      {/* Bulk actions */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleApproveAll}>
            Approve All ({pendingCount})
          </Button>
        </div>
      )}

      {approvedCount > 0 && (
        <Button onClick={handleApplyAll} disabled={isApplying} className="w-full">
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Applying...
            </>
          ) : (
            `Apply ${approvedCount} Approved Recommendation${approvedCount !== 1 ? 's' : ''}`
          )}
        </Button>
      )}

      {/* Recommendations list */}
      <div className="space-y-3">
        {recommendations
          .sort((a, b) => b.confidence - a.confidence)
          .map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onApprove={(id) => handleUpdateStatus(id, 'APPROVED')}
              onReject={(id) => handleUpdateStatus(id, 'REJECTED')}
              onEdit={handleEdit}
              disabled={isApplying}
            />
          ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No recommendations generated. The research may not have found enough
          relevant information about this person.
        </div>
      )}

      {/* Sources */}
      {researchRun.sourceUrls.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">
            Sources ({researchRun.sourceUrls.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {researchRun.sourceUrls.slice(0, 5).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded"
              >
                {new URL(url).hostname}
              </a>
            ))}
            {researchRun.sourceUrls.length > 5 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{researchRun.sourceUrls.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Implementation Steps:**
1. Create ResearchResultsPanel.tsx
2. Track local state for recommendations (optimistic updates)
3. Implement handleUpdateStatus, handleEdit, handleApplyAll
4. Add "Approve All" bulk action
5. Show summary with expandable full report
6. Sort recommendations by confidence descending
7. Show source URLs with overflow handling

**Acceptance Criteria:**
- [ ] Shows execution time and status counts
- [ ] Summary displayed with toggle for full report
- [ ] "Approve All" button approves all pending
- [ ] "Apply" button applies all approved recommendations
- [ ] Recommendations sorted by confidence (highest first)
- [ ] Empty state when no recommendations
- [ ] Sources shown with "more" overflow

---

### Task 4.4: Integrate Research into Contact Detail Page
**Description:** Add Research button and results panel to the contact detail page
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1, 4.3
**Can run parallel with:** None

**Technical Requirements:**
Update `src/app/(dashboard)/contacts/[id]/page.tsx`:

1. Add imports:
```typescript
import { ResearchButton } from '@/components/research/ResearchButton';
import { ResearchResultsPanel } from '@/components/research/ResearchResultsPanel';
```

2. In the server component data fetching, add:
```typescript
// Fetch latest completed research run
const latestResearch = await prisma.contactResearchRun.findFirst({
  where: {
    contactId: contact.id,
    status: 'COMPLETED'
  },
  orderBy: { createdAt: 'desc' },
  include: {
    recommendations: {
      orderBy: { confidence: 'desc' }
    }
  },
});
```

3. Add ResearchButton near the EnrichmentScoreCard:
```tsx
<ResearchButton
  contactId={contact.id}
  contactName={`${contact.firstName} ${contact.lastName}`}
  disabled={!contact.firstName || !contact.lastName}
/>
```

4. Add ResearchResultsPanel below the contact info section (if research exists):
```tsx
{latestResearch && (
  <div className="mt-8">
    <ResearchResultsPanel
      contactId={contact.id}
      researchRun={{
        id: latestResearch.id,
        status: latestResearch.status,
        summary: latestResearch.summary,
        fullReport: latestResearch.fullReport,
        sourceUrls: latestResearch.sourceUrls,
        executionTimeMs: latestResearch.executionTimeMs,
        createdAt: latestResearch.createdAt.toISOString(),
        completedAt: latestResearch.completedAt?.toISOString() || null,
        recommendations: latestResearch.recommendations.map(r => ({
          id: r.id,
          fieldName: r.fieldName,
          action: r.action as 'ADD' | 'UPDATE',
          currentValue: r.currentValue,
          proposedValue: r.proposedValue,
          tagCategory: r.tagCategory,
          reasoning: r.reasoning,
          confidence: r.confidence,
          sourceUrls: r.sourceUrls,
          status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED',
          editedValue: r.editedValue,
        })),
      }}
    />
  </div>
)}
```

**Implementation Steps:**
1. Read current contacts/[id]/page.tsx structure
2. Add imports for research components
3. Add Prisma query for latest research run
4. Add ResearchButton near enrichment score
5. Add conditional ResearchResultsPanel
6. Map Prisma types to component interface types

**Acceptance Criteria:**
- [ ] Research button visible on contact detail page
- [ ] Button disabled if contact missing firstName or lastName
- [ ] Latest research results shown if exists
- [ ] Page refreshes show updated research data
- [ ] Research panel integrates visually with existing design

---

## Dependency Graph

```
Phase 1: Database Foundation
  1.1 Enums ─────────────────────────────────┐
              ↓                               │
  1.2 ContactResearchRun ────────────────────┤
              ↓                               │
  1.3 ContactRecommendation ─────────────────┤
              ↓                               │
  1.4 ContactEnrichmentLog + Migration ──────┘
              ↓
Phase 2: Research Library
  2.1 Types & Schemas ───┬───────────────────┐
              ↓          ↓                   │
  2.2 Tavily Client  2.3 Query Builder       │
              ↓          ↓                   │
  2.4 AI Prompts ────────┤                   │
              ↓          ↓                   │
  2.5 Orchestrator ──────┴───────────────────┤
              ↓                               │
  2.6 Error Types (parallel with 2.2-2.4) ───┘
              ↓
Phase 3: API Routes
  3.1 Research POST/GET ─────────────────────┐
              ↓                               │
  3.2 Run Detail GET ────┬───────────────────┤
              ↓          │                   │
  3.3 Recommendation PATCH ──────────────────┤
              ↓          ↓                   │
  3.4 Apply POST ────────┴───────────────────┘
              ↓
Phase 4: UI Components
  4.1 Button & Modal ────┬───────────────────┐
              ↓          │                   │
  4.2 RecommendationCard ┘                   │
              ↓                               │
  4.3 ResultsPanel ──────────────────────────┤
              ↓                               │
  4.4 Page Integration ──────────────────────┘
```

---

## Parallel Execution Opportunities

- **Phase 2**: Tasks 2.2, 2.3, 2.4, 2.6 can all run in parallel after 2.1
- **Phase 3**: Tasks 3.2 and 3.3 can run in parallel after 3.1
- **Phase 4**: Tasks 4.1 and 4.2 can run in parallel

---

## Environment Variables Required

Add to `.env.local`:
```bash
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxx
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Tavily API rate limits | Implement 10/hour rate limit in API route (future) |
| 60-second timeout | maxDuration=60 set on route, Vercel/Railway support this |
| Common name disambiguation | Query includes company/title/location; AI prompt emphasizes skepticism |
| Large report content | Uses @db.Text in Prisma for long fields |

---

## Success Metrics

- [ ] Research completes within 60 seconds
- [ ] Recommendations have >= 0.5 confidence filtering
- [ ] Applied changes update enrichment score correctly
- [ ] UI responsive during research (no blocking)
- [ ] All changes logged in ContactEnrichmentLog
