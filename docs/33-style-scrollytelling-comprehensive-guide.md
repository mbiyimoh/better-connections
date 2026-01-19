# Scrollytelling Deck Development Guide

This comprehensive guide documents patterns, components, animations, and brand guidelines for building premium scrollytelling presentations at 33 Strategies.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Animation Patterns](#animation-patterns)
4. [Brand & Design System](#brand--design-system)
5. [Advanced Patterns](#advanced-patterns)
6. [Multi-Phase Navigation](#multi-phase-navigation)
7. [Interactive Elements](#interactive-elements)
8. [Full Deck Template](#full-deck-template)
9. [Best Practices](#best-practices)

---

## Architecture Overview

### What is a Scrollytelling Deck?

A scrollytelling deck is a premium, scroll-driven presentation with:
- **Full-viewport sections** that fade in/out as user scrolls
- **Staggered text animations** for dramatic reveals
- **Progress indicators** showing scroll position
- **Navigation dots** for section jumping (desktop)
- **Dark editorial aesthetic** with the 33 Strategies brand

### Tech Stack

```typescript
// Core dependencies
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import React, { useState, useEffect, useRef } from 'react';
```

### File Structure

```
components/
├── deck/                          # Shared deck components
│   ├── Section.tsx                # Full-viewport section wrapper
│   ├── RevealText.tsx             # Animated text reveal
│   ├── SectionLabel.tsx           # Gold uppercase label
│   ├── Card.tsx                   # Content card
│   ├── ProgressBar.tsx            # Scroll progress indicator
│   ├── NavDots.tsx                # Section navigation dots
│   └── index.ts                   # Barrel export
│
├── clients/
│   ├── plya/
│   │   └── PLYAProposal.tsx       # Multi-phase proposal deck
│   └── wsbc/
│       └── WSBCFinalProposal.tsx  # Demo + pitch deck
```

---

## Core Components

### 1. Section

Full-viewport container with fade-in animation when scrolled into view.

```tsx
// components/deck/Section.tsx
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface SectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function Section({
  id,
  children,
  className = '',
  fullHeight = true
}: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20%' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`
        ${fullHeight ? 'min-h-screen' : ''}
        flex flex-col justify-center
        px-6 md:px-16 lg:px-24 py-16
        ${className}
      `}
    >
      {children}
    </motion.section>
  );
}
```

**Usage:**
```tsx
<Section id="intro" className="relative">
  <div className="max-w-4xl mx-auto">
    {/* Section content */}
  </div>
</Section>
```

### 2. RevealText

Text that fades in and slides up when scrolled into view.

```tsx
// components/deck/RevealText.tsx
'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface RevealTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function RevealText({
  children,
  delay = 0,
  className = ''
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-10%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Staggered Timing Pattern:**
```tsx
<RevealText>
  <SectionLabel>SECTION LABEL</SectionLabel>
</RevealText>

<RevealText delay={0.1}>
  <h2 className="font-display text-4xl">Headline</h2>
</RevealText>

<RevealText delay={0.2}>
  <p className="text-zinc-400">Body text...</p>
</RevealText>

<RevealText delay={0.3}>
  <button>CTA</button>
</RevealText>
```

### 3. SectionLabel

Gold uppercase label for section headings.

```tsx
// components/deck/SectionLabel.tsx
interface SectionLabelProps {
  number?: number | string;
  label: string;
  className?: string;
}

export function SectionLabel({ number, label, className = '' }: SectionLabelProps) {
  const formattedNumber = typeof number === 'number'
    ? String(number).padStart(2, '0')
    : number;

  return (
    <p className={`
      text-[#d4a54a] text-xs font-medium
      tracking-[0.2em] uppercase mb-4
      font-mono
      ${className}
    `}>
      {formattedNumber ? `${formattedNumber} — ${label}` : label}
    </p>
  );
}
```

**Alternative inline pattern (from proposals):**
```tsx
<p className="font-mono" style={{
  color: '#d4a54a',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: 16
}}>
  SECTION LABEL
</p>
```

### 4. ProgressBar

Fixed scroll progress indicator at top of viewport.

```tsx
// components/deck/ProgressBar.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

interface ProgressBarProps {
  color?: string;
}

export function ProgressBar({ color = '#d4a54a' }: ProgressBarProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 origin-left z-50"
      style={{ scaleX, backgroundColor: color }}
    />
  );
}
```

### 5. NavDots

Right-side navigation dots (desktop only).

```tsx
// components/deck/NavDots.tsx
'use client';

interface NavDotsProps {
  sections: { id: string; label: string }[];
  activeSection: string;
}

export function NavDots({ sections, activeSection }: NavDotsProps) {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={`
            group flex items-center gap-3
            ${activeSection === section.id ? 'opacity-100' : 'opacity-50 hover:opacity-100'}
            transition-opacity
          `}
        >
          <span className="text-xs text-right w-40 hidden group-hover:block text-[#555555]">
            {section.label}
          </span>
          <span className={`
            w-2 h-2 rounded-full transition-all duration-300
            ${activeSection === section.id
              ? 'bg-[#d4a54a] scale-125'
              : 'bg-zinc-700 group-hover:bg-zinc-500'
            }
          `} />
        </a>
      ))}
    </div>
  );
}
```

### 6. Card

Content container with optional highlight and glow effects.

```tsx
// components/deck/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  glow?: boolean;
}

export function Card({
  children,
  className = '',
  highlight = false,
  glow = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-[#111114]
        border ${highlight ? 'border-[#d4a54a]/50' : 'border-white/[0.08]'}
        rounded-2xl p-6 md:p-8
        ${className}
      `}
      style={glow ? { boxShadow: '0 0 40px rgba(212,165,74,0.3)' } : undefined}
    >
      {children}
    </div>
  );
}
```

---

## Animation Patterns

### Timing Constants

```typescript
// Standard easing curves
const easeOutExpo = [0.25, 0.4, 0.25, 1];  // Smooth deceleration
const easeOut = "easeOut";                  // Standard

// Standard durations
const durations = {
  fast: 0.3,      // Quick transitions (hover, button states)
  normal: 0.6,    // Standard animations
  slow: 0.8,      // Section fades
  reveal: 0.7,    // Text reveals
};

// Stagger delays
const staggerDelays = {
  tight: 0.05,    // Fast sequential items
  normal: 0.1,    // Standard stagger
  relaxed: 0.15,  // Slower builds
};
```

### Section Fade Pattern

```tsx
// Section observer for active section tracking
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    { rootMargin: '-50% 0px' }  // Trigger at section midpoint
  );

  sections.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, []);
```

### Scroll Bounce Animation (from WSBC)

```css
@keyframes scrollBounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) translateY(12px);
    opacity: 0.5;
  }
}
```

```tsx
// Scroll indicator component
<div style={{
  position: 'absolute',
  bottom: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  textAlign: 'center'
}}>
  <p style={{ fontSize: 11, color: '#737373', marginBottom: 8, letterSpacing: '0.1em' }}>
    Scroll
  </p>
  <div style={{
    width: 24,
    height: 40,
    borderRadius: 12,
    border: '2px solid #737373',
    margin: '0 auto',
    position: 'relative'
  }}>
    <div style={{
      width: 4,
      height: 8,
      borderRadius: 2,
      background: '#d4a54a',
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      animation: 'scrollBounce 2s ease-in-out infinite'
    }} />
  </div>
</div>
```

### Breathing Animation (from WSBC)

```tsx
const Breathing = ({
  children,
  duration = 5,
  delay = 0
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
}) => (
  <div style={{
    display: 'inline-block',
    animation: `breathe ${duration}s ease-in-out ${delay}s infinite`
  }}>
    {children}
    <style>{`
      @keyframes breathe {
        0%, 100% { transform: scale(0.92); }
        50% { transform: scale(1.08); }
      }
    `}</style>
  </div>
);
```

### Typing Indicator Animation (from WSBC)

```css
@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
```

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
  <span style={{
    width: 5, height: 5, borderRadius: '50%',
    background: '#737373',
    animation: 'typingBounce 1.4s ease-in-out infinite',
    animationDelay: '0s'
  }} />
  <span style={{
    width: 5, height: 5, borderRadius: '50%',
    background: '#737373',
    animation: 'typingBounce 1.4s ease-in-out infinite',
    animationDelay: '0.2s'
  }} />
  <span style={{
    width: 5, height: 5, borderRadius: '50%',
    background: '#737373',
    animation: 'typingBounce 1.4s ease-in-out infinite',
    animationDelay: '0.4s'
  }} />
</div>
```

### Ambient Background with Floating Particles (from WSBC)

```tsx
const AmbientBackground = ({
  intensity = 1,
  color = '#d4a54a'
}: {
  intensity?: number;
  color?: string;
}) => {
  const particleCount = 15;
  const particlesRef = useRef(
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 12,
      duration: 12 + Math.random() * 10,
      xStart: Math.random() * 100,
      xDrift: (Math.random() - 0.5) * 40,
      size: 2 + Math.random() * 3,
      maxOpacity: (0.12 + Math.random() * 0.15) * intensity,
    }))
  );

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0
    }}>
      {particlesRef.current.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          bottom: -20,
          left: `${p.xStart}%`,
          width: p.size,
          height: p.size,
          background: color,
          borderRadius: '50%',
          filter: 'blur(1px)',
          animation: `floatUp-${p.id} ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}

      {/* Morphing blob backgrounds */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        top: -100,
        right: -100,
        background: color,
        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        filter: 'blur(80px)',
        opacity: 0.12 * intensity,
        animation: 'blobMorph1 12s ease-in-out infinite alternate'
      }} />

      <style>{`
        ${particlesRef.current.map(p => `
          @keyframes floatUp-${p.id} {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 0; }
            25% { opacity: ${p.maxOpacity}; }
            75% { opacity: ${p.maxOpacity}; }
            90% { opacity: 0; }
            100% { transform: translateY(-100vh) translateX(${p.xDrift}px); opacity: 0; }
          }
        `).join('')}
        @keyframes blobMorph1 {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
      `}</style>
    </div>
  );
};
```

---

## Brand & Design System

### Color Palette

```typescript
// 33 Strategies Brand Colors
const COLORS = {
  // Backgrounds
  BG_PRIMARY: '#0a0a0f',     // Main background
  BG_SURFACE: '#111114',      // Cards, containers
  BG_ELEVATED: '#1a1a1f',     // Hover states, elevated surfaces

  // Text
  TEXT_PRIMARY: '#ffffff',    // Headlines
  TEXT_SECONDARY: '#a3a3a3',  // Body text
  TEXT_MUTED: '#737373',      // Captions, labels
  TEXT_DIM: '#525252',        // Tertiary, placeholder

  // Primary Accent (Gold)
  GOLD: '#d4a54a',
  GOLD_LIGHT: '#e4c06b',
  GOLD_DIM: 'rgba(212, 165, 74, 0.15)',
  GOLD_GLOW: 'rgba(212, 165, 74, 0.3)',

  // Semantic
  GREEN: '#4ade80',           // Success, Track B
  BLUE: '#60a5fa',            // Information
  RED: '#f87171',             // Warnings
};
```

### Typography

```typescript
// Font families (via Tailwind classes)
const FONTS = {
  display: 'font-display',    // Instrument Serif - Headlines
  body: 'font-body',          // DM Sans - Body text
  mono: 'font-mono',          // JetBrains Mono - Labels, code
};

// Alternative: Georgia for editorial feel
const FONT_EDITORIAL = {
  display: "fontFamily: 'Georgia, serif'",
  body: "fontFamily: 'Inter, -apple-system, sans-serif'",
};
```

### Headline Patterns

```tsx
// Headline with gold accent
<h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-8">
  Main headline with <span className="text-[#d4a54a]">gold accent</span>
</h2>

// Editorial headline (Georgia)
<h1 style={{
  fontFamily: 'Georgia, serif',
  fontSize: 'clamp(32px, 6vw, 56px)',
  fontWeight: 400,
  lineHeight: 1.15,
  color: '#fff',
  marginBottom: 24
}}>
  Headline with <span style={{ color: '#d4a54a' }}>accent</span>
</h1>
```

### Callout Box Pattern (from PLYA)

```tsx
// Left-border accent callout
<div style={{
  marginTop: 32,
  padding: 24,
  background: '#111114',
  borderRadius: 16,
  border: '1px solid rgba(212, 165, 74, 0.15)'
}}>
  <p className="font-body" style={{
    fontSize: 14,
    color: '#737373',
    marginBottom: 8
  }}>
    What this type of work typically costs:
  </p>
  <p className="font-display" style={{ fontSize: 28, color: '#d4a54a' }}>
    $15K – $30K
  </p>
</div>
```

### Featured Card with Glow (from PLYA)

```tsx
<div style={{
  marginTop: 40,
  padding: 48,
  background: '#111114',
  borderRadius: 24,
  border: '2px solid #d4a54a',
  boxShadow: '0 0 60px rgba(212, 165, 74, 0.15)'
}}>
  <p className="font-display" style={{ fontSize: 64, color: '#d4a54a', marginBottom: 8 }}>
    $27K
  </p>
  <p className="font-body" style={{ fontSize: 24, color: '#a3a3a3' }}>
    ~8 weeks
  </p>
</div>
```

### Glow Effects

```tsx
// Radial glow background
<div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  height: 600,
  pointerEvents: 'none',
  background: 'radial-gradient(circle, rgba(212, 165, 74, 0.15) 0%, transparent 60%)'
}} />

// Box glow
boxShadow: '0 0 60px rgba(212, 165, 74, 0.15)'

// Strong glow (for emphasis)
boxShadow: '0 8px 32px rgba(212, 165, 74, 0.3)'
```

---

## Advanced Patterns

### iPhone Mockup (from WSBC)

```tsx
const IPhoneMockup = ({
  children,
  label
}: {
  children: React.ReactNode;
  label?: string;
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20
  }}>
    <div style={{
      width: 280,
      height: 580,
      position: 'relative',
      filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))'
    }}>
      {/* iPhone frame SVG */}
      <svg
        width="280"
        height="580"
        viewBox="0 0 280 580"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      >
        <rect x="0" y="0" width="280" height="580" rx="40" fill="#1a1a1a"/>
        {/* Side buttons */}
        <rect x="-2" y="100" width="3" height="24" rx="1" fill="#2a2a2a"/>
        <rect x="-2" y="140" width="3" height="40" rx="1" fill="#2a2a2a"/>
        <rect x="-2" y="186" width="3" height="40" rx="1" fill="#2a2a2a"/>
        <rect x="279" y="150" width="3" height="60" rx="1" fill="#2a2a2a"/>
        {/* Inner screen bezel */}
        <rect x="4" y="4" width="272" height="572" rx="36" fill="#0d0d0d"/>
      </svg>

      {/* Screen content */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        width: 264,
        height: 564,
        borderRadius: 32,
        overflow: 'hidden',
        background: '#0a0a0f',
        zIndex: 2
      }}>
        {children}
      </div>

      {/* Dynamic Island + Home Indicator */}
      <svg
        width="280"
        height="580"
        viewBox="0 0 280 580"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 3, pointerEvents: 'none' }}
      >
        <rect x="90" y="18" width="100" height="28" rx="14" fill="#000000"/>
        <circle cx="158" cy="32" r="6" fill="#1a1a1a"/>
        <circle cx="158" cy="32" r="4" fill="#0a1a2a"/>
        <rect x="100" y="554" width="80" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
      </svg>
    </div>

    {label && (
      <p style={{
        fontSize: 15,
        color: '#fff',
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 1.5,
        fontWeight: 500
      }}>
        {label}
      </p>
    )}
  </div>
);
```

### Story Progress Bar (from WSBC)

```tsx
const StoryProgressBar = ({
  totalSlides,
  currentSlide,
  progress
}: {
  totalSlides: number;
  currentSlide: number;
  progress: number;
}) => (
  <div style={{
    display: 'flex',
    gap: 4,
    padding: '16px 16px 12px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100
  }}>
    {Array.from({ length: totalSlides }).map((_, i) => (
      <div key={i} style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.15)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          background: '#fff',
          borderRadius: 2,
          width: i < currentSlide
            ? '100%'
            : i === currentSlide
              ? `${progress}%`
              : '0%'
        }} />
      </div>
    ))}
  </div>
);
```

### Chat Bubble Animation (from WSBC)

```tsx
const ChatBubble = ({
  role,
  text,
  isNew = false,
  accentColor = '#c5050c'
}: {
  role: 'user' | 'system';
  text: string;
  isNew?: boolean;
  accentColor?: string;
}) => {
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: isNew ? 'bubbleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
    }}>
      <div style={{
        maxWidth: '82%',
        padding: '14px 18px',
        borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
        background: isUser
          ? `linear-gradient(145deg, ${accentColor} 0%, ${accentColor}dd 100%)`
          : 'linear-gradient(145deg, #1a1a1f 0%, #111114 100%)',
        boxShadow: '4px 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        fontSize: 15,
        color: '#fff',
        lineHeight: 1.5,
      }}>
        {text}
      </div>
      <style>{`
        @keyframes bubbleIn {
          0% { opacity: 0; transform: translateY(12px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
```

### Expandable Card (from PLYA PhaseCard)

```tsx
const ExpandableCard = ({
  title,
  tagline,
  price,
  deliverables,
  isSelected,
  onSelect
}: {
  title: string;
  tagline: string;
  price: number;
  deliverables: string[];
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <motion.div
    onClick={onSelect}
    whileHover={{ scale: 1.01 }}
    style={{
      padding: 24,
      background: isSelected ? '#1a1a1f' : '#111114',
      borderRadius: 16,
      border: `2px solid ${isSelected ? '#d4a54a' : '#27272a'}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16
    }}>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: '#737373' }}>{tagline}</p>
      </div>

      {/* Checkbox indicator */}
      <div style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: `2px solid ${isSelected ? '#d4a54a' : '#525252'}`,
        background: isSelected ? '#d4a54a' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isSelected && <span style={{ color: '#0a0a0f', fontSize: 14 }}>✓</span>}
      </div>
    </div>

    {/* Deliverables list */}
    <ul style={{
      margin: 0,
      paddingLeft: 16,
      fontSize: 14,
      color: '#a3a3a3',
      lineHeight: 1.8
    }}>
      {deliverables.slice(0, 4).map((d, i) => (
        <li key={i}>{d}</li>
      ))}
      {deliverables.length > 4 && (
        <li style={{ color: '#737373' }}>+{deliverables.length - 4} more</li>
      )}
    </ul>

    {/* Price */}
    <div style={{
      paddingTop: 16,
      borderTop: '1px solid #27272a',
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <p className="font-display" style={{ fontSize: 28, color: '#d4a54a' }}>
        ${price.toLocaleString()}
      </p>
    </div>
  </motion.div>
);
```

---

## Multi-Phase Navigation

### Hash-Based Routing (from PLYA)

```tsx
type ViewMode = 'intro' | 'proposal' | 'summary';

const HASH_MAP: Record<string, ViewMode> = {
  '': 'intro',
  '#': 'intro',
  '#intro': 'intro',
  '#proposal': 'proposal',
  '#summary': 'summary',
};

const MODE_TO_HASH: Record<ViewMode, string> = {
  intro: '#intro',
  proposal: '#proposal',
  summary: '#summary',
};

export default function MultiPhaseDeck() {
  const [viewMode, setViewMode] = useState<ViewMode>('intro');

  // Read initial hash on mount
  useEffect(() => {
    const hash = window.location.hash || '';
    const initialMode = HASH_MAP[hash] || 'intro';
    setViewMode(initialMode);

    // Normalize URL to always show hash
    if (hash !== MODE_TO_HASH[initialMode]) {
      window.history.replaceState(null, '', MODE_TO_HASH[initialMode]);
    }

    // Listen for browser back/forward
    const handleHashChange = () => {
      const newHash = window.location.hash || '';
      const newMode = HASH_MAP[newHash] || 'intro';
      setViewMode(newMode);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigate programmatically
  const navigateTo = (mode: ViewMode) => {
    setViewMode(mode);
    window.history.pushState(null, '', MODE_TO_HASH[mode]);
    window.scrollTo(0, 0);
  };

  // Render current phase
  if (viewMode === 'intro') {
    return <IntroSection onComplete={() => navigateTo('proposal')} />;
  }

  if (viewMode === 'proposal') {
    return <ProposalSection onNext={() => navigateTo('summary')} />;
  }

  return <SummarySection />;
}
```

### Phase Transition with Fade (from WSBC)

```tsx
type Phase = 'intro' | 'demo' | 'pitch';

export default function WSBCDeck() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [demoVisible, setDemoVisible] = useState(false);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  // Handle demo fade-in
  useEffect(() => {
    if (phase === 'demo') {
      requestAnimationFrame(() => setDemoVisible(true));
    } else {
      setDemoVisible(false);
    }
  }, [phase]);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {phase === 'intro' && (
        <IntroSection onComplete={() => setPhase('demo')} />
      )}

      {phase === 'demo' && (
        <div style={{
          opacity: demoVisible ? 1 : 0,
          transition: 'opacity 0.8s ease-in-out',
        }}>
          <DemoSection onComplete={() => setPhase('pitch')} />
        </div>
      )}

      {phase === 'pitch' && (
        <PitchSection />
      )}
    </div>
  );
}
```

---

## Interactive Elements

### Equity Slider (from PLYA)

```tsx
const EquitySlider = ({
  value,
  onChange,
  maxEquity = 3.3
}: {
  value: number;
  onChange: (value: number) => void;
  maxEquity?: number;
}) => {
  return (
    <div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4a54a, #c49a42);
          cursor: pointer;
          border: 2px solid #0a0a0f;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4a54a, #c49a42);
          cursor: pointer;
          border: 2px solid #0a0a0f;
        }
      `}</style>

      <input
        type="range"
        min="0"
        max="33"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(to right, #d4a54a ${value * 3}%, #27272a ${value * 3}%)`,
          cursor: 'pointer',
          WebkitAppearance: 'none'
        }}
      />

      <div className="font-mono" style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        color: '#525252',
        marginTop: 8
      }}>
        <span>100% Cash</span>
        <span>67% Cash / {maxEquity.toFixed(1)}% Equity</span>
      </div>
    </div>
  );
};
```

### Expandable FAQ (from WSBC)

```tsx
const ExpandableFAQ = ({
  faqs
}: {
  faqs: { q: string; a: string }[];
}) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      {faqs.map((faq, i) => (
        <div
          key={i}
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: 16,
            marginBottom: 16
          }}
        >
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
              {faq.q}
            </span>
            <span style={{
              color: '#737373',
              transform: expanded === i ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              fontSize: 12
            }}>
              ▼
            </span>
          </button>

          {expanded === i && (
            <p style={{
              fontSize: 13,
              color: '#a3a3a3',
              marginTop: 12,
              lineHeight: 1.6
            }}>
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## Full Deck Template

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// ============================================================================
// CONSTANTS
// ============================================================================
const GOLD = '#d4a54a';
const GOLD_DIM = 'rgba(212, 165, 74, 0.15)';
const BG_PRIMARY = '#0a0a0f';
const BG_SURFACE = '#111114';

// ============================================================================
// COMPONENTS
// ============================================================================
const ProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: GOLD,
        transformOrigin: 'left',
        zIndex: 100,
        scaleX
      }}
    />
  );
};

const Section = ({ children, id }: { children: React.ReactNode; id: string }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20%' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 24px',
        position: 'relative',
      }}
    >
      {children}
    </motion.section>
  );
};

const RevealText = ({
  children,
  delay = 0
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-10%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono" style={{
    color: GOLD,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: 16
  }}>
    {children}
  </p>
);

const Headline = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display" style={{
    fontSize: 'clamp(32px, 6vw, 56px)',
    fontWeight: 400,
    lineHeight: 1.15,
    color: '#fff',
    marginBottom: 24
  }}>
    {children}
  </h2>
);

const NavDots = ({
  sections,
  activeSection
}: {
  sections: { id: string; label: string }[];
  activeSection: string;
}) => (
  <div style={{
    position: 'fixed',
    right: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    zIndex: 100
  }}>
    {sections.map((section) => (
      <a
        key={section.id}
        href={`#${section.id}`}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: activeSection === section.id ? GOLD : 'rgba(255,255,255,0.2)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: activeSection === section.id ? 'scale(1.25)' : 'scale(1)'
        }}
        title={section.label}
      />
    ))}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DeckTemplate() {
  const [activeSection, setActiveSection] = useState('title');

  const sections = [
    { id: 'title', label: 'Title' },
    { id: 'problem', label: 'The Problem' },
    { id: 'solution', label: 'Our Solution' },
    { id: 'next-steps', label: 'Next Steps' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-50% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-body" style={{
      background: BG_PRIMARY,
      color: '#fff',
      minHeight: '100vh'
    }}>
      <ProgressBar />
      <NavDots sections={sections} activeSection={activeSection} />

      {/* TITLE SECTION */}
      <Section id="title">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <RevealText>
            <SectionLabel>Presentation Title</SectionLabel>
          </RevealText>
          <RevealText delay={0.1}>
            <Headline>
              Main headline with <span style={{ color: GOLD }}>emphasis</span>
            </Headline>
          </RevealText>
          <RevealText delay={0.2}>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: '#a3a3a3' }}>
              Introductory paragraph that sets the stage for the presentation.
            </p>
          </RevealText>
        </div>
      </Section>

      {/* PROBLEM SECTION */}
      <Section id="problem">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <RevealText>
            <SectionLabel>The Problem</SectionLabel>
          </RevealText>
          <RevealText delay={0.1}>
            <Headline>
              Current state <span style={{ color: GOLD }}>challenges</span>
            </Headline>
          </RevealText>
          <RevealText delay={0.2}>
            <div style={{
              padding: 24,
              background: BG_SURFACE,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <p style={{ fontSize: 16, color: '#a3a3a3', lineHeight: 1.7 }}>
                Problem description with supporting details...
              </p>
            </div>
          </RevealText>
        </div>
      </Section>

      {/* SOLUTION SECTION */}
      <Section id="solution">
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <RevealText>
            <SectionLabel>Our Solution</SectionLabel>
          </RevealText>
          <RevealText delay={0.1}>
            <Headline>
              A <span style={{ color: GOLD }}>different</span> approach
            </Headline>
          </RevealText>
          <RevealText delay={0.2}>
            <div style={{
              marginTop: 40,
              padding: 48,
              background: BG_SURFACE,
              borderRadius: 24,
              border: `2px solid ${GOLD}`,
              boxShadow: `0 0 60px ${GOLD_DIM}`
            }}>
              <p className="font-display" style={{
                fontSize: 64,
                color: GOLD,
                marginBottom: 8
              }}>
                $XX,XXX
              </p>
              <p style={{ fontSize: 24, color: '#a3a3a3' }}>
                Timeline / Summary
              </p>
            </div>
          </RevealText>
        </div>
      </Section>

      {/* NEXT STEPS SECTION */}
      <Section id="next-steps">
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <RevealText>
            <SectionLabel>What's Next</SectionLabel>
          </RevealText>
          <RevealText delay={0.1}>
            <Headline>
              Let's get <span style={{ color: GOLD }}>started</span>
            </Headline>
          </RevealText>
          <RevealText delay={0.2}>
            <p style={{
              fontSize: 18,
              color: '#a3a3a3',
              marginBottom: 40,
              lineHeight: 1.7
            }}>
              Clear call to action explaining what happens next.
            </p>
          </RevealText>
          <RevealText delay={0.3}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '20px 48px',
                fontSize: 18,
                fontWeight: 600,
                background: GOLD,
                color: BG_PRIMARY,
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              Primary CTA →
            </motion.button>
          </RevealText>
        </div>
      </Section>
    </div>
  );
}
```

---

## Best Practices

### 1. Performance

- Use `once: false` on `useInView` for bi-directional animations (scroll up/down)
- Use `useRef` with initialization flags to prevent double-init in React Strict Mode
- Lazy load heavy components with `dynamic(() => import(...))`

```tsx
const hasInitialized = useRef(false);

useEffect(() => {
  if (hasInitialized.current) return;
  hasInitialized.current = true;
  // initialization logic
}, []);
```

### 2. Responsive Design

```tsx
// Typography scaling
fontSize: 'clamp(32px, 6vw, 56px)'

// Padding scaling
padding: '64px 24px'  // Mobile
// md:px-16 lg:px-24   // Tailwind responsive

// Grid responsive
gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
```

### 3. Accessibility

- Always include `title` attributes on navigation dots
- Ensure sufficient color contrast (gold on dark passes WCAG AA)
- Support keyboard navigation for interactive elements
- Include semantic HTML (`<section>`, `<nav>`, `<button>`)

### 4. Brand Consistency

- **Gold (#d4a54a)** is the primary accent — use sparingly for maximum impact
- **Headlines**: Instrument Serif (font-display) or Georgia for editorial feel
- **Body**: DM Sans (font-body) or Inter for readability
- **Labels**: JetBrains Mono (font-mono) with tracking-[0.2em] uppercase

### 5. Animation Timing

- **Stagger delays**: 0.1s between sequential elements (max 0.4-0.5s total)
- **Section fades**: 0.8s duration
- **Text reveals**: 0.7s duration
- **Hover transitions**: 0.2-0.3s duration
- **Custom easing**: `[0.25, 0.4, 0.25, 1]` for smooth deceleration

---

## Related Documentation

- **Design System**: `.claude/skills/33-strategies-frontend-design.md`
- **Component Library**: `docs/developer-guides/learning-module-components.md`
- **Web Decks Knowledge**: `docs/WEB-DECKS-KNOWLEDGE.md`

---

*Last Updated: January 2025*
