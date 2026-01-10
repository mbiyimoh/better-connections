'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeedbackButtonProps {
  hideOnScroll?: boolean;
  /** Hide on mobile viewports (used when page handles its own FeedbackButton) */
  hideOnMobile?: boolean;
  /** Position variant - contacts-page uses elevated position to avoid covering other FABs */
  variant?: 'default' | 'contacts-page';
}

/**
 * Floating Action Button for feedback.
 * Navigates to /feedback page on click.
 *
 * Mobile: Secondary transparent pill on bottom-left
 * Desktop: Gold pill on bottom-right above pagination
 */
export function FeedbackButton({ hideOnScroll = true, hideOnMobile = false, variant = 'default' }: FeedbackButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useDebouncedCallback(() => {
    const currentScrollY = window.scrollY;
    const isScrollingUp = currentScrollY < lastScrollY.current;
    const isNearTop = currentScrollY < 10;

    setIsVisible(isScrollingUp || isNearTop);
    lastScrollY.current = currentScrollY;
  }, 100, { leading: true, trailing: true });

  useEffect(() => {
    if (!hideOnScroll) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll, handleScroll]);

  // Position: left on mobile, right on desktop
  // contacts-page variant uses elevated desktop position to avoid covering Add Contact FAB
  const positionClasses = variant === 'contacts-page'
    ? 'left-4 bottom-6 md:left-auto md:right-6 md:bottom-24'
    : 'left-4 bottom-6 md:left-auto md:right-6 md:bottom-6';

  // Hide on mobile class (used when page handles its own feedback button)
  const mobileVisibilityClass = hideOnMobile ? 'hidden md:flex' : 'flex';

  return (
    <motion.div
      initial={{ scale: 1, y: 0 }}
      animate={{
        scale: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100,
      }}
      transition={{ duration: 0.2 }}
      className={cn('fixed z-40', positionClasses)}
    >
      <Link
        href="/feedback"
        className={cn(
          'items-center justify-center gap-2',
          mobileVisibilityClass,
          // Mobile: transparent pill with text
          'px-4 py-2.5 rounded-full',
          'bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-zinc-800/80',
          'backdrop-blur-sm',
          'border border-zinc-600/50',
          // Desktop: gold pill button
          'md:bg-gold-primary md:hover:bg-gold-light md:active:bg-gold-primary',
          'md:border-transparent',
          'shadow-lg shadow-black/25',
          'transition-colors'
        )}
        aria-label="Send Feedback"
      >
        <MessageSquarePlus className="w-5 h-5 text-zinc-300 md:text-bg-primary" />
        <span className="text-sm font-medium text-zinc-300 md:text-bg-primary">Feedback</span>
      </Link>
    </motion.div>
  );
}
