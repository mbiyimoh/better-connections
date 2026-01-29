'use client';

import { useState } from 'react';
import { Loader2, Check, X, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProfileSuggestion } from '@/lib/m33t/suggestion-schema';

interface ProfileSuggestionReviewProps {
  token: string;
  setId: string;
  suggestions: ProfileSuggestion[];
  onComplete: () => void;
  onSkip: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  expertise: 'Expertise',
  seekingKeywords: 'Looking For',
  offeringKeywords: 'Can Help With',
  currentFocus: 'Current Focus',
  role: 'Role',
  company: 'Company',
  conversationHooks: 'Conversation Starters',
};

const ACTION_LABELS: Record<string, string> = {
  add: 'Add',
  update: 'Update',
  replace: 'Replace',
};

export function ProfileSuggestionReview({
  token,
  setId,
  suggestions,
  onComplete,
  onSkip,
}: ProfileSuggestionReviewProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    // Pre-select high-confidence suggestions
    const initial = new Set<number>();
    suggestions.forEach((s, i) => {
      if (s.confidence >= 0.7) {
        initial.add(i);
      }
    });
    return initial;
  });
  const [applying, setApplying] = useState(false);

  const toggleSuggestion = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIndices(new Set(suggestions.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedIndices(new Set());
  };

  const handleApply = async () => {
    if (selectedIndices.size === 0) {
      onSkip();
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`/api/rsvp/${token}/question-sets/${setId}/apply-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedSuggestionIndices: Array.from(selectedIndices),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to apply suggestions');
      }

      toast.success(`Applied ${selectedIndices.size} profile updates!`);
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-bg-secondary border-border">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-12 h-12 text-gold-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">All Done!</h3>
            <p className="text-text-secondary mb-6">
              Your responses have been saved. No profile updates suggested.
            </p>
            <Button onClick={onComplete} className="bg-gold-primary hover:bg-gold-light text-bg-primary">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-gold-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Profile Suggestions</h2>
        </div>
        <p className="text-text-secondary">
          Based on your answers, we suggest these updates to your profile. Select which ones to
          apply.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Clear
          </Button>
        </div>
        <span className="text-sm text-text-secondary">
          {selectedIndices.size} of {suggestions.length} selected
        </span>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 mb-6">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            suggestion={suggestion}
            selected={selectedIndices.has(index)}
            onToggle={() => toggleSuggestion(index)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onSkip}>
          Skip All
        </Button>
        <Button
          onClick={handleApply}
          disabled={applying}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          {applying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : selectedIndices.size > 0 ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Apply {selectedIndices.size} Update{selectedIndices.size !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: ProfileSuggestion;
  selected: boolean;
  onToggle: () => void;
}

function SuggestionCard({ suggestion, selected, onToggle }: SuggestionCardProps) {
  const confidenceColor =
    suggestion.confidence >= 0.8
      ? 'text-green-500'
      : suggestion.confidence >= 0.5
        ? 'text-amber-500'
        : 'text-text-tertiary';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        selected ? 'ring-2 ring-gold-primary/50 bg-gold-subtle' : 'hover:bg-bg-tertiary'
      )}
      onClick={onToggle}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {FIELD_LABELS[suggestion.field] || suggestion.field}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {ACTION_LABELS[suggestion.action] || suggestion.action}
              </Badge>
              <span className={cn('text-xs ml-auto', confidenceColor)}>
                {Math.round(suggestion.confidence * 100)}% confident
              </span>
            </div>

            {/* Current Value */}
            {suggestion.currentValue && (
              <div className="text-sm text-text-tertiary mb-1">
                <span className="line-through">
                  {Array.isArray(suggestion.currentValue)
                    ? suggestion.currentValue.join(', ')
                    : suggestion.currentValue}
                </span>
              </div>
            )}

            {/* Suggested Value */}
            <div className="text-sm text-text-primary">
              {Array.isArray(suggestion.suggestedValue)
                ? suggestion.suggestedValue.join(', ')
                : suggestion.suggestedValue}
            </div>

            {/* Reason */}
            <p className="text-xs text-text-secondary mt-2">{suggestion.reason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
