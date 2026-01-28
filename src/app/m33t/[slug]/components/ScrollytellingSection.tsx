'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { BRAND_GOLD, GOLD_FOIL_GRADIENT, GOLD_FOIL_GRADIENT_MOBILE } from '@/lib/design-system';
import { IfStatementSequence } from './IfStatementSequence';

// ============================================================================
// CONSTANTS
// ============================================================================
const GOLD = BRAND_GOLD.primary;
const BG_PRIMARY = '#0a0a0f';

const PARTICLE_COUNT = 200;
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

export interface ScrollytellingSectionProps {
  onComplete: () => void;
}

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
      delay: Math.random() * 1.2,       // Staggered start: 0-1.2s
      duration: 3.2 + Math.random() * 1.6, // Slow dissolve: 3.2-4.8s
      size: 2 + Math.random() * 2,
    });
  }

  return particles;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * ProgressBar - Fixed scroll progress indicator
 */
function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 z-50"
      style={{
        scaleX,
        transformOrigin: 'left',
        background: `linear-gradient(to right, #b45309, ${GOLD})`,
      }}
    />
  );
}

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
      {/* SVG Layer - Rectangle only */}
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
            duration: 1.6,
            ease: 'easeOut',
          }}
        />
      </svg>

      {/* CSS-based center glow - uses blur filter for soft diffused glow like IfStatementSequence orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative" style={{ width: 32, height: 32 }}>
          {/* Outer gold glow - blur filter creates soft diffused effect (no hard edges) */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: GOLD,
              filter: 'blur(4px)',
            }}
          />
          {/* Inner white core */}
          <motion.div
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
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

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

/**
 * Converging Venn Diagram - Speed/Cost/Quality circles that merge
 */
function ConvergingVenn({ isConverged }: { isConverged: boolean }) {
  return (
    <div className="relative w-80 h-64 mx-auto">
      <svg viewBox="0 0 300 220" className="w-full h-full">
        {/* Ghost outlines - old "pick two" positions */}
        <circle
          cx="100"
          cy="90"
          r="55"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.3"
        />
        <circle
          cx="200"
          cy="90"
          r="55"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.3"
        />
        <circle
          cx="150"
          cy="165"
          r="55"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.3"
        />

        {/* Gold backglow - appears when converged */}
        <circle
          cx="150"
          cy="110"
          r="70"
          fill={GOLD}
          style={{
            filter: 'blur(30px)',
            opacity: isConverged ? 0.3 : 0,
            transition: 'opacity 1.5s ease-out',
            transitionDelay: isConverged ? '1.5s' : '0s',
          }}
        />

        {/* Animated circles - start separated, then converge together */}
        <circle
          cx={isConverged ? '150' : '100'}
          cy={isConverged ? '110' : '90'}
          r="55"
          fill="rgba(212, 168, 75, 0.12)"
          stroke={GOLD}
          strokeWidth="2"
          style={{ transition: 'all 2s ease-out' }}
        />
        <circle
          cx={isConverged ? '150' : '200'}
          cy={isConverged ? '110' : '90'}
          r="55"
          fill="rgba(212, 168, 75, 0.08)"
          stroke={GOLD}
          strokeWidth="2"
          style={{ transition: 'all 2s ease-out' }}
        />
        <circle
          cx="150"
          cy={isConverged ? '110' : '165'}
          r="55"
          fill="rgba(212, 168, 75, 0.08)"
          stroke={GOLD}
          strokeWidth="2"
          style={{ transition: 'all 2s ease-out' }}
        />

        {/* Labels */}
        <text
          x={isConverged ? '150' : '100'}
          y={isConverged ? '90' : '85'}
          textAnchor="middle"
          fill={GOLD}
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.05em"
          style={{ transition: 'all 2s ease-out' }}
        >
          SPEED
        </text>
        <text
          x={isConverged ? '150' : '200'}
          y={isConverged ? '112' : '85'}
          textAnchor="middle"
          fill={GOLD}
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.05em"
          style={{ transition: 'all 2s ease-out' }}
        >
          COST
        </text>
        <text
          x="150"
          y={isConverged ? '134' : '170'}
          textAnchor="middle"
          fill={GOLD}
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.05em"
          style={{ transition: 'all 2s ease-out' }}
        >
          QUALITY
        </text>

        {/* "Why Choose?" indicator - fades in after convergence, below circles */}
        <text
          x="150"
          y="205"
          textAnchor="middle"
          fill={GOLD}
          fontSize="18"
          fontWeight="600"
          letterSpacing="0.15em"
          className="transition-all duration-500"
          style={{
            opacity: isConverged ? 1 : 0,
            transitionDelay: isConverged ? '800ms' : '0ms',
          }}
        >
          WHY CHOOSE?
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function ScrollytellingSection({ onComplete }: ScrollytellingSectionProps) {
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use SSR-safe mobile detection hook
  const isMobile = useIsMobile();

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use brighter gold foil gradient on mobile for better visibility
  // Defaults to desktop gradient during SSR (isMobile === undefined)
  const goldFoilStyle = isMobile ? GOLD_FOIL_GRADIENT_MOBILE : GOLD_FOIL_GRADIENT;

  // Calculate which slide is active based on scroll
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const activeSlide = Math.min(Math.floor((scrollY + vh * 0.4) / vh), 4);

  // Venn diagram convergence happens partway through slide 3
  const slideStart = vh * 1.6;
  const convergenceThreshold = slideStart + vh * 0.25;
  const isVennConverged = scrollY > convergenceThreshold;


  // Check if scrollytelling is complete
  useEffect(() => {
    if (scrollY > vh * 4.5) {
      onComplete();
    }
  }, [scrollY, vh, onComplete]);

  return (
    <div
      ref={containerRef}
      className="bg-zinc-950 text-white"
      style={{ background: BG_PRIMARY }}
    >
      <ProgressBar />

      {/* ================================================================
          SLIDE 1: The Wrong Question
          ================================================================ */}
      <div
        className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${
          activeSlide === 0 ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <div className="text-center max-w-4xl">
          <p className="font-body text-zinc-500 text-lg md:text-xl mb-6">
            Everyone keeps asking the same question:
          </p>
          <h1
            className="font-display text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-12 md:mb-8"
          >
            &ldquo;How do we adopt <span style={{ ...goldFoilStyle }}>AI</span> into our organization?&rdquo;
          </h1>
          <p className="font-body text-zinc-400 text-lg md:text-xl mb-4">
            But that question assumes your current way of working is a
            foundation worth preserving.
          </p>
          <p
            className="font-display text-2xl md:text-3xl font-medium"
          >
            It&apos;s not. <span className="text-white font-semibold">It&apos;s obsolete.</span>
          </p>
        </div>
      </div>

      {/* ================================================================
          SLIDE 2: The Thesis (Dissolving Boundary)
          ================================================================ */}
      <div
        className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${
          activeSlide === 1 ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <div className="text-center max-w-4xl">
          <DissolvingBoundary isActive={activeSlide === 1} />

          <p
            className="font-display text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-zinc-300 mb-6"
          >
            The constraints you&apos;re operating under
            <br />
            <span className="font-medium pb-1 inline-block" style={{ ...goldFoilStyle }}>no longer exist.</span>
          </p>
          <h1
            className="font-display text-4xl md:text-5xl lg:text-6xl font-medium leading-tight"
          >
            Where you think there{' '}
            <span className="whitespace-nowrap">are edges,</span>
            <br />
            <span className="font-medium" style={{ ...goldFoilStyle }}>there are not.</span>
          </h1>
        </div>
      </div>

      {/* ================================================================
          SLIDE 3: The Gap (Converging Venn)
          ================================================================ */}
      <div
        className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${
          activeSlide === 2 ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <div className="text-center max-w-4xl">
          <p className="font-body text-zinc-500 text-lg mb-6">
            Speed vs cost vs quality.
            <br />
            What requires a developer.
            <br />
            What&apos;s &ldquo;feasible&rdquo; for a small team.
          </p>
          <h2
            className="font-display text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-8"
          >
            Those lines have
            <br />
            <span className="font-medium pb-1 inline-block" style={{ ...goldFoilStyle }}>moved dramatically.</span>
          </h2>
          <p
            className="font-display text-xl md:text-2xl text-zinc-400 mb-12"
          >
            But most people are still making decisions
            <br />
            based on a world that no longer exists.
          </p>

          <ConvergingVenn isConverged={isVennConverged} />
        </div>
      </div>

      {/* ================================================================
          SLIDE 4: The Reframe
          ================================================================ */}
      <div
        className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${
          activeSlide === 3 ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <div className="text-center max-w-4xl">
          <p className="font-body text-zinc-400 text-lg md:text-xl mb-6">
            The question isn&apos;t how to fit AI into what you&apos;re doing.
          </p>
          <p className="font-body text-zinc-400 text-lg md:text-xl mb-4">
            The question is:
          </p>
          <h2
            className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-12 pb-1 text-white"
          >
            How would you design and run your business...
          </h2>

          {/* Sequential If-Statement Animations */}
          <IfStatementSequence isActive={activeSlide === 3} />
        </div>
      </div>

      {/* ================================================================
          SLIDE 5: The Promise (Event Reveal)
          ================================================================ */}
      <div
        className={`min-h-screen flex items-center justify-center px-6 md:px-12 transition-opacity duration-700 ${
          activeSlide === 4 ? 'opacity-100' : 'opacity-20'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(212, 168, 75, 0.06) 0%, transparent 70%)',
        }}
      >
        <div className="text-center max-w-3xl">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-8"
            style={{ ...goldFoilStyle }}
          >
            March 12, 2026 &bull; Austin, TX
          </p>
          <h2
            className="font-display text-2xl md:text-3xl lg:text-4xl font-medium mb-10"
          >
            This evening is about:
          </h2>

          <div className="space-y-4 text-left max-w-lg mx-auto mb-14">
            <div className="flex gap-4 items-baseline">
              <span
                className="font-display text-white text-xl md:text-2xl font-medium"
              >
                1.
              </span>
              <p
                className="font-display text-xl md:text-2xl lg:text-3xl text-zinc-300"
              >
                Breaking down and discarding your old mental model of the world;
              </p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span
                className="font-display text-white text-xl md:text-2xl font-medium"
              >
                2.
              </span>
              <p
                className="font-display text-xl md:text-2xl lg:text-3xl text-zinc-300"
              >
                Rebuilding that mental model from first principles; and
              </p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span
                className="font-display text-white text-xl md:text-2xl font-medium"
              >
                3.
              </span>
              <p
                className="font-display text-xl md:text-2xl lg:text-3xl text-zinc-300"
              >
                Starting to{' '}
                <span
                  className="font-medium pb-1 inline-block"
                  style={{ ...goldFoilStyle }}
                >
                  imagine what&apos;s possible
                </span>{' '}
                when the edges disappear.
              </p>
            </div>
          </div>

          <div className="animate-bounce text-zinc-600">↓</div>
        </div>
      </div>
    </div>
  );
}
