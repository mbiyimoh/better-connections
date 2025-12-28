import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mergeNotesWithAI, refineNotesWithAI } from "@/lib/openai";

// Match the max length used in extract route
const MAX_NOTES_LENGTH = 4000;

export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    // Parse request - supports both legacy (rawNotes) and new (existingNotes + newContent) formats
    const body = await request.json();
    const { existingNotes, newContent, rawNotes } = body;

    // Support legacy format: rawNotes becomes newContent
    const actualNewContent = newContent ?? rawNotes;

    if (typeof actualNewContent !== "string") {
      return NextResponse.json(
        { error: "Invalid request: newContent (or rawNotes) must be a string" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Validate existingNotes if provided
    if (existingNotes !== undefined && typeof existingNotes !== "string") {
      return NextResponse.json(
        { error: "Invalid request: existingNotes must be a string" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const trimmedNew = actualNewContent.trim();
    const trimmedExisting = (existingNotes || "").trim();

    // Skip if no new content to process
    if (!trimmedNew || trimmedNew.length < 20) {
      return NextResponse.json(
        { refinedNotes: trimmedExisting || trimmedNew, changeSummary: "" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Truncate if too long
    const sanitizedNew = trimmedNew.slice(0, MAX_NOTES_LENGTH);
    const sanitizedExisting = trimmedExisting.slice(0, MAX_NOTES_LENGTH);

    // Use merge when there are existing notes, otherwise just refine
    let refinedNotes: string;
    let changeSummary: string = "";

    if (sanitizedExisting) {
      const result = await mergeNotesWithAI(sanitizedExisting, sanitizedNew);
      refinedNotes = result.mergedNotes;
      changeSummary = result.changeSummary;
    } else {
      refinedNotes = await refineNotesWithAI(sanitizedNew);
      changeSummary = "Created initial notes from conversation";
    }

    return NextResponse.json(
      { refinedNotes, changeSummary },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Notes refinement error:", error);
    return NextResponse.json(
      { error: "Failed to refine notes" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
