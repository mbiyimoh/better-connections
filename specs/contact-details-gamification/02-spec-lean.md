# Contact Details Page Gamification Enhancement

## Status
Draft

## Authors
Claude | 2026-01-04

---

## Overview

Bring gamification elements from the enrichment completion experience to the contact details page. Display enrichment scores prominently with rankings and improvement suggestions, auto-convert enrichment "bubbles" to tags, show tags on the details page, and provide AI-powered tag suggestions.

## Problem Statement

The contact details page feels static and disconnected from the gamified enrichment experience. Users:
1. Can't see their contact's ranking or how they compare to others
2. Don't know what information to add next to improve the contact's score
3. Must navigate to the edit page just to see tags
4. Don't get intelligent tag suggestions based on available contact data
5. Lose the valuable insights extracted as "bubbles" during enrichment because they aren't persisted as tags

## Goals

- Display enrichment score prominently with ranking among all contacts
- Show actionable suggestions for improving a contact's score (missing fields + point values)
- Display tags on the contact details page (currently only on edit page)
- Auto-convert enrichment bubbles to suggested tags post-enrichment
- Provide AI-powered tag suggestions based on existing contact data

## Non-Goals

- Animated score bar (static display is sufficient for details page)
- Sound effects on the details page
- Weekly streak display on details page
- Real-time score recalculation as user views page
- Tag management (add/remove) directly from details page (edit page handles this)
- Bulk tag suggestions across multiple contacts

---

## Technical Approach

### Key Files to Modify/Create

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/components/contacts/ContactDetail.tsx` | Modify | Add EnrichmentScoreCard and TagsSection |
| `src/components/contacts/EnrichmentScoreCard.tsx` | Create | Score display with ranking and suggestions |
| `src/components/contacts/TagsSection.tsx` | Create | Tags display with AI suggestion integration |
| `src/app/api/contacts/[id]/suggest-tags/route.ts` | Create | AI-powered tag suggestion endpoint |
| `src/app/api/contacts/[id]/ranking/route.ts` | Create | Fetch contact ranking among all contacts |
| `src/lib/enrichment.ts` | Modify | Add `getMissingFieldSuggestions()` function |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Modify | Add bubble-to-tag conversion in completion flow |

### Integration Points

1. **ContactDetail.tsx**: Insert new components between profile header and "Why Now" section
2. **Enrichment Session**: Add tag suggestion step after bubbles are generated, before save
3. **Tags API**: Use existing `POST /api/contacts/[id]/tags` for accepting suggestions

---

## Implementation Details

### 1. EnrichmentScoreCard Component

Display score, ranking, and improvement suggestions in a visually prominent card.

```typescript
// src/components/contacts/EnrichmentScoreCard.tsx

interface EnrichmentScoreCardProps {
  contact: Contact;
  ranking: { currentRank: number; totalContacts: number } | null;
}

// Renders:
// - Large score number with color-coded background (red/orange/amber/green)
// - Ranking badge: "Ranked #5 of 127 contacts"
// - "Improve Your Score" section with missing fields in priority order
```

**Score color thresholds** (reuse from ScoreImprovementBar):
- 0-25: Red (`#EF4444`)
- 26-50: Orange (`#F97316`)
- 51-75: Amber (`#F59E0B`)
- 76-100: Green (`#22C55E`)

**Missing field suggestions** (sorted by point value):
```typescript
// lib/enrichment.ts - add this function
export function getMissingFieldSuggestions(contact: EnrichmentScoreInput): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];

  if (!contact.whyNow) suggestions.push({ field: 'whyNow', label: 'Why Now', points: 20 });
  if (!contact.howWeMet) suggestions.push({ field: 'howWeMet', label: 'How We Met', points: 15 });
  if (!contact.title) suggestions.push({ field: 'title', label: 'Job Title', points: 10 });
  if (!contact.company) suggestions.push({ field: 'company', label: 'Company', points: 10 });
  // ... etc, sorted by points descending

  return suggestions.slice(0, 3); // Top 3 suggestions only
}
```

### 2. TagsSection Component

Display existing tags and AI-suggested tags.

```typescript
// src/components/contacts/TagsSection.tsx

interface TagsSectionProps {
  contact: Contact;
  onTagAdded?: () => void; // Trigger refresh after adding
}

// Renders:
// - "Tags" header
// - Existing tags with category colors (reuse categoryColors from ContactDetail)
// - "Suggested Tags" sub-section (fetched on-demand via button click)
// - Each suggestion has "Add" button that calls POST /api/contacts/[id]/tags
```

**AI Suggestion Behavior:**
- Don't auto-fetch on page load (avoid unnecessary API calls)
- Show "Get AI Suggestions" button
- Clicking fetches from `/api/contacts/[id]/suggest-tags`
- Display suggestions with "Add" buttons
- Filter out tags that already exist on the contact

### 3. AI Tag Suggestion API

```typescript
// src/app/api/contacts/[id]/suggest-tags/route.ts

// Uses existing TAG_SUGGESTION_SYSTEM_PROMPT from lib/openai.ts
// Input: Contact data (name, title, company, expertise, interests, notes, howWeMet, whyNow)
// Output: Array of { text: string, category: TagCategory }[]

// Zod schema for response
const tagSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string().max(50),
    category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']),
  })).max(5),
});
```

### 4. Contact Ranking API

```typescript
// src/app/api/contacts/[id]/ranking/route.ts

// Returns: { currentRank: number, totalContacts: number }
// Reuses logic from /api/enrichment/completion-data but simpler (no streak/delta)
```

### 5. Bubble-to-Tag Conversion (Post-Enrichment)

In the enrichment completion flow, after bubbles are generated but before the celebration screen:

```typescript
// In enrichment/session/page.tsx completion flow

// Convert bubbles to tag suggestions
const tagSuggestionsFromBubbles = bubbles.map(bubble => ({
  text: bubble.text,
  category: bubble.category.toUpperCase() as TagCategory, // 'relationship' -> 'RELATIONSHIP'
}));

// Filter out duplicates against existing tags
const existingTagTexts = contact.tags.map(t => t.text.toLowerCase());
const newSuggestions = tagSuggestionsFromBubbles.filter(
  s => !existingTagTexts.includes(s.text.toLowerCase())
);

// Present to user for acceptance (checkbox list or accept-all button)
// On accept, POST each to /api/contacts/[id]/tags
```

**UI for tag acceptance:**
- Show suggested tags with checkboxes (all checked by default)
- "Add Selected Tags" button
- "Skip" link to proceed without adding

---

## Data Flow

```
ContactDetail Page Load
├── Fetch contact (existing)
├── Fetch ranking from /api/contacts/[id]/ranking
└── Render EnrichmentScoreCard + TagsSection

User Clicks "Get AI Suggestions"
├── POST /api/contacts/[id]/suggest-tags
├── Filter suggestions against existing tags
└── Display suggestions with "Add" buttons

User Clicks "Add" on Suggestion
├── POST /api/contacts/[id]/tags
├── Refresh contact data
└── Re-render tags display

Enrichment Completion
├── Generate bubbles (existing)
├── Convert bubbles to tag suggestions
├── Present tag acceptance UI
├── User selects tags to add
├── POST selected tags to /api/contacts/[id]/tags
└── Continue to celebration screen
```

---

## Testing Approach

### Key Scenarios to Validate

1. **Score Display**: Score shows correctly with appropriate color for each threshold
2. **Ranking**: Ranking displays correctly for contacts with various scores
3. **Suggestions**: Missing field suggestions appear in correct priority order
4. **Tags Display**: Existing tags render with correct category colors
5. **AI Suggestions**: Suggestions fetch successfully and filter out duplicates
6. **Add Tag**: Clicking "Add" on a suggestion creates the tag and updates display
7. **Bubble Conversion**: Enrichment bubbles convert to tags when accepted

### Edge Cases

- Contact with 100% score (no suggestions to show)
- Contact with 0 tags (empty state for tags section)
- Contact with no enrichable data (AI returns empty suggestions)
- Only 1 contact in database (ranking shows "#1 of 1")

---

## Open Questions

1. **Tag acceptance in enrichment flow**: Should this be a modal, inline section, or separate step?
   - Recommendation: Inline section between completion summary and CTAs

2. **Should AI suggestions be cached?**
   - Recommendation: No caching for V1; suggestions depend on current contact state

---

## Future Improvements and Enhancements

**Out of scope for initial implementation:**

- **Animated score display**: Could add spring animation like completion celebration
- **Score history chart**: Show how score has changed over time
- **Tag analytics**: Show most common tags across all contacts
- **Smart tag merging**: AI-powered deduplication of similar tags ("VC" vs "Venture Capitalist")
- **Tag suggestions from network**: Suggest tags based on what similar contacts have
- **Bulk enrichment suggestions**: "These 5 contacts could use title/company info"
- **Ranking trends**: "Moved from #15 to #5 this month"
- **Tag categories filter**: Filter contacts by tag category from details page
- **Tag editing inline**: Edit tag text/category without going to edit page
- **Confidence scores**: Show AI confidence on each tag suggestion
- **Auto-accept high-confidence tags**: Skip confirmation for very confident suggestions

---

## References

- Existing gamification spec: `specs/enrichment-completion-gamification/02-spec.md`
- Tag suggestion prompt: `src/lib/openai.ts` (TAG_SUGGESTION_SYSTEM_PROMPT)
- Score calculation: `src/lib/enrichment.ts` (calculateEnrichmentScore)
- Contact detail component: `src/components/contacts/ContactDetail.tsx`
- Enrichment session: `src/app/(dashboard)/enrichment/session/page.tsx`
