import { createOpenAI } from "@ai-sdk/openai";

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
