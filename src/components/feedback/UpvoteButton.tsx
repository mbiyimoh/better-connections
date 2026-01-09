'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpvoteButtonProps {
  feedbackId: string;
  upvoteCount: number;
  hasVoted: boolean;
  onVoteChange: (feedbackId: string, hasVoted: boolean, upvoteCount: number) => void;
}

export function UpvoteButton({
  feedbackId,
  upvoteCount,
  hasVoted,
  onVoteChange,
}: UpvoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticVoted, setOptimisticVoted] = useState(hasVoted);
  const [optimisticCount, setOptimisticCount] = useState(upvoteCount);

  const handleClick = async () => {
    if (isLoading) return;

    // Optimistic update
    const newVoted = !optimisticVoted;
    const newCount = newVoted ? optimisticCount + 1 : optimisticCount - 1;
    setOptimisticVoted(newVoted);
    setOptimisticCount(newCount);

    setIsLoading(true);
    try {
      const response = await fetch(`/api/feedback/${feedbackId}/vote`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setOptimisticVoted(!newVoted);
        setOptimisticCount(newVoted ? newCount - 1 : newCount + 1);
        return;
      }

      const data = await response.json();
      setOptimisticVoted(data.hasVoted);
      setOptimisticCount(data.upvoteCount);
      onVoteChange(feedbackId, data.hasVoted, data.upvoteCount);
    } catch {
      // Revert on error
      setOptimisticVoted(!newVoted);
      setOptimisticCount(newVoted ? newCount - 1 : newCount + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[48px]',
        optimisticVoted
          ? 'bg-gold-subtle text-gold-primary'
          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
      )}
      aria-label={optimisticVoted ? 'Remove upvote' : 'Upvote'}
    >
      <ChevronUp
        className={cn(
          'w-5 h-5 transition-transform',
          optimisticVoted && 'text-gold-primary'
        )}
      />
      <span className={cn(
        'text-sm font-medium',
        optimisticVoted && 'text-gold-primary'
      )}>
        {optimisticCount}
      </span>
    </button>
  );
}
