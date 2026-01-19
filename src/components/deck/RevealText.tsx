'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export interface RevealTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Text that fades in and slides up when scrolled into view.
 * Use staggered delays (0.1s increments) for dramatic effect.
 *
 * @example
 * <RevealText>
 *   <h2>Headline</h2>
 * </RevealText>
 * <RevealText delay={0.1}>
 *   <p>Body text...</p>
 * </RevealText>
 */
export function RevealText({
  children,
  delay = 0,
  className = '',
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-10%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
