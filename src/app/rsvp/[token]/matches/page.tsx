import { Metadata } from 'next';
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
  return <MatchRevealClient token={token} />;
}
