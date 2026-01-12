import type { ContactContext, FocusArea, TavilySearchResult } from './types';

export function buildSynthesisPrompt(
  contact: ContactContext,
  focusAreas: FocusArea[],
  sources: TavilySearchResult[]
): string {
  const focusDescription = focusAreas
    .map((f) => {
      switch (f) {
        case 'professional':
          return 'career and professional background';
        case 'expertise':
          return 'skills, expertise, and domain knowledge';
        case 'interests':
          return 'personal interests, hobbies, and passions';
        case 'news':
          return 'recent news, announcements, and updates';
      }
    })
    .join(', ');

  return `You are analyzing web search results about a person to create a research report.

PERSON:
- Name: ${contact.firstName} ${contact.lastName}
- Current Title: ${contact.title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Location: ${contact.location || 'Unknown'}
- LinkedIn: ${contact.linkedinUrl || 'Not provided'}

FOCUS AREAS: ${focusDescription}

SEARCH RESULTS:
${sources
  .map(
    (s, i) => `
[Source ${i + 1}] ${s.title}
URL: ${s.url}
${s.publishedDate ? `Published: ${s.publishedDate}` : ''}
Content: ${s.content.slice(0, 2000)}
`
  )
  .join('\n---\n')}

INSTRUCTIONS:
1. Analyze the search results to find relevant information about this person
2. Prioritize information from LinkedIn and professional sources
3. Be skeptical of information that might be about a different person with the same name
4. Focus on the requested areas: ${focusDescription}

Generate a structured report with:
- summary: 3-5 bullet points (each 60-100 characters) summarizing key findings
- fullReport: Detailed markdown report (300-800 words) organized by topic
- keyFindings: Array of specific findings with confidence scores (0-1)

Only include findings you can attribute to specific sources.
If you cannot verify information is about this specific person, lower the confidence score.`;
}

interface KeyFinding {
  category: string;
  finding: string;
  confidence: number;
  sourceUrl?: string | null;
}

export function buildRecommendationPrompt(
  contact: ContactContext,
  synthesizedReport: string,
  keyFindings: KeyFinding[]
): string {
  return `You are generating profile update recommendations based on research findings.

CURRENT CONTACT PROFILE:
- Name: ${contact.firstName} ${contact.lastName}
- Job Role (title): ${contact.title || 'Not set'} - What they do professionally (e.g., "Venture Capitalist", "Software Engineer", "Entrepreneur")
- Position (organizationalTitle): ${contact.organizationalTitle || 'Not set'} - Their position/rank within organization (e.g., "President", "VP of Engineering", "Partner")
- Company: ${contact.company || 'Not set'}
- Location: ${contact.location || 'Not set'}
- Expertise: ${contact.expertise || 'Not documented'}
- Interests: ${contact.interests || 'Not documented'}
- Why Now (reason to reach out): ${contact.whyNow || 'Not documented'}
- Notes: ${contact.notes || 'None'}

RESEARCH REPORT:
${synthesizedReport}

KEY FINDINGS:
${keyFindings.map((f) => `- [${f.category}] ${f.finding} (confidence: ${f.confidence})`).join('\n')}

INSTRUCTIONS:
Generate recommendations for updating this person's profile. For each recommendation:
1. fieldName: Which field to update (expertise, interests, whyNow, notes, title, organizationalTitle, company, location, or tags)
2. action: "ADD" if field is empty, "UPDATE" if adding to/replacing existing content
3. proposedValue: The suggested new content
4. tagCategory: If fieldName is "tags", specify RELATIONSHIP, OPPORTUNITY, EXPERTISE, or INTEREST
5. reasoning: Brief explanation of why this update is valuable (1-2 sentences)
6. confidence: 0.0-1.0 based on source reliability and relevance
7. sourceUrls: URLs where this information was found

FIELD DEFINITIONS - IMPORTANT:
- "title" = Job Role: What type of work they do (e.g., "Venture Capitalist", "Software Engineer", "Investment Banker", "Entrepreneur")
- "organizationalTitle" = Position: Their rank/title within their organization (e.g., "President", "VP of Engineering", "Managing Partner", "Founder & CEO")
- These are SEPARATE fields. Many people have both (e.g., title="Venture Capitalist", organizationalTitle="Managing Partner")

GUIDELINES:
- Only suggest updates with confidence >= 0.5
- For "whyNow", focus on recent news, role changes, or timely opportunities
- For "expertise", use specific skills and domains (not generic terms)
- For "interests", include both professional and personal interests
- For "tags", suggest 2-4 relevant tags that categorize this person
- Prefer specific, verifiable information over general inferences
- If current value exists and is accurate, don't suggest redundant updates
- NEVER suggest updating a field with the same value it already has
- Maximum 10 recommendations total

NOTES FIELD FORMATTING PROTOCOL (CRITICAL):
- Notes MUST always be formatted as bullet points, one insight per line
- Each bullet should be a complete, readable sentence (not bracketed metadata)
- If there are more than 6 bullets, organize into sections with headers like:
  ## Recent Activity
  - Bullet point here
  ## Background
  - Bullet point here
- NEVER use bracketed metadata format like "[Field: Value]"
- Convert raw data into human-readable prose
- Example of WRONG format: "[Organization Name: Acme Corp] [Title: VP]"
- Example of CORRECT format:
  - Currently serves as VP at Acme Corp
  - Recently announced expansion into new markets`;
}

export const SYNTHESIS_SYSTEM_PROMPT = `You are a professional research analyst specializing in gathering information about individuals for CRM enrichment. You are thorough, accurate, and careful to distinguish between people with similar names. You prioritize verifiable information from authoritative sources.

You MUST always return a structured response with:
- summary: A string with 3-5 bullet points summarizing key findings
- fullReport: A string with a detailed markdown report
- keyFindings: An array of objects, each with: category (professional/expertise/interests/news/other), finding (string), confidence (number 0-1), sourceUrl (string or null)

Even if you find limited information, provide your best analysis. Never return an empty response.`;

export const RECOMMENDATION_SYSTEM_PROMPT = `You are a CRM enrichment specialist who helps users maintain accurate and useful contact profiles. You generate specific, actionable recommendations that add value to professional relationships. You are conservative with confidence scores and only recommend updates you can substantiate.`;
