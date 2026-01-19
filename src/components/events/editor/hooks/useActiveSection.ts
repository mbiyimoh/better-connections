'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

export function useActiveSection(sectionIds: readonly string[]): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const sectionIdsRef = useRef(sectionIds);

  // Memoize serialized version for stable comparison
  const serializedIds = useMemo(() => JSON.stringify(sectionIds), [sectionIds]);

  // Update ref when sectionIds change
  useEffect(() => {
    sectionIdsRef.current = sectionIds;
  }, [sectionIds]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find intersecting sections
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (intersecting[0]) {
          setActiveSection(intersecting[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px', // Trigger when section is in top 30%
        threshold: 0,
      }
    );

    // Use stable ref for observation
    const ids = sectionIdsRef.current;
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [serializedIds]); // Use memoized value for stable comparison

  return activeSection;
}
