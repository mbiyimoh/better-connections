/**
 * Attendee sorting utilities for display order.
 *
 * Sorting Priority (within each RSVP status group):
 * 1. displayOrder ASC (pinned items first, nulls last)
 * 2. profileRichness DESC (richest auto-sorted items next)
 * 3. createdAt ASC (oldest first as tiebreaker)
 */

interface SortableAttendee {
  id: string;
  displayOrder: number | null;
  profileRichness: number;
  createdAt: Date;
}

/**
 * Sort attendees by display order within a single group.
 * Pinned items (non-null displayOrder) appear first, sorted by displayOrder.
 * Auto-sorted items (null displayOrder) follow, sorted by profileRichness DESC.
 *
 * @param attendees - Array of attendees to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortAttendeesByDisplayOrder<T extends SortableAttendee>(
  attendees: T[]
): T[] {
  return [...attendees].sort((a, b) => {
    // Pinned items (non-null displayOrder) come first
    if (a.displayOrder !== null && b.displayOrder === null) return -1;
    if (a.displayOrder === null && b.displayOrder !== null) return 1;

    // Both pinned: sort by displayOrder ascending
    if (a.displayOrder !== null && b.displayOrder !== null) {
      return a.displayOrder - b.displayOrder;
    }

    // Both auto-sorted: sort by richness DESC, then createdAt ASC
    // profileRichness is Int @default(0) in schema, so never null
    const richnessDiff = b.profileRichness - a.profileRichness;
    if (richnessDiff !== 0) return richnessDiff;

    // Tiebreaker: oldest first
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Sort attendees grouped by RSVP status.
 * Each group is sorted independently using the same logic.
 *
 * @param groups - Object containing confirmed, maybe, and invited arrays
 * @returns New object with sorted arrays (does not mutate original)
 */
export function sortAttendeeGroups<T extends SortableAttendee>(
  groups: { confirmed: T[]; maybe: T[]; invited: T[] }
): { confirmed: T[]; maybe: T[]; invited: T[] } {
  return {
    confirmed: sortAttendeesByDisplayOrder(groups.confirmed),
    maybe: sortAttendeesByDisplayOrder(groups.maybe),
    invited: sortAttendeesByDisplayOrder(groups.invited),
  };
}
