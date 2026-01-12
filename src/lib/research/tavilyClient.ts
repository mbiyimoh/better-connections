import type { TavilySearchResult, ResearchFindings } from './types';

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

export async function searchTavily(query: string): Promise<ResearchFindings> {
  const apiKey = getTavilyApiKey();

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: MODERATE_CONFIG.searchDepth,
      max_results: MODERATE_CONFIG.maxResults,
      include_raw_content: MODERATE_CONFIG.includeRawContent,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${error}`);
  }

  const data: TavilyResponse = await response.json();

  const sources: TavilySearchResult[] = (data.results || []).map(
    (r: TavilyResult) => ({
      url: r.url,
      title: r.title,
      content: r.content || r.raw_content || '',
      score: r.score || 0,
      publishedDate: r.published_date,
    })
  );

  return {
    query,
    sources,
    sourcesAnalyzed: sources.length,
  };
}
