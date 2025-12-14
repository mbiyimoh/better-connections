import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all contacts for the user
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: {
        enrichmentScore: true,
        lastEnrichedAt: true,
      },
    });

    const totalContacts = contacts.length;
    const fullyEnriched = contacts.filter((c) => c.enrichmentScore >= 100).length;
    const needsEnrichment = totalContacts - fullyEnriched;

    // Calculate average score
    const averageScore = totalContacts > 0
      ? Math.round(contacts.reduce((sum, c) => sum + c.enrichmentScore, 0) / totalContacts)
      : 0;

    // Count by score ranges for priority levels
    const highPriority = contacts.filter((c) => c.enrichmentScore < 30).length;
    const mediumPriority = contacts.filter((c) => c.enrichmentScore >= 30 && c.enrichmentScore < 70).length;
    const lowPriority = contacts.filter((c) => c.enrichmentScore >= 70 && c.enrichmentScore < 100).length;

    // Count contacts enriched this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const enrichedThisWeek = contacts.filter(
      (c) => c.lastEnrichedAt && c.lastEnrichedAt > oneWeekAgo
    ).length;

    return NextResponse.json({
      totalContacts,
      fullyEnriched,
      needsEnrichment,
      averageScore,
      byPriority: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority,
      },
      enrichedThisWeek,
    });
  } catch (error) {
    console.error("Error fetching enrichment stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrichment stats" },
      { status: 500 }
    );
  }
}
