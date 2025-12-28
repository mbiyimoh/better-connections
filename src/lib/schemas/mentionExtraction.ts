import { z } from "zod";

// Single person mention extracted from transcript
export const personMentionSchema = z.object({
  name: z
    .string()
    .describe("The person's name as mentioned in the transcript"),

  normalizedName: z
    .string()
    .describe("Cleaned/normalized version (e.g., 'Mike' from 'my friend Mike')"),

  context: z
    .string()
    .describe("What was said about this person - 1-3 sentences max"),

  category: z
    .enum(["relationship", "opportunity", "expertise", "interest"])
    .nullable()
    .optional()
    .describe("Primary category of the context"),

  inferredDetails: z
    .object({
      title: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      expertise: z.string().nullable().optional(),
      whyNow: z.string().nullable().optional(),
    })
    .nullable()
    .optional()
    .describe("Structured fields inferred from context"),
});

// API response from mention extraction
export const mentionExtractionResponseSchema = z.object({
  mentions: z
    .array(personMentionSchema)
    .describe("People mentioned in the transcript, excluding the primary contact"),

  primaryContactContext: z
    .string()
    .nullable()
    .optional()
    .describe("Any context that applies to the primary contact being enriched"),
});

// API request for mention extraction
export const mentionExtractionRequestSchema = z.object({
  transcript: z.string().min(10).max(10000),
  primaryContactName: z.string().describe("Name of the contact being enriched"),
  existingContactNames: z
    .array(z.string())
    .optional()
    .describe("Names of user's existing contacts for context"),
});

// Match result for a single mention
export const mentionMatchSchema = z.object({
  mentionId: z.string().optional(), // If already saved to DB
  name: z.string(),
  normalizedName: z.string(),
  context: z.string(),
  inferredDetails: z.record(z.string(), z.string()).nullable().optional(),

  // Match result
  // PHONETIC reserved for future double-metaphone implementation
  matchType: z.enum(["EXACT", "FUZZY", "PHONETIC", "NONE"]),
  confidence: z.number().min(0).max(1),

  // Matched contact (if found)
  matchedContact: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string().nullable(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      enrichmentScore: z.number(),
    })
    .nullable(),

  // Alternative matches for fuzzy/phonetic
  alternativeMatches: z
    .array(
      z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string().nullable(),
        similarity: z.number(),
      })
    )
    .optional(),
});

export const matchMentionsResponseSchema = z.object({
  matches: z.array(mentionMatchSchema),
});

// Types
export type PersonMention = z.infer<typeof personMentionSchema>;
export type MentionExtractionResponse = z.infer<typeof mentionExtractionResponseSchema>;
export type MentionExtractionRequest = z.infer<typeof mentionExtractionRequestSchema>;
export type MentionMatch = z.infer<typeof mentionMatchSchema>;
export type MatchMentionsResponse = z.infer<typeof matchMentionsResponseSchema>;
