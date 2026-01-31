import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Calendar, Clock, MapPin, User, Briefcase, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import type { Profile } from '@/lib/m33t/schemas';

interface CompletePageProps {
  params: Promise<{ slug: string; token: string }>;
}

export default async function CompletePage({ params }: CompletePageProps) {
  const { slug, token } = await params;

  const payload = verifyRSVPToken(token);
  if (!payload) {
    return notFound();
  }

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
        venueName: true,
        venueAddress: true,
      },
    }),
    prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        questionnaireCompletedAt: true,
        profile: true,
        userId: true,
      },
    }),
  ]);

  if (!event || !attendee) {
    return notFound();
  }

  // Check if the current visitor is already authenticated
  const currentUser = await getCurrentUser();

  // If logged in but attendee not yet linked, try to link now (server-side)
  if (currentUser && !attendee.userId) {
    // Only link if emails match (prevent hijacking)
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
        // Non-blocking — linking may fail if already linked to another user
      }
    }
  }

  const isLinkedAndLoggedIn = currentUser && attendee.userId === currentUser.id;

  // Parse profile JSON if available
  const profile = attendee.profile as Profile | null;
  const hasProfileData = profile && (
    profile.role || profile.company || profile.location ||
    (profile.expertise && profile.expertise.length > 0) ||
    profile.currentFocus
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Success Header */}
      <div className="bg-bg-secondary border-b border-border py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            You&apos;re all set, {attendee.firstName}!
          </h1>
          <p className="text-lg text-text-secondary">
            Your profile is complete. We&apos;ll match you with the best connections at this event.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Event Details */}
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">{event.name}</h2>
            {event.tagline && (
              <p className="text-text-secondary mb-4">{event.tagline}</p>
            )}

            <div className="space-y-3 text-text-secondary">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-gold-primary" />
                <span>{format(event.date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-3 text-gold-primary" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-3 text-gold-primary" />
                <div>
                  <span>{event.venueName}</span>
                  <p className="text-sm text-text-tertiary">{event.venueAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-medium text-gold-primary mb-2">What happens next?</h3>
              <p className="text-text-secondary">
                Stay tuned &mdash; we may send you follow-up questions to help us find your best connections.
              </p>
              <p className="text-sm text-text-tertiary mt-2">
                Before the event, you&apos;ll receive your curated list of people to meet via SMS.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Preview Card */}
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gold-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Your Profile</h3>
            </div>

            {hasProfileData ? (
              <div className="space-y-3">
                <p className="text-text-primary font-medium">
                  {attendee.firstName} {attendee.lastName}
                </p>

                {(profile.role || profile.company) && (
                  <div className="flex items-center text-text-secondary">
                    <Briefcase className="w-4 h-4 mr-2 text-text-tertiary" />
                    <span>
                      {profile.role}{profile.role && profile.company ? ' at ' : ''}{profile.company}
                    </span>
                  </div>
                )}

                {profile.location && (
                  <div className="flex items-center text-text-secondary">
                    <MapPin className="w-4 h-4 mr-2 text-text-tertiary" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile.currentFocus && (
                  <div className="flex items-center text-text-secondary">
                    <Sparkles className="w-4 h-4 mr-2 text-text-tertiary" />
                    <span>{profile.currentFocus}</span>
                  </div>
                )}

                {profile.expertise && profile.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs rounded-full bg-gold-subtle text-gold-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-secondary">
                Complete your profile to get better matches!
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              {isLinkedAndLoggedIn ? (
                <>
                  <a
                    href={`/guest/events/${event.id}`}
                    className="inline-block px-4 py-2 bg-gold-primary hover:bg-gold-light text-bg-primary text-sm font-medium rounded-lg transition-colors"
                  >
                    View &amp; Edit Your Profile
                  </a>
                  <p className="text-xs text-text-tertiary mt-2">
                    Manage your profile and see your connections.
                  </p>
                </>
              ) : attendee.userId && !currentUser ? (
                <>
                  <a
                    href={`/login?next=${encodeURIComponent(`/guest/events/${event.id}`)}`}
                    className="inline-block px-4 py-2 bg-gold-primary hover:bg-gold-light text-bg-primary text-sm font-medium rounded-lg transition-colors"
                  >
                    View &amp; Edit Your Profile
                  </a>
                  <p className="text-xs text-text-tertiary mt-2">
                    Sign in to view and edit how you appear to other attendees.
                  </p>
                </>
              ) : (
                <>
                  <a
                    href={`/signup?next=${encodeURIComponent(`/guest/events/${event.id}`)}&m33t_invitee=true&attendee_id=${attendee.id}${attendee.email ? `&email=${encodeURIComponent(attendee.email)}` : ''}`}
                    className="inline-block px-4 py-2 bg-gold-primary hover:bg-gold-light text-bg-primary text-sm font-medium rounded-lg transition-colors"
                  >
                    View &amp; Edit Your Profile
                  </a>
                  <p className="text-xs text-text-tertiary mt-2">
                    Create an account to view and edit how you appear to other attendees.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
