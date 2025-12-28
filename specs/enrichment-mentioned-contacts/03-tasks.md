# Task Breakdown: Enrichment Mentioned Contacts

**Generated:** 2025-12-28
**Source:** specs/enrichment-mentioned-contacts/02-specification.md
**Feature Slug:** enrichment-mentioned-contacts
**Last Decompose:** 2025-12-28

---

## Overview

Transform single-contact enrichment sessions into network discovery opportunities by detecting mentions of other people in transcripts, matching them against existing contacts, and providing actionable UI for linking/creating contacts with captured context.

**Core Value:** When you talk about Sarah and mention "she knows Mike from Google," you shouldn't have to remember to update Mike's profile later.

---

## Phase 1: Data Layer (Foundation)

### Task 1.1: Update Prisma Schema with Contact Relationship Models

**Description:** Add ContactRelationship and ContactMention models to Prisma schema with proper enums and relations
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (schema must be done first)

**Technical Requirements:**
- Add three new enums: `RelationshipSource`, `MentionStatus`, `MatchType`
- Create `ContactRelationship` model for bidirectional contact links
- Create `ContactMention` model for tracking pending mentions
- Add relations to existing `Contact` and `User` models

**Implementation - Add to `prisma/schema.prisma`:**

```prisma
// Bidirectional relationship between contacts
model ContactRelationship {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Both contacts in the relationship (order doesn't matter - bidirectional)
  contactAId     String
  contactA       Contact  @relation("RelationshipA", fields: [contactAId], references: [id], onDelete: Cascade)

  contactBId     String
  contactB       Contact  @relation("RelationshipB", fields: [contactBId], references: [id], onDelete: Cascade)

  // How this relationship was discovered
  sourceType     RelationshipSource @default(ENRICHMENT_MENTION)
  sourceContext  String?  @db.Text  // What was said that established this link

  createdAt      DateTime @default(now())

  @@unique([contactAId, contactBId])
  @@index([userId])
  @@index([contactAId])
  @@index([contactBId])
}

enum RelationshipSource {
  ENRICHMENT_MENTION
  MANUAL
  IMPORT
}

// Pending mentions awaiting user action
model ContactMention {
  id                 String        @id @default(uuid())
  userId             String
  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Contact being enriched when mention was detected
  sourceContactId    String
  sourceContact      Contact       @relation("MentionSource", fields: [sourceContactId], references: [id], onDelete: Cascade)

  // Matched contact (null until linked or created)
  mentionedContactId String?
  mentionedContact   Contact?      @relation("MentionTarget", fields: [mentionedContactId], references: [id], onDelete: SetNull)

  // Extraction data
  mentionedName      String        // Original name as spoken
  normalizedName     String        // Cleaned version for matching
  extractedContext   String        @db.Text  // What was said about them
  inferredFields     Json?         // { title?, company?, expertise? }

  // Matching data
  matchConfidence    Float         @default(0)  // 0-1
  matchType          MatchType?    // EXACT, FUZZY, PHONETIC, NONE

  // Workflow state
  status             MentionStatus @default(PENDING)

  createdAt          DateTime      @default(now())
  processedAt        DateTime?

  @@index([userId])
  @@index([sourceContactId])
  @@index([status])
}

enum MentionStatus {
  PENDING    // Awaiting user action
  LINKED     // User confirmed link to existing contact
  CREATED    // User created new contact
  DISMISSED  // User dismissed
}

enum MatchType {
  EXACT      // firstName + lastName exact match
  FUZZY      // pg_trgm similarity match
  PHONETIC   // Metaphone phonetic match
  NONE       // No match found
}
```

**Add to Contact model:**
```prisma
model Contact {
  // ... existing fields ...

  // Relationships (bidirectional)
  relationshipsA     ContactRelationship[] @relation("RelationshipA")
  relationshipsB     ContactRelationship[] @relation("RelationshipB")

  // Mentions
  mentionsAsSource   ContactMention[] @relation("MentionSource")
  mentionsAsTarget   ContactMention[] @relation("MentionTarget")
}
```

**Add to User model:**
```prisma
model User {
  // ... existing fields ...

  contactRelationships ContactRelationship[]
  contactMentions      ContactMention[]
}
```

**Acceptance Criteria:**
- [ ] Schema compiles without errors (`npx prisma validate`)
- [ ] All enums are defined correctly
- [ ] ContactRelationship has unique constraint on (contactAId, contactBId)
- [ ] All required indexes are present
- [ ] Relations are bidirectional on Contact model
- [ ] User model has new relations

---

### Task 1.2: Create and Run Database Migration

**Description:** Generate Prisma migration and run it against Supabase PostgreSQL
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**
- Generate migration from schema changes
- Migration must enable pg_trgm extension
- Create GIN index for fuzzy name matching

**Implementation Steps:**

1. Generate migration:
```bash
npx prisma migrate dev --name add_contact_mentions
```

2. If Prisma doesn't include pg_trgm automatically, create a manual migration file:

**File:** `prisma/migrations/XXXXXX_add_contact_mentions/migration.sql`

```sql
-- Enable fuzzy matching extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create enums
CREATE TYPE "RelationshipSource" AS ENUM ('ENRICHMENT_MENTION', 'MANUAL', 'IMPORT');
CREATE TYPE "MentionStatus" AS ENUM ('PENDING', 'LINKED', 'CREATED', 'DISMISSED');
CREATE TYPE "MatchType" AS ENUM ('EXACT', 'FUZZY', 'PHONETIC', 'NONE');

-- Create ContactRelationship table
CREATE TABLE "ContactRelationship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactAId" TEXT NOT NULL,
    "contactBId" TEXT NOT NULL,
    "sourceType" "RelationshipSource" NOT NULL DEFAULT 'ENRICHMENT_MENTION',
    "sourceContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRelationship_pkey" PRIMARY KEY ("id")
);

-- Create ContactMention table
CREATE TABLE "ContactMention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceContactId" TEXT NOT NULL,
    "mentionedContactId" TEXT,
    "mentionedName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "extractedContext" TEXT NOT NULL,
    "inferredFields" JSONB,
    "matchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchType" "MatchType",
    "status" "MentionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ContactMention_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for relationships
CREATE UNIQUE INDEX "ContactRelationship_contactAId_contactBId_key"
ON "ContactRelationship"("contactAId", "contactBId");

-- Add indexes
CREATE INDEX "ContactRelationship_userId_idx" ON "ContactRelationship"("userId");
CREATE INDEX "ContactRelationship_contactAId_idx" ON "ContactRelationship"("contactAId");
CREATE INDEX "ContactRelationship_contactBId_idx" ON "ContactRelationship"("contactBId");

CREATE INDEX "ContactMention_userId_idx" ON "ContactMention"("userId");
CREATE INDEX "ContactMention_sourceContactId_idx" ON "ContactMention"("sourceContactId");
CREATE INDEX "ContactMention_status_idx" ON "ContactMention"("status");

-- Add GIN index for fuzzy name matching
CREATE INDEX "Contact_names_trgm_idx" ON "Contact"
USING GIN (("firstName" || ' ' || COALESCE("lastName", '')) gin_trgm_ops);

-- Add foreign keys
ALTER TABLE "ContactRelationship" ADD CONSTRAINT "ContactRelationship_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactRelationship" ADD CONSTRAINT "ContactRelationship_contactAId_fkey"
FOREIGN KEY ("contactAId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactRelationship" ADD CONSTRAINT "ContactRelationship_contactBId_fkey"
FOREIGN KEY ("contactBId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactMention" ADD CONSTRAINT "ContactMention_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactMention" ADD CONSTRAINT "ContactMention_sourceContactId_fkey"
FOREIGN KEY ("sourceContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactMention" ADD CONSTRAINT "ContactMention_mentionedContactId_fkey"
FOREIGN KEY ("mentionedContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

3. Verify migration:
```bash
npx prisma migrate status
```

**Acceptance Criteria:**
- [ ] Migration runs successfully without errors
- [ ] All tables created in Supabase
- [ ] pg_trgm extension is enabled
- [ ] GIN index is created on Contact names
- [ ] All foreign keys are in place
- [ ] Prisma client regenerated (`npx prisma generate`)

---

### Task 1.3: Verify pg_trgm Extension in Supabase

**Description:** Ensure pg_trgm extension works correctly for fuzzy matching
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** None

**Technical Requirements:**
- Verify extension is enabled in Supabase
- Test similarity function works
- Confirm GIN index is being used

**Implementation Steps:**

1. Connect to Supabase and verify extension:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
```

2. Test similarity function:
```sql
SELECT similarity('Michael', 'Mike');
SELECT similarity('John Smith', 'Jon Smyth');
```

3. Verify index usage:
```sql
EXPLAIN ANALYZE
SELECT id, "firstName", "lastName",
       similarity("firstName" || ' ' || COALESCE("lastName", ''), 'Mike Johnson') as sim
FROM "Contact"
WHERE similarity("firstName" || ' ' || COALESCE("lastName", ''), 'Mike Johnson') > 0.3
ORDER BY sim DESC
LIMIT 5;
```

4. Check index exists:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Contact' AND indexname LIKE '%trgm%';
```

**Acceptance Criteria:**
- [ ] pg_trgm extension shows in pg_extension
- [ ] similarity() function returns values between 0 and 1
- [ ] EXPLAIN shows Index Scan using the GIN index
- [ ] Fuzzy search returns expected results for test queries

---

## Phase 2: AI Extraction Layer

### Task 2.1: Create Zod Schemas for Mention Extraction

**Description:** Create TypeScript schemas for mention extraction request/response
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 2.2

**Technical Requirements:**
- Define schemas for PersonMention, MentionExtractionResponse, MentionMatch
- Use Zod's .describe() for OpenAI structured outputs compatibility
- Handle nullable optional fields correctly for OpenAI strict mode

**Implementation - Create `src/lib/schemas/mentionExtraction.ts`:**

```typescript
import { z } from "zod";

// Single person mention extracted from transcript
export const personMentionSchema = z.object({
  name: z
    .string()
    .describe("The person's name as mentioned in the transcript"),

  normalizedName: z
    .string()
    .describe("Cleaned/normalized version (e.g., 'Mike' from 'my friend Mike')"),

  context: z
    .string()
    .describe("What was said about this person - 1-3 sentences max"),

  category: z
    .enum(["relationship", "opportunity", "expertise", "interest"])
    .nullable()
    .optional()
    .describe("Primary category of the context"),

  inferredDetails: z
    .object({
      title: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      expertise: z.string().nullable().optional(),
      whyNow: z.string().nullable().optional(),
    })
    .nullable()
    .optional()
    .describe("Structured fields inferred from context"),
});

// API response from mention extraction
export const mentionExtractionResponseSchema = z.object({
  mentions: z
    .array(personMentionSchema)
    .describe("People mentioned in the transcript, excluding the primary contact"),

  primaryContactContext: z
    .string()
    .nullable()
    .optional()
    .describe("Any context that applies to the primary contact being enriched"),
});

// API request for mention extraction
export const mentionExtractionRequestSchema = z.object({
  transcript: z.string().min(10).max(10000),
  primaryContactName: z.string().describe("Name of the contact being enriched"),
  existingContactNames: z
    .array(z.string())
    .optional()
    .describe("Names of user's existing contacts for context"),
});

// Match result for a single mention
export const mentionMatchSchema = z.object({
  mentionId: z.string().optional(), // If already saved to DB
  name: z.string(),
  normalizedName: z.string(),
  context: z.string(),
  inferredDetails: z.record(z.string()).nullable().optional(),

  // Match result
  matchType: z.enum(["EXACT", "FUZZY", "PHONETIC", "NONE"]),
  confidence: z.number().min(0).max(1),

  // Matched contact (if found)
  matchedContact: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string().nullable(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      enrichmentScore: z.number(),
    })
    .nullable(),

  // Alternative matches for fuzzy/phonetic
  alternativeMatches: z
    .array(
      z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string().nullable(),
        similarity: z.number(),
      })
    )
    .optional(),
});

export const matchMentionsResponseSchema = z.object({
  matches: z.array(mentionMatchSchema),
});

// Types
export type PersonMention = z.infer<typeof personMentionSchema>;
export type MentionExtractionResponse = z.infer<typeof mentionExtractionResponseSchema>;
export type MentionExtractionRequest = z.infer<typeof mentionExtractionRequestSchema>;
export type MentionMatch = z.infer<typeof mentionMatchSchema>;
export type MatchMentionsResponse = z.infer<typeof matchMentionsResponseSchema>;
```

**Acceptance Criteria:**
- [ ] All schemas compile without TypeScript errors
- [ ] Schemas use `.nullable().optional()` for OpenAI compatibility
- [ ] Types are exported for use in components and API routes
- [ ] Schema validates test data correctly
- [ ] Optional fields don't cause validation errors when missing

---

### Task 2.2: Add Mention Extraction System Prompt

**Description:** Add the MENTION_EXTRACTION_SYSTEM_PROMPT to openai.ts
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 2.1

**Technical Requirements:**
- Add prompt to src/lib/openai.ts
- Follow existing pattern from ENRICHMENT_EXTRACTION_SYSTEM_PROMPT
- Include clear extraction rules and examples

**Implementation - Add to `src/lib/openai.ts`:**

```typescript
// Mention Extraction System Prompt (for detecting other people in enrichment transcripts)
export const MENTION_EXTRACTION_SYSTEM_PROMPT = `You are analyzing a transcript from a CRM enrichment session. Your task is to identify OTHER PEOPLE mentioned (not the primary contact being enriched) and extract context about them.

## Your Role
Extract mentions of other people and what was said about them. The primary contact is provided - do NOT include them in your output.

## What to Extract

For each mentioned person:
1. **name**: The name as spoken (e.g., "Mike", "Sarah Chen", "my friend John")
2. **normalizedName**: Clean version for matching (e.g., "Mike" → "Mike", "my buddy John Smith" → "John Smith")
3. **context**: What was said about them (1-3 sentences, preserve key details)
4. **category**: Primary category - relationship, opportunity, expertise, or interest
5. **inferredDetails**: Structured data if clearly stated:
   - title: Job title if mentioned
   - company: Company/org if mentioned
   - expertise: Skills/domain if mentioned
   - whyNow: Time-sensitive relevance if mentioned

## Rules

1. **Exclude the primary contact** - They are already being enriched
2. **Only extract named people** - Skip generic references like "someone" or "a friend"
3. **Preserve specifics** - Keep names, companies, projects exactly as stated
4. **Don't invent details** - Only include what's explicitly stated or strongly implied
5. **Group context** - If same person mentioned multiple times, combine context
6. **Handle nicknames** - "Mike" and "Michael" mentioned together = one person

## Examples

**Primary Contact:** Sarah Chen
**Transcript:** "Sarah introduced me to her co-founder Mike at the conference. He's the CTO and really into AI agents. They're both raising a Series A."

**Output:**
{
  "mentions": [
    {
      "name": "Mike",
      "normalizedName": "Mike",
      "context": "Sarah's co-founder, CTO who is really into AI agents. They're raising a Series A.",
      "category": "opportunity",
      "inferredDetails": {
        "title": "CTO",
        "expertise": "AI agents",
        "whyNow": "Raising Series A"
      }
    }
  ],
  "primaryContactContext": "Raising a Series A"
}

**Transcript:** "um yeah so that's about it for now"
**Output:** { "mentions": [], "primaryContactContext": null }

## Important
- Return empty mentions array if no other people are mentioned
- Focus on quality over quantity - only actionable mentions`;
```

**Acceptance Criteria:**
- [ ] Prompt added to openai.ts
- [ ] Export statement included
- [ ] Prompt follows existing patterns in the file
- [ ] Examples are clear and match expected schema

---

### Task 2.3: Create Extract Mentions API Endpoint

**Description:** Create POST /api/enrichment/extract-mentions endpoint
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2
**Can run parallel with:** None

**Technical Requirements:**
- Use Vercel AI SDK's generateObject for structured outputs
- Authenticate requests via Supabase
- Handle short transcripts gracefully
- Include Cache-Control headers

**Implementation - Create `src/app/api/enrichment/extract-mentions/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { gpt4oMini, MENTION_EXTRACTION_SYSTEM_PROMPT } from "@/lib/openai";
import {
  mentionExtractionRequestSchema,
  mentionExtractionResponseSchema,
} from "@/lib/schemas/mentionExtraction";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. Validate request
    const body = await request.json();
    const { transcript, primaryContactName, existingContactNames } =
      mentionExtractionRequestSchema.parse(body);

    // 3. Skip if transcript too short
    if (transcript.trim().length < 20) {
      return NextResponse.json(
        { mentions: [], primaryContactContext: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Build prompt with context
    let userPrompt = `Primary Contact (exclude from mentions): ${primaryContactName}\n\n`;
    userPrompt += `Transcript:\n"${transcript.slice(0, 8000)}"`;

    if (existingContactNames && existingContactNames.length > 0) {
      userPrompt += `\n\nUser's existing contacts (for reference):\n${existingContactNames.slice(0, 50).join(", ")}`;
    }

    // 5. Call GPT-4o-mini
    const { object } = await generateObject({
      model: gpt4oMini,
      schema: mentionExtractionResponseSchema,
      system: MENTION_EXTRACTION_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return NextResponse.json(object, {
      headers: { "Cache-Control": "no-store" },
    });

  } catch (error) {
    console.error("Mention extraction error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract mentions" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Endpoint returns 401 for unauthenticated requests
- [ ] Endpoint validates request against schema
- [ ] Short transcripts (<20 chars) return empty array
- [ ] GPT-4o-mini is called with correct system prompt
- [ ] Response matches mentionExtractionResponseSchema
- [ ] Cache-Control: no-store header is set
- [ ] Errors are logged and return appropriate status codes

---

## Phase 3: Contact Matching Service

### Task 3.1: Create Match Mentions API Endpoint

**Description:** Create POST /api/contacts/match-mentions endpoint with exact and fuzzy matching
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.3, Task 2.1
**Can run parallel with:** None

**Technical Requirements:**
- Implement exact name matching (firstName + lastName or firstName only)
- Implement pg_trgm fuzzy matching with similarity threshold
- Return confidence scores and alternative matches
- Exclude source contact from matching

**Implementation - Create `src/app/api/contacts/match-mentions/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mentions: z.array(
    z.object({
      name: z.string(),
      normalizedName: z.string(),
      context: z.string(),
      inferredDetails: z.record(z.string()).nullable().optional(),
    })
  ),
  sourceContactId: z.string(), // Exclude the contact being enriched
});

// Similarity threshold for fuzzy matching
const FUZZY_THRESHOLD = 0.3;
const CONFIDENT_THRESHOLD = 0.7;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. Validate request
    const body = await request.json();
    const { mentions, sourceContactId } = requestSchema.parse(body);

    if (mentions.length === 0) {
      return NextResponse.json(
        { matches: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Get all user's contacts for matching (exclude source contact)
    const contacts = await prisma.contact.findMany({
      where: {
        userId: user.id,
        id: { not: sourceContactId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        company: true,
        enrichmentScore: true,
      },
    });

    // 4. Match each mention
    const matches: MentionMatch[] = await Promise.all(
      mentions.map(async (mention) => {
        const result = await matchMention(mention, contacts, user.id);
        return result;
      })
    );

    return NextResponse.json(
      { matches },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (error) {
    console.error("Match mentions error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to match mentions" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

interface ContactForMatching {
  id: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string | null;
  enrichmentScore: number;
}

async function matchMention(
  mention: { name: string; normalizedName: string; context: string; inferredDetails?: Record<string, string> | null },
  contacts: ContactForMatching[],
  userId: string
): Promise<MentionMatch> {
  const searchName = mention.normalizedName.toLowerCase().trim();

  // 1. Try exact match first
  const exactMatch = contacts.find((c) => {
    const fullName = `${c.firstName} ${c.lastName || ""}`.toLowerCase().trim();
    const firstOnly = c.firstName.toLowerCase();
    return fullName === searchName || firstOnly === searchName;
  });

  if (exactMatch) {
    return {
      name: mention.name,
      normalizedName: mention.normalizedName,
      context: mention.context,
      inferredDetails: mention.inferredDetails,
      matchType: "EXACT",
      confidence: 1.0,
      matchedContact: exactMatch,
      alternativeMatches: [],
    };
  }

  // 2. Try fuzzy match via pg_trgm
  const fuzzyMatches = await prisma.$queryRaw<
    Array<{ id: string; firstName: string; lastName: string | null; similarity: number }>
  >`
    SELECT
      id,
      "firstName",
      "lastName",
      similarity("firstName" || ' ' || COALESCE("lastName", ''), ${searchName}) as similarity
    FROM "Contact"
    WHERE "userId" = ${userId}
    AND similarity("firstName" || ' ' || COALESCE("lastName", ''), ${searchName}) > ${FUZZY_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT 5
  `;

  if (fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    const matchedContact = contacts.find((c) => c.id === bestMatch.id);

    return {
      name: mention.name,
      normalizedName: mention.normalizedName,
      context: mention.context,
      inferredDetails: mention.inferredDetails,
      matchType: "FUZZY",
      confidence: bestMatch.similarity,
      matchedContact: matchedContact || null,
      alternativeMatches: fuzzyMatches.slice(1).map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        similarity: m.similarity,
      })),
    };
  }

  // 3. No match found
  return {
    name: mention.name,
    normalizedName: mention.normalizedName,
    context: mention.context,
    inferredDetails: mention.inferredDetails,
    matchType: "NONE",
    confidence: 0,
    matchedContact: null,
    alternativeMatches: [],
  };
}
```

**Acceptance Criteria:**
- [ ] Endpoint returns 401 for unauthenticated requests
- [ ] Empty mentions array returns empty matches
- [ ] Exact matches return confidence 1.0 and matchType "EXACT"
- [ ] Fuzzy matches use pg_trgm similarity function
- [ ] Source contact is excluded from matching
- [ ] Alternative matches are returned for fuzzy matches
- [ ] No match returns matchType "NONE" with confidence 0

---

### Task 3.2: Create Mention Action API Endpoint

**Description:** Create PATCH /api/contacts/mentions/[id] endpoint for link/create/dismiss actions
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1, Task 1.2
**Can run parallel with:** None

**Technical Requirements:**
- Handle three actions: link (to existing), create (new contact), dismiss
- Create bidirectional relationships on link/create
- Add context to linked contact's notes
- Recalculate enrichment score when creating contacts

**Implementation - Create `src/app/api/contacts/mentions/[id]/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["link", "create", "dismiss"]),
  linkedContactId: z.string().optional(), // Required for "link"
  newContactData: z
    .object({
      firstName: z.string(),
      lastName: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(), // Required for "create"
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json();
    const { action, linkedContactId, newContactData } = actionSchema.parse(body);

    // Get the mention
    const mention = await prisma.contactMention.findFirst({
      where: { id, userId: user.id },
    });

    if (!mention) {
      return NextResponse.json(
        { error: "Mention not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    let targetContactId: string | null = null;

    switch (action) {
      case "link":
        if (!linkedContactId) {
          return NextResponse.json(
            { error: "linkedContactId required for link action" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
        targetContactId = linkedContactId;

        // Add context to the linked contact
        await addContextToContact(linkedContactId, mention.extractedContext, mention.inferredFields);
        break;

      case "create":
        if (!newContactData) {
          return NextResponse.json(
            { error: "newContactData required for create action" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        // Create new contact with extracted context
        const inferredFields = mention.inferredFields as Record<string, string> | null;
        const newContact = await prisma.contact.create({
          data: {
            userId: user.id,
            firstName: newContactData.firstName,
            lastName: newContactData.lastName || null,
            title: newContactData.title || inferredFields?.title || null,
            company: newContactData.company || inferredFields?.company || null,
            notes: mention.extractedContext,
            expertise: inferredFields?.expertise || null,
            whyNow: inferredFields?.whyNow || null,
            enrichmentScore: calculateInitialEnrichmentScore({
              firstName: newContactData.firstName,
              lastName: newContactData.lastName,
              title: newContactData.title || inferredFields?.title,
              company: newContactData.company || inferredFields?.company,
              notes: mention.extractedContext,
              expertise: inferredFields?.expertise,
              whyNow: inferredFields?.whyNow,
            }),
          },
        });
        targetContactId = newContact.id;
        break;

      case "dismiss":
        // Just update status, no further action
        break;
    }

    // Update mention status
    await prisma.contactMention.update({
      where: { id },
      data: {
        status: action === "link" ? "LINKED" : action === "create" ? "CREATED" : "DISMISSED",
        mentionedContactId: targetContactId,
        processedAt: new Date(),
      },
    });

    // Create bidirectional relationship if linked or created
    if (targetContactId && action !== "dismiss") {
      // Check if relationship already exists (in either direction)
      const existingRelationship = await prisma.contactRelationship.findFirst({
        where: {
          OR: [
            { contactAId: mention.sourceContactId, contactBId: targetContactId },
            { contactAId: targetContactId, contactBId: mention.sourceContactId },
          ],
        },
      });

      if (!existingRelationship) {
        await prisma.contactRelationship.create({
          data: {
            userId: user.id,
            contactAId: mention.sourceContactId,
            contactBId: targetContactId,
            sourceType: "ENRICHMENT_MENTION",
            sourceContext: mention.extractedContext,
          },
        });
      }
    }

    return NextResponse.json(
      { success: true, targetContactId },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (error) {
    console.error("Process mention error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to process mention" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function addContextToContact(
  contactId: string,
  context: string,
  inferredFields: unknown
) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) return;

  const updates: Record<string, unknown> = {};
  const fields = inferredFields as Record<string, string> | null;

  // Add to notes with attribution
  const attribution = `\n\n[Mentioned during enrichment - ${new Date().toLocaleDateString()}]\n${context}`;
  updates.notes = contact.notes ? contact.notes + attribution : attribution;

  // Map inferred fields if they don't exist
  if (fields) {
    if (!contact.title && fields.title) {
      updates.title = fields.title;
    }
    if (!contact.company && fields.company) {
      updates.company = fields.company;
    }
    if (fields.expertise) {
      updates.expertise = contact.expertise
        ? `${contact.expertise}, ${fields.expertise}`
        : fields.expertise;
    }
    if (fields.whyNow) {
      updates.whyNow = contact.whyNow
        ? `${contact.whyNow}. ${fields.whyNow}`
        : fields.whyNow;
    }
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: updates,
  });
}

function calculateInitialEnrichmentScore(data: {
  firstName?: string;
  lastName?: string | null;
  title?: string | null;
  company?: string | null;
  notes?: string | null;
  expertise?: string | null;
  whyNow?: string | null;
}): number {
  let score = 0;
  if (data.firstName) score += 10;
  if (data.lastName) score += 5;
  if (data.title) score += 10;
  if (data.company) score += 10;
  if (data.notes) score += 10;
  if (data.expertise) score += 10;
  if (data.whyNow) score += 20;
  return score;
}
```

**Acceptance Criteria:**
- [ ] Endpoint returns 401 for unauthenticated requests
- [ ] Endpoint returns 404 for mentions not owned by user
- [ ] "link" action requires linkedContactId
- [ ] "create" action requires newContactData
- [ ] Context is added to linked contact's notes with attribution
- [ ] New contacts are created with extracted context and inferred fields
- [ ] Enrichment score is calculated for new contacts
- [ ] Bidirectional relationship is created for link/create actions
- [ ] Duplicate relationships are not created
- [ ] Mention status is updated correctly

---

## Phase 4: UI Components

### Task 4.1: Create MentionedPersonCard Component

**Description:** Create the card component for displaying a single mentioned person
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1 (schemas)
**Can run parallel with:** Task 4.2

**Technical Requirements:**
- Three visual states: confident match (green), fuzzy match (amber), unknown (neutral)
- Show context preview with expand/collapse
- Action buttons based on match type
- Handle alternative matches for fuzzy
- Loading state during API calls

**Implementation - Create `src/components/enrichment/completion/MentionedPersonCard.tsx`:**

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  User,
  Plus,
  Check,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

interface MentionedPersonCardProps {
  mention: MentionMatch;
  sourceContactId: string;
  onProcessed: () => void;
}

export function MentionedPersonCard({
  mention,
  sourceContactId,
  onProcessed,
}: MentionedPersonCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const isConfidentMatch = mention.matchType === "EXACT" || mention.confidence >= 0.7;
  const isFuzzyMatch = mention.matchType === "FUZZY" && mention.confidence < 0.7;
  const isUnknown = mention.matchType === "NONE";

  // Smart preview: first sentence or 80 chars
  const contextPreview = mention.context.split(/[.!?]/)[0].slice(0, 80);
  const hasMoreContext = mention.context.length > contextPreview.length;

  async function handleAction(
    action: "link" | "create" | "dismiss",
    linkedContactId?: string
  ) {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/contacts/mentions/${mention.mentionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          linkedContactId,
          newContactData:
            action === "create"
              ? {
                  firstName: mention.normalizedName.split(" ")[0],
                  lastName: mention.normalizedName.split(" ").slice(1).join(" ") || undefined,
                  ...mention.inferredDetails,
                }
              : undefined,
        }),
      });

      if (response.ok) {
        onProcessed();
      } else {
        console.error("Failed to process mention");
      }
    } catch (error) {
      console.error("Failed to process mention:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleEnrichNow() {
    if (mention.matchedContact) {
      router.push(`/enrichment/session?contact=${mention.matchedContact.id}`);
    }
  }

  // Card styling based on match type
  const cardStyles = isConfidentMatch
    ? "border-green-500/30 bg-green-500/5"
    : isFuzzyMatch
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-zinc-700 bg-zinc-800/50";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border p-3 ${cardStyles}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
            <User size={18} className="text-zinc-400" />
          </div>

          {/* Name and match status */}
          <div className="min-w-0">
            {isConfidentMatch && mention.matchedContact ? (
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {mention.matchedContact.firstName} {mention.matchedContact.lastName}
                </span>
                <Check size={14} className="text-green-400 shrink-0" />
              </div>
            ) : isFuzzyMatch && mention.matchedContact ? (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">Did you mean</span>
                <span className="text-white font-medium truncate">
                  {mention.matchedContact.firstName} {mention.matchedContact.lastName}
                </span>
                <HelpCircle size={14} className="text-amber-400 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  "{mention.name}"
                </span>
                <span className="text-xs text-zinc-500">(not in contacts)</span>
              </div>
            )}

            {mention.matchedContact?.title && (
              <p className="text-xs text-zinc-500 truncate">
                {mention.matchedContact.title}
                {mention.matchedContact.company && ` at ${mention.matchedContact.company}`}
              </p>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => handleAction("dismiss")}
          disabled={isProcessing}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </div>

      {/* Context preview */}
      <div className="mt-2 ml-[52px]">
        <p className="text-sm text-zinc-400">
          {isExpanded ? mention.context : contextPreview}
          {hasMoreContext && !isExpanded && "..."}
        </p>
        {hasMoreContext && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp size={12} />
              </>
            ) : (
              <>
                Show more <ChevronDown size={12} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 ml-[52px] flex flex-wrap gap-2">
        {isConfidentMatch && mention.matchedContact ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction("link", mention.matchedContact!.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {isProcessing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Plus size={14} className="mr-1" />
              )}
              Add Context
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrichNow}
              disabled={isProcessing}
              className="border-zinc-600"
            >
              Enrich Now
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </>
        ) : isFuzzyMatch && mention.matchedContact ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction("link", mention.matchedContact!.id)}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isProcessing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              Yes, link
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAlternatives(!showAlternatives)}
              disabled={isProcessing}
              className="border-zinc-600"
            >
              Different person
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleAction("create")}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isProcessing ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Plus size={14} className="mr-1" />
            )}
            Create Contact
          </Button>
        )}
      </div>

      {/* Alternative matches for fuzzy */}
      {showAlternatives && mention.alternativeMatches && mention.alternativeMatches.length > 0 && (
        <div className="mt-3 ml-[52px] p-2 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500 mb-2">Other possible matches:</p>
          <div className="space-y-1">
            {mention.alternativeMatches.map((alt) => (
              <button
                key={alt.id}
                onClick={() => handleAction("link", alt.id)}
                disabled={isProcessing}
                className="w-full text-left p-2 rounded hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
              >
                <span className="text-sm text-white">
                  {alt.firstName} {alt.lastName}
                </span>
                <span className="text-xs text-zinc-500 ml-2">
                  ({Math.round(alt.similarity * 100)}% match)
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => handleAction("create")}
            disabled={isProcessing}
            className="w-full mt-2 p-2 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            + Create as new contact
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Three distinct visual states for confident/fuzzy/unknown matches
- [ ] Context preview shows first sentence with expand/collapse
- [ ] Confident match shows "Add Context" and "Enrich Now" buttons
- [ ] Fuzzy match shows "Yes, link" and "Different person" buttons
- [ ] Unknown shows "Create Contact" button
- [ ] Alternative matches dropdown for fuzzy matches
- [ ] Loading spinner shows during API calls
- [ ] Dismiss button works correctly
- [ ] All buttons disabled during processing

---

### Task 4.2: Create MentionedPeopleSection Component

**Description:** Create the collapsible section containing all mentioned person cards
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.1
**Can run parallel with:** None

**Technical Requirements:**
- Collapsible card section with header
- Sort mentions by confidence (exact first, then fuzzy, then unknown)
- Show max 5 mentions with "Show more" button
- Framer Motion animations

**Implementation - Create `src/components/enrichment/completion/MentionedPeopleSection.tsx`:**

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { MentionedPersonCard } from "./MentionedPersonCard";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

interface MentionedPeopleSectionProps {
  mentions: MentionMatch[];
  sourceContactId: string;
  onMentionProcessed: (mentionId: string) => void;
}

export function MentionedPeopleSection({
  mentions,
  sourceContactId,
  onMentionProcessed,
}: MentionedPeopleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [processedMentions, setProcessedMentions] = useState<Set<string>>(new Set());

  // Filter out processed mentions
  const activeMentions = mentions.filter(
    (m) => !processedMentions.has(m.mentionId || m.name)
  );

  if (activeMentions.length === 0) return null;

  // Sort by confidence (matched first, then fuzzy, then unknown)
  const sortedMentions = [...activeMentions].sort((a, b) => {
    const order = { EXACT: 0, FUZZY: 1, PHONETIC: 2, NONE: 3 };
    return order[a.matchType] - order[b.matchType] || b.confidence - a.confidence;
  });

  const displayedMentions = showAll ? sortedMentions : sortedMentions.slice(0, 5);
  const hasMore = sortedMentions.length > 5;

  function handleMentionProcessed(mentionId: string) {
    setProcessedMentions((prev) => new Set([...prev, mentionId]));
    onMentionProcessed(mentionId);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">
              {activeMentions.length} {activeMentions.length === 1 ? "person" : "people"} mentioned
            </h3>
            <p className="text-xs text-zinc-500">
              Add context or create new contacts
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-zinc-500" />
        ) : (
          <ChevronDown size={18} className="text-zinc-500" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {displayedMentions.map((mention, index) => (
                <MentionedPersonCard
                  key={mention.mentionId || `${mention.name}-${index}`}
                  mention={mention}
                  sourceContactId={sourceContactId}
                  onProcessed={() =>
                    handleMentionProcessed(mention.mentionId || mention.name)
                  }
                />
              ))}

              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Show {sortedMentions.length - 5} more
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Section is collapsible with smooth animation
- [ ] Header shows count of active (non-processed) mentions
- [ ] Mentions are sorted by confidence (EXACT > FUZZY > NONE)
- [ ] Maximum 5 mentions displayed initially
- [ ] "Show more" button appears when > 5 mentions
- [ ] Processed mentions are removed from display
- [ ] Framer Motion animations are smooth
- [ ] Blue accent color on header icon

---

### Task 4.3: Export Components from Completion Module

**Description:** Add exports for new components to the completion module index
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.1, Task 4.2
**Can run parallel with:** None

**Technical Requirements:**
- Create or update barrel export file
- Export both MentionedPeopleSection and MentionedPersonCard

**Implementation:**

Check if `src/components/enrichment/completion/index.ts` exists. If not, create it. Add exports:

```typescript
// src/components/enrichment/completion/index.ts

export { MentionedPeopleSection } from "./MentionedPeopleSection";
export { MentionedPersonCard } from "./MentionedPersonCard";

// Re-export existing components if present
export { CompletionCelebration } from "./CompletionCelebration";
// ... other existing exports
```

**Acceptance Criteria:**
- [ ] Both new components are exported
- [ ] Imports work from "@/components/enrichment/completion"
- [ ] No circular dependency issues

---

## Phase 5: Integration

### Task 5.1: Update CompletionCelebration Component

**Description:** Integrate MentionedPeopleSection into the CompletionCelebration component
**Size:** Medium
**Priority:** High
**Dependencies:** Task 4.2
**Can run parallel with:** Task 5.2

**Technical Requirements:**
- Add mentionedPeople and sourceContactId props
- Render MentionedPeopleSection after existing content
- Handle mention processed callback

**Implementation - Modify `src/components/enrichment/completion/CompletionCelebration.tsx`:**

Add imports at top:
```typescript
import { MentionedPeopleSection } from "./MentionedPeopleSection";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";
```

Add to props interface:
```typescript
interface CompletionCelebrationProps {
  // ... existing props ...
  mentionedPeople?: MentionMatch[];
  sourceContactId: string;
  onMentionProcessed?: (mentionId: string) => void;
}
```

Add to component render (after existing streak/rank sections):
```typescript
{/* Mentioned People Section */}
{mentionedPeople && mentionedPeople.length > 0 && (
  <MentionedPeopleSection
    mentions={mentionedPeople}
    sourceContactId={sourceContactId}
    onMentionProcessed={(id) => {
      onMentionProcessed?.(id);
    }}
  />
)}
```

**Acceptance Criteria:**
- [ ] Props interface updated with mentionedPeople, sourceContactId, onMentionProcessed
- [ ] MentionedPeopleSection renders after existing content
- [ ] Section only renders when mentionedPeople has items
- [ ] Callback is passed through correctly
- [ ] TypeScript types are correct

---

### Task 5.2: Integrate Mention Extraction into Session Page

**Description:** Add mention extraction and matching after enrichment save
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.3, Task 3.1, Task 5.1
**Can run parallel with:** None

**Technical Requirements:**
- Extract mentions after successful save
- Match mentions against existing contacts
- Save mentions to database before showing UI
- Pass results to CompletionCelebration

**Implementation - Modify `src/app/(dashboard)/enrichment/session/page.tsx`:**

Add state for mentions:
```typescript
const [mentionedPeople, setMentionedPeople] = useState<MentionMatch[]>([]);
```

Add helper function after performSave:
```typescript
async function extractAndMatchMentions(): Promise<MentionMatch[]> {
  const fullTranscript = [...savedTranscripts, transcript.trim()]
    .filter(Boolean)
    .join("\n\n");

  if (fullTranscript.length < 20) return [];

  try {
    // 1. Extract mentions from transcript
    const extractRes = await fetch("/api/enrichment/extract-mentions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: fullTranscript,
        primaryContactName: `${contact.firstName} ${contact.lastName || ""}`.trim(),
      }),
    });

    if (!extractRes.ok) return [];
    const { mentions } = await extractRes.json();

    if (mentions.length === 0) return [];

    // 2. Save mentions to DB and match against contacts
    const matchRes = await fetch("/api/contacts/match-mentions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentions,
        sourceContactId: contact.id,
      }),
    });

    if (!matchRes.ok) return [];
    const { matches } = await matchRes.json();

    return matches;
  } catch (error) {
    console.error("Failed to extract mentions:", error);
    return [];
  }
}
```

Call after save completes successfully (in the save success handler):
```typescript
// After save succeeds
const mentions = await extractAndMatchMentions();
setMentionedPeople(mentions);
```

Update CompletionCelebration render:
```typescript
<CompletionCelebration
  // ... existing props ...
  mentionedPeople={mentionedPeople}
  sourceContactId={contact.id}
  onMentionProcessed={(id) => {
    setMentionedPeople((prev) => prev.filter((m) => (m.mentionId || m.name) !== id));
  }}
/>
```

**Acceptance Criteria:**
- [ ] Mentions are extracted after successful save
- [ ] Primary contact name is excluded from extraction
- [ ] Matches are retrieved from match API
- [ ] Results are stored in state and passed to CompletionCelebration
- [ ] Processed mentions are removed from state
- [ ] Empty transcript or no mentions handles gracefully
- [ ] Errors are logged but don't break the completion flow

---

### Task 5.3: Create API Route for Saving Mentions to Database

**Description:** Add mentions to database during match process for workflow tracking
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None

**Technical Requirements:**
- Update match-mentions endpoint to save ContactMention records
- Return mentionId with each match for later actions
- Handle duplicate detection

**Implementation - Update `src/app/api/contacts/match-mentions/route.ts`:**

After matching, before returning, save mentions to database:

```typescript
// After matching completes, save mentions to DB
const savedMatches = await Promise.all(
  matches.map(async (match) => {
    const savedMention = await prisma.contactMention.create({
      data: {
        userId: user.id,
        sourceContactId,
        mentionedName: match.name,
        normalizedName: match.normalizedName,
        extractedContext: match.context,
        inferredFields: match.inferredDetails || null,
        matchConfidence: match.confidence,
        matchType: match.matchType,
        mentionedContactId: match.matchedContact?.id || null,
        status: "PENDING",
      },
    });

    return {
      ...match,
      mentionId: savedMention.id,
    };
  })
);

return NextResponse.json(
  { matches: savedMatches },
  { headers: { "Cache-Control": "no-store" } }
);
```

**Acceptance Criteria:**
- [ ] ContactMention records are created for each mention
- [ ] mentionId is returned with each match
- [ ] Matched contact ID is stored when found
- [ ] Match confidence and type are stored
- [ ] Status is set to PENDING

---

## Phase 6: Testing & Polish

### Task 6.1: Create Unit Tests for Zod Schemas

**Description:** Write unit tests for mentionExtraction schemas
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1
**Can run parallel with:** Task 6.2, Task 6.3

**Technical Requirements:**
- Test valid responses with mentions
- Test empty mentions array
- Test optional fields handling
- Test invalid data rejection

**Implementation - Create `src/lib/schemas/__tests__/mentionExtraction.test.ts`:**

```typescript
import { describe, it, expect } from "vitest";
import {
  mentionExtractionResponseSchema,
  personMentionSchema,
  mentionMatchSchema,
} from "../mentionExtraction";

describe("personMentionSchema", () => {
  it("validates a complete mention", () => {
    const mention = {
      name: "Mike",
      normalizedName: "Mike",
      context: "He's the CTO at Acme",
      category: "expertise",
      inferredDetails: {
        title: "CTO",
        company: "Acme",
      },
    };
    expect(() => personMentionSchema.parse(mention)).not.toThrow();
  });

  it("validates mention without optional fields", () => {
    const mention = {
      name: "Sarah",
      normalizedName: "Sarah",
      context: "Met at conference",
    };
    expect(() => personMentionSchema.parse(mention)).not.toThrow();
  });

  it("handles null optional fields", () => {
    const mention = {
      name: "John",
      normalizedName: "John",
      context: "Works in tech",
      category: null,
      inferredDetails: null,
    };
    expect(() => personMentionSchema.parse(mention)).not.toThrow();
  });
});

describe("mentionExtractionResponseSchema", () => {
  it("validates response with mentions", () => {
    const response = {
      mentions: [
        {
          name: "Mike",
          normalizedName: "Mike",
          context: "He's the CTO",
          category: "expertise",
        },
      ],
      primaryContactContext: "They're raising Series A",
    };
    expect(() => mentionExtractionResponseSchema.parse(response)).not.toThrow();
  });

  it("validates empty mentions", () => {
    const response = { mentions: [] };
    expect(() => mentionExtractionResponseSchema.parse(response)).not.toThrow();
  });

  it("validates with null primaryContactContext", () => {
    const response = { mentions: [], primaryContactContext: null };
    expect(() => mentionExtractionResponseSchema.parse(response)).not.toThrow();
  });
});

describe("mentionMatchSchema", () => {
  it("validates exact match", () => {
    const match = {
      name: "Mike",
      normalizedName: "Mike",
      context: "CTO at Acme",
      matchType: "EXACT",
      confidence: 1.0,
      matchedContact: {
        id: "123",
        firstName: "Mike",
        lastName: "Smith",
        title: "CTO",
        company: "Acme",
        enrichmentScore: 50,
      },
    };
    expect(() => mentionMatchSchema.parse(match)).not.toThrow();
  });

  it("validates no match", () => {
    const match = {
      name: "Unknown Person",
      normalizedName: "Unknown Person",
      context: "Some context",
      matchType: "NONE",
      confidence: 0,
      matchedContact: null,
    };
    expect(() => mentionMatchSchema.parse(match)).not.toThrow();
  });
});
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Schema validates correctly for all match types
- [ ] Optional/nullable fields are handled correctly
- [ ] Invalid data is rejected

---

### Task 6.2: Create API Route Tests

**Description:** Write integration tests for mention extraction and matching APIs
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.3, Task 3.1, Task 3.2
**Can run parallel with:** Task 6.1, Task 6.3

**Technical Requirements:**
- Test authentication requirements
- Test successful extraction with mock GPT response
- Test matching logic
- Test action processing

**Implementation - Create test files:**

```typescript
// src/app/api/enrichment/extract-mentions/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/enrichment/extract-mentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    // Mock auth to return null user
    // Call endpoint
    // Assert 401 status
  });

  it("returns empty array for short transcripts", async () => {
    // Mock auth
    // Call with transcript < 20 chars
    // Assert empty mentions
  });

  it("extracts mentions from valid transcript", async () => {
    // Mock auth
    // Mock GPT response
    // Assert mentions extracted
  });
});
```

**Acceptance Criteria:**
- [ ] Auth tests pass
- [ ] Short transcript test passes
- [ ] Valid extraction test passes (with mocked GPT)
- [ ] Matching tests cover exact/fuzzy/none cases
- [ ] Action tests cover link/create/dismiss

---

### Task 6.3: Create E2E Tests

**Description:** Write Playwright E2E tests for the complete mention flow
**Size:** Large
**Priority:** High
**Dependencies:** Task 5.2
**Can run parallel with:** Task 6.1, Task 6.2

**Technical Requirements:**
- Test end-to-end flow from enrichment to mention display
- Test linking to existing contact
- Test creating new contact
- Test dismissing mention

**Implementation - Create `e2e/mentioned-contacts.spec.ts`:**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Mentioned Contacts Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to enrichment
  });

  test("shows mentioned people section after enrichment with mentions", async ({ page }) => {
    // 1. Navigate to enrichment session with a contact
    // 2. Enter transcript mentioning other people
    // 3. Complete session
    // 4. Verify MentionedPeopleSection appears
    // 5. Verify correct number of cards displayed
  });

  test("links confident match with Add Context button", async ({ page }) => {
    // 1. Complete enrichment mentioning existing contact
    // 2. Find confident match card
    // 3. Click "Add Context"
    // 4. Verify card disappears
    // 5. Navigate to target contact and verify context added
  });

  test("creates new contact from unknown mention", async ({ page }) => {
    // 1. Complete enrichment with unknown name
    // 2. Find unknown match card
    // 3. Click "Create Contact"
    // 4. Verify card disappears
    // 5. Verify new contact exists with context
  });

  test("handles fuzzy match confirmation", async ({ page }) => {
    // 1. Complete enrichment with similar name (e.g., "Mike" for "Michael")
    // 2. Find fuzzy match card
    // 3. Click "Yes, link"
    // 4. Verify relationship created
  });

  test("dismisses mention correctly", async ({ page }) => {
    // 1. Complete enrichment with mentions
    // 2. Click dismiss button
    // 3. Verify card disappears
    // 4. Verify no relationship created
  });

  test("shows alternative matches for fuzzy match", async ({ page }) => {
    // 1. Complete enrichment with ambiguous name
    // 2. Click "Different person"
    // 3. Verify alternatives dropdown appears
    // 4. Select alternative
    // 5. Verify correct contact linked
  });
});
```

**Acceptance Criteria:**
- [ ] All E2E tests pass in CI
- [ ] Tests cover happy path for each match type
- [ ] Tests verify database state after actions
- [ ] Tests run in reasonable time (<2 minutes total)

---

### Task 6.4: Add Error Handling and Edge Cases

**Description:** Add comprehensive error handling and edge case coverage
**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 5.2
**Can run parallel with:** Task 6.3

**Technical Requirements:**
- Add toast notifications for errors
- Handle API failures gracefully
- Handle race conditions (multiple quick clicks)
- Handle network errors

**Implementation:**

1. Add error toast to MentionedPersonCard:
```typescript
import { toast } from "sonner"; // or your toast library

// In handleAction catch block:
catch (error) {
  console.error("Failed to process mention:", error);
  toast.error("Failed to process mention. Please try again.");
}
```

2. Add retry button for failed operations

3. Handle multiple rapid clicks:
```typescript
// Already have isProcessing state, just ensure buttons are properly disabled
disabled={isProcessing}
```

4. Handle session page API failures:
```typescript
// In extractAndMatchMentions, already returns empty array on error
// Add toast for visibility:
catch (error) {
  console.error("Failed to extract mentions:", error);
  // Don't show toast - silent fail is acceptable here
  return [];
}
```

**Acceptance Criteria:**
- [ ] Failed actions show error toast
- [ ] Buttons remain disabled during processing
- [ ] Empty mentions array doesn't break UI
- [ ] API timeouts are handled gracefully
- [ ] Network errors don't crash the page

---

### Task 6.5: Add Loading States

**Description:** Add loading indicators throughout the mention flow
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 5.2
**Can run parallel with:** Task 6.4

**Technical Requirements:**
- Add loading state while extracting mentions
- Show skeleton or spinner in MentionedPeopleSection header
- Button loading states (already implemented in Task 4.1)

**Implementation:**

1. Add extracting state to session page:
```typescript
const [isExtractingMentions, setIsExtractingMentions] = useState(false);

// In extractAndMatchMentions
setIsExtractingMentions(true);
try {
  // ... extraction logic
} finally {
  setIsExtractingMentions(false);
}
```

2. Pass to CompletionCelebration:
```typescript
<CompletionCelebration
  // ... existing props
  isLoadingMentions={isExtractingMentions}
/>
```

3. Show in MentionedPeopleSection:
```typescript
if (isLoading) {
  return (
    <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Loader2 size={16} className="text-blue-400 animate-spin" />
        </div>
        <div>
          <p className="text-sm text-white">Finding mentioned people...</p>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Loading indicator shows while extracting
- [ ] Skeleton or spinner in section header
- [ ] Smooth transition from loading to content
- [ ] No flash of empty state

---

### Task 6.6: Documentation Updates

**Description:** Update documentation with new feature details
**Size:** Small
**Priority:** Low
**Dependencies:** Task 5.2
**Can run parallel with:** Task 6.4, Task 6.5

**Technical Requirements:**
- Update CLAUDE.md with new data models
- Add API endpoint documentation
- Document the mention extraction prompt

**Implementation:**

Add to CLAUDE.md under Data Models:
```markdown
### ContactRelationship
Bidirectional relationship between two contacts.
- contactAId, contactBId: The two contacts in the relationship
- sourceType: How discovered (ENRICHMENT_MENTION, MANUAL, IMPORT)
- sourceContext: What was said that established the link

### ContactMention
Tracks pending mentions awaiting user action.
- sourceContactId: Contact being enriched when mention detected
- mentionedContactId: Linked contact (null until action taken)
- extractedContext: What was said about the person
- status: PENDING, LINKED, CREATED, DISMISSED
```

Add to API Endpoints:
```markdown
### Enrichment
POST /api/enrichment/extract-mentions  - Extract people mentions from transcript
POST /api/contacts/match-mentions      - Match mentions against existing contacts
PATCH /api/contacts/mentions/[id]      - Process mention action (link/create/dismiss)
```

**Acceptance Criteria:**
- [ ] Data models documented in CLAUDE.md
- [ ] API endpoints documented
- [ ] Any gotchas or caveats noted

---

## Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| 1: Data Layer | 3 tasks | 2 days |
| 2: AI Extraction | 3 tasks | 2 days |
| 3: Matching Service | 2 tasks | 2 days |
| 4: UI Components | 3 tasks | 3 days |
| 5: Integration | 3 tasks | 2 days |
| 6: Testing & Polish | 6 tasks | 2 days |
| **Total** | **20 tasks** | **~13 days** |

## Parallel Execution Opportunities

- Task 2.1 and 2.2 can run in parallel
- Task 4.1 and 4.2 can start once schemas are done
- Task 5.1 and 5.2 can progress together
- Phase 6 tasks (6.1, 6.2, 6.3) can all run in parallel

## Critical Path

1. Task 1.1 (Schema) → Task 1.2 (Migration) → Task 1.3 (Verify pg_trgm)
2. Task 2.1 (Zod) + Task 2.2 (Prompt) → Task 2.3 (Extract API)
3. Task 3.1 (Match API) → Task 3.2 (Action API) → Task 5.3 (Save mentions)
4. Task 4.1 (Card) → Task 4.2 (Section) → Task 5.1 (CompletionCelebration)
5. Task 5.2 (Session integration) → Task 6.3 (E2E tests)

## Execution Recommendations

1. Complete Phase 1 first (data layer is foundation)
2. Start Phase 2 and Phase 4 in parallel after Phase 1
3. Phase 3 depends on Phase 1 and Phase 2
4. Phase 5 requires Phase 3 and Phase 4
5. Phase 6 can start testing individual components as they're completed
