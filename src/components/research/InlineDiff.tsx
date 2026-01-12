'use client';

import { useMemo } from 'react';
import { diffWords } from 'diff';

interface InlineDiffProps {
  oldText: string;
  newText: string;
  className?: string;
}

/**
 * Renders an inline diff view showing:
 * - Strikethrough for deleted text
 * - Bold italic for added text
 * - Regular text for unchanged parts
 */
export function InlineDiff({ oldText, newText, className = '' }: InlineDiffProps) {
  const diffParts = useMemo(() => {
    return diffWords(oldText, newText);
  }, [oldText, newText]);

  return (
    <span className={className}>
      {diffParts.map((part, index) => {
        if (part.removed) {
          // Deleted text - strikethrough with muted color
          return (
            <span
              key={index}
              className="line-through text-red-400/70 decoration-red-400/70"
            >
              {part.value}
            </span>
          );
        }
        if (part.added) {
          // Added text - bold italic with green color
          return (
            <span
              key={index}
              className="font-semibold italic text-green-400"
            >
              {part.value}
            </span>
          );
        }
        // Unchanged text
        return <span key={index}>{part.value}</span>;
      })}
    </span>
  );
}
