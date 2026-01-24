import Link from 'next/link';

export default function EventNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center px-4">
        <h1
          className="font-display text-4xl text-white font-medium mb-4"
        >
          Event Not Found
        </h1>
        <p className="font-body text-zinc-400 mb-8">
          This event doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/"
          className="text-amber-500 hover:text-amber-400 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
