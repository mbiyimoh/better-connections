import { createOpenAI } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";

// Validate API key format (don't throw at module load to avoid build issues)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn(
    "Warning: OPENAI_API_KEY environment variable is not set. " +
      "AI features will not work. Get your key from https://platform.openai.com/api-keys"
  );
} else if (!apiKey.startsWith("sk-")) {
  console.warn(
    "Warning: OPENAI_API_KEY doesn't start with 'sk-'. " +
      "This may indicate an invalid key format."
  );
}

// Create OpenAI client with environment variable
const openai = createOpenAI({
  apiKey: apiKey,
});

export const gpt4oMini = openai("gpt-4o-mini");

// Chat Exploration System Prompt
export const EXPLORATION_SYSTEM_PROMPT = `You are an AI assistant helping a user explore their professional network.
You have access to their contact database.

When suggesting contacts, ALWAYS format them using this exact format:
[CONTACT: {contact_id}] {name} - {reason_for_suggestion}

For each suggested contact, provide a "Why Now" explanation that:
- Is contextual to the user's current query
- References specific attributes of the contact
- Explains the strategic value of reaching out

Guidelines:
- Be helpful, concise, and focus on actionable insights
- Suggest 2-5 relevant contacts per response
- If no contacts match, say so and suggest alternative approaches
- Ask clarifying questions when the user's intent is unclear`;

// Draft Intro System Prompt
export const DRAFT_INTRO_SYSTEM_PROMPT = `Write a brief, warm introduction message. The email should:
- Feel personal, not templated
- Reference shared context when available
- Have a clear but soft ask
- Match a professional but warm tone
- Be 2-3 sentences maximum

Do NOT include a subject line. Just write the body of the message.`;

// Tag Suggestion System Prompt
export const TAG_SUGGESTION_SYSTEM_PROMPT = `Based on the contact information provided, suggest relevant tags.
Categories available:
- RELATIONSHIP: How you know them (e.g., "met at conference", "mutual connection")
- OPPORTUNITY: Business potential (e.g., "potential investor", "partnership lead")
- EXPERTISE: Their skills (e.g., "marketing expert", "engineering leader")
- INTEREST: Personal interests (e.g., "hiking", "board games")

Return a JSON array of objects with "text" and "category" fields.
Limit to 5 most relevant tags.`;

// Enrichment Extraction System Prompt (for voice-to-insight extraction)
export const ENRICHMENT_EXTRACTION_SYSTEM_PROMPT = `You are a CRM insight extraction assistant. Your task is to extract structured professional relationship context from spoken transcripts about contacts.

## Your Role
Extract ONLY information that is explicitly stated or very strongly implied. Never guess.

## Categories
- **relationship**: How the user knows this person (met at, introduced by, worked together)
- **opportunity**: Business potential, why reaching out now, investment/funding context
- **expertise**: Professional skills, job role, domain knowledge
- **interest**: Personal hobbies, passions, non-work activities

## Field Priority (by CRM value)
1. **whyNow** (20 pts) - Time-sensitive relevance
2. **howWeMet** (15 pts) - Relationship origin
3. **title** (10 pts) - Professional role
4. **company** (10 pts) - Organization

## Extraction Rules
1. Extract multiple insights if transcript contains multiple pieces of info
2. Keep capturedText concise (3-10 words)
3. Use null for fields not mentioned
4. Infer job titles only if role clearly described

## Examples

Input: "He manages money for Thaddeus Young"
Output: [{
  "capturedText": "Manages money for NBA players",
  "category": "expertise",
  "title": "Financial Manager",
  "expertise": "Athlete wealth management"
}]

Input: "Met at TechCrunch, she's raising a Series A"
Output: [
  {"capturedText": "Met at TechCrunch conference", "category": "relationship", "howWeMet": "TechCrunch conference"},
  {"capturedText": "Raising Series A", "category": "opportunity", "whyNow": "Looking to raise Series A"}
]

Input: "um, so yeah, I don't know"
Output: { "insights": [] }

## Important
- Return empty insights array if no extractable information
- Never make up information not present in transcript`;

// Mention Extraction System Prompt (for detecting other people in enrichment transcripts)
export const MENTION_EXTRACTION_SYSTEM_PROMPT = `You are analyzing a transcript from a CRM enrichment session. Your task is to identify OTHER PEOPLE mentioned (not the primary contact being enriched) and extract context about them.

## Your Role
Extract mentions of other people and what was said about them. The primary contact is provided - do NOT include them in your output.

## What to Extract

For each mentioned person:
1. **name**: The name as spoken (e.g., "Mike", "Sarah Chen", "my friend John")
2. **normalizedName**: Clean version for matching (e.g., "Mike" -> "Mike", "my buddy John Smith" -> "John Smith")
3. **context**: What was said about them (1-3 sentences, preserve key details)
4. **category**: Primary category - relationship, opportunity, expertise, or interest
5. **inferredDetails**: Structured data if clearly stated:
   - title: Job title if mentioned
   - company: Company/org if mentioned
   - expertise: Skills/domain if mentioned
   - whyNow: Time-sensitive relevance if mentioned

## Rules

1. **Exclude the primary contact** - They are already being enriched
2. **Only extract named people** - Skip generic references like "someone" or "a friend"
3. **Preserve specifics** - Keep names, companies, projects exactly as stated
4. **Don't invent details** - Only include what's explicitly stated or strongly implied
5. **Group context** - If same person mentioned multiple times, combine context
6. **Handle nicknames** - "Mike" and "Michael" mentioned together = one person

## Examples

**Primary Contact:** Sarah Chen
**Transcript:** "Sarah introduced me to her co-founder Mike at the conference. He's the CTO and really into AI agents. They're both raising a Series A."

**Output:**
{
  "mentions": [
    {
      "name": "Mike",
      "normalizedName": "Mike",
      "context": "Sarah's co-founder, CTO who is really into AI agents. They're raising a Series A.",
      "category": "opportunity",
      "inferredDetails": {
        "title": "CTO",
        "expertise": "AI agents",
        "whyNow": "Raising Series A"
      }
    }
  ],
  "primaryContactContext": "Raising a Series A"
}

**Transcript:** "um yeah so that's about it for now"
**Output:** { "mentions": [], "primaryContactContext": null }

## Important
- Return empty mentions array if no other people are mentioned
- Focus on quality over quantity - only actionable mentions`;

// Notes Merge System Prompt (for intelligently combining existing notes with new content)
export const NOTES_MERGE_SYSTEM_PROMPT = `You are a note-merging assistant for a personal CRM. Your task is to intelligently combine existing notes about a contact with new information from a recent conversation.

## Your Goal
Create a single, unified set of notes that:
1. Preserves all important information from BOTH existing notes and new content
2. Removes duplicates (if the same fact appears in both, keep it only once)
3. Updates outdated information with newer details when there's a clear update
4. Organizes information logically by topic

## Rules
1. **Preserve ALL specific details** - Names, dates, numbers, companies, amounts, locations must be kept exactly
2. **Deduplicate intelligently** - If existing notes say "Works at Acme Corp" and new content says "she works at Acme", keep just one
3. **Prefer newer info for updates** - If existing says "raising Series A" and new says "closed Series A at $5M", use the updated version
4. **Keep unique info from both** - Don't drop information just because it's only in one source
5. **Use clear bullet format** - Start each point with "•" and keep each bullet to 1-2 sentences max
6. **Remove filler** - Clean up verbal tics (um, uh, like, so yeah) from new content
7. **Don't add information** - Only include what was explicitly stated in either source

## Output
Return a JSON object with:
- mergedNotes: The combined bullet points
- changeSummary: A brief 1-sentence summary of what changed (e.g., "Added 2 new points about hiring; updated Series A status to closed")

## Example

Existing Notes:
• Met Sarah at TechCrunch conference in Austin
• She works on AI agents
• Raising Series A

New Content:
"talked to Sarah again, she closed her Series A at 5 million from Sequoia, um she's now hiring engineers and looking for a head of product"

Output:
{
  "mergedNotes": "• Met Sarah at TechCrunch conference in Austin\\n• She works on AI agents\\n• Closed Series A at $5M from Sequoia\\n• Currently hiring engineers\\n• Looking for a Head of Product",
  "changeSummary": "Updated Series A to closed at $5M from Sequoia; added hiring for engineers and Head of Product"
}`;

// Schema for merge result
const mergeResultSchema = z.object({
  mergedNotes: z.string().describe("The merged bullet points"),
  changeSummary: z.string().describe("Brief 1-sentence summary of what changed"),
});

export type MergeResult = z.infer<typeof mergeResultSchema>;

/**
 * Merges existing notes with new content intelligently using AI.
 * Deduplicates, updates outdated info, and organizes logically.
 * Returns both merged notes and a summary of changes.
 */
export async function mergeNotesWithAI(
  existingNotes: string,
  newContent: string
): Promise<MergeResult> {
  const trimmedExisting = existingNotes.trim();
  const trimmedNew = newContent.trim();

  // If no new content, return existing as-is
  if (!trimmedNew || trimmedNew.length < 20) {
    return {
      mergedNotes: trimmedExisting,
      changeSummary: "",
    };
  }

  // If no existing notes, just refine the new content
  if (!trimmedExisting) {
    const refined = await refineNotesWithAI(trimmedNew);
    return {
      mergedNotes: refined,
      changeSummary: "Created initial notes from conversation",
    };
  }

  try {
    const prompt = `Existing Notes:
${trimmedExisting}

New Content:
"${trimmedNew}"`;

    const result = await generateObject({
      model: gpt4oMini,
      system: NOTES_MERGE_SYSTEM_PROMPT,
      prompt,
      schema: mergeResultSchema,
    });

    return {
      mergedNotes: result.object.mergedNotes || `${trimmedExisting}\n\n${trimmedNew}`,
      changeSummary: result.object.changeSummary || "",
    };
  } catch (error) {
    console.error("Failed to merge notes with AI:", error);
    // Gracefully fall back to simple append
    return {
      mergedNotes: `${trimmedExisting}\n\n${trimmedNew}`,
      changeSummary: "Added new notes (AI merge unavailable)",
    };
  }
}

/**
 * Refines raw transcript/braindump text into structured bullet points.
 * Used when there are no existing notes to merge with.
 */
export async function refineNotesWithAI(rawNotes: string): Promise<string> {
  const trimmed = rawNotes.trim();
  if (!trimmed || trimmed.length < 20) {
    return trimmed;
  }

  try {
    // Use a simpler prompt for pure refinement (no merge needed)
    const { text } = await generateText({
      model: gpt4oMini,
      system: `You are a note-formatting assistant. Convert this unstructured text into clean bullet points.

Rules:
• Preserve ALL specific details (names, dates, numbers, companies)
• Remove filler words (um, uh, like, you know, so yeah)
• Use "•" for each bullet point
• Keep each bullet to 1-2 sentences max
• Don't add information not in the original

Return ONLY the bullet points, nothing else.`,
      prompt: trimmed,
    });

    return text.trim() || trimmed;
  } catch (error) {
    console.error("Failed to refine notes with AI:", error);
    return trimmed;
  }
}
