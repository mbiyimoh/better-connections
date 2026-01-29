import { z } from 'zod';

export const ProfileSuggestionSchema = z.object({
  field: z.enum([
    'expertise',
    'seekingKeywords',
    'offeringKeywords',
    'currentFocus',
    'role',
    'company',
    'conversationHooks',
  ]),
  action: z.enum(['add', 'update', 'replace']),
  currentValue: z.union([z.string(), z.array(z.string()), z.null()]),
  suggestedValue: z.union([z.string(), z.array(z.string())]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  source: z.object({
    questionSetId: z.string(),
    questionId: z.string(),
  }),
});

export type ProfileSuggestion = z.infer<typeof ProfileSuggestionSchema>;

export const ProfileSuggestionsResponseSchema = z.object({
  suggestions: z.array(ProfileSuggestionSchema),
});
