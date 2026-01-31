import { prisma } from '@/lib/db';
import { getCurrentUser, type AuthUser } from '@/lib/auth-helpers';

interface LinkableAttendee {
  id: string;
  email: string | null;
  userId: string | null;
}

export interface AttendeeAuthState {
  currentUser: AuthUser | null;
  isLinkedAndLoggedIn: boolean;
  profileUrl: string | undefined;
  profileCtaLabel: string | undefined;
}

/**
 * Check auth state and try to link an attendee to the current user server-side.
 * Used by RSVP page and completion page to compute the right CTA URLs.
 *
 * Mutates attendee.userId if linking succeeds.
 */
export async function resolveAttendeeAuth(
  attendee: LinkableAttendee,
  eventId: string,
): Promise<AttendeeAuthState> {
  const currentUser = await getCurrentUser();

  // Try to link if logged in but not yet linked
  if (currentUser && !attendee.userId) {
    const emailMatch = attendee.email &&
      currentUser.email.toLowerCase() === attendee.email.toLowerCase();
    if (emailMatch) {
      try {
        await prisma.eventAttendee.update({
          where: { id: attendee.id },
          data: { userId: currentUser.id },
        });
        attendee.userId = currentUser.id;
      } catch {
        // Non-blocking — may fail if already linked to another user
      }
    }
  }

  const isLinkedAndLoggedIn = !!(currentUser && attendee.userId === currentUser.id);

  // Compute CTA URL based on auth state
  let profileUrl: string | undefined;
  let profileCtaLabel: string | undefined;

  if (isLinkedAndLoggedIn) {
    profileUrl = `/guest/events/${eventId}`;
    profileCtaLabel = 'View & Edit Your Profile';
  } else if (attendee.userId && !currentUser) {
    profileUrl = `/login?next=${encodeURIComponent(`/guest/events/${eventId}`)}`;
    profileCtaLabel = 'Sign In to Edit Your Profile';
  } else if (!attendee.userId) {
    profileUrl = `/signup?next=${encodeURIComponent(`/guest/events/${eventId}`)}&m33t_invitee=true&attendee_id=${attendee.id}${attendee.email ? `&email=${encodeURIComponent(attendee.email)}` : ''}`;
    profileCtaLabel = 'View & Edit Your Profile';
  }

  return { currentUser, isLinkedAndLoggedIn, profileUrl, profileCtaLabel };
}
