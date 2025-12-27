import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { gpt4oMini, ENRICHMENT_EXTRACTION_SYSTEM_PROMPT } from "@/lib/openai";
import {
  enrichmentExtractionRequestSchema,
  enrichmentExtractionResponseSchema,
} from "@/lib/schemas/enrichmentInsight";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const parseResult = enrichmentExtractionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { transcript, contactContext } = parseResult.data;

    // Skip if transcript too short
    if (transcript.trim().length < 10) {
      return NextResponse.json({ insights: [] });
    }

    // Simple sanitization - slice to 4000 chars
    const sanitizedTranscript = transcript.slice(0, 4000);

    // Build user prompt with contact context
    let userPrompt = `Extract insights from this spoken transcript about a contact:\n\n"${sanitizedTranscript}"`;

    if (contactContext) {
      const contextParts: string[] = [];
      if (contactContext.name) contextParts.push(`Name: ${contactContext.name}`);
      if (contactContext.title) contextParts.push(`Current title: ${contactContext.title}`);
      if (contactContext.company) contextParts.push(`Current company: ${contactContext.company}`);
      if (contactContext.howWeMet) contextParts.push(`How we met: ${contactContext.howWeMet}`);
      if (contactContext.whyNow) contextParts.push(`Why now: ${contactContext.whyNow}`);
      if (contactContext.expertise) contextParts.push(`Known expertise: ${contactContext.expertise}`);
      if (contactContext.interests) contextParts.push(`Known interests: ${contactContext.interests}`);

      if (contextParts.length > 0) {
        userPrompt += `\n\nExisting contact context:\n${contextParts.join("\n")}`;
      }
    }

    // Call generateObject with structured schema
    const result = await generateObject({
      model: gpt4oMini,
      system: ENRICHMENT_EXTRACTION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: enrichmentExtractionResponseSchema,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Enrichment extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract insights" },
      { status: 500 }
    );
  }
}
