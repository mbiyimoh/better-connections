'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  children: string;
  className?: string;
  /** Size variant for prose styling */
  size?: 'sm' | 'base' | 'lg';
}

/**
 * Renders markdown content with proper styling for the dark theme.
 * Supports: **bold**, *italics*, paragraphs (blank lines), and basic formatting.
 */
export function MarkdownContent({
  children,
  className,
  size = 'sm',
}: MarkdownContentProps) {
  const sizeClass = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg',
  }[size];

  return (
    <div
      className={cn(
        'prose prose-invert max-w-none',
        sizeClass,
        // Custom styling for gold brand and dark theme
        'prose-p:text-zinc-300 prose-p:leading-relaxed',
        'prose-strong:text-white prose-strong:font-semibold',
        'prose-em:text-zinc-200',
        'prose-headings:text-white',
        'prose-a:text-amber-500 prose-a:no-underline hover:prose-a:underline',
        'prose-ul:text-zinc-300 prose-ol:text-zinc-300',
        'prose-li:marker:text-amber-500',
        className
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
