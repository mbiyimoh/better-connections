"use client";

import { Trophy, Flame, Star, TrendingUp } from "lucide-react";

interface RankCelebrationProps {
  contactName: string;
  currentRank: number;
  previousRank: number;
  totalContacts: number;
}

export function RankCelebration({
  contactName,
  currentRank,
  previousRank,
  totalContacts,
}: RankCelebrationProps) {
  const rankDelta = previousRank - currentRank;

  // Don't show for single contact or no change
  if (totalContacts <= 1) {
    return null;
  }

  // Determine message and styling based on achievement tier
  let message: string;
  let Icon = TrendingUp;
  let iconColor = "text-amber-400";
  let bgColor = "bg-amber-500/10";
  let borderColor = "border-amber-500/20";

  if (currentRank === 1) {
    // #1 - Most enriched contact
    message = `${contactName} is now your most enriched contact!`;
    Icon = Trophy;
    iconColor = "text-yellow-400";
    bgColor = "bg-yellow-500/10";
    borderColor = "border-yellow-500/20";
  } else if (currentRank <= 3 && previousRank > 3) {
    // Entered top 3
    message = `${contactName} just cracked your Top 3!`;
    Icon = Star;
    iconColor = "text-purple-400";
    bgColor = "bg-purple-500/10";
    borderColor = "border-purple-500/20";
  } else if (currentRank <= 10 && previousRank > 10) {
    // Entered top 10
    message = `${contactName} just entered your Top 10!`;
    Icon = Flame;
    iconColor = "text-orange-400";
    bgColor = "bg-orange-500/10";
    borderColor = "border-orange-500/20";
  } else if (currentRank <= 10) {
    // Stayed in top 10
    message = `${contactName} stays in your Top 10!`;
    Icon = Flame;
  } else if (rankDelta > 50) {
    // Major jump (50+ spots)
    message = `Nice! ${contactName} moved from #${previousRank} to #${currentRank}!`;
  } else if (rankDelta > 10) {
    // Moderate jump (10-50 spots)
    message = `${contactName} moved up ${rankDelta} spots to #${currentRank}!`;
  } else if (rankDelta > 0) {
    // Small improvement
    message = `${contactName} moved up to #${currentRank} of ${totalContacts}`;
  } else {
    // No improvement (shouldn't normally happen)
    return null;
  }

  return (
    <div className={`${bgColor} ${borderColor} border rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={iconColor}>
          <Icon size={24} />
        </div>
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
    </div>
  );
}
