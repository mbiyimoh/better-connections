# Social Media Profile Enrichment - Implementation Spec

**Slug:** feat-social-media-enrichment
**Author:** Claude Code
**Date:** 2026-01-23
**Status:** Ready for Implementation
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## Overview

Enhance the existing research enrichment system to discover, match, and extract information from social media profiles (Twitter/X, GitHub, Instagram) for contacts. The system will suggest social handles with confidence scores (threshold: 0.65), attempt to extract profile bios where possible, and integrate seamlessly with the existing Tavily-based research pipeline.

---

## User Flow

```
1. User clicks "Enrich: Online Research" on contact detail page
2. ResearchOptionsModal opens with existing focus areas + new "Social Profiles" checkbox
3. User selects "Social Profiles" (and optionally other areas)
4. User clicks "Start Research"
5. System executes social profile discovery in parallel with other research
6. For each platform (GitHub, Twitter/X, Instagram):
   a. Query Tavily with platform-specific domain filter
   b. Parse potential profile URLs from results
   c. Score matches against contact context
   d. For high-confidence matches, attempt bio extraction
7. Generate recommendations for social profile URLs (fieldName: twitterUrl, githubUrl, instagramUrl)
8. User reviews recommendations with "Verify Profile Match" button
9. User approves/rejects each social handle recommendation
10. Apply approved recommendations to contact record
```

---

## Database Schema Changes

### Contact Model (prisma/schema.prisma)

Add three new optional fields:

```prisma
model Contact {
  // ... existing fields ...

  // Social media profiles
  twitterUrl    String?
  githubUrl     String?
  instagramUrl  String?
}
```

### Migration

```sql
ALTER TABLE "Contact" ADD COLUMN "twitterUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN "instagramUrl" TEXT;
```

---

## Components

### 1. ResearchOptionsModal (Modified)

**File:** `src/components/research/ResearchOptionsModal.tsx`

**Changes:**
- Add "Social Profiles" to `FOCUS_OPTIONS` array
- New focus area ID: `'social'`

```typescript
const FOCUS_OPTIONS: FocusOption[] = [
  // ... existing options ...
  {
    id: 'social',
    label: 'Social Profiles',
    description: 'Find Twitter/X, GitHub, and Instagram profiles',
    icon: <AtSign className="h-4 w-4" />,
  },
];
```

### 2. RecommendationCard (Modified)

**File:** `src/components/research/RecommendationCard.tsx`

**Changes:**
- Detect social profile recommendations by fieldName
- Show platform icon (Twitter, GitHub, Instagram) instead of generic icon
- Add "Verify Profile Match" button that opens URL in new tab
- Style differently for social recommendations (show URL preview)

```typescript
const SOCIAL_FIELDS = ['twitterUrl', 'githubUrl', 'instagramUrl'];

const PLATFORM_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  twitterUrl: { icon: Twitter, label: 'Twitter/X', color: 'text-sky-500' },
  githubUrl: { icon: Github, label: 'GitHub', color: 'text-white' },
  instagramUrl: { icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
};

// In render:
{isSocialField && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => window.open(proposedValue, '_blank')}
    className="gap-2"
  >
    <ExternalLink className="h-3 w-3" />
    Verify Profile Match
  </Button>
)}
```

### 3. Social Profile Discovery (New)

**File:** `src/lib/research/socialDiscovery.ts`

**Purpose:** Orchestrate social profile searches across platforms

```typescript
import { searchTavily } from './tavilyClient';
import type { ContactContext } from './types';

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

  // Search each platform in parallel
  const platformSearches = Object.entries(PLATFORM_DOMAINS).map(
    async ([platform, domains]) => {
      onProgress?.(`Searching ${platform}...`);

      const query = `${nameQuery} ${contextHints}`.slice(0, 350);
      searchQueries.push(`${platform}: ${query}`);

      try {
        const results = await searchTavily(query, contact.firstName, {
          includeDomains: domains,
          maxResults: 5,
        });

        for (const result of results.sources) {
          const match = await parseAndScoreProfile(
            result,
            platform as 'twitter' | 'github' | 'instagram',
            contact
          );
          if (match && match.confidence >= 0.65) {
            matches.push(match);
          }
        }
      } catch (error) {
        console.error(`Social search failed for ${platform}:`, error);
      }
    }
  );

  await Promise.all(platformSearches);

  // Deduplicate by platform (keep highest confidence)
  const deduped = deduplicateByPlatform(matches);

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

### 4. Profile Parsing & Scoring (New)

**File:** `src/lib/research/socialDiscovery.ts` (continued)

```typescript
async function parseAndScoreProfile(
  result: TavilySearchResult,
  platform: 'twitter' | 'github' | 'instagram',
  contact: ContactContext
): Promise<SocialProfileMatch | null> {
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
      if (['search', 'explore', 'settings', 'i', 'intent'].includes(username)) {
        return null;
      }
      return username || null;
    }

    if (platform === 'instagram') {
      // instagram.com/username
      const username = pathParts[0];
      if (['p', 'reel', 'explore', 'accounts'].includes(username)) {
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

### 5. Bio Extraction for GitHub (New)

**File:** `src/lib/research/socialDiscovery.ts` (continued)

```typescript
import { extractUrl } from './tavilyClient';

export async function extractGitHubBio(profileUrl: string): Promise<string | null> {
  try {
    const extraction = await extractUrl(profileUrl);
    if (!extraction?.content) return null;

    // GitHub profile pages have structured bio sections
    // Look for bio patterns in the extracted content
    const content = extraction.content;

    // Try to find bio section (usually after name, before repositories)
    const bioMatch = content.match(/Bio[:\s]+([^\n]+)/i);
    if (bioMatch) return bioMatch[1].trim();

    // Fallback: first ~300 chars of content after name
    return content.slice(0, 300);
  } catch (error) {
    console.error('GitHub bio extraction failed:', error);
    return null;
  }
}
```

### 6. Types Extension

**File:** `src/lib/research/types.ts`

```typescript
// Add to existing FocusArea type
export type FocusArea = 'professional' | 'expertise' | 'interests' | 'news' | 'social';

// Add social fields to ContactContext (for completeness)
export interface ContactContext {
  // ... existing fields ...
  twitterUrl?: string;
  githubUrl?: string;
  instagramUrl?: string;
}
```

### 7. Orchestrator Integration

**File:** `src/lib/research/orchestrator.ts`

**Changes:**
- Import `discoverSocialProfiles`
- Add social discovery step when `'social'` is in focusAreas
- Pass social matches to recommendation generator

```typescript
import { discoverSocialProfiles, SocialProfileMatch } from './socialDiscovery';

// In executeContactResearch:
let socialMatches: SocialProfileMatch[] = [];

if (focusAreas.includes('social')) {
  onProgress?.('Discovering social profiles...');
  const socialResult = await discoverSocialProfiles(contact, onProgress);
  socialMatches = socialResult.matches;
}

// Pass to recommendation generator
const recommendations = await generateRecommendations({
  contact,
  report: synthesisResult,
  socialMatches, // NEW
});
```

### 8. Recommendation Prompt Update

**File:** `src/lib/research/prompts.ts`

**Add social profile handling to `RECOMMENDATION_SYSTEM_PROMPT`:**

```typescript
export const RECOMMENDATION_SYSTEM_PROMPT = `
... existing prompt ...

## SOCIAL PROFILE RECOMMENDATIONS

When social profile matches are provided:
- Generate recommendations for twitterUrl, githubUrl, and/or instagramUrl fields
- Use action: ADD if the contact doesn't have the profile URL
- Use action: UPDATE only if the existing URL appears to be different from the matched one
- Set confidence based on the match score provided (DO NOT lower it)
- In reasoning, explain WHY this profile appears to match (name match, company match, etc.)
- Include the source URL where the profile was discovered

Format for social recommendations:
{
  fieldName: 'twitterUrl' | 'githubUrl' | 'instagramUrl',
  action: 'ADD' | 'UPDATE',
  proposedValue: '<full profile URL>',
  reasoning: 'Profile matches based on: <specific signals>. Bio: <bio snippet if available>',
  confidence: <match confidence from discovery>,
  sourceUrls: ['<discovery source URL>']
}
`;
```

### 9. Recommendation Schema Update

**File:** `src/lib/research/schemas.ts`

```typescript
// Update fieldName enum to include social fields
const recommendationFieldSchema = z.enum([
  'expertise',
  'interests',
  'whyNow',
  'notes',
  'title',
  'organizationalTitle',
  'company',
  'location',
  'tags',
  'twitterUrl',   // NEW
  'githubUrl',    // NEW
  'instagramUrl', // NEW
]);
```

---

## Progress Stages

Update progress stage mapping in `ResearchProgressView.tsx`:

```typescript
const PROGRESS_STAGE_MAP: Record<string, number> = {
  'Building search query...': 0,
  'Extracting LinkedIn profile...': 1,
  'Searching the web...': 2,
  'Discovering social profiles...': 3,  // NEW - only when social selected
  'Analyzing findings...': 4,
  'Generating recommendations...': 5,
  'Research complete!': 6,
};
```

Note: The stepper should dynamically include/exclude the social step based on whether 'social' was selected. For simplicity in v1, always show all steps.

---

## Confidence Scoring

### Threshold
- Social profile recommendations: **0.65 minimum** (higher than 0.5 for other fields)

### Scoring Algorithm

| Signal | Weight | Notes |
|--------|--------|-------|
| Full name match | 0.40 | Both first AND last name in content |
| Partial name match | 0.30 | First and last name separately |
| Company match | 0.25 | Company name in content |
| Title/role match | 0.20 | Job title in content |
| Location match | 0.10 | Location in content |
| Tavily relevance | 0.05 | Tavily's relevance score |

Maximum possible: 1.0

### Confidence Thresholds

| Score | Classification | Action |
|-------|---------------|--------|
| ≥ 0.85 | High confidence | Show with green indicator |
| 0.65 - 0.84 | Medium confidence | Show with yellow indicator |
| < 0.65 | Low confidence | Filter out (don't show) |

---

## API Changes

### POST /api/contacts/[id]/research

**Request body (updated):**
```typescript
{
  focusAreas: ('professional' | 'expertise' | 'interests' | 'news' | 'social')[]
}
```

**Response:** No changes - recommendations now may include social field types.

### Apply Endpoint

No changes needed - existing apply logic handles any fieldName.

---

## UI/UX Details

### Social Profile Recommendation Card

When `fieldName` is `twitterUrl`, `githubUrl`, or `instagramUrl`:

1. **Icon:** Platform-specific icon (Twitter bird, GitHub octocat, Instagram camera)
2. **Label:** "Twitter/X Profile", "GitHub Profile", or "Instagram Profile"
3. **Value preview:** Show the URL with username highlighted
4. **Action button:** "Verify Profile Match" (opens URL in new tab)
5. **Confidence badge:** Color-coded based on score
6. **Bio snippet:** If available, show first ~100 chars of bio

```
┌─────────────────────────────────────────────────────────┐
│ 🐙 GitHub Profile                           [0.87 High] │
│                                                         │
│ github.com/johndoe                                      │
│                                                         │
│ Bio: "Software engineer at Acme Corp. Building..."      │
│                                                         │
│ Matched: Name + Company + Location                      │
│                                                         │
│ [Verify Profile Match ↗]    [Approve ✓]    [Reject ✗]  │
└─────────────────────────────────────────────────────────┘
```

### Focus Area Checkbox

```
┌─────────────────────────────────────────────────────────┐
│ [✓] Social Profiles                                     │
│     Find Twitter/X, GitHub, and Instagram profiles      │
└─────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Platform Search Failures
- If one platform search fails, continue with others
- Log error but don't fail entire research
- Only surface error if ALL platform searches fail

### Bio Extraction Failures
- If bio extraction fails for GitHub, proceed without bio
- Bio is optional enhancement, not required

### No Matches Found
- If no social profiles found with ≥0.65 confidence, don't generate recommendations
- This is expected behavior, not an error

---

## Implementation Tasks

### Phase 1: Schema & Types
- [ ] Add `twitterUrl`, `githubUrl`, `instagramUrl` to Contact model
- [ ] Run database migration
- [ ] Update `FocusArea` type to include `'social'`
- [ ] Update `ContactContext` interface
- [ ] Update recommendation field schema

### Phase 2: Social Discovery
- [ ] Create `src/lib/research/socialDiscovery.ts`
- [ ] Implement `discoverSocialProfiles()` function
- [ ] Implement profile parsing and scoring
- [ ] Implement `extractGitHubBio()` for bio extraction
- [ ] Add Tavily domain filtering support

### Phase 3: Orchestrator Integration
- [ ] Import social discovery in orchestrator
- [ ] Add conditional social discovery step
- [ ] Pass social matches to recommendation generator
- [ ] Update progress stages

### Phase 4: Prompt Engineering
- [ ] Add social profile section to recommendation prompt
- [ ] Ensure GPT generates social recommendations correctly
- [ ] Test confidence preservation

### Phase 5: UI Updates
- [ ] Add "Social Profiles" to ResearchOptionsModal
- [ ] Update RecommendationCard for social fields
- [ ] Add platform icons and "Verify Profile Match" button
- [ ] Style confidence badges for social

### Phase 6: Testing
- [ ] Test social discovery for various contacts
- [ ] Verify confidence scoring accuracy
- [ ] Test bio extraction
- [ ] Test UI rendering of social recommendations
- [ ] Test apply flow for social fields

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | Modified | Add twitterUrl, githubUrl, instagramUrl |
| `src/lib/research/types.ts` | Modified | Add 'social' to FocusArea, add fields to ContactContext |
| `src/lib/research/schemas.ts` | Modified | Add social fields to recommendation schema |
| `src/lib/research/socialDiscovery.ts` | **New** | Social profile discovery and scoring |
| `src/lib/research/orchestrator.ts` | Modified | Integrate social discovery |
| `src/lib/research/prompts.ts` | Modified | Add social recommendation instructions |
| `src/lib/research/tavilyClient.ts` | Modified | Add includeDomains parameter support |
| `src/components/research/ResearchOptionsModal.tsx` | Modified | Add Social Profiles checkbox |
| `src/components/research/RecommendationCard.tsx` | Modified | Social-specific rendering |
| `src/components/research/ResearchProgressView.tsx` | Modified | Add social discovery stage |

---

## Dependencies

- No new npm packages required
- Uses existing Tavily API integration
- Uses existing Lucide React icons (Twitter, Github, Instagram, AtSign)

---

## Success Criteria

1. **Discovery rate:** Find at least one social profile for 40%+ of contacts researched with 'social' selected
2. **Precision:** <10% false positive rate on recommendations shown (≥0.65 confidence)
3. **Bio extraction:** Successfully extract GitHub bios for 70%+ of matched GitHub profiles
4. **UX:** "Verify Profile Match" button clearly helps users confirm matches
5. **Performance:** Social discovery adds <10 seconds to total research time
6. **Cost:** <$1.50 additional Tavily cost per research run with social enabled

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low match rate for common names | High | Medium | Require company/title match for ≥0.65 |
| False positive social matches | Medium | High | 0.65 threshold, "Verify" button |
| Tavily can't extract Twitter/IG bios | High | Low | Graceful fallback to URL-only |
| Platform URL structure changes | Low | Medium | Robust URL parsing with fallbacks |
| User confusion about confidence | Medium | Medium | Clear badges, explanation in reasoning |
