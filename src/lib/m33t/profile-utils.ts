import type { Profile, ProfileOverrides, ExpertiseOverride } from './schemas';

/**
 * Merges base profile with organizer overrides.
 *
 * Rules:
 * - Override absent → use base value
 * - Override null → hide field (return undefined)
 * - Override value → use override value
 */
export function mergeProfileWithOverrides(
  profile: Profile | null,
  overrides: ProfileOverrides | null
): Profile | null {
  if (!profile) return null;
  if (!overrides) return profile;

  return {
    ...profile,
    role: resolveOverride(profile.role, overrides.role),
    company: resolveOverride(profile.company, overrides.company),
    location: resolveOverride(profile.location, overrides.location),
    expertise: resolveExpertiseOverride(profile.expertise, overrides.expertise),
    currentFocus: resolveOverride(profile.currentFocus, overrides.currentFocus),
  };
}

/**
 * Resolves a single field override.
 * @returns base value if not overridden, undefined if hidden, override value otherwise
 */
function resolveOverride<T>(base: T, override: T | null | undefined): T | undefined {
  if (override === undefined) return base; // Not overridden, use base
  if (override === null) return undefined; // Explicitly hidden
  return override; // Use override value
}

/**
 * Resolves expertise array override with surgical modification support.
 * Note: Returns empty array when hidden (not undefined) since expertise is required in Profile.
 */
function resolveExpertiseOverride(
  base: string[] | undefined,
  override: ExpertiseOverride | undefined
): string[] {
  if (override === undefined) return base || []; // Not overridden
  if (override === null) return []; // Hide completely (empty array)
  if (Array.isArray(override)) return override; // Complete replacement

  // Surgical modification: remove then add
  const baseSet = new Set(base || []);
  override.remove.forEach(tag => baseSet.delete(tag));
  override.add.forEach(tag => baseSet.add(tag));
  return Array.from(baseSet);
}

/**
 * Checks if a profile has any active overrides.
 * Handles edge case where expertise has empty remove/add arrays (no-op).
 */
export function hasOverrides(overrides: ProfileOverrides | null): boolean {
  if (!overrides) return false;

  for (const [key, value] of Object.entries(overrides)) {
    // Expertise surgical mode - check if actually modifying anything
    if (key === 'expertise' && value && typeof value === 'object' && !Array.isArray(value)) {
      const surgical = value as { remove: string[]; add: string[] };
      if (surgical.remove.length > 0 || surgical.add.length > 0) return true;
      continue; // Empty surgical override = no-op, skip
    }
    // Any other field present (including null for hidden) = active override
    if (value !== undefined) return true;
  }
  return false;
}

/**
 * Gets list of overridden field names.
 */
export function getOverriddenFields(overrides: ProfileOverrides | null): string[] {
  if (!overrides) return [];
  return Object.keys(overrides);
}

/**
 * Creates a clean override object by removing undefined values.
 * Used before saving to database to ensure sparse storage.
 */
export function cleanOverrides(overrides: ProfileOverrides): ProfileOverrides | null {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned as ProfileOverrides : null;
}
