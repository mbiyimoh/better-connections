/**
 * Parse AI responses to extract contact suggestions.
 * Format: [CONTACT: {contact_id}] {name} - {reason}
 */

export interface ParsedContactSuggestion {
  contactId: string;
  name: string;
  reason: string;
}

const CONTACT_PATTERN = /\[CONTACT:\s*([a-zA-Z0-9-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g;

/**
 * Extract contact suggestions from AI response text
 */
export function parseContactSuggestions(text: string): ParsedContactSuggestion[] {
  const suggestions: ParsedContactSuggestion[] = [];
  let match;

  // Reset regex state
  CONTACT_PATTERN.lastIndex = 0;

  while ((match = CONTACT_PATTERN.exec(text)) !== null) {
    const contactId = match[1];
    const name = match[2];
    const reason = match[3];

    if (contactId && name && reason) {
      suggestions.push({
        contactId: contactId.trim(),
        name: name.trim(),
        reason: reason.trim(),
      });
    }
  }

  return suggestions;
}

/**
 * Remove contact tags from text for cleaner display
 */
export function cleanResponseText(text: string): string {
  return text
    .replace(CONTACT_PATTERN, "**$2** - $3")
    .trim();
}

/**
 * Check if a response contains contact suggestions
 */
export function hasContactSuggestions(text: string): boolean {
  CONTACT_PATTERN.lastIndex = 0;
  return CONTACT_PATTERN.test(text);
}

/**
 * Extract unique contact IDs from text
 */
export function extractContactIds(text: string): string[] {
  const suggestions = parseContactSuggestions(text);
  return [...new Set(suggestions.map((s) => s.contactId))];
}
