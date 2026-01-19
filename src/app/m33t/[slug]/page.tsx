import { notFound } from 'next/navigation';
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

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const data = await getEventData(slug);

  if (!data) {
    notFound();
  }

  return <EventLandingClient data={data} />;
}
