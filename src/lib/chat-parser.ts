/**
 * Parse AI responses to extract contact suggestions.
 * Format: [CONTACT: {contact_id}] {name} - {reason}
 */

export interface ParsedContactSuggestion {
  contactId: string;
  name: string;
  reason: string;
}

/**
 * Pattern string for matching contact references in AI responses.
 * Format: [CONTACT: identifier] Name - Reason
 * Groups: (1) contactIdentifier (ID or email), (2) name, (3) reason
 *
 * The identifier can be:
 * - A contact ID: abc123, cm1234xyz, user-id-123
 * - An email address: john@example.com
 *
 * @example
 * "[CONTACT: abc123] John Smith - Expert in AI"
 * "[CONTACT: john@example.com] John Smith - Expert in AI"
 * Groups: ["abc123" or "john@example.com", "John Smith", "Expert in AI"]
 *
 * IMPORTANT: Always create a new RegExp with 'g' flag when using this pattern
 * to avoid shared state issues between modules.
 */
export const CONTACT_PATTERN_STRING = "\\[CONTACT:\\s*([a-zA-Z0-9_.@+-]+)\\]\\s*([^-\\n]+)\\s*-\\s*([^\\n\\[]+)";

/**
 * Creates a fresh regex instance for matching contact patterns.
 * Use this instead of a shared global regex to avoid lastIndex state issues.
 */
export function createContactPattern(): RegExp {
  return new RegExp(CONTACT_PATTERN_STRING, "g");
}

/**
 * Extract contact suggestions from AI response text
 */
export function parseContactSuggestions(text: string): ParsedContactSuggestion[] {
  const suggestions: ParsedContactSuggestion[] = [];
  const pattern = createContactPattern();
  let match;

  while ((match = pattern.exec(text)) !== null) {
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
    .replace(createContactPattern(), "**$2** - $3")
    .trim();
}

/**
 * Check if a response contains contact suggestions
 */
export function hasContactSuggestions(text: string): boolean {
  return createContactPattern().test(text);
}

/**
 * Extract unique contact IDs from text
 */
export function extractContactIds(text: string): string[] {
  const suggestions = parseContactSuggestions(text);
  return [...new Set(suggestions.map((s) => s.contactId))];
}
