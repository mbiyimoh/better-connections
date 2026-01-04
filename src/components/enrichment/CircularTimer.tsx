"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface CircularTimerProps {
  duration: number;
  remainingTime: number;
  isPlaying: boolean;
  onComplete: () => void;
  setRemainingTime: (fn: (prev: number) => number) => void;
}

export function CircularTimer({
  duration,
  remainingTime,
  isPlaying,
  onComplete,
  setRemainingTime,
}: CircularTimerProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = remainingTime / duration;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    if (!isPlaying || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime((prev: number) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, remainingTime, onComplete, setRemainingTime]);

  const isWarning = remainingTime <= 10;
  const strokeColor = isWarning ? "#EF4444" : "#d4a54a";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg
        width={128}
        height={128}
        className="-rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "linear" }}
          style={{
            filter: isWarning
              ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))"
              : "drop-shadow(0 0 8px rgba(212, 165, 74, 0.3))",
          }}
        />
      </svg>
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: isWarning ? Infinity : 0 }}
      >
        <span
          className={`text-[32px] font-bold tabular-nums ${
            isWarning ? "text-red-400" : "text-white"
          }`}
        >
          :{remainingTime.toString().padStart(2, "0")}
        </span>
      </motion.div>
    </div>
  );
}
