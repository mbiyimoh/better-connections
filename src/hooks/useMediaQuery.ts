'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns undefined during SSR, then actual value after hydration.
 *
 * @param query - CSS media query string (e.g., "(max-width: 767px)")
 * @returns undefined during SSR, boolean after hydration
 */
export function useMediaQuery(query: string): boolean | undefined {
  // Initialize with undefined to detect SSR/hydration state
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // Return undefined during SSR to allow proper guards
  return matches;
}

/**
 * Convenience hook for mobile detection.
 * Mobile = viewport < 768px (below Tailwind's md: breakpoint)
 *
 * @returns undefined during SSR, boolean after hydration
 */
export function useIsMobile(): boolean | undefined {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook for tablet and above detection.
 * Tablet+ = viewport >= 768px (at or above Tailwind's md: breakpoint)
 *
 * @returns undefined during SSR, boolean after hydration
 */
export function useIsTabletOrAbove(): boolean | undefined {
  return useMediaQuery('(min-width: 768px)');
}
