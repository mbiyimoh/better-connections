import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { RSVPForm } from '@/components/m33t/RSVPForm';
import { TokenExpiredMessage } from '@/components/m33t/TokenExpiredMessage';
import { TokenInvalidMessage } from '@/components/m33t/TokenInvalidMessage';
import { format } from 'date-fns';

interface RSVPPageProps {
  params: Promise<{ token: string }>;
}

export default async function RSVPPage({ params }: RSVPPageProps) {
  const { token } = await params;

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
        rsvpStatus: true,
        rsvpRespondedAt: true,
        questionnaireCompletedAt: true,
      },
    }),
  ]);

  if (!event || !attendee) {
    return notFound();
  }

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
        />
      </div>
    </div>
  );
}
