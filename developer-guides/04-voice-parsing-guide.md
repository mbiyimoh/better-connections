# Voice Parsing & Speech Recognition - Developer Guide

**Last Updated:** 2026-01-15
**Component:** Web Speech API Integration & AI Extraction

> **Note:** For a comprehensive deep-dive, see `docs/voice-text-extraction-pattern-summary.md`

---

## 1. Architecture Overview

Voice parsing in Better Connections converts spoken input into structured contact data through a pipeline of speech recognition, pause detection, and AI extraction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOICE PARSING PIPELINE                               │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Web Speech  │───>│   Pause     │───>│     AI      │───>│  Structured │  │
│  │    API      │    │  Detection  │    │ Extraction  │    │    Data     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
│  Browser-native     Timer-based       GPT-4o-mini         Zod-validated    │
│  transcription      1.5s threshold    generateObject()    contact fields   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Dependencies

| Library | Purpose |
|---------|---------|
| `react-speech-recognition` | Web Speech API React wrapper |
| `ai` (Vercel AI SDK) | GPT-4o-mini structured outputs |
| `zod` | Schema validation |

---

## 3. Where Voice Parsing Is Used

| Location | Purpose |
|----------|---------|
| `/enrichment/session` | Contact enrichment voice input |

---

## 4. Quick Implementation Reference

### Speech Recognition Setup

```typescript
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const {
  transcript,                          // Live transcription text
  listening,                           // Boolean: mic active
  resetTranscript,                     // Clear transcript
  browserSupportsSpeechRecognition     // Feature detection
} = useSpeechRecognition();

// Start continuous listening
SpeechRecognition.startListening({ continuous: true });

// Stop listening
SpeechRecognition.stopListening();
```

### Pause Detection Pattern

```typescript
const PAUSE_THRESHOLD = 1000;   // 1 second silence = pause
const DEBOUNCE_DELAY = 500;     // Additional delay
const MIN_CHARS = 10;           // Skip tiny fragments

useEffect(() => {
  if (!listening) return;

  // Clear existing timer
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // Only process NEW text since last API call
  const newText = transcript.slice(lastProcessedLength).trim();
  if (newText.length < MIN_CHARS) return;

  // Set up pause detection
  debounceTimerRef.current = setTimeout(() => {
    const now = Date.now();
    if (now - lastApiCallRef.current < DEBOUNCE_DELAY) return;

    lastApiCallRef.current = now;
    setLastProcessedLength(transcript.length);
    extractInsightsWithAI(newText);
  }, PAUSE_THRESHOLD + DEBOUNCE_DELAY);

  return () => clearTimeout(debounceTimerRef.current);
}, [transcript, listening]);
```

### AI Extraction Schema

```typescript
// src/lib/schemas/enrichmentInsight.ts
export const enrichmentInsightSchema = z.object({
  capturedText: z.string()
    .describe("Key phrase extracted - concise, 3-10 words"),

  category: z.enum(["relationship", "opportunity", "expertise", "interest"]),

  // IMPORTANT: Use .nullable().optional() for OpenAI strict mode
  howWeMet: z.string().nullable().optional(),
  whyNow: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  expertise: z.string().nullable().optional(),
  interests: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
```

### Extraction API Call

```typescript
const result = await generateObject({
  model: gpt4oMini(),
  system: ENRICHMENT_EXTRACTION_SYSTEM_PROMPT,
  prompt: `Extract insights from: "${transcript}"`,
  schema: enrichmentExtractionResponseSchema,
});
```

---

## 5. Critical Gotchas

### Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | Full | Best experience |
| Safari | Partial | Requires permission each time |
| Firefox | None | Web Speech API not supported |
| Edge | Partial | Works but less reliable |

```typescript
if (!browserSupportsSpeechRecognition) {
  return <TextInputFallback />;
}
```

### HTTPS Requirement

- **Production:** HTTPS required
- **Development:** `localhost` works without HTTPS

### OpenAI Structured Outputs

```typescript
// WRONG - causes validation errors
z.string().optional()

// CORRECT - required for OpenAI strict mode
z.string().nullable().optional()
```

### Transcript Management

```typescript
// Save transcript chunks before stopping mic
if (transcript.trim()) {
  setSavedTranscripts((prev) => [...prev, transcript.trim()]);
}
SpeechRecognition.stopListening();

// Combine at save time
const allTranscripts = savedTranscripts.join(" ");
```

### Hot Reload State Persistence

```typescript
// Speech recognition state can persist across HMR
// Store in window for recovery
if (typeof window !== "undefined") {
  window.__SPEECH_LISTENING__ = listening;
}
```

---

## 6. System Prompt for Extraction

Key sections in `ENRICHMENT_EXTRACTION_SYSTEM_PROMPT`:

1. **Role Definition** - CRM insight extraction assistant
2. **Categories** - relationship, opportunity, expertise, interest
3. **Field Priority** - whyNow (20 pts), howWeMet (15 pts), etc.
4. **Extraction Rules** - Multiple insights, concise text, null for missing
5. **Examples** - Input/output pairs for consistent behavior

---

## 7. Field Accumulation Strategy

```typescript
// Array fields: APPEND new values
if (insight.howWeMet) {
  updated.howWeMet = [...updated.howWeMet, insight.howWeMet];
}

// Singleton fields: KEEP LATEST non-null
if (insight.title) {
  updated.title = insight.title;
}
```

| Type | Fields | Strategy |
|------|--------|----------|
| Array | howWeMet, whyNow, expertise, interests, notes | Append all |
| Singleton | title, company | Keep latest |

---

## 8. Testing Voice Input

### Manual Testing

1. Start dev server: `PORT=3333 npm run dev`
2. Navigate to `/enrichment/session?contact=[ID]`
3. Click voice button to enable mic
4. Speak test phrases
5. Observe:
   - Transcript appearing in real-time
   - Bubbles appearing after 1.5s pause
   - Multiple insights from single phrase

### Test Phrases

```
"Met John at TechCrunch, he's raising Series A for an AI company"
→ Expected: 2+ bubbles (relationship, opportunity)

"She's a marketing expert, loves hiking and wine"
→ Expected: 2+ bubbles (expertise, interest)

"um yeah so that's about it"
→ Expected: Empty insights (no actionable data)
```

---

## 9. Quick Reference

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| PAUSE_THRESHOLD | 1000ms | Silence before extraction |
| DEBOUNCE_DELAY | 500ms | API call spacing |
| MIN_CHARS | 10 | Minimum text for extraction |
| MAX_TRANSCRIPT | 4000 chars | API input limit |

### API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/enrichment/extract` | POST | AI insight extraction |
| `/api/enrichment/refine-notes` | POST | Merge/dedupe notes |
| `/api/enrichment/extract-mentions` | POST | Find mentioned people |

### Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/enrichment/session/page.tsx` | Main voice session |
| `src/lib/schemas/enrichmentInsight.ts` | Zod schemas |
| `src/lib/openai.ts` | System prompts, GPT client |
| `src/app/api/enrichment/extract/route.ts` | Extraction API |

---

## 10. Related Guides

- [Voice Enrichment Guide](./01-voice-enrichment-guide.md) - Full enrichment session flow
- [Gamification Guide](./03-gamification-elements-guide.md) - Post-enrichment celebration
- `docs/voice-text-extraction-pattern-summary.md` - Comprehensive pattern docs
