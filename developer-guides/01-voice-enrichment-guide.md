# Voice Enrichment System - Developer Guide

**Last Updated:** 2026-01-15
**Component:** User-Initiated Voice Contact Enrichment

---

## 1. Architecture Overview

The Voice Enrichment System enables users to quickly enrich contact profiles using voice input. It combines Web Speech API recognition with AI-powered insight extraction to convert spoken transcripts into structured contact data.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOICE ENRICHMENT SESSION                              │
│                                                                              │
│  ┌─────────────────┐    ┌────────────────┐    ┌─────────────────────────┐   │
│  │  User speaks    │───>│ Web Speech API │───>│ React State (transcript)│   │
│  │  into browser   │    │ recognition    │    │                         │   │
│  └─────────────────┘    └────────────────┘    └───────────┬─────────────┘   │
│                                                           │                  │
│                    Pause detection (1.5s silence)          │                  │
│                                                           ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  /api/enrichment/extract                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ GPT-4o-mini + ENRICHMENT_EXTRACTION_SYSTEM_PROMPT             │   │    │
│  │  │ - Extracts insights from transcript                          │   │    │
│  │  │ - Categorizes: relationship, opportunity, expertise, interest │   │    │
│  │  │ - Populates: howWeMet, whyNow, title, company, notes         │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┬────────────┘    │
│                                                           │                  │
│                                                           ▼                  │
│  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────┐      │
│  │ EnrichmentBubbles│<───│ Accumulated Fields │<───│ AI Insights     │      │
│  │ (visual feedback)│    │ extractedFields    │    │ (per pause)     │      │
│  └──────────────────┘    └────────────────────┘    └─────────────────┘      │
│                                                                              │
│                    Session Complete                                          │
│                          │                                                   │
│                          ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  /api/enrichment/refine-notes                       │    │
│  │  - Merges new content with existing notes                          │    │
│  │  - Deduplicates, organizes, formats as bullets                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                          │                                                   │
│                          ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  PUT /api/contacts/:id                              │    │
│  │  - Saves accumulated fields to contact                             │    │
│  │  - Recalculates enrichment score                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │                                                   │
│                          ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │               CompletionCelebration                                 │    │
│  │  - Score animation, rank reveal, streak badge                      │    │
│  │  - Tag suggestions from bubbles                                    │    │
│  │  - Mentioned people detection                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies

### External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `react-speech-recognition` | ^3.10.0 | Web Speech API React wrapper |
| `react-countdown-circle-timer` | ^3.2.1 | Circular countdown timer |
| `framer-motion` | ^11.15.0 | Bubble animations |
| `ai` | ^4.0.0 | Vercel AI SDK for OpenAI |

### Internal Dependencies

| File | Purpose |
|------|---------|
| `src/lib/openai.ts` | GPT-4o-mini client, system prompts |
| `src/lib/schemas/enrichmentInsight.ts` | Zod schemas for AI extraction |
| `src/lib/enrichment.ts` | Score calculation |
| `src/lib/design-system.ts` | Bubble category colors |

---

## 3. User Experience Flow

### Entry Points

1. **Enrichment Queue** (`/enrichment`) - Click contact card → Start session
2. **Contact Detail** (`/contacts/[id]`) - "Enrich Now" button
3. **Direct URL** (`/enrichment/session?contact=[id]`)

### Session Flow

```
1. PRE-SESSION
   └─> Contact info display
   └─> "Start Session" button
   └─> Optional: "Skip" to next in queue

2. ACTIVE SESSION (30 seconds default)
   └─> Timer starts
   └─> Voice recording active (click to toggle)
   └─> Live transcript display
   └─> Bubbles appear as AI extracts insights
   └─> Controls: +30 sec, Pause/Resume, Stop
   └─> Text input alternative

3. SESSION COMPLETE
   └─> Conflict resolution (if title/company differs)
   └─> Save data to contact
   └─> Refine notes with AI
   └─> Extract mentioned people

4. CELEBRATION SCREEN
   └─> Score improvement animation
   └─> Rank reveal (#3 of 47)
   └─> Streak badge
   └─> Tag suggestions from bubbles
   └─> Mentioned people section
   └─> Actions: "Enrich Next", "Back to Queue", "Continue"
```

---

## 4. File-by-File Mapping

### Page

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/(dashboard)/enrichment/session/page.tsx` | 1-1049 | Main session page |

**Key Sections:**

- **Lines 36-66:** Type definitions (Contact, EnrichmentData)
- **Lines 68-70:** Timing constants (PAUSE_THRESHOLD, DEBOUNCE_DELAY)
- **Lines 79-175:** ConflictResolutionModal component
- **Lines 177-270:** State initialization & speech recognition setup
- **Lines 278-296:** `storeExtractedFields` - accumulates AI extractions
- **Lines 299-362:** `extractInsightsWithAI` - calls API with retry
- **Lines 365-393:** Speech pause detection effect (debounced)
- **Lines 438-466:** `detectConflicts` - title/company conflict check
- **Lines 469-580:** `performSave` - saves all data to contact
- **Lines 643-669:** `handleComplete` - session completion flow
- **Lines 792-1032:** JSX render (contact info, timer, controls, bubbles)

### Components

| File | Purpose |
|------|---------|
| `src/components/enrichment/CircularTimer.tsx` | 30-second countdown with warning state |
| `src/components/enrichment/EnrichmentBubbles.tsx` | Animated bubble display |
| `src/components/enrichment/EditableBubble.tsx` | Editable bubble with category picker |
| `src/components/enrichment/completion/` | Celebration screen components |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/enrichment/extract` | POST | AI insight extraction |
| `/api/enrichment/refine-notes` | POST | Merge/dedupe notes |
| `/api/enrichment/extract-mentions` | POST | Find mentioned people |
| `/api/enrichment/completion-data` | GET | Celebration data (rank, streak) |
| `/api/enrichment/queue` | GET | Get next contacts to enrich |
| `/api/enrichment/[id]/skip` | POST | Skip a contact |

### Schemas

| File | Purpose |
|------|---------|
| `src/lib/schemas/enrichmentInsight.ts` | Zod schemas for extraction |
| `src/lib/schemas/mentionExtraction.ts` | Mention extraction schemas |

---

## 5. Connections & Integrations

### Speech Recognition

```typescript
// src/app/(dashboard)/enrichment/session/page.tsx:211-216
const {
  transcript,
  listening,
  resetTranscript,
  browserSupportsSpeechRecognition,
} = useSpeechRecognition();

// Start listening
SpeechRecognition.startListening({ continuous: true });

// Stop listening
SpeechRecognition.stopListening();
```

### AI Extraction

```typescript
// POST /api/enrichment/extract
{
  transcript: "Met John at TechCrunch, he's raising Series A",
  contactContext: {
    name: "John Smith",
    title: "CEO",
    company: "Acme Inc"
  }
}

// Response
{
  insights: [
    {
      capturedText: "Met at TechCrunch",
      category: "relationship",
      howWeMet: "TechCrunch conference"
    },
    {
      capturedText: "Raising Series A",
      category: "opportunity",
      whyNow: "Raising Series A"
    }
  ]
}
```

### Notes Merging

```typescript
// POST /api/enrichment/refine-notes
{
  existingNotes: "• Works at Acme Corp\n• Met at conference",
  newContent: "John closed his Series A from Sequoia for $5M"
}

// Response
{
  refinedNotes: "• Works at Acme Corp\n• Met at conference\n• Closed Series A at $5M from Sequoia",
  changeSummary: "Added Series A close at $5M from Sequoia"
}
```

### Completion Data

```typescript
// GET /api/enrichment/completion-data?contactId=xxx&previousScore=45
{
  ranking: { currentRank: 3, previousRank: 7, totalContacts: 47 },
  streak: { count: 5 },
  scoreDelta: 25
}
```

---

## 6. Gotchas & Pitfalls

### Speech Recognition

1. **Browser Support**
   - Chrome: Full support
   - Safari: Partial (requires permission each time)
   - Firefox: Not supported (Web Speech API)
   - Show warning and fallback to text input

2. **HMR State Persistence**
   ```typescript
   // Lines 36-40: Persist listening state across hot reloads
   let persistedListeningState = false;
   if (typeof window !== "undefined") {
     persistedListeningState = window.__SPEECH_LISTENING__ || false;
   }
   ```

3. **Transcript Accumulation**
   - Save transcript chunks before stopping mic
   - Combine `savedTranscripts` array at save time
   ```typescript
   // Line 646-648
   if (transcript.trim()) {
     setSavedTranscripts((prev) => [...prev, transcript.trim()]);
   }
   ```

### AI Extraction

1. **Pause Detection Timing**
   ```typescript
   const PAUSE_THRESHOLD = 1000; // 1 second silence
   const DEBOUNCE_DELAY = 500;   // 500ms debounce
   ```
   - API only called after 1.5s silence
   - Prevents excessive API calls during continuous speech

2. **Process Only New Text**
   ```typescript
   // Line 374: Track what's been processed
   const newText = transcript.slice(lastProcessedLength).trim();
   if (newText.length < 10) return;
   ```

3. **Retry Logic**
   ```typescript
   // Lines 305-350: 2 attempts with 1s delay
   const maxAttempts = 2;
   for (let attempt = 0; attempt < maxAttempts; attempt++) {
     try { ... }
     catch { await new Promise(r => setTimeout(r, 1000)); }
   }
   ```

### Data Accumulation

1. **Field Accumulation Pattern**
   - Text fields (howWeMet, whyNow, expertise, interests, notes): Append to arrays
   - Structured fields (title, company): Keep latest non-null value
   ```typescript
   // Lines 278-296: storeExtractedFields
   if (insight.howWeMet) updated.howWeMet = [...updated.howWeMet, insight.howWeMet];
   if (insight.title) updated.title = insight.title; // Latest wins
   ```

2. **Conflict Detection**
   - Only check title and company
   - Only if both existing and new values exist
   - Case-insensitive comparison
   ```typescript
   // Lines 438-466
   if (contact.title.toLowerCase() !== extractedFields.title.toLowerCase())
   ```

### Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Calling API on every transcript change | Use pause detection with debounce |
| Losing transcript on mic toggle | Save to `savedTranscripts` before stopping |
| Processing same text twice | Track `lastProcessedLength` |
| Overwriting existing contact data | Detect conflicts, show resolution modal |

---

## 7. Development Scenarios

### Adding a New Extractable Field

1. **Update Schema** (`src/lib/schemas/enrichmentInsight.ts`)
   ```typescript
   export const enrichmentInsightSchema = z.object({
     ...existingFields,
     newField: z.string().nullable().describe("Description").optional(),
   });
   ```

2. **Update System Prompt** (`src/lib/openai.ts`)
   ```typescript
   export const ENRICHMENT_EXTRACTION_SYSTEM_PROMPT = `
     ...
     ## Field Priority
     X. **newField** (N pts) - Description
   `;
   ```

3. **Update Accumulator** (session page)
   ```typescript
   const [extractedFields, setExtractedFields] = useState<{
     ...existingFields,
     newField: string[];
   }>();
   ```

4. **Update Save Logic** (performSave function)
   ```typescript
   if (extractedFields.newField.length > 0) {
     const existing = enrichmentData.newField || "";
     const newContent = extractedFields.newField.join(". ");
     updateData.newField = existing ? `${existing}. ${newContent}` : newContent;
   }
   ```

### Debugging Speech Issues

1. **Check browser support**
   ```typescript
   console.log("Speech supported:", browserSupportsSpeechRecognition);
   console.log("Listening state:", listening);
   ```

2. **Log transcript changes**
   ```typescript
   useEffect(() => {
     console.log("Transcript:", transcript);
     console.log("New text length:", transcript.length - lastProcessedLength);
   }, [transcript]);
   ```

3. **Monitor API calls**
   ```typescript
   console.log("Calling extract API with:", { textLength: newText.length });
   ```

### Testing Voice Flow Manually

1. Start dev server: `PORT=3333 npm run dev`
2. Navigate to `/enrichment`
3. Click a contact card
4. Click "Start Session"
5. Click "Voice" button (needs HTTPS or localhost)
6. Speak: "Met at TechCrunch, she's raising a Series A for an AI company"
7. Wait 2 seconds for pause detection
8. Observe bubbles appearing
9. Click "Complete Session"
10. Verify celebration screen shows score increase

---

## 8. Testing Approach

### Manual Test Cases

| Test | Steps | Expected |
|------|-------|----------|
| Voice start/stop | Start session → Voice → Stop | Transcript appears, mic toggles |
| Pause extraction | Speak → Stop → Wait 2s | Bubbles appear automatically |
| Multiple insights | "Met at TechCrunch, investor in AI" | 2 bubbles (relationship, opportunity) |
| Conflict modal | Extract different title than existing | Modal shows, allows resolution |
| Text fallback | Type in textarea → Send | Bubbles appear same as voice |
| Empty session | Start → Complete with no input | Returns to queue (no save) |
| Score increase | Enrich contact with missing fields | Score increases, celebration shows |

### E2E Test Approach

```typescript
// .quick-checks/test-voice-enrichment.spec.ts
test('voice enrichment saves data', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="password"]', testPassword);
  await page.click('button[type="submit"]');

  // Navigate to enrichment
  await page.goto('/enrichment');
  await page.click('.contact-card >> nth=0');

  // Start session
  await page.click('text=Start Session');
  await expect(page.locator('.circular-timer')).toBeVisible();

  // Type input (voice not testable in Playwright)
  await page.fill('textarea', 'Met at conference, investor interested in AI');
  await page.click('button:has-text("Send")');

  // Wait for bubbles
  await expect(page.locator('.enrichment-bubble')).toHaveCount({ min: 1 });

  // Complete
  await page.click('text=Complete Session');

  // Verify celebration
  await expect(page.locator('.completion-celebration')).toBeVisible();
});
```

---

## 9. Quick Reference

### Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| PAUSE_THRESHOLD | 1000ms | session/page.tsx:68 |
| DEBOUNCE_DELAY | 500ms | session/page.tsx:69 |
| Default timer | 30 seconds | session/page.tsx:186 |
| Max timer | 90 seconds | session/page.tsx:419 |
| Min transcript | 10 chars | extract/route.ts:39 |
| Max transcript | 4000 chars | enrichmentInsight.ts:32 |

### State Management

| State | Type | Purpose |
|-------|------|---------|
| `transcript` | string | Live speech text |
| `listening` | boolean | Mic active |
| `bubbles` | EnrichmentBubble[] | Visual insights |
| `extractedFields` | object | Accumulated AI data |
| `savedTranscripts` | string[] | Saved transcript chunks |
| `lastProcessedLength` | number | Track processed text |
| `isProcessing` | boolean | API call in progress |
| `conflicts` | FieldConflict[] | Title/company conflicts |

### Commands

```bash
# Start dev server
PORT=3333 npm run dev

# Test session flow
open http://localhost:3333/enrichment/session?contact=[CONTACT_ID]

# Check voice support
# Open browser console:
# > 'webkitSpeechRecognition' in window
```

### Debugging

```typescript
// Enable verbose logging in session page
useEffect(() => {
  console.log('--- VOICE DEBUG ---');
  console.log('listening:', listening);
  console.log('transcript:', transcript);
  console.log('lastProcessedLength:', lastProcessedLength);
  console.log('bubbles:', bubbles.length);
  console.log('extractedFields:', extractedFields);
}, [transcript, listening, bubbles, extractedFields, lastProcessedLength]);
```
