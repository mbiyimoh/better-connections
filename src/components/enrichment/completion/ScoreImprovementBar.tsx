"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { NumberTicker } from "./NumberTicker";

interface ScoreImprovementBarProps {
  previousScore: number;
  newScore: number;
  isAnimating: boolean;
  showDelta: boolean;
}

// Color thresholds and their corresponding colors
function getScoreColor(score: number): string {
  if (score <= 25) return "#EF4444"; // red-500
  if (score <= 50) return "#F97316"; // orange-500
  if (score <= 75) return "#F59E0B"; // amber-500
  return "#22C55E"; // green-500
}

// Generate CSS gradient stops for the filled bar
function getGradientStops(endScore: number): string {
  const stops: string[] = [];

  // Red zone (0-25)
  stops.push("#EF4444 0%");
  if (endScore <= 25) {
    return stops.join(", ");
  }
  stops.push("#EF4444 25%");

  // Orange zone (25-50)
  stops.push("#F97316 25%");
  if (endScore <= 50) {
    return stops.join(", ");
  }
  stops.push("#F97316 50%");

  // Amber zone (50-75)
  stops.push("#F59E0B 50%");
  if (endScore <= 75) {
    return stops.join(", ");
  }
  stops.push("#F59E0B 75%");

  // Green zone (75-100)
  stops.push("#22C55E 75%");
  stops.push("#22C55E 100%");

  return stops.join(", ");
}

export function ScoreImprovementBar({
  previousScore,
  newScore,
  isAnimating,
  showDelta,
}: ScoreImprovementBarProps) {
  const [, setDisplayScore] = useState(previousScore);

  // Spring animation for smooth, physics-based bar fill
  const springValue = useSpring(previousScore, {
    stiffness: 50,
    damping: 20,
  });

  // Start animation when isAnimating becomes true
  useEffect(() => {
    if (isAnimating) {
      springValue.set(newScore);
    }
  }, [isAnimating, newScore, springValue]);

  // Update display score as spring animates
  useEffect(() => {
    return springValue.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
  }, [springValue]);

  // Transform spring value to percentage width
  const width = useTransform(springValue, [0, 100], ["0%", "100%"]);

  const delta = newScore - previousScore;
  const endColor = getScoreColor(newScore);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Enrichment Score
        </span>
      </div>

      {/* Progress bar container */}
      <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{
            width,
            background: `linear-gradient(90deg, ${getGradientStops(newScore)})`,
          }}
        />
      </div>

      {/* Score display with ticker */}
      <div className="flex items-center justify-center gap-3">
        <div className="text-2xl font-bold text-white tabular-nums">
          <NumberTicker
            from={previousScore}
            to={isAnimating ? newScore : previousScore}
            duration={1500}
          />
          <span className="text-zinc-500 font-normal"> / 100</span>
        </div>

        {/* Delta badge - fades in after animation */}
        {showDelta && delta > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${endColor}20`,
              color: endColor,
            }}
          >
            +{delta}
          </motion.span>
        )}
      </div>
    </div>
  );
}
