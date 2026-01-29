/**
 * Extract the RSVP base path from the current URL pathname.
 * Used in client components via usePathname() to build navigation URLs
 * that preserve the slug context.
 *
 * Handles both URL structures:
 * - New: /m33t/[slug]/rsvp/[token]/... → returns "/m33t/[slug]/rsvp/[token]"
 * - Legacy: /rsvp/[token]/... → returns "/rsvp/[token]"
 */
export function getRsvpBasePath(pathname: string): string {
  // New structure: /m33t/{slug}/rsvp/{token}
  const m33tMatch = pathname.match(/^(\/m33t\/[^/]+\/rsvp\/[^/]+)/);
  if (m33tMatch?.[1]) {
    return m33tMatch[1];
  }

  // Legacy structure: /rsvp/{token}
  const legacyMatch = pathname.match(/^(\/rsvp\/[^/]+)/);
  if (legacyMatch?.[1]) {
    return legacyMatch[1];
  }

  // Fallback (shouldn't happen in RSVP context)
  return pathname;
}

/**
 * Build an RSVP URL from server-side context (API routes, server components).
 * Uses the branded /m33t/[slug]/rsvp/[token] structure when a slug is available.
 *
 * @param baseUrl - The app base URL (e.g., "https://bettercontacts.ai")
 * @param slug - The event slug (null falls back to legacy /rsvp/ path)
 * @param token - The JWT RSVP token
 * @param subpath - Optional subpath (e.g., "/matches", "/question-sets")
 */
export function buildRsvpUrl(
  baseUrl: string,
  slug: string | null | undefined,
  token: string,
  subpath?: string
): string {
  const base = slug
    ? `${baseUrl}/m33t/${slug}/rsvp/${token}`
    : `${baseUrl}/rsvp/${token}`;
  return subpath ? `${base}${subpath}` : base;
}
