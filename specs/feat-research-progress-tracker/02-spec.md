# Research Progress Tracker - Implementation Spec

**Slug:** feat-research-progress-tracker
**Author:** Claude Code
**Date:** 2026-01-13
**Status:** Ready for Implementation
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## Overview

Add a step-by-step visual progress tracker to the contact research feature. When a user starts research, the options modal transitions to a progress view showing 5 stages with animated indicators.

---

## User Flow

```
1. User clicks "Research" on contact detail page
2. ResearchOptionsModal opens - user selects focus areas
3. User clicks "Start Research"
4. Modal transitions to progress view (same modal, different content)
5. Progress view shows 5 steps, polls for updates every 2s
6. Steps animate as research progresses
7. On completion: success animation (1.5s) → auto-close → router.refresh()
8. On error: show error message with retry/close options
9. If user tries to close during research: show warning dialog
```

---

## Components

### 1. ResearchProgressView (New)

Internal component rendered inside ResearchOptionsModal when research is in progress.

**File:** `src/components/research/ResearchProgressView.tsx`

**Props:**
```typescript
interface ResearchProgressViewProps {
  contactName: string;
  runId: string;
  contactId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}
```

**Responsibilities:**
- Poll `/api/contacts/{contactId}/research/{runId}` every 2 seconds
- Map `progressStage` to step index (0-4)
- Render ResearchStepper with current step
- Handle completion (1.5s delay then call onComplete)
- Handle errors (call onError with message)

### 2. ResearchStepper (New)

Reusable vertical stepper component.

**File:** `src/components/research/ResearchStepper.tsx`

**Props:**
```typescript
interface Step {
  label: string;
  icon: React.ReactNode;
}

interface ResearchStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed, -1 for not started
  status: 'running' | 'completed' | 'failed';
}
```

**Visual States:**
- `completed` (index < currentStep): Gold checkmark, dimmed text
- `current` (index === currentStep): Gold icon with pulse, white text, gold left accent
- `pending` (index > currentStep): Gray icon, gray text

### 3. ResearchOptionsModal (Modified)

**File:** `src/components/research/ResearchOptionsModal.tsx`

**Changes:**
- Add `view` state: `'options' | 'progress'`
- Add `runId` state to track active research
- Add `showCloseWarning` state for close confirmation
- When research starts: create run, get `runId`, switch to progress view
- Render ResearchProgressView when `view === 'progress'`
- Intercept close attempts during progress to show warning

---

## API

### Existing Endpoint (Reuse)

`GET /api/contacts/{contactId}/research/{runId}`

Already returns:
```typescript
{
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progressStage: string | null;
  errorMessage: string | null;
  // ... other fields
}
```

No API changes needed - just need to poll this endpoint.

---

## Progress Stage Mapping

```typescript
const PROGRESS_STAGES = [
  { stage: 'Building search query...', label: 'Preparing search', icon: Search },
  { stage: 'Searching the web...', label: 'Searching for sources', icon: Globe },
  { stage: 'Analyzing findings...', label: 'Reading through findings', icon: FileText },
  { stage: 'Generating recommendations...', label: 'Crafting recommendations', icon: Sparkles },
  { stage: 'Research complete!', label: 'Finalizing results', icon: CheckCircle },
];

function getStepIndex(progressStage: string | null): number {
  if (!progressStage) return 0;
  const index = PROGRESS_STAGES.findIndex(s => s.stage === progressStage);
  return index >= 0 ? index : 0;
}
```

---

## Styling

### Colors (from design system)

```typescript
// Current step
'border-l-2 border-gold-primary bg-gold-subtle'
'text-white'

// Completed step
'text-gold-primary' // checkmark
'text-muted-foreground' // label

// Pending step
'text-muted-foreground/50' // icon
'text-muted-foreground/50' // label

// Connector line
'border-l border-border' // between steps
```

### Animations

```typescript
// Current step icon pulse
<motion.div
  animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
  transition={{ duration: 1.5, repeat: Infinity }}
>
  {icon}
</motion.div>

// Step transition
<motion.div
  initial={{ opacity: 0.5 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
```

---

## Close Warning Dialog

When user attempts to close during research:

```tsx
<AlertDialog open={showCloseWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Research in progress</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to close? The research will continue in the
        background, but you won't see the progress.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep watching</AlertDialogCancel>
      <AlertDialogAction onClick={handleForceClose}>
        Close anyway
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Error State

When `status === 'FAILED'`:

```tsx
<div className="text-center py-8">
  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
  <h3 className="text-lg font-medium mb-2">Research failed</h3>
  <p className="text-muted-foreground mb-6">
    {errorMessage || 'Something went wrong. Please try again.'}
  </p>
  <div className="flex gap-3 justify-center">
    <Button variant="outline" onClick={onClose}>Close</Button>
    <Button onClick={handleRetry}>Try again</Button>
  </div>
</div>
```

---

## Success State

When `status === 'COMPLETED'`:

1. All steps show as completed (gold checkmarks)
2. Brief success message: "Research complete!"
3. 1.5 second delay
4. Auto-close modal
5. Call `onComplete()` which triggers `router.refresh()`

---

## Implementation Tasks

### Task 1: Create ResearchStepper Component
- [ ] Create `src/components/research/ResearchStepper.tsx`
- [ ] Implement step rendering with 3 visual states
- [ ] Add Framer Motion pulse animation for current step
- [ ] Add connector lines between steps
- [ ] Export Step type and RESEARCH_STEPS constant

### Task 2: Create ResearchProgressView Component
- [ ] Create `src/components/research/ResearchProgressView.tsx`
- [ ] Implement polling logic with useEffect + setInterval
- [ ] Map progressStage to step index
- [ ] Handle completion with 1.5s delay
- [ ] Handle error state with retry option

### Task 3: Modify ResearchOptionsModal
- [ ] Add view state management ('options' | 'progress')
- [ ] Add runId state
- [ ] Modify handleStartResearch to:
  - Make API call
  - Extract runId from response
  - Switch to progress view
- [ ] Add close warning dialog
- [ ] Intercept onOpenChange to check if research is running

### Task 4: Testing
- [ ] Test happy path: start → progress → complete
- [ ] Test error path: start → progress → fail → retry
- [ ] Test close warning during research
- [ ] Test rapid polling doesn't cause issues
- [ ] Verify animations are smooth

---

## File Changes Summary

| File | Change Type |
|------|-------------|
| `src/components/research/ResearchStepper.tsx` | New |
| `src/components/research/ResearchProgressView.tsx` | New |
| `src/components/research/ResearchOptionsModal.tsx` | Modified |

---

## Dependencies

- `framer-motion` (already installed)
- `lucide-react` (already installed)
- `@/components/ui/alert-dialog` (already available)

No new dependencies required.
