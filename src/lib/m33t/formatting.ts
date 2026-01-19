/**
 * M33T Event Formatting Utilities
 *
 * Centralized date, time, and text formatting functions for event display.
 * These utilities ensure consistent formatting across all M33T event components.
 */

/**
 * Format an ISO date string for event display.
 * Returns full weekday, month, day, and year.
 *
 * @example
 * formatEventDate("2026-02-15T00:00:00.000Z") // "Saturday, February 15, 2026"
 */
export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a 24-hour time string (HH:MM) to 12-hour format with AM/PM.
 *
 * @example
 * formatEventTime("18:30") // "6:30 PM"
 * formatEventTime("09:00") // "9:00 AM"
 */
export function formatEventTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours || '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format a time range for event display.
 *
 * @example
 * formatEventTimeRange("18:00", "22:00") // "6:00 PM - 10:00 PM"
 */
export function formatEventTimeRange(startTime: string, endTime?: string | null): string {
  const start = formatEventTime(startTime);
  if (!endTime) return start;
  return `${start} - ${formatEventTime(endTime)}`;
}
