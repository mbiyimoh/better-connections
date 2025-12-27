'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * /enrich page - Redirects to voice-first enrichment session
 *
 * Routes:
 * - /enrich?id=X → /enrichment/session?contact=X (voice-first experience)
 * - Text-based fallback available at /enrich/text?id=X
 */
export default function EnrichRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contactId = searchParams.get('id');

  useEffect(() => {
    // Redirect to voice-first session with contact param
    if (contactId) {
      router.replace(`/enrichment/session?contact=${contactId}`);
    } else {
      // No contact specified, go to enrichment queue
      router.replace('/enrichment');
    }
  }, [contactId, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gold-primary" />
    </div>
  );
}
