'use client';

import { useState } from 'react';
import { Sparkles, Plus, Loader2, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';
import type { Contact, TagCategory } from '@/types/contact';

interface TagSuggestion {
  text: string;
  category: TagCategory;
}

interface TagsSectionProps {
  contact: Contact;
  onTagAdded?: () => void;
}

export function TagsSection({ contact, onTagAdded }: TagsSectionProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [addingTagText, setAddingTagText] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (hasLoadedSuggestions) return;

    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/suggest-tags`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to get tag suggestions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to get tag suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSuggestions(false);
      setHasLoadedSuggestions(true);
    }
  };

  const addTag = async (suggestion: TagSuggestion) => {
    setAddingTagText(suggestion.text);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: suggestion.text,
          category: suggestion.category,
        }),
      });

      if (res.ok) {
        // Remove from suggestions
        setSuggestions((prev) => prev.filter((s) => s.text !== suggestion.text));
        toast({
          title: 'Tag added',
          description: `"${suggestion.text}" has been added to this contact`,
        });
        onTagAdded?.();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to add tag',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive',
      });
    } finally {
      setAddingTagText(null);
    }
  };

  const hasTags = contact.tags.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          <TagIcon className="h-4 w-4" />
          Tags
        </h2>
        {!hasLoadedSuggestions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoadingSuggestions}
            className="text-xs text-gold-primary hover:text-gold-light"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3 w-3" />
                Get AI Suggestions
              </>
            )}
          </Button>
        )}
      </div>

      {/* Existing Tags */}
      {hasTags ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {contact.tags.map((tag) => {
            const colors = TAG_CATEGORY_COLORS[tag.category];
            return (
              <span
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                  colors.bg,
                  colors.text
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                {tag.text}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary mb-4">No tags yet</p>
      )}

      {/* AI Suggestions */}
      {hasLoadedSuggestions && hasSuggestions && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-text-tertiary mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Suggested tags
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const colors = TAG_CATEGORY_COLORS[suggestion.category];
              const isAdding = addingTagText === suggestion.text;
              return (
                <button
                  key={suggestion.text}
                  onClick={() => addTag(suggestion)}
                  disabled={isAdding}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                    'border-dashed border-white/20',
                    colors.bg,
                    colors.text,
                    'hover:border-solid hover:border-white/40',
                    isAdding && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isAdding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {suggestion.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No suggestions after loading */}
      {hasLoadedSuggestions && !hasSuggestions && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-text-tertiary">
            No additional tags suggested. Try enriching this contact with more information.
          </p>
        </div>
      )}
    </div>
  );
}
