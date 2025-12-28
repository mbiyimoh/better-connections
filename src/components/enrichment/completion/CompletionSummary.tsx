"use client";

import type { EnrichmentBubble } from "@/components/enrichment/EnrichmentBubbles";

interface CompletionSummaryProps {
  bubbles: EnrichmentBubble[];
}

const categories = [
  "relationship",
  "opportunity",
  "interest",
  "expertise",
] as const;

export function CompletionSummary({ bubbles }: CompletionSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map((cat) => {
        const catBubbles = bubbles.filter((b) => b.category === cat);
        return (
          <div key={cat}>
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {cat}
            </h3>
            <div className="flex flex-col gap-1">
              {catBubbles.length > 0 ? (
                catBubbles.map((b) => (
                  <div key={b.id} className="text-[13px] text-zinc-400">
                    • {b.text}
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-zinc-600 italic">
                  (none captured)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
