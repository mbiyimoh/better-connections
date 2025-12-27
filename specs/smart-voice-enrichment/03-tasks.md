# Task Breakdown: Smart Voice Enrichment

**Generated:** 2025-12-27
**Source:** specs/smart-voice-enrichment/02-specification.md
**Last Decompose:** 2025-12-27
**Mode:** Full

---

## Overview

Replace keyword-based voice enrichment with AI-powered semantic understanding using GPT-4o-mini. Users speak naturally about contacts and the system extracts structured CRM insights, categorizes them, and handles conflicts with existing data.

**Total Tasks:** 12
**Phases:** 4

---

## Phase 1: Core AI Extraction Infrastructure

### Task 1.1: Create Zod schemas for AI extraction
**Description:** Create enrichmentInsight.ts with Zod schemas for API request/response validation
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation task)

**File to Create:** `src/lib/schemas/enrichmentInsight.ts`

**Implementation:**
```typescript
import { z } from "zod";

// Single extracted insight
export const enrichmentInsightSchema = z.object({
  capturedText: z
    .string()
    .describe("The key phrase or fact extracted from speech - concise, 3-10 words"),

  category: z
    .enum(["relationship", "opportunity", "expertise", "interest"])
    .describe(
      "Category: relationship=how you know them, opportunity=business potential/why now, " +
      "expertise=professional skills/role, interest=personal hobbies/passions"
    ),

  howWeMet: z
    .string()
    .nullable()
    .describe("How the user met this contact - events, introductions, shared history")
    .optional(),

  whyNow: z
    .string()
    .nullable()
    .describe("Time-sensitive relevance - why this contact matters right now, opportunities")
    .optional(),

  title: z
    .string()
    .nullable()
    .describe("Job title or professional role if mentioned")
    .optional(),

  company: z
    .string()
    .nullable()
    .describe("Company or organization if mentioned")
    .optional(),

  expertise: z
    .string()
    .nullable()
    .describe("Professional skills, domain expertise, or what they do")
    .optional(),

  interests: z
    .string()
    .nullable()
    .describe("Personal interests, hobbies, or passions")
    .optional(),

  notes: z
    .string()
    .nullable()
    .describe("Any other relevant context that doesn't fit other fields")
    .optional(),
});

// API response: array of insights
export const enrichmentExtractionResponseSchema = z.object({
  insights: z
    .array(enrichmentInsightSchema)
    .describe("Array of extracted insights - can be empty if no valuable context found"),
});

// API request
export const enrichmentExtractionRequestSchema = z.object({
  transcript: z
    .string()
    .min(1, "Transcript is required")
    .max(4000, "Transcript too long"),
  contactContext: z
    .object({
      name: z.string().optional(),
      title: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      howWeMet: z.string().nullable().optional(),
      whyNow: z.string().nullable().optional(),
      expertise: z.string().nullable().optional(),
      interests: z.string().nullable().optional(),
    })
    .optional()
    .describe("Existing contact data to avoid duplicate extraction"),
});

// Conflict detection
export const fieldConflictSchema = z.object({
  field: z.enum(["title", "company"]),
  existingValue: z.string(),
  newValue: z.string(),
  source: z.literal("ai_extraction"),
});

export type EnrichmentInsight = z.infer<typeof enrichmentInsightSchema>;
export type EnrichmentExtractionResponse = z.infer<typeof enrichmentExtractionResponseSchema>;
export type EnrichmentExtractionRequest = z.infer<typeof enrichmentExtractionRequestSchema>;
export type FieldConflict = z.infer<typeof fieldConflictSchema>;
```

**Acceptance Criteria:**
- [ ] Schema file created at `src/lib/schemas/enrichmentInsight.ts`
- [ ] All types exported
- [ ] Schema validates correctly (test with sample data)
- [ ] TypeScript compiles without errors

---

### Task 1.2: Add enrichment system prompt to openai.ts
**Description:** Add the CRM extraction system prompt to the existing OpenAI config
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**File to Modify:** `src/lib/openai.ts`

**Add this export:**
```typescript
export const ENRICHMENT_EXTRACTION_SYSTEM_PROMPT = `You are a CRM insight extraction assistant. Your task is to extract structured professional relationship context from spoken transcripts about contacts.

## Your Role
Extract ONLY information that is explicitly stated or very strongly implied. Never guess or infer beyond what's clearly present in the transcript.

## Categories
- **relationship**: How the user knows this person (met at, introduced by, worked together, mutual connections)
- **opportunity**: Business potential, why reaching out now, investment/funding context, collaboration potential
- **expertise**: Professional skills, job role, domain knowledge, what they do professionally
- **interest**: Personal hobbies, passions, non-work activities

## Field Priority (by CRM value)
1. **whyNow** (20 pts) - Time-sensitive relevance, opportunities, current projects
2. **howWeMet** (15 pts) - Relationship origin and shared history
3. **title** (10 pts) - Professional role/position
4. **company** (10 pts) - Organization/employer
5. **expertise** - Professional skills (contributes to score)
6. **interests** - Personal interests (contributes to score)

## Extraction Rules
1. Extract multiple insights if the transcript contains multiple distinct pieces of information
2. Keep capturedText concise (3-10 words) - this appears in the UI bubble
3. Use null for fields that aren't mentioned or strongly implied
4. For names of people/companies, preserve exact spelling from transcript
5. Infer job titles only if role is clearly described (e.g., "manages money" → "Financial Manager")
6. Map descriptive phrases to appropriate fields (e.g., "manages money for athletes" → expertise: "Athlete wealth management")

## Examples

Input: "He manages money for Thaddeus Young"
Output: [{
  "capturedText": "Manages money for NBA players",
  "category": "expertise",
  "title": "Financial Manager",
  "expertise": "Athlete wealth management",
  "notes": "Connection to Thaddeus Young (NBA player)"
}]

Input: "Met her at the TechCrunch conference last month, she's looking to raise a Series A"
Output: [
  {
    "capturedText": "Met at TechCrunch conference",
    "category": "relationship",
    "howWeMet": "TechCrunch conference last month"
  },
  {
    "capturedText": "Raising Series A",
    "category": "opportunity",
    "whyNow": "Looking to raise Series A funding"
  }
]

Input: "He loves playing pickleball and he's really into wine collecting"
Output: [
  {
    "capturedText": "Plays pickleball",
    "category": "interest",
    "interests": "Pickleball"
  },
  {
    "capturedText": "Wine collector",
    "category": "interest",
    "interests": "Wine collecting"
  }
]

Input: "um, so yeah, I don't know"
Output: { "insights": [] }

## Important
- Return empty insights array if transcript contains no extractable information
- Never make up information not present in the transcript
- Prefer specific details over generic summaries`;
```

**Acceptance Criteria:**
- [ ] System prompt added to `src/lib/openai.ts`
- [ ] Prompt exported and accessible
- [ ] File compiles without errors

---

### Task 1.3: Create AI extraction API endpoint
**Description:** Create POST /api/enrichment/extract endpoint using generateObject
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None

**File to Create:** `src/app/api/enrichment/extract/route.ts`

**Implementation:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { gpt4oMini, ENRICHMENT_EXTRACTION_SYSTEM_PROMPT } from "@/lib/openai";
import {
  enrichmentExtractionRequestSchema,
  enrichmentExtractionResponseSchema,
} from "@/lib/schemas/enrichmentInsight";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request
    const body = await request.json();
    const { transcript, contactContext } = enrichmentExtractionRequestSchema.parse(body);

    // 3. Skip if transcript too short
    if (transcript.trim().length < 10) {
      return NextResponse.json({ insights: [] });
    }

    // 4. Simple sanitization (voice input is already low-risk)
    const sanitizedTranscript = transcript.slice(0, 4000);

    // 5. Build user prompt with context
    let userPrompt = `Extract insights from this transcript about a contact:\n\n"${sanitizedTranscript}"`;

    if (contactContext?.name) {
      userPrompt += `\n\nContact name: ${contactContext.name}`;
    }

    if (contactContext) {
      const existingFields: string[] = [];
      if (contactContext.title) existingFields.push(`Title: ${contactContext.title}`);
      if (contactContext.company) existingFields.push(`Company: ${contactContext.company}`);
      if (contactContext.howWeMet) existingFields.push(`How we met: ${contactContext.howWeMet}`);
      if (contactContext.expertise) existingFields.push(`Expertise: ${contactContext.expertise}`);

      if (existingFields.length > 0) {
        userPrompt += `\n\nExisting contact data (avoid duplicating):\n${existingFields.join("\n")}`;
      }
    }

    // 6. Call GPT-4o-mini with structured output
    const { object } = await generateObject({
      model: gpt4oMini,
      schema: enrichmentExtractionResponseSchema,
      system: ENRICHMENT_EXTRACTION_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
    });

    // 7. Return extracted insights
    return NextResponse.json(object, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Enrichment extraction error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract insights" },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] API route created at `src/app/api/enrichment/extract/route.ts`
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 400 for invalid request body
- [ ] Returns empty insights array for short transcripts
- [ ] Returns structured insights for valid transcripts
- [ ] Test with sample transcript: "He manages money for athletes"

---

## Phase 2: Session Page Integration

### Task 2.1: Add AI processing state to session page
**Description:** Add state variables and refs for AI extraction processing
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Add these state variables:**
```typescript
// Add to existing state declarations
const [isProcessing, setIsProcessing] = useState(false);
const lastApiCallRef = useRef<number>(0);
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

// Constants for timing
const PAUSE_THRESHOLD = 1000; // 1 second pause detection
const DEBOUNCE_DELAY = 500;  // 500ms debounce after pause

// State for accumulated AI extractions
const [extractedFields, setExtractedFields] = useState<{
  howWeMet: string[];
  whyNow: string[];
  expertise: string[];
  interests: string[];
  title: string | null;
  company: string | null;
  notes: string[];
}>({
  howWeMet: [],
  whyNow: [],
  expertise: [],
  interests: [],
  title: null,
  company: null,
  notes: [],
});
```

**Add import for type:**
```typescript
import type { EnrichmentInsight } from "@/lib/schemas/enrichmentInsight";
```

**Acceptance Criteria:**
- [ ] State variables added to session page
- [ ] Import added for EnrichmentInsight type
- [ ] TypeScript compiles without errors

---

### Task 2.2: Implement extractInsightsWithAI function with retry
**Description:** Replace keyword-based extraction with AI API call including retry logic
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Remove the old extractInsights() function and add:**
```typescript
// New AI extraction function with retry logic
async function extractInsightsWithAI(text: string): Promise<void> {
  if (text.trim().length < 10 || isProcessing) return;

  setIsProcessing(true);

  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch("/api/enrichment/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          contactContext: contact
            ? {
                name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
                title: contact.title,
                company: contact.company,
                howWeMet: contact.howWeMet,
                expertise: contact.expertise,
              }
            : undefined,
        }),
      });

      if (!response.ok) throw new Error("Extraction failed");

      const data = await response.json();

      if (data.insights && data.insights.length > 0) {
        const newBubbles = data.insights.map((insight: EnrichmentInsight) =>
          createBubble(insight.capturedText, insight.category)
        );
        setBubbles((prev) => [...prev, ...newBubbles]);

        // Store field data for later merge
        storeExtractedFields(data.insights);
      }

      setIsProcessing(false);
      return; // Success - exit function

    } catch (error) {
      lastError = error as Error;
      console.error(`AI extraction attempt ${attempt + 1} failed:`, error);

      // Wait 1s before retry (only if not last attempt)
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // All retries failed - fallback to generic bubble
  console.error("AI extraction failed after retries:", lastError);
  if (text.length > 20) {
    const truncated = text.length > 60 ? text.slice(0, 57) + "..." : text;
    setBubbles((prev) => [...prev, createBubble(truncated, "relationship")]);
  }

  setIsProcessing(false);
}

// Helper to accumulate extracted fields
function storeExtractedFields(insights: EnrichmentInsight[]) {
  setExtractedFields((prev) => {
    const updated = { ...prev };

    for (const insight of insights) {
      if (insight.howWeMet) updated.howWeMet.push(insight.howWeMet);
      if (insight.whyNow) updated.whyNow.push(insight.whyNow);
      if (insight.expertise) updated.expertise.push(insight.expertise);
      if (insight.interests) updated.interests.push(insight.interests);
      if (insight.notes) updated.notes.push(insight.notes);

      // For structured fields, keep latest non-null value
      if (insight.title) updated.title = insight.title;
      if (insight.company) updated.company = insight.company;
    }

    return updated;
  });
}
```

**Acceptance Criteria:**
- [ ] Old extractInsights() function removed
- [ ] New extractInsightsWithAI() function added
- [ ] storeExtractedFields() helper added
- [ ] Retry logic works (2 attempts with 1s delay)
- [ ] Fallback bubble created on failure

---

### Task 2.3: Implement pause detection with debounce
**Description:** Add useEffect for pause detection and debounced API calls
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Replace the existing transcript processing useEffect with:**
```typescript
// Speech pause detection effect
useEffect(() => {
  if (!listening || !isStarted) return;

  // Clear existing debounce timer
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // Only process new text
  const newText = transcript.slice(lastProcessedLength).trim();
  if (newText.length < 10) return;

  // Set up pause detection
  debounceTimerRef.current = setTimeout(() => {
    // Check if we haven't made a call recently (debounce)
    const now = Date.now();
    if (now - lastApiCallRef.current < DEBOUNCE_DELAY) return;

    lastApiCallRef.current = now;
    setLastProcessedLength(transcript.length);
    extractInsightsWithAI(newText);
  }, PAUSE_THRESHOLD + DEBOUNCE_DELAY);

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [transcript, listening, isStarted, lastProcessedLength]);
```

**Acceptance Criteria:**
- [ ] Pause detection triggers after 1000ms of silence
- [ ] Debounce prevents rapid consecutive calls
- [ ] Only new text since last processing is sent
- [ ] Cleanup function clears timers

---

### Task 2.4: Add processing indicator UI
**Description:** Show visual feedback when AI is processing speech
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1
**Can run parallel with:** Task 2.2, 2.3

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Add near the live transcript display:**
```typescript
{/* Processing Indicator */}
{isProcessing && (
  <div className="flex items-center gap-2 text-amber-400 text-sm">
    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    <span>Processing speech...</span>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Processing indicator appears during API calls
- [ ] Indicator disappears when processing completes
- [ ] Uses amber color to match design system

---

## Phase 3: Conflict Detection & Merge

### Task 3.1: Implement conflict detection
**Description:** Detect when AI-extracted title/company conflicts with existing contact data
**Size:** Small
**Priority:** High
**Dependencies:** Phase 2 complete
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Add conflict state and detection:**
```typescript
// Add to state declarations
interface FieldConflict {
  field: "title" | "company";
  existingValue: string;
  newValue: string;
}

const [conflicts, setConflicts] = useState<FieldConflict[]>([]);
const [showConflictModal, setShowConflictModal] = useState(false);

// Add detection function
function detectConflicts(): FieldConflict[] {
  const detected: FieldConflict[] = [];

  if (
    contact?.title &&
    extractedFields.title &&
    contact.title.toLowerCase() !== extractedFields.title.toLowerCase()
  ) {
    detected.push({
      field: "title",
      existingValue: contact.title,
      newValue: extractedFields.title,
    });
  }

  if (
    contact?.company &&
    extractedFields.company &&
    contact.company.toLowerCase() !== extractedFields.company.toLowerCase()
  ) {
    detected.push({
      field: "company",
      existingValue: contact.company,
      newValue: extractedFields.company,
    });
  }

  return detected;
}
```

**Acceptance Criteria:**
- [ ] Conflict detection compares AI vs existing values
- [ ] Case-insensitive comparison
- [ ] Returns array of conflicts (can be empty)

---

### Task 3.2: Create ConflictResolutionModal component
**Description:** Modal for user to choose between existing and AI-extracted values
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Add the modal component:**
```typescript
function ConflictResolutionModal({
  conflicts,
  onResolve,
  onCancel,
}: {
  conflicts: FieldConflict[];
  onResolve: (resolutions: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          Review Conflicting Information
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
          The AI extracted information that differs from existing contact data.
          Choose which value to keep for each field:
        </p>

        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div key={conflict.field} className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 capitalize">
                {conflict.field}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700">
                  <input
                    type="radio"
                    name={conflict.field}
                    checked={resolutions[conflict.field] !== conflict.newValue}
                    onChange={() =>
                      setResolutions((prev) => ({
                        ...prev,
                        [conflict.field]: conflict.existingValue,
                      }))
                    }
                    className="text-amber-500"
                  />
                  <span className="text-zinc-300">
                    Keep existing: <span className="text-white">{conflict.existingValue}</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700">
                  <input
                    type="radio"
                    name={conflict.field}
                    checked={resolutions[conflict.field] === conflict.newValue}
                    onChange={() =>
                      setResolutions((prev) => ({
                        ...prev,
                        [conflict.field]: conflict.newValue,
                      }))
                    }
                    className="text-amber-500"
                  />
                  <span className="text-zinc-300">
                    Use new: <span className="text-green-400">{conflict.newValue}</span>
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(resolutions)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Modal displays conflicts with radio buttons
- [ ] Default selects existing value
- [ ] Cancel button closes modal
- [ ] Save button returns resolutions
- [ ] Framer Motion animation on open

---

### Task 3.3: Implement save flow with merge logic
**Description:** Update save handler with field merge and conflict handling
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.2
**Can run parallel with:** None

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Update the save logic:**
```typescript
async function handleSave() {
  const detectedConflicts = detectConflicts();

  if (detectedConflicts.length > 0) {
    setConflicts(detectedConflicts);
    setShowConflictModal(true);
    return;
  }

  await performSave({});
}

async function performSave(overrides: Record<string, string>) {
  const updateData: Record<string, unknown> = {};

  // TEXT FIELDS: Append to existing
  if (extractedFields.howWeMet.length > 0) {
    const existing = contact?.howWeMet || "";
    const newContent = extractedFields.howWeMet.join(". ");
    updateData.howWeMet = existing ? `${existing}. ${newContent}` : newContent;
  }

  if (extractedFields.whyNow.length > 0) {
    const existing = contact?.whyNow || "";
    const newContent = extractedFields.whyNow.join(". ");
    updateData.whyNow = existing ? `${existing}. ${newContent}` : newContent;
  }

  if (extractedFields.expertise.length > 0) {
    const existing = contact?.expertise || "";
    const newContent = extractedFields.expertise.join(", ");
    updateData.expertise = existing ? `${existing}, ${newContent}` : newContent;
  }

  if (extractedFields.interests.length > 0) {
    const existing = contact?.interests || "";
    const newContent = extractedFields.interests.join(", ");
    updateData.interests = existing ? `${existing}, ${newContent}` : newContent;
  }

  // STRUCTURED FIELDS: Overwrite if empty OR user approved override
  if (extractedFields.title) {
    if (!contact?.title || overrides.title) {
      updateData.title = overrides.title || extractedFields.title;
    }
  }

  if (extractedFields.company) {
    if (!contact?.company || overrides.company) {
      updateData.company = overrides.company || extractedFields.company;
    }
  }

  // Notes: always append transcript
  const transcriptToSave = transcript.trim();
  if (transcriptToSave) {
    const existingNotes = contact?.notes || "";
    const aiNotes = extractedFields.notes.join("\n");
    updateData.notes = [existingNotes, aiNotes, transcriptToSave]
      .filter(Boolean)
      .join("\n\n");
  }

  // Make API call (use existing saveToContact function)
  await saveToContact(updateData);
}
```

**Add modal rendering:**
```typescript
{/* Conflict Resolution Modal */}
{showConflictModal && (
  <ConflictResolutionModal
    conflicts={conflicts}
    onResolve={(resolutions) => {
      setShowConflictModal(false);
      performSave(resolutions);
    }}
    onCancel={() => setShowConflictModal(false)}
  />
)}
```

**Acceptance Criteria:**
- [ ] Conflict detection runs before save
- [ ] Modal opens if conflicts exist
- [ ] Text fields append with proper separators
- [ ] Structured fields respect overwrite-if-empty logic
- [ ] User resolutions are applied correctly

---

## Phase 4: Polish & Production

### Task 4.1: Add comprehensive error handling
**Description:** Improve error states and user feedback
**Size:** Small
**Priority:** Medium
**Dependencies:** Phase 3 complete
**Can run parallel with:** Task 4.2

**File to Modify:** `src/app/(dashboard)/enrichment/session/page.tsx`

**Add error state and display:**
```typescript
const [extractionError, setExtractionError] = useState<string | null>(null);

// Update extractInsightsWithAI to set error:
// After all retries failed:
setExtractionError("Couldn't process speech. Your transcript is saved.");

// Clear error when processing starts:
setExtractionError(null);
```

**Add error display near transcript:**
```typescript
{extractionError && (
  <div className="text-amber-400 text-sm mt-2">
    {extractionError}
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Error state added
- [ ] Error message displays to user
- [ ] Error clears on new processing attempt

---

### Task 4.2: Test with production deployment
**Description:** Deploy to Railway and verify AI extraction works in production
**Size:** Small
**Priority:** High
**Dependencies:** Phase 3 complete
**Can run parallel with:** Task 4.1

**Steps:**
1. Commit changes to git
2. Run `/git:push` to push to GitHub
3. Run `/deploy:push-and-check-railway` to deploy
4. Test voice enrichment with sample phrases:
   - "He manages money for NBA players"
   - "Met her at TechCrunch, raising Series A"
   - "Loves pickleball and wine collecting"

**Acceptance Criteria:**
- [ ] Build passes on Railway
- [ ] Voice enrichment works in production
- [ ] Bubbles appear for natural speech
- [ ] Conflict modal works correctly
- [ ] Data saves to contact properly

---

### Task 4.3: Clean up and document
**Description:** Remove old code and add code comments
**Size:** Small
**Priority:** Low
**Dependencies:** Task 4.2
**Can run parallel with:** None

**Actions:**
1. Remove old `extractInsights()` keyword-based function completely
2. Add JSDoc comments to new functions
3. Update any related comments

**Acceptance Criteria:**
- [ ] Old keyword extraction code removed
- [ ] New functions have clear comments
- [ ] No unused imports or variables

---

## Dependency Graph

```
Phase 1: Core AI Extraction
├── Task 1.1: Zod schemas ──────────────┐
├── Task 1.2: System prompt ────────────┼──▶ Task 1.3: API endpoint
└───────────────────────────────────────┘

Phase 2: Session Integration
├── Task 2.1: State variables ──────────▶ Task 2.2: AI function
│                                              │
├── Task 2.4: Processing UI ────────────┤      ▼
│                                       └──▶ Task 2.3: Pause detection

Phase 3: Conflict Detection
├── Task 3.1: Detect conflicts ─────────▶ Task 3.2: Modal component
│                                              │
└──────────────────────────────────────────────▶ Task 3.3: Save flow

Phase 4: Polish
├── Task 4.1: Error handling ───────────┐
├── Task 4.2: Production test ──────────┤
└── Task 4.3: Cleanup ──────────────────┘
```

## Parallel Execution Opportunities

- **Phase 1:** Tasks 1.1 and 1.2 can run in parallel
- **Phase 2:** Task 2.4 can run parallel with 2.2 and 2.3
- **Phase 4:** Tasks 4.1 and 4.2 can run in parallel

## Execution Strategy

1. Start with Phase 1 foundation (schema + prompt + API)
2. Verify API works with manual testing before Phase 2
3. Phase 2 integrates AI into existing UI
4. Phase 3 adds user-facing conflict handling
5. Phase 4 ensures production readiness

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 3 | Core AI extraction infrastructure |
| 2 | 4 | Session page integration |
| 3 | 3 | Conflict detection & merge |
| 4 | 3 | Polish & production |
| **Total** | **13** | |
