import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { RSVPForm } from '@/components/m33t/RSVPForm';
import { TokenExpiredMessage } from '@/components/m33t/TokenExpiredMessage';
import { TokenInvalidMessage } from '@/components/m33t/TokenInvalidMessage';
import { generateRSVPOGMetadata } from '@/lib/m33t/og-metadata';
import { format } from 'date-fns';

interface RSVPPageProps {
  params: Promise<{ slug: string; token: string }>;
}

export async function generateMetadata({ params }: RSVPPageProps): Promise<Metadata> {
  const { slug, token } = await params;
  return generateRSVPOGMetadata(token, slug);
}

export default async function RSVPPage({ params }: RSVPPageProps) {
  const { slug, token } = await params;

  // Check if token is expired (show different message)
  if (isTokenExpired(token)) {
    return <TokenExpiredMessage />;
  }

  // Verify token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return <TokenInvalidMessage />;
  }

  // Fetch event and attendee data
  const [event, attendee] = await Promise.all([
    prisma.event.findUnique({
      where: { id: payload.eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        date: true,
        startTime: true,
        endTime: true,
        timezone: true,
        venueName: true,
        venueAddress: true,
        status: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        userId: true,
        rsvpStatus: true,
        rsvpRespondedAt: true,
        questionnaireCompletedAt: true,
      },
    }),
  ]);

  if (!event || !attendee) {
    return notFound();
  }

  // Check auth state and try to link attendee if logged in
  const currentUser = await getCurrentUser();
  let isLinkedAndLoggedIn = !!(currentUser && attendee.userId === currentUser.id);

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
        isLinkedAndLoggedIn = true;
      } catch {
        // Non-blocking
      }
    }
  }

  // Compute CTA URLs for the status card
  let profileUrl: string | undefined;
  let profileCtaLabel: string | undefined;
  if (isLinkedAndLoggedIn) {
    profileUrl = `/guest/events/${event.id}`;
    profileCtaLabel = 'View & Edit Your Profile';
  } else if (attendee.userId && !currentUser) {
    profileUrl = `/login?next=${encodeURIComponent(`/guest/events/${event.id}`)}`;
    profileCtaLabel = 'Sign In to Edit Your Profile';
  } else if (!attendee.userId) {
    profileUrl = `/signup?next=${encodeURIComponent(`/guest/events/${event.id}`)}&m33t_invitee=true&attendee_id=${attendee.id}${attendee.email ? `&email=${encodeURIComponent(attendee.email)}` : ''}`;
    profileCtaLabel = 'View & Edit Your Profile';
  }

  const eventLandingUrl = `/m33t/${event.slug || slug}`;

  // Check if event is still accepting RSVPs
  if (event.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Event Cancelled</h1>
          <p className="text-text-secondary">
            Sorry, {event.name} has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Event Header */}
      <div className="bg-bg-secondary border-b border-border py-8">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm text-gold-primary mb-2">You&apos;re invited to</p>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{event.name}</h1>
          {event.tagline && (
            <p className="text-lg text-text-secondary mb-4">{event.tagline}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <span>{format(event.date, 'EEEE, MMMM d, yyyy')}</span>
            <span>{event.startTime} - {event.endTime}</span>
            <span>{event.venueName}</span>
          </div>
        </div>
      </div>

      {/* RSVP Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <RSVPForm
          token={token}
          event={event}
          attendee={attendee}
          profileUrl={profileUrl}
          profileCtaLabel={profileCtaLabel}
          eventLandingUrl={eventLandingUrl}
        />
      </div>
    </div>
  );
}
