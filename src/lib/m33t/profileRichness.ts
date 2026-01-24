import type { Profile } from './schemas';

/**
 * Internal type for trading card data structure.
 * Used for type-safe property access after runtime type checking.
 */
interface TradingCardShape {
  background?: string;
  whyInteresting?: string;
  whyMatch?: string[];
  conversationStarters?: string[];
}

/**
 * Scoring weights for profile richness calculation.
 * Higher scores = richer profiles that should appear first when auto-sorting.
 *
 * | Field             | Points | Notes                           |
 * |-------------------|--------|----------------------------------|
 * | currentFocus      | 20     | Most valuable - shows engagement |
 * | expertise[]       | 15     | Array has 1+ items              |
 * | role/title        | 15     | Job title present               |
 * | conversationHooks | 15     | Array has 1+ items              |
 * | company           | 10     | Company name present            |
 * | name              | 10     | Full name (not just email)      |
 * | tradingCard       | 10     | Trading card data exists        |
 * | location          | 5      | Location present                |
 * | Total             | 100    |                                  |
 */

/**
 * Calculate a 0-100 "richness" score based on profile completeness.
 * Higher scores indicate more complete/valuable profiles for display ordering.
 *
 * @param profile - The attendee's extracted profile (nullable)
 * @param tradingCard - Prisma JSON field (Record<string, unknown> at runtime)
 * @param firstName - The attendee's first name
 * @param lastName - The attendee's last name (optional)
 * @returns A score from 0-100
 */
export function calculateProfileRichness(
  profile: Profile | null | undefined,
  tradingCard: Record<string, unknown> | null | undefined,
  firstName: string,
  lastName?: string | null
): number {
  let score = 0;

  // currentFocus (20 points) - Most valuable field, shows engagement
  if (profile?.currentFocus && profile.currentFocus.trim()) {
    score += 20;
  }

  // expertise array (15 points) - Has 1+ items
  if (profile?.expertise && profile.expertise.length > 0) {
    score += 15;
  }

  // role/title (15 points) - Job title present
  if (profile?.role && profile.role.trim()) {
    score += 15;
  }

  // conversationHooks array (15 points) - Has 1+ items
  if (profile?.conversationHooks && profile.conversationHooks.length > 0) {
    score += 15;
  }

  // company (10 points) - Company name present
  if (profile?.company && profile.company.trim()) {
    score += 10;
  }

  // name (10 points) - Full name, not just email-like
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
  if (fullName && !fullName.includes('@') && fullName.length > 2) {
    score += 10;
  }

  // location (5 points) - Location present
  if (profile?.location && profile.location.trim()) {
    score += 5;
  }

  // tradingCard (10 points) - Any meaningful content
  if (tradingCard && typeof tradingCard === 'object') {
    const card = tradingCard as TradingCardShape;
    const hasTradingCardContent =
      (typeof card.background === 'string' && card.background.trim()) ||
      (typeof card.whyInteresting === 'string' && card.whyInteresting.trim()) ||
      (Array.isArray(card.whyMatch) && card.whyMatch.length > 0) ||
      (Array.isArray(card.conversationStarters) && card.conversationStarters.length > 0);

    if (hasTradingCardContent) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Calculate richness from a full EventAttendee record.
 * Convenience wrapper for use with Prisma query results.
 *
 * @param attendee - An object containing firstName, lastName, profile, and tradingCard
 * @returns A score from 0-100
 */
export function calculateAttendeeRichness(attendee: {
  firstName: string;
  lastName?: string | null;
  profile?: unknown;
  tradingCard?: unknown;
}): number {
  return calculateProfileRichness(
    attendee.profile as Profile | null,
    attendee.tradingCard as Record<string, unknown> | null,
    attendee.firstName,
    attendee.lastName
  );
}
