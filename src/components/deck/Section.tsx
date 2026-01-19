'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export interface SectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

/**
 * Full-viewport section container with fade-in animation.
 * Uses Framer Motion useInView for scroll-triggered opacity transitions.
 *
 * @example
 * <Section id="intro" className="relative">
 *   <div className="max-w-4xl mx-auto">
 *     {content}
 *   </div>
 * </Section>
 */
export function Section({
  id,
  children,
  className = '',
  fullHeight = true,
}: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20%' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`
        ${fullHeight ? 'min-h-screen' : ''}
        flex flex-col justify-center items-center
        px-6 md:px-16 lg:px-24 py-16
        ${className}
      `}
    >
      {children}
    </motion.section>
  );
}
