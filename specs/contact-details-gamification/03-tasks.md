# Task Breakdown: Contact Details Page Gamification Enhancement

**Generated**: 2026-01-04
**Source**: specs/contact-details-gamification/02-spec-lean.md
**Last Decompose**: 2026-01-04

---

## Overview

This task breakdown implements gamification elements on the contact details page:
1. Prominent enrichment score with ranking and improvement suggestions
2. Tags display on contact details page with AI-powered suggestions
3. Automatic conversion of enrichment bubbles to tags post-enrichment

**Total Tasks**: 8
**Phases**: 2

---

## Phase 1: Core Infrastructure (Backend + Utilities)

### Task 1.1: Add getMissingFieldSuggestions() to enrichment.ts

**Description**: Create utility function that returns missing contact fields sorted by enrichment score point value
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2, Task 1.3

**File**: `src/lib/enrichment.ts`

**Implementation**:

```typescript
// Add to src/lib/enrichment.ts

export interface FieldSuggestion {
  field: keyof EnrichmentScoreInput;
  label: string;
  points: number;
}

/**
 * Get suggestions for missing fields that would improve enrichment score.
 * Returns top 3 suggestions sorted by point value (highest first).
 */
export function getMissingFieldSuggestions(contact: EnrichmentScoreInput): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];

  // High value fields (enrichment-focused)
  if (!contact.whyNow) suggestions.push({ field: 'whyNow', label: 'Why Now', points: 20 });
  if (!contact.howWeMet) suggestions.push({ field: 'howWeMet', label: 'How We Met', points: 15 });
  if (!contact.title) suggestions.push({ field: 'title', label: 'Job Title', points: 10 });
  if (!contact.company) suggestions.push({ field: 'company', label: 'Company', points: 10 });

  // Medium value fields
  if (!contact.primaryEmail) suggestions.push({ field: 'primaryEmail', label: 'Email', points: 8 });
  if (!contact.location) suggestions.push({ field: 'location', label: 'Location', points: 5 });
  if (!contact.linkedinUrl) suggestions.push({ field: 'linkedinUrl', label: 'LinkedIn', points: 5 });
  if (!contact.notes) suggestions.push({ field: 'notes', label: 'Notes', points: 5 });
  if (!contact.primaryPhone) suggestions.push({ field: 'primaryPhone', label: 'Phone', points: 4 });
  if (!contact.lastName) suggestions.push({ field: 'lastName', label: 'Last Name', points: 3 });

  // Sort by points descending, return top 3
  return suggestions
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
}
```

**Acceptance Criteria**:
- [ ] Function returns FieldSuggestion[] with field, label, and points
- [ ] Suggestions sorted by points (highest first)
- [ ] Returns max 3 suggestions
- [ ] Only includes fields that are missing (null/undefined/empty)
- [ ] Point values match calculateEnrichmentScore() weights

---

### Task 1.2: Create Contact Ranking API

**Description**: Create API endpoint to fetch a contact's ranking among all user contacts
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, Task 1.3

**File**: `src/app/api/contacts/[id]/ranking/route.ts`

**Implementation**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

interface RankingResponse {
  currentRank: number;
  totalContacts: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      select: { id: true, enrichmentScore: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get all contacts sorted by enrichment score descending
    const allContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, enrichmentScore: true },
      orderBy: { enrichmentScore: 'desc' },
    });

    // Calculate current rank (1-indexed)
    const currentRank = allContacts.findIndex((c) => c.id === id) + 1;

    const response: RankingResponse = {
      currentRank,
      totalContacts: allContacts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 });
  }
}
```

**Acceptance Criteria**:
- [ ] Returns { currentRank, totalContacts }
- [ ] Rank is 1-indexed (first place = 1)
- [ ] Contacts ranked by enrichmentScore descending
- [ ] Only counts contacts belonging to authenticated user
- [ ] Returns 404 if contact not found
- [ ] Returns 401 if not authenticated

---

### Task 1.3: Create AI Tag Suggestion API

**Description**: Create API endpoint that uses GPT-4o-mini to suggest tags based on contact data
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, Task 1.2

**File**: `src/app/api/contacts/[id]/suggest-tags/route.ts`

**Implementation**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { gpt4oMini, TAG_SUGGESTION_SYSTEM_PROMPT } from '@/lib/openai';

// Schema for AI response
const tagSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string().max(50).describe('Short tag text, 1-4 words'),
      category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']),
    })
  ).max(5),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contact with existing tags
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Build context for AI
    const contactContext = [
      contact.firstName && `Name: ${contact.firstName} ${contact.lastName || ''}`.trim(),
      contact.title && `Title: ${contact.title}`,
      contact.company && `Company: ${contact.company}`,
      contact.expertise && `Expertise: ${contact.expertise}`,
      contact.interests && `Interests: ${contact.interests}`,
      contact.howWeMet && `How we met: ${contact.howWeMet}`,
      contact.whyNow && `Why now: ${contact.whyNow}`,
      contact.notes && `Notes: ${contact.notes}`,
    ].filter(Boolean).join('\n');

    // Skip if no useful context
    if (contactContext.length < 20) {
      return NextResponse.json({ suggestions: [] });
    }

    // Get existing tag texts for filtering
    const existingTagTexts = contact.tags.map((t) => t.text.toLowerCase());

    // Call GPT-4o-mini for suggestions
    const result = await generateObject({
      model: gpt4oMini,
      system: TAG_SUGGESTION_SYSTEM_PROMPT,
      prompt: `Contact information:\n${contactContext}\n\nExisting tags to avoid duplicating: ${existingTagTexts.join(', ') || 'none'}`,
      schema: tagSuggestionSchema,
    });

    // Filter out any suggestions that match existing tags
    const filteredSuggestions = result.object.suggestions.filter(
      (s) => !existingTagTexts.includes(s.text.toLowerCase())
    );

    return NextResponse.json({ suggestions: filteredSuggestions });
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
```

**Acceptance Criteria**:
- [ ] Uses existing TAG_SUGGESTION_SYSTEM_PROMPT from lib/openai.ts
- [ ] Returns array of { text, category } suggestions (max 5)
- [ ] Filters out suggestions matching existing tags (case-insensitive)
- [ ] Returns empty array if contact has insufficient data
- [ ] Handles GPT-4o-mini errors gracefully
- [ ] Returns 401/404 for auth/not found errors

---

## Phase 2: Frontend Components

### Task 2.1: Create EnrichmentScoreCard Component

**Description**: Build prominent score display with ranking badge and improvement suggestions
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (getMissingFieldSuggestions), Task 1.2 (ranking API)
**Can run parallel with**: Task 2.2

**File**: `src/components/contacts/EnrichmentScoreCard.tsx`

**Implementation**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMissingFieldSuggestions, type FieldSuggestion } from '@/lib/enrichment';
import type { Contact } from '@/types/contact';

interface EnrichmentScoreCardProps {
  contact: Contact;
}

// Score color thresholds (reused from ScoreImprovementBar)
function getScoreColor(score: number): { bg: string; text: string; border: string } {
  if (score <= 25) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  if (score <= 50) return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
  if (score <= 75) return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
  return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
}

export function EnrichmentScoreCard({ contact }: EnrichmentScoreCardProps) {
  const [ranking, setRanking] = useState<{ currentRank: number; totalContacts: number } | null>(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);

  // Fetch ranking on mount
  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch(`/api/contacts/${contact.id}/ranking`);
        if (res.ok) {
          const data = await res.json();
          setRanking(data);
        }
      } catch (error) {
        console.error('Failed to fetch ranking:', error);
      } finally {
        setIsLoadingRanking(false);
      }
    }
    fetchRanking();
  }, [contact.id]);

  const scoreColors = getScoreColor(contact.enrichmentScore);
  const suggestions = getMissingFieldSuggestions(contact);

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full border-2',
              scoreColors.bg,
              scoreColors.border
            )}
          >
            <span className={cn('text-2xl font-bold', scoreColors.text)}>
              {contact.enrichmentScore}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Enrichment Score
            </h3>
            {/* Ranking Badge */}
            {!isLoadingRanking && ranking && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  Ranked <span className="font-medium text-white">#{ranking.currentRank}</span> of{' '}
                  {ranking.totalContacts} contacts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Enrich CTA */}
        <Link
          href={`/enrichment/session?contact=${contact.id}`}
          className="flex items-center gap-1.5 rounded-lg bg-gold-primary px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-gold-light transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Enrich
        </Link>
      </div>

      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
            Improve Your Score
          </h4>
          <div className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.field}
                href={`/contacts/${contact.id}/edit`}
                className="flex items-center justify-between group hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <span className="text-sm text-text-secondary group-hover:text-white transition-colors">
                  Add {suggestion.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gold-primary">
                  +{suggestion.points} pts
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Perfect Score State */}
      {contact.enrichmentScore === 100 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-green-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Fully enriched!</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Score displayed in large circular badge with color based on thresholds
- [ ] Color thresholds: 0-25 red, 26-50 orange, 51-75 amber, 76-100 green
- [ ] Ranking badge shows "Ranked #X of Y contacts"
- [ ] "Improve Your Score" section shows top 3 missing fields with point values
- [ ] Each suggestion links to edit page
- [ ] "Fully enriched!" message when score is 100
- [ ] Loading state for ranking (doesn't block render)

---

### Task 2.2: Create TagsSection Component

**Description**: Build tags display with AI suggestion functionality
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.3 (suggest-tags API)
**Can run parallel with**: Task 2.1

**File**: `src/components/contacts/TagsSection.tsx`

**Implementation**:

```typescript
'use client';

import { useState } from 'react';
import { Sparkles, Plus, Loader2, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Contact, Tag, TagCategory } from '@/types/contact';

interface TagsSectionProps {
  contact: Contact;
  onTagAdded?: () => void;
}

const categoryColors: Record<TagCategory, { bg: string; text: string; dot: string }> = {
  RELATIONSHIP: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  OPPORTUNITY: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  EXPERTISE: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  INTEREST: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
};

interface TagSuggestion {
  text: string;
  category: TagCategory;
}

export function TagsSection({ contact, onTagAdded }: TagsSectionProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [addingTagText, setAddingTagText] = useState<string | null>(null);

  const fetchSuggestions = async () => {
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
      setHasFetchedSuggestions(true);
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
          description: `Added "${suggestion.text}" tag`,
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

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
          <TagIcon className="h-4 w-4" />
          Tags
        </h2>
        {!hasFetchedSuggestions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoadingSuggestions}
            className="text-gold-primary hover:text-gold-light hover:bg-gold-subtle"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            Get AI Suggestions
          </Button>
        )}
      </div>

      {/* Existing Tags */}
      {contact.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {contact.tags.map((tag) => {
            const colors = categoryColors[tag.category];
            return (
              <span
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
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
      {hasFetchedSuggestions && suggestions.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
            Suggested Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const colors = categoryColors[suggestion.category];
              const isAdding = addingTagText === suggestion.text;
              return (
                <button
                  key={suggestion.text}
                  onClick={() => addTag(suggestion)}
                  disabled={isAdding}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border border-dashed transition-colors',
                    colors.bg,
                    colors.text,
                    'border-current hover:border-solid',
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

      {/* No suggestions state */}
      {hasFetchedSuggestions && suggestions.length === 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-text-tertiary">
            No additional tags suggested. Add more contact details to get better suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Displays existing tags with category colors
- [ ] "Get AI Suggestions" button fetches suggestions on-demand (not on page load)
- [ ] Suggested tags shown with dashed border and + icon
- [ ] Clicking suggestion adds tag via POST /api/contacts/[id]/tags
- [ ] Added tag removed from suggestions list
- [ ] Toast notifications for success/error
- [ ] Loading states for fetch and add operations
- [ ] Empty states for no tags and no suggestions

---

### Task 2.3: Integrate Components into ContactDetail

**Description**: Add EnrichmentScoreCard and TagsSection to the contact details page
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2
**Can run parallel with**: None (depends on 2.1 and 2.2)

**File**: `src/components/contacts/ContactDetail.tsx`

**Changes**:

1. Add imports at top:
```typescript
import { EnrichmentScoreCard } from './EnrichmentScoreCard';
import { TagsSection } from './TagsSection';
```

2. Remove the inline tags display from the profile header (lines ~128-145)

3. Remove the enrichment score from the "Relationship" section (lines ~316-327)

4. Add new components after profile header, before "Why Now" section:

```typescript
// After the profile header </div> (around line 187), before {/* Why Now */}

{/* Enrichment Score Card */}
<EnrichmentScoreCard contact={contact} />

{/* Tags Section */}
<TagsSection
  contact={contact}
  onTagAdded={() => router.refresh()}
/>

{/* Why Now - Key Section */}
{contact.whyNow && (
  // ... existing Why Now section
)}
```

**Acceptance Criteria**:
- [ ] EnrichmentScoreCard appears after profile header
- [ ] TagsSection appears after EnrichmentScoreCard
- [ ] Tags removed from profile header (avoid duplication)
- [ ] Enrichment score removed from Relationship section (avoid duplication)
- [ ] Page refreshes when tag is added (via router.refresh)
- [ ] Layout flows naturally with existing sections

---

### Task 2.4: Add Bubble-to-Tag Conversion in Enrichment Completion

**Description**: Add UI to convert enrichment bubbles to tags during completion flow
**Size**: Medium
**Priority**: Medium
**Dependencies**: None (can work with existing tags API)
**Can run parallel with**: Tasks 2.1, 2.2

**File**: `src/components/enrichment/completion/BubbleTagSuggestions.tsx` (new)
**File**: `src/components/enrichment/completion/CompletionCelebration.tsx` (modify)

**New Component Implementation**:

```typescript
// src/components/enrichment/completion/BubbleTagSuggestions.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EnrichmentBubble } from '@/components/enrichment/EnrichmentBubbles';
import type { TagCategory, Tag as TagType } from '@/types/contact';

interface BubbleTagSuggestionsProps {
  bubbles: EnrichmentBubble[];
  existingTags: TagType[];
  contactId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  relationship: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  opportunity: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  expertise: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  interest: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
};

export function BubbleTagSuggestions({
  bubbles,
  existingTags,
  contactId,
  onComplete,
  onSkip,
}: BubbleTagSuggestionsProps) {
  // Filter out bubbles that match existing tags
  const existingTagTexts = existingTags.map((t) => t.text.toLowerCase());
  const newSuggestions = bubbles.filter(
    (b) => !existingTagTexts.includes(b.text.toLowerCase())
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(newSuggestions.map((s) => s.id))
  );
  const [isAdding, setIsAdding] = useState(false);

  // If no new suggestions, skip this step
  if (newSuggestions.length === 0) {
    return null;
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addSelectedTags = async () => {
    const selected = newSuggestions.filter((s) => selectedIds.has(s.id));
    if (selected.length === 0) {
      onComplete();
      return;
    }

    setIsAdding(true);
    try {
      // Add tags sequentially to avoid race conditions
      for (const suggestion of selected) {
        await fetch(`/api/contacts/${contactId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: suggestion.text,
            category: suggestion.category.toUpperCase() as TagCategory,
          }),
        });
      }
      onComplete();
    } catch (error) {
      console.error('Failed to add tags:', error);
      onComplete(); // Continue even if some fail
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-gold-primary" />
        <h4 className="text-sm font-semibold text-white">Save as Tags?</h4>
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        These insights can be saved as tags for quick reference later.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {newSuggestions.map((suggestion) => {
          const colors = categoryColors[suggestion.category];
          const isSelected = selectedIds.has(suggestion.id);
          return (
            <button
              key={suggestion.id}
              onClick={() => toggleSelection(suggestion.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                colors.bg,
                colors.text,
                isSelected ? 'border-current' : 'border-transparent opacity-50'
              )}
            >
              {isSelected ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {suggestion.text}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={addSelectedTags}
          disabled={isAdding}
          className="bg-gold-primary hover:bg-gold-light text-black"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : null}
          Add {selectedIds.size} Tag{selectedIds.size !== 1 ? 's' : ''}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSkip}
          disabled={isAdding}
          className="text-zinc-400 hover:text-white"
        >
          Skip
        </Button>
      </div>
    </motion.div>
  );
}
```

**CompletionCelebration.tsx Changes**:

1. Add import:
```typescript
import { BubbleTagSuggestions } from './BubbleTagSuggestions';
```

2. Add props for existing tags:
```typescript
interface CompletionCelebrationProps {
  // ... existing props
  existingTags?: Tag[]; // Add this
}
```

3. Add state for tag step:
```typescript
const [tagStepComplete, setTagStepComplete] = useState(false);
```

4. Insert BubbleTagSuggestions after CompletionSummary, before CTAs:
```typescript
{/* Tag Suggestions from Bubbles */}
{showSummary && !tagStepComplete && (
  <BubbleTagSuggestions
    bubbles={bubbles}
    existingTags={existingTags || []}
    contactId={sourceContactId}
    onComplete={() => setTagStepComplete(true)}
    onSkip={() => setTagStepComplete(true)}
  />
)}

{/* CTAs - Only show after tag step */}
<AnimatePresence>
  {showCTAs && tagStepComplete && (
    // ... existing CTA buttons
  )}
</AnimatePresence>
```

**Acceptance Criteria**:
- [ ] BubbleTagSuggestions appears during completion flow after summary
- [ ] Bubbles that match existing tags are filtered out
- [ ] All suggestions selected by default (checkboxes)
- [ ] User can toggle individual suggestions
- [ ] "Add X Tags" button adds selected tags via API
- [ ] "Skip" button proceeds without adding
- [ ] CTAs only show after tag step is complete
- [ ] Component doesn't render if no new suggestions

---

### Task 2.5: Wire Up Enrichment Session to Pass Tags

**Description**: Update enrichment session page to pass existing tags to CompletionCelebration
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 2.4
**Can run parallel with**: None

**File**: `src/app/(dashboard)/enrichment/session/page.tsx`

**Changes**:

1. Ensure contact fetch includes tags:
```typescript
// When fetching contact, include tags
const contact = await prisma.contact.findUnique({
  where: { id: contactId },
  include: { tags: true },
});
```

2. Pass tags to CompletionCelebration:
```typescript
<CompletionCelebration
  contact={contact}
  previousScore={previousScore}
  newScore={contact.enrichmentScore}
  bubbles={bubbles}
  completionData={completionData}
  notesChangeSummary={notesChangeSummary}
  mentionedPeople={mentionedPeople}
  sourceContactId={contact.id}
  existingTags={contact.tags}  // Add this prop
  onMentionProcessed={handleMentionProcessed}
  onEnrichNext={handleEnrichNext}
  onBackToQueue={() => router.push('/enrichment')}
  onContinueEnriching={handleContinueEnriching}
  saving={saving}
/>
```

**Acceptance Criteria**:
- [ ] Contact fetch includes tags relation
- [ ] existingTags prop passed to CompletionCelebration
- [ ] Tags available for bubble-to-tag filtering

---

## Execution Strategy

### Recommended Order

1. **Start with Phase 1 (all 3 tasks in parallel)**:
   - Task 1.1: getMissingFieldSuggestions
   - Task 1.2: Ranking API
   - Task 1.3: Suggest Tags API

2. **Phase 2 partial parallel**:
   - Task 2.1 + Task 2.2 can run in parallel (once Phase 1 is complete)
   - Task 2.4 can run in parallel with 2.1/2.2 (no dependencies)

3. **Sequential finalization**:
   - Task 2.3 after 2.1 and 2.2
   - Task 2.5 after 2.4

### Dependency Graph

```
Task 1.1 (enrichment.ts) ──┐
                          ├──> Task 2.1 (EnrichmentScoreCard) ──┐
Task 1.2 (ranking API) ───┘                                     ├──> Task 2.3 (Integration)
                                                                │
Task 1.3 (suggest-tags API) ──> Task 2.2 (TagsSection) ─────────┘

Task 2.4 (BubbleTagSuggestions) ──> Task 2.5 (Wire up session)
```

### Testing Checklist

After all tasks complete:
- [ ] Contact details page shows score card with correct colors
- [ ] Ranking displays correctly (test with 1 contact, 10 contacts, 100 contacts)
- [ ] Missing field suggestions show correct fields and points
- [ ] Tags section displays existing tags
- [ ] "Get AI Suggestions" fetches and displays suggestions
- [ ] Adding a suggestion tag works and refreshes the page
- [ ] Enrichment completion shows bubble-to-tag conversion
- [ ] Selected bubbles are added as tags
- [ ] Skipping tag conversion proceeds to CTAs

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GPT-4o-mini rate limits | Low | Medium | Suggestions are on-demand, not auto-fetch |
| Enrichment session complexity | Medium | Medium | BubbleTagSuggestions is isolated component |
| Tag API race conditions | Low | Low | Sequential tag creation in addSelectedTags |

---

## Files Summary

**New Files (5)**:
- `src/app/api/contacts/[id]/ranking/route.ts`
- `src/app/api/contacts/[id]/suggest-tags/route.ts`
- `src/components/contacts/EnrichmentScoreCard.tsx`
- `src/components/contacts/TagsSection.tsx`
- `src/components/enrichment/completion/BubbleTagSuggestions.tsx`

**Modified Files (3)**:
- `src/lib/enrichment.ts` (add getMissingFieldSuggestions)
- `src/components/contacts/ContactDetail.tsx` (integrate new components)
- `src/components/enrichment/completion/CompletionCelebration.tsx` (add tag step)
- `src/app/(dashboard)/enrichment/session/page.tsx` (pass tags prop)
