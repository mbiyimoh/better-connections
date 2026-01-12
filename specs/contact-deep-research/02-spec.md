# Contact Deep Research - Technical Specification

**Slug:** contact-deep-research
**Author:** Claude Code
**Date:** 2026-01-10
**Status:** Draft
**Ideation:** `specs/contact-deep-research/01-ideation.md`
**Reference:** `docs/research-run-technical-summary.md`

---

## 1. Overview

### 1.1 Purpose

Enable users to run AI-powered "deep research" on any contact in their CRM. The system searches the internet for public information about the person, synthesizes findings into a structured report, and generates discrete recommendations for profile updates that users can review, edit, and apply.

### 1.2 Scope

**In Scope:**
- Research initiation from contact detail page
- Focus area selection (professional, expertise, interests, news)
- Web search via Tavily API
- AI synthesis via GPT-4o-mini
- Structured recommendations with confidence scores
- User review/edit/approve flow
- Bulk apply with audit logging
- Research history persistence
- Tag recommendations alongside field updates

**Out of Scope:**
- Paid data enrichment APIs (Clearbit, Apollo, ZoomInfo)
- Automated/scheduled research runs
- Batch research across multiple contacts
- LinkedIn authenticated API access
- Contact photo enrichment
- Real-time news monitoring

### 1.3 Key Decisions (from Ideation)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Research depth | Single "moderate" depth | Simpler UX, tune based on feedback |
| Entry points | Contact detail page only (V1) | Start simple, expand later |
| History | Keep all research runs | Storage is cheap, history is valuable |
| Planning phase | Simple options modal | Contact research is constrained |
| Refinement | Quick inline edit only | Covers 90% of needs without complexity |
| Tags | Include in recommendations | Natural to discover during research |
| LinkedIn weight | Higher priority for LinkedIn sources | Most authoritative for professional info |

---

## 2. Data Models

### 2.1 Database Schema

Add to `prisma/schema.prisma`:

```prisma
// ===========================================
// CONTACT DEEP RESEARCH MODELS
// ===========================================

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

### 2.2 Update Contact Model

Add relations to existing Contact model:

```prisma
model Contact {
  // ... existing fields ...

  // Add these relations
  researchRuns    ContactResearchRun[]
  enrichmentLogs  ContactEnrichmentLog[]
}
```

### 2.3 Update User Model

Add relation to existing User model:

```prisma
model User {
  // ... existing fields ...

  // Add this relation
  researchRuns    ContactResearchRun[]
}
```

---

## 3. API Endpoints

### 3.1 POST /api/contacts/[id]/research

Initiate a new research run for a contact.

**Request:**
```typescript
interface ResearchRequest {
  focusAreas: ('professional' | 'expertise' | 'interests' | 'news')[];
}
```

**Response (201 Created):**
```typescript
interface ResearchRunResponse {
  id: string;
  contactId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progressStage: string | null;
  createdAt: string;
}
```

**Validation:**
- Contact must exist and belong to authenticated user
- Contact must have at least firstName and lastName
- focusAreas must have at least one item

**Behavior:**
1. Create ResearchRun record with status PENDING
2. Build optimized search query from contact data
3. Execute research inline (not background job)
4. Stream progress updates via response
5. Generate recommendations
6. Return completed run with recommendations

### 3.2 GET /api/contacts/[id]/research

Get research history for a contact.

**Query Parameters:**
- `limit` (optional, default 10): Number of runs to return
- `status` (optional): Filter by status

**Response (200 OK):**
```typescript
interface ResearchHistoryResponse {
  runs: {
    id: string;
    status: ResearchStatus;
    summary: string | null;
    recommendationCount: number;
    appliedCount: number;
    createdAt: string;
    completedAt: string | null;
  }[];
  total: number;
}
```

### 3.3 GET /api/contacts/[id]/research/[runId]

Get a specific research run with full details and recommendations.

**Response (200 OK):**
```typescript
interface ResearchRunDetailResponse {
  id: string;
  contactId: string;
  status: ResearchStatus;
  progressStage: string | null;
  errorMessage: string | null;
  searchQuery: string;
  focusAreas: string[];
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  recommendations: {
    id: string;
    fieldName: string;
    action: 'ADD' | 'UPDATE';
    currentValue: string | null;
    proposedValue: string;
    tagCategory: string | null;
    reasoning: string;
    confidence: number;
    sourceUrls: string[];
    status: RecommendationStatus;
    editedValue: string | null;
  }[];
}
```

### 3.4 PATCH /api/contacts/[id]/research/[runId]/recommendations/[recId]

Update a recommendation's status or edited value.

**Request:**
```typescript
interface UpdateRecommendationRequest {
  status?: 'APPROVED' | 'REJECTED';
  editedValue?: string;
}
```

**Response (200 OK):**
```typescript
interface UpdateRecommendationResponse {
  id: string;
  status: RecommendationStatus;
  editedValue: string | null;
  reviewedAt: string | null;
}
```

### 3.5 POST /api/contacts/[id]/research/[runId]/apply

Apply all approved recommendations to the contact.

**Request:**
```typescript
interface ApplyRecommendationsRequest {
  recommendationIds?: string[];  // Optional: specific IDs to apply (defaults to all APPROVED)
}
```

**Response (200 OK):**
```typescript
interface ApplyRecommendationsResponse {
  success: boolean;
  appliedCount: number;
  contact: {
    id: string;
    enrichmentScore: number;
    // ... updated fields
  };
  changes: {
    fieldName: string;
    previousValue: string | null;
    newValue: string;
  }[];
}
```

**Behavior:**
1. Fetch all APPROVED recommendations (or specified IDs)
2. Begin database transaction
3. For each recommendation:
   - Update contact field with editedValue || proposedValue
   - Create ContactEnrichmentLog entry
   - Mark recommendation as APPLIED
4. For tag recommendations: Create or link tags
5. Recalculate enrichmentScore
6. Commit transaction
7. Return updated contact and change summary

---

## 4. Research Orchestration

### 4.1 File Structure

```
src/lib/research/
├── index.ts                    # Barrel exports
├── types.ts                    # TypeScript interfaces
├── schemas.ts                  # Zod validation schemas
├── orchestrator.ts             # Main research execution flow
├── queryBuilder.ts             # Build optimized search queries
├── tavilyClient.ts             # Tavily API wrapper
├── synthesizer.ts              # GPT synthesis logic
├── recommendationGenerator.ts  # Generate recommendations from findings
└── prompts.ts                  # System prompts for AI
```

### 4.2 Type Definitions

`src/lib/research/types.ts`:

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

### 4.3 Zod Schemas

`src/lib/research/schemas.ts`:

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

### 4.4 Query Builder

`src/lib/research/queryBuilder.ts`:

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

  return query.slice(0, TAVILY_MAX_QUERY_LENGTH);
}
```

### 4.5 Tavily Client

`src/lib/research/tavilyClient.ts`:

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

### 4.6 AI Prompts

`src/lib/research/prompts.ts`:

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

### 4.7 Main Orchestrator

`src/lib/research/orchestrator.ts`:

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
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
      model: openai('gpt-4o-mini'),
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
      model: openai('gpt-4o-mini'),
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

---

## 5. API Route Implementations

### 5.1 POST /api/contacts/[id]/research/route.ts

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
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id, userId: user.id },
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
      lastName: contact.lastName,
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
        data: result.recommendations.map((rec, index) => ({
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: any = {
      contactId: params.id,
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

### 5.2 Apply Recommendations Route

`src/app/api/contacts/[id]/research/[runId]/apply/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { applyRecommendationsSchema } from '@/lib/research/schemas';
import { calculateEnrichmentScore } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
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
      where: { id: params.runId, contactId: params.id, userId: user.id },
    });

    if (!researchRun) {
      return NextResponse.json({ error: 'Research run not found' }, { status: 404 });
    }

    // Get recommendations to apply
    const whereClause: any = {
      researchRunId: params.runId,
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
      where: { id: params.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Apply in transaction
    const changes: { fieldName: string; previousValue: string | null; newValue: string }[] = [];

    const updatedContact = await prisma.$transaction(async (tx) => {
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
              contactId: params.id,
              fieldName: rec.fieldName,
              previousValue,
              newValue: valueToApply,
              source: 'RESEARCH',
              researchRunId: params.runId,
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
      let updated = contact;
      if (Object.keys(contactUpdates).length > 0) {
        updated = await tx.contact.update({
          where: { id: params.id },
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
            contactId: params.id,
            text: { equals: tag.text, mode: 'insensitive' },
          },
        });

        if (!existingTag) {
          await tx.tag.create({
            data: {
              contactId: params.id,
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

      return updated;
    });

    // Recalculate enrichment score
    const contactWithTags = await prisma.contact.findUnique({
      where: { id: params.id },
      include: { tags: true },
    });

    const newScore = calculateEnrichmentScore(contactWithTags!);

    await prisma.contact.update({
      where: { id: params.id },
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

---

## 6. UI Components

### 6.1 Component Structure

```
src/components/research/
├── ResearchButton.tsx           # Trigger button for contact detail
├── ResearchOptionsModal.tsx     # Focus area selection before starting
├── ResearchProgressIndicator.tsx # Real-time progress display
├── ResearchResultsPanel.tsx     # Main results container
├── ResearchSummary.tsx          # Bullet summary and report
├── RecommendationList.tsx       # List of all recommendations
├── RecommendationCard.tsx       # Individual recommendation with actions
├── RecommendationDiff.tsx       # Before/after comparison
├── ResearchHistoryDrawer.tsx    # Past research runs
└── index.ts                     # Barrel exports
```

### 6.2 ResearchButton Component

`src/components/research/ResearchButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
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

### 6.3 ResearchOptionsModal Component

`src/components/research/ResearchOptionsModal.tsx`:

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

      const result = await response.json();

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

### 6.4 RecommendationCard Component

`src/components/research/RecommendationCard.tsx`:

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

### 6.5 ResearchResultsPanel Component

`src/components/research/ResearchResultsPanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecommendationCard } from './RecommendationCard';
import { cn } from '@/lib/utils';

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

---

## 7. Integration Points

### 7.1 Contact Detail Page Integration

Update `src/app/(dashboard)/contacts/[id]/page.tsx` to include research functionality:

```tsx
// Add import
import { ResearchButton } from '@/components/research/ResearchButton';
import { ResearchResultsPanel } from '@/components/research/ResearchResultsPanel';

// In the component, after fetching contact:
const latestResearch = await prisma.contactResearchRun.findFirst({
  where: { contactId: contact.id, status: 'COMPLETED' },
  orderBy: { createdAt: 'desc' },
  include: { recommendations: true },
});

// In the JSX, add Research button near EnrichmentScoreCard:
<ResearchButton
  contactId={contact.id}
  contactName={`${contact.firstName} ${contact.lastName}`}
/>

// Add results panel if research exists:
{latestResearch && (
  <ResearchResultsPanel
    contactId={contact.id}
    researchRun={latestResearch}
  />
)}
```

### 7.2 Environment Variables

Add to `.env.local` and document in README:

```bash
# Contact Research
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxx
```

---

## 8. Error Handling

### 8.1 Error Types

```typescript
// src/lib/research/errors.ts

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

### 8.2 Retry Logic

For transient failures, implement exponential backoff:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// src/lib/research/__tests__/queryBuilder.test.ts

import { buildSearchQuery } from '../queryBuilder';

describe('buildSearchQuery', () => {
  it('builds basic query from name', () => {
    const contact = {
      firstName: 'John',
      lastName: 'Smith',
      // ... other fields null
    };

    const query = buildSearchQuery(contact, ['professional']);
    expect(query).toContain('"John Smith"');
    expect(query).toContain('career background');
  });

  it('respects 400 character limit', () => {
    const contact = {
      firstName: 'John',
      lastName: 'Smith',
      company: 'A very long company name...',
      // ... lots of data
    };

    const query = buildSearchQuery(contact, ['professional', 'expertise', 'interests', 'news']);
    expect(query.length).toBeLessThanOrEqual(400);
  });
});
```

### 9.2 Integration Tests

```typescript
// src/app/api/contacts/[id]/research/__tests__/route.test.ts

describe('POST /api/contacts/[id]/research', () => {
  it('returns 401 without authentication', async () => {
    const response = await fetch('/api/contacts/123/research', {
      method: 'POST',
      body: JSON.stringify({ focusAreas: ['professional'] }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 with invalid focus areas', async () => {
    // ... with auth
    const response = await authenticatedFetch('/api/contacts/123/research', {
      method: 'POST',
      body: JSON.stringify({ focusAreas: ['invalid'] }),
    });
    expect(response.status).toBe(400);
  });
});
```

### 9.3 E2E Tests

```typescript
// .quick-checks/test-contact-research.spec.ts

import { test, expect } from '@playwright/test';

test('can initiate and review contact research', async ({ page }) => {
  await page.goto('/contacts/test-contact-id');

  // Click research button
  await page.click('button:has-text("Research")');

  // Select focus areas
  await page.click('text=Professional Background');
  await page.click('text=Recent News');

  // Start research
  await page.click('button:has-text("Start Research")');

  // Wait for completion
  await expect(page.locator('text=Research Results')).toBeVisible({ timeout: 60000 });

  // Approve a recommendation
  await page.click('[title="Approve"]').first();

  // Apply
  await page.click('button:has-text("Apply")');

  // Verify success
  await expect(page.locator('text=applied')).toBeVisible();
});
```

---

## 10. Migration Plan

### 10.1 Database Migration

```bash
# Generate migration
npx prisma migrate dev --name add_contact_research

# Verify in production
npx prisma migrate deploy
```

### 10.2 Deployment Checklist

1. [ ] Add `TAVILY_API_KEY` to environment variables
2. [ ] Run database migration
3. [ ] Deploy API routes
4. [ ] Deploy UI components
5. [ ] Verify end-to-end flow in staging
6. [ ] Monitor error rates post-deployment

---

## 11. Future Considerations

### 11.1 V2 Enhancements (Not in Scope)

- Research depth tiers (Quick/Moderate/Deep)
- Entry points from enrichment queue and explore chat
- AI-assisted recommendation refinement
- Batch research across multiple contacts
- Scheduled/automated research runs
- Research cost tracking per user

### 11.2 Performance Optimizations

- Cache Tavily results for same contact within 24 hours
- Parallelize synthesis and recommendation generation
- Stream progress updates via Server-Sent Events

### 11.3 Data Enrichment Integrations

- Clearbit for company data
- Apollo for professional profiles
- Hunter.io for email verification

---

## 12. Acceptance Criteria

### 12.1 Functional Requirements

- [ ] User can initiate research from contact detail page
- [ ] User can select 1-4 focus areas before starting
- [ ] Research completes within 60 seconds
- [ ] User sees progress updates during research
- [ ] Research generates 0-10 recommendations
- [ ] Each recommendation shows confidence score and sources
- [ ] User can approve, reject, or edit each recommendation
- [ ] User can apply all approved recommendations in one action
- [ ] Applied changes update contact fields and recalculate enrichment score
- [ ] Research history is preserved and viewable
- [ ] Errors are handled gracefully with user-friendly messages

### 12.2 Non-Functional Requirements

- [ ] API response time < 60 seconds for research initiation
- [ ] UI remains responsive during research
- [ ] Research works on mobile viewport
- [ ] All API routes require authentication
- [ ] Audit log created for all applied changes

---

## Appendix A: API Response Examples

### Research Run Response

```json
{
  "id": "clx1234567890",
  "contactId": "clx0987654321",
  "status": "COMPLETED",
  "searchQuery": "\"John Smith\" Acme Corp VP Engineering career background",
  "focusAreas": ["professional", "expertise"],
  "summary": "• VP of Engineering at Acme Corp since 2023\n• Previously led platform team at TechCo\n• Expert in distributed systems and Kubernetes\n• Active speaker at KubeCon conferences",
  "fullReport": "## Professional Background\n\nJohn Smith is currently...",
  "sourceUrls": [
    "https://www.linkedin.com/in/johnsmith",
    "https://techcrunch.com/2023/...",
    "https://kubecon.io/speakers/..."
  ],
  "executionTimeMs": 8432,
  "createdAt": "2026-01-10T15:30:00Z",
  "completedAt": "2026-01-10T15:30:08Z",
  "recommendations": [
    {
      "id": "clx_rec_001",
      "fieldName": "expertise",
      "action": "UPDATE",
      "currentValue": "Software engineering",
      "proposedValue": "Distributed systems, Kubernetes, Platform engineering, Team leadership",
      "tagCategory": null,
      "reasoning": "Multiple sources confirm John's expertise in distributed systems and Kubernetes, including his KubeCon speaking engagements.",
      "confidence": 0.85,
      "sourceUrls": ["https://kubecon.io/speakers/..."],
      "status": "PENDING",
      "editedValue": null
    }
  ]
}
```

---

## Appendix B: Zod Schema Reference

See `src/lib/research/schemas.ts` for complete schema definitions.

Key patterns:
- Use `.nullable().optional()` for optional fields in OpenAI structured outputs
- Use `z.enum()` for constrained string values
- Use `@db.Text` in Prisma for fields that may contain long content
