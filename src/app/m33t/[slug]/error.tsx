'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center px-4">
        <h1
          className="text-4xl text-white font-medium mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Something went wrong
        </h1>
        <p className="text-zinc-400 mb-8">
          {error.message || 'Unable to load event details'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
