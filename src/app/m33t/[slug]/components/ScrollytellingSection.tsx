'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { BRAND_GOLD } from '@/lib/design-system';

// ============================================================================
// CONSTANTS
// ============================================================================
const GOLD = BRAND_GOLD.primary;
const BG_PRIMARY = '#0a0a0f';

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
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.4,
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

        {/* Animated circles - start separated, then converge */}
        <circle
          cx={isConverged ? '150' : '100'}
          cy={isConverged ? '110' : '90'}
          r="55"
          fill="rgba(212, 168, 75, 0.12)"
          stroke={GOLD}
          strokeWidth="2"
          className="transition-all duration-1000 ease-out"
        />
        <circle
          cx={isConverged ? '150' : '200'}
          cy={isConverged ? '110' : '90'}
          r="55"
          fill="rgba(74, 222, 128, 0.08)"
          stroke="#4ade80"
          strokeWidth="2"
          className="transition-all duration-1000 ease-out"
          style={{ transitionDelay: '100ms' }}
        />
        <circle
          cx="150"
          cy={isConverged ? '110' : '165'}
          r="55"
          fill="rgba(96, 165, 250, 0.08)"
          stroke="#60a5fa"
          strokeWidth="2"
          className="transition-all duration-1000 ease-out"
          style={{ transitionDelay: '200ms' }}
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
          className="transition-all duration-1000"
        >
          SPEED
        </text>
        <text
          x={isConverged ? '150' : '200'}
          y={isConverged ? '112' : '85'}
          textAnchor="middle"
          fill="#4ade80"
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.05em"
          className="transition-all duration-1000"
          style={{ transitionDelay: '100ms' }}
        >
          COST
        </text>
        <text
          x="150"
          y={isConverged ? '134' : '170'}
          textAnchor="middle"
          fill="#60a5fa"
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.05em"
          className="transition-all duration-1000"
          style={{ transitionDelay: '200ms' }}
        >
          QUALITY
        </text>

        {/* "All three" indicator - fades in after convergence */}
        <text
          x="150"
          y="160"
          textAnchor="middle"
          fill="#fff"
          fontSize="11"
          fontWeight="500"
          letterSpacing="0.1em"
          className="transition-all duration-500"
          style={{
            opacity: isConverged ? 0.8 : 0,
            transitionDelay: isConverged ? '800ms' : '0ms',
          }}
        >
          ALL THREE
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

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          <p className="text-zinc-500 text-lg md:text-xl mb-6">
            Everyone keeps asking the same question:
          </p>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-8"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            &ldquo;How do we adopt AI into our organization?&rdquo;
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl mb-4">
            But that question assumes your current way of working is the
            foundation worth preserving.
          </p>
          <p
            className="text-2xl md:text-3xl font-medium"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            It&apos;s not. <span style={{ color: GOLD }}>It&apos;s obsolete.</span>
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

          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            The constraints you&apos;re operating under{' '}
            <span style={{ color: GOLD }}>no longer exist.</span>
          </h1>
          <p
            className="text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-zinc-300"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Where you think there are edges,{' '}
            <span style={{ color: GOLD }}>there aren&apos;t.</span>
          </p>
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
          <p className="text-zinc-500 text-lg mb-6">
            Speed vs cost vs quality. What requires a developer. What&apos;s
            &ldquo;feasible&rdquo; for a small team.
          </p>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight mb-8"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Those lines have{' '}
            <span style={{ color: GOLD }}>moved dramatically.</span>
          </h2>
          <p
            className="text-xl md:text-2xl text-zinc-400 mb-12"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Most people are still making decisions based on a world that no
            longer exists.
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
          <p className="text-zinc-400 text-lg md:text-xl mb-8">
            The question isn&apos;t how to fit AI into what you&apos;re doing.
          </p>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            The question is:{' '}
            <span style={{ color: GOLD }}>
              what would you build if you started from scratch,
            </span>{' '}
            knowing what&apos;s now possible?
          </h2>
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
            style={{ color: GOLD }}
          >
            March 30, 2025 &bull; Austin, TX
          </p>
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-medium mb-10"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            This evening is about:
          </h2>

          <div className="space-y-4 text-left max-w-lg mx-auto mb-14">
            <div className="flex gap-4 items-baseline">
              <span
                className="text-white text-xl md:text-2xl font-medium"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                1.
              </span>
              <p
                className="text-xl md:text-2xl lg:text-3xl text-zinc-300"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Breaking down that old mental model;
              </p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span
                className="text-white text-xl md:text-2xl font-medium"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                2.
              </span>
              <p
                className="text-xl md:text-2xl lg:text-3xl text-zinc-300"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Rebuilding it from first principles; and
              </p>
            </div>
            <div className="flex gap-4 items-baseline">
              <span
                className="text-xl md:text-2xl font-medium"
                style={{ fontFamily: 'Georgia, serif', color: GOLD }}
              >
                3.
              </span>
              <p
                className="text-xl md:text-2xl lg:text-3xl text-white"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Learning to imagine{' '}
                <span style={{ color: GOLD }}>what&apos;s now possible.</span>
              </p>
            </div>
          </div>

          {/* Event Name Reveal */}
          <div className="mb-12">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-wide mb-3"
              style={{ fontFamily: 'Georgia, serif', color: GOLD }}
            >
              NO EDGES
            </h1>
            <p
              className="text-lg md:text-xl text-zinc-300 italic"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The lines have moved. Have you?
            </p>
          </div>

          <div className="animate-bounce text-zinc-600">↓</div>
        </div>
      </div>
    </div>
  );
}
