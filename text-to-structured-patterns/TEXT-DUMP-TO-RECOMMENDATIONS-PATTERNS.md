# Text Dump to Structured Recommendations Patterns

A comprehensive guide to transforming unstructured text (voice transcripts, meeting notes, Slack messages) into structured, actionable recommendations. Extracted from the Better Connections enrichment system.

---

## Overview

This document captures the patterns, prompts, schemas, and architecture used in Better Connections to turn messy voice/text dumps into:
- Categorized insights with confidence
- Structured field extractions
- Conflict detection with existing data
- Mention extraction (other entities referenced)
- Intelligent merging with existing context
- Visual feedback with bubble visualization

These patterns are **domain-agnostic** and can be adapted to extract any structured recommendations from unstructured input.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ INPUT SOURCES                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Voice Transcript (Web Speech API)                                  │
│  Typed Text Input                                                   │
│  Pasted Meeting Notes (Granola, Otter, etc.)                       │
│  Slack Messages                                                     │
│  Email Dumps                                                        │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ EXTRACTION PIPELINE                                                  │
├─────────────────────────────────────────────────────────────────────┤
│  1. Input Validation & Sanitization                                  │
│  2. Context Injection (existing state, entity being enriched)       │
│  3. AI Structured Extraction (GPT-4o-mini + Zod schema)            │
│  4. Confidence Scoring                                              │
│  5. Conflict Detection                                              │
│  6. Entity Mention Extraction                                       │
│  7. Deduplication & Merging                                         │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│ OUTPUT                                                               │
├─────────────────────────────────────────────────────────────────────┤
│  Structured Recommendations (typed, validated)                      │
│  Visual Bubbles (categorized, color-coded)                         │
│  Conflict Alerts (existing vs new data)                            │
│  Linked Entity References                                           │
│  Change Summaries                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pattern 1: Structured Output Schema Design

### Key Principle
Define your extraction schema with **Zod** to get type-safe, validated AI outputs.

### The Pattern

```typescript
import { z } from "zod";

// Step 1: Define your recommendation categories
const RECOMMENDATION_CATEGORIES = [
  "category_a",  // e.g., "new_issue", "decision", "deadline_update"
  "category_b",
  "category_c",
  "category_d",
] as const;

// Step 2: Define a single extracted insight/recommendation
export const extractedRecommendationSchema = z.object({
  // The captured text snippet (3-15 words)
  capturedText: z
    .string()
    .describe("Key phrase extracted - concise, 3-15 words"),

  // Categorization
  category: z
    .enum(RECOMMENDATION_CATEGORIES)
    .describe("Category description for each type"),

  // Confidence score (optional but recommended)
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Confidence in this extraction (0-1)"),

  // CRITICAL: Optional fields MUST use .nullable().optional() for OpenAI strict mode
  field_a: z.string().nullable().optional().describe("Description"),
  field_b: z.string().nullable().optional().describe("Description"),
  field_c: z.string().nullable().optional().describe("Description"),

  // For linking to existing entities
  linkedEntityId: z.string().nullable().optional().describe("ID if referencing existing entity"),

  // Source tracking
  sourceSnippet: z.string().optional().describe("Original text that triggered this"),
});

// Step 3: Wrap in a response schema
export const extractionResponseSchema = z.object({
  recommendations: z.array(extractedRecommendationSchema),
  // Optional: metadata about the extraction
  processingMetadata: z.object({
    inputLength: z.number(),
    processingTimeMs: z.number().optional(),
    modelUsed: z.string().optional(),
  }).optional(),
});

// Step 4: Define request schema with context
export const extractionRequestSchema = z.object({
  // The raw input text
  inputText: z.string().min(1).max(10000),

  // Context about what we're extracting for
  context: z.object({
    // Entity being enriched (project, sprint, etc.)
    entityName: z.string().optional(),
    entityType: z.string().optional(),

    // Existing state to avoid duplicates
    existingItems: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.string().optional(),
    })).optional(),

    // Team members for mention detection
    teamMembers: z.array(z.string()).optional(),
  }).optional(),
});

// Export types
export type ExtractedRecommendation = z.infer<typeof extractedRecommendationSchema>;
export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;
```

### Critical Gotcha: OpenAI Strict Mode

When using `generateObject` with OpenAI, optional fields **MUST** be defined as `.nullable().optional()`:

```typescript
// WRONG - Will cause OpenAI strict mode errors
field: z.string().optional(),

// CORRECT - Works with OpenAI strict mode
field: z.string().nullable().optional(),
```

---

## Pattern 2: System Prompt Engineering

### Key Principle
The system prompt is the brain of the extraction. It should:
1. Define the AI's role clearly
2. List all categories with descriptions
3. Prioritize what matters most
4. Provide explicit extraction rules
5. Include examples of input → output
6. Handle edge cases (noise, ambiguity, empty input)

### The Template

```typescript
export const EXTRACTION_SYSTEM_PROMPT = `You are a [DOMAIN] insight extraction assistant. Your task is to extract structured [RECOMMENDATION_TYPE] from [INPUT_SOURCE_TYPE].

## Your Role
Extract ONLY information that is explicitly stated or very strongly implied. Never guess or invent.

## Categories
- **category_a**: Description of when to use this category
- **category_b**: Description of when to use this category
- **category_c**: Description of when to use this category
- **category_d**: Description of when to use this category

## Field Priority (by value)
1. **highest_priority_field** (most valuable) - Why it matters
2. **second_priority_field** (very valuable) - Why it matters
3. **third_priority_field** (valuable) - Why it matters

## Extraction Rules
1. Extract multiple recommendations if input contains multiple distinct items
2. Keep capturedText concise (3-15 words)
3. Use null for fields not explicitly mentioned
4. Only infer [specific_field] if strongly implied by context
5. Return empty array if no extractable information
6. Preserve specific details (names, dates, numbers, identifiers)

## Examples

**Input:** "[Example input 1]"
**Output:**
[{
  "capturedText": "Concise summary",
  "category": "category_a",
  "field_a": "extracted value",
  "field_b": null
}]

**Input:** "[Example input 2 with multiple items]"
**Output:**
[
  {"capturedText": "First item summary", "category": "category_b", "field_a": "value1"},
  {"capturedText": "Second item summary", "category": "category_a", "field_b": "value2"}
]

**Input:** "um, so yeah, I don't know, maybe later"
**Output:** { "recommendations": [] }

## Important
- Return empty recommendations array if no extractable information
- Never make up information not present in input
- When in doubt, use null for optional fields
- Preserve original meaning, don't paraphrase excessively`;
```

### Prompt Design Principles

1. **Be explicit about categories** - AI should know exactly when to use each
2. **Prioritize fields** - Tell AI what matters most for your domain
3. **Show examples** - Input/output pairs are the most powerful teaching tool
4. **Handle noise** - Show what to do with meaningless input ("um, yeah")
5. **Set boundaries** - "Never guess", "Only extract what's explicit"

---

## Pattern 3: API Route Implementation

### Key Principle
The extraction API should:
1. Validate input with Zod
2. Short-circuit on trivial input
3. Inject context into the prompt
4. Use `generateObject` for structured output
5. Handle errors gracefully
6. Cache-bust responses

### The Template

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { gpt4oMini } from "@/lib/openai";
import {
  extractionRequestSchema,
  extractionResponseSchema,
} from "@/lib/schemas/extraction";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check (your auth pattern)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const parseResult = extractionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { inputText, context } = parseResult.data;

    // 3. Short-circuit on trivial input
    if (inputText.trim().length < 10) {
      return NextResponse.json(
        { recommendations: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Sanitize input (prevent prompt injection, limit length)
    const sanitizedInput = inputText.slice(0, 10000);

    // 5. Build user prompt with context injection
    let userPrompt = `Extract recommendations from this text:\n\n"${sanitizedInput}"`;

    if (context) {
      const contextParts: string[] = [];

      if (context.entityName) {
        contextParts.push(`Entity being enriched: ${context.entityName}`);
      }
      if (context.entityType) {
        contextParts.push(`Entity type: ${context.entityType}`);
      }
      if (context.existingItems?.length) {
        contextParts.push(`Existing items (avoid duplicates):\n${
          context.existingItems.map(i => `- [${i.status || 'unknown'}] ${i.title}`).join('\n')
        }`);
      }
      if (context.teamMembers?.length) {
        contextParts.push(`Team members: ${context.teamMembers.join(', ')}`);
      }

      if (contextParts.length > 0) {
        userPrompt += `\n\nContext:\n${contextParts.join("\n\n")}`;
      }
    }

    // 6. Call generateObject with structured schema
    const result = await generateObject({
      model: gpt4oMini(),
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: extractionResponseSchema,
    });

    // 7. Return with cache-busting headers
    return NextResponse.json(
      result.object,
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );

  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract recommendations", recommendations: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

---

## Pattern 4: Context Injection

### Key Principle
Provide existing state to the AI so it can:
1. Avoid duplicating existing items
2. Reference existing entities by ID
3. Understand what's already known
4. Update rather than recreate

### The Pattern

```typescript
// When building the user prompt, inject relevant context
function buildContextualPrompt(
  inputText: string,
  context: ExtractionContext
): string {
  let prompt = `Extract recommendations from:\n\n"${inputText}"`;

  const sections: string[] = [];

  // What entity is being enriched?
  if (context.entityName) {
    sections.push(`## Target Entity\n${context.entityName} (${context.entityType})`);
  }

  // Existing items to avoid duplicates
  if (context.existingItems?.length) {
    const itemsList = context.existingItems
      .map(item => `- [${item.id}] ${item.title} (${item.status})`)
      .join('\n');
    sections.push(`## Existing Items (reference by ID, don't duplicate)\n${itemsList}`);
  }

  // Team members for mention detection
  if (context.teamMembers?.length) {
    sections.push(`## Team Members\n${context.teamMembers.join(', ')}`);
  }

  // Recent activity for context
  if (context.recentActivity) {
    sections.push(`## Recent Context\n${context.recentActivity}`);
  }

  if (sections.length > 0) {
    prompt += `\n\n---\n\n${sections.join('\n\n')}`;
  }

  return prompt;
}
```

### Why Context Matters

Without context:
> Input: "We need to update the auth bug"
> Output: `{ category: "new_issue", title: "Auth bug" }` (creates duplicate)

With context:
> Input: "We need to update the auth bug"
> Context: Existing items: `[{id: "LIN-123", title: "Auth bug", status: "in_progress"}]`
> Output: `{ category: "update_existing", linkedEntityId: "LIN-123", action: "update" }`

---

## Pattern 5: Entity Mention Extraction

### Key Principle
When processing text, detect references to other entities (people, issues, projects) and link them.

### The Extraction Prompt

```typescript
export const MENTION_EXTRACTION_PROMPT = `You are analyzing text for references to other entities. Your task is to identify mentions of [ENTITY_TYPE] and extract context about each.

## Your Role
Extract mentions of other [ENTITY_TYPE] referenced in the text. The primary entity is provided - do NOT include it.

## What to Extract

For each mentioned entity:
1. **name/identifier**: As written in the text
2. **normalizedName**: Cleaned version for matching
3. **context**: What was said about it (1-3 sentences)
4. **category**: Primary category for this mention
5. **inferredDetails**: Any structured data if clearly stated

## Rules

1. **Exclude the primary entity** - It's already being processed
2. **Only extract named/identified entities** - Skip vague references
3. **Preserve specifics** - Keep identifiers, names exactly as stated
4. **Don't invent details** - Only include what's explicit
5. **Group duplicates** - Same entity mentioned twice = one extraction

## Example

**Primary Entity:** Sprint 23
**Text:** "We talked about LIN-456 being blocked and need to sync with the mobile team on LIN-789. Also Sarah mentioned the API redesign might affect both."

**Output:**
{
  "mentions": [
    {
      "name": "LIN-456",
      "normalizedName": "LIN-456",
      "context": "Currently blocked, needs attention",
      "category": "blocker",
      "inferredDetails": { "status": "blocked" }
    },
    {
      "name": "LIN-789",
      "normalizedName": "LIN-789",
      "context": "Need to sync with mobile team about this",
      "category": "dependency",
      "inferredDetails": { "team": "mobile" }
    },
    {
      "name": "API redesign",
      "normalizedName": "api-redesign",
      "context": "May affect LIN-456 and LIN-789",
      "category": "dependency"
    }
  ]
}`;
```

### Matching Extracted Mentions

After extraction, match mentions against your existing data:

```typescript
// Three-tier matching: EXACT → FUZZY → NONE
async function matchMentions(
  mentions: ExtractedMention[],
  existingEntities: Entity[]
): Promise<MatchedMention[]> {
  return Promise.all(mentions.map(async mention => {
    // 1. Try exact match first
    const exactMatch = existingEntities.find(
      e => e.id.toLowerCase() === mention.normalizedName.toLowerCase() ||
           e.title.toLowerCase() === mention.normalizedName.toLowerCase()
    );

    if (exactMatch) {
      return {
        ...mention,
        matchType: 'EXACT',
        confidence: 1.0,
        matchedEntity: exactMatch,
      };
    }

    // 2. Try fuzzy match with context scoring
    const fuzzyMatches = await findFuzzyMatches(mention, existingEntities);
    if (fuzzyMatches.length > 0) {
      const best = fuzzyMatches[0];
      return {
        ...mention,
        matchType: 'FUZZY',
        confidence: best.score,
        matchedEntity: best.entity,
        alternativeMatches: fuzzyMatches.slice(1, 4),
      };
    }

    // 3. No match found
    return {
      ...mention,
      matchType: 'NONE',
      confidence: 0,
      matchedEntity: null,
    };
  }));
}
```

---

## Pattern 6: Intelligent Notes Merging

### Key Principle
When you have existing content and new content, merge them intelligently:
1. Deduplicate (same fact only once)
2. Update (newer info supersedes older)
3. Preserve (keep all unique details)
4. Format (clean, consistent structure)

### The Merge Prompt

```typescript
export const NOTES_MERGE_PROMPT = `You are a note-merging assistant. Intelligently combine existing content with new information.

## Your Goal
Create unified content that:
1. Preserves all important information from BOTH sources
2. Removes duplicates (same fact appears once)
3. Updates outdated information with newer details
4. Organizes logically

## Rules
1. **Preserve ALL specifics** - Names, dates, numbers, identifiers must be kept exactly
2. **Deduplicate intelligently** - "Needs auth fix" and "we need to fix auth" = same thing
3. **Prefer newer for updates** - If existing says "in progress" and new says "completed", use "completed"
4. **Keep unique info from both** - Don't drop information just because it's only in one source
5. **Clean format** - Use consistent bullet points or structure
6. **Remove filler** - Clean up verbal noise (um, uh, like, so yeah)
7. **Don't add information** - Only include what was explicitly stated

## Output
Return a JSON object with:
- mergedContent: The combined, deduplicated content
- changeSummary: Brief 1-sentence summary of what changed

## Example

**Existing:**
• Auth bug reported by mobile team
• Priority: high
• Blocked by API team

**New:**
"talked about the auth bug, API team unblocked it yesterday, now just needs QA review"

**Output:**
{
  "mergedContent": "• Auth bug reported by mobile team\\n• Priority: high\\n• Unblocked by API team (yesterday)\\n• Needs QA review",
  "changeSummary": "Updated blocker status to unblocked; added QA review requirement"
}`;
```

### The Merge Function

```typescript
export async function mergeContentWithAI(
  existingContent: string,
  newContent: string
): Promise<{ mergedContent: string; changeSummary: string }> {
  const trimmedExisting = existingContent.trim();
  const trimmedNew = newContent.trim();

  // Short-circuit: no new content
  if (!trimmedNew || trimmedNew.length < 20) {
    return {
      mergedContent: trimmedExisting,
      changeSummary: "",
    };
  }

  // Short-circuit: no existing content
  if (!trimmedExisting) {
    const refined = await refineContentWithAI(trimmedNew);
    return {
      mergedContent: refined,
      changeSummary: "Created initial content",
    };
  }

  // Merge with AI
  const result = await generateObject({
    model: gpt4oMini(),
    system: NOTES_MERGE_PROMPT,
    prompt: `Existing:\n${trimmedExisting}\n\nNew:\n"${trimmedNew}"`,
    schema: z.object({
      mergedContent: z.string(),
      changeSummary: z.string(),
    }),
  });

  return result.object;
}
```

---

## Pattern 7: Conflict Detection

### Key Principle
When AI extracts values that conflict with existing data, flag them for user decision rather than silently overwriting.

### The Pattern

```typescript
// Define what fields can conflict
const CONFLICT_FIELDS = ['status', 'priority', 'assignee', 'deadline'] as const;

interface FieldConflict {
  field: typeof CONFLICT_FIELDS[number];
  existingValue: string;
  newValue: string;
  source: 'ai_extraction';
}

function detectConflicts(
  existingEntity: Entity,
  extracted: ExtractedRecommendation
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  for (const field of CONFLICT_FIELDS) {
    const existingValue = existingEntity[field];
    const newValue = extracted[field];

    // Only flag if both have values AND they differ
    if (
      existingValue &&
      newValue &&
      existingValue.toLowerCase() !== newValue.toLowerCase()
    ) {
      conflicts.push({
        field,
        existingValue,
        newValue,
        source: 'ai_extraction',
      });
    }
  }

  return conflicts;
}
```

### UI Pattern for Conflict Resolution

```typescript
// In your session page state
const [pendingConflicts, setPendingConflicts] = useState<FieldConflict[]>([]);
const [showConflictModal, setShowConflictModal] = useState(false);

// When saving, check for conflicts first
async function handleSave() {
  const conflicts = detectConflicts(existingEntity, extractedData);

  if (conflicts.length > 0) {
    setPendingConflicts(conflicts);
    setShowConflictModal(true);
    return; // Wait for user decision
  }

  // No conflicts, proceed with save
  await saveExtractedData(extractedData);
}

// User resolves each conflict
function resolveConflict(field: string, useNew: boolean) {
  if (!useNew) {
    // Remove the field from extracted data
    setExtractedData(prev => ({ ...prev, [field]: null }));
  }
  // Remove from pending
  setPendingConflicts(prev => prev.filter(c => c.field !== field));

  // If no more conflicts, proceed
  if (pendingConflicts.length === 1) {
    setShowConflictModal(false);
    saveExtractedData(extractedData);
  }
}
```

---

## Pattern 8: Field Accumulation Strategy

### Key Principle
During a session, you may extract multiple pieces of information. Define clear rules for how to accumulate them.

### The Pattern

```typescript
// Define accumulation behavior per field type
const ACCUMULATION_RULES = {
  // APPEND: Multiple values collected, joined with separator
  notes: { mode: 'append', separator: '\n• ' },
  tags: { mode: 'append', separator: ', ' },
  blockers: { mode: 'append', separator: '\n' },

  // OVERWRITE: Latest value wins
  status: { mode: 'overwrite' },
  priority: { mode: 'overwrite' },
  assignee: { mode: 'overwrite' },
  deadline: { mode: 'overwrite' },

  // MERGE: Intelligent combination (use AI merge)
  description: { mode: 'merge' },
  requirements: { mode: 'merge' },
} as const;

// Accumulated state during session
interface AccumulatedFields {
  // Append fields store arrays
  notes: string[];
  tags: string[];
  blockers: string[];

  // Overwrite fields store latest value
  status: string | null;
  priority: string | null;
  assignee: string | null;
  deadline: string | null;

  // Merge fields store combined value
  description: string | null;
}

// Process a new extraction
function accumulateExtraction(
  current: AccumulatedFields,
  extraction: ExtractedRecommendation
): AccumulatedFields {
  const updated = { ...current };

  for (const [field, value] of Object.entries(extraction)) {
    if (!value || !(field in ACCUMULATION_RULES)) continue;

    const rule = ACCUMULATION_RULES[field as keyof typeof ACCUMULATION_RULES];

    switch (rule.mode) {
      case 'append':
        (updated[field as keyof AccumulatedFields] as string[]).push(value);
        break;
      case 'overwrite':
        updated[field as keyof AccumulatedFields] = value;
        break;
      case 'merge':
        // Will be merged with AI at save time
        updated[field as keyof AccumulatedFields] = value;
        break;
    }
  }

  return updated;
}

// Convert accumulated fields to final payload
function buildFinalPayload(
  accumulated: AccumulatedFields,
  existingEntity: Entity
): Partial<Entity> {
  const payload: Partial<Entity> = {};

  for (const [field, rule] of Object.entries(ACCUMULATION_RULES)) {
    const value = accumulated[field as keyof AccumulatedFields];
    if (!value) continue;

    switch (rule.mode) {
      case 'append':
        const existingValue = existingEntity[field as keyof Entity] || '';
        const separator = rule.separator;
        const newValue = (value as string[]).join(separator);
        payload[field as keyof Entity] = existingValue
          ? `${existingValue}${separator}${newValue}`
          : newValue;
        break;
      case 'overwrite':
        // Only set if not conflicting (conflicts handled separately)
        payload[field as keyof Entity] = value as string;
        break;
      case 'merge':
        // Merge handled by AI merge function
        break;
    }
  }

  return payload;
}
```

---

## Pattern 9: Visual Bubbles/Chips

### Key Principle
Extracted insights should be visualized immediately as categorized, color-coded chips/bubbles to provide feedback.

### The Data Structure

```typescript
interface ExtractedBubble {
  id: string;           // Unique ID for React keys
  text: string;         // Display text (3-15 words)
  category: string;     // Category for color coding
  confidence?: number;  // Optional confidence indicator
  linkedEntityId?: string; // If referencing existing entity
}

// Create bubble from extraction
function createBubble(
  text: string,
  category: string,
  confidence?: number
): ExtractedBubble {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    category,
    confidence,
  };
}
```

### Color Coding by Category

```typescript
// Define colors per category
const CATEGORY_COLORS = {
  new_issue: {
    bg: 'red-500/20',
    text: 'red-400',
    dot: 'red-400',
    border: 'red-500/30',
  },
  update_existing: {
    bg: 'blue-500/20',
    text: 'blue-400',
    dot: 'blue-400',
    border: 'blue-500/30',
  },
  decision: {
    bg: 'purple-500/20',
    text: 'purple-400',
    dot: 'purple-400',
    border: 'purple-500/30',
  },
  deadline: {
    bg: 'amber-500/20',
    text: 'amber-400',
    dot: 'amber-400',
    border: 'amber-500/30',
  },
  blocker: {
    bg: 'orange-500/20',
    text: 'orange-400',
    dot: 'orange-400',
    border: 'orange-500/30',
  },
} as const;

// Get color classes for a category
function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || {
    bg: 'gray-500/20',
    text: 'gray-400',
    dot: 'gray-400',
    border: 'gray-500/30',
  };
}
```

### Animated Bubble Component

```tsx
import { motion } from 'framer-motion';

function Bubble({
  bubble,
  index,
  onRemove,
}: {
  bubble: ExtractedBubble;
  index: number;
  onRemove?: (id: string) => void;
}) {
  const colors = getCategoryColors(bubble.category);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.08, // Stagger animation
      }}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-${colors.bg} border border-${colors.border}
      `}
    >
      {/* Category dot indicator */}
      <span className={`w-2 h-2 rounded-full bg-${colors.dot}`} />

      {/* Text */}
      <span className={`text-sm text-${colors.text}`}>
        {bubble.text}
      </span>

      {/* Confidence indicator (optional) */}
      {bubble.confidence !== undefined && (
        <span className="text-xs opacity-60">
          {Math.round(bubble.confidence * 100)}%
        </span>
      )}

      {/* Remove button (optional) */}
      {onRemove && (
        <button
          onClick={() => onRemove(bubble.id)}
          className="ml-1 opacity-50 hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
```

---

## Pattern 10: Pause Detection for Voice Input

### Key Principle
When using voice input, detect pauses to trigger extraction rather than processing continuously.

### The Pattern

```typescript
const PAUSE_THRESHOLD_MS = 1000;  // 1 second of silence
const DEBOUNCE_DELAY_MS = 500;    // Wait 500ms after pause

function useVoiceExtractionWithPauseDetection(
  onExtract: (text: string) => Promise<void>
) {
  const { transcript, listening } = useSpeechRecognition();
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastApiCallRef = useRef<number>(0);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!listening) return;

    // Get new text since last processing
    const newText = transcript.slice(lastProcessedLength).trim();

    // Skip if too short
    if (newText.length < 10) return;

    // Set timer for pause detection + debounce
    debounceTimerRef.current = setTimeout(async () => {
      const now = Date.now();

      // Prevent rapid fire
      if (now - lastApiCallRef.current < DEBOUNCE_DELAY_MS) return;

      lastApiCallRef.current = now;
      setLastProcessedLength(transcript.length);

      await onExtract(newText);
    }, PAUSE_THRESHOLD_MS + DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [transcript, listening, lastProcessedLength, onExtract]);

  return { transcript, listening };
}
```

---

## Pattern 11: Confidence Scoring

### Key Principle
Not all extractions are equally confident. Score them and optionally filter.

### In the Schema

```typescript
const extractedRecommendationSchema = z.object({
  // ... other fields

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in this extraction: 0.9+ = very confident, 0.6-0.89 = confident, 0.3-0.59 = moderate, <0.3 = low")
    .optional(),
});
```

### In the Prompt

Add to your system prompt:
```
## Confidence Scoring

Rate your confidence for each extraction:
- **0.9-1.0**: Explicitly stated, unambiguous
- **0.6-0.89**: Strongly implied, high confidence
- **0.3-0.59**: Moderately implied, some ambiguity
- **0.1-0.29**: Weakly implied, significant ambiguity
- **<0.1**: Very uncertain, borderline guess

Only include extractions with confidence >= 0.3
```

### Filtering by Confidence

```typescript
const MIN_CONFIDENCE_THRESHOLD = 0.3;

function filterByConfidence(
  recommendations: ExtractedRecommendation[]
): ExtractedRecommendation[] {
  return recommendations.filter(r =>
    r.confidence === undefined || r.confidence >= MIN_CONFIDENCE_THRESHOLD
  );
}
```

---

## Pattern 12: OpenAI Client Setup (Lazy Initialization)

### Key Principle
Initialize the OpenAI client lazily to avoid build-time errors.

### The Pattern

```typescript
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Lazy initialization - avoids "Missing apiKey" at build time
let _openai: OpenAIProvider | null = null;
let _model: LanguageModel | null = null;

function getOpenAIClient(): OpenAIProvider {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. " +
        "Get your key from https://platform.openai.com/api-keys"
      );
    }
    _openai = createOpenAI({ apiKey });
  }
  return _openai;
}

export function gpt4oMini(): LanguageModel {
  if (!_model) {
    _model = getOpenAIClient()("gpt-4o-mini");
  }
  return _model;
}
```

---

## Summary: Key Takeaways

### 1. Schema-First Design
Define your output schema with Zod first. This gives you type safety and validation.

### 2. Prompt Engineering is Critical
The system prompt is the brain. Include categories, priorities, rules, examples, and edge cases.

### 3. Context Injection Prevents Duplicates
Always pass existing state so AI can reference rather than recreate.

### 4. Use `generateObject` for Structured Outputs
Vercel AI SDK's `generateObject` with Zod schemas gives you validated, typed outputs.

### 5. Conflict Detection > Silent Overwrite
Flag conflicts for user decision rather than silently overwriting.

### 6. Accumulation Rules Matter
Define whether fields append, overwrite, or merge during a session.

### 7. Visual Feedback (Bubbles) is Powerful
Showing extractions as colored chips provides immediate feedback and confidence.

### 8. Intelligent Merging Preserves Context
Use AI to merge new content with existing rather than simple concatenation.

### 9. Pause Detection for Voice
Don't process continuously - wait for natural pauses.

### 10. Confidence Scoring Enables Filtering
Let AI rate its confidence and filter low-confidence extractions.

---

## Files to Reference

| Pattern | Source File |
|---------|-------------|
| Schema Design | `src/lib/schemas/enrichmentInsight.ts` |
| System Prompts | `src/lib/openai.ts` |
| Extraction API | `src/app/api/enrichment/extract/route.ts` |
| Mention Extraction | `src/app/api/enrichment/extract-mentions/route.ts` |
| Mention Matching | `src/app/api/contacts/match-mentions/route.ts` |
| Notes Merging | `src/app/api/enrichment/refine-notes/route.ts` |
| Session Page | `src/app/(dashboard)/enrichment/session/page.tsx` |
| Bubble Component | `src/components/enrichment/EnrichmentBubbles.tsx` |
| Completion UI | `src/components/enrichment/completion/CompletionCelebration.tsx` |
| Color Constants | `src/lib/design-system.ts` |

---

## License

These patterns are extracted from Better Connections and provided for reference.
