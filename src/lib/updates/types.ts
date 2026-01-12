// /src/lib/updates/types.ts

export interface UpdateSummaryItem {
  id: string;           // Generated from title (kebab-case)
  title: string;        // Bold text from bullet
  summary: string;      // Text after the bold title
  details: string;      // Markdown content from Details section
}

export interface Update {
  version: string;      // "2026-01-11"
  title: string;        // "AI-Powered Contact Research"
  published: boolean;
  items: UpdateSummaryItem[];
}
