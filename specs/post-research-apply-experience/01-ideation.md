# Post-Research Apply Experience

**Slug:** post-research-apply-experience
**Author:** Claude Code
**Date:** 2026-01-11
**Branch:** preflight/post-research-apply-experience
**Related:** Contact Deep Research feature

---

## 1) Intent & Assumptions

**Task brief:** After applying research recommendations, enhance the user experience with: (1) enrichment score recalculation and animated display, (2) auto-refresh of updated fields, (3) reusable score improvement animation that fades to static display, (4) brief bullet summary of changes made, (5) collapsed research run summary tile with expandable details, (6) support for multiple research run history as collapsible tiles.

**Assumptions:**
- The existing gamification components (ScoreImprovementBar, NumberTicker) can be reused for post-research celebration
- Research runs should persist as historical records, not be deleted after application
- The contact detail page is the correct location for displaying research history
- A "just applied" state can be tracked via URL params or local state (not persisted to DB)
- Users want to see what changed immediately after applying, then have it collapse

**Out of scope:**
- Changing the research run initiation flow
- Modifying how recommendations are generated or filtered
- Adding new recommendation types
- Notifications or emails about research completion
- Exporting research history

---

## 2) Pre-reading Log

- `src/components/enrichment/completion/CompletionCelebration.tsx`: Main celebration UI with phased animations - score, rank, summary, CTAs. Uses 300ms→3200ms timeline.
- `src/components/enrichment/completion/ScoreImprovementBar.tsx`: Animated progress bar with spring physics (stiffness=50, damping=20). Shows delta badge.
- `src/components/enrichment/completion/NumberTicker.tsx`: Smooth number counting with ease-out quad easing, 1500ms default duration.
- `src/components/contacts/ContactDetail.tsx`: Client component showing profile, EnrichmentScoreCard, TagsSection, ResearchButton, ResearchResultsPanel.
- `src/components/contacts/EnrichmentScoreCard.tsx`: Displays score circle, ranking badge, missing field suggestions, "Enrich Now" button.
- `src/components/research/ResearchResultsPanel.tsx`: Shows research results with summary, full report, recommendation cards, approval/apply workflow.
- `src/app/api/contacts/[id]/research/[runId]/apply/route.ts`: Returns `{ success, appliedCount, contact: { enrichmentScore }, changes[] }`.
- `prisma/schema.prisma`: ContactResearchRun has status, summary, completedAt. ContactRecommendation tracks status (PENDING/APPROVED/REJECTED/APPLIED).
- `src/lib/enrichment.ts`: calculateEnrichmentScore function, max 100 points, whyNow worth 20 points.

---

## 3) Codebase Map

**Primary components/modules:**
- `src/components/contacts/ContactDetail.tsx` - Main contact view, will need state for "just applied" mode
- `src/components/research/ResearchResultsPanel.tsx` - Current research display, needs refactor to support collapsed/expanded modes
- `src/components/enrichment/completion/ScoreImprovementBar.tsx` - Reusable for post-apply animation
- `src/components/enrichment/completion/NumberTicker.tsx` - Reusable for score animation
- `src/app/(dashboard)/contacts/[id]/page.tsx` - Server component, fetches research runs

**Shared dependencies:**
- `src/lib/design-system.ts` - TAG_CATEGORY_COLORS, BRAND_GOLD
- `src/lib/enrichment.ts` - Score calculation
- `framer-motion` - All animations
- `lucide-react` - Icons

**Data flow:**
1. User clicks "Apply" → POST `/api/contacts/[id]/research/[runId]/apply`
2. API returns `{ previousScore, newScore, changes[], appliedCount }`
3. ContactDetail receives response, enters "celebration mode"
4. ScoreImprovementBar animates previous→new
5. Changes summary displays below score
6. After animation completes (3s), fades to static EnrichmentScoreCard
7. ResearchResultsPanel collapses to summary tile

**Feature flags/config:**
- None currently - this is a UI enhancement

**Potential blast radius:**
- ContactDetail.tsx - major changes
- ResearchResultsPanel.tsx - refactor to support collapsed state
- Contact detail page.tsx - may need to fetch all research runs (not just latest)
- Apply API route - may need to return previous score for delta calculation

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

#### Solution A: In-Place Celebration with State Transitions
**Approach:** Add celebration mode state to ContactDetail. After apply, show animated score improvement in place of EnrichmentScoreCard, then fade transition back.

**Pros:**
- Minimal new components needed
- Reuses existing ScoreImprovementBar and NumberTicker
- Natural flow - user stays on same page
- No routing changes needed

**Cons:**
- ContactDetail becomes more complex with multiple display modes
- Need to manage timing/transitions carefully

#### Solution B: Modal Celebration Overlay
**Approach:** Show a full-screen or large modal celebration after applying, similar to enrichment completion flow.

**Pros:**
- Clear visual separation of "celebration" moment
- Can show more information without layout constraints
- Matches existing enrichment completion UX

**Cons:**
- Interrupts user flow
- Extra click to dismiss modal
- May feel heavy for just applying research

#### Solution C: Inline Expansion with History List
**Approach:** Always show research history as a list of collapsible tiles. Latest/active one is expanded by default. After apply, collapse and add "Applied" badge.

**Pros:**
- Consistent UI for all research states
- Natural support for multiple research runs
- No special "celebration" mode needed
- Simpler state management

**Cons:**
- Less celebratory/gamified feel
- Doesn't leverage existing animation components
- May not feel as rewarding

### Recommendation

**Solution A (In-Place Celebration) with elements of Solution C (History List).**

This provides the best balance:
1. Show animated celebration when recommendations are applied (rewarding feedback)
2. After celebration, collapse research results to summary tile
3. Support multiple research runs as a historical list below the current/active one

The celebration should be shorter than the full enrichment completion (which has bubbles, rank, streak, etc.). A focused 3-second animation showing:
- Score improvement animation
- Brief "What was updated" bullets
- Then auto-collapse to summary tile

---

## 6) Clarification

1. **Score animation duration:** Should the post-research score animation be the full 1.5s like enrichment completion, or shorter (e.g., 800ms) since it's inline?
>> same length. prioritize consistency and re-use

2. **Changes summary persistence:** Should the "what changed" bullet summary be stored in the database (on ContactResearchRun or as enrichment logs), or generated on-the-fly from the apply response?
>> stored would be nice so that there is a summary record of changes applied in addition to the other records we save about each respective research run

3. **Research history depth:** How many past research runs should be shown? All of them, or limited (e.g., last 5)?
>> last 5 should be plenty. it will be rare that a contact has that many research runs against tthem until somebody has been using the product for a long time

4. **Collapsed tile content:** What should the collapsed research run tile show?
   - Option A: Just date + status badge
   - Option B: Date + # recommendations + # approved/rejected
   - Option C: Date + brief one-line summary of what changed
   >> all 3 of these combined

5. **Animation trigger:** Should the celebration animation play:
   - Option A: Every time recommendations are applied
   - Option B: Only when score actually improves (skip if no change)
   - Option C: Always, but with different messaging if no score change
   >> option B, but it should be rare that the score doesnt improve at least a little bit

6. **Rank display:** Should we show rank change after research apply (like enrichment completion), or skip rank for simplicity?
>> show it. again, same component, same animation and everything — it just fasdes into the stnadard profile details page enrichment score component a few seconds after the animation finishes (3 seconds after it completes, lets say)

---

## 7) Proposed Implementation Phases

### Phase 1: API Enhancement
- Modify apply route to return `previousScore` alongside `newScore`
- Return structured `changes` array with field names and actions

### Phase 2: Celebration Components
- Create `ResearchApplyCelebration` component (lighter than CompletionCelebration)
- Reuse `ScoreImprovementBar` and `NumberTicker`
- Add `ChangesSummary` component for bullet list

### Phase 3: Research History Tiles
- Create `ResearchRunTile` component (collapsed summary view)
- Create `ResearchRunHistory` component (list of tiles)
- Refactor `ResearchResultsPanel` to support expanded/collapsed modes

### Phase 4: ContactDetail Integration
- Add `celebrationMode` state to ContactDetail
- Handle apply response to trigger celebration
- Auto-transition from celebration to collapsed tile after animation
- Fetch all research runs (not just latest) for history display

### Phase 5: Polish
- Animation timing refinement
- Mobile responsiveness
- Loading states
- Error handling for failed applies

---

## 8) Technical Notes

### State Machine for Research Display
```
IDLE (no research)
  → RUNNING (research in progress)
  → REVIEWING (recommendations shown, pending approval)
  → APPLYING (apply in progress)
  → CELEBRATING (score animation playing)
  → COLLAPSED (summary tile view)
```

### Data Structure for Changes Summary
```typescript
interface AppliedChange {
  fieldName: string;
  action: 'ADD' | 'UPDATE';
  displayLabel: string; // "Organizational role added", "Expertise updated"
}
```

### Animation Timeline (Proposed)
- 0ms: Apply button clicked, enter APPLYING state
- 200ms: API response received, enter CELEBRATING
- 200-1200ms: Score animates from previous to new
- 1200-1700ms: Changes summary fades in
- 3000ms: Auto-transition to COLLAPSED state
- 3000-3500ms: Celebration fades out, tile fades in
