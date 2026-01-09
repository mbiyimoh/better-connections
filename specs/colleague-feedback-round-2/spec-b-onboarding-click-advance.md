# Spec B: Onboarding Click-to-Advance

**Slug:** onboarding-click-advance
**Author:** Claude Code
**Date:** 2026-01-08
**Priority:** P1 (UX Polish)
**Estimated Effort:** 2 hours

---

## Problem

The current onboarding slides auto-advance every ~6.6 seconds. User feedback indicates this is too fast for first-time viewers who need time to read and absorb the content. Users want to control the pace.

## Solution

Convert from auto-advance to **click-to-advance** with:
- **Dot indicator** showing current slide position (e.g., 6 dots, current one highlighted)
- **"Tap anywhere to continue"** hint text on first slide
- Keep **tap left/right navigation** for going back/forward
- **Pause on final slide** until CTA is clicked (existing behavior)

## User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         [ VISUAL ]                               │
│                                                                  │
│                        HEADLINE                                  │
│                                                                  │
│                      Subline text                                │
│                                                                  │
│                                                                  │
│                    ● ○ ○ ○ ○ ○                                  │  ← Dot indicator
│                                                                  │
│              Tap anywhere to continue →                          │  ← Hint (slide 1 only)
│                                                                  │
│  ◀ tap left                                    tap right ▶       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### File: `src/components/onboarding/StoryOnboarding.tsx`

**Change 1: Remove auto-advance timer (lines 25-44)**

```tsx
// REMOVE this entire useEffect
useEffect(() => {
  if (currentSlide === TOTAL_SLIDES - 1) return;
  const interval = setInterval(() => {
    setProgress(prev => { ... });
  }, 100);
  return () => clearInterval(interval);
}, [currentSlide]);

// REMOVE progress state (no longer needed)
const [progress, setProgress] = useState(0);
```

**Change 2: Simplify tap handler (around line 54)**

```tsx
// Keep existing tap navigation but remove progress reset
const handleTap = (e: React.MouseEvent) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x > rect.width / 2) {
    // Right tap → next slide
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(c => c + 1);
    }
  } else if (currentSlide > 0) {
    // Left tap → previous slide
    setCurrentSlide(c => c - 1);
  }
};
```

**Change 3: Replace StoryProgressBar with DotIndicator**

```tsx
// In render, replace:
<StoryProgressBar currentSlide={currentSlide} progress={progress} totalSlides={TOTAL_SLIDES} />

// With:
<DotIndicator currentSlide={currentSlide} totalSlides={TOTAL_SLIDES} />

// Show hint on first slide only
{currentSlide === 0 && (
  <p className="text-text-tertiary text-sm animate-pulse">
    Tap anywhere to continue →
  </p>
)}
```

### New File: `src/components/onboarding/DotIndicator.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';

interface DotIndicatorProps {
  currentSlide: number;
  totalSlides: number;
}

export function DotIndicator({ currentSlide, totalSlides }: DotIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-300',
            index === currentSlide
              ? 'bg-gold-primary scale-125'
              : index < currentSlide
              ? 'bg-gold-primary/50'
              : 'bg-white/20'
          )}
          aria-label={`Slide ${index + 1} of ${totalSlides}`}
          aria-current={index === currentSlide ? 'step' : undefined}
        />
      ))}
    </div>
  );
}
```

### File: `src/components/onboarding/StoryProgressBar.tsx`

**Option A:** Delete file (no longer needed)
**Option B:** Keep for potential future use

Recommend Option A - delete unused code.

## Accessibility

- Dot indicator includes `aria-label` for screen readers
- `aria-current="step"` marks current slide
- Tap targets remain large (full screen)
- No auto-advance = no timing pressure for users

## Animation

- Dots scale up slightly when active (`scale-125`)
- Smooth transition between states (`transition-all duration-300`)
- "Tap anywhere" hint pulses gently (`animate-pulse`)

## Testing

1. Navigate to `/onboarding` (clear `hasCompletedOnboarding` flag if needed)
2. Verify slides do NOT auto-advance
3. Tap right side → advances to next slide
4. Tap left side → goes back to previous slide
5. Verify dot indicator updates correctly
6. Verify "Tap anywhere to continue" shows on slide 1 only
7. Verify CTA button on final slide works
8. Complete onboarding → verify redirect to `/contacts/new`

## Files Changed

- `src/components/onboarding/StoryOnboarding.tsx` (major changes)
- `src/components/onboarding/DotIndicator.tsx` (new file)
- `src/components/onboarding/StoryProgressBar.tsx` (delete)

## Rollback

Revert StoryOnboarding.tsx changes, restore StoryProgressBar usage. No database changes.
