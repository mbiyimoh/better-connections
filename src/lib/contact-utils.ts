/**
 * Shared utilities for contact display that operate on strings.
 * For Contact-object-based utilities, see @/types/contact.ts
 */

/**
 * Generate initials from a full name string.
 * Takes first letter of each word, uppercase, max 2 characters.
 *
 * @example
 * getInitialsFromName("John Smith") // "JS"
 * getInitialsFromName("John") // "J"
 * getInitialsFromName("John Paul Smith") // "JP"
 */
export function getInitialsFromName(fullName: string): string {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a consistent hue value (0-359) based on a name string.
 * Uses character codes to derive the hue, ensuring same name = same color.
 *
 * @example
 * getHueFromName("John Smith") // 142
 */
export function getHueFromName(fullName: string): number {
  return fullName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
}

/**
 * Generate a consistent avatar gradient based on a name string.
 * Uses character codes to derive a hue, ensuring same name = same color.
 *
 * @example
 * getAvatarGradientFromName("John Smith") // "linear-gradient(135deg, hsl(X, 60%, 40%), hsl(Y, 60%, 30%))"
 */
export function getAvatarGradientFromName(fullName: string): string {
  const hue = getHueFromName(fullName);
  return `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${(hue + 60) % 360}, 60%, 30%))`;
}

/**
 * Format a date as relative time (e.g., "2 days ago", "3 weeks ago").
 * Returns "Never" for null/undefined dates.
 */
export function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
