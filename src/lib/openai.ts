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
