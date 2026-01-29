import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from '@/lib/m33t/tokens';
import { MatchRevealClient } from './MatchRevealClient';

export const metadata: Metadata = {
  title: 'Your Matches',
  description: 'View your curated connections',
};

export default async function MatchRevealPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Check for slug redirect
  const payload = verifyRSVPToken(token);
  if (payload) {
    const event = await prisma.event.findUnique({
      where: { id: payload.eventId },
      select: { slug: true },
    });
    if (event?.slug) {
      redirect(`/m33t/${event.slug}/rsvp/${token}/matches`);
    }
  }

  return <MatchRevealClient token={token} />;
}
