/**
 * Reveal Timing Utilities for M33T Matches
 *
 * Shared logic for determining when matches become viewable to attendees.
 */

export interface RevealTimingEvent {
  date: Date;
  revealTiming: string;
}

export interface RevealTimingAttendee {
  rsvpStatus: string;
  matchRevealSentAt: Date | null;
}

/**
 * Calculate the reveal time based on event timing settings.
 * Returns null for IMMEDIATE timing (no specific time, available when matches approved).
 */
export function calculateRevealTime(event: RevealTimingEvent): Date | null {
  const eventDate = new Date(event.date);

  switch (event.revealTiming) {
    case 'IMMEDIATE':
      return null;
    case 'TWENTY_FOUR_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    case 'FORTY_EIGHT_HOURS_BEFORE':
      return new Date(eventDate.getTime() - 48 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Check if matches are viewable for an attendee based on:
 * - Whether approved matches exist
 * - Attendee RSVP status is CONFIRMED
 * - Reveal notification was sent OR timing conditions are met
 */
export function areMatchesViewable(
  event: RevealTimingEvent,
  attendee: RevealTimingAttendee,
  hasApprovedMatches: boolean
): boolean {
  if (!hasApprovedMatches) return false;
  if (attendee.rsvpStatus !== 'CONFIRMED') return false;

  // If notification was sent, always viewable
  if (attendee.matchRevealSentAt) return true;

  // Check timing
  if (event.revealTiming === 'IMMEDIATE') return true;

  const revealTime = calculateRevealTime(event);
  return revealTime ? new Date() >= revealTime : false;
}

/**
 * Get human-readable timing message for the coming soon page.
 */
export function getRevealTimingMessage(revealTiming: string): string {
  const messages: Record<string, string> = {
    IMMEDIATE: 'once your profile is complete',
    TWENTY_FOUR_HOURS_BEFORE: '24 hours before the event',
    FORTY_EIGHT_HOURS_BEFORE: '48 hours before the event',
  };

  return messages[revealTiming] || 'soon';
}
