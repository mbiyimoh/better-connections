import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ProfileViewClient } from './ProfileViewClient';

export default async function GuestProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventParam } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get all events where user is an attendee
  const attendees = await prisma.eventAttendee.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: { id: true, name: true },
      },
    },
  });

  if (attendees.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <p className="text-text-secondary">
          You&apos;ll be able to edit your profile once you&apos;re invited to an event.
        </p>
      </div>
    );
  }

  // Default to specified event or first event
  const selectedEventId = eventParam || attendees[0]?.eventId;
  const selectedAttendee = attendees.find((a) => a.eventId === selectedEventId) || attendees[0];

  // This shouldn't happen since we check attendees.length above, but TypeScript needs the check
  if (!selectedAttendee) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <p className="text-text-secondary">Profile not found.</p>
      </div>
    );
  }

  return (
    <ProfileViewClient
      attendees={attendees.map((a) => ({
        id: a.id,
        eventId: a.eventId,
        eventName: a.event.name,
        firstName: a.firstName,
        lastName: a.lastName,
        profile: a.profile as Record<string, unknown> | null,
        tradingCard: a.tradingCard as Record<string, unknown> | null,
      }))}
      selectedAttendeeId={selectedAttendee.id}
    />
  );
}
