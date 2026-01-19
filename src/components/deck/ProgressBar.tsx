'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { BRAND_GOLD } from '@/lib/design-system';

export interface ProgressBarProps {
  color?: string;
}

/**
 * Fixed scroll progress indicator at top of viewport.
 * Uses Framer Motion useScroll/useTransform for smooth animation.
 */
export function ProgressBar({ color = BRAND_GOLD.primary }: ProgressBarProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 origin-left z-50"
      style={{ scaleX, backgroundColor: color }}
    />
  );
}
