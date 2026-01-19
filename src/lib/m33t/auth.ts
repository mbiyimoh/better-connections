import { prisma } from '@/lib/db';

export type EventPermission = 'view' | 'curate' | 'edit' | 'manage';

export interface EventAccessResult {
  isOwner: boolean;
  organizer: {
    canInvite: boolean;
    canCurate: boolean;
    canEdit: boolean;
    canManage: boolean;
  } | null;
}

/**
 * Check if user has access to an event with required permission level.
 *
 * Permission hierarchy:
 * - view: Can see event (any organizer)
 * - curate: Can edit attendee profiles, suggest matches (canCurate: true)
 * - edit: Can modify event details (canEdit: true)
 * - manage: Can add/remove organizers (canManage: true OR owner)
 *
 * Owner always has all permissions.
 */
export async function checkEventAccess(
  eventId: string,
  userId: string,
  requiredPermission: EventPermission = 'view'
): Promise<EventAccessResult | null> {
  // Check if owner
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true }
  });

  if (event) {
    return {
      isOwner: true,
      organizer: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
    };
  }

  // Check if co-organizer
  const organizer = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
  });

  if (!organizer) return null;

  // Check permission level
  const hasPermission =
    requiredPermission === 'view' ? true :
    requiredPermission === 'curate' ? organizer.canCurate :
    requiredPermission === 'edit' ? organizer.canEdit :
    requiredPermission === 'manage' ? organizer.canManage :
    false;

  if (!hasPermission) return null;

  return { isOwner: false, organizer };
}

/**
 * Require event access or throw/return error response.
 * Use in API routes.
 */
export async function requireEventAccess(
  eventId: string,
  userId: string,
  requiredPermission: EventPermission = 'view'
): Promise<EventAccessResult> {
  const access = await checkEventAccess(eventId, userId, requiredPermission);
  if (!access) {
    throw new Error(
      requiredPermission === 'view'
        ? 'Event not found or access denied'
        : `Requires ${requiredPermission} permission`
    );
  }
  return access;
}
