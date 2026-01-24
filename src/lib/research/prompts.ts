import type { ContactContext, FocusArea, TavilySearchResult } from './types';
import { sanitizeUrlForPrompt } from './constants';

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
        case 'social':
          return 'social media profiles (Twitter/X, GitHub, Instagram)';
      }
    })
    .join(', ');

  return `You are analyzing web search results about a person to create a research report.

PERSON TO RESEARCH:
- Name: ${contact.firstName} ${contact.lastName}
${contact.company ? `- Hint (for disambiguation only): They may work at ${contact.company}` : ''}
${contact.location ? `- Hint (for disambiguation only): They may be located in ${contact.location}` : ''}

FOCUS AREAS: ${focusDescription}

SEARCH RESULTS FROM THE WEB:
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
1. Analyze the search results to find relevant information about this SPECIFIC person
2. Prioritize information from LinkedIn and professional sources
3. Be VERY skeptical - if a source seems to be about a different person with the same name, IGNORE IT
4. Focus on the requested areas: ${focusDescription}

CRITICAL RULES - READ CAREFULLY:
- ONLY include information that is EXPLICITLY stated in the SEARCH RESULTS above
- The "Hints" provided above are ONLY for disambiguating between people with similar names - do NOT include them in your report unless they are CONFIRMED by the search results
- NEVER invent, assume, or infer information not directly found in the search results
- If the search results don't contain relevant information about this person, say "No relevant information found"
- Do NOT make up job titles, companies, or roles - only report what you find IN THE SEARCH RESULTS
- If you're unsure whether information is about the right person, DO NOT include it
- It is BETTER to return an empty report than to include uncertain or fabricated information
- Do NOT confuse the person being researched with other people or companies mentioned in their profile

Generate a structured report with:
- summary: 3-5 bullet points summarizing ONLY findings from the SEARCH RESULTS. If nothing found, say "No relevant public information was found for this person."
- fullReport: Report ONLY information found in the SEARCH RESULTS. If limited info, be brief. If nothing found, explain that no relevant sources were found.
- keyFindings: Array of findings with confidence scores. Empty array is acceptable if nothing relevant found.

DO NOT fabricate information. An empty or minimal report is the correct response when sources are irrelevant or don't mention this specific person.`;
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
  keyFindings: KeyFinding[],
  availableSourceUrls?: string[]
): string {
  // Format source URLs list for the prompt with sanitization to prevent prompt injection
  const sourceUrlsList = availableSourceUrls && availableSourceUrls.length > 0
    ? `\nAVAILABLE SOURCE URLs (you MUST use these - do NOT invent URLs):\n${availableSourceUrls.map((url, i) => `${i + 1}. ${sanitizeUrlForPrompt(url)}`).join('\n')}\n`
    : '\nNO SOURCE URLs AVAILABLE - If no sources provided, return zero recommendations.\n';

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
- Twitter/X: ${contact.twitterUrl || 'Not set'}
- GitHub: ${contact.githubUrl || 'Not set'}
- Instagram: ${contact.instagramUrl || 'Not set'}

RESEARCH REPORT:
${synthesizedReport}
${sourceUrlsList}
KEY FINDINGS:
${keyFindings.map((f) => `- [${f.category}] ${f.finding} (confidence: ${f.confidence})${f.sourceUrl ? ` [Source: ${f.sourceUrl}]` : ''}`).join('\n')}

INSTRUCTIONS:
Generate recommendations for updating this person's profile. For each recommendation:
1. fieldName: Which field to update (expertise, interests, whyNow, notes, title, organizationalTitle, company, location, tags, twitterUrl, githubUrl, or instagramUrl)
2. action: "ADD" if field is empty, "UPDATE" if adding to/replacing existing content
3. proposedValue: The suggested new content
4. tagCategory: If fieldName is "tags", specify RELATIONSHIP, OPPORTUNITY, EXPERTISE, or INTEREST
5. reasoning: Brief explanation of why this update is valuable (1-2 sentences)
6. confidence: 0.0-1.0 based on source reliability and relevance
7. sourceUrls: URLs where this information was found - MUST be from the AVAILABLE SOURCE URLs list above. NEVER invent or fabricate URLs.

SOCIAL PROFILE FIELDS:
- "twitterUrl" = Full Twitter/X profile URL (e.g., "https://twitter.com/username")
- "githubUrl" = Full GitHub profile URL (e.g., "https://github.com/username")
- "instagramUrl" = Full Instagram profile URL (e.g., "https://instagram.com/username")
- For social profiles, only suggest if you found a profile that clearly belongs to this specific person
- Social profile URLs should be normalized (twitter.com not x.com)

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

=== CRITICAL: PRESERVE EXISTING USER DATA ===

ALL fields (expertise, interests, whyNow, notes, etc.) may contain USER-ENTERED information that is EXTREMELY VALUABLE and must be PRESERVED. The user knows things about this person that research cannot find.

UNIVERSAL PRESERVATION RULES FOR ALL TEXT FIELDS:
1. NEVER DELETE existing content unless it is FACTUALLY WRONG
2. When action is "UPDATE", your proposedValue must INCLUDE the existing content PLUS new findings
3. Think of updates as ENHANCING and APPENDING, not REPLACING
4. Existing content represents the user's personal knowledge - respect it

EXAMPLES FOR ANY FIELD:

WRONG - Expertise update that deletes existing knowledge:
  Current: "Graduate education from Stanford, Fitness training and recovery content"
  Proposed: "Court vision, three-point shooting"
  (This DELETES the user's knowledge about Stanford and fitness!)

CORRECT - Expertise update that preserves and enhances:
  Current: "Graduate education from Stanford, Fitness training and recovery content"
  Proposed: "Graduate education from Stanford, Fitness training and recovery content, Court vision, Three-point shooting"
  (This KEEPS existing expertise and ADDS new findings)

WRONG - Notes update that deletes relationship context:
  Current: "- Met Chase through Emily\n- He is a client"
  Proposed: "- Professional basketball player"
  (This DELETES how the user knows this person!)

CORRECT - Notes update that preserves and organizes:
  Current: "- Met Chase through Emily\n- He is a client"
  Proposed: "- Met Chase through Emily\n- He is a client\n## Background\n- Professional basketball player\n- Stanford graduate"

The user's existing data is SACRED. Your job is to ADD value, not REPLACE it.`;
}

export const SYNTHESIS_SYSTEM_PROMPT = `You are a professional research analyst specializing in gathering information about individuals for CRM enrichment. You are thorough, accurate, and EXTREMELY careful to distinguish between people with similar names. You prioritize verifiable information from authoritative sources.

CRITICAL: You must NEVER fabricate or invent information. If the search results don't contain relevant information about the specific person being researched, you must say so clearly. An empty or minimal report is the correct response when no relevant information is found.

You MUST always return a structured response with:
- summary: A string with 3-5 bullet points summarizing key findings. If nothing found, state "No relevant public information was found for this person."
- fullReport: A string with a markdown report of ONLY verified findings. Keep it brief or empty if nothing relevant found.
- keyFindings: An array of objects, each with: category (professional/expertise/interests/news/other), finding (string), confidence (number 0-1), sourceUrl (string or null). Empty array is acceptable.

NEVER make up information. NEVER assume or infer details not explicitly stated in sources. If uncertain, return minimal findings with low confidence or no findings at all.`;

export const RECOMMENDATION_SYSTEM_PROMPT = `You are a CRM enrichment specialist who helps users maintain accurate and useful contact profiles. You generate specific, actionable recommendations that add value to professional relationships. You are VERY conservative with confidence scores and only recommend updates you can directly substantiate from the research report.

CRITICAL RULES:
- ONLY generate recommendations based on information EXPLICITLY stated in the research report
- NEVER invent, assume, or infer information not directly found in the report
- If the research report says "no relevant information found" or similar, return ZERO recommendations
- Do NOT recommend updates based on assumptions about what the person "might" do or "likely" knows
- It is BETTER to return no recommendations than to suggest updates based on fabricated information
- Every recommendation MUST cite a specific source URL where the information was found

DATA PRESERVATION IS PARAMOUNT (ALL FIELDS):
- The user's existing data in ANY field represents THEIR personal knowledge
- NEVER suggest deleting or replacing existing content - only ENHANCE it
- When action is "UPDATE", proposedValue must INCLUDE existing content PLUS new findings
- For expertise: "Current expertise, New expertise" (append, don't replace)
- For interests: "Current interests, New interests" (append, don't replace)
- For notes: Keep all existing bullets, add new ones
- The user knows things research cannot find - RESPECT their data

If the research report contains no actionable findings, return an empty recommendations array with noRecommendationsReason explaining that no verified information was available.`;
