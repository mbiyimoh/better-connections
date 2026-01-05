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

/**
 * Field suggestion for improving enrichment score
 */
export interface FieldSuggestion {
  field: keyof EnrichmentScoreInput;
  label: string;
  points: number;
}

/**
 * Get suggestions for missing fields that would improve the contact's enrichment score.
 * Returns top 3 missing fields sorted by point value (highest first).
 */
export function getMissingFieldSuggestions(contact: EnrichmentScoreInput): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];

  // Check each field and add suggestion if missing
  // Sorted by point value descending to prioritize high-value fields
  if (!contact.whyNow) {
    suggestions.push({ field: 'whyNow', label: 'Why Now', points: 20 });
  }
  if (!contact.howWeMet) {
    suggestions.push({ field: 'howWeMet', label: 'How We Met', points: 15 });
  }
  if (!contact.title) {
    suggestions.push({ field: 'title', label: 'Job Title', points: 10 });
  }
  if (!contact.company) {
    suggestions.push({ field: 'company', label: 'Company', points: 10 });
  }
  if (!contact.primaryEmail) {
    suggestions.push({ field: 'primaryEmail', label: 'Email', points: 8 });
  }
  if (!contact.firstName) {
    suggestions.push({ field: 'firstName', label: 'First Name', points: 7 });
  }
  if (!contact.location) {
    suggestions.push({ field: 'location', label: 'Location', points: 5 });
  }
  if (!contact.linkedinUrl) {
    suggestions.push({ field: 'linkedinUrl', label: 'LinkedIn', points: 5 });
  }
  if (!contact.notes) {
    suggestions.push({ field: 'notes', label: 'Notes', points: 5 });
  }
  if (!contact.primaryPhone) {
    suggestions.push({ field: 'primaryPhone', label: 'Phone', points: 4 });
  }
  if (!contact.lastName) {
    suggestions.push({ field: 'lastName', label: 'Last Name', points: 3 });
  }

  // Sort by points descending and return top 3
  return suggestions.sort((a, b) => b.points - a.points).slice(0, 3);
}
