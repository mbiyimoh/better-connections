import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';
import { z } from 'zod';
import type { ProfileSuggestion } from './suggestion-schema';

interface QuestionInfo {
  id: string;
  title: string;
  type: string;
  category: string;
}

interface ResponseInfo {
  questionId: string;
  value: string | number | string[];
}

interface GenerateSuggestionsInput {
  currentProfile: Record<string, unknown>;
  profileOverrides: Record<string, unknown>;
  questions: QuestionInfo[];
  responses: ResponseInfo[];
  questionSetId: string;
}

// Schema for the AI response
const SuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
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
      sourceQuestionId: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `You are analyzing questionnaire responses to suggest profile updates for an event networking platform.

Guidelines for suggestions:
- expertise: ADD new items to existing array, never remove existing
- seekingKeywords/offeringKeywords: ADD new keywords, UPDATE if more specific
- currentFocus: UPDATE only if substantially different from current
- role/company: UPDATE only if currently empty OR very high confidence (>0.9)
- conversationHooks: ADD new hooks based on interesting responses

For each suggestion, provide:
- field: which profile field to update
- action: 'add' (append to array), 'update' (modify existing), or 'replace' (overwrite)
- currentValue: what's there now (null if empty)
- suggestedValue: the new value
- confidence: 0-1 score based on how clearly the response supports this
- reason: brief explanation of why this suggestion
- sourceQuestionId: which question this is based on

Be conservative - only suggest changes with clear evidence from the responses.`;

/**
 * Generate profile update suggestions based on questionnaire responses.
 * Uses GPT-4o-mini to analyze responses and suggest profile improvements.
 */
export async function generateProfileSuggestions(
  input: GenerateSuggestionsInput
): Promise<ProfileSuggestion[]> {
  const { currentProfile, profileOverrides, questions, responses, questionSetId } = input;

  // Skip if no responses
  if (responses.length === 0) {
    return [];
  }

  const userPrompt = `Current profile:
${JSON.stringify(currentProfile, null, 2)}

Organizer overrides (DO NOT suggest changes to these fields):
${JSON.stringify(profileOverrides, null, 2)}

Questions and responses:
${questions
  .map((q) => {
    const response = responses.find((r) => r.questionId === q.id);
    return `Q [${q.category}] (${q.type}): ${q.title}\nA: ${JSON.stringify(response?.value || 'No response')}`;
  })
  .join('\n\n')}

Generate profile update suggestions based on these responses.`;

  try {
    const result = await generateObject({
      model: gpt4oMini(),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: SuggestionsResponseSchema,
    });

    // Transform to ProfileSuggestion format with questionSetId
    return result.object.suggestions
      .map((s) => ({
        field: s.field,
        action: s.action,
        currentValue: s.currentValue,
        suggestedValue: s.suggestedValue,
        confidence: s.confidence,
        reason: s.reason,
        source: {
          questionSetId,
          questionId: s.sourceQuestionId,
        },
      }))
      .filter((s) => {
        // Basic validation
        return (
          s.field &&
          s.action &&
          s.suggestedValue !== undefined &&
          typeof s.confidence === 'number'
        );
      });
  } catch (error) {
    console.error('[ProfileSuggestions] Failed to generate suggestions:', error);
    return [];
  }
}
