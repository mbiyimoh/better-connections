"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BUBBLE_CATEGORY_COLORS,
  type BubbleCategory,
} from "@/lib/design-system";
import { EditableBubble } from "./EditableBubble";

// Re-export BubbleCategory for backward compatibility
export type { BubbleCategory } from "@/lib/design-system";

export interface EnrichmentBubble {
  id: string;
  text: string;
  category: BubbleCategory;
}

interface EnrichmentBubblesProps {
  bubbles: EnrichmentBubble[];
  editable?: boolean;
  onUpdate?: (id: string, updates: Partial<EnrichmentBubble>) => void;
  onDelete?: (id: string) => void;
}

function Bubble({ bubble, index }: { bubble: EnrichmentBubble; index: number }) {
  const styles = BUBBLE_CATEGORY_COLORS[bubble.category];
  const dotColor = styles.dot;

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

export function EnrichmentBubbles({ bubbles, editable, onUpdate, onDelete }: EnrichmentBubblesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <AnimatePresence mode="popLayout">
        {bubbles.map((bubble, index) =>
          editable && onUpdate && onDelete ? (
            <EditableBubble
              key={bubble.id}
              bubble={bubble}
              index={index}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ) : (
            <Bubble key={bubble.id} bubble={bubble} index={index} />
          )
        )}
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
