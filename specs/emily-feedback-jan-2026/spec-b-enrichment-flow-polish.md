# Spec B: Enrichment Flow Polish

**Status:** Implemented
**Completed:** 2026-01-02
**Priority:** 2 (after bug fixes)
**Feedback Items:** 3, 4, 6, 9, 15
**Estimated Effort:** 5-6 hours

---

## Problem Statement

The enrichment workflow has friction points that slow users down:
1. No search in enrichment queue - users can't find specific contacts to enrich
2. "Enrich" action is buried in a dropdown menu on contact detail
3. Tags extracted during enrichment can't be edited before saving
4. No way to continue enriching the same contact after completion
5. Relationship strength labels are vague without context

---

## Success Criteria

- [x] Users can search/filter the enrichment queue by name, email, or company
- [x] Contact detail page has prominent "Edit" and "Enrich" buttons side-by-side
- [x] Tags can be edited (text, category) or deleted during enrichment before save
- [x] "Continue Enriching" button available after enrichment completion
- [x] Relationship strength indicators include descriptive tooltips

---

## Prerequisites

Before implementing this spec:
```bash
# Install shadcn/ui tooltip component (required for Section 5)
npx shadcn-ui@latest add tooltip
```

---

## Detailed Requirements

### 1. Search Bar in Enrichment Queue

**Location:** `src/app/(dashboard)/enrichment/page.tsx`

**Current state:** Queue shows contacts in priority order with filter tabs (all/high/medium/low) but no search capability.

**Required changes:**
1. Add search input above the filter tabs
2. Filter queue by firstName, lastName, primaryEmail, or company
3. Preserve priority ordering within search results
4. Show "No results" state when search matches nothing

**Implementation approach:**
```tsx
// Add state (after line 372)
const [searchQuery, setSearchQuery] = useState('');

// Add filter logic (update filteredQueue around line 432)
const filteredQueue = queue.filter((contact) => {
  // Apply priority filter
  const matchesPriority = activeFilter === "all" || contact.priorityLevel === activeFilter;

  // Apply search filter
  const searchLower = searchQuery.toLowerCase();
  const matchesSearch = !searchQuery ||
    getDisplayName(contact).toLowerCase().includes(searchLower) ||
    (contact.primaryEmail?.toLowerCase().includes(searchLower)) ||
    (contact.company?.toLowerCase().includes(searchLower));

  return matchesPriority && matchesSearch;
});

// Add search input UI (before FilterTabs, around line 479)
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
  <Input
    placeholder="Search by name, email, or company..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery('')}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
    >
      <X size={14} />
    </button>
  )}
</div>
```

**Imports needed:** `Search`, `X` from lucide-react (Search already imported)

**Empty state (add after queue list render):**
```tsx
{filteredQueue.length === 0 && searchQuery && (
  <div className="text-center py-12">
    <p className="text-zinc-400 mb-2">No contacts match "{searchQuery}"</p>
    <button
      onClick={() => setSearchQuery('')}
      className="text-[#C9A227] hover:text-[#E5C766] text-sm"
    >
      Clear search
    </button>
  </div>
)}
```

### 2. Prominent Edit + Enrich Buttons

**Location:** `src/components/contacts/ContactDetail.tsx` (lines 135-168)

**Current state:**
- "Edit" button is visible in header
- "Quick Enrich" is buried in "More" dropdown menu

**Required changes:**
1. Add "Enrich" button next to "Edit" button
2. Use gold accent color for "Enrich" to emphasize it
3. Keep "More" dropdown for secondary actions (Draft Intro, Delete)

**Implementation (replace lines 135-168):**
```tsx
<div className="flex gap-2">
  <Button variant="outline" asChild>
    <Link href={`/contacts/${contact.id}/edit`}>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </Link>
  </Button>
  <Button
    className="bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
    asChild
  >
    <Link href={`/enrichment/session?contact=${contact.id}`}>
      <Sparkles className="mr-2 h-4 w-4" />
      Enrich
    </Link>
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>
        <Mail className="mr-2 h-4 w-4" />
        Draft Intro
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### 3. Editable Tags Before Save

**Location:** `src/app/(dashboard)/enrichment/session/page.tsx` and `src/components/enrichment/EnrichmentBubbles.tsx`

**Current state:** Tags display as read-only bubbles during enrichment. Users can't fix AI mistakes before saving.

**Required changes:**
1. Create new `EditableBubble` component with:
   - Click to edit text inline
   - Category dropdown on click
   - X button to delete
2. Update `EnrichmentBubbles` to accept `editable` prop
3. Track bubble edits in session page state

**New component: `src/components/enrichment/EditableBubble.tsx`**
```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnrichmentBubble, BubbleCategory } from "./EnrichmentBubbles";

const categoryStyles: Record<BubbleCategory, { bg: string; text: string; border: string }> = {
  relationship: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  opportunity: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  expertise: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  interest: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
};

const categoryDots: Record<BubbleCategory, string> = {
  relationship: "bg-blue-400",
  opportunity: "bg-green-400",
  expertise: "bg-purple-400",
  interest: "bg-amber-400",
};

const categoryLabels: Record<BubbleCategory, string> = {
  relationship: "Relationship",
  opportunity: "Opportunity",
  expertise: "Expertise",
  interest: "Interest",
};

interface EditableBubbleProps {
  bubble: EnrichmentBubble;
  index: number;
  onUpdate: (id: string, updates: Partial<EnrichmentBubble>) => void;
  onDelete: (id: string) => void;
}

export function EditableBubble({ bubble, index, onUpdate, onDelete }: EditableBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(bubble.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const styles = categoryStyles[bubble.category];
  const dotColor = categoryDots[bubble.category];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() && editText !== bubble.text) {
      onUpdate(bubble.id, { text: editText.trim() });
    } else {
      setEditText(bubble.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditText(bubble.text);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.08 }}
      className="group relative"
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer",
          styles.bg, styles.text, styles.border,
          "hover:ring-2 hover:ring-white/20"
        )}
      >
        {/* Category dot - clickable to change category */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-1.5 h-1.5 rounded-full hover:ring-2 hover:ring-white/30", dotColor)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
            {(Object.keys(categoryLabels) as BubbleCategory[]).map((cat) => (
              <DropdownMenuItem
                key={cat}
                onClick={() => onUpdate(bubble.id, { category: cat })}
                className={cn(bubble.category === cat && "bg-zinc-800")}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2", categoryDots[cat])} />
                {categoryLabels[cat]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text - click to edit */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none w-24 text-inherit"
          />
        ) : (
          <span onClick={() => setIsEditing(true)}>{bubble.text}</span>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(bubble.id); }}
          className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-400 transition-opacity"
        >
          <X size={12} />
        </button>
      </span>
    </motion.div>
  );
}
```

**Update EnrichmentBubbles.tsx:**
```tsx
// Add to existing exports
export { EditableBubble } from "./EditableBubble";

// Update EnrichmentBubblesProps
interface EnrichmentBubblesProps {
  bubbles: EnrichmentBubble[];
  editable?: boolean;
  onUpdate?: (id: string, updates: Partial<EnrichmentBubble>) => void;
  onDelete?: (id: string) => void;
}

// Update component to conditionally render EditableBubble
export function EnrichmentBubbles({ bubbles, editable, onUpdate, onDelete }: EnrichmentBubblesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <AnimatePresence mode="popLayout">
        {bubbles.map((bubble, index) =>
          editable && onUpdate && onDelete ? (
            <EditableBubble
              key={bubble.id}
              bubble={bubble}
              index={index}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ) : (
            <Bubble key={bubble.id} bubble={bubble} index={index} />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Update enrichment session page:**
```tsx
// Add handlers (after setBubbles declaration)
const handleUpdateBubble = (id: string, updates: Partial<EnrichmentBubble>) => {
  setBubbles(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
};

const handleDeleteBubble = (id: string) => {
  setBubbles(prev => prev.filter(b => b.id !== id));
};

// Update EnrichmentBubbles usage (around line 886)
<EnrichmentBubbles
  bubbles={bubbles}
  editable
  onUpdate={handleUpdateBubble}
  onDelete={handleDeleteBubble}
/>
```

### 4. "Continue Enriching" Button

**Location:** `src/components/enrichment/completion/CompletionCelebration.tsx` (lines 235-268)

**Current state:** Shows "Enrich Next Contact" and "Back to Queue" after completion. No option to continue enriching the same contact.

**Required changes:**
1. Add prop for continue same contact handler
2. Add "Continue Enriching This Contact" button between existing CTAs
3. Use outline style to differentiate from primary action

**Implementation:**

Update props interface:
```tsx
interface CompletionCelebrationProps {
  // ... existing props
  onContinueEnriching?: () => void; // New prop
}
```

Update component signature:
```tsx
export function CompletionCelebration({
  // ... existing props
  onContinueEnriching,
}: CompletionCelebrationProps) {
```

Update CTAs section (replace lines 235-268):
```tsx
{/* CTAs */}
<AnimatePresence>
  {showCTAs && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Button
        size="lg"
        className="w-full bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold"
        onClick={onEnrichNext}
        disabled={saving}
      >
        {saving ? (
          "Saving..."
        ) : (
          <>
            <Sparkles size={16} />
            Enrich Next Contact
          </>
        )}
      </Button>

      {onContinueEnriching && (
        <Button
          size="lg"
          variant="outline"
          className="w-full border-zinc-600 text-white hover:bg-zinc-800"
          onClick={onContinueEnriching}
          disabled={saving}
        >
          <Plus size={16} />
          Continue Enriching {contact.firstName}
        </Button>
      )}

      <button
        onClick={onBackToQueue}
        className="w-full text-center text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors flex items-center justify-center gap-1"
      >
        <ChevronLeft size={14} />
        Back to Queue
      </button>
    </motion.div>
  )}
</AnimatePresence>
```

**Add import:** `Plus` from lucide-react

**Update session page to pass handler:**
```tsx
// Add handler (after other handlers)
const handleContinueEnriching = () => {
  // Reset to enrichment state, keeping existing data
  setSessionComplete(false);  // Uses existing state from line 180
  // Clear transcript for new input
  resetTranscript();
};

// Pass to CompletionCelebration (around line 741)
<CompletionCelebration
  contact={contact}
  previousScore={previousScore}
  newScore={contact.enrichmentScore}
  bubbles={bubbles}
  completionData={completionData}
  notesChangeSummary={notesChangeSummary}
  mentionedPeople={mentionedPeople}
  sourceContactId={contact.id}
  onMentionProcessed={handleMentionProcessed}
  onEnrichNext={handleEnrichNext}
  onBackToQueue={() => router.push("/enrichment")}
  onContinueEnriching={handleContinueEnriching}  // Add this prop
  saving={saving}
/>
```

### 5. Relationship Strength Descriptions

**Location:** `src/components/contacts/ContactDetail.tsx`

**Current state:** Shows 4 dots with labels "Weak, Casual, Good, Strong" but no explanation of what each level means.

**Required changes:**
1. Add tooltip component to each strength indicator
2. Show contextual description on hover/focus
3. Make descriptions actionable and clear

**Strength descriptions:**
```typescript
const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};
```

**Implementation:**

First, check if Tooltip component exists or create one. Then update the relationship strength section:

```tsx
// Add to imports
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Add descriptions constant (after strengthLabels)
const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};

// Update relationship strength display (find and update the section)
<div className="flex items-center gap-2">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-2 w-2 rounded-full",
                level <= contact.relationshipStrength
                  ? "bg-gold-primary"
                  : "bg-zinc-700"
              )}
            />
          ))}
          <span className="ml-2 text-sm text-text-secondary">
            {strengthLabels[contact.relationshipStrength]}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p>{strengthDescriptions[contact.relationshipStrength]}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(dashboard)/enrichment/page.tsx` | Add search input, filter logic |
| `src/components/contacts/ContactDetail.tsx` | Button layout, relationship tooltips |
| `src/components/enrichment/EnrichmentBubbles.tsx` | Add editable mode support |
| NEW: `src/components/enrichment/EditableBubble.tsx` | Editable tag component |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Bubble edit handlers, continue handler |
| `src/components/enrichment/completion/CompletionCelebration.tsx` | Continue button |

---

## API Considerations

No API changes required. All changes are client-side UI improvements.

---

## Testing Checklist

### Enrichment Queue Search
- [ ] Search filters by first name
- [ ] Search filters by last name
- [ ] Search filters by email
- [ ] Search filters by company
- [ ] Search + priority filter work together
- [ ] Clear button resets search
- [ ] Empty search shows full queue
- [ ] "No results" state displays correctly

### Edit + Enrich Buttons
- [ ] Both buttons visible on contact detail
- [ ] Edit navigates to edit page
- [ ] Enrich navigates to enrichment session
- [ ] Enrich button has gold styling
- [ ] More menu still works (Draft Intro, Delete)

### Editable Tags
- [ ] Click tag text to edit inline
- [ ] Enter saves edit
- [ ] Escape cancels edit
- [ ] Click category dot opens category dropdown
- [ ] Category change updates bubble color
- [ ] X button deletes tag
- [ ] Deleted tags don't appear in saved data
- [ ] Edited tags reflect in saved data

### Continue Enriching
- [ ] Button appears after enrichment completion
- [ ] Clicking returns to enrichment mode for same contact
- [ ] Previous data is preserved
- [ ] Transcript is cleared for new input
- [ ] Can complete multiple enrichment sessions

### Relationship Descriptions
- [ ] Tooltip appears on hover over strength indicator
- [ ] Each level shows correct description
- [ ] Tooltip is readable and well-positioned
- [ ] Works on touch devices (tap to show)

---

## Design Notes

- Search input should match existing UI patterns (see ContactsTable search)
- "Enrich" button uses gold accent (`bg-gold-primary`) to stand out
- Tag editing should feel lightweight - no modals, inline editing only
- "Continue Enriching" is secondary action - outline style, not gold
- Relationship tooltips should be brief but descriptive

---

## Open Questions (Resolved)

1. **Should tag editing show original AI extraction vs. user edits?**
   Decision: No, keep it simple. Just track current state. Users don't need to see "AI suggested X, you changed to Y".

2. **Should "Continue Enriching" add to existing notes or start fresh?**
   Decision: Start with fresh transcript input, but existing enrichment data is preserved. New input gets merged/appended.

3. **Where should relationship descriptions appear?**
   Decision: Tooltip on hover. Doesn't clutter the UI, available on demand.

---

## Implementation Order

1. Search bar in enrichment queue (1 hour) - independent, no dependencies
2. Edit/Enrich buttons (30 min) - simple layout change
3. Relationship descriptions (30 min) - simple tooltip addition
4. Continue enriching button (30 min) - straightforward prop/handler addition
5. Editable tags (2-3 hours) - most complex, new component needed

**Parallel opportunity:** Items 1, 2, 3 can be done in parallel as they touch different files.

---

## Rollback Plan

All changes are UI-only with no database or API modifications:
1. Revert search input in enrichment page
2. Revert button layout in ContactDetail
3. Remove EditableBubble component
4. Revert CompletionCelebration CTAs
5. Remove tooltip from relationship indicator

No migrations, no breaking changes.
