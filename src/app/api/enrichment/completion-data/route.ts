import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

interface CompletionDataResponse {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    enrichmentScore: number;
  };
  ranking: {
    currentRank: number;
    previousRank: number;
    totalContacts: number;
    percentile: number;
  };
  streak: {
    count: number;
    weekStart: string;
  };
  scoreDelta: number;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const previousScore = parseInt(searchParams.get("previousScore") || "0");

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get contact with new score
    const contact = await prisma.contact.findUnique({
      where: { id: contactId, userId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrichmentScore: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get all contacts for ranking calculation
    const allContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, enrichmentScore: true },
      orderBy: { enrichmentScore: "desc" },
    });

    // Calculate current rank (1-indexed)
    const currentRank =
      allContacts.findIndex((c: { id: string; enrichmentScore: number }) => c.id === contactId) + 1;

    // Calculate previous rank - where would previousScore have placed?
    const contactsWithHigherScore = allContacts.filter(
      (c: { id: string; enrichmentScore: number }) => c.id !== contactId && c.enrichmentScore > previousScore
    ).length;
    const previousRank = contactsWithHigherScore + 1;

    // Get/update streak
    const weekStart = getWeekStart(new Date());
    const streak = await prisma.enrichmentStreak.upsert({
      where: {
        userId_weekStart: { userId: user.id, weekStart },
      },
      update: { contactsEnriched: { increment: 1 } },
      create: { userId: user.id, weekStart, contactsEnriched: 1 },
    });

    const response: CompletionDataResponse = {
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        enrichmentScore: contact.enrichmentScore,
      },
      ranking: {
        currentRank,
        previousRank,
        totalContacts: allContacts.length,
        percentile: Math.round((1 - currentRank / allContacts.length) * 100),
      },
      streak: {
        count: streak.contactsEnriched,
        weekStart: weekStart.toISOString(),
      },
      scoreDelta: contact.enrichmentScore - previousScore,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Completion data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion data" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
