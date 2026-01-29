import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { TokenExpiredMessage } from '@/components/m33t/TokenExpiredMessage';
import { TokenInvalidMessage } from '@/components/m33t/TokenInvalidMessage';

interface RSVPPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Legacy RSVP page at /rsvp/[token]
 * Redirects to the new branded URL at /m33t/[slug]/rsvp/[token]
 * Falls back to rendering here if the event has no slug.
 */
export default async function LegacyRSVPPage({ params }: RSVPPageProps) {
  const { token } = await params;

  // Check if token is expired
  if (isTokenExpired(token)) {
    return <TokenExpiredMessage />;
  }

  // Verify token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return <TokenInvalidMessage />;
  }

  // Look up the event slug for redirect
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    select: { slug: true },
  });

  // Redirect to the new branded URL if the event has a slug
  if (event?.slug) {
    redirect(`/m33t/${event.slug}/rsvp/${token}`);
  }

  // Fallback: render here if no slug (shouldn't happen for M33T events)
  // Import and render the full RSVP page inline
  const { default: RSVPPage } = await import('@/app/m33t/[slug]/rsvp/[token]/page');
  return <RSVPPage params={Promise.resolve({ slug: '', token })} />;
}
