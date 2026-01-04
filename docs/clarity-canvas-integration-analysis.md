# Clarity Canvas Integration Analysis

## Executive Summary

**Reuse Potential: ~60%** of Clarity Canvas requirements can be built on existing Better Connections infrastructure.

| Requirement | Existing Coverage | Gap Size |
|-------------|-------------------|----------|
| Voice/Text Ingestion | 90% | Small |
| Multi-Field Extraction | 70% | Medium |
| Structured Question Responses | 10% | Large |
| Profile Schema | 40% | Medium |
| Additive Merging | 75% | Small |
| Confidence Tracking | 0% | Large |
| Score Calculation | 80% | Small |
| Source Attribution | 30% | Medium |

---

## Question 1: Schema Mapping

### Current Schema (Better Connections Contact)

```
Contact (Flat Structure - ~20 fields)
├── Identity: firstName, lastName
├── Contact: primaryEmail, secondaryEmail, primaryPhone, secondaryPhone
├── Professional: title, company, linkedinUrl, websiteUrl
├── Location: streetAddress, city, state, zipCode, country, location
├── Relationship: howWeMet, relationshipStrength, lastContactDate, relationshipHistory
├── Context: whyNow, expertise, interests, notes
├── Meta: enrichmentScore, source, createdAt, updatedAt, lastEnrichedAt
└── Relations: tags[], mentions[], relationships[]
```

### Your Requirement (Hierarchical Profile - 6 sections, ~60 fields)

```
Profile (Hierarchical)
├── Section 1: [~10 subsections, ~10 fields]
├── Section 2: [~10 subsections, ~10 fields]
├── ...
└── Section 6: [~10 subsections, ~10 fields]

Each Field:
├── summary (short display)
├── fullContext (complete context)
├── score (0-100)
├── confidence (0-1)
├── flaggedForValidation (boolean)
├── sources[] (provenance)
├── insights[] (AI-extracted)
└── lastUpdated (timestamp)
```

### Comparison

| Aspect | Current | Clarity Canvas | Gap |
|--------|---------|----------------|-----|
| Structure | Flat | Hierarchical | Need JSON field or separate tables |
| Field count | ~20 | ~60 | 3x expansion |
| Per-field metadata | None | 8 properties | New concept |
| Scoring | Contact-level (1 score) | Field-level (60 scores) | Granular scoring |
| Provenance | `source` enum | `sources[]` array | Multi-source tracking |

### Recommendation: **Mapping Layer + New Schema**

Don't try to force the Contact model into Clarity Canvas. Instead:

1. **Create new Prisma models** for Profile hierarchy
2. **Reuse extraction infrastructure** (voice capture, GPT extraction, pause detection)
3. **Adapt scoring logic** to field-level granularity

**Proposed Schema:**

```prisma
model ClarityProfile {
  id          String   @id @default(uuid())
  userId      String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sections    ProfileSection[]
}

model ProfileSection {
  id          String   @id @default(uuid())
  profileId   String
  key         String   // e.g., "demographics", "motivations"
  label       String
  order       Int

  subsections ProfileSubsection[]
  profile     ClarityProfile @relation(...)
}

model ProfileSubsection {
  id          String   @id @default(uuid())
  sectionId   String
  key         String   // e.g., "age_range", "income_level"
  label       String
  order       Int

  fields      ProfileField[]
  section     ProfileSection @relation(...)
}

model ProfileField {
  id                   String   @id @default(uuid())
  subsectionId         String
  key                  String   // e.g., "primary_age"
  label                String

  // Core content
  summary              String?  // Short display version
  fullContext          String?  @db.Text  // Complete captured context

  // Scoring
  score                Int      @default(0)  // 0-100 completeness
  confidence           Float    @default(0)  // 0-1 user-stated
  flaggedForValidation Boolean  @default(false)

  // AI insights
  insights             Json?    // Array of extracted key points

  // Metadata
  lastUpdated          DateTime @updatedAt

  sources              FieldSource[]
  subsection           ProfileSubsection @relation(...)
}

model FieldSource {
  id           String   @id @default(uuid())
  fieldId      String
  type         SourceType  // VOICE, TEXT, QUESTION, IMPORT
  rawContent   String   @db.Text  // Original input
  extractedAt  DateTime @default(now())
  questionId   String?  // If from structured question

  field        ProfileField @relation(...)
}

enum SourceType {
  VOICE
  TEXT
  QUESTION
  IMPORT
}
```

---

## Question 2: Ingestion Pipeline

### Current Flow (Better Connections)

```
Voice (Web Speech API)
    ↓
react-speech-recognition
    ↓
Pause Detection (1s pause + 500ms debounce)
    ↓
POST /api/enrichment/extract
    ├── Input: transcript (max 4000 chars) + contactContext
    ├── GPT-4o-mini with Zod schema
    └── Output: { insights: EnrichmentInsight[] }
    ↓
Accumulate extracted fields
    ↓
POST /api/enrichment/refine-notes (merge with existing)
    ↓
PUT /api/contacts/[id] (save to database)
```

### What Can Be Reused Directly

| Component | File | Reuse Level |
|-----------|------|-------------|
| Voice capture hook | `useSpeechRecognition` from react-speech-recognition | **100%** |
| Pause detection | `src/app/(dashboard)/enrichment/session/page.tsx:356-385` | **100%** |
| Debouncing logic | Same file, `PAUSE_THRESHOLD` + `DEBOUNCE_DELAY` constants | **100%** |
| API call pattern | Same file, `extractInsightsWithAI` function | **90%** (adapt endpoint) |
| Notes merging | `src/lib/openai.ts:mergeNotesWithAI()` | **80%** (adapt schema) |
| GPT structured outputs | `generateObject` with Zod | **100%** |

### What Needs Adaptation

| Component | Current | Clarity Canvas | Change Required |
|-----------|---------|----------------|-----------------|
| Extraction schema | `enrichmentInsightSchema` (8 fields) | Profile field schema (~60 fields) | New Zod schema |
| System prompt | CRM-focused extraction | Profile-focused extraction | New prompt |
| Field accumulation | Contact-level arrays | Field-level with sources | New accumulator |
| Output routing | Single contact update | Multi-field routing | Field mapper |

### Recommended Approach

**Create parallel extraction pipeline, reusing core utilities:**

```typescript
// NEW: src/lib/clarity/extraction.ts

import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';

// Reuse: Zod schema pattern
export const clarityExtractionSchema = z.object({
  chunks: z.array(z.object({
    content: z.string(),
    targetSection: z.string(),
    targetSubsection: z.string(),
    targetField: z.string(),
    summary: z.string().max(100),
    confidence: z.number().min(0).max(1),
    insights: z.array(z.string()),
  })),
});

// Reuse: generateObject pattern
export async function extractProfileChunks(
  transcript: string,
  profileSchema: ProfileSchemaDefinition,
  existingContext?: Record<string, string>
): Promise<ExtractionResult> {
  const result = await generateObject({
    model: gpt4oMini,
    system: CLARITY_EXTRACTION_PROMPT,  // NEW prompt
    prompt: buildExtractionPrompt(transcript, profileSchema, existingContext),
    schema: clarityExtractionSchema,
  });

  return result.object;
}
```

**Extraction flow diagram:**

```
                      Clarity Canvas Flow
                      ───────────────────

Voice/Text Input
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  REUSE: Pause Detection + Debouncing                         │
│  (Copy from enrichment/session/page.tsx:356-385)             │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  NEW: POST /api/clarity/extract                              │
│  ├── Input: transcript + profileSchema + existingContext     │
│  ├── GPT-4o-mini with clarityExtractionSchema                │
│  └── Output: { chunks: ProfileChunk[] }                      │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  NEW: Field Router                                           │
│  ├── Map each chunk to target field                          │
│  ├── Create FieldSource record                               │
│  ├── Merge content with existing (REUSE: merge logic)        │
│  └── Update field score                                      │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  ADAPT: Score Calculation                                    │
│  (Extend from lib/enrichment.ts)                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Question 3: Field Merging

### Current Merging Logic

**Location:** `src/lib/openai.ts:223-307`

**Pattern:**
```typescript
// Existing notes + new content → merged notes
async function mergeNotesWithAI(
  existingNotes: string,
  newContent: string
): Promise<{ mergedNotes: string; changeSummary: string }> {
  // GPT-4o-mini deduplicates, organizes, preserves specifics
}
```

**Rules (from NOTES_MERGE_SYSTEM_PROMPT):**
1. Preserve ALL specific details (names, dates, numbers)
2. Deduplicate intelligently
3. Prefer newer info for updates
4. Use bullet format
5. Remove filler words
6. Don't add information not stated

### What You Need (Additive Merging with Source Attribution)

```typescript
// NEW requirement:
interface FieldMergeResult {
  summary: string;        // Short version
  fullContext: string;    // Complete merged context
  sources: FieldSource[]; // Provenance tracking
  conflicts: Conflict[];  // For user resolution
  score: number;          // Recalculated completeness
}
```

### Gap Analysis

| Feature | Current | Clarity Canvas | Exists? |
|---------|---------|----------------|---------|
| Text merging | Yes (notes) | Yes (fullContext) | **Yes** |
| Deduplication | Yes (AI-powered) | Yes | **Yes** |
| Source tracking | No | Yes (sources[]) | **No** |
| Conflict detection | Yes (VCF import) | Yes | **Partial** |
| Summary generation | No | Yes (auto-generate) | **No** |

### Recommended Implementation

**Extend existing merge function:**

```typescript
// NEW: src/lib/clarity/merge.ts

import { mergeNotesWithAI } from '@/lib/openai';

interface FieldMergeInput {
  existingField: ProfileField | null;
  newContent: string;
  sourceType: SourceType;
  questionId?: string;
}

export async function mergeFieldContent(
  input: FieldMergeInput
): Promise<FieldMergeResult> {
  const { existingField, newContent, sourceType, questionId } = input;

  // Step 1: Merge content (REUSE existing logic)
  let mergedFullContext: string;
  let changeSummary: string;

  if (existingField?.fullContext) {
    const result = await mergeNotesWithAI(
      existingField.fullContext,
      newContent
    );
    mergedFullContext = result.mergedNotes;
    changeSummary = result.changeSummary;
  } else {
    mergedFullContext = newContent;
    changeSummary = 'Initial content added';
  }

  // Step 2: Generate summary (NEW)
  const summary = await generateSummary(mergedFullContext);

  // Step 3: Create source record (NEW)
  const newSource: FieldSource = {
    id: generateId(),
    type: sourceType,
    rawContent: newContent,
    extractedAt: new Date(),
    questionId,
  };

  // Step 4: Detect conflicts (ADAPT from VCF import)
  const conflicts = detectContentConflicts(
    existingField?.fullContext,
    newContent
  );

  // Step 5: Recalculate score (NEW)
  const score = calculateFieldScore(mergedFullContext, existingField?.confidence);

  return {
    summary,
    fullContext: mergedFullContext,
    sources: [...(existingField?.sources || []), newSource],
    conflicts,
    score,
  };
}
```

**Conflict detection (adapt from VCF):**

```typescript
// Current: src/components/import/ImportMergeReview.tsx
// Concept: Compare field values, flag differences

function detectContentConflicts(
  existing: string | null,
  incoming: string
): Conflict[] {
  if (!existing) return [];

  // Use AI to identify contradictions
  // Example: "age 25-34" vs "age 45-54" = conflict
  // Example: "likes hiking" + "enjoys outdoors" = merge, no conflict

  return analyzeContradictions(existing, incoming);
}
```

---

## Question 4: Confidence Tracking

### Current State

**No existing confidence tracking infrastructure.**

The closest concepts:
- `matchConfidence: Float` on ContactMention (0-1 for fuzzy matching)
- `enrichmentScore: Int` (overall completeness, not confidence)

### What You Need

```typescript
interface ConfidenceTracking {
  // Per answer
  answerConfidence: number;  // 0-1, user-stated

  // Per field (aggregated)
  fieldConfidence: number;   // Weighted average of source confidences

  // Validation trigger
  flaggedForValidation: boolean;  // Low confidence = needs review
}
```

### Recommended Implementation

**New: Confidence system (build from scratch)**

```typescript
// NEW: src/lib/clarity/confidence.ts

const VALIDATION_THRESHOLD = 0.5;  // Flag if below this

interface ConfidenceWeights {
  voice: 0.7,      // Voice input slightly less trusted
  text: 0.8,       // Text input more deliberate
  question: 1.0,   // Direct answers most trusted
  import: 0.6,     // External data least trusted
}

export function calculateFieldConfidence(
  sources: FieldSource[],
  userConfidences: Map<string, number>  // sourceId → confidence
): number {
  if (sources.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const source of sources) {
    const userConfidence = userConfidences.get(source.id) ?? 1.0;
    const typeWeight = ConfidenceWeights[source.type];
    const weight = typeWeight * userConfidence;

    weightedSum += weight;
    totalWeight += typeWeight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function shouldFlagForValidation(
  fieldConfidence: number,
  hasConflicts: boolean
): boolean {
  return fieldConfidence < VALIDATION_THRESHOLD || hasConflicts;
}
```

**Schema addition:**

```prisma
model ProfileField {
  // ... existing fields
  confidence           Float    @default(0)  // 0-1 aggregated
  flaggedForValidation Boolean  @default(false)
}

model FieldSource {
  // ... existing fields
  userConfidence       Float    @default(1.0)  // 0-1 user-stated
}
```

**UI integration:**

```typescript
// Question response component
interface QuestionResponse {
  answerId: string;
  answerValue: string | number | string[];  // Depends on question type
  confidence: number;  // 0-1 slider value
  additionalContext?: string;  // Voice/text follow-up
}

// After user answers + sets confidence
async function submitQuestionResponse(response: QuestionResponse) {
  const result = await mergeFieldContent({
    existingField: currentField,
    newContent: formatAnswerAsContent(response),
    sourceType: 'QUESTION',
    questionId: response.questionId,
  });

  // Store user confidence on source
  await updateFieldSource(result.newSource.id, {
    userConfidence: response.confidence,
  });

  // Recalculate field confidence
  const fieldConfidence = calculateFieldConfidence(
    result.sources,
    new Map([[result.newSource.id, response.confidence]])
  );

  // Update field
  await updateProfileField(fieldId, {
    ...result,
    confidence: fieldConfidence,
    flaggedForValidation: shouldFlagForValidation(fieldConfidence, result.conflicts.length > 0),
  });
}
```

---

## Question 5: Score Calculation

### Current Implementation

**File:** `src/lib/enrichment.ts:30-59`

```typescript
export function calculateEnrichmentScore(
  contact: EnrichmentScoreInput,
  tagCount: number = 0
): number {
  let score = 0;

  // Binary scoring: field exists or doesn't
  if (contact.firstName) score += 7;
  if (contact.lastName) score += 3;
  if (contact.primaryEmail) score += 8;
  // ... etc
  if (contact.whyNow) score += 20;  // Highest weight

  return Math.min(score, 100);
}
```

**Characteristics:**
- Binary (exists/doesn't exist)
- Fixed weights per field
- Single score per contact
- Max 100

### What You Need

```typescript
// Per-field scoring
interface FieldScore {
  completeness: number;    // 0-100 based on content richness
  confidence: number;      // 0-1 user-stated
  weightedScore: number;   // completeness * confidence
}

// Section/profile scoring
interface ProfileScore {
  sectionScores: Record<string, number>;
  overallScore: number;
  flaggedFields: string[];
}
```

### Recommended Extension

```typescript
// NEW: src/lib/clarity/scoring.ts

// Field-level scoring (content richness)
export function calculateFieldCompleteness(
  field: ProfileField,
  fieldDefinition: FieldDefinition
): number {
  if (!field.fullContext) return 0;

  let score = 0;

  // Length-based (up to 40 points)
  const charCount = field.fullContext.length;
  if (charCount > 0) score += 10;
  if (charCount > 50) score += 10;
  if (charCount > 150) score += 10;
  if (charCount > 300) score += 10;

  // Source diversity (up to 30 points)
  const sourceCount = field.sources.length;
  if (sourceCount > 0) score += 10;
  if (sourceCount > 1) score += 10;
  if (sourceCount > 2) score += 10;

  // Has insights (up to 20 points)
  if (field.insights && field.insights.length > 0) {
    score += Math.min(field.insights.length * 5, 20);
  }

  // Summary exists (10 points)
  if (field.summary) score += 10;

  return Math.min(score, 100);
}

// Confidence-weighted field score
export function calculateWeightedFieldScore(field: ProfileField): number {
  const completeness = calculateFieldCompleteness(field);
  const confidence = field.confidence || 1.0;
  return Math.round(completeness * confidence);
}

// Section score (average of fields)
export function calculateSectionScore(
  fields: ProfileField[],
  weights?: Record<string, number>  // Optional field weights
): number {
  if (fields.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const field of fields) {
    const weight = weights?.[field.key] ?? 1;
    const fieldScore = calculateWeightedFieldScore(field);
    weightedSum += fieldScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// Profile-level aggregation
export function calculateProfileScore(profile: ClarityProfile): ProfileScore {
  const sectionScores: Record<string, number> = {};
  const flaggedFields: string[] = [];
  let totalSections = 0;
  let sectionSum = 0;

  for (const section of profile.sections) {
    const allFields = section.subsections.flatMap(s => s.fields);
    sectionScores[section.key] = calculateSectionScore(allFields);
    sectionSum += sectionScores[section.key];
    totalSections++;

    // Collect flagged fields
    for (const field of allFields) {
      if (field.flaggedForValidation) {
        flaggedFields.push(`${section.key}.${field.key}`);
      }
    }
  }

  return {
    sectionScores,
    overallScore: totalSections > 0 ? Math.round(sectionSum / totalSections) : 0,
    flaggedFields,
  };
}
```

---

## Question 6: Source Attribution (Provenance)

### Current State

**Minimal provenance tracking:**

```prisma
// Contact level only
source: ContactSource  // MANUAL, CSV, GOOGLE, etc.
```

No per-field provenance. No audit trail of changes.

### What You Need

```typescript
interface FieldSource {
  id: string;
  type: 'VOICE' | 'TEXT' | 'QUESTION' | 'IMPORT';
  rawContent: string;       // Original input
  extractedAt: Date;
  questionId?: string;      // If from structured question
  userConfidence?: number;  // User-stated confidence
}
```

### Recommended Implementation

**New Prisma model (already proposed above):**

```prisma
model FieldSource {
  id             String     @id @default(uuid())
  fieldId        String
  type           SourceType
  rawContent     String     @db.Text
  extractedAt    DateTime   @default(now())
  questionId     String?
  userConfidence Float      @default(1.0)

  field          ProfileField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  question       Question?    @relation(fields: [questionId], references: [id])
}

enum SourceType {
  VOICE
  TEXT
  QUESTION
  IMPORT
}
```

**Usage pattern:**

```typescript
// When voice/text is extracted
async function recordVoiceSource(
  fieldId: string,
  transcript: string
): Promise<FieldSource> {
  return prisma.fieldSource.create({
    data: {
      fieldId,
      type: 'VOICE',
      rawContent: transcript,
      userConfidence: 0.7,  // Default for voice
    },
  });
}

// When question is answered
async function recordQuestionSource(
  fieldId: string,
  questionId: string,
  answer: string,
  userConfidence: number
): Promise<FieldSource> {
  return prisma.fieldSource.create({
    data: {
      fieldId,
      type: 'QUESTION',
      rawContent: answer,
      questionId,
      userConfidence,
    },
  });
}

// Display provenance
function renderFieldSources(sources: FieldSource[]) {
  return sources.map(source => (
    <SourceBadge
      key={source.id}
      type={source.type}
      date={source.extractedAt}
      preview={truncate(source.rawContent, 50)}
      confidence={source.userConfidence}
    />
  ));
}
```

---

## Complete Gap Analysis

### What Exists (Reuse Directly)

| Component | Location | Reuse |
|-----------|----------|-------|
| Voice capture | `react-speech-recognition` | 100% |
| Pause detection | `enrichment/session/page.tsx:356-385` | 100% |
| Debouncing | Same file, constants + effect | 100% |
| GPT structured outputs | `generateObject` from Vercel AI SDK | 100% |
| Notes merging | `lib/openai.ts:mergeNotesWithAI` | 80% |
| Zod schema patterns | `lib/schemas/*.ts` | 90% |
| Bubble visualization | `components/enrichment/EnrichmentBubbles.tsx` | 70% |

### What Needs Adaptation

| Component | Current | Adaptation Required |
|-----------|---------|---------------------|
| Extraction schema | 8 CRM fields | New schema for ~60 profile fields |
| System prompt | CRM-focused | Profile-focused prompts |
| Field accumulation | Contact-level | Field-level with routing |
| Score calculation | Binary per-field | Richness + confidence weighted |
| Conflict detection | VCF import only | General field conflicts |

### What Must Be Built New

| Component | Complexity | Estimate |
|-----------|------------|----------|
| Hierarchical profile schema (Prisma) | Medium | 4-8 hours |
| FieldSource model + provenance tracking | Low | 2-4 hours |
| Confidence tracking system | Medium | 4-6 hours |
| Field router (chunk → field mapping) | Medium | 4-6 hours |
| Structured question handler | High | 8-12 hours |
| Profile extraction prompt engineering | Medium | 4-6 hours |
| Section/field scoring | Low | 2-4 hours |
| Validation flag system | Low | 2-4 hours |

### Complexity Estimates Summary

| Category | Items | Total Hours |
|----------|-------|-------------|
| Direct Reuse | 7 components | 0 (free) |
| Adaptation | 5 components | 12-20 hours |
| New Development | 8 components | 30-50 hours |
| **Total** | | **42-70 hours** |

---

## Recommended Integration Approach

### Option A: Extend Existing (Not Recommended)

Try to add Clarity Canvas fields to the Contact model.

**Pros:**
- Single codebase
- Shared UI patterns

**Cons:**
- Contact model becomes bloated
- Hierarchical structure forced into flat model
- Provenance tracking awkward
- Scoring systems conflict

### Option B: Parallel Implementation (Recommended)

Build Clarity Canvas as a separate feature area that reuses core utilities.

**Pros:**
- Clean separation of concerns
- Purpose-built schema
- Can evolve independently
- Easier to test

**Cons:**
- Some code duplication (mitigated by shared utils)
- Two feature areas to maintain

### Recommended Structure

```
src/
├── lib/
│   ├── openai.ts                    # REUSE: GPT helpers
│   ├── enrichment.ts                # REUSE: Score concepts
│   ├── schemas/
│   │   ├── enrichmentInsight.ts     # EXISTING
│   │   └── clarityProfile.ts        # NEW: Profile extraction schema
│   └── clarity/                     # NEW: Clarity-specific logic
│       ├── extraction.ts            # Profile extraction
│       ├── merge.ts                 # Field merging with provenance
│       ├── confidence.ts            # Confidence calculations
│       ├── scoring.ts               # Field/section/profile scoring
│       └── router.ts                # Chunk → field mapping
├── app/
│   ├── api/
│   │   └── clarity/                 # NEW: Clarity API routes
│   │       ├── extract/route.ts
│   │       ├── merge-field/route.ts
│   │       └── submit-answer/route.ts
│   └── (dashboard)/
│       └── clarity/                 # NEW: Clarity UI
│           ├── page.tsx             # Profile overview
│           ├── session/page.tsx     # Voice/text input (REUSE patterns)
│           └── questionnaire/page.tsx
└── components/
    └── clarity/                     # NEW: Clarity components
        ├── VoiceInput.tsx           # ADAPT from enrichment
        ├── ProfileField.tsx
        ├── SourceBadge.tsx
        └── SectionProgress.tsx
```

---

## Next Steps

1. **Finalize profile schema** - Define all 6 sections, subsections, and fields
2. **Create Prisma models** - ClarityProfile, ProfileSection, ProfileSubsection, ProfileField, FieldSource
3. **Build extraction prompt** - Adapt from ENRICHMENT_EXTRACTION_SYSTEM_PROMPT
4. **Implement field router** - Map extraction chunks to specific fields
5. **Port voice input** - Copy/adapt from enrichment session page
6. **Build confidence UI** - Slider component for user confidence
7. **Implement question handler** - Structured response → field update
8. **Build scoring system** - Field → section → profile aggregation
9. **Add provenance UI** - Display sources on each field

---

## Summary

**60% reuse is achievable** by:
1. Copying voice capture + pause detection patterns
2. Reusing GPT structured output infrastructure
3. Adapting notes merging for field-level content
4. Extending scoring concepts to field granularity

**40% new development** required for:
1. Hierarchical profile schema
2. Per-field provenance tracking
3. Confidence tracking system
4. Structured question handling
5. Field routing from extraction chunks

**Recommended approach:** Parallel implementation with shared utilities, not extension of existing Contact model.
