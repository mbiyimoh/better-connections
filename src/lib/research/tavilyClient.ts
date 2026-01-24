import type { TavilySearchResult, ResearchFindings, LinkedInExtraction } from './types';

interface TavilyConfig {
  maxResults: number;
  searchDepth: 'basic' | 'advanced';
  includeRawContent: boolean;
}

interface TavilyResult {
  url: string;
  title: string;
  content?: string;
  raw_content?: string;
  score?: number;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

// Use 'advanced' depth to get multiple semantically relevant snippets per URL
// This costs 2 credits per search but provides much better results for person research
const SEARCH_CONFIG: TavilyConfig = {
  maxResults: 10,
  searchDepth: 'advanced',
  includeRawContent: true,
};

// Minimum relevance score from Tavily (0-1 scale)
// Lowered from 0.3 to 0.2 to avoid filtering out relevant results
// that Tavily scored lower due to name ambiguity
const MIN_RELEVANCE_SCORE = 0.2;

// Lazy initialization pattern (same as openai.ts)
let _tavilyApiKey: string | null = null;

function getTavilyApiKey(): string {
  if (!_tavilyApiKey) {
    _tavilyApiKey = process.env.TAVILY_API_KEY || '';
    if (!_tavilyApiKey) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }
  }
  return _tavilyApiKey;
}

/**
 * Common fetch helper for Tavily API calls
 */
async function tavilyFetch<T>(
  endpoint: 'search' | 'extract',
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getTavilyApiKey();

  const response = await fetch(`https://api.tavily.com/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, ...body }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily ${endpoint} API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export interface SearchOptions {
  includeDomains?: string[];
  maxResults?: number;
  /**
   * Override the default search depth.
   * IMPORTANT: Use 'basic' for domain-filtered searches (like social profiles)
   * because 'advanced' + include_domains often returns empty results.
   * See: https://github.com/langchain-ai/langchain/issues/17447
   */
  searchDepth?: 'basic' | 'advanced';
}

export async function searchTavily(
  query: string,
  personName?: string,
  options?: SearchOptions
): Promise<ResearchFindings> {
  const maxResults = options?.maxResults ?? SEARCH_CONFIG.maxResults;
  // Check for valid (non-empty) domain filter
  const hasValidDomains = options?.includeDomains && options.includeDomains.length > 0;
  // Use 'basic' depth when domain filtering is active (social profile searches)
  // because 'advanced' + include_domains often returns empty results
  // See: https://github.com/langchain-ai/langchain/issues/17447
  const searchDepth = options?.searchDepth ??
    (hasValidDomains ? 'basic' : SEARCH_CONFIG.searchDepth);

  // Log search configuration (single summary line for production)
  const domainInfo = hasValidDomains ? ` domains=[${options!.includeDomains!.join(',')}]` : '';
  console.log(`[Tavily] Searching: "${query.slice(0, 60)}..." depth=${searchDepth} max=${maxResults}${domainInfo}`);

  const body: Record<string, unknown> = {
    query,
    search_depth: searchDepth,
    max_results: maxResults,
    include_raw_content: SEARCH_CONFIG.includeRawContent,
    include_answer: false,
  };

  // Add domain filter if valid
  if (hasValidDomains) {
    body.include_domains = options!.includeDomains;
  }

  const data = await tavilyFetch<TavilyResponse>('search', body);

  // Map all results first
  const allSources: TavilySearchResult[] = (data.results || []).map(
    (r: TavilyResult) => ({
      url: r.url,
      title: r.title,
      content: r.content || r.raw_content || '',
      score: r.score || 0,
      publishedDate: r.published_date,
    })
  );

  // Filter sources by relevance score
  let filteredSources = allSources.filter((s) => s.score >= MIN_RELEVANCE_SCORE);
  const afterScoreFilter = filteredSources.length;

  // If person name provided, apply name filter but with fallback
  // Only filter by name if we have enough results to be selective
  // This prevents filtering out all results when snippets don't mention the name
  if (personName && filteredSources.length > 3) {
    const nameParts = personName.toLowerCase().split(' ').filter(Boolean);
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];

    const nameFilteredSources = filteredSources.filter((s) => {
      const contentLower = ((s.content || '') + ' ' + (s.title || '')).toLowerCase();
      // Check for either first name or last name (more lenient)
      const hasLastName = lastName ? contentLower.includes(lastName) : false;
      const hasFirstName = firstName ? contentLower.includes(firstName) : false;
      return hasLastName || hasFirstName;
    });

    // Only apply name filter if it doesn't remove ALL sources
    if (nameFilteredSources.length > 0) {
      filteredSources = nameFilteredSources;
    }
  }

  // Log summary result (single line for production)
  const filterSummary = personName ? ` name-filtered=${filteredSources.length}/${afterScoreFilter}` : '';
  console.log(`[Tavily] Results: ${allSources.length} raw → ${filteredSources.length} final${filterSummary}`);
  if (filteredSources.length === 0 && allSources.length > 0) {
    console.warn(`[Tavily] WARNING: All ${allSources.length} sources filtered out`);
  }

  return {
    query,
    sources: filteredSources,
    sourcesAnalyzed: allSources.length,
  };
}

/**
 * Extract content directly from a LinkedIn profile URL using Tavily Extract API.
 * This is more reliable than searching for LinkedIn profiles.
 */
interface TavilyExtractResponse {
  results?: Array<{ raw_content?: string }>;
  failed_results?: string[];
}

/**
 * Extract content from any URL using Tavily Extract API.
 * Generic version for use with social profiles and other pages.
 */
export async function extractUrl(
  url: string
): Promise<{ success: boolean; content: string | null; error?: string }> {
  try {
    const data = await tavilyFetch<TavilyExtractResponse>('extract', {
      urls: [url],
      extract_depth: 'basic',
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

export async function extractLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInExtraction> {
  // Validate URL is actually a LinkedIn URL
  if (!linkedinUrl.includes('linkedin.com')) {
    return {
      success: false,
      url: linkedinUrl,
      rawContent: null,
      error: 'Not a LinkedIn URL',
    };
  }

  try {
    const data = await tavilyFetch<TavilyExtractResponse>('extract', {
      urls: [linkedinUrl],
      extract_depth: 'advanced', // Required for LinkedIn
      include_images: false,
      timeout: 30, // LinkedIn can be slow
    });

    // Check if extraction succeeded
    const firstResult = data.results?.[0];
    const rawContent = firstResult?.raw_content;
    if (rawContent) {
      console.log(`[Tavily Extract] Successfully extracted LinkedIn profile (${rawContent.length} chars)`);
      return {
        success: true,
        url: linkedinUrl,
        rawContent,
      };
    }

    // Check if URL failed
    if (data.failed_results && data.failed_results.length > 0) {
      console.warn(`[Tavily Extract] Failed to extract LinkedIn: ${data.failed_results[0]}`);
      return {
        success: false,
        url: linkedinUrl,
        rawContent: null,
        error: 'Extraction failed - URL may be inaccessible',
      };
    }

    return {
      success: false,
      url: linkedinUrl,
      rawContent: null,
      error: 'No content returned',
    };
  } catch (error) {
    console.error('[Tavily Extract] Exception:', error);
    return {
      success: false,
      url: linkedinUrl,
      rawContent: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
