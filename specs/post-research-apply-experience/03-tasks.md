# Task Breakdown: Post-Research Apply Experience

**Generated:** 2026-01-11
**Source:** `specs/post-research-apply-experience/02-spec.md`
**Feature Slug:** post-research-apply-experience
**Last Decompose:** 2026-01-11

---

## Overview

Enhance the post-apply experience when research recommendations are applied to a contact profile. The system shows an animated celebration (reusing existing gamification components), displays a summary of changes, then collapses research results into a historical tile view supporting multiple research runs over time.

**Total Tasks:** 13 tasks across 5 phases
**Estimated Time:** ~8 hours

---

## Phase 1: Database & API Foundation

### Task 1.1: Add Schema Fields to ContactResearchRun

**Description:** Add four new nullable fields to the ContactResearchRun model in Prisma schema to track applied changes.

**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (must be done first)

**Technical Requirements:**

Add these fields to `prisma/schema.prisma` in the `ContactResearchRun` model:

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

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Add the four new fields to ContactResearchRun model
3. Run `npx prisma migrate dev --name add-research-apply-tracking`
4. Verify migration succeeds

**Acceptance Criteria:**
- [ ] Four new fields added to ContactResearchRun model
- [ ] Migration runs successfully without data loss
- [ ] Prisma client regenerated with new fields
- [ ] All fields are nullable (no migration issues with existing data)

---

### Task 1.2: Update Apply API Route to Return Score Data

**Description:** Modify the apply API endpoint to capture previous score before applying, calculate new score after, generate human-readable change summaries, and persist all data.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** None

**Technical Requirements:**

Modify `src/app/api/contacts/[id]/research/[runId]/apply/route.ts`:

```typescript
// 1. Capture previous score BEFORE applying changes
const previousScore = contact.enrichmentScore;

// 2. After applying changes and calculating new score, generate summary
const appliedChangesSummary = generateAppliedChangesSummary(changes);

// Helper function to generate human-readable summaries
function generateAppliedChangesSummary(
  changes: { fieldName: string; previousValue: string | null; newValue: string }[]
): string[] {
  const fieldLabels: Record<string, string> = {
    title: 'job role',
    organizationalTitle: 'organizational title',
    company: 'company',
    location: 'location',
    expertise: 'expertise',
    interests: 'interests',
    whyNow: 'why now',
    notes: 'notes',
    tags: 'tag',
  };

  return changes.map((change) => {
    const label = fieldLabels[change.fieldName] || change.fieldName;
    const action = change.previousValue ? 'Updated' : 'Added';
    return `${action} ${label}`;
  });
}

// 3. Update research run with tracking data
await prisma.contactResearchRun.update({
  where: { id: runId },
  data: {
    appliedChangesSummary: JSON.stringify(appliedChangesSummary),
    appliedAt: new Date(),
    previousScore,
    newScore,
  },
});

// 4. Update response to include score data
return NextResponse.json({
  success: true,
  appliedCount: recommendations.length,
  previousScore,         // NEW
  newScore,              // NEW
  appliedChangesSummary, // NEW: Human-readable change descriptions
  contact: {
    id: contactWithTags.id,
    enrichmentScore: newScore,
  },
});
```

**Implementation Steps:**
1. Read current apply route implementation
2. Add `previousScore` capture before transaction
3. Create `generateAppliedChangesSummary` helper function
4. Update research run after transaction with tracking data
5. Update response to include new fields
6. Test with manual API call

**Acceptance Criteria:**
- [ ] Previous score captured before any changes applied
- [ ] New score calculated correctly after changes
- [ ] `appliedChangesSummary` generates human-readable strings
- [ ] Research run updated with all tracking fields
- [ ] API response includes `previousScore`, `newScore`, `appliedChangesSummary`
- [ ] Existing functionality (tag creation, field updates) still works

---

## Phase 2: Celebration Components

### Task 2.1: Create ChangesSummaryList Component

**Description:** Create a simple component that displays a bullet list of applied changes with fade-in animation.

**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Task 2.2

**Technical Requirements:**

Create `src/components/research/ChangesSummaryList.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ChangesSummaryListProps {
  changes: string[];
  isVisible: boolean;
}

export function ChangesSummaryList({ changes, isVisible }: ChangesSummaryListProps) {
  if (!isVisible || changes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="space-y-2"
    >
      <h4 className="text-sm font-medium text-zinc-400">Changes Applied</h4>
      <ul className="space-y-1">
        {changes.map((change, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
            className="flex items-center gap-2 text-sm text-zinc-300"
          >
            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            <span>{change}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
```

**Acceptance Criteria:**
- [ ] Component renders bullet list with check icons
- [ ] Staggered fade-in animation for each item
- [ ] Hidden when `isVisible` is false or no changes
- [ ] Matches dark theme styling (zinc colors)

---

### Task 2.2: Create ResearchApplyCelebration Component

**Description:** Create the main celebration component that orchestrates score animation, rank display, and changes summary.

**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/research/ResearchApplyCelebration.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoreImprovementBar } from '@/components/enrichment/completion/ScoreImprovementBar';
import { RankCelebration } from '@/components/enrichment/completion/RankCelebration';
import { ChangesSummaryList } from './ChangesSummaryList';

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

export function ResearchApplyCelebration({
  previousScore,
  newScore,
  appliedChangesSummary,
  contactName,
  currentRank,
  previousRank,
  totalContacts,
  onComplete,
}: ResearchApplyCelebrationProps) {
  const [phase, setPhase] = useState<'score' | 'rank' | 'summary' | 'hold'>('score');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    // Timeline:
    // 0ms - Start score animation
    // 1500ms - Score animation complete, show delta
    // 2000ms - Show rank celebration
    // 2500ms - Show changes summary
    // 5500ms (3s after summary) - Call onComplete

    const timers: NodeJS.Timeout[] = [];

    // Start score animation immediately
    setIsAnimating(true);
    setPhase('score');

    // Show delta badge after score animation
    timers.push(setTimeout(() => {
      setShowDelta(true);
      setPhase('rank');
    }, 1500));

    // Show rank celebration
    timers.push(setTimeout(() => {
      setShowRank(true);
    }, 2000));

    // Show changes summary
    timers.push(setTimeout(() => {
      setShowSummary(true);
      setPhase('summary');
    }, 2500));

    // Complete and transition out
    timers.push(setTimeout(() => {
      setPhase('hold');
    }, 5500));

    // Final callback after hold period
    timers.push(setTimeout(() => {
      onComplete();
    }, 6500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Score Animation */}
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
          <ScoreImprovementBar
            previousScore={previousScore}
            newScore={newScore}
            isAnimating={isAnimating}
            showDelta={showDelta}
          />
        </div>

        {/* Rank Celebration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showRank ? 1 : 0, y: showRank ? 0 : 10 }}
          transition={{ duration: 0.3 }}
        >
          {showRank && (
            <RankCelebration
              contactName={contactName}
              currentRank={currentRank}
              previousRank={previousRank}
              totalContacts={totalContacts}
            />
          )}
        </motion.div>

        {/* Changes Summary */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <ChangesSummaryList
            changes={appliedChangesSummary}
            isVisible={showSummary}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Implementation Steps:**
1. Create the component file
2. Import existing components (ScoreImprovementBar, RankCelebration)
3. Implement phased animation timeline using useEffect
4. Wire up state transitions for each phase
5. Add AnimatePresence for smooth enter/exit

**Acceptance Criteria:**
- [ ] Score animation plays immediately (1.5s duration)
- [ ] Delta badge appears after score animation completes
- [ ] Rank celebration appears at 2s mark
- [ ] Changes summary appears at 2.5s mark
- [ ] `onComplete` callback fires at 6.5s
- [ ] Smooth fade-in/out transitions between phases
- [ ] Reuses existing ScoreImprovementBar and RankCelebration components

---

## Phase 3: History Tile Components

### Task 3.1: Create ResearchRunTile Component

**Description:** Create a collapsible tile component that displays a research run summary in collapsed state and full ResearchResultsPanel when expanded.

**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 3.2

**Technical Requirements:**

Create `src/components/research/ResearchRunTile.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResearchResultsPanel } from './ResearchResultsPanel';
import { cn } from '@/lib/utils';
import type { Recommendation } from './RecommendationCard';

type ResearchStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type RecommendationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';

interface ResearchRunData {
  id: string;
  status: ResearchStatus;
  createdAt: string;
  appliedAt: string | null;
  appliedChangesSummary: string[] | null;
  previousScore: number | null;
  newScore: number | null;
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  completedAt: string | null;
  recommendations: Recommendation[];
}

interface ResearchRunTileProps {
  researchRun: ResearchRunData;
  isExpanded: boolean;
  onToggle: () => void;
  contactId: string;
  isActive?: boolean; // Currently running research (always expanded, not collapsible)
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: ResearchStatus, appliedAt: string | null) {
  if (appliedAt) {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20">
        <CheckCircle className="h-3 w-3" />
        Applied
      </Badge>
    );
  }

  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'RUNNING':
    case 'PENDING':
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-400 border-red-500/20">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
  }
}

export function ResearchRunTile({
  researchRun,
  isExpanded,
  onToggle,
  contactId,
  isActive = false,
}: ResearchRunTileProps) {
  const approvedCount = researchRun.recommendations.filter(
    (r) => r.status === 'APPROVED' || r.status === 'APPLIED'
  ).length;
  const rejectedCount = researchRun.recommendations.filter(
    (r) => r.status === 'REJECTED'
  ).length;
  const totalCount = researchRun.recommendations.length;

  const canCollapse = !isActive && researchRun.status !== 'RUNNING';

  // Generate one-line summary
  const onelinerSummary = researchRun.appliedChangesSummary
    ? researchRun.appliedChangesSummary.slice(0, 2).join(', ')
    : researchRun.summary?.split('\n')[0]?.slice(0, 80) || null;

  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      {/* Tile Header (clickable to expand/collapse) */}
      <button
        onClick={canCollapse ? onToggle : undefined}
        className={cn(
          'w-full p-4 flex items-center justify-between text-left',
          canCollapse && 'hover:bg-white/5 cursor-pointer',
          !canCollapse && 'cursor-default'
        )}
        disabled={!canCollapse}
      >
        <div className="flex-1 min-w-0">
          {/* Top row: Date + Status */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-white font-medium">
              {formatRelativeDate(researchRun.createdAt)}
            </span>
            {getStatusBadge(researchRun.status, researchRun.appliedAt)}
          </div>

          {/* Middle row: Stats */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{totalCount} recommendations</span>
            {(approvedCount > 0 || rejectedCount > 0) && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-green-500">{approvedCount} approved</span>
                {rejectedCount > 0 && (
                  <>
                    <span className="text-zinc-700">,</span>
                    <span className="text-red-400">{rejectedCount} rejected</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Bottom row: One-line summary (collapsed only) */}
          {!isExpanded && onelinerSummary && (
            <p className="text-xs text-zinc-400 mt-1 truncate">
              {onelinerSummary}
            </p>
          )}
        </div>

        {/* Expand/Collapse chevron */}
        {canCollapse && (
          <div className="ml-4 text-zinc-500">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4">
              <ResearchResultsPanel
                contactId={contactId}
                researchRun={{
                  id: researchRun.id,
                  status: researchRun.status,
                  summary: researchRun.summary,
                  fullReport: researchRun.fullReport,
                  sourceUrls: researchRun.sourceUrls,
                  executionTimeMs: researchRun.executionTimeMs,
                  createdAt: researchRun.createdAt,
                  completedAt: researchRun.completedAt,
                  recommendations: researchRun.recommendations,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Collapsed state shows: date, status badge, recommendation stats, one-line summary
- [ ] Click header toggles expanded/collapsed state
- [ ] Expanded state shows full ResearchResultsPanel
- [ ] Active/running research is always expanded and not collapsible
- [ ] Chevron icon indicates expand/collapse state
- [ ] Smooth height animation on expand/collapse
- [ ] Status badge shows "Applied" when appliedAt is set

---

### Task 3.2: Create ResearchRunHistory Component

**Description:** Create a container component that manages the list of research run tiles with accordion behavior.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/research/ResearchRunHistory.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { ResearchRunTile } from './ResearchRunTile';
import type { Recommendation } from './RecommendationCard';

type ResearchStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

interface ResearchRunData {
  id: string;
  status: ResearchStatus;
  createdAt: string;
  appliedAt: string | null;
  appliedChangesSummary: string[] | null;
  previousScore: number | null;
  newScore: number | null;
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  completedAt: string | null;
  recommendations: Recommendation[];
}

interface ResearchRunHistoryProps {
  researchRuns: ResearchRunData[];
  contactId: string;
  activeRunId?: string; // Currently running research (always expanded)
}

export function ResearchRunHistory({
  researchRuns,
  contactId,
  activeRunId,
}: ResearchRunHistoryProps) {
  // Find active run or most recent for default expanded
  const defaultExpandedId = activeRunId || researchRuns[0]?.id;
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId || null);

  // Update expanded state if active run changes
  useEffect(() => {
    if (activeRunId) {
      setExpandedId(activeRunId);
    }
  }, [activeRunId]);

  // Accordion behavior: only one tile expanded at a time
  const handleToggle = (runId: string) => {
    setExpandedId((current) => (current === runId ? null : runId));
  };

  if (researchRuns.length === 0) {
    return null; // Hide component entirely if no research runs
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Research History
        </h3>
      </div>

      <div className="space-y-3">
        {researchRuns.map((run) => (
          <ResearchRunTile
            key={run.id}
            researchRun={run}
            isExpanded={expandedId === run.id}
            onToggle={() => handleToggle(run.id)}
            contactId={contactId}
            isActive={run.id === activeRunId}
          />
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders list of ResearchRunTile components
- [ ] Accordion behavior: only one tile expanded at a time
- [ ] Active/running research is always expanded
- [ ] Most recent run is expanded by default (if no active run)
- [ ] Hidden when there are no research runs
- [ ] Header shows "Research History" with icon

---

### Task 3.3: Update Research Component Exports

**Description:** Update the research components barrel export to include new components.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1, Task 2.2, Task 3.1, Task 3.2
**Can run parallel with:** None

**Technical Requirements:**

Update `src/components/research/index.ts`:

```typescript
// Add these exports
export { ChangesSummaryList } from './ChangesSummaryList';
export { ResearchApplyCelebration } from './ResearchApplyCelebration';
export { ResearchRunTile } from './ResearchRunTile';
export { ResearchRunHistory } from './ResearchRunHistory';
```

**Acceptance Criteria:**
- [ ] All new components exported from barrel file
- [ ] No TypeScript errors in exports

---

## Phase 4: ContactDetail Integration

### Task 4.1: Update Contact Page to Fetch Last 5 Research Runs

**Description:** Modify the server component to fetch the last 5 research runs instead of just the latest one.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 4.2

**Technical Requirements:**

Update `src/app/(dashboard)/contacts/[id]/page.tsx`:

```typescript
// Replace the single research run fetch with this:
const researchRuns = await prisma.contactResearchRun.findMany({
  where: {
    contactId: contact.id,
  },
  orderBy: { createdAt: 'desc' },
  take: 5,
  include: {
    recommendations: {
      orderBy: { confidence: 'desc' },
    },
  },
});

// Serialize all research runs
const serializedResearchRuns = researchRuns.map((run) => ({
  id: run.id,
  status: run.status as 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  summary: run.summary,
  fullReport: run.fullReport,
  sourceUrls: run.sourceUrls,
  executionTimeMs: run.executionTimeMs,
  createdAt: run.createdAt.toISOString(),
  completedAt: run.completedAt?.toISOString() || null,
  appliedAt: run.appliedAt?.toISOString() || null,
  appliedChangesSummary: run.appliedChangesSummary
    ? JSON.parse(run.appliedChangesSummary)
    : null,
  previousScore: run.previousScore,
  newScore: run.newScore,
  recommendations: run.recommendations.map((r) => ({
    id: r.id,
    fieldName: r.fieldName,
    action: r.action as 'ADD' | 'UPDATE',
    currentValue: r.currentValue,
    proposedValue: r.proposedValue,
    tagCategory: r.tagCategory,
    reasoning: r.reasoning,
    confidence: r.confidence,
    sourceUrls: r.sourceUrls,
    status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED',
    editedValue: r.editedValue,
  })),
}));

// Pass to ContactDetail
return (
  <ContactDetail
    contact={serializedContact}
    researchRuns={serializedResearchRuns}
  />
);
```

**Acceptance Criteria:**
- [ ] Fetches last 5 research runs (not just latest)
- [ ] Includes new fields: `appliedAt`, `appliedChangesSummary`, `previousScore`, `newScore`
- [ ] Properly serializes JSON `appliedChangesSummary` field
- [ ] Serializes all dates to ISO strings
- [ ] Props passed to ContactDetail component

---

### Task 4.2: Add Research State Machine to ContactDetail

**Description:** Add celebration state management to ContactDetail, integrating the ResearchApplyCelebration component and ResearchRunHistory.

**Size:** Large
**Priority:** High
**Dependencies:** Task 2.2, Task 3.2, Task 4.1
**Can run parallel with:** None

**Technical Requirements:**

Update `src/components/contacts/ContactDetail.tsx`:

1. Update props interface:
```typescript
interface ResearchRunData {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  appliedAt: string | null;
  appliedChangesSummary: string[] | null;
  previousScore: number | null;
  newScore: number | null;
  recommendations: Recommendation[];
}

interface ContactDetailProps {
  contact: Contact;
  researchRuns: ResearchRunData[];  // Changed from single researchRun
}
```

2. Add state for celebration:
```typescript
type ResearchDisplayState = 'IDLE' | 'REVIEWING' | 'CELEBRATING' | 'COLLAPSED';

const [researchState, setResearchState] = useState<ResearchDisplayState>('IDLE');
const [celebrationData, setCelebrationData] = useState<{
  previousScore: number;
  newScore: number;
  appliedChangesSummary: string[];
  previousRank: number;
  currentRank: number;
  totalContacts: number;
} | null>(null);

// Determine initial state based on research runs
useEffect(() => {
  const activeRun = researchRuns.find(
    (r) => r.status === 'RUNNING' || r.status === 'PENDING'
  );
  const pendingReviewRun = researchRuns.find(
    (r) => r.status === 'COMPLETED' && !r.appliedAt &&
    r.recommendations.some((rec) => rec.status === 'PENDING' || rec.status === 'APPROVED')
  );

  if (activeRun) {
    setResearchState('REVIEWING'); // Show running research
  } else if (pendingReviewRun) {
    setResearchState('REVIEWING');
  } else {
    setResearchState('COLLAPSED');
  }
}, [researchRuns]);
```

3. Add apply success handler:
```typescript
const handleApplySuccess = useCallback(async (
  previousScore: number,
  newScore: number,
  appliedChangesSummary: string[]
) => {
  // Fetch rank data
  const rankResponse = await fetch(`/api/contacts/${contact.id}/ranking`);
  const rankData = await rankResponse.json();

  if (newScore > previousScore) {
    setCelebrationData({
      previousScore,
      newScore,
      appliedChangesSummary,
      previousRank: rankData.previousRank || rankData.rank,
      currentRank: rankData.rank,
      totalContacts: rankData.totalContacts,
    });
    setResearchState('CELEBRATING');
  } else {
    // No score improvement, skip to collapsed
    toast({
      title: 'Recommendations applied',
      description: `${appliedChangesSummary.length} changes applied to profile.`,
    });
    setResearchState('COLLAPSED');
    router.refresh();
  }
}, [contact.id, router, toast]);

const handleCelebrationComplete = useCallback(() => {
  setResearchState('COLLAPSED');
  setCelebrationData(null);
  router.refresh();
}, [router]);
```

4. Update render to show celebration or history:
```typescript
{/* Research Section */}
{researchState === 'CELEBRATING' && celebrationData && (
  <div className="mb-6 rounded-xl border border-border bg-bg-secondary p-6">
    <ResearchApplyCelebration
      previousScore={celebrationData.previousScore}
      newScore={celebrationData.newScore}
      appliedChangesSummary={celebrationData.appliedChangesSummary}
      contactName={getDisplayName(contact)}
      currentRank={celebrationData.currentRank}
      previousRank={celebrationData.previousRank}
      totalContacts={celebrationData.totalContacts}
      onComplete={handleCelebrationComplete}
    />
  </div>
)}

{researchState !== 'CELEBRATING' && researchRuns.length > 0 && (
  <div className="mb-6">
    <ResearchRunHistory
      researchRuns={researchRuns}
      contactId={contact.id}
      activeRunId={researchRuns.find(
        (r) => r.status === 'RUNNING' || r.status === 'PENDING'
      )?.id}
    />
  </div>
)}
```

**Acceptance Criteria:**
- [ ] ResearchDisplayState type defines IDLE, REVIEWING, CELEBRATING, COLLAPSED
- [ ] Celebration mode shows ResearchApplyCelebration when score improves
- [ ] Skip celebration if no score improvement (show toast instead)
- [ ] After celebration completes, show ResearchRunHistory
- [ ] Properly fetches rank data for celebration
- [ ] `router.refresh()` called after celebration to update contact fields

---

### Task 4.3: Update ResearchResultsPanel with onApplySuccess Callback

**Description:** Modify ResearchResultsPanel to accept and call an onApplySuccess callback after successful apply, passing score data.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.2
**Can run parallel with:** Task 4.2

**Technical Requirements:**

Update `src/components/research/ResearchResultsPanel.tsx`:

```typescript
interface ResearchResultsPanelProps {
  contactId: string;
  researchRun: ResearchRun;
  onApplySuccess?: (
    previousScore: number,
    newScore: number,
    appliedChangesSummary: string[]
  ) => void;  // NEW
}

// Update handleApplyAll:
const handleApplyAll = async () => {
  const approvedIds = recommendations
    .filter((r) => r.status === 'APPROVED')
    .map((r) => r.id);

  if (approvedIds.length === 0) return;

  setIsApplying(true);
  try {
    const response = await fetch(
      `/api/contacts/${contactId}/research/${researchRun.id}/apply`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationIds: approvedIds }),
      }
    );

    if (response.ok) {
      const data = await response.json();

      setRecommendations((prev) =>
        prev.map((r) =>
          approvedIds.includes(r.id)
            ? { ...r, status: 'APPLIED' as const }
            : r
        )
      );

      // Call success callback with score data
      if (onApplySuccess) {
        onApplySuccess(
          data.previousScore,
          data.newScore,
          data.appliedChangesSummary
        );
      } else {
        router.refresh();
      }
    }
  } catch (error) {
    console.error('Failed to apply recommendations:', error);
  } finally {
    setIsApplying(false);
  }
};
```

**Acceptance Criteria:**
- [ ] New `onApplySuccess` prop added to interface
- [ ] Callback receives `previousScore`, `newScore`, `appliedChangesSummary`
- [ ] Callback called after successful API response
- [ ] Falls back to `router.refresh()` if no callback provided
- [ ] Existing functionality preserved when callback not provided

---

## Phase 5: Polish & Testing

### Task 5.1: Add Loading and Error States

**Description:** Add proper loading states during apply and error handling for failed applies.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.2, Task 4.3
**Can run parallel with:** Task 5.2

**Technical Requirements:**

Add to `src/components/contacts/ContactDetail.tsx`:

```typescript
const [isApplying, setIsApplying] = useState(false);
const [applyError, setApplyError] = useState<string | null>(null);

// Wrap handleApplySuccess to handle errors:
const handleApplySuccess = useCallback(async (
  previousScore: number,
  newScore: number,
  appliedChangesSummary: string[]
) => {
  setApplyError(null);
  try {
    // ... existing logic ...
  } catch (error) {
    setApplyError('Failed to complete apply. Please refresh the page.');
    setResearchState('COLLAPSED');
    router.refresh();
  }
}, [/* deps */]);
```

Add error toast display:
```typescript
useEffect(() => {
  if (applyError) {
    toast({
      title: 'Error',
      description: applyError,
      variant: 'destructive',
    });
  }
}, [applyError, toast]);
```

**Acceptance Criteria:**
- [ ] Loading state shown during apply operation
- [ ] Error toast displayed if apply fails
- [ ] Graceful fallback to collapsed state on error
- [ ] Page refreshes to recover from error state

---

### Task 5.2: Mobile Responsiveness

**Description:** Ensure celebration and history components work well on mobile viewports.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2, Task 3.1
**Can run parallel with:** Task 5.1

**Technical Requirements:**

Review and update components for mobile:

1. `ResearchApplyCelebration.tsx` - Ensure padding scales down:
```typescript
<div className="bg-zinc-900/50 rounded-xl p-4 md:p-6 border border-zinc-800">
```

2. `ResearchRunTile.tsx` - Ensure stats wrap properly:
```typescript
<div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
```

3. `ChangesSummaryList.tsx` - Ensure text doesn't overflow:
```typescript
<span className="text-sm break-words">{change}</span>
```

**Acceptance Criteria:**
- [ ] Celebration component displays properly on mobile (<768px)
- [ ] History tiles don't overflow on mobile
- [ ] Touch targets are at least 44x44px
- [ ] Text wraps appropriately on small screens

---

### Task 5.3: Manual E2E Verification

**Description:** Manually test the complete flow end-to-end.

**Size:** Medium
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** None

**Test Scenarios:**

1. **Happy Path - Score Improves:**
   - Start research on a contact with low score
   - Approve several recommendations
   - Click Apply
   - Verify score animation plays
   - Verify rank celebration appears
   - Verify changes summary shows
   - Verify auto-transition to collapsed state
   - Verify contact fields updated

2. **No Score Improvement:**
   - Start research on fully enriched contact
   - Approve a recommendation that won't change score (e.g., duplicate tag)
   - Click Apply
   - Verify no celebration (just toast)
   - Verify immediate transition to collapsed

3. **History Tiles:**
   - Create multiple research runs on same contact
   - Verify last 5 show in history
   - Verify accordion behavior (one expanded at a time)
   - Verify running research always expanded

4. **Edge Cases:**
   - All recommendations rejected (no apply button)
   - Research fails (error state in tile)
   - Apply fails mid-transaction (error handling)

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] No console errors during flow
- [ ] Animations feel smooth (60fps)
- [ ] Data persists correctly in database

---

## Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1: Database & API | 2 tasks | 1.5 hours |
| Phase 2: Celebration Components | 2 tasks | 2 hours |
| Phase 3: History Tile Components | 3 tasks | 2 hours |
| Phase 4: ContactDetail Integration | 3 tasks | 2 hours |
| Phase 5: Polish & Testing | 3 tasks | 1 hour |
| **Total** | **13 tasks** | **~8 hours** |

## Parallel Execution Opportunities

- Task 2.1 and Task 3.1 can run in parallel
- Task 4.1 and Task 4.3 can run in parallel
- Task 5.1 and Task 5.2 can run in parallel

## Critical Path

1. Task 1.1 (Schema) → Task 1.2 (API) → Task 4.1 (Page fetch)
2. Task 2.1 → Task 2.2 (Celebration) → Task 4.2 (Integration)
3. Task 3.1 → Task 3.2 (History) → Task 4.2 (Integration)
4. All → Task 5.3 (E2E verification)
