import { generateText } from "ai";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { gpt4oMini, DRAFT_INTRO_SYSTEM_PROMPT } from "@/lib/openai";
import { NextResponse } from "next/server";

// Input validation schema
const draftIntroRequestSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  intent: z.string().max(1000).optional(),
});

// Cache-control headers for responses
const cacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: cacheHeaders }
      );
    }

    const body = await request.json();
    const { contactId, intent } = draftIntroRequestSchema.parse(body);

    // Fetch the contact
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: user.id,
      },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404, headers: cacheHeaders }
      );
    }

    // Build context for the intro
    const contextParts: string[] = [];
    contextParts.push(`Contact: ${contact.name}`);
    if (contact.title && contact.company) {
      contextParts.push(`Role: ${contact.title} at ${contact.company}`);
    }
    if (contact.howWeMet) {
      contextParts.push(`How we know each other: ${contact.howWeMet}`);
    }
    if (contact.whyNow) {
      contextParts.push(`Why reaching out now: ${contact.whyNow}`);
    }
    if (contact.expertise) {
      contextParts.push(`Their expertise: ${contact.expertise}`);
    }
    if (contact.interests) {
      contextParts.push(`Their interests: ${contact.interests}`);
    }
    if (intent) {
      contextParts.push(`User's goal for this outreach: ${intent}`);
    }

    const userPrompt = contextParts.join("\n");

    const { text } = await generateText({
      model: gpt4oMini,
      system: DRAFT_INTRO_SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    return NextResponse.json(
      {
        intro: text,
        contact: {
          id: contact.id,
          name: contact.name,
          title: contact.title,
          company: contact.company,
        },
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400, headers: cacheHeaders }
      );
    }
    console.error("Draft intro error:", error);
    return NextResponse.json(
      { error: "Failed to generate intro" },
      { status: 500, headers: cacheHeaders }
    );
  }
}
