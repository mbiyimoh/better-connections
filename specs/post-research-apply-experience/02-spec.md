# Post-Research Apply Experience - Specification

**Slug:** post-research-apply-experience
**Author:** Claude Code
**Date:** 2026-01-11
**Status:** Draft
**Related:** [01-ideation.md](./01-ideation.md)

---

## Overview

Enhance the post-apply experience when research recommendations are applied to a contact profile. The system will show an animated celebration (reusing existing gamification components), display a summary of changes, then collapse research results into a historical tile view supporting multiple research runs over time.

---

## User Decisions (from Ideation)

| Question | Decision |
|----------|----------|
| Animation duration | 1.5s - same as enrichment completion for consistency |
| Changes summary | Stored in database on ContactResearchRun |
| History depth | Last 5 research runs |
| Collapsed tile content | Date + status + recommendation stats + one-line summary |
| Animation trigger | Only when score improves (Option B) |
| Rank display | Yes, show rank change with same components as enrichment |

---

## Functional Requirements

### FR-1: Enrichment Score Recalculation
- **FR-1.1:** After applying recommendations, recalculate the contact's enrichment score
- **FR-1.2:** API must return both `previousScore` and `newScore` in the apply response
- **FR-1.3:** Score recalculation uses existing `calculateEnrichmentScore()` from `src/lib/enrichment.ts`

### FR-2: Animated Score Celebration
- **FR-2.1:** Reuse `ScoreImprovementBar` component with 1.5s animation duration
- **FR-2.2:** Reuse `NumberTicker` component for score count-up
- **FR-2.3:** Animation only plays if `newScore > previousScore`
- **FR-2.4:** If no score improvement, skip celebration and go directly to collapsed state
- **FR-2.5:** Show rank change using `RankCelebration` component (rank fetched from existing API)

### FR-3: Changes Summary
- **FR-3.1:** Display bullet list of what was updated (e.g., "Organizational role added", "Expertise updated")
- **FR-3.2:** Store `appliedChangesSummary` field on `ContactResearchRun` model
- **FR-3.3:** Summary persists for historical reference
- **FR-3.4:** Summary appears below score animation during celebration
- **FR-3.5:** Format: `"{action} {fieldLabel}"` (e.g., "Added organizational title", "Updated expertise")

### FR-4: Auto-Transition to Static View
- **FR-4.1:** After animation completes + 3 seconds, fade out celebration
- **FR-4.2:** Fade in standard `EnrichmentScoreCard` component
- **FR-4.3:** Total celebration duration: ~6.5s (1.5s animation + 2s rank + 3s hold)
- **FR-4.4:** Page auto-refreshes to show updated contact fields

### FR-5: Research Run History Tiles
- **FR-5.1:** Display last 5 completed research runs as collapsible tiles
- **FR-5.2:** Most recent run at top of list
- **FR-5.3:** Each tile shows:
  - Date (relative: "2 days ago" or absolute if >7 days)
  - Status badge (COMPLETED, APPLIED, FAILED)
  - Recommendation stats: "8 recommendations: 6 approved, 2 rejected"
  - One-line summary of applied changes
- **FR-5.4:** Clicking tile expands to show full `ResearchResultsPanel`
- **FR-5.5:** Only one tile can be expanded at a time (accordion behavior)
- **FR-5.6:** Active/running research always shows expanded (not collapsible)

### FR-6: Page Data Updates
- **FR-6.1:** Server component fetches last 5 research runs (not just latest)
- **FR-6.2:** Include recommendation counts in query for tile display
- **FR-6.3:** After apply, `router.refresh()` to re-fetch updated contact data

---

## Technical Design

### Database Schema Changes

```prisma
model ContactResearchRun {
  // ... existing fields ...

  // NEW: Store summary of applied changes for historical display
  appliedChangesSummary  String?   @db.Text  // JSON array of change descriptions
  appliedAt              DateTime?           // When recommendations were applied
  previousScore          Int?                // Score before apply
  newScore               Int?                // Score after apply
}
```

**Migration notes:**
- All new fields are nullable (no data migration needed)
- `appliedChangesSummary` stores JSON: `["Added organizational title", "Updated expertise", "Added 2 tags"]`

### API Changes

#### `POST /api/contacts/[id]/research/[runId]/apply`

**Current response:**
```typescript
{
  success: boolean;
  appliedCount: number;
  contact: { id: string; enrichmentScore: number };
  changes: Array<{ fieldName: string; action: string }>;
}
```

**Updated response:**
```typescript
{
  success: boolean;
  appliedCount: number;
  previousScore: number;      // NEW
  newScore: number;           // NEW
  appliedChangesSummary: string[];  // NEW: Human-readable change descriptions
  contact: { id: string; enrichmentScore: number };
}
```

**Implementation:**
1. Capture `previousScore` before applying changes
2. Apply changes in transaction
3. Calculate `newScore` after applying
4. Generate `appliedChangesSummary` array
5. Store summary, scores, and `appliedAt` on research run
6. Return all data in response

### New Components

#### `ResearchApplyCelebration`
```typescript
interface ResearchApplyCelebrationProps {
  previousScore: number;
  newScore: number;
  appliedChangesSummary: string[];
  contactName: string;
  currentRank: number;
  previousRank: number;
  totalContacts: number;
  onComplete: () => void;
}
```

**Behavior:**
- Renders `ScoreImprovementBar` with previous→new animation
- Shows `RankCelebration` after score animation
- Displays changes summary below
- Calls `onComplete` after 3s hold time
- Uses Framer Motion for fade-in/fade-out transitions

#### `ResearchRunTile`
```typescript
interface ResearchRunTileProps {
  researchRun: {
    id: string;
    status: ResearchStatus;
    createdAt: Date;
    appliedAt: Date | null;
    appliedChangesSummary: string[] | null;
    previousScore: number | null;
    newScore: number | null;
    _count: { recommendations: number };
    recommendations: Array<{ status: RecommendationStatus }>;
  };
  isExpanded: boolean;
  onToggle: () => void;
  contactId: string;
}
```

**Behavior:**
- Collapsed: Shows date, status badge, stats, one-line summary
- Expanded: Shows full `ResearchResultsPanel`
- Click header to toggle expanded state
- Chevron icon indicates expand/collapse state

#### `ResearchRunHistory`
```typescript
interface ResearchRunHistoryProps {
  researchRuns: ResearchRunTile['researchRun'][];
  contactId: string;
  activeRunId?: string;  // Currently running research (always expanded)
}
```

**Behavior:**
- Maps research runs to `ResearchRunTile` components
- Manages accordion state (only one expanded)
- Active/running research is always expanded and not collapsible
- Empty state: "No research runs yet" message

### State Machine

```
ContactDetail Research States:

IDLE
  └─> User clicks "Research" → RUNNING

RUNNING (research in progress)
  └─> Research completes → REVIEWING

REVIEWING (recommendations displayed, pending approval)
  └─> User clicks "Apply" → APPLYING

APPLYING (API call in progress)
  ├─> Score improved → CELEBRATING
  └─> No score change → COLLAPSED

CELEBRATING (animation playing)
  └─> After 6.5s → COLLAPSED

COLLAPSED (summary tile view)
  └─> User clicks tile → EXPANDED

EXPANDED (full results shown)
  └─> User clicks tile header → COLLAPSED
  └─> User clicks "Research" → RUNNING (new run)
```

### Animation Timeline

```
0ms      - User clicks "Apply"
200ms    - API response received
200ms    - Check: newScore > previousScore?
           ├─> YES: Enter CELEBRATING
           └─> NO: Skip to COLLAPSED

CELEBRATING timeline (if score improved):
200ms    - Score bar starts animating
1700ms   - Score animation complete, sound plays
2200ms   - Rank celebration appears
2700ms   - Changes summary fades in
5700ms   - Begin fade out (after 3s hold)
6200ms   - Transition complete, show COLLAPSED state

COLLAPSED state:
- EnrichmentScoreCard fades in
- ResearchRunTile shows in collapsed state
- Contact fields reflect updates
```

### Component Hierarchy

```
ContactDetail
├── ProfileHeader
├── [CELEBRATING state]
│   └── ResearchApplyCelebration
│       ├── ScoreImprovementBar (reused)
│       ├── RankCelebration (reused)
│       └── ChangesSummaryList (new, simple)
│
├── [IDLE/COLLAPSED state]
│   └── EnrichmentScoreCard (existing)
│
├── TagsSection
├── ResearchButton
│
└── ResearchRunHistory (new)
    └── ResearchRunTile[] (new)
        └── [if expanded] ResearchResultsPanel (existing, refactored)
```

### Data Flow

```
1. Apply Button Click
   └─> handleApplyAll()
       └─> POST /api/contacts/[id]/research/[runId]/apply
           └─> Response: { previousScore, newScore, appliedChangesSummary }

2. Celebration Decision
   └─> if (newScore > previousScore)
       └─> setCelebrationData({ previousScore, newScore, ... })
       └─> setResearchState('CELEBRATING')
   └─> else
       └─> setResearchState('COLLAPSED')
       └─> router.refresh()

3. Celebration Complete
   └─> onComplete callback fires after 6.5s
       └─> setResearchState('COLLAPSED')
       └─> router.refresh()

4. Page Refresh
   └─> Server fetches updated contact + last 5 research runs
   └─> ResearchRunHistory displays tiles
```

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/research/ResearchApplyCelebration.tsx` | Celebration UI after apply |
| `src/components/research/ResearchRunTile.tsx` | Collapsible history tile |
| `src/components/research/ResearchRunHistory.tsx` | Container for history tiles |
| `src/components/research/ChangesSummaryList.tsx` | Bullet list of applied changes |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `appliedChangesSummary`, `appliedAt`, `previousScore`, `newScore` to ContactResearchRun |
| `src/app/api/contacts/[id]/research/[runId]/apply/route.ts` | Return previous/new scores, store summary |
| `src/app/(dashboard)/contacts/[id]/page.tsx` | Fetch last 5 research runs instead of just latest |
| `src/components/contacts/ContactDetail.tsx` | Add celebration state, integrate ResearchRunHistory |
| `src/components/research/ResearchResultsPanel.tsx` | Receive `onApplySuccess` callback prop |

---

## Edge Cases

### EC-1: No Score Improvement
- Skip celebration animation entirely
- Show brief toast: "Recommendations applied"
- Go directly to collapsed tile state

### EC-2: All Recommendations Rejected
- No apply button shown (existing behavior)
- Research run tile shows "0 approved, X rejected"

### EC-3: Research Run Still Running
- Always show expanded with loading state
- Not collapsible until complete

### EC-4: Multiple Research Runs in Progress
- Should not happen (UI prevents starting new run while one is running)
- If it does, show all running runs expanded

### EC-5: Apply Fails Mid-Transaction
- API rolls back all changes
- Show error toast
- Stay in REVIEWING state
- User can retry

### EC-6: Contact Has No Research Runs
- Hide ResearchRunHistory component entirely
- Just show ResearchButton

---

## Testing Requirements

### Unit Tests
- `calculateAppliedChangesSummary()` - generates correct human-readable strings
- `ResearchRunTile` - renders correct stats and toggles expansion
- `ResearchApplyCelebration` - fires onComplete after correct duration

### Integration Tests
- Apply flow with score improvement → celebration → collapse
- Apply flow without score improvement → skip celebration
- History tiles expand/collapse correctly
- Multiple research runs display in correct order

### E2E Tests
- Full research → review → apply → celebration flow
- Verify contact fields update after apply
- Verify score animation plays when score improves

---

## Implementation Phases

### Phase 1: Database & API (Est: 1 hour)
1. Add schema fields to ContactResearchRun
2. Run migration
3. Update apply route to return previous/new scores
4. Generate and store appliedChangesSummary

### Phase 2: Celebration Component (Est: 2 hours)
1. Create ResearchApplyCelebration component
2. Create ChangesSummaryList component
3. Wire up to existing ScoreImprovementBar and RankCelebration
4. Implement animation timeline and onComplete callback

### Phase 3: History Tiles (Est: 2 hours)
1. Create ResearchRunTile component
2. Create ResearchRunHistory component
3. Implement accordion behavior
4. Style collapsed and expanded states

### Phase 4: ContactDetail Integration (Est: 2 hours)
1. Add research state machine to ContactDetail
2. Update page.tsx to fetch last 5 runs
3. Integrate celebration flow with apply handler
4. Handle state transitions and page refresh

### Phase 5: Polish & Testing (Est: 1 hour)
1. Edge case handling
2. Mobile responsiveness
3. Loading states
4. Error handling
5. E2E test validation

**Total Estimated Time: 8 hours**

---

## Success Criteria

- [ ] Applying recommendations shows animated score improvement (when score increases)
- [ ] Rank change displays after score animation
- [ ] Changes summary bullets appear during celebration
- [ ] Celebration fades to standard EnrichmentScoreCard after 3s hold
- [ ] Research results collapse to summary tile after apply
- [ ] Tile shows date, status, stats, and one-line summary
- [ ] Clicking tile expands to show full results
- [ ] Last 5 research runs visible as history
- [ ] Contact fields reflect updates after apply
- [ ] No celebration if score doesn't improve
- [ ] Changes summary persists in database for history
