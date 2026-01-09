'use client';

import { cn } from '@/lib/utils';

interface DotIndicatorProps {
  currentSlide: number;
  totalSlides: number;
}

export function DotIndicator({ currentSlide, totalSlides }: DotIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-300',
            index === currentSlide
              ? 'bg-gold-primary scale-125'
              : index < currentSlide
              ? 'bg-gold-primary/50'
              : 'bg-white/20'
          )}
          aria-label={`Slide ${index + 1} of ${totalSlides}`}
          aria-current={index === currentSlide ? 'step' : undefined}
        />
      ))}
    </div>
  );
}
