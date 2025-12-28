# Enrichment Mentioned Contacts - Technical Specification

**Status:** Draft
**Authors:** Claude Code
**Date:** 2025-12-27
**Branch:** `feature/enrichment-mentioned-contacts`
**Related:** `specs/enrichment-mentioned-contacts/01-ideation.md`, `specs/smart-voice-enrichment/`

---

## 1. Overview

Extend the enrichment completion flow to detect mentions of other people, match them against existing contacts, and provide actionable UI for linking/creating contacts with captured context.

**Core Value Proposition:** Transform single-contact enrichment sessions into network discovery opportunities. When you talk about Sarah and mention "she knows Mike from Google," you shouldn't have to remember to update Mike's profile later.

---

## 2. Background / Problem Statement

### Current State

The enrichment session (`/enrichment/session`) extracts insights about a single contact using GPT-4o-mini. When users mention other people during enrichment, that context is:
1. Lost if not relevant to the primary contact
2. Saved to notes but not linked to the mentioned person's profile
3. Not surfaced as actionable items

### Example Problem

User enriches "Sarah Chen" and says:
> "Met Sarah at TechCrunch. She mentioned her co-founder Mike is really into AI agents and they're raising a Series A together."

**Current behavior:** "raising a Series A together" might be saved to Sarah's `whyNow`, but nothing about Mike is captured or linked.

**Desired behavior:** After saving Sarah's enrichment, show a card for "Mike" with:
- Extracted context: "Co-founder, into AI agents, raising Series A"
- Match suggestion: "Did you mean Mike Richards?" (if exists in contacts)
- Quick actions: [Link to Mike Richards] [Create New Contact] [Dismiss]

---

## 3. Goals

| Goal | Metric |
|------|--------|
| Detect people mentions in transcripts | >80% of actual mentions detected |
| Match mentions to existing contacts | >75% accuracy on matches |
| Enable one-click context addition | <3 seconds to add context |
| Support quick contact creation | <10 seconds to create from mention |
| Create bidirectional relationships | All links are mutual (A↔B) |

---

## 4. Non-Goals

- Real-time mention detection during recording (post-session only)
- Automatic linking without user confirmation
- Social graph visualization
- Relationship strength inference from mentions
- Importing data from mentioned person's social profiles
- Processing historical enrichment transcripts

---

## 5. Technical Dependencies

### Existing (No Changes Required)

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | ^5.0.113 | Vercel AI SDK |
| `@ai-sdk/openai` | ^2.0.86 | OpenAI provider |
| `zod` | ^4.1.13 | Schema validation |
| `framer-motion` | ^11.x | Animations |

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `double-metaphone` | ^1.0.5 | Phonetic matching (nice-to-have) |

### Database Extensions

```sql
-- Enable fuzzy text matching in Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fast fuzzy search
CREATE INDEX idx_contact_names_trgm ON "Contact"
USING GIN (("firstName" || ' ' || COALESCE("lastName", '')) gin_trgm_ops);
```

---

## 6. Detailed Design

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Enrichment Session Complete                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐                                                     │
│  │ Full Transcript    │                                                     │
│  │ (saved transcripts │                                                     │
│  │  + current)        │                                                     │
│  └─────────┬──────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/enrichment/extract-mentions                               │   │
│  │                                                                       │   │
│  │  GPT-4o-mini + MENTION_EXTRACTION_SYSTEM_PROMPT                      │   │
│  │  → Returns: { mentions: PersonMention[], primaryContext: string }    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/contacts/match-mentions                                   │   │
│  │                                                                       │   │
│  │  For each mention:                                                   │   │
│  │  1. Exact match on firstName + lastName                              │   │
│  │  2. Fuzzy match via pg_trgm (similarity > 0.3)                       │   │
│  │  3. Optional: Phonetic match via Metaphone                           │   │
│  │                                                                       │   │
│  │  → Returns: { matches: MatchedMention[] }                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CompletionCelebration                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  MentionedPeopleSection                                      │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │    │   │
│  │  │  │ ConfidentMatch  │ │ FuzzyMatch      │ │ UnknownPerson   │ │    │   │
│  │  │  │ "Sarah Chen"    │ │ "Mike Richards?"│ │ "James"         │ │    │   │
│  │  │  │ [Add Context]   │ │ [Yes] [No]      │ │ [Create] [Skip] │ │    │   │
│  │  │  │ [Enrich Now]    │ │                 │ │                 │ │    │   │
│  │  │  └─────────────────┘ └─────────────────┘ └─────────────────┘ │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Database Schema

**File:** `prisma/schema.prisma` (additions)

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

### 6.3 Zod Schemas

**File:** `src/lib/schemas/mentionExtraction.ts`

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
    .optional()
    .describe("Primary category of the context"),

  inferredDetails: z
    .object({
      title: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      expertise: z.string().nullable().optional(),
      whyNow: z.string().nullable().optional(),
    })
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
  inferredDetails: z.record(z.string()).optional(),

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
export type MentionMatch = z.infer<typeof mentionMatchSchema>;
```

### 6.4 System Prompt

**File:** `src/lib/openai.ts` (addition)

```typescript
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

### 6.5 API Endpoints

#### 6.5.1 Extract Mentions

**File:** `src/app/api/enrichment/extract-mentions/route.ts`

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request
    const body = await request.json();
    const { transcript, primaryContactName, existingContactNames } =
      mentionExtractionRequestSchema.parse(body);

    // 3. Skip if transcript too short
    if (transcript.trim().length < 20) {
      return NextResponse.json({ mentions: [], primaryContactContext: null });
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
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract mentions" },
      { status: 500 }
    );
  }
}
```

#### 6.5.2 Match Mentions

**File:** `src/app/api/contacts/match-mentions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { MentionMatch, PersonMention } from "@/lib/schemas/mentionExtraction";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mentions: z.array(
    z.object({
      name: z.string(),
      normalizedName: z.string(),
      context: z.string(),
      inferredDetails: z.record(z.string()).optional(),
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request
    const body = await request.json();
    const { mentions, sourceContactId } = requestSchema.parse(body);

    if (mentions.length === 0) {
      return NextResponse.json({ matches: [] });
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

    return NextResponse.json({ matches });

  } catch (error) {
    console.error("Match mentions error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to match mentions" },
      { status: 500 }
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
  mention: { name: string; normalizedName: string; context: string; inferredDetails?: Record<string, string> },
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

#### 6.5.3 Process Mention Action

**File:** `src/app/api/contacts/mentions/[id]/route.ts`

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, linkedContactId, newContactData } = actionSchema.parse(body);

    // Get the mention
    const mention = await prisma.contactMention.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!mention) {
      return NextResponse.json({ error: "Mention not found" }, { status: 404 });
    }

    let targetContactId: string | null = null;

    switch (action) {
      case "link":
        if (!linkedContactId) {
          return NextResponse.json(
            { error: "linkedContactId required for link action" },
            { status: 400 }
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
            { status: 400 }
          );
        }

        // Create new contact with extracted context
        const newContact = await prisma.contact.create({
          data: {
            userId: user.id,
            firstName: newContactData.firstName,
            lastName: newContactData.lastName || null,
            title: newContactData.title || (mention.inferredFields as any)?.title || null,
            company: newContactData.company || (mention.inferredFields as any)?.company || null,
            notes: mention.extractedContext,
            expertise: (mention.inferredFields as any)?.expertise || null,
            whyNow: (mention.inferredFields as any)?.whyNow || null,
            enrichmentScore: 0, // Will be calculated
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
      where: { id: params.id },
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Process mention error:", error);
    return NextResponse.json(
      { error: "Failed to process mention" },
      { status: 500 }
    );
  }
}

async function addContextToContact(
  contactId: string,
  context: string,
  inferredFields: any
) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) return;

  const updates: Record<string, any> = {};

  // Add to notes with attribution
  const attribution = `\n\n[Mentioned during enrichment - ${new Date().toLocaleDateString()}]\n${context}`;
  updates.notes = contact.notes ? contact.notes + attribution : attribution;

  // Map inferred fields if they don't exist
  if (inferredFields) {
    if (!contact.title && inferredFields.title) {
      updates.title = inferredFields.title;
    }
    if (!contact.company && inferredFields.company) {
      updates.company = inferredFields.company;
    }
    if (inferredFields.expertise) {
      updates.expertise = contact.expertise
        ? `${contact.expertise}, ${inferredFields.expertise}`
        : inferredFields.expertise;
    }
    if (inferredFields.whyNow) {
      updates.whyNow = contact.whyNow
        ? `${contact.whyNow}. ${inferredFields.whyNow}`
        : inferredFields.whyNow;
    }
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: updates,
  });
}
```

### 6.6 UI Components

#### 6.6.1 MentionedPeopleSection

**File:** `src/components/enrichment/completion/MentionedPeopleSection.tsx`

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

  if (mentions.length === 0) return null;

  // Sort by confidence (matched first, then fuzzy, then unknown)
  const sortedMentions = [...mentions].sort((a, b) => {
    const order = { EXACT: 0, FUZZY: 1, PHONETIC: 2, NONE: 3 };
    return order[a.matchType] - order[b.matchType] || b.confidence - a.confidence;
  });

  const displayedMentions = showAll ? sortedMentions : sortedMentions.slice(0, 5);
  const hasMore = sortedMentions.length > 5;

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
              {mentions.length} {mentions.length === 1 ? "person" : "people"} mentioned
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
                    onMentionProcessed(mention.mentionId || mention.name)
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

#### 6.6.2 MentionedPersonCard

**File:** `src/components/enrichment/completion/MentionedPersonCard.tsx`

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
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
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
              <Plus size={14} className="mr-1" />
              Add Context
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrichNow}
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
              <Check size={14} className="mr-1" />
              Yes, link
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAlternatives(!showAlternatives)}
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
            <Plus size={14} className="mr-1" />
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
                className="w-full text-left p-2 rounded hover:bg-zinc-700/50 transition-colors"
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
            className="w-full mt-2 p-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Create as new contact
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

### 6.7 Integration with CompletionCelebration

**File:** `src/components/enrichment/completion/CompletionCelebration.tsx` (modification)

Add the following after the existing celebration content:

```typescript
// Add import
import { MentionedPeopleSection } from "./MentionedPeopleSection";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

// Add to props interface
interface CompletionCelebrationProps {
  // ... existing props ...
  mentionedPeople?: MentionMatch[];
  sourceContactId: string;
}

// Add in the component render, after streak/rank sections:
{mentionedPeople && mentionedPeople.length > 0 && (
  <MentionedPeopleSection
    mentions={mentionedPeople}
    sourceContactId={sourceContactId}
    onMentionProcessed={(id) => {
      // Remove from local state or refetch
    }}
  />
)}
```

### 6.8 Session Page Integration

**File:** `src/app/(dashboard)/enrichment/session/page.tsx` (modifications)

Add after the existing `performSave` function completes successfully:

```typescript
// After save completes successfully, extract mentions
async function extractAndMatchMentions() {
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

// Call after save completes
const mentionedPeople = await extractAndMatchMentions();

// Pass to CompletionCelebration
<CompletionCelebration
  // ... existing props ...
  mentionedPeople={mentionedPeople}
  sourceContactId={contact.id}
/>
```

---

## 7. Database Migration

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

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// src/lib/schemas/__tests__/mentionExtraction.test.ts
describe("mentionExtractionResponseSchema", () => {
  it("validates a response with mentions", () => {
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
});
```

### 8.2 API Route Tests

```typescript
// src/app/api/enrichment/extract-mentions/__tests__/route.test.ts
describe("POST /api/enrichment/extract-mentions", () => {
  it("extracts mentions from transcript with multiple people", async () => {
    // Mock GPT response and verify extraction
  });

  it("excludes primary contact from mentions", async () => {
    // Verify primary contact is not in results
  });

  it("returns empty array for transcript with no people", async () => {
    // Test with "um yeah so that's about it"
  });
});
```

### 8.3 E2E Tests

```typescript
// e2e/mentioned-contacts.spec.ts
test.describe("Mentioned Contacts Feature", () => {
  test("shows mentioned people section after enrichment", async ({ page }) => {
    // 1. Navigate to enrichment session
    // 2. Add transcript mentioning other people
    // 3. Complete session
    // 4. Verify MentionedPeopleSection appears
    // 5. Verify correct number of cards
  });

  test("links confident match with one click", async ({ page }) => {
    // 1. Complete enrichment mentioning existing contact
    // 2. Click "Add Context"
    // 3. Verify context added to target contact
    // 4. Verify relationship created
  });

  test("creates new contact from unknown mention", async ({ page }) => {
    // 1. Complete enrichment with unknown name
    // 2. Click "Create Contact"
    // 3. Verify new contact created with context
    // 4. Verify relationship created
  });

  test("handles fuzzy match confirmation", async ({ page }) => {
    // 1. Complete enrichment with similar name
    // 2. Verify fuzzy match UI appears
    // 3. Confirm or deny match
    // 4. Verify correct action taken
  });
});
```

---

## 9. Implementation Phases

### Phase 1: Data Layer (2 days)
- [ ] Add Prisma schema changes
- [ ] Create and run migration
- [ ] Enable pg_trgm extension in Supabase
- [ ] Verify GIN index creation

### Phase 2: AI Extraction (2 days)
- [ ] Create Zod schemas in `src/lib/schemas/mentionExtraction.ts`
- [ ] Add `MENTION_EXTRACTION_SYSTEM_PROMPT` to `src/lib/openai.ts`
- [ ] Create `/api/enrichment/extract-mentions` endpoint
- [ ] Write unit tests

### Phase 3: Matching Service (2 days)
- [ ] Create `/api/contacts/match-mentions` endpoint
- [ ] Implement exact matching
- [ ] Implement pg_trgm fuzzy matching
- [ ] Add match confidence scoring

### Phase 4: UI Components (3 days)
- [ ] Create `MentionedPersonCard` component
- [ ] Create `MentionedPeopleSection` component
- [ ] Add animations and transitions
- [ ] Implement expand/collapse functionality

### Phase 5: Integration (2 days)
- [ ] Integrate with enrichment session page
- [ ] Connect to CompletionCelebration
- [ ] Create `/api/contacts/mentions/[id]` action endpoint
- [ ] Implement link/create/dismiss flows

### Phase 6: Polish & Testing (2 days)
- [ ] E2E test coverage
- [ ] Error handling and edge cases
- [ ] Loading states
- [ ] Documentation updates

---

## 10. Rollout Plan

1. **Development:** Feature branch `feature/enrichment-mentioned-contacts`
2. **Testing:** E2E tests + manual QA with real transcripts
3. **Staging:** Deploy to preview environment
4. **Production:** Full rollout (no feature flag needed for V1)

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mention detection rate | >80% | Manual audit of 50 enrichments |
| Match accuracy | >75% | Correct matches / total confident matches |
| Action completion rate | >50% | Actions taken / total mentions shown |
| Error rate | <1% | API errors / total requests |
| Latency | <3s | Time from session complete to UI render |

---

## 12. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Card ordering? | Confidence-based: Exact → Fuzzy → Unknown |
| Max mentions displayed? | 5 with "Show more" |
| Relationship direction? | Bidirectional (A↔B) |
| Database provider? | Supabase PostgreSQL |
| Phonetic matching? | Nice-to-have, defer until needed |

---

## 13. References

- [Ideation Document](./01-ideation.md)
- [Smart Voice Enrichment Spec](../smart-voice-enrichment/02-specification.md)
- [Vercel AI SDK Structured Outputs](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
