# Task Breakdown: Research Progress Tracker

**Generated:** 2026-01-23
**Source:** specs/feat-research-progress-tracker/02-spec.md
**Feature Slug:** feat-research-progress-tracker
**Last Decompose:** 2026-01-23

---

## Overview

Add a visual progress tracker to the contact research feature. When research starts, the modal transitions from the options view to a stepper view showing 6 stages with animated indicators, polling the API every 2 seconds for status updates.

---

## Phase 1: Core Components

### Task 1.1: Create ResearchStepper Component

**Description:** Build a reusable vertical stepper component with three visual states (completed, current, pending) and Framer Motion animations.

**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation component)

**File:** `src/components/research/ResearchStepper.tsx`

**Technical Requirements:**

```typescript
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  label: string;
  icon: React.ReactNode;
}

export interface ResearchStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed, -1 for not started
  status: 'running' | 'completed' | 'failed';
}
```

**Visual States Implementation:**

1. **Completed step** (index < currentStep):
   - Gold checkmark icon (`text-gold-primary`)
   - Dimmed label (`text-muted-foreground`)
   - Left border subtle

2. **Current step** (index === currentStep):
   - Gold icon with pulse animation
   - White text (`text-white`)
   - Gold left accent border (`border-l-2 border-gold-primary`)
   - Subtle gold background (`bg-gold-subtle`)
   - Framer Motion pulse animation:
   ```typescript
   <motion.div
     animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
     transition={{ duration: 1.5, repeat: Infinity }}
   >
     {step.icon}
   </motion.div>
   ```

3. **Pending step** (index > currentStep):
   - Gray icon (`text-muted-foreground/50`)
   - Gray label (`text-muted-foreground/50`)

**Connector Lines:**
- Vertical connector between steps using `border-l border-border`
- Connect from bottom of icon to top of next icon

**Component Structure:**
```tsx
export function ResearchStepper({ steps, currentStep, status }: ResearchStepperProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = status === 'completed' || index < currentStep;
        const isCurrent = status === 'running' && index === currentStep;
        const isPending = index > currentStep && status !== 'completed';

        return (
          <div key={index} className="relative">
            {/* Connector line (except for last item) */}
            {index < steps.length - 1 && (
              <div className={cn(
                "absolute left-4 top-8 bottom-0 w-px",
                isCompleted ? "bg-gold-primary/50" : "bg-border"
              )} />
            )}

            {/* Step row */}
            <div className={cn(
              "flex items-center gap-3 py-3 px-3 rounded-lg transition-all",
              isCurrent && "border-l-2 border-gold-primary bg-gold-subtle"
            )}>
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                isCompleted && "text-gold-primary",
                isCurrent && "text-gold-primary",
                isPending && "text-muted-foreground/50"
              )}>
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {step.icon}
                  </motion.div>
                ) : (
                  step.icon
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-sm font-medium",
                isCompleted && "text-muted-foreground",
                isCurrent && "text-white",
                isPending && "text-muted-foreground/50"
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Component renders all 6 steps
- [ ] Completed steps show gold checkmark
- [ ] Current step has pulse animation and gold accent
- [ ] Pending steps are visually muted
- [ ] Connector lines connect steps vertically
- [ ] All animations are smooth (60fps)

---

### Task 1.2: Create ResearchProgressView Component

**Description:** Build the progress view component that polls the API and renders the stepper with status updates.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1 (ResearchStepper)
**Can run parallel with:** None

**File:** `src/components/research/ResearchProgressView.tsx`

**Props Interface:**
```typescript
interface ResearchProgressViewProps {
  contactName: string;
  runId: string;
  contactId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}
```

**Progress Stage Constants:**
```typescript
import { Search, Linkedin, Globe, FileText, Sparkles, CheckCircle } from 'lucide-react';
import type { Step } from './ResearchStepper';

export const RESEARCH_STEPS: Step[] = [
  { label: 'Preparing search', icon: <Search className="h-5 w-5" /> },
  { label: 'Checking LinkedIn', icon: <Linkedin className="h-5 w-5" /> },
  { label: 'Searching for sources', icon: <Globe className="h-5 w-5" /> },
  { label: 'Reading through findings', icon: <FileText className="h-5 w-5" /> },
  { label: 'Crafting recommendations', icon: <Sparkles className="h-5 w-5" /> },
  { label: 'Finalizing results', icon: <CheckCircle className="h-5 w-5" /> },
];

const PROGRESS_STAGE_MAP: Record<string, number> = {
  'Building search query...': 0,
  'Extracting LinkedIn profile...': 1,
  'Searching the web...': 2,
  'Analyzing findings...': 3,
  'Generating recommendations...': 4,
  'Research complete!': 5,
};

function getStepIndex(progressStage: string | null): number {
  if (!progressStage) return 0;
  return PROGRESS_STAGE_MAP[progressStage] ?? 0;
}
```

**Polling Implementation:**
```typescript
export function ResearchProgressView({
  contactName,
  runId,
  contactId,
  onComplete,
  onError,
}: ResearchProgressViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isSubscribed = true;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/contacts/${contactId}/research/${runId}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch research status');
        }

        const data = await response.json();

        if (!isSubscribed) return;

        // Update step based on progressStage
        const stepIndex = getStepIndex(data.progressStage);
        setCurrentStep(stepIndex);

        // Handle completion
        if (data.status === 'COMPLETED') {
          setStatus('completed');
          clearInterval(intervalId);
          // Delay before closing to show completion state
          setTimeout(() => {
            if (isSubscribed) onComplete();
          }, 1500);
        }

        // Handle failure
        if (data.status === 'FAILED') {
          setStatus('failed');
          clearInterval(intervalId);
          onError(data.errorMessage || 'Research failed');
        }
      } catch (err) {
        if (isSubscribed) {
          setStatus('failed');
          clearInterval(intervalId);
          onError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    };

    // Initial poll
    poll();

    // Poll every 2 seconds
    intervalId = setInterval(poll, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [contactId, runId, onComplete, onError]);

  return (
    <div className="py-4">
      <p className="text-sm text-muted-foreground mb-4">
        Researching {contactName}...
      </p>
      <ResearchStepper
        steps={RESEARCH_STEPS}
        currentStep={currentStep}
        status={status}
      />
      {status === 'completed' && (
        <p className="text-sm text-gold-primary mt-4 text-center">
          Research complete! Loading results...
        </p>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Polls API every 2 seconds
- [ ] Updates stepper based on progressStage
- [ ] Handles COMPLETED status with 1.5s delay before onComplete
- [ ] Handles FAILED status by calling onError
- [ ] Cleans up interval on unmount
- [ ] Uses `cache: 'no-store'` for fresh data

---

### Task 1.3: Modify ResearchOptionsModal for Progress View

**Description:** Update the modal to switch between options view and progress view, and add close warning dialog.

**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2
**Can run parallel with:** None

**File:** `src/components/research/ResearchOptionsModal.tsx`

**New State Variables:**
```typescript
type ModalView = 'options' | 'progress';

// Add these state variables
const [view, setView] = useState<ModalView>('options');
const [runId, setRunId] = useState<string | null>(null);
const [showCloseWarning, setShowCloseWarning] = useState(false);
```

**Modified handleStartResearch:**
```typescript
const handleStartResearch = async () => {
  if (selectedAreas.length === 0) return;

  setIsResearching(true);
  setError(null);

  try {
    const response = await fetch(`/api/contacts/${contactId}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focusAreas: selectedAreas }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Research failed');
    }

    const data = await response.json();

    // Store runId and switch to progress view
    setRunId(data.id);
    setView('progress');
    setIsResearching(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
    setIsResearching(false);
  }
};
```

**Close Warning Handler:**
```typescript
const handleOpenChange = (open: boolean) => {
  if (!open && view === 'progress') {
    // Show warning if trying to close during research
    setShowCloseWarning(true);
  } else {
    onClose();
  }
};

const handleForceClose = () => {
  setShowCloseWarning(false);
  setView('options');
  setRunId(null);
  onClose();
};

const handleResearchComplete = () => {
  setView('options');
  setRunId(null);
  onResearchComplete?.();
  onClose();
  router.refresh();
};

const handleResearchError = (errorMessage: string) => {
  setError(errorMessage);
  setView('options');
  setRunId(null);
};
```

**Updated Dialog Content:**
```tsx
<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent className="sm:max-w-md">
    {view === 'options' ? (
      <>
        <DialogHeader>
          <DialogTitle>Research {contactName}</DialogTitle>
          <DialogDescription>
            Select what you want to learn about this person.
          </DialogDescription>
        </DialogHeader>
        {/* ... existing options UI ... */}
      </>
    ) : (
      <>
        <DialogHeader>
          <DialogTitle>Researching {contactName}</DialogTitle>
          <DialogDescription>
            We&apos;re searching the web for information. This usually takes about a minute.
          </DialogDescription>
        </DialogHeader>
        <ResearchProgressView
          contactName={contactName}
          runId={runId!}
          contactId={contactId}
          onComplete={handleResearchComplete}
          onError={handleResearchError}
        />
      </>
    )}
  </DialogContent>
</Dialog>

{/* Close Warning Dialog */}
<AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Research in progress</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to close? The research will continue in the
        background, but you won&apos;t see the progress.
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

**New Imports:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ResearchProgressView } from './ResearchProgressView';
```

**Acceptance Criteria:**
- [ ] Modal switches from options to progress view on start
- [ ] runId is captured from POST response
- [ ] Close warning shows when trying to close during research
- [ ] "Keep watching" returns to progress view
- [ ] "Close anyway" closes modal and resets state
- [ ] Completion triggers router.refresh() and closes modal
- [ ] Error returns to options view with error message

---

## Phase 2: Polish & Testing

### Task 2.1: Manual Testing

**Description:** Test all user flows manually to verify the feature works correctly.

**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3
**Can run parallel with:** None

**Test Cases:**

1. **Happy Path:**
   - Click "Research" on contact detail page
   - Select focus areas
   - Click "Start Research"
   - Verify modal transitions to progress view
   - Watch steps progress with animations
   - Verify completion animation plays
   - Verify modal closes and page refreshes

2. **Error Path:**
   - If research fails, verify error message shows
   - Verify retry option works

3. **Close Warning:**
   - Start research
   - Try to close modal (click X or outside)
   - Verify warning dialog appears
   - Test "Keep watching" returns to progress
   - Test "Close anyway" closes modal

4. **Edge Cases:**
   - Rapid clicking start button (should be debounced)
   - Closing modal immediately after start
   - Network interruption during polling

**Acceptance Criteria:**
- [ ] All happy path scenarios work
- [ ] Error handling works correctly
- [ ] Close warning prevents accidental closure
- [ ] Animations are smooth on all steps
- [ ] No console errors during flow

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/research/ResearchStepper.tsx` | **New** | Vertical stepper with 3 visual states |
| `src/components/research/ResearchProgressView.tsx` | **New** | Progress view with polling logic |
| `src/components/research/ResearchOptionsModal.tsx` | **Modified** | Add view switching and close warning |

---

## Execution Order

1. **Task 1.1** - Create ResearchStepper (foundation)
2. **Task 1.2** - Create ResearchProgressView (uses stepper)
3. **Task 1.3** - Modify ResearchOptionsModal (integrates both)
4. **Task 2.1** - Manual testing (validates feature)

Total: 4 tasks, estimated implementation time: ~1-2 hours
