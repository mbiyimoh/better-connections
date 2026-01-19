# Replace Looping Dissolve Animation with One-Shot Particle Effect

**Slug:** fix-dissolve-animation
**Author:** Claude Code
**Date:** 2026-01-18
**Branch:** preflight/fix-dissolve-animation
**Related:** ScrollytellingSection.tsx (NO EDGES landing page)

---

## 1) Intent & Assumptions

- **Task brief:** Replace the looping dashed-line-with-floating-dots animation in the "NO EDGES" scrollytelling section with a proper "fracture and dissolve away" effect that completes (one-shot, not infinite loop). The current animation has a persistent dashed rectangle that never disappears and particles that loop forever.

- **Assumptions:**
  - Animation is used only in the `DissolvingBoundary` component within ScrollytellingSection
  - Framer Motion is already in the codebase and is the preferred animation library
  - Zero new dependencies is ideal but not mandatory
  - The effect should trigger when the slide becomes active and complete fully (element disappears)
  - Gold color (#d4a54a) should be maintained

- **Out of scope:**
  - Other animations in ScrollytellingSection (ConvergingVenn, ProgressBar)
  - Performance optimization of the overall landing page
  - Mobile-specific animation variants

---

## 2) Pre-reading Log

- `src/app/m33t/[slug]/components/ScrollytellingSection.tsx`: Contains the `DissolvingBoundary` component (lines 64-120) with the problematic animation. Uses SVG rect with strokeDasharray and CSS keyframe animation for particles that loops infinitely.
- `CLAUDE.md`: Documents the M33T landing page pattern and design system (gold color, dark theme)
- `src/lib/design-system.ts`: Contains `BRAND_GOLD.primary = '#d4a54a'`

---

## 3) Codebase Map

- **Primary components/modules:**
  - `src/app/m33t/[slug]/components/ScrollytellingSection.tsx` - Main file to modify
  - `DissolvingBoundary` component (lines 64-120) - The specific component with the animation

- **Shared dependencies:**
  - `framer-motion` - Already imported and used extensively
  - `@/lib/design-system` - `BRAND_GOLD` color constants
  - CSS keyframes defined inline (lines 111-117)

- **Data flow:**
  - `isActive` prop (boolean) triggers animation state
  - Scroll position determines when slide 2 is active
  - No external data dependencies

- **Feature flags/config:** None

- **Potential blast radius:**
  - Only affects the `DissolvingBoundary` component
  - No other components depend on this animation
  - Safe to modify in isolation

---

## 4) Root Cause Analysis

- **Repro steps:**
  1. Navigate to a NO EDGES event landing page
  2. Scroll to slide 2 (the "constraints no longer exist" slide)
  3. Observe the dissolving boundary animation

- **Observed vs Expected:**
  - **Observed:** Dashed rectangle remains visible (opacity 0.4), particles float upward in infinite loop, never completes
  - **Expected:** Solid rectangle fractures into particles and fully dissolves/disappears (one-shot)

- **Evidence:**
  - Line 77: `strokeDasharray={isActive ? '4,8' : '200,0'}` - Rectangle stays visible with dashes
  - Line 79: `style={{ opacity: isActive ? 0.4 : 0.8 }}` - Never fades to 0
  - Line 93: `animation: \`float-particle 3s ease-out ${i * 0.1}s infinite\`` - **INFINITE** loop
  - Lines 112-116: CSS keyframes reference `--dx, --dy` variables that are never set per-particle

- **Root-cause hypotheses:**
  1. **Animation set to `infinite`** (95% confidence) - The CSS animation loops forever
  2. **Rectangle opacity never reaches 0** (95% confidence) - Stays at 0.4 when active
  3. **CSS variables for particle direction not set** (75% confidence) - All particles drift same direction

- **Decision:** Root cause is a combination of all three issues. The animation was designed to loop rather than complete.

---

## 5) Research

### Potential Solutions

1. **react-particle-effect-button** (NPM package)
   - **Pros:** Drop-in solution, 1.5k GitHub stars, simple API, callbacks for completion
   - **Cons:** Not optimized for SVG elements, adds anime.js dependency, limited to DOM elements
   - **Effort:** 1-2 hours

2. **Custom Framer Motion implementation** (Recommended)
   - **Pros:** Zero new dependencies (already in codebase), excellent SVG support, full control over particle behavior, one-shot animation with AnimatePresence
   - **Cons:** More implementation work, manual particle generation
   - **Effort:** 3-4 hours

3. **VFX-JS WebGL shader-based dissolve**
   - **Pros:** Highest visual quality, GPU-accelerated, smooth gradient dissolve
   - **Cons:** Steep learning curve, larger bundle, requires WebGL/GLSL knowledge
   - **Effort:** 8-12 hours

4. **Lottie animation**
   - **Pros:** Professional quality, simple integration if animation exists
   - **Cons:** Static (can't adapt to different sizes), requires After Effects for custom work
   - **Effort:** Variable (depends on finding/creating animation)

5. **Fix current CSS animation**
   - **Pros:** Minimal changes, no new code
   - **Cons:** CSS keyframes alone can't achieve satisfying particle disintegration
   - **Effort:** 1 hour (but poor result)

### Recommendation

**Custom Framer Motion implementation** is the best choice because:
1. Zero new dependencies (Framer Motion already used throughout)
2. Full SVG support via `motion.circle` and `motion.rect`
3. `AnimatePresence` provides one-shot exit animations
4. Complete control over particle positions, timing, and easing
5. Integrates seamlessly with existing scroll-based `isActive` logic

**Implementation approach:**
- Start with solid gold rectangle (no dashes)
- When `isActive` becomes true, trigger exit animation
- Rectangle fades quickly while particles spawn at rectangle edge positions
- Particles drift outward with randomized trajectories, shrinking and fading
- Animation completes in ~1.5 seconds, leaving nothing visible

---

## 6) Clarification

1. **Animation trigger:** Should the dissolve happen immediately when the slide becomes active, or should there be a short delay (e.g., 0.5s) to let the user see the solid rectangle first?

2. **Particle count:** Prefer more particles (~60-80) for a dramatic effect, or fewer (~30-40) for subtlety?

3. **Animation direction:** Should particles drift in all directions (explosion-like), or primarily upward/outward (evaporation-like)?

4. **Reversibility:** Should the animation be reversible (re-form when scrolling back up), or one-shot only?

---

## 7) Proposed Implementation

```tsx
// Key changes to DissolvingBoundary component

function DissolvingBoundary({ isActive }: { isActive: boolean }) {
  const [hasTriggered, setHasTriggered] = useState(false);

  // Generate particles once, positioned along rectangle edges
  const particles = useMemo(() =>
    generateEdgeParticles(60, { width: 160, height: 120 }),
  []);

  // Trigger dissolve when slide becomes active
  useEffect(() => {
    if (isActive && !hasTriggered) {
      setHasTriggered(true);
    }
  }, [isActive, hasTriggered]);

  return (
    <div className="relative w-64 h-48 mx-auto mb-12">
      <AnimatePresence>
        {!hasTriggered && (
          <motion.svg
            viewBox="0 0 200 150"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Solid rectangle (no dashes) */}
            <rect
              x="20" y="15" width="160" height="120"
              fill="none" stroke={GOLD} strokeWidth="2"
            />
          </motion.svg>
        )}

        {hasTriggered && particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x, top: p.y,
              width: p.size, height: p.size,
              backgroundColor: GOLD
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              x: p.endX,
              y: p.endY,
              opacity: 0,
              scale: 0
            }}
            transition={{
              delay: p.delay,
              duration: 1.2,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
          />
        ))}
      </AnimatePresence>

      {/* Glowing center point - persists */}
      <circle cx="100" cy="75" r="4" fill={GOLD} />
    </div>
  );
}
```

**Key improvements:**
- Solid rectangle instead of dashed
- One-shot animation via state flag (`hasTriggered`)
- Particles positioned along edges of rectangle
- Each particle has randomized exit trajectory
- Uses Framer Motion's spring physics for natural movement
- Animation completes fully (no looping)
