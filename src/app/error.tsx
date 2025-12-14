"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-zinc-400">
            We encountered an unexpected error. Please try again or return to
            the home page.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#C9A227] hover:bg-[#E5C766] text-black"
          >
            <RefreshCw size={16} />
            Try Again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contacts">
              <Home size={16} />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
