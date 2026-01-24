'use client';

import { GOLD_FOIL_BUTTON } from '@/lib/design-system';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center px-4">
        <h1
          className="font-display text-4xl text-white font-medium mb-4"
        >
          Something went wrong
        </h1>
        <p className="font-body text-zinc-400 mb-8">
          {error.message || 'Unable to load event details'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
          style={{ ...GOLD_FOIL_BUTTON }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
