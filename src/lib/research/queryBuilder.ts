import type { ContactContext, FocusArea } from './types';

const TAVILY_MAX_QUERY_LENGTH = 400;

export function buildSearchQuery(
  contact: ContactContext,
  focusAreas: FocusArea[]
): string {
  const parts: string[] = [];

  // Always include full name in quotes for exact match
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  parts.push(`"${fullName}"`);

  // Add professional context for disambiguation
  if (contact.company) {
    parts.push(contact.company);
  }
  if (contact.title) {
    parts.push(contact.title);
  }
  if (contact.location) {
    parts.push(contact.location);
  }

  // Add focus-specific terms
  if (focusAreas.includes('professional')) {
    parts.push('career background work experience');
  }
  if (focusAreas.includes('expertise')) {
    parts.push('expertise skills specialization');
  }
  if (focusAreas.includes('interests')) {
    parts.push('interests hobbies personal');
  }
  if (focusAreas.includes('news')) {
    parts.push('news announcement recent 2024 2025 2026');
  }

  // Combine and enforce character limit
  let query = parts.join(' ');

  if (query.length > TAVILY_MAX_QUERY_LENGTH) {
    // Prioritize: name + company + title, truncate the rest
    const essential = [`"${fullName}"`, contact.company, contact.title]
      .filter(Boolean)
      .join(' ');

    const remaining = TAVILY_MAX_QUERY_LENGTH - essential.length - 1;
    const focusTerms = parts.slice(3).join(' ').slice(0, remaining);
    query = `${essential} ${focusTerms}`.trim();
  }

  // ALWAYS enforce limit (GPT doesn't always respect limits)
  return query.slice(0, TAVILY_MAX_QUERY_LENGTH);
}
