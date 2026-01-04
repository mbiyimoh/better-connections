"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BUBBLE_CATEGORY_COLORS, type BubbleCategory } from "@/lib/design-system";

interface DemoBubble {
  id: string;
  text: string;
  category: BubbleCategory;
}

const DEMO_BUBBLES: DemoBubble[] = [
  { id: "1", text: "Invested in D2C brands", category: "opportunity" },
  { id: "2", text: "Based in NYC", category: "relationship" },
  { id: "3", text: "Writes $50k checks", category: "opportunity" }
];

export function Slide5EnrichmentPreview() {
  const [visibleBubbles, setVisibleBubbles] = useState(0);
  const [showWhyNow, setShowWhyNow] = useState(false);
  const [timerValue, setTimerValue] = useState(24);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerValue(prev => (prev > 20 ? prev - 1 : prev));
    }, 250);

    const bubble1 = setTimeout(() => setVisibleBubbles(1), 1500);
    const bubble2 = setTimeout(() => setVisibleBubbles(2), 2500);
    const bubble3 = setTimeout(() => setVisibleBubbles(3), 3500);
    const whyNow = setTimeout(() => setShowWhyNow(true), 4500);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(bubble1);
      clearTimeout(bubble2);
      clearTimeout(bubble3);
      clearTimeout(whyNow);
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md px-4">
      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-32 h-32 mb-8"
      >
        <svg width={128} height={128} className="-rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="52" fill="none" stroke="#d4a54a" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            strokeDashoffset={2 * Math.PI * 52 * (1 - timerValue / 30)}
            style={{ filter: "drop-shadow(0 0 8px rgba(212, 165, 74, 0.3))" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[32px] font-bold text-white tabular-nums">
            :{timerValue.toString().padStart(2, "0")}
          </span>
        </div>
      </motion.div>

      {/* Bubbles */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        <AnimatePresence>
          {DEMO_BUBBLES.slice(0, visibleBubbles).map((bubble, index) => {
            const styles = BUBBLE_CATEGORY_COLORS[bubble.category];
            return (
              <motion.span
                key={bubble.id}
                initial={{ scale: 0.6, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.08 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border ${styles.bg} ${styles.text} ${styles.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                {bubble.text}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Why Now Box */}
      <AnimatePresence>
        {showWhyNow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full rounded-xl border border-gold-primary/30 bg-gold-subtle p-4 mb-8"
          >
            <p className="text-gold-primary text-sm italic text-center">
              &quot;Met at SaaStr, offered intros...&quot;
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showWhyNow ? 1 : 0 }}
        className="text-center"
      >
        <h1 className="font-display text-2xl text-white mb-2">Just talk. We capture the context.</h1>
        <p className="font-body text-text-secondary">This is the fuel that powers your network search.</p>
      </motion.div>
    </div>
  );
}
