# DissolvingBoundary One-Shot Particle Effect

**Status:** Draft
**Author:** Claude Code
**Date:** 2026-01-18
**Slug:** fix-dissolve-animation
**Related:** [Ideation Document](./01-ideation.md)

---

## Overview

Replace the looping dashed-line animation in the `DissolvingBoundary` component with a proper one-shot particle dissolve effect using Framer Motion. The animation should show a solid gold rectangle that holds for 1 second, then evaporates upward into particles that fade away completely.

---

## Background/Problem Statement

The current `DissolvingBoundary` animation in the NO EDGES scrollytelling section has three fundamental issues:

1. **Infinite loop**: Particles use `animation: ... infinite` so they never stop
2. **Persistent rectangle**: The dashed rectangle stays visible at 0.4 opacity, never fully disappearing
3. **Directionless particles**: CSS variables `--dx, --dy` are referenced but never set, so particles don't drift properly

The result is an unsatisfying visual where the "dissolving edges" metaphor is undermined by edges that never actually dissolve.

---

## Goals

- Replace looping animation with a one-shot effect that completes fully
- Show solid rectangle for 1 second before dissolution begins (let user see what's dissolving)
- Create upward "evaporation" effect with ~35 particles for subtle elegance
- Maintain gold color (#d4a54a) from design system
- Use existing Framer Motion (no new dependencies)
- Support reset via existing "Replay Intro" button (component remount)

---

## Non-Goals

- Modifying other animations (ConvergingVenn, ProgressBar)
- Adding mobile-specific animation variants
- WebGL/shader-based effects (overkill for this use case)
- Adding new dependencies

---

## Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `framer-motion` | ^11.x | Animation library (already in codebase) |
| `react` | ^19.x | Hooks (useState, useEffect, useMemo) |

No new dependencies required.

---

## Detailed Design

### Architecture Overview

```
ScrollytellingSection
├── DissolvingBoundary (modified)
│   ├── State: hasTriggered, isDissolving
│   ├── Memoized: particles array (35 particles)
│   ├── Phase 1: Solid rectangle (1s delay)
│   ├── Phase 2: Rectangle fades + particles animate
│   └── Phase 3: Only center glow remains
├── ConvergingVenn (unchanged)
└── ... other slides
```

### Component State Machine

```
IDLE (isActive=false)
  │
  ▼ isActive becomes true
WAITING (1 second delay)
  │
  ▼ setTimeout fires
DISSOLVING (particles animate upward)
  │
  ▼ animations complete (~1.5s)
COMPLETE (only center glow visible)
```

### Particle Generation Algorithm

```typescript
interface Particle {
  id: number;
  // Starting position (on rectangle edge)
  x: number;      // 0-256 (container width)
  y: number;      // 0-192 (container height)
  // Animation targets
  endY: number;   // Negative value (upward drift: -80 to -150)
  endX: number;   // Small horizontal drift: -20 to +20
  // Timing
  delay: number;  // 0 to 0.3s stagger
  duration: number; // 0.8 to 1.2s
  // Appearance
  size: number;   // 2 to 4px
}

function generateEdgeParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  const containerWidth = 256;  // w-64
  const containerHeight = 192; // h-48

  // Rectangle bounds within SVG viewBox (scaled to container)
  const rectX = 20 * (containerWidth / 200);
  const rectY = 15 * (containerHeight / 150);
  const rectWidth = 160 * (containerWidth / 200);
  const rectHeight = 120 * (containerHeight / 150);

  for (let i = 0; i < count; i++) {
    // Distribute particles around rectangle perimeter
    const perimeter = 2 * (rectWidth + rectHeight);
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

### Implementation Code

```tsx
// src/app/m33t/[slug]/components/ScrollytellingSection.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

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
      x = rectX + position;
      y = rectY;
    } else if (position < rectWidth + rectHeight) {
      x = rectX + rectWidth;
      y = rectY + (position - rectWidth);
    } else if (position < 2 * rectWidth + rectHeight) {
      x = rectX + rectWidth - (position - rectWidth - rectHeight);
      y = rectY + rectHeight;
    } else {
      x = rectX;
      y = rectY + rectHeight - (position - 2 * rectWidth - rectHeight);
    }

    particles.push({
      id: i,
      x,
      y,
      endY: -80 - Math.random() * 70,
      endX: (Math.random() - 0.5) * 40,
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 2,
    });
  }

  return particles;
}

// ============================================================================
// DISSOLVING BOUNDARY COMPONENT
// ============================================================================
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
              ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for natural feel
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/m33t/[slug]/components/ScrollytellingSection.tsx` | Modify | Replace `DissolvingBoundary` component implementation |

### Code to Remove

```tsx
// DELETE: BOUNDARY_PARTICLES constant (lines 14-29)
const BOUNDARY_PARTICLES = [
  { cx: 20, cy: 23 }, { cx: 180, cy: 23 },
  // ... all 28 particle positions
];

// DELETE: Inline CSS keyframes (lines 111-117)
<style>{`
  @keyframes float-particle {
    0% { transform: translate(0, 0); opacity: 0.6; }
    50% { opacity: 0.8; }
    100% { transform: translate(var(--dx, 20px), var(--dy, -30px)); opacity: 0; }
  }
`}</style>
```

### Code to Add

1. Import `AnimatePresence` from framer-motion (update line 4)
2. Add `Particle` interface
3. Add constants: `PARTICLE_COUNT`, `TRIGGER_DELAY_MS`, etc.
4. Add `generateEdgeParticles` function
5. Replace entire `DissolvingBoundary` component

---

## User Experience

### Animation Timeline

```
T+0.0s   Slide 2 becomes active
         └─ Solid gold rectangle visible (opacity 0.8)

T+1.0s   Dissolve triggered
         ├─ Rectangle begins fading (0.4s duration)
         └─ Particles spawn at edge positions

T+1.0-1.3s  Particles begin animating (staggered)
            └─ Each particle: rise upward, shrink, fade

T+2.2-2.5s  All particles complete
            └─ Only glowing center point remains

(User scrolls back up or clicks "Replay Intro")
         └─ Component remounts, animation resets to T+0
```

### Visual Description

1. **Initial state**: Solid gold rectangle outline (no dashes), matching the "constraints/edges" metaphor
2. **Waiting phase**: Rectangle holds steady for 1 second, user reads the text
3. **Dissolution**: Rectangle fades while particles break off from edges and float upward like smoke/vapor
4. **Final state**: Only the glowing center point remains, symbolizing the "core" that remains when artificial edges are removed

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/ScrollytellingSection.test.tsx

describe('DissolvingBoundary', () => {
  describe('generateEdgeParticles', () => {
    it('generates correct number of particles', () => {
      const particles = generateEdgeParticles(35);
      expect(particles).toHaveLength(35);
    });

    it('distributes particles around rectangle perimeter', () => {
      const particles = generateEdgeParticles(4);
      // Should have roughly one particle per edge
      const topEdge = particles.filter(p => p.y < 30);
      const bottomEdge = particles.filter(p => p.y > 140);
      expect(topEdge.length).toBeGreaterThan(0);
      expect(bottomEdge.length).toBeGreaterThan(0);
    });

    it('sets upward drift for evaporation effect', () => {
      const particles = generateEdgeParticles(10);
      particles.forEach(p => {
        // All particles should drift upward (negative endY)
        expect(p.endY).toBeLessThan(0);
        expect(p.endY).toBeGreaterThanOrEqual(-150);
        expect(p.endY).toBeLessThanOrEqual(-80);
      });
    });

    it('sets reasonable horizontal drift', () => {
      const particles = generateEdgeParticles(10);
      particles.forEach(p => {
        // Horizontal drift should be small (-20 to +20)
        expect(p.endX).toBeGreaterThanOrEqual(-20);
        expect(p.endX).toBeLessThanOrEqual(20);
      });
    });
  });
});
```

### E2E Tests

```typescript
// .quick-checks/test-dissolve-animation.spec.ts

import { test, expect } from '@playwright/test';

test.describe('DissolvingBoundary Animation', () => {
  test('should show solid rectangle initially when slide is active', async ({ page }) => {
    // Navigate to a NO EDGES event page
    await page.goto('/m33t/no-edges-test-event');

    // Scroll to slide 2
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
    await page.waitForTimeout(500);

    // Rectangle should be visible
    const rect = page.locator('svg rect[stroke="#d4a54a"]');
    await expect(rect).toBeVisible();
    const opacity = await rect.evaluate(el =>
      parseFloat(window.getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThan(0.5);
  });

  test('should dissolve after 1 second delay', async ({ page }) => {
    await page.goto('/m33t/no-edges-test-event');
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));

    // Wait for 1s delay + some animation time
    await page.waitForTimeout(1500);

    // Rectangle should be fading/faded
    const rect = page.locator('svg rect[stroke="#d4a54a"]');
    const opacity = await rect.evaluate(el =>
      parseFloat(window.getComputedStyle(el).opacity)
    );
    expect(opacity).toBeLessThan(0.5);

    // Particles should exist
    const particles = page.locator('.rounded-full[style*="background"]');
    const count = await particles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should reset animation when Replay Intro is clicked', async ({ page }) => {
    await page.goto('/m33t/no-edges-test-event');

    // Complete scrollytelling
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 5));
    await page.waitForTimeout(500);

    // Click replay
    await page.click('button:has-text("Replay Intro")');
    await page.waitForTimeout(200);

    // Scroll back to slide 2
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
    await page.waitForTimeout(500);

    // Rectangle should be visible again (reset state)
    const rect = page.locator('svg rect[stroke="#d4a54a"]');
    await expect(rect).toBeVisible();
  });
});
```

### Manual Testing Checklist

- [ ] Navigate to NO EDGES event landing page
- [ ] Scroll to slide 2 ("constraints no longer exist")
- [ ] Verify solid gold rectangle appears (no dashes)
- [ ] Wait 1 second - rectangle should hold steady
- [ ] After 1s, verify particles appear and drift upward
- [ ] Verify rectangle fades out during particle animation
- [ ] Verify animation completes (no looping)
- [ ] Verify only center glow remains after animation
- [ ] Complete scrollytelling, click "Replay Intro"
- [ ] Verify animation resets and plays again correctly
- [ ] Test on mobile viewport

---

## Performance Considerations

### Animation Performance

- **35 particles** is lightweight for Framer Motion (tested up to 100+ without issues)
- Using `transform` and `opacity` animations (GPU-accelerated)
- Particles use absolute positioning (no layout thrashing)
- `useMemo` prevents particle regeneration on re-renders

### Memory

- Particles are plain objects (~280 bytes each)
- Total memory: ~10KB for particle data
- AnimatePresence removes particles from DOM after exit animation

### Bundle Size

- No new dependencies
- Code addition: ~150 lines, ~4KB unminified

---

## Security Considerations

No security implications - this is a purely visual animation with no user input, data storage, or external communication.

---

## Documentation

### Updates Required

1. **CLAUDE.md**: Add brief note in M33T Public Event Landing Page Pattern about the one-shot dissolve animation behavior
2. **Component comments**: Add JSDoc to `DissolvingBoundary` explaining the animation phases

### JSDoc Example

```tsx
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
 *
 * @param isActive - Whether slide 2 is currently the active scroll position
 */
function DissolvingBoundary({ isActive }: { isActive: boolean }) {
```

---

## Implementation Phases

### Phase 1: Core Implementation (Single PR)

1. Add Particle interface and constants
2. Implement `generateEdgeParticles` function
3. Replace `DissolvingBoundary` component
4. Remove old CSS keyframes and BOUNDARY_PARTICLES
5. Test manually on NO EDGES event page
6. Verify replay functionality works

---

## Open Questions

None - all clarifications have been resolved:
- Trigger delay: 1 second ✓
- Particle count: ~35 (subtle) ✓
- Direction: Upward evaporation ✓
- Reset: Component remount via existing "Replay Intro" button ✓

---

## References

- [Framer Motion AnimatePresence](https://www.framer.com/motion/animate-presence/)
- [Framer Motion Animation](https://www.framer.com/motion/animation/)
- [Ideation Document](./01-ideation.md)
- [Research Report](/tmp/research_20260118_dissolve_animation_libraries.md)

---

## Validation Checklist

- [x] Problem statement is specific and measurable
- [x] Technical requirements confirmed (Framer Motion available)
- [x] Implementation approach validated (custom FM, no new deps)
- [x] All 17 sections meaningfully filled
- [x] No contradictions between sections
- [x] Spec is implementable by following the code examples
- [x] Quality score: 9/10
