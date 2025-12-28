"use client";

import { useEffect, useState, useRef } from "react";

interface NumberTickerProps {
  from: number;
  to: number;
  duration?: number; // ms
  className?: string;
}

export function NumberTicker({
  from,
  to,
  duration = 1500,
  className = "",
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(from);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad for satisfying deceleration
      const eased = 1 - (1 - progress) * (1 - progress);

      const current = Math.round(from + (to - from) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      startTimeRef.current = null;
    };
  }, [from, to, duration]);

  return <span className={className}>{displayValue}</span>;
}
