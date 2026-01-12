import matter from 'gray-matter';
import type { Update, UpdateSummaryItem } from './types';

/**
 * Converts a string to kebab-case for use as IDs
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Parses summary bullets from the Summary section
 * Format: - **Title** - Description
 */
function parseSummaryBullets(summaryContent: string): Omit<UpdateSummaryItem, 'details'>[] {
  const bulletRegex = /^- \*\*(.+?)\*\* - (.+)$/gm;
  const items: Omit<UpdateSummaryItem, 'details'>[] = [];

  let match;
  while ((match = bulletRegex.exec(summaryContent)) !== null) {
    const title = match[1] ?? '';
    const summary = match[2] ?? '';
    items.push({
      id: toKebabCase(title),
      title,
      summary,
    });
  }

  return items;
}

/**
 * Parses H3 headings and their content from the Details section
 * Returns a map of heading title -> content
 */
function parseDetailsHeadings(detailsContent: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingRegex = /### (.+)\n([\s\S]*?)(?=### |$)/g;

  let match;
  while ((match = headingRegex.exec(detailsContent)) !== null) {
    const heading = match[1];
    const content = match[2];
    if (heading && content) {
      sections[heading] = content.trim();
    }
  }

  return sections;
}

/**
 * Parses a markdown update file into a structured Update object
 *
 * Expected format:
 * ---
 * version: "2026-01-11"
 * title: "Feature Title"
 * published: true
 * ---
 *
 * ## Summary
 *
 * - **Feature 1** - Brief description
 * - **Feature 2** - Brief description
 *
 * ## Details
 *
 * ### Feature 1
 *
 * Detailed explanation...
 *
 * ### Feature 2
 *
 * Detailed explanation...
 */
export function parseUpdateMarkdown(markdown: string): Update {
  const { data, content } = matter(markdown);

  // Extract summary items from ## Summary section
  const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=## Details|$)/);
  const detailsMatch = content.match(/## Details\n([\s\S]*?)$/);

  const summaryItems = parseSummaryBullets(summaryMatch?.[1] || '');
  const detailsMap = parseDetailsHeadings(detailsMatch?.[1] || '');

  // Match summary items with their details
  const items: UpdateSummaryItem[] = summaryItems.map(item => ({
    ...item,
    details: detailsMap[item.title] || '',
  }));

  return {
    version: data.version || 'unknown',
    title: data.title || 'Untitled Update',
    published: data.published ?? false,
    items,
  };
}
