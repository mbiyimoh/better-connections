import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { EventCard } from '@/components/guest/EventCard';
import { calculateAttendeeProfileCompletion } from '@/lib/m33t';

export default async function GuestEventsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get all events where user is an attendee
  const attendees = await prisma.eventAttendee.findMany({
    where: { userId: user.id },
    include: {
      event: {
        include: {
          _count: { select: { attendees: true } },
        },
      },
    },
    orderBy: { event: { date: 'asc' } },
  });

  if (attendees.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">My Events</h1>
        <p className="text-text-secondary mb-2">No Events Yet</p>
        <p className="text-text-tertiary text-sm">
          You&apos;ll see your event invitations here once you&apos;re invited to an event.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Events</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attendees.map((attendee) => (
          <EventCard
            key={attendee.id}
            event={attendee.event}
            rsvpStatus={attendee.rsvpStatus}
            profileCompletion={calculateAttendeeProfileCompletion(attendee)}
          />
        ))}
      </div>
    </div>
  );
}
