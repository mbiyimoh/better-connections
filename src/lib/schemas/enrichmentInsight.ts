import { z } from "zod";

// Single extracted insight
export const enrichmentInsightSchema = z.object({
  capturedText: z
    .string()
    .describe("The key phrase or fact extracted from speech - concise, 3-10 words"),

  category: z
    .enum(["relationship", "opportunity", "expertise", "interest"])
    .describe(
      "Category: relationship=how you know them, opportunity=business potential/why now, " +
      "expertise=professional skills/role, interest=personal hobbies/passions"
    ),

  howWeMet: z.string().nullable().describe("How the user met this contact").optional(),
  whyNow: z.string().nullable().describe("Time-sensitive relevance").optional(),
  title: z.string().nullable().describe("Job title or professional role").optional(),
  company: z.string().nullable().describe("Company or organization").optional(),
  expertise: z.string().nullable().describe("Professional skills").optional(),
  interests: z.string().nullable().describe("Personal interests").optional(),
  notes: z.string().nullable().describe("Other relevant context").optional(),
});

// API response
export const enrichmentExtractionResponseSchema = z.object({
  insights: z.array(enrichmentInsightSchema),
});

// API request
export const enrichmentExtractionRequestSchema = z.object({
  transcript: z.string().min(1).max(4000),
  contactContext: z.object({
    name: z.string().optional(),
    title: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    howWeMet: z.string().nullable().optional(),
    whyNow: z.string().nullable().optional(),
    expertise: z.string().nullable().optional(),
    interests: z.string().nullable().optional(),
  }).optional(),
});

// Conflict detection
export const fieldConflictSchema = z.object({
  field: z.enum(["title", "company"]),
  existingValue: z.string(),
  newValue: z.string(),
  source: z.literal("ai_extraction"),
});

// Export types
export type EnrichmentInsight = z.infer<typeof enrichmentInsightSchema>;
export type EnrichmentExtractionResponse = z.infer<typeof enrichmentExtractionResponseSchema>;
export type EnrichmentExtractionRequest = z.infer<typeof enrichmentExtractionRequestSchema>;
export type FieldConflict = z.infer<typeof fieldConflictSchema>;
