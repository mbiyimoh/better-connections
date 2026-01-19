/**
 * V1 Matching Algorithm - Rule-Based Scoring
 *
 * Final Match Score =
 *   (Seeking ↔ Offering Score × 0.40) +
 *   (Expertise Overlap × 0.25) +
 *   (Experience Compatibility × 0.20) +
 *   (Topic Interest Match × 0.15)
 */

export interface MatchableProfile {
  id: string;
  seekingKeywords: string[];
  offeringKeywords: string[];
  expertise: string[];
  experienceLevel: string | null;
  topicsOfInterest: string[];
  createdAt?: Date; // For tiebreaking
}

export interface MatchScoreComponents {
  seekingOffering: number;
  expertise: number;
  experience: number;
  topics: number;
}

export interface MatchScore {
  attendeeId: string;
  matchedWithId: string;
  score: number;
  components: MatchScoreComponents;
}

const WEIGHTS = {
  seekingOffering: 0.40,
  expertise: 0.25,
  experience: 0.20,
  topics: 0.15,
};

const EXPERIENCE_LEVELS = ['early', 'mid', 'senior', 'executive', 'founder'];

/**
 * Normalize a string for comparison
 */
function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Calculate Jaccard similarity between two arrays
 * Returns a value between 0 and 1
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;

  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));

  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate fuzzy Jaccard similarity that accounts for partial matches
 * Returns a value between 0 and 1
 */
export function fuzzyJaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;

  const normA = a.map(normalize);
  const normB = b.map(normalize);

  let matchCount = 0;

  for (const termA of normA) {
    // Check for exact match first
    if (normB.includes(termA)) {
      matchCount += 1;
      continue;
    }

    // Check for partial/substring matches
    for (const termB of normB) {
      if (termA.includes(termB) || termB.includes(termA)) {
        matchCount += 0.5; // Partial match
        break;
      }
    }
  }

  const totalTerms = new Set([...normA, ...normB]).size;
  return totalTerms === 0 ? 0 : matchCount / totalTerms;
}

/**
 * Calculate seeking ↔ offering score
 * A's seeking keywords matched against B's offering keywords, and vice versa
 * Uses fuzzy matching for better results
 */
function calculateSeekingOfferingScore(a: MatchableProfile, b: MatchableProfile): number {
  const aSeeksBOffering = fuzzyJaccardSimilarity(a.seekingKeywords, b.offeringKeywords);
  const bSeeksAOffering = fuzzyJaccardSimilarity(b.seekingKeywords, a.offeringKeywords);

  // Average of bidirectional matching (both benefit)
  return (aSeeksBOffering + bSeeksAOffering) / 2;
}

/**
 * Calculate experience compatibility
 * Adjacent levels get bonus (mentorship potential)
 */
function calculateExperienceCompatibility(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5; // Neutral if unknown

  const indexA = EXPERIENCE_LEVELS.indexOf(a);
  const indexB = EXPERIENCE_LEVELS.indexOf(b);

  if (indexA === -1 || indexB === -1) return 0.5;

  const distance = Math.abs(indexA - indexB);

  if (distance === 0) return 0.6; // Same level
  if (distance === 1) return 0.8; // Adjacent (mentorship bonus)
  if (distance === 2) return 0.5; // Moderate gap
  return 0.4; // Large gap
}

/**
 * Calculate full match score between two profiles
 */
export function calculateMatchScore(a: MatchableProfile, b: MatchableProfile): MatchScore {
  const components: MatchScoreComponents = {
    seekingOffering: calculateSeekingOfferingScore(a, b),
    expertise: fuzzyJaccardSimilarity(a.expertise, b.expertise),
    experience: calculateExperienceCompatibility(a.experienceLevel, b.experienceLevel),
    topics: fuzzyJaccardSimilarity(a.topicsOfInterest, b.topicsOfInterest),
  };

  const score =
    components.seekingOffering * WEIGHTS.seekingOffering +
    components.expertise * WEIGHTS.expertise +
    components.experience * WEIGHTS.experience +
    components.topics * WEIGHTS.topics;

  return {
    attendeeId: a.id,
    matchedWithId: b.id,
    score: Math.round(score * 100), // Convert to 0-100 scale
    components,
  };
}

/**
 * Generate matches for all attendees in an event
 * Returns top N matches per attendee
 */
export function generateEventMatches(
  attendees: MatchableProfile[],
  matchesPerAttendee: number = 5
): MatchScore[] {
  if (attendees.length < 2) {
    return []; // Need at least 2 attendees to match
  }

  const allMatches: MatchScore[] = [];

  // Calculate all pairwise scores
  for (let i = 0; i < attendees.length; i++) {
    for (let j = i + 1; j < attendees.length; j++) {
      const attendeeA = attendees[i];
      const attendeeB = attendees[j];
      if (!attendeeA || !attendeeB) continue;

      const score = calculateMatchScore(attendeeA, attendeeB);
      allMatches.push(score);

      // Also add reverse direction (B's perspective on A)
      allMatches.push({
        attendeeId: attendeeB.id,
        matchedWithId: attendeeA.id,
        score: score.score, // Same score for symmetry
        components: score.components,
      });
    }
  }

  // Group by attendee and take top N
  const matchesByAttendee = new Map<string, MatchScore[]>();

  for (const match of allMatches) {
    const existing = matchesByAttendee.get(match.attendeeId) || [];
    existing.push(match);
    matchesByAttendee.set(match.attendeeId, existing);
  }

  // Select top matches per attendee with tiebreaking
  const finalMatches: MatchScore[] = [];

  for (const [, matches] of matchesByAttendee) {
    const sorted = matches.sort((a, b) => {
      // Primary sort: score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tiebreaker: use matchedWithId for consistent ordering
      return a.matchedWithId.localeCompare(b.matchedWithId);
    });

    const top = sorted.slice(0, matchesPerAttendee);

    // Add position to each match
    top.forEach((match, index) => {
      finalMatches.push({
        ...match,
        position: index + 1,
      } as MatchScore & { position: number });
    });
  }

  return finalMatches;
}

/**
 * Generate "why this match" explanations
 * Called after match scoring to add human-readable reasons
 */
export function generateWhyMatchReasons(
  matchScore: MatchScore,
  attendee: MatchableProfile,
  matchedWith: MatchableProfile
): string[] {
  const reasons: string[] = [];

  // Seeking/Offering match
  if (matchScore.components.seekingOffering > 0.3) {
    const attendeeSeeking = attendee.seekingKeywords.slice(0, 2).join(', ');
    const matchOffering = matchedWith.offeringKeywords.slice(0, 2).join(', ');
    if (attendeeSeeking && matchOffering) {
      reasons.push(`You're looking for ${attendeeSeeking} - they can help with ${matchOffering}`);
    }
  }

  // Expertise overlap
  if (matchScore.components.expertise > 0.3) {
    const sharedExpertise = attendee.expertise.filter((e) =>
      matchedWith.expertise.some((m) => normalize(m).includes(normalize(e)) || normalize(e).includes(normalize(m)))
    );
    if (sharedExpertise.length > 0) {
      reasons.push(`Shared expertise in ${sharedExpertise.slice(0, 2).join(' and ')}`);
    }
  }

  // Experience compatibility
  if (matchScore.components.experience >= 0.8) {
    const levelNames: Record<string, string> = {
      early: 'early-career',
      mid: 'mid-career',
      senior: 'senior',
      executive: 'executive',
      founder: 'founder',
    };

    if (attendee.experienceLevel && matchedWith.experienceLevel) {
      const aLevel = levelNames[attendee.experienceLevel] || attendee.experienceLevel;
      const bLevel = levelNames[matchedWith.experienceLevel] || matchedWith.experienceLevel;

      if (attendee.experienceLevel === matchedWith.experienceLevel) {
        reasons.push(`Both at ${aLevel} stage - great peer connection`);
      } else {
        reasons.push(`${bLevel} perspective can complement your ${aLevel} experience`);
      }
    }
  }

  // Topic overlap
  if (matchScore.components.topics > 0.3) {
    const sharedTopics = attendee.topicsOfInterest.filter((t) =>
      matchedWith.topicsOfInterest.some((m) => normalize(m).includes(normalize(t)) || normalize(t).includes(normalize(m)))
    );
    if (sharedTopics.length > 0) {
      reasons.push(`Both interested in ${sharedTopics.slice(0, 2).join(' and ')}`);
    }
  }

  // Fallback if no specific reasons found
  if (reasons.length === 0) {
    reasons.push('Complementary professional backgrounds');
  }

  // Return top 3 reasons
  return reasons.slice(0, 3);
}

/**
 * Generate conversation starter suggestions
 */
export function generateConversationStarters(
  attendee: MatchableProfile,
  matchedWith: MatchableProfile
): string[] {
  const starters: string[] = [];

  // Based on their expertise
  if (matchedWith.expertise.length > 0) {
    starters.push(`Ask about their experience in ${matchedWith.expertise[0]}`);
  }

  // Based on what they're seeking
  if (matchedWith.seekingKeywords.length > 0) {
    starters.push(`They're looking for help with ${matchedWith.seekingKeywords[0]} - maybe you can connect them?`);
  }

  // Based on what they offer
  if (matchedWith.offeringKeywords.length > 0 && attendee.seekingKeywords.length > 0) {
    starters.push(`Ask how they got into ${matchedWith.offeringKeywords[0]}`);
  }

  // Based on shared interests
  const sharedTopics = attendee.topicsOfInterest.filter((t) =>
    matchedWith.topicsOfInterest.some((m) => normalize(m).includes(normalize(t)))
  );
  if (sharedTopics.length > 0) {
    starters.push(`Bond over your shared interest in ${sharedTopics[0]}`);
  }

  // Fallback
  if (starters.length === 0) {
    starters.push('What brought you to this event?');
    starters.push("What's the most interesting project you're working on?");
  }

  return starters.slice(0, 3);
}
