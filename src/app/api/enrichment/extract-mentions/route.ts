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

    // 2. Validate request
    const body = await request.json();
    const { transcript, primaryContactName, existingContactNames } =
      mentionExtractionRequestSchema.parse(body);

    // 3. Skip if transcript too short
    if (transcript.trim().length < 20) {
      return NextResponse.json(
        { mentions: [], primaryContactContext: null },
        { headers: { "Cache-Control": "no-store" } }
      );
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

    // 6. Validate and sanitize mentions
    const validatedMentions = object.mentions
      .filter((m) => {
        const normalized = m.normalizedName.trim();
        // Filter out empty, too short, or too long names
        return normalized.length >= 2 && normalized.length <= 100;
      })
      .map((m) => ({
        ...m,
        normalizedName: m.normalizedName.trim(),
        name: m.name.trim(),
        context: m.context.trim().slice(0, 500), // Prevent context bloat
      }));

    return NextResponse.json(
      {
        mentions: validatedMentions,
        primaryContactContext: object.primaryContactContext?.trim() || null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Mention extraction error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract mentions" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
