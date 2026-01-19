# Task Breakdown: DissolvingBoundary One-Shot Particle Effect

**Generated:** 2026-01-18
**Source:** specs/fix-dissolve-animation/02-specification.md
**Last Decompose:** 2026-01-18

---

## Overview

Replace the looping CSS animation in `DissolvingBoundary` with a one-shot Framer Motion particle dissolve effect. Single file modification, no new dependencies.

**Total Tasks:** 4
**Estimated Scope:** Small (single component modification)

---

## Phase 1: Implementation

### Task 1.1: Add Particle Types and Constants

**Description:** Add TypeScript interface and constants for particle generation
**Size:** Small
**Priority:** High
**Dependencies:** None

**Implementation:**

Add to `src/app/m33t/[slug]/components/ScrollytellingSection.tsx` after existing imports:

```typescript
// ============================================================================
// TYPES
// ============================================================================
interface Particle {
  id: number;
  x: number;
  y: number;
  endY: number;
  endX: number;
  delay: number;
  duration: number;
  size: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const PARTICLE_COUNT = 35;
const TRIGGER_DELAY_MS = 1000; // 1 second delay before dissolve

// Container dimensions (matches w-64 h-48)
const CONTAINER_WIDTH = 256;
const CONTAINER_HEIGHT = 192;

// SVG viewBox dimensions
const SVG_WIDTH = 200;
const SVG_HEIGHT = 150;

// Rectangle bounds in SVG coordinates
const RECT = { x: 20, y: 15, width: 160, height: 120 };
```

**Code to Remove:**
```typescript
// DELETE: BOUNDARY_PARTICLES constant (lines 14-29)
const BOUNDARY_PARTICLES = [
  { cx: 20, cy: 23 }, { cx: 180, cy: 23 },
  // ... all 28 positions
];
```

**Acceptance Criteria:**
- [ ] Particle interface defined with all required properties
- [ ] Constants match container and SVG dimensions
- [ ] Old BOUNDARY_PARTICLES constant removed
- [ ] TypeScript compiles without errors

---

### Task 1.2: Implement Particle Generation Function

**Description:** Create function to generate particles positioned along rectangle edges
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

**Implementation:**

Add after constants:

```typescript
// ============================================================================
// PARTICLE GENERATION
// ============================================================================
function generateEdgeParticles(count: number): Particle[] {
  const particles: Particle[] = [];

  // Scale factors from SVG to container
  const scaleX = CONTAINER_WIDTH / SVG_WIDTH;
  const scaleY = CONTAINER_HEIGHT / SVG_HEIGHT;

  const rectX = RECT.x * scaleX;
  const rectY = RECT.y * scaleY;
  const rectWidth = RECT.width * scaleX;
  const rectHeight = RECT.height * scaleY;

  const perimeter = 2 * (rectWidth + rectHeight);

  for (let i = 0; i < count; i++) {
    const position = (i / count) * perimeter;
    let x: number, y: number;

    if (position < rectWidth) {
      // Top edge
      x = rectX + position;
      y = rectY;
    } else if (position < rectWidth + rectHeight) {
      // Right edge
      x = rectX + rectWidth;
      y = rectY + (position - rectWidth);
    } else if (position < 2 * rectWidth + rectHeight) {
      // Bottom edge
      x = rectX + rectWidth - (position - rectWidth - rectHeight);
      y = rectY + rectHeight;
    } else {
      // Left edge
      x = rectX;
      y = rectY + rectHeight - (position - 2 * rectWidth - rectHeight);
    }

    particles.push({
      id: i,
      x,
      y,
      // Upward evaporation: primarily negative Y, slight X drift
      endY: -80 - Math.random() * 70,  // -80 to -150
      endX: (Math.random() - 0.5) * 40, // -20 to +20
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 2,
    });
  }

  return particles;
}
```

**Acceptance Criteria:**
- [ ] Particles distributed evenly around rectangle perimeter
- [ ] All particles have upward drift (negative endY)
- [ ] Horizontal drift is subtle (-20 to +20)
- [ ] Staggered delays (0 to 0.3s)
- [ ] Varied durations (0.8 to 1.2s)

---

### Task 1.3: Replace DissolvingBoundary Component

**Description:** Replace entire component with Framer Motion implementation
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2

**Import Update (line 4):**
```typescript
// Change from:
import { motion, useScroll, useTransform } from 'framer-motion';

// To:
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
```

**New Component Implementation:**

Replace the entire `DissolvingBoundary` function (lines 64-120) with:

```typescript
/**
 * DissolvingBoundary - Visual metaphor for "constraints dissolving"
 *
 * Animation phases:
 * 1. IDLE: Solid gold rectangle visible (isActive=false)
 * 2. WAITING: Hold for 1 second after slide becomes active
 * 3. DISSOLVING: Rectangle fades, particles evaporate upward
 * 4. COMPLETE: Only center glow remains
 *
 * One-shot animation - resets only when component remounts (via "Replay Intro")
 */
function DissolvingBoundary({ isActive }: { isActive: boolean }) {
  const [isDissolving, setIsDissolving] = useState(false);

  // Generate particles once on mount
  const particles = useMemo(() => generateEdgeParticles(PARTICLE_COUNT), []);

  // Trigger dissolve after delay when slide becomes active
  useEffect(() => {
    if (isActive && !isDissolving) {
      const timer = setTimeout(() => {
        setIsDissolving(true);
      }, TRIGGER_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [isActive, isDissolving]);

  return (
    <div className="relative w-64 h-48 mx-auto mb-12">
      {/* SVG Layer - Rectangle and center glow */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="absolute inset-0 w-full h-full"
      >
        {/* Solid rectangle - fades out when dissolving */}
        <motion.rect
          x={RECT.x}
          y={RECT.y}
          width={RECT.width}
          height={RECT.height}
          fill="none"
          stroke={GOLD}
          strokeWidth="2"
          initial={{ opacity: 0.8 }}
          animate={{
            opacity: isDissolving ? 0 : 0.8,
          }}
          transition={{
            duration: 0.4,
            ease: 'easeOut',
          }}
        />

        {/* Glowing center point - persists */}
        <circle
          cx="100"
          cy="75"
          r="4"
          fill={GOLD}
          className="animate-pulse"
          style={{ filter: 'blur(2px)' }}
        />
        <circle cx="100" cy="75" r="2" fill="#fff" />
      </svg>

      {/* Particle Layer - Absolute positioned divs */}
      <AnimatePresence>
        {isDissolving && particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: GOLD,
            }}
            initial={{
              opacity: 0.8,
              scale: 1,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: p.endX,
              y: p.endY,
            }}
            transition={{
              delay: p.delay,
              duration: p.duration,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Code to Remove:**
```tsx
// DELETE: Inline CSS keyframes (was at end of old component)
<style>{`
  @keyframes float-particle {
    0% { transform: translate(0, 0); opacity: 0.6; }
    50% { opacity: 0.8; }
    100% { transform: translate(var(--dx, 20px), var(--dy, -30px)); opacity: 0; }
  }
`}</style>
```

**Import Update (line 3):**
```typescript
// Ensure useMemo is imported
import { useRef, useEffect, useState, useMemo } from 'react';
```

**Acceptance Criteria:**
- [ ] AnimatePresence imported from framer-motion
- [ ] useMemo imported from react
- [ ] Solid rectangle (no dashes) visible initially
- [ ] 1 second delay before dissolve starts
- [ ] Rectangle fades to opacity 0
- [ ] Particles animate upward and fade
- [ ] Only center glow remains after animation
- [ ] No CSS keyframes in component
- [ ] No looping - animation plays once

---

### Task 1.4: Manual Testing & Verification

**Description:** Verify animation behavior on actual event page
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3

**Test Checklist:**

1. **Initial State:**
   - [ ] Navigate to a NO EDGES event (e.g., `/m33t/no-edges-...`)
   - [ ] Scroll to slide 2 ("constraints no longer exist")
   - [ ] Verify solid gold rectangle appears (no dashes)

2. **Timing:**
   - [ ] Wait 1 second - rectangle should hold steady
   - [ ] After 1s, dissolve should begin

3. **Dissolve Effect:**
   - [ ] Particles appear at rectangle edges
   - [ ] Particles drift upward (evaporation effect)
   - [ ] Rectangle fades out during particle animation
   - [ ] ~35 particles visible (subtle, not overwhelming)

4. **Completion:**
   - [ ] Animation completes (no looping)
   - [ ] Only glowing center point remains
   - [ ] Total animation time ~2.5s from trigger

5. **Reset:**
   - [ ] Complete scrollytelling (scroll to end)
   - [ ] Click "Replay Intro" button
   - [ ] Scroll back to slide 2
   - [ ] Verify animation plays again from beginning

6. **Mobile:**
   - [ ] Test on mobile viewport (resize browser)
   - [ ] Animation performs smoothly

**Acceptance Criteria:**
- [ ] All 6 test categories pass
- [ ] No console errors
- [ ] Animation feels natural and elegant

---

## Execution Strategy

**Recommended Order:** Sequential (1.1 → 1.2 → 1.3 → 1.4)

**Single File Change:** All code changes in `src/app/m33t/[slug]/components/ScrollytellingSection.tsx`

**Risk:** Low - isolated component with no external dependencies

**Rollback:** Revert single file if issues arise
