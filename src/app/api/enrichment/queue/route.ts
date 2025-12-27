import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { getEnrichmentPriority, getPriorityLevel, getEnrichmentReason } from "@/lib/enrichment";
import { ContactSource } from "@prisma/client";

const validSources = Object.values(ContactSource);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const priorityFilter = searchParams.get("priority"); // 'high', 'medium', 'low', or null for all
    const sourceParam = searchParams.get("source");

    // Validate source filter against enum
    const sourceFilter = sourceParam && validSources.includes(sourceParam as ContactSource)
      ? (sourceParam as ContactSource)
      : undefined;

    // Get contacts that need enrichment (score < 100)
    const contacts = await prisma.contact.findMany({
      where: {
        userId: user.id,
        enrichmentScore: { lt: 100 },
        ...(sourceFilter && { source: sourceFilter }),
      },
      include: {
        tags: true,
      },
      orderBy: [
        { enrichmentScore: "asc" },
        { lastEnrichedAt: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Calculate priority for each contact and add metadata
    const enrichedContacts = contacts.map((contact) => {
      const priority = getEnrichmentPriority({
        enrichmentScore: contact.enrichmentScore,
        lastEnrichedAt: contact.lastEnrichedAt,
        createdAt: contact.createdAt,
      });
      const priorityLevel = getPriorityLevel(priority);
      const reason = getEnrichmentReason({
        firstName: contact.firstName,
        lastName: contact.lastName,
        primaryEmail: contact.primaryEmail,
        secondaryEmail: contact.secondaryEmail,
        primaryPhone: contact.primaryPhone,
        secondaryPhone: contact.secondaryPhone,
        title: contact.title,
        company: contact.company,
        location: contact.location,
        linkedinUrl: contact.linkedinUrl,
        howWeMet: contact.howWeMet,
        whyNow: contact.whyNow,
        notes: contact.notes,
        expertise: contact.expertise,
        interests: contact.interests,
        lastEnrichedAt: contact.lastEnrichedAt,
        createdAt: contact.createdAt,
      });

      return {
        ...contact,
        priority,
        priorityLevel,
        enrichmentReason: reason,
      };
    });

    // Sort by priority (highest first)
    enrichedContacts.sort((a, b) => b.priority - a.priority);

    // Apply priority filter if specified
    const filteredContacts = priorityFilter
      ? enrichedContacts.filter((c) => c.priorityLevel === priorityFilter)
      : enrichedContacts;

    // Apply limit
    const limitedContacts = filteredContacts.slice(0, limit);

    return NextResponse.json({
      contacts: limitedContacts,
      total: filteredContacts.length,
    });
  } catch (error) {
    console.error("Error fetching enrichment queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrichment queue" },
      { status: 500 }
    );
  }
}
