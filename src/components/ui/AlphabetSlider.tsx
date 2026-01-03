'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AlphabetSliderProps {
  /** Array of items with name property to extract letters from */
  items: Array<{ firstName: string; lastName?: string | null }>;
  /** Currently selected letter (null = show all) */
  selectedLetter: string | null;
  /** Callback when letter is clicked */
  onLetterSelect: (letter: string | null) => void;
  /** Custom class name */
  className?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlphabetSlider({
  items,
  selectedLetter,
  onLetterSelect,
  className,
}: AlphabetSliderProps) {
  // Calculate which letters have contacts
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of items) {
      const firstChar = item.firstName?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        letters.add(firstChar);
      }
    }
    return letters;
  }, [items]);

  // Count contacts per letter
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const firstChar = item.firstName?.[0]?.toUpperCase();
      if (firstChar && /[A-Z]/.test(firstChar)) {
        counts.set(firstChar, (counts.get(firstChar) || 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      // Clicking same letter clears filter
      onLetterSelect(null);
    } else {
      onLetterSelect(letter);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 py-2 px-1',
        'bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-700/50',
        className
      )}
      role="navigation"
      aria-label="Alphabet quick navigation"
    >
      {/* Clear filter button */}
      <button
        onClick={() => onLetterSelect(null)}
        className={cn(
          'w-6 h-6 text-xs font-medium rounded transition-colors',
          'flex items-center justify-center',
          selectedLetter === null
            ? 'bg-[#C9A227] text-black'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
        )}
        title="Show all"
        aria-label="Show all contacts"
      >
        All
      </button>

      <div className="w-4 h-px bg-zinc-700 my-1" />

      {/* Letter buttons */}
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.has(letter);
        const isSelected = selectedLetter === letter;
        const count = letterCounts.get(letter) || 0;

        return (
          <button
            key={letter}
            onClick={() => isAvailable && handleLetterClick(letter)}
            disabled={!isAvailable}
            className={cn(
              'w-6 h-5 text-xs font-semibold rounded transition-colors',
              'flex items-center justify-center',
              isSelected && 'bg-[#C9A227] text-black',
              !isSelected && isAvailable && 'text-zinc-300 hover:text-white hover:bg-zinc-700',
              !isAvailable && 'text-zinc-600 cursor-not-allowed'
            )}
            title={isAvailable ? `${letter} (${count} contacts)` : `No contacts starting with ${letter}`}
            aria-label={`Filter by letter ${letter}${isAvailable ? `, ${count} contacts` : ', no contacts'}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
