# Spec C: Tag Editing & Category Education

**Slug:** tag-improvements
**Author:** Claude Code
**Date:** 2026-01-08
**Priority:** P1 (UX) + P2 (Enhancement)
**Estimated Effort:** 3-4 hours

---

## Problems

1. **Tag text editing**: Users cannot edit AI-suggested tag text before adding (e.g., fix typos or wording)
2. **Tag categorization**: "Interest in fintech" gets tagged as EXPERTISE instead of INTEREST because the AI doesn't distinguish between "interest IN [topic]" (professional) vs personal hobbies
3. **User education**: Users don't understand what each category means, leading to confusion

## Solutions

### Part 1: Tag Editing UI

Add inline editing to BubbleTagSuggestions with ability to edit both text and category.

### Part 2: Prompt Improvement

Enhance TAG_SUGGESTION_SYSTEM_PROMPT with clearer disambiguation.

### Part 3: Category Education

Add tooltips explaining each category in the tag suggestion UI.

---

## Part 1: Tag Editing UI

### User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  ◇ Save as Tags                           Select all │ None    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ☑ ● Works at Visa in strategic relations         [✎]          │
│      └─ Purple chip (EXPERTISE)                                  │
│                                                                  │
│  ☑ ● Interest and expertise in fintech AI        [✎]          │
│      └─ Purple chip (EXPERTISE) ← User wants INTEREST            │
│                                                                  │
│  When [✎] clicked:                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Edit Tag                                              [×] │  │
│  │                                                            │  │
│  │  Text:                                                     │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │ Interest and expertise in fintech AI                 │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  │  Category:                                                 │  │
│  │  ○ Relationship  ○ Opportunity  ● Expertise  ○ Interest   │  │
│  │    ⓘ How you     ⓘ Business     ⓘ Their      ⓘ Personal   │  │
│  │      know them     potential      skills       hobbies    │  │
│  │                                                            │  │
│  │                              [Cancel]  [Save Changes]      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  6 of 6 selected                              [+ Add Selected]   │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

#### File: `src/components/enrichment/completion/BubbleTagSuggestions.tsx`

**Add state for editing:**

```tsx
const [editingTag, setEditingTag] = useState<{
  bubbleId: string;
  text: string;
  category: TagCategory;
} | null>(null);
```

**Add edit button to each tag row (around line 200):**

```tsx
<div className="flex items-center justify-between">
  <label className="flex items-center gap-3 flex-1">
    <Checkbox ... />
    <span className={cn(...)}>{suggestion.text}</span>
  </label>
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      setEditingTag({
        bubbleId: suggestion.bubbleId,
        text: suggestion.text,
        category: suggestion.category,
      });
    }}
    className="h-8 w-8 p-0 text-text-tertiary hover:text-text-primary"
  >
    <Pencil className="h-4 w-4" />
  </Button>
</div>
```

**Add edit modal:**

```tsx
{editingTag && (
  <TagEditModal
    isOpen={!!editingTag}
    onClose={() => setEditingTag(null)}
    initialText={editingTag.text}
    initialCategory={editingTag.category}
    onSave={(newText, newCategory) => {
      // Update the suggestion in local state
      setSuggestions(prev =>
        prev.map(s =>
          s.bubbleId === editingTag.bubbleId
            ? { ...s, text: newText, category: newCategory }
            : s
        )
      );
      setEditingTag(null);
    }}
  />
)}
```

#### New File: `src/components/enrichment/completion/TagEditModal.tsx`

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { TAG_CATEGORY_COLORS, type TagCategory } from '@/lib/design-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  initialCategory: TagCategory;
  onSave: (text: string, category: TagCategory) => void;
}

const CATEGORY_DESCRIPTIONS: Record<TagCategory, { label: string; description: string }> = {
  RELATIONSHIP: {
    label: 'Relationship',
    description: 'How you know this person (e.g., "met at conference", "former colleague")',
  },
  OPPORTUNITY: {
    label: 'Opportunity',
    description: 'Business potential or why to reach out now (e.g., "potential investor", "hiring")',
  },
  EXPERTISE: {
    label: 'Expertise',
    description: 'Their professional skills and domain knowledge (e.g., "marketing expert", "fintech background")',
  },
  INTEREST: {
    label: 'Interest',
    description: 'Personal hobbies and passions outside of work (e.g., "hiking", "wine collecting")',
  },
};

export function TagEditModal({
  isOpen,
  onClose,
  initialText,
  initialCategory,
  onSave,
}: TagEditModalProps) {
  const [text, setText] = useState(initialText);
  const [category, setCategory] = useState<TagCategory>(initialCategory);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), category);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-bg-secondary border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Edit Tag</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="tag-text" className="text-text-secondary">
              Tag Text
            </Label>
            <Input
              id="tag-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-bg-tertiary border-border text-text-primary"
              maxLength={50}
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-text-secondary">Category</Label>
            <TooltipProvider>
              <RadioGroup
                value={category}
                onValueChange={(v) => setCategory(v as TagCategory)}
                className="grid grid-cols-2 gap-3"
              >
                {(Object.keys(CATEGORY_DESCRIPTIONS) as TagCategory[]).map((cat) => {
                  const colors = TAG_CATEGORY_COLORS[cat];
                  const { label, description } = CATEGORY_DESCRIPTIONS[cat];

                  return (
                    <div key={cat} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={cat}
                        id={cat}
                        className={cn(
                          'border-2',
                          category === cat && colors.border
                        )}
                      />
                      <Label
                        htmlFor={cat}
                        className={cn(
                          'flex items-center gap-1.5 cursor-pointer text-sm',
                          category === cat ? colors.text : 'text-text-secondary'
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
                        {label}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-text-tertiary" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </TooltipProvider>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="bg-gold-primary hover:bg-gold-light text-black"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part 2: Prompt Improvement

### File: `src/lib/openai.ts`

**Update TAG_SUGGESTION_SYSTEM_PROMPT (lines 55-63):**

```typescript
export const TAG_SUGGESTION_SYSTEM_PROMPT = `Based on the contact information provided, suggest relevant tags.

Categories available:
- RELATIONSHIP: How you know them (e.g., "met at conference", "mutual connection via Sarah", "former colleague")
- OPPORTUNITY: Business potential or reasons to reach out (e.g., "potential investor", "partnership lead", "hiring for my role")
- EXPERTISE: Their professional skills, job role, and domain knowledge (e.g., "marketing expert", "fintech background", "AI/ML specialist")
  NOTE: "Interest in [professional topic]" indicates expertise, not personal interest
- INTEREST: Personal hobbies and passions OUTSIDE of work (e.g., "hiking", "board games", "wine collecting", "photography")
  NOTE: Only use INTEREST for non-professional activities and hobbies

Examples:
- "Interest in fintech and AI" → EXPERTISE (professional domain interest)
- "Enjoys hiking on weekends" → INTEREST (personal hobby)
- "Passionate about sustainable investing" → Could be EXPERTISE (if work-related) or INTEREST (if personal cause)

Return a JSON array of objects with "text" and "category" fields.
Limit to 5 most relevant tags.`;
```

---

## Part 3: Category Education in UI

### File: `src/components/enrichment/completion/BubbleTagSuggestions.tsx`

**Add category legend with tooltips at the top of the suggestions section:**

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

// Inside the component, after the header:
<div className="px-4 py-2 border-b border-border">
  <p className="text-xs text-text-tertiary mb-2">Tag Categories:</p>
  <TooltipProvider>
    <div className="flex flex-wrap gap-2">
      {(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST'] as const).map((cat) => {
        const colors = TAG_CATEGORY_COLORS[cat];
        const descriptions = {
          RELATIONSHIP: 'How you know them',
          OPPORTUNITY: 'Business potential',
          EXPERTISE: 'Professional skills',
          INTEREST: 'Personal hobbies',
        };
        return (
          <Tooltip key={cat}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-help',
                  colors.bg,
                  colors.text
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                {cat.toLowerCase()}
                <Info className="h-3 w-3 opacity-60" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{descriptions[cat]}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  </TooltipProvider>
</div>
```

---

## Testing

### Tag Editing
1. Complete an enrichment session with AI-generated tags
2. Click edit icon on a tag → modal opens
3. Edit text → verify it updates in the list
4. Change category → verify color changes
5. Add edited tags → verify correct text and category saved

### Prompt Improvement
1. Enrich a contact with voice saying "interested in fintech and AI"
2. Verify tag is categorized as EXPERTISE (purple), not INTEREST (amber)
3. Enrich with "enjoys hiking on weekends" → should be INTEREST (amber)

### Category Education
1. Open tag suggestions UI
2. Verify category legend is visible at top
3. Hover over each category → tooltip shows description
4. In edit modal, verify tooltip shows on each category option

## Files Changed

- `src/components/enrichment/completion/BubbleTagSuggestions.tsx` (add edit button, modal trigger, category legend)
- `src/components/enrichment/completion/TagEditModal.tsx` (new file)
- `src/lib/openai.ts` (update TAG_SUGGESTION_SYSTEM_PROMPT)

## Rollback

Revert file changes. No database or schema changes.
