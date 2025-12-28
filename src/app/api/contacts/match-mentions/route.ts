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
  enrichmentScore: number;
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
    LIMIT 5
  `;

  const bestMatch = fuzzyMatches[0];
  if (bestMatch) {
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
