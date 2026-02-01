/**
 * M33T Event Formatting Utilities
 *
 * Centralized date, time, and text formatting functions for event display.
 * These utilities ensure consistent formatting across all M33T event components.
 */

/**
 * Format an ISO date string for event display.
 * Returns full weekday, month, day, and year in the event's timezone.
 *
 * @param dateStr - ISO date string or Date object
 * @param timezone - IANA timezone (defaults to America/Chicago for M33T events)
 *
 * @example
 * formatEventDate("2026-03-13T00:00:00.000Z") // "Thursday, March 12, 2026" (in Central time)
 */
export function formatEventDate(dateStr: string | Date, timezone: string = 'America/Chicago'): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Format a date for short display (e.g., "Mar 12, 2026").
 *
 * @param dateStr - ISO date string or Date object
 * @param timezone - IANA timezone (defaults to America/Chicago for M33T events)
 */
export function formatEventDateShort(dateStr: string | Date, timezone: string = 'America/Chicago'): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
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
