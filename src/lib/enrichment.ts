/**
 * Calculate enrichment score based on filled contact fields.
 * Score weights are defined per spec - "Why Now" is most valuable at 20 points.
 */
export interface EnrichmentScoreInput {
  // Name fields (split)
  firstName?: string | null;
  lastName?: string | null;

  // Email fields (primary/secondary)
  primaryEmail?: string | null;
  secondaryEmail?: string | null;

  // Phone fields (primary/secondary)
  primaryPhone?: string | null;
  secondaryPhone?: string | null;

  // Other fields
  title?: string | null;
  company?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  howWeMet?: string | null;
  whyNow?: string | null;
  notes?: string | null;
  expertise?: string | null;
  interests?: string | null;
}

export function calculateEnrichmentScore(
  contact: EnrichmentScoreInput,
  tagCount: number = 0
): number {
  let score = 0;

  // Name: 10 points total (firstName required, lastName bonus)
  if (contact.firstName) score += 7;
  if (contact.lastName) score += 3;

  // Email: 10 points (primary gets full, secondary is bonus)
  if (contact.primaryEmail) score += 8;
  if (contact.secondaryEmail) score += 2;

  // Phone: 5 points
  if (contact.primaryPhone) score += 4;
  if (contact.secondaryPhone) score += 1;

  // Other fields (unchanged weights)
  if (contact.title) score += 10;
  if (contact.company) score += 10;
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20; // Still most valuable field
  if (contact.notes) score += 5;
  if (tagCount > 0) score += 5;

  return Math.min(score, 100);
}

/**
 * Contact data needed for priority calculation
 */
export interface EnrichmentPriorityInput {
  enrichmentScore: number;
  lastEnrichedAt?: Date | null;
  createdAt: Date;
}

/**
 * Calculate enrichment priority for a contact.
 * Higher priority (0-100) = needs enrichment more urgently.
 *
 * Factors:
 * - Lower enrichment score = higher priority
 * - Longer time since last enrichment = higher priority
 * - Never enriched contacts get bonus priority
 */
export function getEnrichmentPriority(contact: EnrichmentPriorityInput): number {
  const now = new Date();

  // Base priority from inverse of enrichment score (0-50 points)
  // Low score = high priority
  const scorePriority = Math.round((100 - contact.enrichmentScore) / 2);

  // Days since last enrichment (0-30 points)
  const daysSinceEnrichment = contact.lastEnrichedAt
    ? Math.floor((now.getTime() - contact.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  let stalePriority = 0;
  if (daysSinceEnrichment === Infinity) {
    // Never enriched - high priority
    stalePriority = 30;
  } else if (daysSinceEnrichment > 90) {
    stalePriority = 25;
  } else if (daysSinceEnrichment > 30) {
    stalePriority = 15;
  } else if (daysSinceEnrichment > 7) {
    stalePriority = 5;
  }

  // Bonus for new contacts (0-20 points)
  const daysSinceCreated = Math.floor(
    (now.getTime() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let newContactPriority = 0;
  if (daysSinceCreated <= 1) {
    newContactPriority = 20; // Just added today/yesterday
  } else if (daysSinceCreated <= 7) {
    newContactPriority = 10; // Added this week
  }

  const totalPriority = scorePriority + stalePriority + newContactPriority;

  return Math.min(totalPriority, 100);
}

/**
 * Get priority level label for display
 */
export function getPriorityLevel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 60) return 'high';
  if (priority >= 30) return 'medium';
  return 'low';
}

/**
 * Get reason string explaining why contact needs enrichment
 */
export function getEnrichmentReason(
  contact: EnrichmentScoreInput & { lastEnrichedAt?: Date | null; createdAt?: Date }
): string {
  const missingFields: string[] = [];

  if (!contact.whyNow) missingFields.push('Why Now');
  if (!contact.howWeMet) missingFields.push('How We Met');
  if (!contact.notes) missingFields.push('Notes');
  if (!contact.expertise) missingFields.push('Expertise');

  if (contact.lastEnrichedAt === null || contact.lastEnrichedAt === undefined) {
    if (missingFields.length > 0) {
      return `Never enriched — missing ${missingFields.slice(0, 2).join(', ')}`;
    }
    return 'Never enriched — add context';
  }

  const daysSinceEnrichment = Math.floor(
    (Date.now() - contact.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceEnrichment > 30) {
    return `Last enriched ${daysSinceEnrichment} days ago — refresh context`;
  }

  if (missingFields.length > 0) {
    return `Missing ${missingFields.slice(0, 2).join(' and ')}`;
  }

  return 'Could use more context';
}
