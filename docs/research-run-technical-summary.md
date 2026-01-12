# Research Run Technical Summary for Contact CRM Adaptation

A comprehensive technical breakdown of the Guru Builder research system, written specifically for adapting this functionality to Better Connections—a personal CRM with contact enrichment capabilities.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [The Planning/Chat Phase](#2-the-planningchat-phase)
3. [Research Execution](#3-research-execution)
4. [Recommendation Generation](#4-recommendation-generation)
5. [Recommendation Review & Application](#5-recommendation-review--application)
6. [Key Gotchas & Lessons Learned](#6-key-gotchas--lessons-learned)
7. [Adaptation Considerations for Contact Research](#7-adaptation-considerations-for-contact-research)

---

## 1. Architecture Overview

### Core Data Models

The research system is built on two primary Prisma models with a one-to-many relationship:

```prisma
model ResearchRun {
  id              String           @id @default(cuid())
  projectId       String
  instructions    String           // The research query/instructions
  depth           ResearchDepth    // QUICK | MODERATE | DEEP
  status          ResearchStatus   // PENDING | RUNNING | COMPLETED | FAILED | CANCELLED
  progressStage   String?          // Real-time progress: "searching", "analyzing", etc.
  researchData    Json?            // Raw research findings from Tavily/GPT
  errorMessage    String?
  startedAt       DateTime?
  completedAt     DateTime?
  executionTime   Int?             // milliseconds
  tokensUsed      Int?
  costEstimate    Float?

  project         Project          @relation(fields: [projectId])
  recommendations Recommendation[]

  @@index([projectId, status])
  @@index([projectId, createdAt])
}

model Recommendation {
  id              String                @id @default(cuid())
  researchRunId   String
  action          RecommendationAction  // ADD | EDIT | DELETE
  targetType      TargetType            // LAYER | KNOWLEDGE_FILE
  contextLayerId  String?               // Polymorphic FK (nullable)
  knowledgeFileId String?               // Polymorphic FK (nullable)
  title           String
  description     String
  fullContent     String                // Complete production-ready content
  reasoning       String
  confidence      Float                 // 0.0 to 1.0
  impactLevel     ImpactLevel           // LOW | MEDIUM | HIGH
  priority        Int                   // Ordering within research run
  status          RecommendationStatus  // PENDING | APPROVED | REJECTED | APPLIED
  reviewedAt      DateTime?
  appliedAt       DateTime?

  researchRun     ResearchRun           @relation(fields: [researchRunId])

  @@index([researchRunId, status])
  @@index([researchRunId, priority])
}
```

**Key Design Decision: Polymorphic Associations**

Instead of a single `targetId` field with a discriminator, we use separate nullable FK fields (`contextLayerId`, `knowledgeFileId`). This maintains database integrity—PostgreSQL enforces FK constraints properly, and we avoid string-based ID matching issues.

For Better Connections, you'd adapt this to:

```prisma
model ContactResearchRun {
  id              String @id @default(cuid())
  contactId       String
  instructions    String
  depth           ResearchDepth
  status          ResearchStatus
  progressStage   String?
  researchData    Json?
  // ... other fields

  contact         Contact @relation(fields: [contactId])
  recommendations ContactRecommendation[]
}

model ContactRecommendation {
  id             String @id @default(cuid())
  researchRunId  String
  fieldName      String          // "expertise" | "interests" | "whyNow" | "notes" | "tags"
  action         RecommendationAction  // ADD | EDIT (DELETE less common for contact fields)
  currentValue   String?         // For EDIT actions
  proposedValue  String          // The suggested new value
  reasoning      String
  confidence     Float
  sourceUrls     String[]        // Where this info came from
  status         RecommendationStatus

  researchRun    ContactResearchRun @relation(fields: [researchRunId])
}
```

### Status States & Transitions

```
PENDING → RUNNING → COMPLETED
                 ↘ FAILED
                 ↘ CANCELLED (user-initiated)
```

**Cancellation is cooperative**: The job checks `status === 'CANCELLED'` before expensive operations and exits gracefully. There's no forceful termination.

### Async Architecture: Inngest Jobs

The system uses Inngest (https://inngest.com) for background job orchestration. Jobs are triggered by events:

```typescript
// Event: "research/requested" → researchJob
// Event: "research/completed" → recommendationGenerationJob
```

**Two-Phase Execution**:
1. **Phase 1 (researchJob)**: Executes Tavily search + GPT synthesis → saves to `researchData`
2. **Phase 2 (recommendationGenerationJob)**: Reads `researchData` → generates recommendations

This separation allows re-running Phase 2 without repeating expensive research if needed.

### Progress Updates & Polling

Progress is communicated via database updates, not WebSockets:

```typescript
// Inngest job updates progressStage
await prisma.researchRun.update({
  where: { id: researchId },
  data: { progressStage: "Searching the web..." }
});

// UI polls GET /api/research-runs/[id] with no-cache headers
// Cache-Control: no-store, no-cache, must-revalidate
```

**Why no WebSockets?** Simpler infrastructure, works across serverless environments, and polling with short intervals (2-3 seconds) provides adequate UX.

---

## 2. The Planning/Chat Phase

The planning phase uses a conversational AI assistant to help users craft effective research plans before execution.

### Data Structures

```typescript
// lib/research/chat-types.ts

export interface ResearchPlan {
  title: string;
  objective: string;
  queries: string[];           // Specific search queries
  focusAreas: string[];        // Topics to emphasize
  expectedOutcomes: string[];  // What the research should discover
  depth: 'QUICK' | 'MODERATE' | 'DEEP';
}

export interface ResearchChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  planUpdate?: Partial<ResearchPlan>;  // If assistant suggests changes
}
```

### API Endpoint

```typescript
// POST /api/research/refine-plan

const requestSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1),
  currentPlan: z.object({
    title: z.string(),
    objective: z.string(),
    queries: z.array(z.string()),
    focusAreas: z.array(z.string()),
    expectedOutcomes: z.array(z.string()),
    depth: z.enum(['QUICK', 'MODERATE', 'DEEP']),
  }).nullable(),
  guruProfile: guruProfileDataSchema.partial().optional(),
});
```

### System Prompt

The assistant receives context about:
- The project name and guru profile
- Current plan state (if any)
- Depth guidelines (QUICK: 2-3 queries, MODERATE: 3-5, DEEP: 5-8)
- Pedagogical dimensions to consider

```typescript
const SYSTEM_PROMPT = `You are a research planning assistant...

DEPTH GUIDELINES:
- QUICK: 2-3 minutes, 1-2 queries, narrow focus
- MODERATE: 5-7 minutes, 3-5 queries, balanced coverage
- DEEP: 10-15 minutes, 5-8 queries, comprehensive exploration

Always respond with:
1. A conversational message explaining your suggestions
2. A complete research plan

Output format (JSON):
{
  "reply": "Your conversational response...",
  "updatedPlan": {
    "title": "...",
    "objective": "...",
    "queries": [...],
    "focusAreas": [...],
    "expectedOutcomes": [...],
    "depth": "QUICK" | "MODERATE" | "DEEP"
  }
}`;
```

### UI Components

**ResearchChatAssistant.tsx** - Two-panel layout:
- Left: Chat interface with message history
- Right: ResearchPlanDisplay showing the evolving plan

**Key UX patterns**:
- Auto-resize textarea based on content
- Enter to send, Shift+Enter for newline
- Plan is editable (user can directly modify queries/focus areas)
- "Execute Research Plan" button only appears when plan exists

### Adaptation for Contact Research

For Better Connections, the planning phase would help users:
- Identify what they want to learn about the contact
- Suggest relevant search queries based on available info (name, company, LinkedIn)
- Define focus areas (professional background, expertise, interests, recent news)

```typescript
// Example adapted chat types
interface ContactResearchPlan {
  contactName: string;
  knownInfo: {
    company?: string;
    title?: string;
    linkedinUrl?: string;
    email?: string;
  };
  searchQueries: string[];     // e.g., "John Smith VP Engineering Acme Corp"
  focusAreas: ('professional' | 'expertise' | 'interests' | 'news' | 'connections')[];
  fieldsToEnrich: string[];    // Which contact fields to target
  depth: 'QUICK' | 'MODERATE' | 'DEEP';
}
```

---

## 3. Research Execution

### Tavily Integration

The research orchestrator (`lib/researchOrchestrator.ts`) uses Tavily API for web search with depth-based configuration:

```typescript
const DEPTH_CONFIG: Record<ResearchDepth, TavilySearchConfig> = {
  quick: {
    maxResults: 5,
    includeRawContent: false,
    searchDepth: "basic",
  },
  moderate: {
    maxResults: 10,
    includeRawContent: "markdown",
    searchDepth: "basic",
  },
  deep: {
    maxResults: 20,
    includeRawContent: "markdown",
    searchDepth: "advanced",
  },
};
```

**Critical Gotcha: Tavily Query Length Limit**

Tavily API has a **400 character maximum** for queries. The system handles this with query optimization:

```typescript
const TAVILY_MAX_QUERY_LENGTH = 400;

async function optimizeSearchQuery(instructions: string): Promise<string> {
  if (instructions.length <= TAVILY_MAX_QUERY_LENGTH) {
    return instructions;
  }

  // Use GPT to compress into effective search query
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: "system",
        content: `Convert detailed instructions into a concise web search query.
Rules:
- Maximum 350 characters (leave room for safety margin)
- Extract core topic and key terms
- Do NOT include meta-instructions like "research" or "find information about"`
      },
      { role: "user", content: `Convert: ${instructions}` }
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  // Always enforce hard cap (GPT doesn't always follow precisely)
  return optimizedQuery.slice(0, TAVILY_MAX_QUERY_LENGTH);
}
```

### Orchestration Flow

```typescript
export async function executeResearch(options: ResearchOptions): Promise<ResearchResult> {
  const { instructions, depth = "moderate", timeout = 300000, onProgress } = options;
  const startTime = Date.now();
  const config = DEPTH_CONFIG[depth];

  try {
    // Step 1: Optimize query if too long
    if (instructions.length > TAVILY_MAX_QUERY_LENGTH) {
      await onProgress?.("Optimizing search query...");
    }
    const searchQuery = await optimizeSearchQuery(instructions);

    // Step 2: Execute Tavily search (1/3 of timeout)
    await onProgress?.("Searching the web for sources...");
    const searchResponse = await Promise.race([
      getTavily().search(searchQuery, config),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), timeout / 3)
      ),
    ]);

    // Step 3: Synthesize with GPT-4o (1/2 of timeout)
    await onProgress?.("Synthesizing research report...");
    const synthesisPrompt = buildSynthesisPrompt(instructions, depth, searchResponse.results);

    const completion = await Promise.race([
      getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: "system", content: "You are a research analyst..." },
          { role: "user", content: synthesisPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Synthesis timeout")), timeout / 2)
      ),
    ]);

    const fullReport = completion.choices[0]?.message?.content || "";

    // Step 4: Generate summary (10s timeout)
    await onProgress?.("Generating summary...");
    const summary = await generateSummary(fullReport, instructions);

    return {
      success: true,
      data: {
        query: instructions,
        depth,
        summary,
        fullReport,
        sources: searchResponse.results.map(r => ({ url: r.url, title: r.title })),
        sourcesAnalyzed: searchResponse.results.length,
        metadata: { /* ... */ },
      },
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: { error: "Research execution failed", message: error.message },
      executionTime: Date.now() - startTime,
    };
  }
}
```

### Summary Generation

Instead of truncating the full report, a separate GPT call generates a scannable summary:

```typescript
async function generateSummary(fullReport: string, query: string): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: "system",
        content: `Create a brief, scannable summary:
- ONE introductory sentence (max 100 chars)
- 3-4 bullet points (start with "• ")
- Each bullet 60-100 characters
- Total under 500 characters
- Plain text only - NO markdown`
      },
      {
        role: "user",
        content: `Summarize: "${query}"\n\n${fullReport.slice(0, 3000)}`
      }
    ],
    temperature: 0.5,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content?.trim() || "Research completed.";
}
```

### Rate Limiting & Error Handling

```typescript
// Timeout management with Promise.race pattern
const searchResponse = await Promise.race([
  getTavily().search(query, config),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Search timeout")), timeout / 3)
  ),
]);

// Error classification for UI feedback
const errorType = errorMessage.includes("timeout") ? "TimeoutError" : "ExecutionError";
```

**Concurrency limits are enforced in Inngest**:

```typescript
export const researchJob = inngest.createFunction(
  {
    id: "research-job",
    concurrency: { limit: 5 },  // Max 5 concurrent research jobs
  },
  // ...
);
```

---

## 4. Recommendation Generation

After research completes, a second Inngest job generates structured recommendations.

### Zod Schema for Recommendations

```typescript
const corpusRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      action: z.enum(["ADD", "EDIT", "DELETE"]),
      targetType: z.enum(["LAYER", "KNOWLEDGE_FILE"]),
      targetId: z.string().nullable(),
      title: z.string(),
      description: z.string(),
      fullContent: z.string(),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
      impactLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
    })
  ),
  noRecommendationsReason: z.string().nullable().optional(),
});
```

**Critical Pattern: `.nullable().optional()` for OpenAI Structured Outputs**

When using `strict: true` with OpenAI's structured outputs, optional fields MUST use `.nullable().optional()`:

```typescript
// CORRECT - Works with OpenAI strict mode
z.object({ optionalField: z.string().nullable().optional() });

// WRONG - Causes API validation errors
z.object({ optionalField: z.string().optional() });
```

### GPT Prompt for Recommendation Generation

The prompt includes:
1. **Content guidelines** explaining what context layers vs knowledge files are
2. **Corpus status guidance** (different prompts for empty vs existing projects)
3. **Current corpus state** (existing layers and files)
4. **Research findings** (full JSON)
5. **Quality standards** for `fullContent`

```typescript
const prompt = `You are an expert knowledge engineer...

${GURU_CONTENT_GUIDELINES}  // Explains layer vs file patterns

${corpusStatusGuidance}     // EMPTY PROJECT or EXISTING CONTENT

RESEARCH FINDINGS:
${JSON.stringify(researchFindings, null, 2)}

CURRENT CONTEXT LAYERS (${currentLayers.length}):
${currentLayers.map(l => `${l.title} (${l.id})`).join("\n")}

## Your Task
Generate recommendations for improving this guru's corpus...

${isEmptyCorpus ? `
CRITICAL: Empty project - generate 4-8 ADD recommendations
` : `
NOTE: If no recommendations, provide noRecommendationsReason
`}`;
```

### Confidence Filtering

Low-confidence recommendations are filtered before saving:

```typescript
const MIN_RECOMMENDATION_CONFIDENCE = 0.4;

const filteredRecommendations = result.recommendations.filter(
  rec => rec.confidence >= MIN_RECOMMENDATION_CONFIDENCE
);

// Log what was filtered for debugging
if (filteredOut.length > 0) {
  console.log(`Filtered out ${filteredOut.length} low-confidence recommendations:`,
    filteredOut.map(r => `"${r.title}" (${r.confidence.toFixed(2)})`)
  );
}
```

### Polymorphic FK Routing

When saving recommendations, the targetId is routed to the appropriate FK:

```typescript
await prisma.recommendation.createMany({
  data: recommendations.map((rec, index) => ({
    researchRunId: researchId,
    action: rec.action,
    targetType: rec.targetType,
    // Route to correct FK based on targetType
    contextLayerId: rec.targetType === "LAYER" ? effectiveTargetId : null,
    knowledgeFileId: rec.targetType === "KNOWLEDGE_FILE" ? effectiveTargetId : null,
    // ... other fields
    priority: index,
    status: "PENDING",
  })),
});
```

### Adaptation for Contact Fields

For Better Connections, recommendations would target contact fields instead of corpus items:

```typescript
const contactRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      fieldName: z.enum(["expertise", "interests", "whyNow", "notes", "title", "company"]),
      action: z.enum(["ADD", "UPDATE"]),  // EDIT = UPDATE for existing, ADD for empty
      currentValue: z.string().nullable(),
      proposedValue: z.string(),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
      sourceUrls: z.array(z.string()),
    })
  ),
  suggestedTags: z.array(z.object({
    name: z.string(),
    category: z.enum(["RELATIONSHIP", "OPPORTUNITY", "EXPERTISE", "INTEREST"]),
    confidence: z.number(),
  })).optional(),
});
```

---

## 5. Recommendation Review & Application

### UI Components for Review

**RecommendationsView.tsx** displays all recommendations with:
- Status badges (PENDING, APPROVED, REJECTED, APPLIED)
- Action badges (ADD, EDIT, DELETE)
- Impact level indicators
- Confidence percentage
- Expandable content preview
- Inline diff for EDIT actions
- Refinement input (chat with AI to adjust recommendation)

### Refinement Flow

Users can refine recommendations before approving:

```typescript
// RefinementInput.tsx
const handleRefine = async () => {
  // Notify parent for diff tracking
  onRefinementStart?.(currentContent);

  const response = await fetch(`/api/recommendations/${id}/refine`, {
    method: 'POST',
    body: JSON.stringify({ refinementPrompt: prompt.trim() }),
  });

  onRefinementComplete();  // Triggers router.refresh()
};
```

**Refinement API** (`/api/recommendations/[id]/refine/route.ts`):

```typescript
// CRITICAL: Disable Next.js caching for mutation endpoints
export const dynamic = 'force-dynamic';

// Sanitize input
const sanitizedPrompt = refinementPrompt
  .trim()
  .replace(/\s+/g, ' ')        // Collapse whitespace
  .replace(/[\x00-\x1F]/g, '') // Remove control chars
  .slice(0, 2000);             // Enforce max length

// Call refinement logic
const refined = await refineRecommendation(recommendation, sanitizedPrompt);

// Update in database
await prisma.recommendation.update({
  where: { id },
  data: {
    title: refined.title,
    description: refined.description,
    fullContent: refined.fullContent,
    reasoning: refined.reasoning,
  },
});

// Return with cache-busting headers
return NextResponse.json({ success: true, recommendation }, {
  headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
});
```

### Inline Diff Visualization

After refinement, the UI shows what changed using the `diff` library:

```typescript
// InlineContentDiff.tsx
import { diffLines, Change } from 'diff';

function computeDiff(oldText: string, newText: string): DiffSegment[] {
  const changes: Change[] = diffLines(oldText, newText);
  return changes.map((change) => ({
    value: change.value,
    type: change.added ? 'addition' : change.removed ? 'deletion' : 'unchanged',
  }));
}

// Memoize for performance
const segments = useMemo(
  () => computeDiff(originalContent, newContent),
  [originalContent, newContent]
);
```

**Stable React Keys** are essential for diff rendering:

```typescript
// CORRECT - Stable key prevents React rendering glitches
const stableKey = `${index}-${segment.type}-${segment.value.slice(0, 20).replace(/\s/g, '_')}`;

// WRONG - Index-only keys cause issues when content changes
key={index}
```

### Application Flow

When user clicks "Apply Approved":

```typescript
// applyRecommendations.ts

export async function applyRecommendations(options) {
  // 1. Fetch approved recommendations
  const recommendations = await prisma.recommendation.findMany({
    where: { id: { in: recommendationIds }, status: "APPROVED" }
  });

  // 2. Create snapshot (backup)
  const snapshot = await prisma.corpusSnapshot.create({
    data: {
      projectId,
      name: snapshotName || `Auto-snapshot ${new Date().toISOString()}`,
      layersData: currentLayers,
      filesData: currentFiles,
    }
  });

  // 3. Get previous score for comparison
  const { score: prevScore } = await calculateReadinessScore(projectId);

  // 4. Apply in transaction (all-or-nothing)
  const changes = await prisma.$transaction(async (tx) => {
    for (const rec of recommendations) {
      if (rec.action === "ADD") {
        await tx.contextLayer.create({ data: { title, content: fullContent } });
      } else if (rec.action === "EDIT") {
        await tx.contextLayer.update({ where: { id }, data: { title, content } });
      } else if (rec.action === "DELETE") {
        await tx.contextLayer.delete({ where: { id } });
      }

      // Log to ApplyChangesLog for audit trail
      await tx.applyChangesLog.create({ /* ... */ });

      // Mark as applied
      await tx.recommendation.update({
        where: { id: rec.id },
        data: { status: "APPLIED", appliedAt: new Date() }
      });
    }
    return changeStats;
  });

  // 5. Auto-tag new/edited items (with timeout)
  await Promise.race([
    Promise.all(itemsToTag.map(autoTagCorpusItem)),
    new Promise(resolve => setTimeout(resolve, 10000))  // 10s timeout
  ]);

  // 6. Calculate new readiness score
  const { score: newScore } = await calculateReadinessScore(projectId);

  return {
    success: true,
    snapshotId: snapshot.id,
    appliedCount: recommendations.length,
    changes,
    readinessScore: {
      overall: newScore.overall,
      previousOverall: prevScore.overall,
      criticalGaps: newScore.criticalGaps,
    }
  };
}
```

### Adaptation for Contact Updates

For Better Connections, the apply flow would update contact fields:

```typescript
async function applyContactRecommendations(options) {
  const { contactId, recommendationIds } = options;

  // Get contact before changes (for audit)
  const contactBefore = await prisma.contact.findUnique({ where: { id: contactId } });

  // Apply in transaction
  const applied = await prisma.$transaction(async (tx) => {
    for (const rec of recommendations) {
      // Update the specific field
      await tx.contact.update({
        where: { id: contactId },
        data: { [rec.fieldName]: rec.proposedValue }
      });

      // Log the change
      await tx.contactEnrichmentLog.create({
        data: {
          contactId,
          fieldName: rec.fieldName,
          previousValue: rec.currentValue,
          newValue: rec.proposedValue,
          source: 'RESEARCH',
          researchRunId: rec.researchRunId,
        }
      });
    }

    // Apply suggested tags
    for (const tag of suggestedTags) {
      await tx.contactTag.upsert({
        where: { contactId_tagId: { contactId, tagId: tag.id } },
        create: { contactId, tagId: tag.id },
        update: {},
      });
    }
  });

  // Recalculate enrichment score
  await recalculateEnrichmentScore(contactId);

  return { success: true, applied };
}
```

---

## 6. Key Gotchas & Lessons Learned

### 1. OpenAI Structured Outputs with Zod

**The Problem**: When using `strict: true` with OpenAI's JSON schema mode, optional fields cause validation errors.

**The Solution**: Always use `.nullable().optional()` for optional fields:

```typescript
// CORRECT
z.object({ optionalField: z.string().nullable().optional() });

// WRONG - API rejects this
z.object({ optionalField: z.string().optional() });
```

### 2. Tavily Query Length Limit

**The Problem**: Tavily API rejects queries over 400 characters.

**The Solution**: Use GPT to compress long instructions into effective search queries. Always enforce hard character limit after GPT processing (GPT doesn't always follow length constraints precisely).

### 3. Async Job Race Conditions

**The Problem**: UI may see "COMPLETED" status before recommendations are generated (two-phase job).

**The Solution**: Poll for both conditions:

```typescript
// CORRECT - Wait for full completion
if (status === 'COMPLETED' && recommendationCount > 0) {
  router.refresh();  // All data ready
} else {
  // Keep polling
}

// WRONG - Stops too early
if (status === 'COMPLETED') {
  router.refresh();  // Recommendations may not exist yet!
}
```

### 4. Next.js Caching on Mutation Endpoints

**The Problem**: POST endpoints were returning stale data due to Next.js caching.

**The Solution**: Add both config and headers:

```typescript
// Top of route file
export const dynamic = 'force-dynamic';

// In response
return NextResponse.json(data, {
  headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
});
```

### 5. Stable React Keys for Diff Rendering

**The Problem**: Using array index as key caused rendering glitches when diff content changed.

**The Solution**: Create stable keys from content:

```typescript
const stableKey = `${index}-${segment.type}-${segment.value.slice(0, 20).replace(/\s/g, '_')}`;
```

### 6. Clearing State on Actions

**The Problem**: Diff state persisted after approve/reject, showing stale diffs.

**The Solution**: Clear ephemeral state when actions complete:

```typescript
const handleApprove = async (id: string) => {
  setPreRefinementContent(null);  // Clear diff state
  setRefinementExpandedId(null);
  // ... proceed with approval
};
```

### 7. Inngest Hot Reload

**The Problem**: Changes to `lib/inngest-functions.ts` weren't picked up during development.

**The Solution**: Full server restart required after modifying Inngest functions.

### 8. Cooperative Cancellation

**The Problem**: Can't forcefully terminate running Inngest jobs.

**The Solution**: Check status before expensive operations:

```typescript
const cancelled = await step.run("check-cancelled", async () => {
  return await isResearchCancelled(researchId);
});
if (cancelled) {
  return { researchId, cancelled: true };
}

// Now do expensive work...
```

### 9. Lazy Client Loading

**The Problem**: Initializing OpenAI/Tavily clients at module load caused build errors.

**The Solution**: Lazy-load clients on first use:

```typescript
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}
```

---

## 7. Adaptation Considerations for Contact Research

### What Needs to Change

| Guru Builder | Better Connections |
|--------------|-------------------|
| ResearchRun linked to Project | ContactResearchRun linked to Contact |
| Recommendations target LAYER/KNOWLEDGE_FILE | Recommendations target contact fields |
| Corpus snapshots for rollback | Contact change audit log |
| Readiness scoring (pedagogical) | Enrichment scoring (completeness) |
| Context layers + Knowledge files | Contact fields + Tags |

### What's Reusable

1. **Research Orchestrator Core** - Tavily search + GPT synthesis pattern
2. **Recommendation Generation Pattern** - Structured output with Zod schema
3. **Refinement Flow** - Chat-based adjustment of recommendations
4. **Diff Visualization** - InlineContentDiff component
5. **Polling Pattern** - Database-based progress updates
6. **Apply Transaction Pattern** - All-or-nothing application with logging

### Do You Need Inngest?

**For smaller-scale contact research: Probably not.**

Consider these alternatives:

1. **Direct API call with timeout**: If research typically completes in <30 seconds
   ```typescript
   // Simple approach for quick research
   const result = await executeResearch(options);  // Direct call
   ```

2. **Next.js API Route with streaming**: For progress updates without background jobs
   ```typescript
   // Stream progress as Server-Sent Events
   const stream = new ReadableStream({
     async start(controller) {
       await executeResearch({
         onProgress: (stage) => controller.enqueue(`data: ${stage}\n\n`)
       });
       controller.close();
     }
   });
   return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
   ```

3. **Vercel Edge Functions**: For longer operations without cold start issues

**Use Inngest when you need**:
- Reliable job retry/recovery
- Job concurrency limits
- Event-driven job chaining
- Jobs that may take >10 minutes

### Recommended Contact Research Schema

```prisma
model ContactResearchRun {
  id           String   @id @default(cuid())
  contactId    String
  userId       String

  // Research configuration
  searchQuery  String   // Optimized query used
  depth        String   // QUICK | MODERATE | DEEP
  focusAreas   String[] // What to research

  // Status tracking
  status       String   // PENDING | RUNNING | COMPLETED | FAILED
  progressStage String?

  // Results
  researchData Json?    // Raw findings
  summary      String?  // Scannable summary
  sourceUrls   String[] // Sources found

  // Metadata
  startedAt    DateTime?
  completedAt  DateTime?
  executionTimeMs Int?

  contact      Contact  @relation(fields: [contactId])
  user         User     @relation(fields: [userId])
  recommendations ContactRecommendation[]

  @@index([contactId])
  @@index([userId, createdAt])
}

model ContactRecommendation {
  id            String   @id @default(cuid())
  researchRunId String

  // What to update
  fieldName     String   // expertise, interests, whyNow, notes, title, company
  currentValue  String?  // For comparison/diff
  proposedValue String   // The suggested value

  // Justification
  reasoning     String
  confidence    Float    // 0.0 - 1.0
  sourceUrls    String[] // Where this came from

  // Status
  status        String   // PENDING | APPROVED | REJECTED | APPLIED
  reviewedAt    DateTime?
  appliedAt     DateTime?

  researchRun   ContactResearchRun @relation(fields: [researchRunId])

  @@index([researchRunId, status])
}

model ContactEnrichmentLog {
  id           String   @id @default(cuid())
  contactId    String
  fieldName    String
  previousValue String?
  newValue     String
  source       String   // MANUAL | VOICE | RESEARCH | IMPORT
  researchRunId String?
  createdAt    DateTime @default(now())

  contact      Contact  @relation(fields: [contactId])

  @@index([contactId, createdAt])
}
```

### Search Query Construction for Contacts

```typescript
function buildContactSearchQuery(contact: Contact, plan: ContactResearchPlan): string {
  const parts: string[] = [];

  // Always include name
  parts.push(`"${contact.firstName} ${contact.lastName}"`);

  // Add known context
  if (contact.company) parts.push(contact.company);
  if (contact.title) parts.push(contact.title);
  if (contact.location) parts.push(contact.location);

  // Add focus-specific terms
  if (plan.focusAreas.includes('expertise')) {
    parts.push('expertise background experience');
  }
  if (plan.focusAreas.includes('news')) {
    parts.push('recent news announcement');
  }

  // Combine and respect 400 char limit
  let query = parts.join(' ');
  if (query.length > 350) {  // Leave buffer
    query = query.slice(0, 350);
  }

  return query;
}
```

### GPT Prompt for Contact Recommendations

```typescript
const CONTACT_RECOMMENDATION_PROMPT = `You are analyzing research findings about a person to suggest profile updates.

CURRENT CONTACT:
- Name: ${contact.firstName} ${contact.lastName}
- Title: ${contact.title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Expertise: ${contact.expertise || 'Not yet documented'}
- Interests: ${contact.interests || 'Not yet documented'}
- Why Now: ${contact.whyNow || 'Not yet documented'}

RESEARCH FINDINGS:
${JSON.stringify(researchData, null, 2)}

Generate recommendations for fields to update. For each:
1. fieldName: expertise | interests | whyNow | notes | title | company
2. proposedValue: The suggested content (be specific and actionable)
3. reasoning: Why this information is valuable
4. confidence: 0.0-1.0 based on source reliability
5. sourceUrls: Where you found this

Focus on:
- Professional expertise and skills
- Personal interests and hobbies
- "Why Now" - recent events/changes making them worth reaching out to
- Factual updates to title/company if different from current

Only suggest updates with confidence > 0.5.
Prefer specific, verifiable information over general inferences.`;
```

---

## Summary

The Guru Builder research system provides a robust pattern for:

1. **Planning Phase**: AI-assisted research query crafting with real-time plan updates
2. **Execution Phase**: Tavily web search + GPT synthesis with progress streaming
3. **Generation Phase**: Structured recommendations with confidence scoring
4. **Review Phase**: Interactive approval/rejection/refinement with inline diff
5. **Application Phase**: Transactional updates with rollback capability

For Better Connections, adapt the data models to target contact fields instead of corpus items, simplify the async architecture if research is quick (<30s), and reuse the core orchestration, recommendation generation, and UI patterns.

The key lessons—particularly around OpenAI structured outputs, caching, and async race conditions—apply universally to any AI-powered enrichment system.
