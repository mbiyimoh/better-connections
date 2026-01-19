'use client';

import { motion } from 'framer-motion';
import { BRAND_GOLD } from '@/lib/design-system';

export interface ScrollIndicatorProps {
  color?: string;
}

/**
 * Animated scroll prompt with bouncing dot inside a pill shape.
 * Follows 33 Strategies scrollytelling guide pattern.
 */
export function ScrollIndicator({ color = BRAND_GOLD.primary }: ScrollIndicatorProps) {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 text-center">
      <p className="text-xs text-zinc-500 mb-2 tracking-widest uppercase">
        Scroll
      </p>
      <div className="w-6 h-10 rounded-full border-2 border-zinc-600 mx-auto relative">
        <motion.div
          className="w-1 h-2 rounded-full absolute top-2 left-1/2 -translate-x-1/2"
          style={{ backgroundColor: color }}
          animate={{
            y: [0, 12, 0],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}
