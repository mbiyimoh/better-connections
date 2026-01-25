import type { Metadata } from 'next';
import { M33TLandingClient } from './M33TLandingClient';

export const metadata: Metadata = {
  title: 'M33T | Better Networking | Better Contacts',
  description: 'The right people. The right context. BEFORE you arrive. End random networking with AI-powered event matching.',
  openGraph: {
    title: 'M33T | Better Networking',
    description: 'The right people. The right context. BEFORE you arrive.',
    type: 'website',
    url: 'https://bettercontacts.ai/m33t',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M33T | Better Networking',
    description: 'The right people. The right context. BEFORE you arrive.',
  },
};

export default function M33TLandingPage() {
  return <M33TLandingClient />;
}
