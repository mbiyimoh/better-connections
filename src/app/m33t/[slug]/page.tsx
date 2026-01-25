import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EventLandingClient } from './EventLandingClient';
import type { PublicEventData } from './types';

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

// Event-specific metadata configurations
function getEventMetadata(slug: string) {
  // NO EDGES event
  if (slug === 'no-edges-33-strategies-launch' || slug.includes('no-edges')) {
    return {
      title: 'No Edges - 3.12.26 - Austin, TX',
      description: 'Building at the speed of thought. Join us for NO EDGES, a 33 Strategies event.',
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
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bettercontacts.ai';
  const ogImageUrl = `${baseUrl}/api/og/m33t?slug=${encodeURIComponent(slug)}`;
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

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const data = await getEventData(slug);

  if (!data) {
    notFound();
  }

  return <EventLandingClient data={data} />;
}
