# Task Breakdown: Enrichment Completion Gamification

**Generated**: 2025-12-27
**Source**: specs/enrichment-completion-gamification/02-spec.md
**Feature Slug**: enrichment-completion-gamification
**Last Decompose**: 2025-12-27

---

## Overview

Transform the enrichment completion screen into a habit-forming celebration with:
- Animated score improvement bar (color gradient red→amber→green)
- Number ticker animation
- Rank change celebration message
- Weekly streak tracking
- Soft Chinese bell/chime sound effects

---

## Phase 1: Database & API Foundation

### Task 1.1: Add EnrichmentStreak Model to Prisma Schema
**Description**: Add new database model to track weekly enrichment activity
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (must complete first)

**Technical Requirements**:
Add to `prisma/schema.prisma`:

```prisma
model EnrichmentStreak {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  weekStart       DateTime  // Monday 00:00:00 UTC of the streak week
  contactsEnriched Int      @default(0)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, weekStart])
  @@index([userId])
}
```

Also add relation to User model:
```prisma
model User {
  // ... existing fields ...
  enrichmentStreaks EnrichmentStreak[]
}
```

**Implementation Steps**:
1. Edit `prisma/schema.prisma` to add EnrichmentStreak model
2. Add relation field to User model
3. Run `npm run db:backup` (safety)
4. Run `npx prisma migrate dev --name add-enrichment-streak`
5. Verify migration success with `npx prisma studio`

**Acceptance Criteria**:
- [ ] EnrichmentStreak model exists in schema
- [ ] User relation is properly defined
- [ ] Migration runs without errors
- [ ] Prisma client regenerated

---

### Task 1.2: Create Completion Data API Endpoint
**Description**: Build API endpoint that returns score, ranking, and streak data for completion celebration
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (database model)
**Can run parallel with**: None

**Technical Requirements**:
Create `src/app/api/enrichment/completion-data/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface CompletionDataResponse {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    enrichmentScore: number;
  };
  ranking: {
    currentRank: number;
    previousRank: number;
    totalContacts: number;
    percentile: number;
  };
  streak: {
    count: number;
    weekStart: string;
  };
  scoreDelta: number;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const previousScore = parseInt(searchParams.get("previousScore") || "0");

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get contact with new score
    const contact = await prisma.contact.findUnique({
      where: { id: contactId, userId: user.id },
      select: { id: true, firstName: true, lastName: true, enrichmentScore: true }
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get all contacts for ranking calculation
    const allContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, enrichmentScore: true },
      orderBy: { enrichmentScore: "desc" }
    });

    // Calculate current rank (1-indexed)
    const currentRank = allContacts.findIndex(c => c.id === contactId) + 1;

    // Calculate previous rank - where would previousScore have placed?
    const contactsWithHigherScore = allContacts.filter(c =>
      c.id !== contactId && c.enrichmentScore > previousScore
    ).length;
    const previousRank = contactsWithHigherScore + 1;

    // Get/update streak
    const weekStart = getWeekStart(new Date());
    const streak = await prisma.enrichmentStreak.upsert({
      where: {
        userId_weekStart: { userId: user.id, weekStart }
      },
      update: { contactsEnriched: { increment: 1 } },
      create: { userId: user.id, weekStart, contactsEnriched: 1 }
    });

    const response: CompletionDataResponse = {
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        enrichmentScore: contact.enrichmentScore,
      },
      ranking: {
        currentRank,
        previousRank,
        totalContacts: allContacts.length,
        percentile: Math.round((1 - currentRank / allContacts.length) * 100)
      },
      streak: {
        count: streak.contactsEnriched,
        weekStart: weekStart.toISOString()
      },
      scoreDelta: contact.enrichmentScore - previousScore
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" }
    });

  } catch (error) {
    console.error("Completion data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion data" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

**Acceptance Criteria**:
- [ ] Endpoint returns 401 for unauthenticated requests
- [ ] Endpoint returns 400 if contactId missing
- [ ] Endpoint returns 404 if contact not found
- [ ] Returns correct contact data with new score
- [ ] Ranking calculation is correct (1-indexed)
- [ ] Previous rank calculation works
- [ ] Streak is incremented on each call
- [ ] Week start calculation uses Monday 00:00 UTC
- [ ] Cache-Control headers present on all responses

---

## Phase 2: Core Animation Components

### Task 2.1: Create NumberTicker Component
**Description**: Build animated counting number component using requestAnimationFrame
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 2.2, 2.3

**Technical Requirements**:
Create `src/components/enrichment/completion/NumberTicker.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";

interface NumberTickerProps {
  from: number;
  to: number;
  duration?: number; // ms
  className?: string;
}

export function NumberTicker({
  from,
  to,
  duration = 1500,
  className = "",
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(from);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad for satisfying deceleration
      const eased = 1 - (1 - progress) * (1 - progress);

      const current = Math.round(from + (to - from) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      startTimeRef.current = null;
    };
  }, [from, to, duration]);

  return <span className={className}>{displayValue}</span>;
}
```

**Acceptance Criteria**:
- [ ] Number animates smoothly from `from` to `to`
- [ ] Animation respects `duration` prop
- [ ] Ease-out quad easing feels natural
- [ ] Handles same from/to values (no animation)
- [ ] Cleans up animation frame on unmount
- [ ] Accepts className for styling

---

### Task 2.2: Create useCelebrationSounds Hook
**Description**: Build Web Audio API hook for soft Chinese bell/chime sounds
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.3

**Technical Requirements**:
Create `src/components/enrichment/completion/sounds/useCelebrationSounds.ts`:

```typescript
"use client";

import { useCallback, useRef, useEffect } from "react";

// Pentatonic scale frequencies for soft, pleasant chimes
// These create a Chinese bell/meditation bowl quality
const SCORE_COMPLETE_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
const RANK_REVEAL_FREQUENCIES = [783.99, 987.77, 1174.66];   // G5, B5, D6 higher chord

export function useCelebrationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction (required for mobile)
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("touchstart", initAudio, { once: true });

    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
  }, []);

  const playChime = useCallback((frequencies: number[], duration: number = 0.8) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      // Create oscillator with sine wave for soft bell-like tone
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Create gain node for ADSR-like envelope
      const gain = ctx.createGain();

      // Bell-like envelope: quick attack, long exponential decay
      // Volume capped at 0.15 for subtle, non-jarring sound
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02); // Quick 20ms attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Slow decay

      // Slight delay between notes for arpeggio effect
      const delay = i * 0.08;

      // Connect audio graph
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Schedule playback
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  }, []);

  const playScoreComplete = useCallback(() => {
    playChime(SCORE_COMPLETE_FREQUENCIES, 1.0);
  }, [playChime]);

  const playRankReveal = useCallback(() => {
    playChime(RANK_REVEAL_FREQUENCIES, 1.2);
  }, [playChime]);

  return { playScoreComplete, playRankReveal };
}
```

**Key Implementation Notes**:
- Uses Web Audio API for low-latency, high-quality sound
- Sine wave oscillators produce soft, bell-like tones
- Volume capped at 0.15 to be subtle (not jarring)
- Arpeggio effect with 80ms delay between notes
- Quick 20ms attack + long exponential decay = meditation bowl sound
- Handles mobile browser autoplay restrictions

**Acceptance Criteria**:
- [ ] Audio context initializes on first user interaction
- [ ] playScoreComplete produces soft C-E-G major chord
- [ ] playRankReveal produces higher G-B-D chord
- [ ] Sound is subtle and pleasant (not jarring)
- [ ] Handles browsers with suspended audio context
- [ ] Works on both desktop and mobile
- [ ] No console errors when audio not available

---

### Task 2.3: Create ScoreImprovementBar Component
**Description**: Build animated progress bar with color gradient (red→orange→amber→green)
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1 (NumberTicker)
**Can run parallel with**: Task 2.2

**Technical Requirements**:
Create `src/components/enrichment/completion/ScoreImprovementBar.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { NumberTicker } from "./NumberTicker";

interface ScoreImprovementBarProps {
  previousScore: number;
  newScore: number;
  isAnimating: boolean;
  showDelta: boolean;
}

// Color thresholds and their corresponding colors
function getScoreColor(score: number): string {
  if (score <= 25) return "#EF4444"; // red-500
  if (score <= 50) return "#F97316"; // orange-500
  if (score <= 75) return "#F59E0B"; // amber-500
  return "#22C55E"; // green-500
}

// Generate CSS gradient stops for the filled bar
function getGradientStops(endScore: number): string {
  const stops: string[] = [];

  // Red zone (0-25)
  stops.push("#EF4444 0%");
  if (endScore <= 25) {
    return stops.join(", ");
  }
  stops.push("#EF4444 25%");

  // Orange zone (25-50)
  stops.push("#F97316 25%");
  if (endScore <= 50) {
    return stops.join(", ");
  }
  stops.push("#F97316 50%");

  // Amber zone (50-75)
  stops.push("#F59E0B 50%");
  if (endScore <= 75) {
    return stops.join(", ");
  }
  stops.push("#F59E0B 75%");

  // Green zone (75-100)
  stops.push("#22C55E 75%");
  stops.push("#22C55E 100%");

  return stops.join(", ");
}

export function ScoreImprovementBar({
  previousScore,
  newScore,
  isAnimating,
  showDelta,
}: ScoreImprovementBarProps) {
  const [displayScore, setDisplayScore] = useState(previousScore);

  // Spring animation for smooth, physics-based bar fill
  const springValue = useSpring(previousScore, {
    stiffness: 50,
    damping: 20,
  });

  // Start animation when isAnimating becomes true
  useEffect(() => {
    if (isAnimating) {
      springValue.set(newScore);
    }
  }, [isAnimating, newScore, springValue]);

  // Update display score as spring animates
  useEffect(() => {
    return springValue.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
  }, [springValue]);

  // Transform spring value to percentage width
  const width = useTransform(springValue, [0, 100], ["0%", "100%"]);

  const delta = newScore - previousScore;
  const endColor = getScoreColor(newScore);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Enrichment Score
        </span>
      </div>

      {/* Progress bar container */}
      <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{
            width,
            background: `linear-gradient(90deg, ${getGradientStops(newScore)})`,
          }}
        />
      </div>

      {/* Score display with ticker */}
      <div className="flex items-center justify-center gap-3">
        <div className="text-2xl font-bold text-white tabular-nums">
          <NumberTicker
            from={previousScore}
            to={isAnimating ? newScore : previousScore}
            duration={1500}
          />
          <span className="text-zinc-500 font-normal"> / 100</span>
        </div>

        {/* Delta badge - fades in after animation */}
        {showDelta && delta > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${endColor}20`,
              color: endColor
            }}
          >
            +{delta}
          </motion.span>
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Bar animates from previousScore to newScore width
- [ ] Color gradient shows red→orange→amber→green zones
- [ ] NumberTicker counts up in sync with bar
- [ ] Delta badge (+32) appears after animation with correct color
- [ ] Spring animation has satisfying physics
- [ ] Animation duration is ~1.5 seconds
- [ ] Handles edge cases (0, 100, same score)

---

### Task 2.4: Create RankCelebration Component
**Description**: Build conditional rank change message with milestone recognition
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2, 2.3

**Technical Requirements**:
Create `src/components/enrichment/completion/RankCelebration.tsx`:

```typescript
"use client";

import { Trophy, Flame, Star, TrendingUp } from "lucide-react";

interface RankCelebrationProps {
  contactName: string;
  currentRank: number;
  previousRank: number;
  totalContacts: number;
}

export function RankCelebration({
  contactName,
  currentRank,
  previousRank,
  totalContacts,
}: RankCelebrationProps) {
  const rankDelta = previousRank - currentRank;

  // Don't show for single contact or no change
  if (totalContacts <= 1) {
    return null;
  }

  // Determine message and styling based on achievement tier
  let message: string;
  let Icon = TrendingUp;
  let iconColor = "text-amber-400";
  let bgColor = "bg-amber-500/10";
  let borderColor = "border-amber-500/20";

  if (currentRank === 1) {
    // #1 - Most enriched contact
    message = `${contactName} is now your most enriched contact!`;
    Icon = Trophy;
    iconColor = "text-yellow-400";
    bgColor = "bg-yellow-500/10";
    borderColor = "border-yellow-500/20";
  } else if (currentRank <= 3 && previousRank > 3) {
    // Entered top 3
    message = `${contactName} just cracked your Top 3!`;
    Icon = Star;
    iconColor = "text-purple-400";
    bgColor = "bg-purple-500/10";
    borderColor = "border-purple-500/20";
  } else if (currentRank <= 10 && previousRank > 10) {
    // Entered top 10
    message = `${contactName} just entered your Top 10!`;
    Icon = Flame;
    iconColor = "text-orange-400";
    bgColor = "bg-orange-500/10";
    borderColor = "border-orange-500/20";
  } else if (currentRank <= 10) {
    // Stayed in top 10
    message = `${contactName} stays in your Top 10!`;
    Icon = Flame;
  } else if (rankDelta > 50) {
    // Major jump (50+ spots)
    message = `Nice! ${contactName} moved from #${previousRank} to #${currentRank}!`;
  } else if (rankDelta > 10) {
    // Moderate jump (10-50 spots)
    message = `${contactName} moved up ${rankDelta} spots to #${currentRank}!`;
  } else if (rankDelta > 0) {
    // Small improvement
    message = `${contactName} moved up to #${currentRank} of ${totalContacts}`;
  } else {
    // No improvement (shouldn't normally happen)
    return null;
  }

  return (
    <div className={`${bgColor} ${borderColor} border rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={iconColor}>
          <Icon size={24} />
        </div>
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Shows trophy icon and gold styling for #1
- [ ] Shows star icon and purple styling for Top 3 entry
- [ ] Shows flame icon and orange styling for Top 10 entry
- [ ] Shows appropriate message for each milestone tier
- [ ] Returns null for single contact (no leaderboard)
- [ ] Returns null for no improvement
- [ ] Handles large rank improvements (50+ spots)

---

### Task 2.5: Create StreakBadge Component
**Description**: Build weekly enrichment streak display badge
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: All Phase 2 tasks

**Technical Requirements**:
Create `src/components/enrichment/completion/StreakBadge.tsx`:

```typescript
"use client";

import { Zap } from "lucide-react";

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  // Don't show for first enrichment of the week
  if (count <= 1) {
    return null;
  }

  const getMessage = () => {
    if (count >= 20) return `On fire! ${count} contacts enriched this week`;
    if (count >= 10) return `Great streak! ${count} this week`;
    if (count >= 5) return `${count} contacts enriched this week`;
    return `${count} enriched this week`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
      <Zap size={14} className="text-amber-400" />
      <span className="text-xs font-medium text-amber-300">
        {getMessage()}
      </span>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Returns null for count <= 1 (first of week)
- [ ] Shows appropriate message based on count tiers
- [ ] Uses amber/gold color scheme
- [ ] Zap icon displays correctly
- [ ] Badge is compact and centered

---

### Task 2.6: Create CompletionSummary Component
**Description**: Extract and refactor category grid from existing session page
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: All Phase 2 tasks

**Technical Requirements**:
Create `src/components/enrichment/completion/CompletionSummary.tsx`:

```typescript
"use client";

import type { EnrichmentBubble } from "@/components/enrichment/EnrichmentBubbles";

interface CompletionSummaryProps {
  bubbles: EnrichmentBubble[];
}

const categories = ["relationship", "opportunity", "interest", "expertise"] as const;

export function CompletionSummary({ bubbles }: CompletionSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map((cat) => {
        const catBubbles = bubbles.filter((b) => b.category === cat);
        return (
          <div key={cat}>
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {cat}
            </h3>
            <div className="flex flex-col gap-1">
              {catBubbles.length > 0 ? (
                catBubbles.map((b) => (
                  <div key={b.id} className="text-[13px] text-zinc-400">
                    • {b.text}
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-zinc-600 italic">
                  (none captured)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Displays all 4 category columns
- [ ] Filters bubbles by category correctly
- [ ] Shows "(none captured)" for empty categories
- [ ] Styling matches existing design
- [ ] Works with EnrichmentBubble type

---

## Phase 3: Orchestration & Integration

### Task 3.1: Create CompletionCelebration Component
**Description**: Build main orchestration component that sequences all animations
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 2.1-2.6 (all Phase 2 components)
**Can run parallel with**: None (depends on all Phase 2)

**Technical Requirements**:
Create `src/components/enrichment/completion/CompletionCelebration.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreImprovementBar } from "./ScoreImprovementBar";
import { RankCelebration } from "./RankCelebration";
import { StreakBadge } from "./StreakBadge";
import { CompletionSummary } from "./CompletionSummary";
import { useCelebrationSounds } from "./sounds/useCelebrationSounds";
import type { EnrichmentBubble } from "@/components/enrichment/EnrichmentBubbles";
import { getDisplayName } from "@/types/contact";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  enrichmentScore: number;
}

interface CompletionData {
  ranking: {
    currentRank: number;
    previousRank: number;
    totalContacts: number;
  };
  streak: {
    count: number;
  };
  scoreDelta: number;
}

interface CompletionCelebrationProps {
  contact: Contact;
  previousScore: number;
  newScore: number;
  bubbles: EnrichmentBubble[];
  completionData: CompletionData | null;
  onEnrichNext: () => void;
  onBackToQueue: () => void;
  saving?: boolean;
}

type AnimationPhase =
  | "initial"
  | "score-animating"
  | "score-complete"
  | "rank-reveal"
  | "summary"
  | "complete";

export function CompletionCelebration({
  contact,
  previousScore,
  newScore,
  bubbles,
  completionData,
  onEnrichNext,
  onBackToQueue,
  saving = false,
}: CompletionCelebrationProps) {
  const [phase, setPhase] = useState<AnimationPhase>("initial");
  const { playScoreComplete, playRankReveal } = useCelebrationSounds();

  // Animation timeline orchestration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase transitions with precise timing
    timers.push(setTimeout(() => setPhase("score-animating"), 300));
    timers.push(setTimeout(() => {
      setPhase("score-complete");
      playScoreComplete();
    }, 1800));
    timers.push(setTimeout(() => {
      setPhase("rank-reveal");
      playRankReveal();
    }, 2300));
    timers.push(setTimeout(() => setPhase("summary"), 2800));
    timers.push(setTimeout(() => setPhase("complete"), 3200));

    return () => timers.forEach(clearTimeout);
  }, [playScoreComplete, playRankReveal]);

  // Phase-based visibility flags
  const showScoreBar = phase !== "initial";
  const showDelta = ["score-complete", "rank-reveal", "summary", "complete"].includes(phase);
  const showRank = ["rank-reveal", "summary", "complete"].includes(phase);
  const showSummary = ["summary", "complete"].includes(phase);
  const showCTAs = phase === "complete";

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-8">

          {/* Success Icon */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <Sparkles size={32} className="text-green-400" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold text-white mb-1"
            >
              {getDisplayName(contact)} enriched
            </motion.h2>
          </div>

          {/* Score Improvement Bar */}
          <AnimatePresence>
            {showScoreBar && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <ScoreImprovementBar
                  previousScore={previousScore}
                  newScore={newScore}
                  isAnimating={phase === "score-animating"}
                  showDelta={showDelta}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rank Celebration */}
          <AnimatePresence>
            {showRank && completionData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mb-6"
              >
                <RankCelebration
                  contactName={contact.firstName}
                  currentRank={completionData.ranking.currentRank}
                  previousRank={completionData.ranking.previousRank}
                  totalContacts={completionData.ranking.totalContacts}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streak Badge */}
          <AnimatePresence>
            {showRank && completionData && completionData.streak.count > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6 flex justify-center"
              >
                <StreakBadge count={completionData.streak.count} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Summary */}
          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <CompletionSummary bubbles={bubbles} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTAs */}
          <AnimatePresence>
            {showCTAs && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Button
                  size="lg"
                  className="w-full bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold"
                  onClick={onEnrichNext}
                  disabled={saving}
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Enrich Next Contact
                    </>
                  )}
                </Button>

                <button
                  onClick={onBackToQueue}
                  className="w-full text-center text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Back to Queue
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
```

**Animation Timeline**:
| Time (ms) | Phase | Sound | Elements |
|-----------|-------|-------|----------|
| 0 | initial | - | Success icon animates |
| 300 | score-animating | - | Score bar starts |
| 1800 | score-complete | Chime 1 | Delta badge appears |
| 2300 | rank-reveal | Chime 2 | Rank message slides in |
| 2800 | summary | - | Category grid fades in |
| 3200 | complete | - | CTAs appear |

**Acceptance Criteria**:
- [ ] Animation phases execute in correct order
- [ ] Timing matches specification (300ms, 1800ms, 2300ms, 2800ms, 3200ms)
- [ ] Sound effects trigger at correct phases
- [ ] All child components render correctly
- [ ] "Enrich Next Contact" button calls onEnrichNext
- [ ] "Back to Queue" button calls onBackToQueue
- [ ] Saving state disables button and shows "Saving..."
- [ ] Cleanup timers on unmount

---

### Task 3.2: Create Component Index File
**Description**: Create barrel export file for completion components
**Size**: Small
**Priority**: Low
**Dependencies**: Tasks 2.1-2.6, 3.1
**Can run parallel with**: None

**Technical Requirements**:
Create `src/components/enrichment/completion/index.ts`:

```typescript
export { CompletionCelebration } from "./CompletionCelebration";
export { ScoreImprovementBar } from "./ScoreImprovementBar";
export { NumberTicker } from "./NumberTicker";
export { RankCelebration } from "./RankCelebration";
export { StreakBadge } from "./StreakBadge";
export { CompletionSummary } from "./CompletionSummary";
export { useCelebrationSounds } from "./sounds/useCelebrationSounds";
```

**Acceptance Criteria**:
- [ ] All components exported
- [ ] Imports work from parent directories

---

### Task 3.3: Integrate CompletionCelebration into Session Page
**Description**: Replace existing sessionComplete block with new celebration component
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 3.1, 1.2 (all components + API)
**Can run parallel with**: None (final integration)

**Technical Requirements**:
Modify `src/app/(dashboard)/enrichment/session/page.tsx`:

**1. Add imports at top**:
```typescript
import { CompletionCelebration } from "@/components/enrichment/completion";
```

**2. Add new state variables** (around line 179):
```typescript
// Add after existing state declarations
const [completionData, setCompletionData] = useState<{
  ranking: { currentRank: number; previousRank: number; totalContacts: number };
  streak: { count: number };
  scoreDelta: number;
} | null>(null);
const [previousScore, setPreviousScore] = useState<number>(0);
const [newScore, setNewScore] = useState<number>(0);
```

**3. Modify handleComplete** (around line 399):
```typescript
const handleComplete = useCallback(() => {
  // Capture score BEFORE save
  setPreviousScore(contact?.enrichmentScore || 0);
  setIsPlaying(false);
  setSessionComplete(true);
  if (transcript.trim()) {
    setSavedTranscripts((prev) => [...prev, transcript.trim()]);
  }
  SpeechRecognition.stopListening();
}, [contact, transcript]);
```

**4. Modify performSave** (around line 456):
```typescript
const performSave = async (overrides: Record<string, string>) => {
  if (!contact) return;

  setSaving(true);
  try {
    // ... existing save logic (lines 461-511) ...

    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      // Fetch completion celebration data instead of navigating
      const completionRes = await fetch(
        `/api/enrichment/completion-data?contactId=${contact.id}&previousScore=${previousScore}`
      );
      if (completionRes.ok) {
        const data = await completionRes.json();
        setCompletionData(data);
        setNewScore(data.contact.enrichmentScore);
        // Update contact state with new score
        setContact(prev => prev ? { ...prev, enrichmentScore: data.contact.enrichmentScore } : null);
      }
      // DON'T navigate away - stay on celebration screen
    }
  } catch (error) {
    console.error("Failed to save enrichment:", error);
  } finally {
    setSaving(false);
  }
};
```

**5. Add handleEnrichNext function** (after performSave):
```typescript
const handleEnrichNext = async () => {
  // Save current session first (if not already saved)
  if (!completionData) {
    await handleSave();
  }

  // Fetch next contact from queue
  try {
    const res = await fetch("/api/enrichment/queue?limit=1");
    if (res.ok) {
      const { contacts } = await res.json();
      if (contacts.length > 0) {
        router.push(`/enrichment/session?contact=${contacts[0].id}`);
      } else {
        router.push("/enrichment"); // No more in queue
      }
    }
  } catch (error) {
    console.error("Failed to fetch next contact:", error);
    router.push("/enrichment");
  }
};
```

**6. Replace sessionComplete block** (lines 577-649):
```typescript
if (sessionComplete) {
  // Wait for completionData before showing celebration
  if (!completionData) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C9A227]" />
      </div>
    );
  }

  return (
    <CompletionCelebration
      contact={contact}
      previousScore={previousScore}
      newScore={newScore || contact.enrichmentScore}
      bubbles={bubbles}
      completionData={completionData}
      onEnrichNext={handleEnrichNext}
      onBackToQueue={() => router.push("/enrichment")}
      saving={saving}
    />
  );
}
```

**Acceptance Criteria**:
- [ ] Previous score captured before save
- [ ] Completion data fetched after successful save
- [ ] CompletionCelebration renders with correct props
- [ ] Loading spinner shows while fetching completion data
- [ ] "Enrich Next Contact" navigates to next queued contact
- [ ] "Back to Queue" navigates to /enrichment
- [ ] No navigation happens automatically after save
- [ ] All existing functionality preserved

---

## Phase 4: Testing & Polish

### Task 4.1: Manual QA Testing
**Description**: Test all animation scenarios and edge cases
**Size**: Medium
**Priority**: High
**Dependencies**: Task 3.3 (full integration)
**Can run parallel with**: Task 4.2

**Test Scenarios**:
- [ ] Score animation: 0 → 100 (full gradient)
- [ ] Score animation: 28 → 60 (partial, orange to amber)
- [ ] Score animation: 80 → 85 (small change, stays green)
- [ ] Score animation: 50 → 50 (no change)
- [ ] Rank #1 achievement (trophy icon, gold styling)
- [ ] Rank Top 3 entry (star icon, purple styling)
- [ ] Rank Top 10 entry (flame icon, orange styling)
- [ ] Rank with only 1 contact (no rank shown)
- [ ] Streak first enrichment (no badge shown)
- [ ] Streak 5+ contacts (badge with count)
- [ ] Streak 20+ contacts ("On fire!" message)
- [ ] Sound effects audible but subtle
- [ ] Sound effects on mobile (after tap)
- [ ] Animation timing feels smooth
- [ ] "Enrich Next Contact" works correctly
- [ ] "Back to Queue" works correctly
- [ ] Mobile responsive layout

---

### Task 4.2: Build Verification
**Description**: Verify production build and type checking
**Size**: Small
**Priority**: High
**Dependencies**: Task 3.3
**Can run parallel with**: Task 4.1

**Commands to run**:
```bash
# Type checking
npx tsc --noEmit

# Production build
npm run build

# Start production server and test
npm run start
```

**Acceptance Criteria**:
- [ ] No TypeScript errors
- [ ] Production build succeeds
- [ ] No console errors in production mode
- [ ] All animations work in production build

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Phase 1: Database & API | 2 tasks | Sequential (1.1 → 1.2) |
| Phase 2: Core Components | 6 tasks | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 can run in parallel |
| Phase 3: Integration | 3 tasks | Sequential (3.1 → 3.2 → 3.3) |
| Phase 4: Testing | 2 tasks | 4.1 and 4.2 can run in parallel |

**Total Tasks**: 13
**Critical Path**: 1.1 → 1.2 → (Phase 2 parallel) → 3.1 → 3.3 → 4.1/4.2

**Estimated Implementation Order**:
1. Task 1.1 (database)
2. Task 1.2 (API)
3. Tasks 2.1-2.6 (components - parallel)
4. Task 3.1 (orchestration)
5. Task 3.2 (index)
6. Task 3.3 (integration)
7. Tasks 4.1, 4.2 (testing - parallel)
