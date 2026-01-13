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

const MODERATE_CONFIG: TavilyConfig = {
  maxResults: 10,
  searchDepth: 'basic',
  includeRawContent: true,
};

// Minimum relevance score from Tavily (0-1 scale)
// Sources below this threshold are filtered out as likely irrelevant
const MIN_RELEVANCE_SCORE = 0.3;

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

export async function searchTavily(
  query: string,
  personName?: string
): Promise<ResearchFindings> {
  // DEBUG: Log the query being sent to Tavily
  console.log(`[Tavily Search] Query: "${query}"`);
  console.log(`[Tavily Search] Person name filter: "${personName || 'none'}"`);
  console.log(`[Tavily Search] Config: depth=${MODERATE_CONFIG.searchDepth}, maxResults=${MODERATE_CONFIG.maxResults}`);

  const data = await tavilyFetch<TavilyResponse>('search', {
    query,
    search_depth: MODERATE_CONFIG.searchDepth,
    max_results: MODERATE_CONFIG.maxResults,
    include_raw_content: MODERATE_CONFIG.includeRawContent,
    include_answer: false,
  });

  // DEBUG: Log raw Tavily response
  console.log(`[Tavily Search] Raw results count: ${data.results?.length || 0}`);

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

  // DEBUG: Log all sources before filtering
  console.log(`[Tavily Search] Sources before filtering:`);
  allSources.forEach((s, i) => {
    console.log(`  [${i + 1}] score=${s.score.toFixed(2)} url=${s.url}`);
    console.log(`      title: ${s.title.slice(0, 80)}...`);
    console.log(`      content length: ${s.content.length} chars`);
  });

  // Filter sources by relevance score
  let filteredSources = allSources.filter((s) => s.score >= MIN_RELEVANCE_SCORE);
  const afterScoreFilter = filteredSources.length;
  console.log(`[Tavily Search] After score filter (>=${MIN_RELEVANCE_SCORE}): ${afterScoreFilter}/${allSources.length}`);

  // If person name provided, also filter to sources that mention the name
  if (personName) {
    const nameParts = personName.toLowerCase().split(' ').filter(Boolean);
    const lastName = nameParts[nameParts.length - 1];
    console.log(`[Tavily Search] Filtering for last name: "${lastName}"`);

    filteredSources = filteredSources.filter((s) => {
      const contentLower = ((s.content || '') + ' ' + (s.title || '')).toLowerCase();
      const hasName = lastName ? contentLower.includes(lastName) : true;
      if (!hasName) {
        console.log(`[Tavily Search] Filtered out (no name): ${s.url}`);
      }
      return hasName;
    });
    console.log(`[Tavily Search] After name filter: ${filteredSources.length}/${afterScoreFilter}`);
  }

  // Log final results
  console.log(`[Tavily Search] FINAL: ${filteredSources.length} sources passed all filters`);
  if (filteredSources.length === 0 && allSources.length > 0) {
    console.warn(`[Tavily Search] WARNING: All ${allSources.length} sources were filtered out!`);
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
