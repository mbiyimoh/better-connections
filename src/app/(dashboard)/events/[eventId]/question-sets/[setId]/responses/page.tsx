'use client';

import { ResponsesPageClient } from './ResponsesPageClient';
import { useParams } from 'next/navigation';

export default function ResponsesPage() {
  const params = useParams<{ eventId: string; setId: string }>();

  return (
    <ResponsesPageClient eventId={params.eventId} setId={params.setId} />
  );
}
