'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';
import type { EnrichmentBubble } from '@/components/enrichment/EnrichmentBubbles';
import type { TagCategory } from '@/types/contact';

interface ExistingTag {
  id: string;
  text: string;
  category: TagCategory;
}

interface BubbleTagSuggestionsProps {
  contactId: string;
  bubbles: EnrichmentBubble[];
  existingTags: ExistingTag[];
  onTagsAdded?: () => void;
}

// Convert bubble category (lowercase) to tag category (uppercase)
function bubbleCategoryToTagCategory(category: string): TagCategory {
  return category.toUpperCase() as TagCategory;
}

interface TagSuggestion {
  text: string;
  category: TagCategory;
  bubbleId: string;
}

export function BubbleTagSuggestions({
  contactId,
  bubbles,
  existingTags,
  onTagsAdded,
}: BubbleTagSuggestionsProps) {
  const { toast } = useToast();

  // Convert bubbles to tag suggestions, filtering out duplicates
  const existingTagTexts = new Set(existingTags.map((t) => t.text.toLowerCase()));

  const suggestions: TagSuggestion[] = bubbles
    .map((bubble) => ({
      text: bubble.text,
      category: bubbleCategoryToTagCategory(bubble.category),
      bubbleId: bubble.id,
    }))
    .filter((s) => !existingTagTexts.has(s.text.toLowerCase()));

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.map((s) => s.bubbleId))
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set());

  // If no suggestions to show, render nothing
  if (suggestions.length === 0) {
    return null;
  }

  const toggleSelection = (bubbleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bubbleId)) {
        next.delete(bubbleId);
      } else {
        next.add(bubbleId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map((s) => s.bubbleId)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const addSelectedTags = async () => {
    const tagsToAdd = suggestions.filter((s) => selectedIds.has(s.bubbleId));
    if (tagsToAdd.length === 0) return;

    setIsAdding(true);
    const newlyAdded = new Set<string>();

    try {
      // Add tags one by one
      for (const tag of tagsToAdd) {
        try {
          const res = await fetch(`/api/contacts/${contactId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: tag.text,
              category: tag.category,
            }),
          });

          if (res.ok) {
            newlyAdded.add(tag.bubbleId);
          }
        } catch (error) {
          console.error(`Failed to add tag "${tag.text}":`, error);
        }
      }

      if (newlyAdded.size > 0) {
        setAddedTags((prev) => new Set([...prev, ...newlyAdded]));
        toast({
          title: 'Tags added',
          description: `Added ${newlyAdded.size} tag${newlyAdded.size > 1 ? 's' : ''} to this contact`,
        });
        onTagsAdded?.();
      }
    } catch (error) {
      console.error('Failed to add tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to add some tags',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Filter out already added tags from display
  const visibleSuggestions = suggestions.filter((s) => !addedTags.has(s.bubbleId));
  const selectedCount = visibleSuggestions.filter((s) => selectedIds.has(s.bubbleId)).length;
  const allAdded = visibleSuggestions.length === 0;

  if (allAdded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-3 bg-green-500/10 rounded-lg border border-green-500/20"
      >
        <div className="flex items-center gap-2 text-green-400">
          <Check size={16} />
          <span className="text-sm">All suggested tags added!</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">
            Save as Tags
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={selectAll}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Select all
          </button>
          <span className="text-zinc-600">|</span>
          <button
            onClick={selectNone}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Tag List */}
      <div className="p-4 space-y-2">
        {visibleSuggestions.map((suggestion) => {
          const colors = TAG_CATEGORY_COLORS[suggestion.category];
          const isSelected = selectedIds.has(suggestion.bubbleId);

          return (
            <label
              key={suggestion.bubbleId}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                isSelected ? 'bg-white/5' : 'hover:bg-white/5'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(suggestion.bubbleId)}
                className="border-zinc-600 data-[state=checked]:bg-gold-primary data-[state=checked]:border-gold-primary"
              />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  colors.bg,
                  colors.text
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                {suggestion.text}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-700/50 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {selectedCount} of {visibleSuggestions.length} selected
        </span>
        <Button
          size="sm"
          onClick={addSelectedTags}
          disabled={selectedCount === 0 || isAdding}
          className="bg-gold-primary hover:bg-gold-light text-black font-medium"
        >
          {isAdding ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus size={14} />
              Add Selected
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
