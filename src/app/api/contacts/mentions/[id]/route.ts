import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { calculateEnrichmentScore } from "@/lib/enrichment";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["link", "create", "dismiss"]),
  linkedContactId: z.string().optional(),
  newContactData: z
    .object({
      firstName: z.string(),
      lastName: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { action, linkedContactId, newContactData } = actionSchema.parse(body);

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
        await addContextToContact(
          linkedContactId,
          mention.extractedContext,
          mention.inferredFields
        );
        break;

      case "create":
        if (!newContactData) {
          return NextResponse.json(
            { error: "newContactData required for create action" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        const inferredFields = mention.inferredFields as Record<
          string,
          string
        > | null;
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
            enrichmentScore: calculateEnrichmentScore({
              firstName: newContactData.firstName,
              lastName: newContactData.lastName,
              title: newContactData.title || inferredFields?.title,
              company: newContactData.company || inferredFields?.company,
              notes: mention.extractedContext,
              expertise: inferredFields?.expertise,
              whyNow: inferredFields?.whyNow,
            }, 0), // 0 tags for new contact
          },
        });
        targetContactId = newContact.id;
        break;

      case "dismiss":
        break;
    }

    // Update mention status
    await prisma.contactMention.update({
      where: { id },
      data: {
        status:
          action === "link"
            ? "LINKED"
            : action === "create"
              ? "CREATED"
              : "DISMISSED",
        mentionedContactId: targetContactId,
        processedAt: new Date(),
      },
    });

    // Create bidirectional relationship if linked or created
    if (targetContactId && action !== "dismiss") {
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
    include: { tags: true },
  });
  if (!contact) return;

  const updates: Record<string, unknown> = {};
  const fields = inferredFields as Record<string, string> | null;

  const attribution = `\n\n[Mentioned during enrichment - ${new Date().toLocaleDateString()}]\n${context}`;
  updates.notes = contact.notes ? contact.notes + attribution : attribution;

  if (fields) {
    if (!contact.title && fields.title) updates.title = fields.title;
    if (!contact.company && fields.company) updates.company = fields.company;
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

  // Recalculate enrichment score with new fields
  const updatedContact = { ...contact, ...updates };
  updates.enrichmentScore = calculateEnrichmentScore(
    {
      firstName: updatedContact.firstName as string,
      lastName: updatedContact.lastName as string | null,
      primaryEmail: updatedContact.primaryEmail as string | null,
      title: updatedContact.title as string | null,
      company: updatedContact.company as string | null,
      location: updatedContact.location as string | null,
      linkedinUrl: updatedContact.linkedinUrl as string | null,
      howWeMet: updatedContact.howWeMet as string | null,
      whyNow: updatedContact.whyNow as string | null,
      notes: updatedContact.notes as string | null,
      expertise: updatedContact.expertise as string | null,
    },
    contact.tags.length
  );

  // Update lastEnrichedAt since we're adding context
  updates.lastEnrichedAt = new Date();

  await prisma.contact.update({ where: { id: contactId }, data: updates });
}

