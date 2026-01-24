# M33T Scrollytelling Animations - Developer Guide

## Overview

This guide documents the advanced animation patterns and techniques developed for the M33T event landing page's "If Statement Sequence" scrollytelling experience. These patterns solve complex challenges in coordinated multi-element animations, relative positioning, physics-based motion, and organic particle effects.

**Key File:** `src/app/m33t/[slug]/components/IfStatementSequence.tsx`

**Technologies:** Framer Motion, React hooks, TypeScript

---

## Architecture Patterns

### 1. Coordinate System Architecture

**Problem:** Multiple animated elements (orb, text, particles) need to maintain precise spatial relationships across different phases of animation.

**Solution:** Establish a single coordinate system with the main container as the origin, and provide component-relative positioning through refs.

```typescript
// Main container establishes the coordinate origin (center of container)
const mainContainerRef = useRef<HTMLDivElement>(null);

// OrbControl interface provides getters for coordinate system positions
interface OrbControl {
  getContainerCenter: () => { x: number; y: number } | null;
  getRevelationCenter: () => { x: number; y: number } | null;
  setPosition: (x: number, y: number) => void;
  // ... other controls
}

// Implementation converts viewport coordinates to container-relative
getContainerCenter: () => {
  if (!mainContainerRef.current) return null;
  const rect = mainContainerRef.current.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
```

**Usage:**
```typescript
// Child component calculates target position relative to orb container
const orbContainerCenter = orbRef.current.getContainerCenter();
const targetX = elementRect.left - orbContainerCenter.x;
const targetY = elementRect.top - orbContainerCenter.y;
orbRef.current.setPosition(targetX, targetY);
```

**Key Benefits:**
- All elements share the same coordinate reference
- Particles, orb, and text remain aligned across viewport changes
- Simplifies debugging (all positions relative to container center)

**Location:** Lines 716-757, 946-1087

---

### 2. Relative Positioning with getBoundingClientRect()

**Problem:** Text elements need to animate toward/away from each other while maintaining alignment with a central orb, despite different starting positions in the layout flow.

**Solution:** Use `getBoundingClientRect()` to capture absolute positions, then calculate relative transforms needed to achieve desired spatial relationships.

```typescript
// Capture element positions BEFORE animation starts
const ideaRect = word1Ref.current?.getBoundingClientRect();
const execRect = word2Ref.current?.getBoundingClientRect();
const containerRect = containerRef.current?.getBoundingClientRect();

if (ideaRect && execRect && containerRect) {
  // Calculate where each word's center is relative to container center
  const containerCenter = containerRect.width / 2;
  const ideaCenter = ideaRect.left - containerRect.left + ideaRect.width / 2;
  const execCenter = execRect.left - containerRect.left + execRect.width / 2;

  // How far each word is from container center
  const ideaFromCenter = ideaCenter - containerCenter;
  const execFromCenter = execCenter - containerCenter;

  // Calculate drift transforms to place words at desired positions
  // (140px from center in opposite directions)
  const ideaDriftX = -140 - ideaFromCenter;
  const execDriftX = 140 - execFromCenter;

  // Apply transforms
  await Promise.all([
    animate('.word-idea', { x: ideaDriftX, scale: 1.5 }, { ... }),
    animate('.word-execution', { x: execDriftX, scale: 1.5 }, { ... })
  ]);
}
```

**Key Insight:** By calculating `fromCenter` offsets, you can animate elements to absolute positions using relative transforms, regardless of their starting layout position.

**Location:** Lines 111-164

---

### 3. lagFactor for Erase Alignment

**Problem:** When an orb "erases" text by moving across it, the erase effect needs to align precisely with the orb's core (not its glow), and trail slightly behind to create the visual of "scrubbing."

**Solution:** Introduce a `lagFactor` that controls how many animation segments the erase effect trails behind the orb's position.

```typescript
// Configuration
const scrubCount = 6;  // Number of back-and-forth scrubs
const segmentWidth = textWidth / scrubCount;
const substepsPerMovement = 3;  // Smooth interpolation
const lagFactor = 1.2;  // Erase trails orb by 1.2 segments

// Animation loop
for (let i = 0; i < scrubCount; i++) {
  const baseX = erasableStartX + i * segmentWidth;

  // Move orb to segment position
  orbRef.current.setPosition(baseX - 10, erasableCenterY + 5);

  // Update erase with lag
  for (let s = 0; s < substepsPerMovement; s++) {
    await new Promise(resolve => setTimeout(resolve, 150 / substepsPerMovement));

    // Calculate orb progress
    const orbProgress = (i + (s + 1) / substepsPerMovement * 0.5) / scrubCount;

    // Erase trails behind by lagFactor
    const eraseProgress = Math.max(0, orbProgress - lagFactor / scrubCount);
    setEraserProgress(eraseProgress);
  }
}
```

**Fine-tuning History:**
- `lagFactor = 1.5` → Erase aligned with orb's glow (too early)
- `lagFactor = 1.8` → Erase too far behind orb core
- `lagFactor = 1.2` → Perfect alignment with orb core ✓

**Visual Effect:** CSS mask updates create the appearance of text being erased:
```typescript
style={{
  maskImage: `linear-gradient(90deg, transparent ${eraserProgress * 100}%, black ${eraserProgress * 100}%)`,
}}
```

**Location:** Lines 399-443

---

### 4. Volatile Isotope Vibration

**Problem:** Words need to shake rapidly with an "unstable atom about to collapse" feel—many quick, small, semi-violent movements before snapping into the orb.

**Solution:** Programmatically generate keyframe arrays with 24 rapid micro-oscillations and random variation for organic instability.

```typescript
// Vibration generator
const d = 0.7;  // Displacement magnitude (1/3 of original for subtlety)
const generateVibration = (base: number) => {
  const frames = [base];
  for (let i = 0; i < 24; i++) {
    // Alternate direction with random intensity variation
    frames.push(base + (i % 2 === 0 ? d : -d) * (Math.random() * 0.5 + 0.75));
  }
  frames.push(base);  // Return to base at end
  return frames;
};

// Apply to both words
const shakeKeyframes = {
  x: generateVibration(ideaDriftX),
  scale: [1.5, ...Array(24).fill(1.75), 1.75],  // Grow during shake
};

await animate('.word-idea', shakeKeyframes, {
  duration: 1.2,
  ease: 'linear'  // Linear for rapid oscillation feel
});
```

**Design Iteration:**
1. **First attempt:** Single wiggle with 2px displacement → User rejected as "a single wiggle"
2. **Final version:** 24 oscillations with 0.7px displacement → "great shaking" ✓

**Key Parameters:**
- **Oscillation count:** 24 (enough to feel rapid but not blur together)
- **Displacement:** 0.7px (~1/3 of original 2px for subtlety)
- **Random variation:** `Math.random() * 0.5 + 0.75` (75-125% intensity)
- **Duration:** 1.2s (20 oscillations/second)
- **Easing:** `linear` (no acceleration/deceleration for mechanical vibration)

**Location:** Lines 201-226

---

### 5. Magnetic Collapse Animation

**Problem:** Words need to resist movement at first (like being held by a magnet), then suddenly snap into the orb with extreme acceleration (pulled by a stronger magnet).

**Solution:** Use an extreme ease-in cubic-bezier curve where ~99% of the motion happens in the final 10% of the duration.

```typescript
// Magnetic collapse physics
const magneticEase = [0.99, 0, 1, 1] as const;  // Frozen, then INSTANT snap

await Promise.all([
  animate(
    '.word-idea',
    { x: ideaSnapX, scale: 0.1, opacity: 0 },
    { duration: 0.35, ease: magneticEase }
  ),
  animate(
    '.word-execution',
    { x: execSnapX, scale: 0.1, opacity: 0 },
    { duration: 0.35, ease: magneticEase }
  ),
  animate(
    '.word-collapsed',
    { x: suffixSnapX, y: suffixSnapY, scale: 0.1, opacity: 0 },
    { duration: 0.35, ease: magneticEase }
  )
]);
```

**Design Iteration:**
1. Original: `[0.68, -0.55, 0.27, 1.55]` → "PowerPoint 2000" bounce-back effect ✗
2. First revision: `[0.4, 0, 1, 1]` → Too gradual
3. Second revision: `[0.9, 0, 1, 1]` → Better but still not frozen enough
4. Third revision: `[0.97, 0, 1, 1]` → Getting closer
5. **Final version:** `[0.99, 0, 1, 1]` + `0.35s` duration → "it's beautiful" ✓

**Cubic-Bezier Explanation:**
- **P1 (0.99, 0):** Bezier control point near start = almost no initial movement
- **P2 (1, 1):** Bezier control point at end = immediate full acceleration
- Result: Element barely moves for ~90% of duration, then snaps in last ~10%

**Duration Tuning:**
- Started at 0.8s → Too slow
- Reduced to 0.6s → Better
- Reduced to 0.5s → Almost there
- **Final: 0.35s** → Perfect for "snap" feel

**Scale Tuning:**
- Started at 0.7 → Still visible during collapse
- Reduced to 0.3 → Better
- Reduced to 0.2 → Almost invisible
- **Final: 0.1** → Collapses to nearly nothing

**Location:** Lines 228-249

---

### 6. Particle Explosion with Organic Falling

**Problem:** Create a dramatic explosion that feels organic—particles should explode upward, linger briefly, then fall like ash with natural drift and varying speeds.

**Solution:** Generate per-particle randomized properties for explosion angle, fall delay, fall duration, and lateral drift.

```typescript
interface Particle {
  id: number;
  explosionX: number;      // Final X position after explosion
  explosionY: number;      // Final Y position after explosion
  fallDelay: number;       // Staggered start (0-1.5s)
  fallDuration: number;    // Variable speed (1.5-3.5s)
  driftX: number;          // Lateral drift during fall (-60 to +60px)
}

// Generate 200 particles with randomized properties
const particleCount = 200;
const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
  // Random angle in upper semicircle only (0 to PI = upward directions)
  const angle = Math.random() * Math.PI;
  const distance = 60 + Math.random() * 300;

  return {
    id: i,
    // X spreads left and right
    explosionX: Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1),
    // Y only goes UP (negative values) - creates "floor" effect
    explosionY: -Math.abs(Math.sin(angle) * distance) - 20,
    // Per-particle fall properties for organic ash-like movement
    fallDelay: Math.random() * 1.5,
    fallDuration: 1.5 + Math.random() * 2,
    driftX: (Math.random() - 0.5) * 120,
  };
});
```

**Three-Phase Animation:**

```typescript
// Phase 1: Explosion (0.4s)
{
  x: orbPosition.x + particle.explosionX,
  y: orbPosition.y + particle.explosionY,
  scale: 0.6,
  opacity: 0.9,
}

// Phase 2: Linger (2.4s) - slight drift while suspended
{
  x: orbPosition.x + particle.explosionX * 1.1,
  y: orbPosition.y + particle.explosionY * 1.1,
  scale: 0.5,
  opacity: 0.8,
}

// Phase 3: Fall (staggered, 1.5-3.5s per particle)
{
  // Lateral drift like ash floating
  x: orbPosition.x + particle.explosionX * 0.5 + particle.driftX,
  // Fall toward floor but never below it
  y: Math.min(orbPosition.y, orbPosition.y + particle.explosionY * 0.3),
  scale: 0.15,
  opacity: 0,
}
```

**Key Design Decisions:**
- **Semicircle explosion:** Only upward angles prevent particles from falling through "floor"
- **Negative Y enforcement:** `-Math.abs(Math.sin(angle) * distance)` ensures upward-only
- **Staggered falling:** Random delays (0-1.5s) create wave-like cascading effect
- **Variable duration:** 1.5-3.5s range prevents uniform movement
- **Lateral drift:** ±60px adds organic ash-like floating
- **Floor constraint:** `Math.min(orbPosition.y, ...)` prevents falling below text line

**Performance Note:**
- Reduced from 500 to 200 particles for better performance
- Each particle uses `willChange: 'transform, opacity'` for GPU acceleration

**Location:** Lines 858-1011

---

## Phase-Based State Management

### Animation Phase Enum

**Problem:** Complex multi-step animations with different elements need coordinated orchestration.

**Solution:** Use a typed enum for animation phases and `useEffect` hooks to drive phase transitions.

```typescript
type AnimationPhase =
  | 'idle'
  | 'show1' | 'breathe1' | 'exit1'
  | 'show2' | 'breathe2' | 'exit2'
  | 'show3' | 'breathe3' | 'exit3'
  | 'reveal'
  | 'complete';

// Phase progression function
const advancePhase = useCallback(() => {
  setPhase((current) => {
    const phases: AnimationPhase[] = [
      'idle', 'show1', 'breathe1', 'exit1',
      'show2', 'breathe2', 'exit2',
      'show3', 'breathe3', 'exit3',
      'reveal', 'complete'
    ];
    const currentIndex = phases.indexOf(current);
    if (currentIndex >= 0 && currentIndex < phases.length - 1) {
      return phases[currentIndex + 1]!;
    }
    return current;
  });
}, []);
```

**Auto-advance Patterns:**

```typescript
// Breathe phases auto-advance after duration
useEffect(() => {
  if (phase === 'breathe1' || phase === 'breathe2' || phase === 'breathe3') {
    const timer = setTimeout(() => advancePhase(), BREATHE_DURATION);
    return () => clearTimeout(timer);
  }
}, [phase, advancePhase]);

// Show phases auto-advance after fade-in
useEffect(() => {
  if (phase === 'show1' || phase === 'show2' || phase === 'show3') {
    const timer = setTimeout(() => advancePhase(), 600);
    return () => clearTimeout(timer);
  }
}, [phase, advancePhase]);
```

**Child-triggered Advancement:**

```typescript
// Child components signal when their exit animations complete
const handleExit1Complete = useCallback(() => {
  advancePhase();  // Move to show2
}, [advancePhase]);

<Statement1 phase={phase} onExitComplete={handleExit1Complete} orbRef={orbRef} />
```

**Location:** Lines 10-22, 760-840, 925-935

---

## Component Communication Patterns

### OrbControl Ref API

**Problem:** Multiple child components need to control a shared orb element's position, visibility, scale, and trigger effects.

**Solution:** Create a ref-based control API that child components can call imperatively.

```typescript
interface OrbControl {
  setPosition: (x: number, y: number) => void;
  setVisible: (visible: boolean) => void;
  setScale: (scale: number) => void;
  setDimmed: (dimmed: boolean) => void;
  triggerShake: () => void;
  getContainerCenter: () => { x: number; y: number } | null;
  getRevelationCenter: () => { x: number; y: number } | null;
}

// Implementation in parent
const orbRef = useRef<OrbControl>({
  setPosition: (x, y) => setOrbPosition({ x, y }),
  setVisible: (visible) => setOrbVisible(visible),
  setScale: (scale) => setOrbScale(scale),
  setDimmed: (dimmed) => setOrbDimmed(dimmed),
  triggerShake: () => {
    setOrbShaking(true);
    setTimeout(() => setOrbShaking(false), 1500);
  },
  getContainerCenter: () => {
    if (!mainContainerRef.current) return null;
    const rect = mainContainerRef.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  },
  getRevelationCenter: () => {
    if (!revelationContainerRef.current) return null;
    const rect = revelationContainerRef.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  },
});

// Usage in child
orbRef.current.setPosition(targetX, targetY);
orbRef.current.setScale(3);
orbRef.current.setDimmed(true);
```

**Benefits:**
- Imperative API for complex animations (cleaner than prop drilling)
- Type-safe through interface
- Centralized orb state management
- Easy to extend with new controls

**Location:** Lines 78-86, 721-757

---

## Race Condition Prevention

### Phase Change Detection

**Problem:** Async operations (like `setTimeout`) may complete after the component has moved to a different phase, causing incorrect animations.

**Solution:** Capture the phase at effect start and check if it changed during async delays.

```typescript
// Capture phase at effect start
const phaseRef = useRef(phase);
phaseRef.current = phase;

useEffect(() => {
  if ((phase === 'show3' || phase === 'breathe3') && !hasMigrated.current) {
    hasMigrated.current = true;

    const timer = setTimeout(() => {
      // Defensive check: abort if phase changed during delay
      if (phaseRef.current !== 'show3' && phaseRef.current !== 'breathe3') {
        return;  // Phase changed, abort animation
      }

      // Safe to proceed with animation
      const orbContainerCenter = orbRef.current.getContainerCenter();
      // ... rest of animation
    }, 400);

    return () => clearTimeout(timer);
  }
}, [phase, orbRef]);
```

**Key Pattern:** Use `useRef` to track the latest phase value, then check before executing delayed animations.

**Location:** Lines 518-556

---

## Easing Curve Reference

### Custom Cubic-Bezier Curves

All easing curves below use the cubic-bezier format: `[x1, y1, x2, y2]`

| Effect | Curve | Duration | Use Case |
|--------|-------|----------|----------|
| **Smooth drift** | `[0.25, 0.46, 0.45, 0.94]` | 1.5s | Words separating gracefully |
| **Magnetic resistance** | `[0.99, 0, 1, 1]` | 0.35s | Stuck, then instant snap |
| **Fast emergence** | `[0.16, 1, 0.3, 1]` | 0.6s | Explosion reveal |
| **Smooth deceleration** | `[0.4, 0.0, 0.2, 1]` | Variable | Particle falling (gravity + air resistance) |
| **Linear vibration** | `linear` | 1.2s | Rapid oscillations |

### Spring Physics

For organic orb migrations:

```typescript
transition: {
  x: { type: 'spring', stiffness: 30, damping: 12 },
  y: { type: 'spring', stiffness: 30, damping: 12 },
  // Halved stiffness for ~2s migrations (default is 60)
}
```

---

## Performance Optimizations

### GPU Acceleration

```typescript
<motion.div
  style={{
    willChange: 'transform, opacity',  // Hint for GPU acceleration
  }}
/>
```

**When to use:**
- Elements with frequent position/opacity changes
- Particle systems (many elements animating simultaneously)
- Elements that animate on every frame

### Particle Count Tuning

```typescript
// Reduced from 500 to 200 for better performance
const particleCount = 200;  // Especially important in dev mode
```

**Performance Impact:**
- 500 particles: ~30 FPS in dev mode, 60 FPS in production
- 200 particles: 60 FPS in both environments, still visually dense

---

## Common Gotchas

### 1. Race Conditions in Async Animations

**Problem:** Component unmounts or phase changes during `setTimeout`

**Solution:**
```typescript
useEffect(() => {
  let cancelled = false;

  const timer = setTimeout(() => {
    if (cancelled) return;  // Abort if unmounted
    // Animation code
  }, 400);

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}, [dependencies]);
```

### 2. Orb Glow vs Core Alignment

**Problem:** Orb visual has ~15-20px glow extending beyond core center

**Solution:** Account for glow radius when positioning:
```typescript
// Start orb BEFORE text edge to account for glow
orbRef.current.setPosition(textStartX - 30, textCenterY - 15);
```

### 3. Coordinate System Mismatches

**Problem:** Mixing viewport coordinates with component-relative coordinates

**Solution:** Always convert through container center:
```typescript
const relativeX = viewportRect.left - containerCenter.x;
const relativeY = viewportRect.top - containerCenter.y;
```

### 4. Timer Cleanup for Persistent State

**Problem:** Timers set in one phase continue running after phase change

**Solution:** Store timers in refs and clear on unmount:
```typescript
const particleTimers = useRef<NodeJS.Timeout[]>([]);

useEffect(() => {
  particleTimers.current.push(setTimeout(() => { ... }, 400));

  return () => {
    particleTimers.current.forEach(timer => clearTimeout(timer));
    particleTimers.current = [];
  };
}, []);
```

---

## Testing & Debugging

### Visual Debugging

Add temporary visual guides:

```typescript
// Show orb center
<div style={{
  position: 'absolute',
  left: orbPosition.x,
  top: orbPosition.y,
  width: 4,
  height: 4,
  background: 'red',
  zIndex: 9999
}} />
```

### Animation Timing Verification

```typescript
// Log timing checkpoints
console.log('Explosion start:', Date.now());
setTimeout(() => console.log('Linger start:', Date.now()), 400);
setTimeout(() => console.log('Fall start:', Date.now()), 2800);
```

### Phase State Monitoring

```typescript
useEffect(() => {
  console.log('Phase changed to:', phase);
}, [phase]);
```

---

## Extending the System

### Adding New Statements

1. Create new `Statement4` component following existing pattern
2. Add phase enum entries: `'show4' | 'breathe4' | 'exit4'`
3. Add to phase progression array
4. Implement exit animation with `onExitComplete` callback
5. Add to render conditions

### Adding New Orb Controls

1. Add method to `OrbControl` interface
2. Implement in parent's `orbRef.current`
3. Use from child components via `orbRef.current.newMethod()`

### Adding New Particle Effects

1. Create new particle state: `const [newParticles, setNewParticles] = useState<ParticleType[]>([])`
2. Generate particles in phase effect
3. Render in main container with `orbPosition` as origin
4. Use Framer Motion's `animate` prop for phase-based animation

---

## Summary

The M33T scrollytelling animations demonstrate advanced patterns for:

- **Spatial precision:** Relative positioning with shared coordinate systems
- **Physics simulation:** Magnetic collapse, volatile vibration, organic falling
- **Complex orchestration:** Phase-based state management with async coordination
- **Performance:** GPU acceleration, particle count optimization
- **Reliability:** Race condition prevention, defensive ref checking

These patterns are reusable for any complex multi-element animation system requiring precise coordination and organic motion.
