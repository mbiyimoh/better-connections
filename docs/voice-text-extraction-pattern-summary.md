# Voice & Text Input Extraction Pattern

## Overview

This document summarizes the architectural approach for capturing raw user input (voice or text) and extracting structured insights using AI. The pattern is designed for scenarios where users provide freeform context that needs to be parsed into actionable, structured data.

**Core Problem:** Users speak or type unstructured thoughts. The system needs to extract specific structured fields without requiring manual form entry.

**Solution:** Real-time AI extraction with pause detection, structured output schemas, and progressive accumulation of extracted data.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAW INPUT CAPTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│  Voice (Web Speech API)           Text (Textarea)                   │
│  • Continuous listening mode      • Submit on Enter                 │
│  • Real-time transcription        • Character limit enforced        │
│  • Browser support detection      • Same extraction pipeline        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PAUSE DETECTION & DEBOUNCING                     │
├─────────────────────────────────────────────────────────────────────┤
│  • 1 second pause threshold (user stopped speaking)                 │
│  • 500ms debounce delay (prevent API spam)                          │
│  • Track "lastProcessedLength" to only extract NEW content          │
│  • Minimum 10 characters before triggering extraction               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       AI EXTRACTION (GPT-4o-mini)                   │
├─────────────────────────────────────────────────────────────────────┤
│  Input:                                                             │
│    • Sanitized transcript (max 4000 chars)                          │
│    • Existing context (optional - what we already know)             │
│                                                                     │
│  Output:                                                            │
│    • Structured JSON matching Zod schema                            │
│    • Multiple insights per extraction (if user mentioned many)      │
│    • Confidence signals via structured field population             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE ACCUMULATION                         │
├─────────────────────────────────────────────────────────────────────┤
│  Array fields: APPEND new values (e.g., howWeMet[], interests[])    │
│  Singleton fields: KEEP LATEST non-null (e.g., title, company)      │
│  Notes: AI-merged with deduplication                                │
│  Visual: Animated bubbles appear as insights extracted              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CONFLICT DETECTION & SAVE                       │
├─────────────────────────────────────────────────────────────────────┤
│  • Compare extracted vs existing data                               │
│  • Show resolution modal if conflict                                │
│  • User chooses which value to keep                                 │
│  • Save final structured data to database                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Voice Capture (Web Speech API)

**Library:** `react-speech-recognition`

**Why This Approach:**
- Native browser API (no external service costs)
- Real-time streaming transcription
- Works offline once loaded
- Simple React hooks integration

**Implementation Pattern:**
```typescript
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const {
  transcript,       // Current transcription (resets per session)
  listening,        // Boolean: is microphone active
  resetTranscript,  // Function to clear current transcript
  browserSupportsSpeechRecognition  // Feature detection
} = useSpeechRecognition();

// Start/stop
SpeechRecognition.startListening({ continuous: true });
SpeechRecognition.stopListening();
```

**Gotchas:**
- Requires HTTPS in production (localhost OK for dev)
- Chrome has best support; Safari/Edge work but less reliably
- No built-in profanity filter (AI extraction cleans output)

---

### 2. Pause Detection

**The Problem:** Calling AI on every keystroke or word is expensive and produces poor results. Need to detect when user has finished a thought.

**The Solution:** Timer-based pause detection with debouncing.

**Constants:**
```typescript
const PAUSE_THRESHOLD = 1000;   // 1 second of silence = "pause"
const DEBOUNCE_DELAY = 500;     // Additional delay before API call
const MIN_CHARS_FOR_EXTRACTION = 10;  // Skip tiny fragments
```

**Implementation Pattern:**
```typescript
useEffect(() => {
  if (!listening) return;

  // Clear existing timer
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // Only process NEW text since last API call
  const newText = transcript.slice(lastProcessedLength).trim();
  if (newText.length < MIN_CHARS_FOR_EXTRACTION) return;

  // Set up pause detection
  debounceTimerRef.current = setTimeout(() => {
    // Debounce check: don't call if we just made a call
    const now = Date.now();
    if (now - lastApiCallRef.current < DEBOUNCE_DELAY) return;

    lastApiCallRef.current = now;
    setLastProcessedLength(transcript.length);  // Mark as processed
    extractInsightsWithAI(newText);
  }, PAUSE_THRESHOLD + DEBOUNCE_DELAY);

  return () => clearTimeout(debounceTimerRef.current);
}, [transcript, listening]);
```

**Why Track `lastProcessedLength`:**
- Prevents re-processing the same text multiple times
- Only sends the "delta" since last extraction
- Transcript accumulates; we only want new content

---

### 3. Structured Output Schema (Zod)

**The Problem:** GPT-4 returns freeform text. We need guaranteed structure.

**The Solution:** Zod schemas with OpenAI's structured outputs mode.

**Key Design Principles:**

1. **Explicit Categories** - Define the taxonomy upfront:
```typescript
category: z.enum(["relationship", "opportunity", "expertise", "interest"])
  .describe(
    "Category: relationship=how you know them, opportunity=business potential, " +
    "expertise=professional skills, interest=personal hobbies"
  )
```

2. **Nullable Optional Fields** - For OpenAI strict mode:
```typescript
// CORRECT for OpenAI structured outputs
title: z.string().nullable().describe("Job title if mentioned").optional()

// WRONG - causes schema validation errors
title: z.string().describe("Job title").optional()
```

3. **Concise Captured Text** - Extract the nugget, not the transcript:
```typescript
capturedText: z.string()
  .describe("The key phrase or fact extracted - concise, 3-10 words")
```

4. **Multiple Insights Per Extraction:**
```typescript
const extractionResponseSchema = z.object({
  insights: z.array(insightSchema)  // Array, not single object
});
```

**Example Schema:**
```typescript
export const enrichmentInsightSchema = z.object({
  // The "bubble" - what the user said in 3-10 words
  capturedText: z.string()
    .describe("Key phrase extracted from speech - concise, 3-10 words"),

  // Classification
  category: z.enum(["relationship", "opportunity", "expertise", "interest"]),

  // Structured fields (nullable for partial extraction)
  howWeMet: z.string().nullable().optional(),
  whyNow: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  expertise: z.string().nullable().optional(),
  interests: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
```

---

### 4. System Prompt Engineering

**The Problem:** AI needs clear instructions to extract consistently.

**Key Prompt Components:**

1. **Role Definition:**
```
You are a CRM insight extraction assistant. Your task is to extract
structured professional relationship context from spoken transcripts.
```

2. **Category Definitions** - Be explicit about what goes where:
```
## Categories
- relationship: How the user knows this person (met at, introduced by, worked together)
- opportunity: Business potential, why reaching out now, investment context
- expertise: Professional skills, job role, domain knowledge
- interest: Personal hobbies, passions, non-work activities
```

3. **Field Priority** - Tell the AI what matters most:
```
## Field Priority (by value)
1. whyNow (20 pts) - Time-sensitive relevance
2. howWeMet (15 pts) - Relationship origin
3. title (10 pts) - Professional role
4. company (10 pts) - Organization
```

4. **Extraction Rules:**
```
## Rules
1. Extract multiple insights if transcript contains multiple pieces of info
2. Keep capturedText concise (3-10 words)
3. Use null for fields not mentioned
4. Infer job titles only if role is clearly described
5. Never guess or hallucinate - only extract what's stated
```

5. **Examples** - Critical for consistent behavior:
```
## Examples
Input: "He manages money for Thaddeus Young"
Output: [{
  "capturedText": "Manages money for NBA players",
  "category": "expertise",
  "title": "Financial Manager",
  "expertise": "Athlete wealth management"
}]
```

---

### 5. Progressive Field Accumulation

**The Problem:** User speaks in multiple bursts. Each extraction returns partial data. Need to accumulate without losing information.

**Solution Pattern:**

```typescript
// State shape: arrays for multi-value, nullable for singletons
const [extractedFields, setExtractedFields] = useState({
  howWeMet: [],      // Array - append all
  whyNow: [],        // Array - append all
  expertise: [],     // Array - append all
  interests: [],     // Array - append all
  title: null,       // Singleton - keep latest
  company: null,     // Singleton - keep latest
  notes: [],         // Array - will be merged by AI later
});

// Accumulation logic
function storeExtractedFields(insights) {
  setExtractedFields((prev) => {
    const updated = { ...prev };

    for (const insight of insights) {
      // Append to arrays
      if (insight.howWeMet) updated.howWeMet = [...updated.howWeMet, insight.howWeMet];
      if (insight.whyNow) updated.whyNow = [...updated.whyNow, insight.whyNow];
      if (insight.expertise) updated.expertise = [...updated.expertise, insight.expertise];
      if (insight.interests) updated.interests = [...updated.interests, insight.interests];
      if (insight.notes) updated.notes = [...updated.notes, insight.notes];

      // Keep latest non-null for singletons
      if (insight.title) updated.title = insight.title;
      if (insight.company) updated.company = insight.company;
    }

    return updated;
  });
}
```

**When to Append vs Replace:**
- **Append:** Fields where multiple answers are valid (interests, expertise areas)
- **Replace:** Fields with a single canonical value (job title, company name)

---

### 6. Notes Merging (AI-Assisted)

**The Problem:** Raw transcripts are messy. Existing notes + new content need intelligent deduplication.

**Solution:** Second AI pass specifically for note organization.

**Merge Prompt Pattern:**
```
You are a note-merging assistant. Combine existing notes with new information:

## Rules
1. Preserve ALL specific details (names, dates, numbers, companies)
2. Deduplicate intelligently - keep each fact only once
3. Prefer newer info for updates (Series A → Closed Series A)
4. Use clear bullet format (• prefix)
5. Remove verbal filler (um, uh, like, so yeah)
6. Don't add information - only what was stated

## Output
{
  "mergedNotes": "• Fact one\n• Fact two\n• Fact three",
  "changeSummary": "Added 3 new facts, updated company stage"
}
```

---

### 7. Conflict Detection

**The Problem:** Extracted data might conflict with existing data.

**Solution:** Explicit conflict detection with user resolution.

```typescript
function detectConflicts(): FieldConflict[] {
  const conflicts = [];

  // Case-insensitive comparison
  if (
    existingContact?.title &&
    extractedFields.title &&
    existingContact.title.toLowerCase() !== extractedFields.title.toLowerCase()
  ) {
    conflicts.push({
      field: "title",
      existingValue: existingContact.title,
      newValue: extractedFields.title,
    });
  }

  // Same for company, etc.

  return conflicts;
}
```

**Resolution UI:** Show modal with side-by-side comparison, let user choose which to keep.

---

## API Structure

### Extraction Endpoint

```typescript
// POST /api/extraction/extract
Request: {
  transcript: string;          // Raw input text (max 4000 chars)
  existingContext?: {          // What we already know
    name?: string;
    title?: string;
    company?: string;
  };
}

Response: {
  insights: Array<{
    capturedText: string;      // 3-10 word summary
    category: string;          // Classification
    [field]: string | null;    // Extracted structured fields
  }>;
}
```

### Notes Refinement Endpoint

```typescript
// POST /api/extraction/refine-notes
Request: {
  existingNotes?: string;      // Previously saved notes
  newContent: string;          // New raw input
}

Response: {
  refinedNotes: string;        // Merged, deduplicated bullet points
  changeSummary: string;       // What changed
}
```

---

## Key Gotchas

### 1. OpenAI Structured Outputs
Optional fields MUST use `.nullable().optional()` not just `.optional()`:
```typescript
// WRONG
z.string().optional()

// CORRECT
z.string().nullable().optional()
```

### 2. Transcript Length Limits
Sanitize before sending to API:
```typescript
const sanitizedTranscript = transcript.slice(0, 4000);
```

### 3. Browser Speech Support
Check before enabling voice:
```typescript
if (!browserSupportsSpeechRecognition) {
  return <TextOnlyFallback />;
}
```

### 4. Dev Mode Hot Reload
Speech recognition state persists across HMR. Handle in useEffect:
```typescript
useEffect(() => {
  // Restore listening state after hot reload
  if (persistedListeningState && !listening) {
    SpeechRecognition.startListening({ continuous: true });
  }
}, []);
```

### 5. Empty Extractions
AI might return empty insights array. Handle gracefully:
```typescript
if (result.insights.length === 0) {
  // Don't show error - just no insights extracted
  return;
}
```

---

## Visual Feedback Pattern

Real-time extraction works best with visual feedback showing what's being captured:

```typescript
// Bubble component for each extracted insight
<motion.div
  initial={{ scale: 0.6, opacity: 0, y: 10 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  transition={{
    type: "spring",
    stiffness: 400,
    damping: 25,
    delay: index * 0.08,  // Stagger animation
  }}
>
  <span className={categoryColorClass}>
    {insight.capturedText}
  </span>
</motion.div>
```

This gives users immediate feedback that their voice/text is being understood and processed.

---

## Adapting This Pattern

**To use this pattern in a new project:**

1. **Define your schema** - What structured fields do you need to extract?
2. **Define categories** - How will insights be classified?
3. **Write system prompt** - Be explicit about rules and provide examples
4. **Implement pause detection** - Don't call API on every keystroke
5. **Decide append vs replace** - Which fields accumulate, which overwrite?
6. **Add visual feedback** - Show users what's being captured in real-time
7. **Handle conflicts** - What if extracted data conflicts with existing?

**For your persona tool specifically:**
- Schema: Persona attributes (demographics, motivations, pain points, behaviors)
- Categories: Maybe "background", "goals", "challenges", "preferences"
- Accumulation: Most fields likely append (multiple pain points, goals)
- Conflict: Less likely since adding new context, not updating existing

---

## Dependencies

```json
{
  "react-speech-recognition": "^3.10.0",  // Voice capture
  "zod": "^3.23.0",                        // Schema validation
  "openai": "^4.x",                        // Or Vercel AI SDK
  "framer-motion": "^11.x"                 // Visual feedback animations
}
```

---

## Summary

The pattern enables **freeform voice or text input** to be transformed into **structured, validated data** through:

1. **Smart triggering** - Pause detection + debouncing prevents API spam
2. **Structured extraction** - Zod schemas ensure consistent output shape
3. **Progressive accumulation** - Multiple extractions build complete picture
4. **AI-assisted cleanup** - Notes get deduplicated and organized
5. **Conflict resolution** - User decides when data conflicts
6. **Visual feedback** - Bubbles/chips show real-time extraction progress

The key insight: **Don't make users fill forms. Let them talk, then extract structure from their natural language.**
