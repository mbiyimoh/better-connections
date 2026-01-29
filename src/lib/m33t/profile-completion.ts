/**
 * M33T Attendee Profile Completion Utilities
 *
 * Calculates profile completion percentage based on attendee data
 * for display on event cards, profile pages, and completion prompts.
 */

export interface AttendeeForCompletion {
  firstName: string;
  lastName?: string | null;
  profile?: unknown;
  tradingCard?: unknown;
}

/**
 * Calculate profile completion percentage for an event attendee
 *
 * Scoring breakdown (100 points max):
 * - Basic info: firstName (10), lastName (10) = 20 points
 * - Profile: role (10), company (10), location (10) = 30 points
 * - Trading card: currentFocus (15), seeking (15), offering (10), expertise (10) = 50 points
 *
 * @param attendee - Attendee data with profile and tradingCard JSON fields
 * @returns Completion percentage 0-100
 */
export function calculateAttendeeProfileCompletion(attendee: AttendeeForCompletion): number {
  let score = 0;
  const maxScore = 100;

  // Basic info (20 points)
  if (attendee.firstName) score += 10;
  if (attendee.lastName) score += 10;

  // Profile data (30 points)
  const profile = attendee.profile as Record<string, unknown> | null;
  if (profile) {
    if (profile.role) score += 10;
    if (profile.company) score += 10;
    if (profile.location) score += 10;
  }

  // Trading card data (50 points)
  const tradingCard = attendee.tradingCard as Record<string, unknown> | null;
  if (tradingCard) {
    if (tradingCard.currentFocus) score += 15;
    if (tradingCard.seeking) score += 15;
    if (tradingCard.offering) score += 10;
    if (tradingCard.expertise && Array.isArray(tradingCard.expertise) && tradingCard.expertise.length > 0) {
      score += 10;
    }
  }

  return Math.min(Math.round((score / maxScore) * 100), 100);
}

/**
 * Check if profile completion is below recommended threshold
 * @param completion - Completion percentage
 * @returns true if profile needs more information
 */
export function isProfileIncomplete(completion: number): boolean {
  return completion < 80;
}
