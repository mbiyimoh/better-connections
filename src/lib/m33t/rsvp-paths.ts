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
 *
 * When no subpath is provided, returns the personalized event landing page URL
 * (/m33t/{slug}?token=...) so invitees see the full experience (scrollytelling,
 * hero with "Welcome, {name}", "RSVP Here" CTA) before entering the RSVP flow.
 *
 * When a subpath is provided (e.g., "/matches", "/question-sets"), returns the
 * direct RSVP route (/m33t/{slug}/rsvp/{token}/...) for deep links.
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
  if (subpath) {
    // Deep links go directly to the RSVP sub-page
    const base = slug
      ? `${baseUrl}/m33t/${slug}/rsvp/${token}`
      : `${baseUrl}/rsvp/${token}`;
    return `${base}${subpath}`;
  }

  // Base invite link → personalized landing page
  return slug
    ? `${baseUrl}/m33t/${slug}?token=${token}`
    : `${baseUrl}/rsvp/${token}`;
}
