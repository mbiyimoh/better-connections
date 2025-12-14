"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type BubbleCategory = "relationship" | "opportunity" | "expertise" | "interest";

export interface EnrichmentBubble {
  id: string;
  text: string;
  category: BubbleCategory;
}

interface EnrichmentBubblesProps {
  bubbles: EnrichmentBubble[];
}

const categoryStyles: Record<BubbleCategory, { bg: string; text: string; border: string }> = {
  relationship: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  opportunity: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  expertise: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  interest: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
};

const categoryDots: Record<BubbleCategory, string> = {
  relationship: "bg-blue-400",
  opportunity: "bg-green-400",
  expertise: "bg-purple-400",
  interest: "bg-amber-400",
};

function Bubble({ bubble, index }: { bubble: EnrichmentBubble; index: number }) {
  const styles = categoryStyles[bubble.category];
  const dotColor = categoryDots[bubble.category];

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: index * 0.08,
      }}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border",
          styles.bg,
          styles.text,
          styles.border
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
        {bubble.text}
      </span>
    </motion.div>
  );
}

export function EnrichmentBubbles({ bubbles }: EnrichmentBubblesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <AnimatePresence mode="popLayout">
        {bubbles.map((bubble, index) => (
          <Bubble key={bubble.id} bubble={bubble} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper function to generate a unique ID for bubbles
export function createBubble(text: string, category: BubbleCategory): EnrichmentBubble {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    category,
  };
}
