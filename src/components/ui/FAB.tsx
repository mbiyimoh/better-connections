'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FABProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hideOnScroll?: boolean;
}

export function FAB({
  icon,
  label,
  onClick,
  hideOnScroll = true,
}: FABProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Use debounce instead of throttle since use-debounce exports useDebouncedCallback
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
    <motion.button
      onClick={onClick}
      initial={{ scale: 1, y: 0 }}
      animate={{
        scale: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed z-30 md:hidden',
        'right-4 bottom-6',
        'w-14 h-14 rounded-full',
        'bg-gold-primary hover:bg-gold-light active:bg-gold-primary',
        'flex items-center justify-center',
        'shadow-lg shadow-black/25',
        'transition-colors'
      )}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}
