'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns undefined during SSR, then actual value after hydration.
 *
 * @param query - CSS media query string (e.g., "(max-width: 767px)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with undefined to avoid hydration mismatch
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // Return false during SSR/initial render, actual value after hydration
  return matches ?? false;
}

/**
 * Convenience hook for mobile detection.
 * Mobile = viewport < 768px (below Tailwind's md: breakpoint)
 *
 * @returns boolean indicating if viewport is mobile-sized
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook for tablet and above detection.
 * Tablet+ = viewport >= 768px (at or above Tailwind's md: breakpoint)
 *
 * @returns boolean indicating if viewport is tablet-sized or larger
 */
export function useIsTabletOrAbove(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
