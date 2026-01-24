# Task Breakdown: Social Media Profile Enrichment

**Generated:** 2026-01-23
**Source:** specs/feat-social-media-enrichment/02-spec.md
**Slug:** feat-social-media-enrichment
**Last Decompose:** 2026-01-23

---

## Overview

Enhance the existing research enrichment system to discover social media profiles (Twitter/X, GitHub, Instagram) for contacts. The system uses Tavily domain filtering to find profiles, scores matches based on name/company/title/location signals, and generates recommendations with a higher confidence threshold (0.65) than standard research fields.

---

## Phase 1: Schema & Types (Foundation)

### Task 1.1: Add Social Media Fields to Prisma Schema
**Description:** Add three new optional string fields to Contact model for social media URLs
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (must be first)

**Technical Requirements:**
- Add `twitterUrl`, `githubUrl`, `instagramUrl` fields to Contact model
- All fields should be optional (`String?`)
- Run migration to apply changes

**Implementation:**

File: `prisma/schema.prisma`
```prisma
model Contact {
  // ... existing fields (after websiteUrl around line 73) ...

  // Social media profiles
  twitterUrl    String?
  githubUrl     String?
  instagramUrl  String?
}
```

**Commands to run:**
```bash
npx prisma migrate dev --name add-social-media-fields
npx prisma generate
```

**Acceptance Criteria:**
- [ ] Three new fields added to Contact model in schema
- [ ] Migration runs successfully without errors
- [ ] Prisma client regenerated with new types
- [ ] Existing contacts unaffected (fields are nullable)

---

### Task 1.2: Update FocusArea Type and Schema
**Description:** Add 'social' to the FocusArea type and update Zod schema for validation
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Add 'social' to FocusArea type in types.ts
- Update focusAreaSchema in schemas.ts
- Update max array length if needed (now 5 focus areas possible)

**Implementation:**

File: `src/lib/research/types.ts` (line ~17)
```typescript
export type FocusArea = 'professional' | 'expertise' | 'interests' | 'news' | 'social';
```

File: `src/lib/research/schemas.ts` (lines 3-8)
```typescript
export const focusAreaSchema = z.enum([
  'professional',
  'expertise',
  'interests',
  'news',
  'social',
]);

export const researchRequestSchema = z.object({
  focusAreas: z.array(focusAreaSchema).min(1).max(5), // Updated max to 5
});
```

**Acceptance Criteria:**
- [ ] 'social' added to FocusArea type
- [ ] focusAreaSchema includes 'social'
- [ ] researchRequestSchema allows up to 5 focus areas
- [ ] TypeScript compilation succeeds

---

### Task 1.3: Update Recommendation Schema with Social Fields
**Description:** Add twitterUrl, githubUrl, instagramUrl to recommendation fieldName enum
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.2

**Technical Requirements:**
- Add social URL fields to recommendationOutputSchema
- Ensure fields work with existing ADD/UPDATE actions

**Implementation:**

File: `src/lib/research/schemas.ts` (lines 28-38)
```typescript
export const recommendationOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      fieldName: z.enum([
        'expertise',
        'interests',
        'whyNow',
        'notes',
        'title',
        'organizationalTitle',
        'company',
        'location',
        'tags',
        'twitterUrl',    // NEW
        'githubUrl',     // NEW
        'instagramUrl',  // NEW
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
```

**Acceptance Criteria:**
- [ ] Three social field names added to enum
- [ ] TypeScript compilation succeeds
- [ ] Schema validates social field recommendations correctly

---

### Task 1.4: Add RESEARCH_FIELD_LABELS for Social Fields
**Description:** Add human-readable labels for social URL fields
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.2
**Can run parallel with:** Task 1.3

**Technical Requirements:**
- Add entries to RESEARCH_FIELD_LABELS for twitterUrl, githubUrl, instagramUrl
- Labels used in apply route for generating human-readable change summaries

**Implementation:**

File: `src/lib/research/types.ts` (after line 76)
```typescript
export const RESEARCH_FIELD_LABELS: Record<string, string> = {
  title: 'job role',
  organizationalTitle: 'organizational title',
  company: 'company',
  location: 'location',
  expertise: 'expertise',
  interests: 'interests',
  whyNow: 'why now',
  notes: 'notes',
  tags: 'tag',
  twitterUrl: 'Twitter/X profile',    // NEW
  githubUrl: 'GitHub profile',        // NEW
  instagramUrl: 'Instagram profile',  // NEW
};
```

**Acceptance Criteria:**
- [ ] Three new labels added to RESEARCH_FIELD_LABELS
- [ ] Labels are human-readable (e.g., "Added Twitter/X profile")
- [ ] Apply route correctly uses labels for social fields

---

### Task 1.5: Update ContactContext Interface
**Description:** Add optional social URL fields to ContactContext for type completeness
**Size:** Small
**Priority:** Low
**Dependencies:** Task 1.1
**Can run parallel with:** Tasks 1.2-1.4

**Technical Requirements:**
- Add optional twitterUrl, githubUrl, instagramUrl to ContactContext interface
- These are used when passing contact data to research functions

**Implementation:**

File: `src/lib/research/types.ts` (after line 14)
```typescript
export interface ContactContext {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string | null;
  title: string | null;
  organizationalTitle: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  expertise: string | null;
  interests: string | null;
  whyNow: string | null;
  notes: string | null;
  // Social media profiles
  twitterUrl?: string | null;   // NEW
  githubUrl?: string | null;    // NEW
  instagramUrl?: string | null; // NEW
}
```

**Acceptance Criteria:**
- [ ] Three optional social fields added to ContactContext
- [ ] Type is compatible with existing usage
- [ ] TypeScript compilation succeeds

---

## Phase 2: Social Discovery Core (Backend Logic)

### Task 2.1: Add Domain Filtering to Tavily Client
**Description:** Extend searchTavily function to support includeDomains parameter
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** None

**Technical Requirements:**
- Add optional `options` parameter to searchTavily
- Support `includeDomains: string[]` for filtering to specific domains
- Support `maxResults: number` override
- Maintain backward compatibility with existing calls

**Implementation:**

File: `src/lib/research/tavilyClient.ts`

Update the searchTavily function signature and implementation:

```typescript
interface SearchOptions {
  includeDomains?: string[];
  maxResults?: number;
}

export async function searchTavily(
  query: string,
  personName?: string,
  options?: SearchOptions
): Promise<ResearchFindings> {
  const maxResults = options?.maxResults ?? SEARCH_CONFIG.maxResults;

  console.log(`[Tavily Search] Query: "${query}"`);
  console.log(`[Tavily Search] Person name filter: "${personName || 'none'}"`);
  console.log(`[Tavily Search] Config: depth=${SEARCH_CONFIG.searchDepth}, maxResults=${maxResults}`);
  if (options?.includeDomains) {
    console.log(`[Tavily Search] Domain filter: ${options.includeDomains.join(', ')}`);
  }

  const body: Record<string, unknown> = {
    query,
    search_depth: SEARCH_CONFIG.searchDepth,
    max_results: maxResults,
    include_raw_content: SEARCH_CONFIG.includeRawContent,
    include_answer: false,
  };

  // Add domain filter if provided
  if (options?.includeDomains && options.includeDomains.length > 0) {
    body.include_domains = options.includeDomains;
  }

  const data = await tavilyFetch<TavilyResponse>('search', body);

  // ... rest of existing implementation unchanged
}
```

**Acceptance Criteria:**
- [ ] searchTavily accepts optional third parameter for options
- [ ] includeDomains passed to Tavily API as include_domains
- [ ] maxResults can be overridden per-call
- [ ] Existing calls without options continue to work
- [ ] Domain filtering logged for debugging

---

### Task 2.2: Create Social Discovery Module
**Description:** Create new socialDiscovery.ts with types and main discovery function
**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**Technical Requirements:**
- Create new file at src/lib/research/socialDiscovery.ts
- Define SocialProfileMatch and SocialDiscoveryResult interfaces
- Implement discoverSocialProfiles function with parallel platform searches
- Implement deduplicateByPlatform helper

**Implementation:**

File: `src/lib/research/socialDiscovery.ts`

```typescript
import { searchTavily } from './tavilyClient';
import type { ContactContext, TavilySearchResult } from './types';

export interface SocialProfileMatch {
  platform: 'twitter' | 'github' | 'instagram';
  url: string;
  username: string;
  displayName?: string;
  bio?: string;
  confidence: number;
  sourceUrl: string;
}

export interface SocialDiscoveryResult {
  matches: SocialProfileMatch[];
  searchQueries: string[];
}

const PLATFORM_DOMAINS: Record<string, string[]> = {
  twitter: ['twitter.com', 'x.com'],
  github: ['github.com'],
  instagram: ['instagram.com'],
};

// Minimum confidence to include a social profile match
const SOCIAL_CONFIDENCE_THRESHOLD = 0.65;

export async function discoverSocialProfiles(
  contact: ContactContext,
  onProgress?: (stage: string) => void
): Promise<SocialDiscoveryResult> {
  const matches: SocialProfileMatch[] = [];
  const searchQueries: string[] = [];

  // Build base query from contact context
  const nameQuery = `"${contact.firstName} ${contact.lastName}"`;
  const contextHints = [contact.company, contact.title, contact.location]
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  console.log(`[Social Discovery] Starting for: ${contact.firstName} ${contact.lastName}`);
  console.log(`[Social Discovery] Context hints: ${contextHints || 'none'}`);

  // Search each platform in parallel
  const platformSearches = Object.entries(PLATFORM_DOMAINS).map(
    async ([platform, domains]) => {
      onProgress?.(`Searching ${platform}...`);

      // Build query within Tavily's 400 char limit
      const query = `${nameQuery} ${contextHints}`.slice(0, 350);
      searchQueries.push(`${platform}: ${query}`);

      try {
        const results = await searchTavily(query, contact.firstName, {
          includeDomains: domains,
          maxResults: 5,
        });

        console.log(`[Social Discovery] ${platform}: ${results.sources.length} results`);

        for (const result of results.sources) {
          const match = parseAndScoreProfile(
            result,
            platform as 'twitter' | 'github' | 'instagram',
            contact
          );
          if (match && match.confidence >= SOCIAL_CONFIDENCE_THRESHOLD) {
            matches.push(match);
            console.log(`[Social Discovery] Match found: ${match.url} (${match.confidence.toFixed(2)})`);
          }
        }
      } catch (error) {
        console.error(`[Social Discovery] Search failed for ${platform}:`, error);
        // Continue with other platforms
      }
    }
  );

  await Promise.all(platformSearches);

  // Deduplicate by platform (keep highest confidence)
  const deduped = deduplicateByPlatform(matches);

  console.log(`[Social Discovery] Final matches: ${deduped.length}`);

  return { matches: deduped, searchQueries };
}

function deduplicateByPlatform(matches: SocialProfileMatch[]): SocialProfileMatch[] {
  const byPlatform = new Map<string, SocialProfileMatch>();

  for (const match of matches) {
    const existing = byPlatform.get(match.platform);
    if (!existing || match.confidence > existing.confidence) {
      byPlatform.set(match.platform, match);
    }
  }

  return Array.from(byPlatform.values());
}
```

**Acceptance Criteria:**
- [ ] File created at correct path
- [ ] Types exported: SocialProfileMatch, SocialDiscoveryResult
- [ ] discoverSocialProfiles searches all 3 platforms in parallel
- [ ] Only matches above 0.65 confidence included
- [ ] Deduplication keeps highest confidence per platform
- [ ] Errors on one platform don't fail others

---

### Task 2.3: Implement Profile Parsing and Scoring
**Description:** Add parseAndScoreProfile and helper functions to socialDiscovery.ts
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** None

**Technical Requirements:**
- Implement parseAndScoreProfile for confidence calculation
- Implement extractUsername for each platform
- Implement normalizeProfileUrl for consistent URLs
- Implement extractProfileInfo for bio extraction

**Implementation:**

Add to `src/lib/research/socialDiscovery.ts`:

```typescript
function parseAndScoreProfile(
  result: TavilySearchResult,
  platform: 'twitter' | 'github' | 'instagram',
  contact: ContactContext
): SocialProfileMatch | null {
  // Extract username from URL
  const username = extractUsername(result.url, platform);
  if (!username) return null;

  // Calculate confidence score
  let confidence = 0;

  // Name match in title or content (0.4 weight)
  const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
  const contentLower = (result.title + ' ' + result.content).toLowerCase();

  if (contentLower.includes(fullName)) {
    confidence += 0.4;
  } else if (
    contentLower.includes(contact.firstName.toLowerCase()) &&
    contentLower.includes(contact.lastName.toLowerCase())
  ) {
    confidence += 0.3;
  }

  // Company match (0.25 weight)
  if (contact.company && contentLower.includes(contact.company.toLowerCase())) {
    confidence += 0.25;
  }

  // Title/role match (0.2 weight)
  if (contact.title && contentLower.includes(contact.title.toLowerCase())) {
    confidence += 0.2;
  }

  // Location match (0.1 weight)
  if (contact.location && contentLower.includes(contact.location.toLowerCase())) {
    confidence += 0.1;
  }

  // Tavily relevance score boost (0.05 weight)
  confidence += result.score * 0.05;

  // Extract display name and bio from content if available
  const { displayName, bio } = extractProfileInfo(result.content, platform);

  return {
    platform,
    url: normalizeProfileUrl(result.url, platform),
    username,
    displayName,
    bio: bio?.slice(0, 500), // Limit bio length
    confidence: Math.min(confidence, 1.0),
    sourceUrl: result.url,
  };
}

function extractUsername(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (platform === 'github') {
      // github.com/username or github.com/username/repo
      return pathParts[0] || null;
    }

    if (platform === 'twitter') {
      // twitter.com/username or x.com/username
      const username = pathParts[0];
      // Exclude common non-profile paths
      if (['search', 'explore', 'settings', 'i', 'intent', 'home', 'notifications'].includes(username)) {
        return null;
      }
      return username || null;
    }

    if (platform === 'instagram') {
      // instagram.com/username
      const username = pathParts[0];
      if (['p', 'reel', 'reels', 'explore', 'accounts', 'direct', 'stories'].includes(username)) {
        return null;
      }
      return username || null;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeProfileUrl(url: string, platform: string): string {
  const username = extractUsername(url, platform);
  if (!username) return url;

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/${username}`;
    case 'github':
      return `https://github.com/${username}`;
    case 'instagram':
      return `https://instagram.com/${username}`;
    default:
      return url;
  }
}

function extractProfileInfo(
  content: string,
  platform: string
): { displayName?: string; bio?: string } {
  // Basic extraction from search result content
  // This is best-effort - Tavily snippets vary in structure

  // Look for common patterns like "Name - Bio" or "Name | Title"
  const lines = content.split('\n').filter(Boolean);

  return {
    displayName: undefined, // Let GPT extract this in synthesis
    bio: lines.length > 1 ? lines.slice(1).join(' ').slice(0, 300) : undefined,
  };
}
```

**Acceptance Criteria:**
- [ ] parseAndScoreProfile returns null for invalid URLs
- [ ] Confidence scoring follows weight table from spec
- [ ] Full name match = 0.4, partial = 0.3
- [ ] Company = 0.25, Title = 0.2, Location = 0.1, Tavily = 0.05
- [ ] Confidence capped at 1.0
- [ ] extractUsername filters out non-profile paths
- [ ] normalizeProfileUrl produces consistent URLs
- [ ] Bio limited to 500 chars

---

### Task 2.4: Add Generic URL Extraction Function
**Description:** Create extractUrl function for GitHub bio extraction (and future use)
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2
**Can run parallel with:** Task 2.3

**Technical Requirements:**
- Create generic extractUrl function in tavilyClient.ts
- Use Tavily Extract API similar to extractLinkedInProfile
- Export for use by socialDiscovery.ts

**Implementation:**

File: `src/lib/research/tavilyClient.ts` (add after extractLinkedInProfile)

```typescript
/**
 * Extract content from any URL using Tavily Extract API.
 * Generic version of extractLinkedInProfile for use with other platforms.
 */
export async function extractUrl(
  url: string
): Promise<{ success: boolean; content: string | null; error?: string }> {
  try {
    const data = await tavilyFetch<TavilyExtractResponse>('extract', {
      urls: [url],
      extract_depth: 'basic', // Use basic for non-LinkedIn
      include_images: false,
      timeout: 15,
    });

    const firstResult = data.results?.[0];
    const content = firstResult?.raw_content;

    if (content) {
      console.log(`[Tavily Extract] Successfully extracted ${url} (${content.length} chars)`);
      return { success: true, content };
    }

    if (data.failed_results && data.failed_results.length > 0) {
      console.warn(`[Tavily Extract] Failed to extract ${url}: ${data.failed_results[0]}`);
      return { success: false, content: null, error: 'Extraction failed' };
    }

    return { success: false, content: null, error: 'No content returned' };
  } catch (error) {
    console.error('[Tavily Extract] Exception:', error);
    return {
      success: false,
      content: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Acceptance Criteria:**
- [ ] extractUrl function exported from tavilyClient.ts
- [ ] Uses Tavily Extract API with basic depth
- [ ] Returns typed result with success/content/error
- [ ] Handles errors gracefully without throwing

---

### Task 2.5: Implement GitHub Bio Extraction
**Description:** Add extractGitHubBio function using the generic extractUrl
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.4
**Can run parallel with:** None

**Technical Requirements:**
- Import extractUrl in socialDiscovery.ts
- Implement extractGitHubBio that parses GitHub profile content
- Bio extraction is optional enhancement, failures are non-fatal

**Implementation:**

Add to `src/lib/research/socialDiscovery.ts`:

```typescript
import { extractUrl } from './tavilyClient';

export async function extractGitHubBio(profileUrl: string): Promise<string | null> {
  try {
    const extraction = await extractUrl(profileUrl);
    if (!extraction.success || !extraction.content) return null;

    const content = extraction.content;

    // GitHub profile pages have structured bio sections
    // Look for bio patterns in the extracted content
    const bioMatch = content.match(/Bio[:\s]+([^\n]+)/i);
    if (bioMatch) return bioMatch[1].trim();

    // Try alternative pattern: look for text between name and stats
    const lines = content.split('\n').filter(Boolean);
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      // Skip short lines, links, and stats
      if (line.length > 20 && line.length < 200 && !line.includes('http') && !line.match(/^\d/)) {
        return line;
      }
    }

    return null;
  } catch (error) {
    console.error('[Social Discovery] GitHub bio extraction failed:', error);
    return null;
  }
}
```

**Acceptance Criteria:**
- [ ] extractGitHubBio attempts to parse bio from content
- [ ] Returns null on any failure (non-fatal)
- [ ] Finds bio using multiple patterns
- [ ] Logged errors don't crash the discovery process

---

## Phase 3: Orchestrator Integration

### Task 3.1: Integrate Social Discovery in Orchestrator
**Description:** Add social discovery step to executeContactResearch when 'social' focus area selected
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 2 complete
**Can run parallel with:** None

**Technical Requirements:**
- Import discoverSocialProfiles and types
- Add conditional social discovery after web search
- Convert social matches to recommendations
- Maintain existing flow for non-social research

**Implementation:**

File: `src/lib/research/orchestrator.ts`

Add imports at top:
```typescript
import {
  discoverSocialProfiles,
  extractGitHubBio,
  type SocialProfileMatch
} from './socialDiscovery';
```

Add after the web search step (around line 86, after findings check):

```typescript
// Step 2c: Social profile discovery (if selected)
let socialMatches: SocialProfileMatch[] = [];

if (focusAreas.includes('social')) {
  await onProgress?.('Discovering social profiles...');
  const socialResult = await discoverSocialProfiles(contact, async (stage) => {
    await onProgress?.(stage);
  });
  socialMatches = socialResult.matches;

  // Attempt GitHub bio extraction for high-confidence matches
  for (const match of socialMatches) {
    if (match.platform === 'github' && match.confidence >= 0.7 && !match.bio) {
      const bio = await extractGitHubBio(match.url);
      if (bio) {
        match.bio = bio;
      }
    }
  }

  console.log(`[Research] Found ${socialMatches.length} social profile matches`);
}
```

Then modify the recommendation generation to include social matches (around line 125):

```typescript
const recommendationPrompt = buildRecommendationPrompt(
  contact,
  report.fullReport,
  synthesisResult.object.keyFindings,
  socialMatches  // NEW parameter
);
```

**Acceptance Criteria:**
- [ ] Social discovery only runs when 'social' in focusAreas
- [ ] Progress callback shows "Discovering social profiles..."
- [ ] GitHub bio extraction attempted for high-confidence matches
- [ ] Social matches passed to recommendation generator
- [ ] Non-social research unchanged

---

### Task 3.2: Update Prompts for Social Recommendations
**Description:** Add social profile handling to recommendation prompt
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 3.3

**Technical Requirements:**
- Update buildRecommendationPrompt to accept socialMatches
- Add section to RECOMMENDATION_SYSTEM_PROMPT explaining social field handling
- Ensure GPT preserves confidence scores from discovery

**Implementation:**

File: `src/lib/research/prompts.ts`

Update buildRecommendationPrompt function signature and add social section:

```typescript
import type { SocialProfileMatch } from './socialDiscovery';

export function buildRecommendationPrompt(
  contact: ContactContext,
  fullReport: string,
  keyFindings: Array<{ category: string; finding: string; confidence: number; sourceUrl?: string | null }>,
  socialMatches?: SocialProfileMatch[]  // NEW parameter
): string {
  // ... existing implementation ...

  // Add social matches section if provided
  let socialSection = '';
  if (socialMatches && socialMatches.length > 0) {
    socialSection = `

## SOCIAL PROFILE MATCHES

The following social media profiles have been matched to this contact with pre-calculated confidence scores:

${socialMatches.map(m => `
- Platform: ${m.platform}
  URL: ${m.url}
  Username: ${m.username}
  Confidence: ${m.confidence.toFixed(2)}
  ${m.bio ? `Bio: "${m.bio}"` : ''}
  Source: ${m.sourceUrl}
`).join('\n')}

For each social profile match above, generate a recommendation with:
- fieldName: '${m.platform}Url' (e.g., 'twitterUrl', 'githubUrl', 'instagramUrl')
- action: 'ADD' (or 'UPDATE' if contact already has a different URL for this platform)
- proposedValue: the full profile URL
- confidence: USE THE EXACT CONFIDENCE VALUE PROVIDED ABOVE (do not lower it)
- reasoning: explain why this profile matches (name match, company match, etc.)
- sourceUrls: [the source URL where profile was discovered]
`;
  }

  return `${existingPrompt}${socialSection}`;
}
```

Add to RECOMMENDATION_SYSTEM_PROMPT:

```typescript
export const RECOMMENDATION_SYSTEM_PROMPT = `
... existing content ...

## SOCIAL PROFILE RECOMMENDATIONS

When social profile matches are provided in the prompt:
- Generate recommendations for twitterUrl, githubUrl, and/or instagramUrl fields
- Use action: ADD if the contact doesn't have the profile URL
- Use action: UPDATE only if the existing URL appears to be different from the matched one
- CRITICAL: Use the EXACT confidence score provided in the social matches section - do NOT lower it
- In reasoning, explain WHY this profile matches (name match, company match, etc.)
- Include the source URL where the profile was discovered
- If a bio is provided, mention it in the reasoning

Format for social recommendations:
{
  fieldName: 'twitterUrl' | 'githubUrl' | 'instagramUrl',
  action: 'ADD' | 'UPDATE',
  proposedValue: '<full profile URL>',
  reasoning: 'Profile matches based on: <specific signals>. Bio: <bio snippet if available>',
  confidence: <USE EXACT VALUE FROM SOCIAL MATCHES>,
  sourceUrls: ['<discovery source URL>']
}
`;
```

**Acceptance Criteria:**
- [ ] buildRecommendationPrompt accepts optional socialMatches parameter
- [ ] Social matches formatted clearly for GPT
- [ ] System prompt explains social recommendation format
- [ ] GPT instructed to preserve confidence scores
- [ ] Bio included in reasoning when available

---

### Task 3.3: Update Apply Route for Social Fields
**Description:** Ensure apply route handles twitterUrl, githubUrl, instagramUrl fields
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 3.2

**Technical Requirements:**
- Add social URL fields to the allowed fields in apply route
- Ensure update logic works for URL fields
- RESEARCH_FIELD_LABELS already updated in Task 1.4

**Implementation:**

File: `src/app/api/contacts/[id]/research/[runId]/apply/route.ts`

Find the section where contact fields are updated (around line 80-100) and ensure social fields are included:

```typescript
// Update the Pick<> type to include social fields
type ApplicableFields = Pick<
  Prisma.ContactUpdateInput,
  | 'expertise'
  | 'interests'
  | 'whyNow'
  | 'notes'
  | 'title'
  | 'organizationalTitle'
  | 'company'
  | 'location'
  | 'twitterUrl'    // NEW
  | 'githubUrl'     // NEW
  | 'instagramUrl'  // NEW
>;
```

Also update the getContactFieldValue function in orchestrator.ts to handle social fields:

```typescript
function getContactFieldValue(
  contact: ContactContext,
  fieldName: string
): string | null {
  switch (fieldName) {
    // ... existing cases ...
    case 'twitterUrl':
      return contact.twitterUrl ?? null;
    case 'githubUrl':
      return contact.githubUrl ?? null;
    case 'instagramUrl':
      return contact.instagramUrl ?? null;
    default:
      return null;
  }
}
```

**Acceptance Criteria:**
- [ ] Apply route accepts twitterUrl, githubUrl, instagramUrl recommendations
- [ ] Contact record updated correctly with social URLs
- [ ] getContactFieldValue returns current social URL values
- [ ] Human-readable summaries show "Added GitHub profile" etc.

---

## Phase 4: UI Updates

### Task 4.1: Add Social Profiles Focus Option
**Description:** Add "Social Profiles" checkbox to ResearchOptionsModal
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 4.2

**Technical Requirements:**
- Add new focus option with id 'social'
- Use AtSign icon from lucide-react
- Description: "Find Twitter/X, GitHub, and Instagram profiles"

**Implementation:**

File: `src/components/research/ResearchOptionsModal.tsx`

Add to FOCUS_OPTIONS array:

```typescript
import { AtSign } from 'lucide-react';

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: 'professional',
    label: 'Professional Background',
    description: 'Career history, current role, and company info',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: 'expertise',
    label: 'Expertise & Skills',
    description: 'Technical skills, domain expertise, achievements',
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    id: 'interests',
    label: 'Interests & Hobbies',
    description: 'Personal interests, hobbies, side projects',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    id: 'news',
    label: 'Recent News',
    description: 'Recent mentions, announcements, press coverage',
    icon: <Newspaper className="h-4 w-4" />,
  },
  {
    id: 'social',
    label: 'Social Profiles',
    description: 'Find Twitter/X, GitHub, and Instagram profiles',
    icon: <AtSign className="h-4 w-4" />,
  },
];
```

**Acceptance Criteria:**
- [ ] "Social Profiles" option appears in modal
- [ ] AtSign icon displayed
- [ ] Can be selected/deselected independently
- [ ] Selection included in focusAreas when research starts

---

### Task 4.2: Update RecommendationCard for Social Fields
**Description:** Add platform-specific styling and "Verify Profile Match" button for social recommendations
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.3
**Can run parallel with:** Task 4.1

**Technical Requirements:**
- Detect social field recommendations by fieldName
- Show platform-specific icon (Twitter, GitHub, Instagram)
- Add "Verify Profile Match" button opening URL in new tab
- Display URL with username highlighted
- Show bio snippet if available

**Implementation:**

File: `src/components/research/RecommendationCard.tsx`

Add imports and constants:

```typescript
import { Twitter, Github, Instagram, ExternalLink } from 'lucide-react';

const SOCIAL_FIELDS = ['twitterUrl', 'githubUrl', 'instagramUrl'];

const PLATFORM_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  twitterUrl: { icon: Twitter, label: 'Twitter/X Profile', color: 'text-sky-500' },
  githubUrl: { icon: Github, label: 'GitHub Profile', color: 'text-white' },
  instagramUrl: { icon: Instagram, label: 'Instagram Profile', color: 'text-pink-500' },
};
```

Update the component to handle social fields:

```typescript
export function RecommendationCard({ recommendation, ... }: Props) {
  const isSocialField = SOCIAL_FIELDS.includes(recommendation.fieldName);
  const platformConfig = isSocialField ? PLATFORM_CONFIG[recommendation.fieldName] : null;

  // Extract username from URL for display
  const getDisplayUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="...">
      {/* Header with platform icon for social fields */}
      <div className="flex items-center gap-2">
        {platformConfig ? (
          <>
            <platformConfig.icon className={`h-4 w-4 ${platformConfig.color}`} />
            <span className="font-medium">{platformConfig.label}</span>
          </>
        ) : (
          // ... existing field label logic
        )}
      </div>

      {/* Value display */}
      {isSocialField ? (
        <div className="mt-2">
          <code className="text-sm text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
            {getDisplayUrl(recommendation.proposedValue)}
          </code>
        </div>
      ) : (
        // ... existing value display
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4">
        {isSocialField && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(recommendation.proposedValue, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Verify Profile Match
          </Button>
        )}
        {/* ... existing approve/reject buttons */}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Social recommendations show platform-specific icon
- [ ] Icon uses correct color (sky for Twitter, white for GitHub, pink for Instagram)
- [ ] URL displayed in code style
- [ ] "Verify Profile Match" button opens URL in new tab
- [ ] Non-social recommendations unchanged

---

### Task 4.3: Update Progress View for Social Step
**Description:** Add social discovery step to progress stage mapping
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1
**Can run parallel with:** Tasks 4.1, 4.2

**Technical Requirements:**
- Add "Discovering social profiles..." to progress stage map
- Position after "Searching the web..." step
- Step appears even if social not selected (for simplicity in v1)

**Implementation:**

File: `src/components/research/ResearchProgressView.tsx` (or ResearchStepper.tsx)

Update the PROGRESS_STAGE_MAP or equivalent:

```typescript
const PROGRESS_STAGES = [
  { key: 'Building search query...', label: 'Building Query' },
  { key: 'Extracting LinkedIn profile...', label: 'LinkedIn Profile' },
  { key: 'Searching the web...', label: 'Web Search' },
  { key: 'Discovering social profiles...', label: 'Social Profiles' },  // NEW
  { key: 'Analyzing findings...', label: 'Analyzing' },
  { key: 'Generating recommendations...', label: 'Recommendations' },
  { key: 'Research complete!', label: 'Complete' },
];
```

**Acceptance Criteria:**
- [ ] "Discovering social profiles..." step shown in progress
- [ ] Step positioned between web search and analysis
- [ ] Progress indicator updates when social discovery runs
- [ ] UI doesn't break if step is skipped

---

## Phase 5: Testing & Validation

### Task 5.1: Test Social Discovery End-to-End
**Description:** Manual testing of complete social discovery flow
**Size:** Medium
**Priority:** High
**Dependencies:** Phases 1-4 complete
**Can run parallel with:** None

**Test Scenarios:**

1. **Basic Discovery Test**
   - Select a contact with known Twitter/GitHub/Instagram
   - Run research with "Social Profiles" selected
   - Verify correct profiles discovered
   - Check confidence scores are reasonable

2. **Common Name Test**
   - Test with contact who has common name (e.g., "John Smith")
   - Verify low-confidence matches are filtered out
   - Check that company/title helps narrow results

3. **No Social Presence Test**
   - Test with contact who has no public social profiles
   - Verify no false positive recommendations
   - Check that other research continues normally

4. **Mixed Focus Areas Test**
   - Select multiple focus areas including "Social Profiles"
   - Verify both social and regular recommendations generated
   - Check progress steps show correctly

5. **Apply Flow Test**
   - Approve a social profile recommendation
   - Verify contact record updated
   - Check "Verify Profile Match" button works

**Acceptance Criteria:**
- [ ] Discovery finds correct profiles for known contacts
- [ ] False positive rate appears <10%
- [ ] Confidence threshold (0.65) filters weak matches
- [ ] Apply flow works correctly
- [ ] UI components render properly

---

### Task 5.2: Verify API Response Handling
**Description:** Test edge cases and error handling
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 5.1
**Can run parallel with:** None

**Test Scenarios:**

1. **Tavily Domain Filter Test**
   - Verify include_domains parameter sent correctly
   - Check that only results from target domains returned

2. **Rate Limit/Error Handling**
   - Simulate Tavily API error
   - Verify one platform failure doesn't crash others
   - Check error logged but not surfaced to user

3. **Bio Extraction Test**
   - Test GitHub bio extraction
   - Verify fallback to URL-only when extraction fails
   - Check bio truncated to 500 chars

**Acceptance Criteria:**
- [ ] Domain filtering works correctly
- [ ] Errors handled gracefully
- [ ] Bio extraction works or fails silently

---

## Execution Summary

### Task Count by Phase
| Phase | Tasks | Priority |
|-------|-------|----------|
| Phase 1: Schema & Types | 5 | High (foundation) |
| Phase 2: Social Discovery Core | 5 | High (core logic) |
| Phase 3: Orchestrator Integration | 3 | High (integration) |
| Phase 4: UI Updates | 3 | High (user-facing) |
| Phase 5: Testing | 2 | High (validation) |
| **Total** | **18** | |

### Recommended Execution Order

**Sequential Dependencies:**
1. Task 1.1 (schema) must be first
2. Tasks 1.2-1.5 can run in parallel after 1.1
3. Phase 2 requires Phase 1 complete
4. Phase 3 requires Phase 2 complete
5. Phase 4 can start after Tasks 1.2, 1.3
6. Phase 5 requires all other phases complete

**Parallel Opportunities:**
- Tasks 1.2, 1.3, 1.4, 1.5 (all after 1.1)
- Tasks 4.1, 4.2, 4.3 (UI work)
- Tasks 3.2, 3.3 (prompt and apply)

### Critical Path
1.1 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 5.1

### Estimated Implementation Order
1. Phase 1 (Tasks 1.1-1.5) - Foundation
2. Phase 2 (Tasks 2.1-2.5) - Core logic
3. Phase 3 (Tasks 3.1-3.3) - Integration
4. Phase 4 (Tasks 4.1-4.3) - UI
5. Phase 5 (Tasks 5.1-5.2) - Testing

---

## Risk Mitigation

| Risk | Mitigation Task |
|------|-----------------|
| Tavily domain filter not working | Task 2.1 includes logging |
| Low match rate | Task 2.3 scoring is configurable |
| False positives | 0.65 threshold + "Verify" button |
| Bio extraction fails | Non-fatal, URL-only fallback |
| UI breaks | Task 4.2 isolated to social fields |
