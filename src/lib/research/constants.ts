/**
 * Research URL validation constants
 * Centralized to prevent drift between validation layers
 */

// Placeholder domains that GPT hallucinations often use
export const FORBIDDEN_URL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'placeholder.com',
  'localhost',
  '127.0.0.1',
] as const;

// Valid URL protocols for recommendations
export const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'] as const;

// Minimum confidence threshold for recommendations
export const MIN_CONFIDENCE_THRESHOLD = 0.5;

// Minimum confidence for social profile matches
export const SOCIAL_CONFIDENCE_THRESHOLD = 0.55;

/**
 * Validates a URL for use in recommendations
 * Returns null if valid, or an error reason if invalid
 */
export function validateRecommendationUrl(
  url: string,
  validSources?: Set<string>
): { valid: true } | { valid: false; reason: string } {
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, reason: 'malformed URL' };
  }

  // Only allow HTTP/HTTPS protocols
  if (!ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol as typeof ALLOWED_URL_PROTOCOLS[number])) {
    return { valid: false, reason: `invalid protocol: ${parsedUrl.protocol}` };
  }

  // Check hostname against forbidden domains (exact match or subdomain)
  const hostname = parsedUrl.hostname.toLowerCase();
  const isForbidden = FORBIDDEN_URL_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (isForbidden) {
    return { valid: false, reason: 'forbidden placeholder domain' };
  }

  // Check against valid source URLs if provided
  if (validSources && validSources.size > 0 && !validSources.has(url)) {
    return { valid: false, reason: 'not in valid sources list' };
  }

  return { valid: true };
}

/**
 * Sanitizes a URL for safe inclusion in prompts
 * Prevents prompt injection via malformed URLs
 */
export function sanitizeUrlForPrompt(url: string): string {
  // Validate URL format first
  try {
    new URL(url);
  } catch {
    return '[INVALID_URL]';
  }

  // Escape potential prompt injection characters
  return url
    .replace(/\n/g, '') // Remove newlines
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/```/g, '') // Remove markdown code blocks
    .trim();
}

/**
 * Filters an array of URLs, removing invalid ones
 * Returns only valid URLs
 */
export function filterValidUrls(
  urls: string[],
  validSources?: Set<string>,
  logPrefix = '[Research]'
): string[] {
  return urls.filter((url) => {
    const result = validateRecommendationUrl(url, validSources);
    if (!result.valid) {
      console.log(`${logPrefix} Filtering out URL (${result.reason}): ${url}`);
      return false;
    }
    return true;
  });
}
