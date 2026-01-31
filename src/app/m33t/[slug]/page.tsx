import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EventLandingClient } from './EventLandingClient';
import type { PublicEventData, InviteeContext } from './types';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getEventData(slug: string): Promise<PublicEventData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333';
    const res = await fetch(`${baseUrl}/api/public/events/${slug}`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching event data:', error);
    return null;
  }
}

async function resolveInviteeContext(token: string, slug: string): Promise<InviteeContext | undefined> {
  try {
    const payload = verifyRSVPToken(token);
    if (!payload) return undefined;

    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: payload.attendeeId },
      select: {
        firstName: true,
        event: { select: { slug: true } },
      },
    });

    if (!attendee) return undefined;

    // Verify token belongs to this event (prevent cross-event token reuse)
    if (attendee.event.slug !== slug) return undefined;

    return {
      firstName: attendee.firstName,
      rsvpUrl: `/m33t/${slug}/rsvp/${token}`,
    };
  } catch {
    return undefined;
  }
}

// Event-specific metadata configurations
function getEventMetadata(slug: string) {
  // NO EDGES event
  if (slug === 'no-edges-33-strategies-launch' || slug.includes('no-edges')) {
    return {
      title: 'No Edges - 3.12.26 - Austin, TX',
      description: 'An intimate gathering of builders, athletes and operators exploring what\'s possible in the new world of AI.',
    };
  }

  // Default for other events
  return {
    title: 'M33T Event',
    description: 'Better networking. The right people. The right context. BEFORE you arrive.',
  };
}

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params, searchParams }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { token } = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bettercontacts.ai';

  // Use personalized OG image when invitee token is present
  const ogImageUrl = token
    ? `${baseUrl}/api/og/m33t/rsvp?token=${encodeURIComponent(token)}`
    : `${baseUrl}/api/og/m33t?slug=${encodeURIComponent(slug)}`;
  const eventMeta = getEventMetadata(slug);

  return {
    title: eventMeta.title,
    description: eventMeta.description,
    openGraph: {
      title: eventMeta.title,
      description: eventMeta.description,
      type: 'website',
      url: `${baseUrl}/m33t/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: eventMeta.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: eventMeta.title,
      description: eventMeta.description,
      images: [ogImageUrl],
    },
  };
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;
  const data = await getEventData(slug);

  if (!data) {
    notFound();
  }

  // If a token is present, resolve invitee context for personalization
  if (token) {
    const inviteeContext = await resolveInviteeContext(token, slug);
    if (inviteeContext) {
      data.inviteeContext = inviteeContext;
    }
  }

  return <EventLandingClient data={data} />;
}
