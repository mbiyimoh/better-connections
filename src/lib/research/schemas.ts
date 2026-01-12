import { z } from 'zod';

export const focusAreaSchema = z.enum([
  'professional',
  'expertise',
  'interests',
  'news',
]);

export const researchRequestSchema = z.object({
  focusAreas: z.array(focusAreaSchema).min(1).max(4),
});

export const updateRecommendationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  editedValue: z.string().optional(),
});

export const applyRecommendationsSchema = z.object({
  recommendationIds: z.array(z.string()).optional(),
});

// Schema for GPT structured output - recommendations
// CRITICAL: Use .nullable().optional() pattern for OpenAI structured outputs
export const recommendationOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      fieldName: z.enum([
        'expertise',
        'interests',
        'whyNow',
        'notes',
        'title', // Job role (e.g., "Venture Capitalist")
        'organizationalTitle', // Position within org (e.g., "President")
        'company',
        'location',
        'tags',
      ]),
      action: z.enum(['ADD', 'UPDATE']),
      proposedValue: z.string(),
      tagCategory: z
        .enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST'])
        .nullable()
        .optional(),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
      sourceUrls: z.array(z.string()),
    })
  ),
  noRecommendationsReason: z.string().nullable().optional(),
});

// Schema for GPT structured output - report synthesis
// CRITICAL: Use .nullable().optional() pattern for all optional fields in OpenAI structured outputs
export const reportSynthesisSchema = z.object({
  summary: z.string().describe('3-5 bullet points summarizing key findings'),
  fullReport: z.string().describe('Detailed markdown report'),
  keyFindings: z.array(
    z.object({
      category: z.enum([
        'professional',
        'expertise',
        'interests',
        'news',
        'other',
      ]).describe('Category of the finding'),
      finding: z.string().describe('The key finding'),
      confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
      sourceUrl: z.string().nullable().optional().describe('URL source if available'),
    })
  ).describe('Array of structured key findings'),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
export type ReportSynthesis = z.infer<typeof reportSynthesisSchema>;
