export interface ContactContext {
  id: string;
  firstName: string;
  lastName: string;
  primaryEmail: string | null;
  title: string | null; // Job role (e.g., "Venture Capitalist")
  organizationalTitle: string | null; // Position within org (e.g., "President")
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  expertise: string | null;
  interests: string | null;
  whyNow: string | null;
  notes: string | null;
}

export type FocusArea = 'professional' | 'expertise' | 'interests' | 'news';

export interface ResearchOptions {
  contact: ContactContext;
  focusAreas: FocusArea[];
  onProgress?: (stage: string) => void | Promise<void>;
}

export interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface ResearchFindings {
  query: string;
  sources: TavilySearchResult[];
  sourcesAnalyzed: number;
}

export interface SynthesizedReport {
  summary: string; // 3-5 bullet points
  fullReport: string; // Detailed markdown
  sourceUrls: string[];
}

export interface GeneratedRecommendation {
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  currentValue: string | null;
  proposedValue: string;
  tagCategory?: string;
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
}

export interface ResearchResult {
  success: boolean;
  searchQuery: string;
  findings: ResearchFindings | null;
  report: SynthesizedReport | null;
  recommendations: GeneratedRecommendation[];
  executionTimeMs: number;
  error?: string;
}

// Human-readable labels for contact fields
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
};
