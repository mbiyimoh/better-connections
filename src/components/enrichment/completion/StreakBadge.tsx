"use client";

import { Zap } from "lucide-react";

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  // Don't show for first enrichment of the week
  if (count <= 1) {
    return null;
  }

  const getMessage = () => {
    if (count >= 20) return `On fire! ${count} contacts enriched this week`;
    if (count >= 10) return `Great streak! ${count} this week`;
    if (count >= 5) return `${count} contacts enriched this week`;
    return `${count} enriched this week`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
      <Zap size={14} className="text-amber-400" />
      <span className="text-xs font-medium text-amber-300">{getMessage()}</span>
    </div>
  );
}
