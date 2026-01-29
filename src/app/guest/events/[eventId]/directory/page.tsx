import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import { DirectoryClient } from './DirectoryClient';

export default async function GuestDirectoryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user is an attendee of this event
  const currentUserAttendee = await prisma.eventAttendee.findFirst({
    where: {
      eventId,
      userId: user.id,
    },
  });

  if (!currentUserAttendee) {
    notFound();
  }

  // Get event with all attendees (excluding declined)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendees: {
        where: {
          rsvpStatus: {
            not: 'DECLINED',
          },
        },
        orderBy: [
          { rsvpStatus: 'asc' },
          { firstName: 'asc' },
        ],
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Transform attendees for client component
  const attendees = event.attendees.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    rsvpStatus: a.rsvpStatus,
    profile: a.profile as Record<string, unknown> | null,
    tradingCard: a.tradingCard as Record<string, unknown> | null,
    isCurrentUser: a.id === currentUserAttendee.id,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href={`/guest/events/${eventId}`}
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendee Directory</h1>
        <p className="text-text-secondary mt-1">{event.name}</p>
      </div>

      <DirectoryClient
        attendees={attendees}
        eventId={eventId}
        currentUserId={currentUserAttendee.id}
      />
    </div>
  );
}
