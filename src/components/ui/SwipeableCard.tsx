'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 120;

export function SwipeableCard({
  children,
  onSwipeRight,
  actionLabel = 'Enrich',
  disabled = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isHorizontalSwipe.current = null;
    setIsTransitioning(false);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    if (!touch) return;
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes to the right
    if (isHorizontalSwipe.current && diffX > 0) {
      setTranslateX(Math.min(diffX, MAX_SWIPE));
    }
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setIsTransitioning(true);

    if (translateX > SWIPE_THRESHOLD) {
      onSwipeRight?.();
    }

    setTranslateX(0);
    isHorizontalSwipe.current = null;
  }, [disabled, translateX, onSwipeRight]);

  const progress = Math.min(translateX / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action background revealed on swipe */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-24',
          'bg-purple-600 flex items-center justify-center gap-2',
          'transition-opacity duration-150'
        )}
        style={{ opacity: progress }}
      >
        <Sparkles className="h-5 w-5 text-white" />
        <span className="text-white text-sm font-medium">{actionLabel}</span>
      </div>

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isTransitioning ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
