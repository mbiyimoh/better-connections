import { generateObject } from 'ai';
import { gpt4oMini } from '@/lib/openai';
import { ProfileSchema, type Profile } from './schemas';

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured professional profile data from questionnaire responses.

Given the following questionnaire responses from an event attendee, extract a structured profile.

IMPORTANT:
- Extract keywords for "seekingKeywords" from their goals (what they're looking for)
- Extract keywords for "offeringKeywords" from what they can help others with
- Infer their seniority from context clues (years of experience, role titles)
- Generate 2-3 conversation hooks from interesting personal/professional details
- Calculate completeness as a 0-1 score based on how much useful info was extracted

Guidelines for seniority inference:
- "early": Less than 3 years experience, entry-level roles, recent graduates
- "mid": 3-7 years experience, individual contributors, specialists
- "senior": 7-12 years experience, senior IC, team leads
- "executive": 12+ years, directors, VPs, C-suite
- "founder": Started or co-founded a company, regardless of experience

Keyword extraction:
- Extract 3-5 keywords for seeking (what they want)
- Extract 3-5 keywords for offering (what they provide)
- Use lowercase, single words or short phrases
- Focus on matchable terms (skills, industries, needs)`;

interface QuestionnaireInput {
  questionId: string;
  questionTitle: string;
  value: string | number | string[];
}

/**
 * Extract a structured profile from questionnaire responses using GPT-4o-mini.
 * Returns a validated Profile object.
 */
export async function extractProfile(
  attendeeName: string,
  responses: QuestionnaireInput[]
): Promise<Profile> {
  // Format responses for prompt
  const formattedResponses = responses
    .map((r) => `Q: ${r.questionTitle}\nA: ${Array.isArray(r.value) ? r.value.join(', ') : r.value}`)
    .join('\n\n');

  const prompt = `Extract profile for attendee: ${attendeeName}

Questionnaire Responses:
${formattedResponses}`;

  const result = await generateObject({
    model: gpt4oMini(),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt,
    schema: ProfileSchema,
  });

  // Ensure name is set
  return {
    ...result.object,
    name: attendeeName,
  };
}

/**
 * Extract profile with timeout protection.
 * Returns null if extraction times out or fails.
 */
export async function extractProfileWithTimeout(
  attendeeName: string,
  responses: QuestionnaireInput[],
  timeoutMs: number = 30000
): Promise<Profile | null> {
  try {
    const profile = await Promise.race([
      extractProfile(attendeeName, responses),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timeout')), timeoutMs)
      ),
    ]);
    return profile;
  } catch (error) {
    console.error('Profile extraction failed:', error);
    return null;
  }
}

/**
 * Create a fallback profile when extraction fails.
 * Uses basic information without AI inference.
 */
export function createFallbackProfile(
  attendeeName: string,
  responses: QuestionnaireInput[]
): Profile {
  const goalsResponse = responses.find((r) => r.questionId === 'goals');
  const idealResponse = responses.find((r) => r.questionId === 'ideal_connections');

  return {
    name: attendeeName,
    photoUrl: null,
    location: null,
    role: null,
    company: null,
    seniority: null,
    expertise: [],
    seekingSummary: typeof goalsResponse?.value === 'string' ? goalsResponse.value : null,
    seekingKeywords: [],
    offeringSummary: null,
    offeringKeywords: [],
    currentFocus: null,
    idealMatch: typeof idealResponse?.value === 'string' ? idealResponse.value : null,
    conversationHooks: [],
    completeness: 0.2, // Low completeness for fallback
  };
}
