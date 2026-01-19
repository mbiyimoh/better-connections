# Research Progress Tracker

**Slug:** feat-research-progress-tracker
**Author:** Claude Code
**Date:** 2026-01-13
**Branch:** feat/research-progress-tracker
**Related:** Contact Deep Research Pattern (CLAUDE.md)

---

## 1) Intent & Assumptions

**Task brief:** Create a step-by-step visual progress indicator for the contact research feature. The research run takes 30-60 seconds, so users need confidence that things are happening. This would be a modal that replaces the research options modal during execution, showing progress through 4-5 stages with friendly messaging.

**Assumptions:**
- The existing 5 progress stages from the orchestrator will be reused/remapped to user-friendly labels
- Progress will be polled from the database (the `progressStage` field is already being updated)
- The modal should prevent accidental closure during research
- Dark theme with gold accents per 33 Strategies brand guidelines
- No need for cancellation functionality in V1

**Out of scope:**
- Cancelling a research run mid-execution
- Detailed per-source progress (e.g., "Reading source 3 of 10")
- Time estimates or countdown timers
- Background research (user must stay on page)

---

## 2) Pre-reading Log

- `src/components/research/ResearchOptionsModal.tsx`: Current modal shows generic "Researching..." spinner with no progress detail. Waits synchronously for API response (up to 60s timeout).
- `src/lib/research/orchestrator.ts`: Has 5 progress stages already: "Building search query...", "Searching the web...", "Analyzing findings...", "Generating recommendations...", "Research complete!"
- `src/app/api/contacts/[id]/research/route.ts`: Creates research run with `progressStage` field, updates it via `onProgress` callback during execution. Returns completed run at end.
- `src/lib/research/types.ts`: Defines `FocusArea`, `ContactContext`, `ResearchResult` types
- `src/components/ui/progress.tsx`: Basic Radix progress bar component available
- `CLAUDE.md`: Documents dark theme colors, gold accent (#d4a54a), glassmorphism patterns

---

## 3) Codebase Map

**Primary components/modules:**
- `src/components/research/ResearchOptionsModal.tsx` - Will be modified to show progress view
- `src/components/research/ResearchButton.tsx` - Triggers modal, passes callbacks
- `src/app/api/contacts/[id]/research/route.ts` - POST creates run, updates progress
- `src/lib/research/orchestrator.ts` - Executes research with progress callbacks

**Shared dependencies:**
- `@/components/ui/dialog` - shadcn Dialog component
- `@/components/ui/progress` - Radix progress bar
- `framer-motion` - Animations
- `lucide-react` - Icons

**Data flow:**
```
User clicks "Start Research"
  → POST /api/contacts/{id}/research (creates run, returns runId)
  → Modal switches to progress view
  → Poll GET /api/contacts/{id}/research/{runId} every 2-3s
  → Update UI with progressStage from response
  → When status === 'COMPLETED', show success and close
  → router.refresh() to show results
```

**Feature flags/config:** None

**Potential blast radius:**
- ResearchOptionsModal.tsx (major changes)
- Possibly new ResearchProgressModal.tsx component
- New polling endpoint or reuse existing GET route
- Minor changes to ResearchButton.tsx props

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

**Option 1: Vertical Stepper in Modal**

A vertical list of 4-5 steps with icons, where the current step pulses/animates and completed steps show checkmarks.

```
[x] Searching for sources
[~] Reading through findings     <- pulsing indicator
[ ] Considering profile updates
[ ] Synthesizing recommendations
[ ] Finalizing research
```

**Pros:**
- Clear visual hierarchy showing where user is in the process
- Works well in modal's vertical space
- Easy to understand at a glance
- Matches common SaaS onboarding patterns

**Cons:**
- Takes more vertical space
- May feel slow if steps complete quickly in succession

---

**Option 2: Horizontal Stepper with Progress Bar**

A horizontal row of step indicators with a connecting progress bar that fills as steps complete.

```
[1]----[2]----[3]----[4]----[5]
 ^      ^      ^
done   done  current
```

**Pros:**
- Compact, fits well in modal header area
- Clear sense of overall progress
- Common pattern users recognize

**Cons:**
- Less room for step descriptions
- Harder to show detailed status for current step
- May feel cramped on mobile

---

**Option 3: Single Step Display with Rotating Messages**

Show only the current step prominently with a subtle progress bar underneath. Step name changes as progress advances.

```
         [icon spinning]
    "Analyzing findings..."

    ════════════▓▓░░░░░░░
         Step 3 of 5
```

**Pros:**
- Minimal, focused UI
- Less visual noise
- Easy to implement
- Works great in dark theme

**Cons:**
- Less sense of overall journey
- User doesn't see what's coming next

---

### Recommendation

**Option 1: Vertical Stepper** is the best fit because:

1. **Modal context**: Vertical steppers work naturally in modal dialogs
2. **Duration**: For 30-60 second operations, research shows users benefit from seeing the full journey, not just current step
3. **Brand alignment**: Vertical layout allows for gold accent highlighting on current step
4. **Anxiety reduction**: Seeing all steps reduces "is it stuck?" anxiety
5. **Implementation simplicity**: Maps directly to existing 5 progress stages

**Proposed Step Labels (user-friendly):**

| Backend Stage | User-Facing Label | Icon |
|--------------|-------------------|------|
| Building search query... | Preparing search | Search |
| Searching the web... | Searching for sources | Globe |
| Analyzing findings... | Reading through findings | FileText |
| Generating recommendations... | Crafting recommendations | Sparkles |
| Research complete! | Finalizing results | CheckCircle |

---

## 6) Clarifications (Resolved)

1. **Step timing feedback**: Just animate current step - no elapsed time display
   - **Decision:** Animate only

2. **Error handling**: Single failure state for front-end UI, no per-step failure indication
   - **Decision:** Generic error state

3. **Success state duration**: 1.5 seconds with success animation, then auto-close
   - **Decision:** 1.5s confirmed

4. **Polling frequency**: Every 2 seconds
   - **Decision:** 2 seconds

5. **Close prevention**: Show warning dialog, don't completely block
   - **Decision:** Warn only

---

## 7) Visual Mockup (Text-Based)

```
┌─────────────────────────────────────────────────┐
│                                             [X] │
│                                                 │
│     Researching Sarah Chen                      │
│                                                 │
│     This may take a minute. Please don't        │
│     close or refresh while we work.             │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │  [✓] Preparing search                   │   │
│  │      ─────────────────────────          │   │
│  │  [✓] Searching for sources              │   │
│  │      ─────────────────────────          │   │
│  │  [◉] Reading through findings     ←     │   │  <- gold highlight + pulse
│  │      ─────────────────────────          │   │
│  │  [ ] Crafting recommendations           │   │
│  │      ─────────────────────────          │   │
│  │  [ ] Finalizing results                 │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Visual Details:**
- Completed steps: Gold checkmark, dimmed text
- Current step: Gold icon with pulse animation, white text, subtle gold left border
- Pending steps: Gray icon, gray text
- Connector lines between steps (subtle, like timeline)
- Overall card has glassmorphism effect (backdrop-blur)

---

## 8) Implementation Approach

### New Components Needed

1. **ResearchProgressModal.tsx** - New component for progress display
   - Props: `isOpen`, `onClose`, `contactId`, `contactName`, `runId`
   - Handles polling, displays stepper, manages close warning

2. **ResearchStepper.tsx** - Reusable vertical stepper component
   - Props: `steps`, `currentStep`, `status`
   - Handles animations, icons, styling

### API Changes

- Reuse existing `GET /api/contacts/{id}/research` with query param `?runId={id}`
- Or add simple `GET /api/contacts/{id}/research/{runId}/status` endpoint returning just status + progressStage

### State Machine

```
Options Modal → [Start] → Progress Modal → [Complete] → Close + Refresh
                              ↓
                          [Error] → Show error in modal → Retry/Close
```

### Polling Strategy

```typescript
useEffect(() => {
  if (!runId || status === 'COMPLETED' || status === 'FAILED') return;

  const interval = setInterval(async () => {
    const res = await fetch(`/api/contacts/${contactId}/research/${runId}`);
    const data = await res.json();
    setProgressStage(data.progressStage);
    setStatus(data.status);
  }, 2000);

  return () => clearInterval(interval);
}, [runId, status, contactId]);
```

---

## 9) Estimated Scope

| Task | Complexity |
|------|------------|
| ResearchProgressModal component | Medium |
| ResearchStepper component | Medium |
| Polling logic with status endpoint | Low |
| Animations (Framer Motion) | Low |
| Close warning dialog | Low |
| Error state handling | Low |
| Integration with existing flow | Low |

**Total estimate:** Small-medium feature, ~3-4 hours of implementation
