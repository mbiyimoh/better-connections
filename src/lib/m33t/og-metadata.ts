import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { verifyRSVPToken } from './tokens';

/**
 * Generate OpenGraph + Twitter Card metadata for RSVP invite pages.
 *
 * Used by both the branded (/m33t/[slug]/rsvp/[token]) and legacy (/rsvp/[token])
 * pages. The legacy page needs metadata because social media crawlers read OG tags
 * from the initially requested URL and don't follow JavaScript redirects.
 */
export async function generateRSVPOGMetadata(
  token: string,
  slug?: string
): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bettercontacts.ai';
  const ogImageUrl = `${baseUrl}/api/og/m33t/rsvp?token=${encodeURIComponent(token)}`;

  let title = "You're Invited";
  let description = "You've been personally invited. RSVP to confirm your spot.";

  try {
    const payload = verifyRSVPToken(token);
    if (payload) {
      const [attendee, event] = await Promise.all([
        prisma.eventAttendee.findUnique({
          where: { id: payload.attendeeId },
          select: { firstName: true },
        }),
        prisma.event.findUnique({
          where: { id: payload.eventId },
          select: { name: true },
        }),
      ]);

      if (attendee && event) {
        title = `${attendee.firstName}, You're Invited to ${event.name}`;
        description = `${attendee.firstName}, you've been personally invited to ${event.name}. RSVP to confirm your spot.`;
      } else if (event) {
        title = `You're Invited to ${event.name}`;
        description = `You've been personally invited to ${event.name}. RSVP to confirm your spot.`;
      }
    }
  } catch {
    // Token invalid - use defaults
  }

  const url = slug
    ? `${baseUrl}/m33t/${slug}/rsvp/${token}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(url && { url }),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
