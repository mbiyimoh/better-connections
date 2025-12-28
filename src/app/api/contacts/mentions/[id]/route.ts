import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

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
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
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

  await prisma.contact.update({ where: { id: contactId }, data: updates });
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
