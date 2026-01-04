"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-400">
            There was an error loading this page. Please try again.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <Button
          onClick={reset}
          className="bg-gold-primary hover:bg-gold-light text-black"
        >
          <RefreshCw size={16} />
          Try Again
        </Button>
      </div>
    </div>
  );
}
