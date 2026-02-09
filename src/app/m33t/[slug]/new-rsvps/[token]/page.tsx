import { verifyRSVPToken, isTokenExpired } from '@/lib/m33t/tokens';
import { NewRsvpsPageClient } from './NewRsvpsPageClient';

// Reuse error components from existing RSVP pages
function TokenInvalidMessage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white">Invalid Link</h1>
        <p className="text-zinc-400">
          This link is invalid or has been tampered with.
        </p>
      </div>
    </div>
  );
}

function TokenExpiredMessage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white">Link Expired</h1>
        <p className="text-zinc-400">
          This link has expired. Please contact the event organizer for a new link.
        </p>
      </div>
    </div>
  );
}

export default async function NewRsvpsPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  // Verify token
  const payload = verifyRSVPToken(token);
  if (!payload) {
    return <TokenInvalidMessage />;
  }

  if (isTokenExpired(token)) {
    return <TokenExpiredMessage />;
  }

  return <NewRsvpsPageClient slug={slug} token={token} />;
}
