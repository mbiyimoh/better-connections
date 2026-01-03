import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mentions: z.array(
    z.object({
      name: z.string(),
      normalizedName: z.string(),
      context: z.string(),
      inferredDetails: z.record(z.string(), z.string()).nullable().optional(),
    })
  ),
  sourceContactId: z.string(),
});

const FUZZY_THRESHOLD = 0.3;

// Scoring weights for context-aware matching
// Total should equal 1.0 for normalized 0-1 confidence scores
const SCORING_WEIGHTS = {
  NAME: 0.5,      // Name similarity contributes up to 50%
  COMPANY: 0.3,   // Company match adds 30%
  DOMAIN: 0.2,    // Email domain match adds 20%
} as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json();
    const { mentions, sourceContactId } = requestSchema.parse(body);

    if (mentions.length === 0) {
      return NextResponse.json(
        { matches: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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
        primaryEmail: true,
        enrichmentScore: true,
      },
    });

    const matches: MentionMatch[] = await Promise.all(
      mentions.map(async (mention) => {
        const result = await matchMention(mention, contacts, user.id);
        return result;
      })
    );

    // Save mentions to database and add mentionId to response
    const savedMatches = await Promise.all(
      matches.map(async (match) => {
        const savedMention = await prisma.contactMention.create({
          data: {
            userId: user.id,
            sourceContactId,
            mentionedName: match.name,
            normalizedName: match.normalizedName,
            extractedContext: match.context,
            inferredFields: match.inferredDetails || Prisma.JsonNull,
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
  primaryEmail: string | null;
  enrichmentScore: number;
}

// Context-aware scoring result
interface ScoredMatch {
  contact: ContactForMatching;
  score: number;
  reasons: string[];
}

/**
 * Score a contact match using context signals (company, email domain).
 * This is the core fix for the "wrong Scott" bug.
 *
 * @param nameSimilarity - pg_trgm similarity score (0-1)
 * @returns ScoredMatch with normalized score (0-1) and human-readable reasons
 */
function scoreMatchWithContext(
  contact: ContactForMatching,
  mentionContext: string,
  nameSimilarity: number
): ScoredMatch {
  const reasons: string[] = [];
  let score = 0;
  const contextLower = mentionContext.toLowerCase();

  // Name similarity (0-0.5 range)
  score += nameSimilarity * SCORING_WEIGHTS.NAME;
  reasons.push(`Name: ${Math.round(nameSimilarity * 100)}% match`);

  // Company match (adds 0.3) - THE KEY FIX
  const normalizedCompany = contact.company?.trim().toLowerCase();
  if (normalizedCompany && contextLower.includes(normalizedCompany)) {
    score += SCORING_WEIGHTS.COMPANY;
    reasons.push(`Company: ${contact.company}`);
  }

  // Email domain match (adds 0.2)
  if (contact.primaryEmail && contact.primaryEmail.includes("@")) {
    const domain = contact.primaryEmail.split("@")[1]?.trim();
    if (domain && domain.length > 0 && contextLower.includes(domain.toLowerCase())) {
      score += SCORING_WEIGHTS.DOMAIN;
      reasons.push(`Domain: @${domain}`);
    }
  }

  // Cap at 1.0 to ensure valid confidence range
  return { contact, score: Math.min(score, 1.0), reasons };
}

async function matchMention(
  mention: {
    name: string;
    normalizedName: string;
    context: string;
    inferredDetails?: Record<string, string> | null;
  },
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
    // Score exact match to get reasons
    const scored = scoreMatchWithContext(exactMatch, mention.context, 1.0);
    return {
      name: mention.name,
      normalizedName: mention.normalizedName,
      context: mention.context,
      inferredDetails: mention.inferredDetails,
      matchType: "EXACT",
      confidence: 1.0,
      matchedContact: exactMatch,
      matchReasons: scored.reasons,
      alternativeMatches: [],
    };
  }

  // 2. Try fuzzy match via pg_trgm
  const fuzzyMatches = await prisma.$queryRaw<
    Array<{
      id: string;
      firstName: string;
      lastName: string | null;
      similarity: number;
    }>
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
    LIMIT 10
  `;

  if (fuzzyMatches.length > 0) {
    // Score ALL matches with context, then sort by composite score
    const scoredMatches = fuzzyMatches
      .map((match) => {
        const contact = contacts.find((c) => c.id === match.id);
        if (!contact) return null;
        return scoreMatchWithContext(contact, mention.context, match.similarity);
      })
      .filter((m): m is ScoredMatch => m !== null)
      .sort((a, b) => b.score - a.score);

    const bestMatch = scoredMatches[0];
    if (bestMatch) {
      const alternatives = scoredMatches.slice(1);

      return {
        name: mention.name,
        normalizedName: mention.normalizedName,
        context: mention.context,
        inferredDetails: mention.inferredDetails,
        matchType: "FUZZY",
        confidence: bestMatch.score,
        matchedContact: bestMatch.contact,
        matchReasons: bestMatch.reasons,
        alternativeMatches: alternatives.map((alt) => ({
          id: alt.contact.id,
          firstName: alt.contact.firstName,
          lastName: alt.contact.lastName,
          company: alt.contact.company,
          confidence: alt.score,
          matchReasons: alt.reasons,
        })),
      };
    }
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
    matchReasons: [],
    alternativeMatches: [],
  };
}
