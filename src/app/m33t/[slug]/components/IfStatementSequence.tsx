'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { motion, useAnimate, AnimatePresence } from 'framer-motion';
import { BRAND_GOLD, GOLD_FOIL_GRADIENT, GOLD_FOIL_GRADIENT_MOBILE } from '@/lib/design-system';

// ============================================================================
// TYPES
// ============================================================================
type AnimationPhase =
  | 'idle'
  | 'show1'
  | 'breathe1'
  | 'exit1'
  | 'show2'
  | 'breathe2'
  | 'exit2'
  | 'show3'
  | 'breathe3'
  | 'exit3'
  | 'reveal'
  | 'complete';

interface IfStatementSequenceProps {
  isActive: boolean;
  onComplete?: () => void;
}

// Particle for explosion effect
interface Particle {
  id: number;
  explosionX: number;
  explosionY: number;
  // Per-particle fall properties for organic ash-like movement
  fallDelay: number;      // Staggered start (0-1.5s)
  fallDuration: number;   // Variable speed (1.5-3.5s)
  driftX: number;         // Lateral drift during fall (-60 to +60px)
}

// ============================================================================
// CONSTANTS
// ============================================================================
const GOLD = BRAND_GOLD.primary;
const BREATHE_DURATION = 3000; // 3 seconds of breathing
const BREATHE_SCALE = 1.04; // Subtle 4% scale for breathing

// Statement text broken into parts for animation
const STATEMENT_1 = {
  prefix: 'if the distance between',
  word1: 'idea',
  connector: 'and',
  word2: 'execution',
  suffix: 'collapsed?',
};

const STATEMENT_2 = {
  prefix: 'if',
  erasable: '"we don\'t have the resources for that"',
  suffix: 'stopped being true?',
};

const STATEMENT_3 = {
  prefix: 'if you stopped talking yourself out of',
  highlight: 'your best ideas',
  suffix: '?',
};

// Revelation text parts for mixed styling (white + gold highlight)
const REVELATION = {
  prefix: 'and instead started ',
  highlight: 'talking them into existence',
  suffix: '?',
};

// ============================================================================
// STATEMENT 1: Rubber Band Snap
// ============================================================================
interface OrbControl {
  setPosition: (x: number, y: number) => void;
  setVisible: (visible: boolean) => void;
  setScale: (scale: number) => void;
  setDimmed: (dimmed: boolean) => void;
  triggerShake: () => void;
  getContainerCenter: () => { x: number; y: number } | null;
  getRevelationCenter: () => { x: number; y: number } | null;
}

interface Statement1Props {
  phase: AnimationPhase;
  onExitComplete: () => void;
  orbRef: React.RefObject<OrbControl | null>;
  goldFoilStyle: React.CSSProperties;
}

function Statement1({ phase, onExitComplete, orbRef, goldFoilStyle }: Statement1Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const word1Ref = useRef<HTMLSpanElement>(null);
  const word2Ref = useRef<HTMLSpanElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);
  const [scope, animate] = useAnimate();
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    if (phase !== 'exit1') return;

    const runExitAnimation = async () => {
      // Step 1: Fade out surrounding words in wave pattern (NOT suffix - it persists)
      const prefixWords = STATEMENT_1.prefix.split(' ');
      const allFadeWords = [...prefixWords, STATEMENT_1.connector]; // suffix excluded

      // Mobile-responsive animation values
      // On mobile (<768px), reduce drift distance and scale to keep words aligned
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const driftDistance = isMobile ? 80 : 140; // 80px on mobile, 140px on desktop
      const driftScale = isMobile ? 1.25 : 1.5; // 1.25x on mobile, 1.5x on desktop
      const tensionScale = isMobile ? 1.4 : 1.75; // 1.4x on mobile, 1.75x on desktop

      // Calculate center positions for "idea", "execution", and "collapsed?" BEFORE animations start
      const ideaRect = word1Ref.current?.getBoundingClientRect();
      const execRect = word2Ref.current?.getBoundingClientRect();
      const suffixRect = suffixRef.current?.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      let ideaDriftX = -driftDistance;
      let execDriftX = driftDistance;
      let ideaDriftY = 0; // Y offset to align words horizontally
      let execDriftY = 0;
      let ideaSnapX = 0;
      let execSnapX = 0;
      let suffixDriftX = 0;
      let suffixDriftY = 0;
      let suffixSnapX = 0;
      let suffixSnapY = 0;
      let orbY = 0; // Y position for orb

      // Get orb container center for positioning (must exist for orb animations)
      const orbContainerCenter = orbRef.current?.getContainerCenter();
      if (!orbContainerCenter) {
        // Container not ready - complete animation without orb effects
        setShowContent(false);
        onExitComplete();
        return;
      }

      if (ideaRect && execRect && suffixRect && containerRect) {
        // EDGE-BASED POSITIONING: We want equal gaps from word EDGES to the orb center
        // - Gap from END of "idea" to orb center = Gap from orb center to START of "execution"
        //
        // The orb is at container center (x=0 in animation coordinates).
        // After scaling, word edges move: scaledEdge = center + (edge - center) * scale
        // We need to position words so their INNER edges are equidistant from x=0.

        const containerCenter = containerRect.width / 2;

        // Current word positions relative to container (before any animation)
        const ideaLeft = ideaRect.left - containerRect.left;
        const ideaRight = ideaRect.right - containerRect.left;
        const ideaCenter = ideaLeft + ideaRect.width / 2;
        const execLeft = execRect.left - containerRect.left;
        const execRight = execRect.right - containerRect.left;
        const execCenter = execLeft + execRect.width / 2;
        const suffixCenter = suffixRect.left - containerRect.left + suffixRect.width / 2;

        // After scaling, half-widths change
        const ideaHalfWidthScaled = (ideaRect.width / 2) * driftScale;
        const execHalfWidthScaled = (execRect.width / 2) * driftScale;

        // We want: (ideaCenterFinal + ideaHalfWidthScaled) = -gapFromOrb
        //          (execCenterFinal - execHalfWidthScaled) = +gapFromOrb
        // Where gapFromOrb is the desired gap from the orb (at x=0) to each word's inner edge.
        // Use driftDistance as the gap from orb to each word's inner edge.
        const gapFromOrb = driftDistance;

        // Target positions for word CENTERS (in container coordinates)
        // "idea" right edge should be at (containerCenter - gapFromOrb), so center is further left
        const ideaTargetCenter = containerCenter - gapFromOrb - ideaHalfWidthScaled;
        // "execution" left edge should be at (containerCenter + gapFromOrb), so center is further right
        const execTargetCenter = containerCenter + gapFromOrb + execHalfWidthScaled;

        // Calculate drift as delta from current position to target
        ideaDriftX = ideaTargetCenter - ideaCenter;
        execDriftX = execTargetCenter - execCenter;

        // How far each word is from container center (for snap-back calculation)
        const ideaFromCenter = ideaCenter - containerCenter;
        const execFromCenter = execCenter - containerCenter;
        const suffixFromCenter = suffixCenter - containerCenter;

        // CRITICAL: On mobile, words may be on different lines with different Y positions
        // Calculate Y offsets to align both words to a common horizontal baseline
        const ideaCenterY = ideaRect.top + ideaRect.height / 2;
        const execCenterY = execRect.top + execRect.height / 2;
        const targetY = (ideaCenterY + execCenterY) / 2; // Meet in the middle
        ideaDriftY = targetY - ideaCenterY;
        execDriftY = targetY - execCenterY;

        // Suffix moves to center horizontally and down below the orb
        suffixDriftX = -suffixFromCenter; // Center horizontally
        suffixDriftY = 50; // Move down below the orb

        // Snap back to center (adjusted for current position)
        ideaSnapX = -ideaFromCenter;
        execSnapX = -execFromCenter;
        suffixSnapX = -suffixFromCenter; // Stay centered
        suffixSnapY = 0; // Move back up into orb

        // Calculate orb Y position relative to orb container center (use target Y for consistency)
        orbY = targetY - orbContainerCenter.y;
      }

      // Show orb immediately as white text starts fading - it appears between the words
      if (orbRef.current) {
        orbRef.current.setPosition(0, orbY);
        orbRef.current.setVisible(true);
      }

      // Wave dissolve - staggered fade out (orb is now visible)
      for (let i = 0; i < allFadeWords.length; i++) {
        animate(
          `.fade-word-${i}`,
          { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
          { duration: 0.3, delay: i * 0.08 }
        );
      }

      // Step 2: "idea" and "execution" drift apart, "collapsed?" moves below orb
      // Words grow as they separate (responsive scale for mobile alignment)
      // CRITICAL: Apply Y offsets so words align on same horizontal baseline (especially on mobile where they may wrap to different lines)
      await Promise.all([
        animate(
          '.word-idea',
          { x: ideaDriftX, y: ideaDriftY, scale: driftScale },
          { duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }
        ),
        animate(
          '.word-execution',
          { x: execDriftX, y: execDriftY, scale: driftScale },
          { duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }
        ),
        animate(
          '.word-collapsed',
          { x: suffixDriftX, y: suffixDriftY },
          { duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }
        ),
      ]);

      // Step 2b: Tension build - volatile isotope vibration before collapse
      // Grow to 1.75x and rapid micro-shake (many quick oscillations, tiny movements)
      // Duration increased to 2.2s (was 1.2s) for extra second of linger/shake
      const d = 0.7; // tiny displacement (~1/3 of original)
      const generateVibration = (base: number) => {
        // 20+ rapid oscillations for unstable atom feel
        const frames = [base];
        for (let i = 0; i < 24; i++) {
          frames.push(base + (i % 2 === 0 ? d : -d) * (Math.random() * 0.5 + 0.75));
        }
        frames.push(base);
        return frames;
      };

      // Maintain Y position during shake animation
      const shakeKeyframes = {
        x: generateVibration(ideaDriftX),
        y: ideaDriftY, // Hold Y position constant
        scale: [driftScale, ...Array(24).fill(tensionScale), tensionScale],
      };
      const shakeKeyframesExec = {
        x: generateVibration(execDriftX),
        y: execDriftY, // Hold Y position constant
        scale: [driftScale, ...Array(24).fill(tensionScale), tensionScale],
      };

      await Promise.all([
        animate('.word-idea', shakeKeyframes, { duration: 2.2, ease: 'linear' }),
        animate('.word-execution', shakeKeyframesExec, { duration: 2.2, ease: 'linear' }),
      ]);

      // Step 3: Magnetic collapse - resist at first, then rapid acceleration
      // Like being pulled off one magnet by a stronger one
      // Near-instant snap after prolonged resistance
      const magneticEase = [0.99, 0, 1, 1] as const; // frozen, then INSTANT snap

      // Magnetic collapse - keep words at full opacity since scale shrinks them to nothing
      // This maintains the visual metaphor of collapsing INTO the orb rather than fading away
      // Both words snap to Y=0 (orb position) and center X, merging into the orb
      await Promise.all([
        animate(
          '.word-idea',
          { x: ideaSnapX, y: 0, scale: 0.1 },
          { duration: 0.35, ease: magneticEase }
        ),
        animate(
          '.word-execution',
          { x: execSnapX, y: 0, scale: 0.1 },
          { duration: 0.35, ease: magneticEase }
        ),
        animate(
          '.word-collapsed',
          { x: suffixSnapX, y: suffixSnapY, scale: 0.1 },
          { duration: 0.35, ease: magneticEase }
        ),
      ]);

      // Dramatic pause after collapse - let the "punchline" land before moving on
      await new Promise((resolve) => setTimeout(resolve, 750));

      setShowContent(false);
      onExitComplete();
    };

    runExitAnimation();
  }, [phase, animate, onExitComplete, orbRef]);

  if (!showContent && phase !== 'show1' && phase !== 'breathe1') return null;

  const prefixWords = STATEMENT_1.prefix.split(' ');

  return (
    <motion.div
      ref={scope}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: phase === 'show1' || phase === 'breathe1' || phase === 'exit1' ? 1 : 0,
        y: 0,
        scale: phase === 'breathe1' ? [1, BREATHE_SCALE, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.5 },
        y: { duration: 0.5 },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="font-display text-2xl md:text-3xl text-white text-center"
    >
      <div ref={containerRef} className="relative inline-block">
        {/* Prefix words */}
        {prefixWords.map((word, i) => (
          <motion.span
            key={`prefix-${i}`}
            className={`fade-word-${i} inline-block mr-2`}
          >
            {word}
          </motion.span>
        ))}

        {/* "idea" - will animate */}
        <motion.span
          ref={word1Ref}
          className="word-idea inline-block mr-2 font-semibold"
          style={{ ...goldFoilStyle }}
        >
          {STATEMENT_1.word1}
        </motion.span>

        {/* "and" */}
        <motion.span
          className={`fade-word-${prefixWords.length} inline-block mr-2`}
        >
          {STATEMENT_1.connector}
        </motion.span>

        {/* "execution" - will animate */}
        <motion.span
          ref={word2Ref}
          className="word-execution inline-block mr-2 font-semibold"
          style={{ ...goldFoilStyle }}
        >
          {STATEMENT_1.word2}
        </motion.span>

        {/* Suffix "collapsed?" - persists and moves below orb */}
        <motion.span
          ref={suffixRef}
          className="word-collapsed inline-block"
        >
          {STATEMENT_1.suffix}
        </motion.span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STATEMENT 2: Eraser Scrub
// ============================================================================
interface Statement2Props {
  phase: AnimationPhase;
  onExitComplete: () => void;
  orbRef: React.RefObject<OrbControl | null>;
}

function Statement2({ phase, onExitComplete, orbRef }: Statement2Props) {
  const [scope, animate] = useAnimate();
  const [showContent, setShowContent] = useState(true);
  const [eraserProgress, setEraserProgress] = useState(0);
  const erasableRef = useRef<HTMLSpanElement>(null);
  const hasRepositioned = useRef(false);

  // Track current phase to prevent race conditions
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // When Statement2 appears, migrate orb IMMEDIATELY to position ABOVE the text
  useEffect(() => {
    if ((phase === 'show2' || phase === 'breathe2') && !hasRepositioned.current) {
      hasRepositioned.current = true;

      // Minimal delay just to let DOM render, then start migration immediately
      const timer = setTimeout(() => {
        if (!erasableRef.current || !orbRef.current) return;

        // Abort if phase changed during the delay (race condition prevention)
        if (phaseRef.current !== 'show2' && phaseRef.current !== 'breathe2') return;

        const erasableRect = erasableRef.current.getBoundingClientRect();
        const orbContainerCenter = orbRef.current.getContainerCenter();
        if (!orbContainerCenter) return;

        // Position orb ABOVE the text (not behind it) - center horizontally, well above text
        const textCenterX = erasableRect.left + erasableRect.width / 2 - orbContainerCenter.x;
        const aboveTextY = erasableRect.top - orbContainerCenter.y - 50; // 50px above text top

        orbRef.current.setPosition(textCenterX, aboveTextY);
      }, 50); // Start moving immediately with text appearance

      return () => clearTimeout(timer);
    }
  }, [phase, orbRef]);

  useEffect(() => {
    if (phase !== 'exit2') return;

    const runExitAnimation = async () => {
      if (!erasableRef.current || !orbRef.current) return;

      const erasableRect = erasableRef.current.getBoundingClientRect();

      // Calculate positions relative to orb container center (not viewport)
      const orbContainerCenter = orbRef.current.getContainerCenter();
      if (!orbContainerCenter) return;

      // Erasable text positions relative to orb container center
      const erasableStartX = erasableRect.left - orbContainerCenter.x;
      const erasableEndX = erasableRect.right - orbContainerCenter.x;
      const erasableCenterY = erasableRect.top + erasableRect.height / 2 - orbContainerCenter.y;
      const textWidth = erasableRect.width;

      // Orb starts BEFORE the left edge of erasable text (accounts for orb width/glow)
      // so it visually appears to approach from the left before text starts erasing
      if (orbRef.current) {
        orbRef.current.setPosition(erasableStartX - 30, erasableCenterY - 15);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Scrubbing animation - back and forth, progressing right
      // Position orb so it appears to be directly erasing the text
      // Orb makes 6 scrub movements, text erases smoothly and TRAILS SLIGHTLY behind the orb
      // The erase progress is tied to the orb's SEGMENT position
      const scrubCount = 6;
      const segmentWidth = textWidth / scrubCount;
      const substepsPerMovement = 3; // Break each 150ms into 3 × 50ms for smoother erase
      // Lag factor: erase trails orb by this many segments
      // 1.2 aligns erase with orb CORE (1.5 was at glow, 1.8 was too far behind)
      const lagFactor = 1.2;

      for (let i = 0; i < scrubCount; i++) {
        const baseX = erasableStartX + i * segmentWidth;

        // Down-left (southwest) - orb at START of segment i
        if (orbRef.current) {
          orbRef.current.setPosition(baseX - 10, erasableCenterY + 5);
        }
        // During down-left of segment i, erase the first half of this segment (lagged)
        for (let s = 0; s < substepsPerMovement; s++) {
          await new Promise((resolve) => setTimeout(resolve, 150 / substepsPerMovement));
          // Orb position during down-left: segment i, first half (0 to 0.5)
          const orbProgress = (i + (s + 1) / substepsPerMovement * 0.5) / scrubCount;
          // Erase trails behind by lagFactor
          const eraseProgress = Math.max(0, orbProgress - lagFactor / scrubCount);
          setEraserProgress(eraseProgress);
        }

        // Up-right (northeast) - orb at END of segment i
        if (orbRef.current) {
          orbRef.current.setPosition(baseX + segmentWidth + 10, erasableCenterY - 15);
        }
        // During up-right of segment i, erase the second half of this segment (lagged)
        for (let s = 0; s < substepsPerMovement; s++) {
          await new Promise((resolve) => setTimeout(resolve, 150 / substepsPerMovement));
          // Orb position during up-right: segment i, second half (0.5 to 1.0)
          const orbProgress = (i + 0.5 + (s + 1) / substepsPerMovement * 0.5) / scrubCount;
          // Erase trails behind by lagFactor
          const eraseProgress = Math.max(0, orbProgress - lagFactor / scrubCount);
          setEraserProgress(eraseProgress);
        }
      }

      // Final erase to complete the text removal (orb has passed everything)
      setEraserProgress(1);

      // Orb hovers at end position (at text level)
      if (orbRef.current) {
        orbRef.current.setPosition(erasableEndX + 10, erasableCenterY - 10);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Remaining words collapse into center
      await animate(
        '.remaining-text',
        { scale: 0.3, opacity: 0, x: 0 },
        { duration: 0.5, ease: 'easeIn' }
      );

      setShowContent(false);
      onExitComplete();
    };

    runExitAnimation();
  }, [phase, animate, onExitComplete, orbRef]);

  if (!showContent && phase !== 'show2' && phase !== 'breathe2') return null;

  return (
    <motion.div
      ref={scope}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: phase === 'show2' || phase === 'breathe2' || phase === 'exit2' ? 1 : 0,
        y: 0,
        scale: phase === 'breathe2' ? [1, BREATHE_SCALE, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.5 },
        y: { duration: 0.5 },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="font-display text-2xl md:text-3xl text-white text-center relative"
    >
      <span className="remaining-text inline-block mr-2">{STATEMENT_2.prefix}</span>

      {/* Erasable text with mask - italicized quote */}
      <span
        ref={erasableRef}
        className="inline-block mr-2 relative italic"
        style={{
          maskImage: `linear-gradient(90deg, transparent ${eraserProgress * 100}%, black ${eraserProgress * 100}%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent ${eraserProgress * 100}%, black ${eraserProgress * 100}%)`,
        }}
      >
        {STATEMENT_2.erasable}
      </span>

      <span className="remaining-text inline-block">{STATEMENT_2.suffix}</span>
    </motion.div>
  );
}

// ============================================================================
// STATEMENT 3: Collapse to Explosion
// ============================================================================
interface Statement3Props {
  phase: AnimationPhase;
  onExitComplete: () => void;
  orbRef: React.RefObject<OrbControl | null>;
  goldFoilStyle: React.CSSProperties;
}

function Statement3({ phase, onExitComplete, orbRef, goldFoilStyle }: Statement3Props) {
  const [scope, animate] = useAnimate();
  const highlightRef = useRef<HTMLSpanElement>(null);
  const hasMigrated = useRef(false);

  // When statement appears, start migrating the orb to behind "your best ideas"
  // Capture phase at effect start to detect if it changes during the delay
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if ((phase === 'show3' || phase === 'breathe3') && !hasMigrated.current) {
      hasMigrated.current = true;
      let cancelled = false;

      // Wait briefly for the text to render, then migrate orb behind "your best ideas"
      const timer = setTimeout(() => {
        // Defensive check: abort if unmounted, refs unavailable, or phase changed
        if (cancelled || !highlightRef.current || !orbRef.current) return;

        // Abort if phase changed during the delay (race condition prevention)
        if (phaseRef.current !== 'show3' && phaseRef.current !== 'breathe3') return;

        const highlightRect = highlightRef.current.getBoundingClientRect();

        // Get orb container center for component-relative positioning
        const orbContainerCenter = orbRef.current.getContainerCenter();
        if (!orbContainerCenter) return;

        // Position orb directly behind "your best ideas" text
        const targetX = highlightRect.left + highlightRect.width / 2 - orbContainerCenter.x;
        const targetY = highlightRect.top + highlightRect.height / 2 - orbContainerCenter.y;

        // Grow orb larger (3x) and dim it significantly so it doesn't wash out the text
        orbRef.current.setPosition(targetX, targetY);
        orbRef.current.setScale(3);
        orbRef.current.setDimmed(true);
      }, 400); // Short delay to let text render, then visibly migrate

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [phase, orbRef]);

  // Exit animation: migrate orb below text, then shake, then trigger explosion
  useEffect(() => {
    if (phase !== 'exit3') return;

    const runExitAnimation = async () => {
      if (!highlightRef.current || !orbRef.current) {
        onExitComplete();
        return;
      }

      const highlightRect = highlightRef.current.getBoundingClientRect();
      const orbContainerCenter = orbRef.current.getContainerCenter();

      if (!orbContainerCenter) {
        onExitComplete();
        return;
      }

      // Step 1: Text fades to gray
      await animate(
        scope.current,
        { color: '#606068' },
        { duration: 0.5 }
      );

      // Step 2: Migrate orb to explosion position
      // Use revelation container's ACTUAL position - no more pixel guessing
      // The revelation container is always rendered (just invisible), so we can get its real center
      const revelationCenter = orbRef.current.getRevelationCenter();

      let explosionX = 0;
      let explosionY = 0;

      if (revelationCenter) {
        // Position orb at the center of where revelation text will appear
        explosionX = revelationCenter.x - orbContainerCenter.x;
        explosionY = revelationCenter.y - orbContainerCenter.y;
      } else {
        // Fallback only if revelation ref not available (shouldn't happen)
        explosionY = highlightRect.bottom - orbContainerCenter.y + 60;
      }

      orbRef.current.setPosition(explosionX, explosionY);
      orbRef.current.setScale(1); // Return to normal size
      orbRef.current.setDimmed(false); // Un-dim for explosion

      // Wait for migration animation to complete
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Step 3: Intense shaking (radioactive isotope before reaction)
      orbRef.current.triggerShake();

      // Wait for shaking to complete
      await new Promise((resolve) => setTimeout(resolve, 1800));

      onExitComplete();
    };

    runExitAnimation();
  }, [phase, animate, onExitComplete, orbRef, scope]);

  // Statement3 stays visible through reveal and complete phases
  // (text is already grayed during exit3, keeps context for the revelation)
  const isVisible = ['show3', 'breathe3', 'exit3', 'reveal', 'complete'].includes(phase);

  return (
    <motion.div
      ref={scope}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: 0,
        scale: phase === 'breathe3' ? [1, BREATHE_SCALE, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.5 },
        y: { duration: 0.5 },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="font-display text-2xl md:text-3xl text-center relative text-white mb-8"
    >
      {STATEMENT_3.prefix}{' '}
      <span
        ref={highlightRef}
        className="relative inline-block font-semibold"
        style={{ ...goldFoilStyle }}
      >
        {STATEMENT_3.highlight}
      </span>
      {STATEMENT_3.suffix}
    </motion.div>
  );
}

// ============================================================================
// REVELATION TEXT - Text reveal only (particles moved to main component)
// ============================================================================
interface RevelationProps {
  visible: boolean;
  textPhase: 'idle' | 'reveal' | 'complete';
  containerRef: React.RefObject<HTMLDivElement | null>;
  goldFoilStyle: React.CSSProperties;
}

function Revelation({ visible, textPhase, containerRef, goldFoilStyle }: RevelationProps) {
  return (
    <div ref={containerRef} className="relative min-h-[100px] w-full flex items-center justify-center">
      {/* Final text - single string that expands from a point and dissolves into view */}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.1,
          filter: 'blur(20px)',
        }}
        animate={
          visible && (textPhase === 'reveal' || textPhase === 'complete')
            ? {
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
              }
            : {}
        }
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1], // Fast emergence from explosion
        }}
        className="font-display text-2xl md:text-3xl text-center text-white"
      >
        {REVELATION.prefix}
        <br className="md:hidden" />
        <span className="font-semibold" style={{ ...goldFoilStyle }}>
          {REVELATION.highlight}
        </span>
        {REVELATION.suffix}
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function IfStatementSequence({ isActive, onComplete }: IfStatementSequenceProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [orbVisible, setOrbVisible] = useState(false);
  const [orbVibrating, setOrbVibrating] = useState(false);
  const [orbScale, setOrbScale] = useState(1);
  const [orbDimmed, setOrbDimmed] = useState(false);
  const [orbShaking, setOrbShaking] = useState(false);

  // Use SSR-safe mobile detection hook
  const isMobile = useIsMobile();

  // Use brighter gold foil gradient on mobile for better visibility
  // Defaults to desktop gradient during SSR (isMobile === undefined)
  const goldFoilStyle = isMobile ? GOLD_FOIL_GRADIENT_MOBILE : GOLD_FOIL_GRADIENT;

  // Particle explosion state - rendered in main component to share orb's coordinate system
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particlePhase, setParticlePhase] = useState<'idle' | 'explode' | 'linger' | 'fall' | 'complete'>('idle');
  const [textPhase, setTextPhase] = useState<'idle' | 'reveal' | 'complete'>('idle');
  const particleStarted = useRef(false);
  const particleTimers = useRef<NodeJS.Timeout[]>([]); // Store timers in ref to persist across renders

  // Ref for the main container (orb's coordinate system origin is center of this)
  const mainContainerRef = useRef<HTMLDivElement>(null);
  // Ref for the Revelation container - used to get actual position for explosion alignment
  const revelationContainerRef = useRef<HTMLDivElement>(null);

  // Orb control ref passed to children
  const orbRef = useRef<OrbControl>({
    setPosition: (x: number, y: number) => {
      setOrbPosition({ x, y });
    },
    setVisible: (visible: boolean) => {
      setOrbVisible(visible);
    },
    setScale: (scale: number) => {
      setOrbScale(scale);
    },
    setDimmed: (dimmed: boolean) => {
      setOrbDimmed(dimmed);
    },
    triggerShake: () => {
      setOrbShaking(true);
      // Auto-reset after shake animation duration
      setTimeout(() => {
        setOrbShaking(false);
      }, 1500);
    },
    getContainerCenter: () => {
      if (!mainContainerRef.current) return null;
      const rect = mainContainerRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    },
    getRevelationCenter: () => {
      if (!revelationContainerRef.current) return null;
      const rect = revelationContainerRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    },
  });

  // Phase progression
  const advancePhase = useCallback(() => {
    setPhase((current) => {
      const phases: AnimationPhase[] = [
        'idle',
        'show1',
        'breathe1',
        'exit1',
        'show2',
        'breathe2',
        'exit2',
        'show3',
        'breathe3',
        'exit3',
        'reveal',
        'complete',
      ];
      const currentIndex = phases.indexOf(current);
      if (currentIndex >= 0 && currentIndex < phases.length - 1) {
        // Safe: we've validated index bounds above
        return phases[currentIndex + 1]!;
      }
      return current;
    });
  }, []);

  // Start sequence when active (only if still in idle phase)
  useEffect(() => {
    if (isActive && phase === 'idle') {
      // Small delay before starting
      const timer = setTimeout(() => setPhase('show1'), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, phase]);

  // Reset all state when becoming inactive
  useEffect(() => {
    if (!isActive) {
      setOrbVisible(false);
      setOrbVibrating(false);
      setOrbScale(1);
      setOrbDimmed(false);
      setOrbShaking(false);
      setOrbPosition({ x: 0, y: -80 });
      setPhase('idle');
      // Reset particle state
      setParticles([]);
      setParticlePhase('idle');
      setTextPhase('idle');
      particleStarted.current = false;
      // Clear any pending particle timers
      particleTimers.current.forEach(timer => clearTimeout(timer));
      particleTimers.current = [];
    }
  }, [isActive]);

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      particleTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Handle breathing phases - auto-advance after duration
  useEffect(() => {
    if (phase === 'breathe1' || phase === 'breathe2' || phase === 'breathe3') {
      const timer = setTimeout(() => {
        advancePhase();
      }, BREATHE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase, advancePhase]);

  // Handle show phases - advance to breathe after fade in
  useEffect(() => {
    if (phase === 'show1' || phase === 'show2' || phase === 'show3') {
      const timer = setTimeout(() => {
        advancePhase();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, advancePhase]);

  // Orb visibility is now controlled by Statement1 via orbRef.setVisible()

  // Orb vibration and particle explosion when reveal phase begins
  // NOTE: We use refs for timers so they persist when phase changes from 'reveal' to 'complete'
  // Timers are only cleared when component resets (isActive becomes false)
  useEffect(() => {
    if (phase === 'reveal' && !particleStarted.current) {
      particleStarted.current = true;

      // Orb vibrates then disappears
      setOrbVibrating(true);
      particleTimers.current.push(setTimeout(() => {
        setOrbVibrating(false);
        setOrbVisible(false);
      }, 800));

      // Create explosion particles - they'll be rendered at orbPosition (same coordinate system)
      // Reduced from 500 to 200 for better performance (especially in dev mode)
      const particleCount = 200;
      const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
        // Random angle in upper semicircle only (0 to PI = upward directions)
        const angle = Math.random() * Math.PI;
        // Vary distances for depth and spread
        const distance = 60 + Math.random() * 300;

        return {
          id: i,
          // X spreads left and right
          explosionX: Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1),
          // Y only goes UP (negative values) - this creates the "floor" effect
          explosionY: -Math.abs(Math.sin(angle) * distance) - 20,
          // Per-particle fall properties for organic ash-like movement
          fallDelay: Math.random() * 1.5,           // Staggered start (0-1.5s)
          fallDuration: 1.5 + Math.random() * 2,    // Variable speed (1.5-3.5s)
          driftX: (Math.random() - 0.5) * 120,      // Lateral drift (-60 to +60px)
        };
      });

      setParticles(newParticles);
      setParticlePhase('explode');

      // Text starts appearing with explosion
      particleTimers.current.push(setTimeout(() => {
        setTextPhase('reveal');
      }, 100));

      // After explosion, particles linger (2x longer = ~2.4s)
      particleTimers.current.push(setTimeout(() => {
        setParticlePhase('linger');
      }, 400));

      // Halfway through linger, particles start falling (gravity effect)
      particleTimers.current.push(setTimeout(() => {
        setParticlePhase('fall');
      }, 2800)); // 400ms explode + 2400ms linger

      // Complete - particles fade out and disappear
      // Account for staggered fall: 2800ms (fall start) + 1500ms (max delay) + 3500ms (max duration) = ~7.8s
      particleTimers.current.push(setTimeout(() => {
        setParticlePhase('complete');
        setTextPhase('complete');
      }, 7800)); // Total animation including all staggered particles
    }
    // No cleanup here - timers are managed by ref and cleared in the isActive reset effect
  }, [phase]);

  // Advance from reveal to complete after animation finishes
  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => {
        advancePhase(); // Move to complete
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, advancePhase]);

  // Notify complete
  useEffect(() => {
    if (phase === 'complete' && onComplete) {
      onComplete();
    }
  }, [phase, onComplete]);

  const handleExit1Complete = useCallback(() => {
    advancePhase(); // Move to show2
  }, [advancePhase]);

  const handleExit2Complete = useCallback(() => {
    advancePhase(); // Move to show3
  }, [advancePhase]);

  const handleExit3Complete = useCallback(() => {
    advancePhase(); // Move to reveal
  }, [advancePhase]);

  // Determine which statement to show
  const showStatement1 = ['show1', 'breathe1', 'exit1'].includes(phase);
  const showStatement2 = ['show2', 'breathe2', 'exit2'].includes(phase);
  const showStatement3 = ['show3', 'breathe3', 'exit3', 'reveal', 'complete'].includes(phase);
  const showRevelation = ['reveal', 'complete'].includes(phase);

  return (
    <div className="relative min-h-[200px] flex flex-col items-center justify-center">
      {/* Glowing Orb and Particles - share same coordinate system (centered in mainContainerRef) */}
      <div ref={mainContainerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
        {/* Explosion particles - rendered at orbPosition, same coordinate system as orb */}
        {particlePhase !== 'idle' && particlePhase !== 'complete' && particles.map((particle) => {
          // Calculate fall target: particles flow DOWN the page toward where EventHero date will appear
          // This draws user attention downward into the next section
          const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
          // Target Y: flow down toward bottom of viewport (positive Y = down in this coordinate system)
          // The particles should travel down ~60-80% of the viewport height
          const fallTargetY = orbPosition.y + vh * 0.7 + (particle.fallDelay * 100);
          // Target X: drift toward center (x=0 in the coordinate system) with some randomness
          const fallTargetX = particle.driftX * 0.3; // Converge toward center

          return (
            <motion.div
              key={`particle-${particle.id}`}
              initial={{
                x: orbPosition.x,
                y: orbPosition.y,
                scale: 0.3,
                opacity: 1,
              }}
              animate={
                particlePhase === 'explode'
                  ? {
                      // Quick outward explosion
                      x: orbPosition.x + particle.explosionX,
                      y: orbPosition.y + particle.explosionY,
                      scale: 0.6,
                      opacity: 0.9,
                    }
                  : particlePhase === 'linger'
                    ? {
                        // Linger at exploded position, slight drift
                        x: orbPosition.x + particle.explosionX * 1.1,
                        y: orbPosition.y + particle.explosionY * 1.1,
                        scale: 0.5,
                        opacity: 0.8,
                      }
                    : {
                        // Flow DOWN the page toward event date/location
                        // X: converge toward center where the gold date text will appear
                        x: fallTargetX,
                        // Y: flow DOWN (positive Y) toward bottom of scrollytelling section
                        y: fallTargetY,
                        scale: 0.1,
                        opacity: 0,
                      }
              }
              transition={
                particlePhase === 'explode'
                  ? { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
                  : particlePhase === 'linger'
                    ? { duration: 2.4, ease: 'easeOut' }
                    : {
                        // Staggered fall with per-particle timing for organic cascading effect
                        duration: particle.fallDuration * 1.2, // Slightly longer for longer travel
                        delay: particle.fallDelay,
                        ease: [0.25, 0.1, 0.25, 1], // Smooth acceleration then deceleration
                      }
              }
              className="absolute"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: GOLD,
                boxShadow: `0 0 8px ${GOLD}, 0 0 16px ${GOLD}`,
                willChange: 'transform, opacity', // GPU acceleration hint
              }}
            />
          );
        })}

        {/* Glowing Orb */}
        <motion.div
          animate={{
            x: orbShaking
              ? [orbPosition.x - 8, orbPosition.x + 8, orbPosition.x - 6, orbPosition.x + 6, orbPosition.x - 4, orbPosition.x + 4, orbPosition.x - 2, orbPosition.x + 2, orbPosition.x]
              : orbPosition.x,
            y: orbShaking
              ? [orbPosition.y - 6, orbPosition.y + 6, orbPosition.y - 4, orbPosition.y + 4, orbPosition.y - 3, orbPosition.y + 3, orbPosition.y - 1, orbPosition.y + 1, orbPosition.y]
              : orbPosition.y,
            scale: orbVibrating
              ? [orbScale, orbScale * 0.3, orbScale * 0.2, orbScale * 0.1]
              : orbVisible
                ? orbScale
                : 0,
            opacity: orbVisible ? (orbDimmed ? 0.27 : 1) : 0, // Dimmed is 33% more dim than before
          }}
          transition={
            orbShaking
              ? { duration: 1.5, times: [0, 0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.85, 1], ease: 'easeInOut' }
              : orbVibrating
                ? { duration: 0.6, times: [0, 0.3, 0.6, 1] }
                : {
                    // Slower spring for ~2s migrations (halved stiffness)
                    x: { type: 'spring', stiffness: 30, damping: 12 },
                    y: { type: 'spring', stiffness: 30, damping: 12 },
                    scale: { type: 'spring', stiffness: 30, damping: 12 },
                    opacity: { duration: 0.5 },
                  }
          }
          className="relative"
          style={{ width: 32, height: 32 }}
        >
          {/* Outer gold glow - matches DissolvingBoundary */}
          <motion.div
            animate={{
              scale: orbShaking ? [1, 1.5, 1, 1.8, 1, 2, 1.2] : [1, 1.2, 1],
              opacity: orbDimmed ? [0.3, 0.5, 0.3] : [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: orbShaking ? 1.5 : 2,
              repeat: orbShaking ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: GOLD,
              filter: orbDimmed ? 'blur(8px)' : 'blur(4px)',
            }}
          />
          {/* Inner white core - larger and more visible on mobile */}
          <motion.div
            animate={{
              scale: orbShaking ? [1, 0.8, 1.2, 0.9, 1.3, 1] : [1, 1.15, 1],
              opacity: orbDimmed ? 0.7 : 1,
            }}
            transition={{
              duration: orbShaking ? 1.5 : 2,
              repeat: orbShaking ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: '20%',
              left: '20%',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              backgroundColor: '#fff',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)',
            }}
          />
        </motion.div>
      </div>

      {/* Statements */}
      <AnimatePresence mode="wait">
        {showStatement1 && (
          <Statement1
            key="statement1"
            phase={phase}
            onExitComplete={handleExit1Complete}
            orbRef={orbRef}
            goldFoilStyle={goldFoilStyle}
          />
        )}

        {showStatement2 && (
          <Statement2
            key="statement2"
            phase={phase}
            onExitComplete={handleExit2Complete}
            orbRef={orbRef}
          />
        )}

        {showStatement3 && (
          <Statement3
            key="statement3"
            phase={phase}
            onExitComplete={handleExit3Complete}
            orbRef={orbRef}
            goldFoilStyle={goldFoilStyle}
          />
        )}
      </AnimatePresence>

      {/* Revelation Text - persists */}
      <Revelation visible={showRevelation} textPhase={textPhase} containerRef={revelationContainerRef} goldFoilStyle={goldFoilStyle} />
    </div>
  );
}
