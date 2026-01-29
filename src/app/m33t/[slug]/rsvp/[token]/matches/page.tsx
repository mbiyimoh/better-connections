import { Metadata } from 'next';
import { MatchRevealClient } from '@/app/rsvp/[token]/matches/MatchRevealClient';

export const metadata: Metadata = {
  title: 'Your Matches',
  description: 'View your curated connections',
};

export default async function MatchRevealPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  return <MatchRevealClient token={token} />;
}
