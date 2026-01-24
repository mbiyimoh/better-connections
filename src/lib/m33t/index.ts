/**
 * M33T - Intelligent Event Networking Platform
 *
 * This module provides all the core functionality for the M33T event networking system,
 * including profile extraction, matching algorithms, and token management.
 */

// Access Control
export { checkM33tAccess, m33tAccessDeniedResponse } from './access';

// Event Authorization (multi-organizer support)
export {
  checkEventAccess,
  requireEventAccess,
  type EventPermission,
  type EventAccessResult,
} from './auth';

// Schemas and Types
export * from './schemas';

// Questions
export * from './questions';

// Token Management
export {
  generateRSVPToken,
  verifyRSVPToken,
  isTokenExpired,
  generateRSVPUrl,
  type RSVPTokenPayload,
} from './tokens';

// Profile Extraction
export {
  extractProfile,
  extractProfileWithTimeout,
  createFallbackProfile,
} from './extraction';

// Matching Algorithm
export {
  calculateMatchScore,
  generateEventMatches,
  generateWhyMatchReasons,
  generateConversationStarters,
  jaccardSimilarity,
  fuzzyJaccardSimilarity,
  type MatchableProfile,
  type MatchScore,
  type MatchScoreComponents,
} from './matching';

// Slug Generation
export { generateSlug, generateUniqueSlug } from './slug';

// Formatting Utilities
export { formatEventDate, formatEventTime, formatEventTimeRange } from './formatting';

// Profile Richness Calculation
export {
  calculateProfileRichness,
  calculateAttendeeRichness,
} from './profileRichness';

// Attendee Sorting
export {
  sortAttendeesByDisplayOrder,
  sortAttendeeGroups,
} from './attendeeSort';
