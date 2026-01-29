import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface CompletePageProps {
  params: Promise<{ slug: string; token: string }>;
}

export default async function CompletePage({ params }: CompletePageProps) {
  const { token } = await params;

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
        revealTiming: true,
      },
    }),
    prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        firstName: true,
        questionnaireCompletedAt: true,
      },
    }),
  ]);

  if (!event || !attendee) {
    return notFound();
  }

  const revealMessage = {
    IMMEDIATE: "You'll see your matches right away!",
    TWENTY_FOUR_HOURS_BEFORE: "You'll receive your matches 24 hours before the event.",
    FORTY_EIGHT_HOURS_BEFORE: "You'll receive your matches 48 hours before the event.",
  }[event.revealTiming];

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

      {/* Event Details */}
      <div className="max-w-2xl mx-auto px-4 py-8">
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
              <h3 className="font-medium text-text-primary mb-2">What happens next?</h3>
              <p className="text-text-secondary">{revealMessage}</p>
              <p className="text-sm text-text-tertiary mt-2">
                We&apos;ll send you an SMS with your curated list of people to meet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
