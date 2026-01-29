import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { generateRSVPToken } from '@/lib/m33t/tokens';
import { areMatchesViewable } from '@/lib/m33t/reveal-timing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Users, Edit, Search, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { calculateAttendeeProfileCompletion } from '@/lib/m33t';
import type { RSVPStatus } from '@prisma/client';

const statusColors: Record<RSVPStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  CONFIRMED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  MAYBE: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  DECLINED: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const statusLabels: Record<RSVPStatus, string> = {
  PENDING: 'Invited',
  CONFIRMED: 'Confirmed',
  MAYBE: 'Maybe',
  DECLINED: 'Declined',
};

export default async function GuestEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get attendee record for this user and event
  const attendee = await prisma.eventAttendee.findFirst({
    where: {
      eventId,
      userId: user.id,
    },
    include: {
      event: {
        include: {
          _count: { select: { attendees: true } },
        },
      },
    },
  });

  if (!attendee) {
    notFound();
  }

  const { event } = attendee;
  const profileCompletion = calculateAttendeeProfileCompletion(attendee);
  const status = statusColors[attendee.rsvpStatus] || statusColors.PENDING;

  // Get match count and status for this attendee
  const matches = await prisma.match.findMany({
    where: {
      attendeeId: attendee.id,
      status: { in: ['APPROVED', 'REVEALED'] },
    },
    select: { id: true },
  });

  // Calculate if matches are viewable using shared utility
  const hasApprovedMatches = matches.length > 0;
  const isMatchesViewable = areMatchesViewable(event, attendee, hasApprovedMatches);

  // Generate RSVP token for matches link
  const rsvpToken = generateRSVPToken(
    event.id,
    attendee.email,
    attendee.id,
    event.date
  );
  const rsvpBasePath = event.slug
    ? `/m33t/${event.slug}/rsvp/${rsvpToken}`
    : `/rsvp/${rsvpToken}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Link */}
      <Link
        href="/guest/events"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Event Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        {event.tagline && (
          <p className="text-text-secondary mt-1">{event.tagline}</p>
        )}
      </div>

      {/* Event Details Card */}
      <Card className="p-5 mb-4">
        <h2 className="font-semibold mb-4">Event Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-text-tertiary" />
            <div>
              <div>{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</div>
              <div className="text-text-secondary">
                {event.startTime} - {event.endTime}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-text-tertiary" />
            <div>
              <div>{event.venueName}</div>
              <div className="text-text-secondary">{event.venueAddress}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-text-tertiary" />
            <span>{event._count.attendees} attendees</span>
          </div>
        </div>
      </Card>

      {/* Your RSVP Card */}
      <Card className="p-5 mb-4">
        <h2 className="font-semibold mb-4">Your RSVP</h2>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Status</span>
          <Badge className={`${status.bg} ${status.text} border-0`}>
            {statusLabels[attendee.rsvpStatus]}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-text-secondary">Profile</span>
          <span
            className={
              profileCompletion < 80 ? 'text-warning' : 'text-emerald-400'
            }
          >
            {profileCompletion}% complete
          </span>
        </div>
      </Card>

      {/* Your Matches Card */}
      {hasApprovedMatches && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-primary" />
                Your Matches
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {matches.length} curated connection{matches.length !== 1 ? 's' : ''}
                {attendee.matchesFirstViewedAt && (
                  <span className="text-text-tertiary"> · Viewed</span>
                )}
              </p>
            </div>

            {isMatchesViewable ? (
              <Button asChild className="gap-2">
                <Link href={`${rsvpBasePath}/matches`}>
                  View Matches
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary">Coming Soon</Badge>
            )}
          </div>
        </Card>
      )}

      {/* Incomplete Profile Prompt */}
      {profileCompletion < 80 && (
        <Card className="p-5 mb-4 border-warning/20 bg-warning/5">
          <h3 className="font-medium mb-2">Complete Your Profile</h3>
          <p className="text-sm text-text-secondary mb-4">
            Help other attendees learn about you. Complete your profile to make
            meaningful connections.
          </p>
          <Button asChild size="sm">
            <Link href={`/guest/profile?event=${event.id}`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button asChild className="flex-1">
          <Link href={`/guest/events/${event.id}/directory`}>
            <Search className="w-4 h-4 mr-2" />
            Browse Attendees
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href={`/guest/profile?event=${event.id}`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit My Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
