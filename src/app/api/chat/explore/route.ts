import { streamText } from "ai";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { gpt4oMini } from "@/lib/openai";
import { buildExploreSystemPrompt } from "@/lib/clarity-canvas/prompts";
import { shouldRefreshSynthesis, fetchAndCacheSynthesis } from "@/lib/clarity-canvas/client";
import type { BaseSynthesis } from "@/lib/clarity-canvas/types";

// Input validation schema
const exploreRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
});

// Sanitize text for prompt injection prevention
function sanitizeForPrompt(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/(\[SYSTEM\]|\[ASSISTANT\]|\[USER\])/gi, "")
    .replace(/```/g, "'''")
    .substring(0, 500);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = await request.json();
    const validatedInput = exploreRequestSchema.parse(body);

    // Fetch user with Clarity Canvas data
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        clarityCanvasConnected: true,
        clarityCanvasSynthesis: true,
        clarityCanvasSyncedAt: true,
      },
    });

    // Get synthesis if connected, with auto-refresh check
    let synthesis: BaseSynthesis | null = null;
    let synthesisError = false;

    if (dbUser?.clarityCanvasConnected) {
      try {
        synthesis = dbUser.clarityCanvasSynthesis as BaseSynthesis | null;

        // If synthesis is stale (>24h), try to refresh in background
        if (shouldRefreshSynthesis(dbUser.clarityCanvasSyncedAt)) {
          // Attempt refresh, but don't block on it
          void fetchAndCacheSynthesis(user.id).then((result) => {
            if (!result.success) {
              console.error('[clarity-canvas] Background refresh failed:', result.error);
            }
          });
        }
      } catch (error) {
        console.error('[clarity-canvas] Failed to get synthesis:', error);
        synthesisError = true;
      }
    }

    // Fetch user's contacts for context (limit to prevent token overflow)
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      include: { tags: true },
      take: 50,
      orderBy: { enrichmentScore: "desc" },
    });

    // Serialize contacts for prompt context with sanitization
    const contactContext = contacts.map((c) => ({
      id: c.id,
      name: `${sanitizeForPrompt(c.firstName)}${c.lastName ? ' ' + sanitizeForPrompt(c.lastName) : ''}`,
      email: sanitizeForPrompt(c.primaryEmail),
      title: sanitizeForPrompt(c.title),
      company: sanitizeForPrompt(c.company),
      location: sanitizeForPrompt(c.location),
      howWeMet: sanitizeForPrompt(c.howWeMet),
      whyNow: sanitizeForPrompt(c.whyNow),
      expertise: sanitizeForPrompt(c.expertise),
      interests: sanitizeForPrompt(c.interests),
      relationshipStrength: c.relationshipStrength,
      tags: c.tags.map((t) => sanitizeForPrompt(t.text)),
    }));

    // Build enhanced system prompt with Clarity Canvas context
    const systemPrompt = `${buildExploreSystemPrompt(synthesis)}

## User's Contacts (${contacts.length} total)
${JSON.stringify(contactContext, null, 2)}

CRITICAL: When suggesting contacts, you MUST use their exact "id" field value from the JSON above.
Example: If a contact has "id": "cm4z5abc123", write [CONTACT: cm4z5abc123] NOT [CONTACT: their-email@example.com]
The id field looks like "cm..." followed by random characters. Always use this exact id value.`;

    const result = streamText({
      model: gpt4oMini(),
      system: systemPrompt,
      messages: validatedInput.messages,
    });

    const response = result.toTextStreamResponse();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    // Add error flag for client-side toast
    if (synthesisError) {
      response.headers.set('X-Clarity-Canvas-Error', 'true');
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request body", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("Chat exploration error:", error);
    return new Response("Failed to process chat request", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
