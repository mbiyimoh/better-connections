# Sequential If-Statement Animations

**Slug:** feat-if-statement-sequential-animations
**Author:** Claude Code
**Date:** 2026-01-23
**Branch:** main
**Related:** ScrollytellingSection.tsx, DissolvingBoundary component

---

## 1) Intent & Assumptions

**Task brief:** Redesign the 3 "if" statement animations in the scrollytelling intro to show one at a time (instead of stacking), with each having a unique exit animation involving a persistent glowing orb that carries between statements.

**Assumptions:**
- The glowing orb should match the existing one in `DissolvingBoundary` component
- Animations will be triggered by scroll position (slide 4 becoming active)
- Text should be slightly larger since only one statement is visible at a time
- Each statement "breathes" (subtle pulse) for 3 seconds before its exit animation
- The final statement exits into a new gold "revelation" text

**Out of scope:**
- Changes to other slides in the scrollytelling
- Mobile-specific animation variations
- Sound effects or haptic feedback

---

## 2) Pre-reading Log

- `src/app/m33t/[slug]/components/ScrollytellingSection.tsx`: Main component containing the "if" statements (lines 557-583), DissolvingBoundary component with existing glowing orb pattern (lines 134-246)
- `src/lib/design-system.ts`: BRAND_GOLD colors and GOLD_FOIL_GRADIENT for consistency
- Research report: Comprehensive Framer Motion techniques for all required effects

---

## 3) Codebase Map

**Primary components/modules:**
- `ScrollytellingSection.tsx`: Main scrollytelling with 5 slides, slide 4 contains "if" statements
- `DissolvingBoundary`: Existing component with particle dissolve + glowing center orb

**Shared dependencies:**
- `framer-motion`: Already imported (motion, useScroll, useTransform, AnimatePresence)
- `BRAND_GOLD`, `GOLD_FOIL_GRADIENT` from design-system.ts

**Data flow:**
- `activeSlide` state (0-4) determines which slide is visible
- `visibleIfStatements` state (0-3) currently controls which statements are shown
- Need to replace with phase-based animation state machine

**Potential blast radius:**
- Only affects slide 4 of scrollytelling
- May need to extend `onComplete` callback timing

---

## 4) Root Cause Analysis

N/A - This is a feature enhancement, not a bug fix.

---

## 5) Research Findings

### Key Techniques (from research-expert)

**1. Rubber Band Snap (Statement 1: "idea" ↔ "execution")**
- Use dual spring configurations: high damping (40) → low damping (15)
- Phase transition: drift apart slowly, then snap together rapidly
- Words collapse into glowing orb position

**2. Text Erasing/Scrubbing (Statement 2)**
- CSS `mask-image` or `clip-path` animation synchronized with orb movement
- Orb moves back-and-forth over specific words to "erase" them
- Remaining words then collapse into orb

**3. Collapse to Explosion (Statement 3)**
- Three-phase: gray out → collapse to vibrating point → stagger-reveal new text
- Use scale + position animation to center point
- Vibration via keyframe scale oscillation
- Explosion via staggerChildren with spring physics

**4. Glowing Orb**
- Multiple layered box-shadows (4 layers) with increasing blur
- Breathing effect: animate scale (1→1.15→1) + boxShadow intensity
- Match existing DissolvingBoundary orb styling

**5. Sequential Coordination**
- `useAnimate` hook for complex timing control
- Phase state machine: idle → statement1 → exit1 → statement2 → exit2 → statement3 → exit3 → reveal
- `onAnimationComplete` callbacks to trigger next phase

### Recommended Approach

Use a **state machine** with phases, controlled by `useAnimate` hook for precise sequencing:

```
Phase Flow:
idle → show1 → breathe1 → exit1 (rubber band) → orbHover1 →
show2 → breathe2 → exit2 (eraser) → orbHover2 →
show3 → breathe3 → exit3 (collapse) → reveal (gold explosion)
```

**No additional libraries needed** - Framer Motion provides all required functionality.

---

## 6) Clarification

1. **Revelation text content:** What should the gold text say after the third statement's orb explodes? Something like "The answer is already within you" or should it transition directly to the next slide?

2. **Orb size consistency:** Should the orb be the exact same size as the one in DissolvingBoundary (currently ~16-40px), or slightly larger/smaller?

3. **Statement 1 detail:** When "idea" and "execution" snap together into the orb, should the rest of the words ("if the distance between" and "collapsed?") fade out simultaneously, or should they dissolve in a specific pattern?

4. **Statement 2 eraser direction:** Should the orb erase "we don't have the resources for that" from left-to-right, right-to-left, or scrub back-and-forth multiple times?

5. **Text size:** You mentioned "slightly bigger" - should the if-statements be `text-2xl md:text-3xl` (up from current `text-lg md:text-xl`)?

6. **Breathing intensity:** How pronounced should the "breathing" pulse be? Subtle (scale 1→1.05→1) or more noticeable (scale 1→1.15→1)?

---

## 7) Implementation Approach

### New Component: `IfStatementSequence`

Create a dedicated component for the if-statement animation sequence:

```typescript
// Simplified structure
const IfStatementSequence = ({ isActive, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [scope, animate] = useAnimate();

  // State machine drives animation sequence
  useEffect(() => {
    if (isActive && phase === 'idle') {
      runSequence();
    }
  }, [isActive]);

  return (
    <div ref={scope}>
      <GlowingOrb phase={phase} />
      <AnimatePresence mode="wait">
        {phase.includes('1') && <Statement1 ... />}
        {phase.includes('2') && <Statement2 ... />}
        {phase.includes('3') && <Statement3 ... />}
        {phase === 'reveal' && <RevelationText ... />}
      </AnimatePresence>
    </div>
  );
};
```

### Animation Timing (Total ~30-35 seconds)

| Phase | Duration | Description |
|-------|----------|-------------|
| show1 | 0.5s | Statement 1 fades in |
| breathe1 | 3s | Subtle pulse |
| exit1 | 2.5s | Words drift, snap, collapse to orb |
| orbHover1 | 0.5s | Orb floats to position |
| show2 | 0.5s | Statement 2 fades in |
| breathe2 | 3s | Subtle pulse |
| exit2 | 2.5s | Orb erases words, remaining collapse |
| orbHover2 | 0.5s | Orb floats to position |
| show3 | 0.5s | Statement 3 fades in |
| breathe3 | 3s | Subtle pulse |
| exit3 | 2s | Text grays, orb shrinks/vibrates |
| reveal | 1.5s | Orb explodes into gold text |

---

## 8) Files to Modify

1. `src/app/m33t/[slug]/components/ScrollytellingSection.tsx`
   - Extract if-statement section into new component
   - Replace current simple opacity transitions

2. New file: `src/app/m33t/[slug]/components/IfStatementSequence.tsx`
   - Contains all animation logic for the 3 statements
   - Exports single component used by ScrollytellingSection

3. Potentially: `src/app/m33t/[slug]/components/GlowingOrb.tsx`
   - Reusable orb component (may share with DissolvingBoundary)
