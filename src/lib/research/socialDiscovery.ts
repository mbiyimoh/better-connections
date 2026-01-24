import { searchTavily, extractUrl } from './tavilyClient';
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
// Lowered from 0.65 to 0.55 because confidence scoring algorithm maxes around 0.75-0.8
// and social snippets often don't include all context (name, company, title)
const SOCIAL_CONFIDENCE_THRESHOLD = 0.55;

export async function discoverSocialProfiles(
  contact: ContactContext,
  onProgress?: (stage: string) => void | Promise<void>
): Promise<SocialDiscoveryResult> {
  const matches: SocialProfileMatch[] = [];
  const searchQueries: string[] = [];

  // Build base query from contact context
  const nameQuery = `"${contact.firstName} ${contact.lastName}"`;
  const contextHints = [contact.company, contact.title, contact.location]
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  // Track results per platform for summary logging
  const platformResults: Record<string, { found: number; matched: number }> = {};

  // Search each platform in parallel
  const platformSearches = Object.entries(PLATFORM_DOMAINS).map(
    async ([platform, domains]) => {
      await onProgress?.(`Searching ${platform}...`);

      // Build query within Tavily's 400 char limit
      const query = `${nameQuery} ${contextHints}`.slice(0, 350);
      searchQueries.push(`${platform}: ${query}`);

      try {
        // Note: Do NOT pass personName here - social profile results often don't have
        // the full name in the content snippet, and name-filtering would remove valid profiles.
        // Instead, parseAndScoreProfile handles name matching via confidence scoring.
        const results = await searchTavily(query, undefined, {
          includeDomains: domains,
          maxResults: 5,
        });

        let matchedCount = 0;
        for (const result of results.sources) {
          const match = parseAndScoreProfile(
            result,
            platform as 'twitter' | 'github' | 'instagram',
            contact
          );
          if (match && match.confidence >= SOCIAL_CONFIDENCE_THRESHOLD) {
            matches.push(match);
            matchedCount++;
          }
        }
        platformResults[platform] = { found: results.sources.length, matched: matchedCount };
      } catch (error) {
        console.error(`[Social] ${platform} search failed:`, error);
        platformResults[platform] = { found: 0, matched: 0 };
        // Continue with other platforms
      }
    }
  );

  await Promise.all(platformSearches);

  // Deduplicate by platform (keep highest confidence)
  const deduped = deduplicateByPlatform(matches);

  // Log single summary line
  const platformSummary = Object.entries(platformResults)
    .map(([p, r]) => `${p}:${r.matched}/${r.found}`)
    .join(' ');
  console.log(`[Social] ${contact.firstName} ${contact.lastName}: ${deduped.length} profiles found (${platformSummary})`);

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
  const { displayName, bio } = extractProfileInfo(result.content);

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
      if (!username) return null;
      // Exclude common non-profile paths
      if (['search', 'explore', 'settings', 'i', 'intent', 'home', 'notifications'].includes(username)) {
        return null;
      }
      return username;
    }

    if (platform === 'instagram') {
      // instagram.com/username
      const username = pathParts[0];
      if (!username) return null;
      if (['p', 'reel', 'reels', 'explore', 'accounts', 'direct', 'stories'].includes(username)) {
        return null;
      }
      return username;
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

function extractProfileInfo(content: string): { displayName?: string; bio?: string } {
  // Basic extraction from search result content
  // This is best-effort - Tavily snippets vary in structure

  // Look for common patterns like "Name - Bio" or "Name | Title"
  const lines = content.split('\n').filter(Boolean);

  return {
    displayName: undefined, // Let GPT extract this in synthesis
    bio: lines.length > 1 ? lines.slice(1).join(' ').slice(0, 300) : undefined,
  };
}

/**
 * Extract bio from a GitHub profile page
 */
export async function extractGitHubBio(profileUrl: string): Promise<string | null> {
  try {
    const extraction = await extractUrl(profileUrl);
    if (!extraction.success || !extraction.content) return null;

    const content = extraction.content;

    // GitHub profile pages have structured bio sections
    // Look for bio patterns in the extracted content
    const bioMatch = content.match(/Bio[:\s]+([^\n]+)/i);
    if (bioMatch && bioMatch[1]) return bioMatch[1].trim();

    // Try alternative pattern: look for text between name and stats
    const lines = content.split('\n').filter(Boolean);
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      const line = rawLine.trim();
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
