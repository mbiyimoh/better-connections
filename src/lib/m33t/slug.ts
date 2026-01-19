/**
 * Slug generation utilities for M33T event URLs
 */

/**
 * Generate a URL-safe slug from an event name.
 *
 * Algorithm:
 * 1. Convert to lowercase
 * 2. Replace spaces and special characters with hyphens
 * 3. Remove consecutive hyphens
 * 4. Trim leading/trailing hyphens
 *
 * @example
 * generateSlug("NO EDGES – 33 Strategies Launch") => "no-edges-33-strategies-launch"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Generate a random 4-character alphanumeric suffix for collision handling.
 */
function generateSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

/**
 * Generate a unique slug, appending a random suffix if the base slug already exists.
 *
 * @param name - Event name to generate slug from
 * @param checkExists - Async function to check if slug exists in database
 * @returns Unique slug string
 *
 * @example
 * // If "no-edges" already exists, returns "no-edges-a7b2"
 * const slug = await generateUniqueSlug("NO EDGES", async (s) => s === "no-edges");
 */
export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateSlug(name);

  // Check if base slug is available
  if (!(await checkExists(baseSlug))) {
    return baseSlug;
  }

  // Add suffix to make unique (try up to 10 times to avoid infinite loop)
  for (let attempt = 0; attempt < 10; attempt++) {
    const slugWithSuffix = `${baseSlug}-${generateSuffix()}`;
    if (!(await checkExists(slugWithSuffix))) {
      return slugWithSuffix;
    }
  }

  // Fallback: use timestamp-based suffix (guaranteed unique)
  return `${baseSlug}-${Date.now().toString(36)}`;
}
