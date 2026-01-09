'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeedbackButtonProps {
  hideOnScroll?: boolean;
}

/**
 * Floating Action Button for feedback.
 * Navigates to /feedback page on click.
 * Positioned bottom-right, clears mobile bottom nav (bottom-20).
 */
export function FeedbackButton({ hideOnScroll = true }: FeedbackButtonProps) {
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

  return (
    <motion.div
      initial={{ scale: 1, y: 0 }}
      animate={{
        scale: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100,
      }}
      transition={{ duration: 0.2 }}
      className="fixed z-40 right-4 bottom-20 md:right-6 md:bottom-6"
    >
      <Link
        href="/feedback"
        className={cn(
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-gold-primary hover:bg-gold-light active:bg-gold-primary',
          'shadow-lg shadow-black/25',
          'transition-colors'
        )}
        aria-label="Send Feedback"
      >
        <MessageSquarePlus className="w-6 h-6 text-bg-primary" />
      </Link>
    </motion.div>
  );
}
