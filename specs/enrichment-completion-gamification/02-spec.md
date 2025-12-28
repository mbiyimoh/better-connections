# Enrichment Completion Gamification - Implementation Specification

## Overview

Transform the enrichment completion screen into a habit-forming celebration moment with animated score improvement, rank changes, streak tracking, and subtle audio feedback.

**Decisions from Ideation:**
- Sound effects: YES (soft Chinese bell/chime sounds)
- Streak tracking: YES
- Share feature: NO
- Confetti: NO

---

## Database Changes

### New Table: EnrichmentStreak

Track weekly enrichment activity for streak display.

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

**Migration notes:**
- Add `EnrichmentStreak` relation to `User` model
- Index on `userId` for fast lookups

---

## API Endpoints

### 1. GET `/api/enrichment/completion-data`

Fetches all data needed for the completion celebration in a single call.

**Query Parameters:**
```
contactId: string (required) - The contact that was just enriched
previousScore: number (required) - Score before enrichment
```

**Response:**
```typescript
interface CompletionDataResponse {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    enrichmentScore: number; // New score after save
  };
  ranking: {
    currentRank: number;
    previousRank: number;
    totalContacts: number;
    percentile: number;
  };
  streak: {
    count: number; // Contacts enriched this week (including this one)
    weekStart: string; // ISO date of week start
  };
  scoreDelta: number; // newScore - previousScore
}
```

**Implementation:**
```typescript
// src/app/api/enrichment/completion-data/route.ts

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const previousScore = parseInt(searchParams.get("previousScore") || "0");

  // Get contact with new score
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, userId: user.id },
    select: { id: true, firstName: true, lastName: true, enrichmentScore: true }
  });

  // Calculate ranking
  const allContacts = await prisma.contact.findMany({
    where: { userId: user.id },
    select: { id: true, enrichmentScore: true },
    orderBy: { enrichmentScore: "desc" }
  });

  const currentRank = allContacts.findIndex(c => c.id === contactId) + 1;

  // Calculate previous rank by finding where previousScore would have placed
  const previousRank = allContacts.filter(c =>
    c.id !== contactId && c.enrichmentScore > previousScore
  ).length + 1;

  // Get/update streak
  const weekStart = getWeekStart(new Date());
  const streak = await prisma.enrichmentStreak.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    update: { contactsEnriched: { increment: 1 } },
    create: { userId: user.id, weekStart, contactsEnriched: 1 }
  });

  return NextResponse.json({
    contact,
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
  });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
```

---

## Component Specifications

### File Structure

```
src/components/enrichment/completion/
├── CompletionCelebration.tsx    # Main orchestration component
├── ScoreImprovementBar.tsx      # Animated progress bar
├── NumberTicker.tsx             # Counting number animation
├── RankCelebration.tsx          # Rank change message
├── StreakBadge.tsx              # Weekly streak display
├── CompletionSummary.tsx        # Category grid (extracted from existing)
└── sounds/
    └── useCelebrationSounds.ts  # Sound effect hook
```

---

### 1. CompletionCelebration.tsx

Main wrapper that orchestrates the animation sequence.

```typescript
// src/components/enrichment/completion/CompletionCelebration.tsx

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ChevronLeft } from "lucide-react";
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

  // Animation timeline
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Start score animation after brief delay
    timers.push(setTimeout(() => setPhase("score-animating"), 300));

    // Score complete (after 1.5s animation + 300ms delay = 1800ms)
    timers.push(setTimeout(() => {
      setPhase("score-complete");
      playScoreComplete();
    }, 1800));

    // Rank reveal (500ms after score complete)
    timers.push(setTimeout(() => {
      setPhase("rank-reveal");
      playRankReveal();
    }, 2300));

    // Summary reveal
    timers.push(setTimeout(() => setPhase("summary"), 2800));

    // Complete - show CTAs
    timers.push(setTimeout(() => setPhase("complete"), 3200));

    return () => timers.forEach(clearTimeout);
  }, [playScoreComplete, playRankReveal]);

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

---

### 2. ScoreImprovementBar.tsx

Animated progress bar with color gradient.

```typescript
// src/components/enrichment/completion/ScoreImprovementBar.tsx

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

// Color stops for gradient based on score
function getScoreColor(score: number): string {
  if (score <= 25) return "#EF4444"; // red-500
  if (score <= 50) return "#F97316"; // orange-500
  if (score <= 75) return "#F59E0B"; // amber-500
  return "#22C55E"; // green-500
}

// Get gradient for the filled portion
function getGradientStops(startScore: number, endScore: number): string {
  const stops: string[] = [];
  const thresholds = [0, 25, 50, 75, 100];
  const colors = ["#EF4444", "#F97316", "#F59E0B", "#22C55E"];

  for (let i = 0; i < thresholds.length - 1; i++) {
    const threshold = thresholds[i];
    const nextThreshold = thresholds[i + 1];

    if (endScore > threshold) {
      const startPct = Math.max(0, (threshold - startScore) / (endScore - startScore)) * 100;
      const endPct = Math.min(100, (nextThreshold - startScore) / (endScore - startScore)) * 100;

      if (startPct < 100) {
        stops.push(`${colors[i]} ${startPct}%`);
        if (endPct <= 100) {
          stops.push(`${colors[i]} ${Math.min(endPct, 100)}%`);
        }
      }
    }
  }

  return stops.length > 0 ? stops.join(", ") : colors[0];
}

export function ScoreImprovementBar({
  previousScore,
  newScore,
  isAnimating,
  showDelta,
}: ScoreImprovementBarProps) {
  const [displayScore, setDisplayScore] = useState(previousScore);

  // Spring animation for smooth bar fill
  const springValue = useSpring(previousScore, {
    stiffness: 50,
    damping: 20,
  });

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

  const width = useTransform(springValue, [0, 100], ["0%", "100%"]);
  const delta = newScore - previousScore;
  const endColor = getScoreColor(newScore);

  return (
    <div>
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
            background: `linear-gradient(90deg, ${getGradientStops(0, newScore)})`,
          }}
        />
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center gap-3">
        <div className="text-2xl font-bold text-white tabular-nums">
          <NumberTicker
            from={previousScore}
            to={isAnimating ? newScore : previousScore}
            duration={1500}
          />
          <span className="text-zinc-500 font-normal"> / 100</span>
        </div>

        {/* Delta badge */}
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

---

### 3. NumberTicker.tsx

Animated counting number component.

```typescript
// src/components/enrichment/completion/NumberTicker.tsx

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

      // Ease out quad
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

---

### 4. RankCelebration.tsx

Conditional rank change messaging.

```typescript
// src/components/enrichment/completion/RankCelebration.tsx

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

  // Don't show if only 1 contact or no meaningful change
  if (totalContacts <= 1) {
    return null;
  }

  // Determine message and icon based on achievement
  let message: string;
  let Icon = TrendingUp;
  let iconColor = "text-amber-400";
  let bgColor = "bg-amber-500/10";
  let borderColor = "border-amber-500/20";

  if (currentRank === 1) {
    message = `${contactName} is now your most enriched contact!`;
    Icon = Trophy;
    iconColor = "text-yellow-400";
    bgColor = "bg-yellow-500/10";
    borderColor = "border-yellow-500/20";
  } else if (currentRank <= 3 && previousRank > 3) {
    message = `${contactName} just cracked your Top 3!`;
    Icon = Star;
    iconColor = "text-purple-400";
    bgColor = "bg-purple-500/10";
    borderColor = "border-purple-500/20";
  } else if (currentRank <= 10 && previousRank > 10) {
    message = `${contactName} just entered your Top 10!`;
    Icon = Flame;
    iconColor = "text-orange-400";
    bgColor = "bg-orange-500/10";
    borderColor = "border-orange-500/20";
  } else if (currentRank <= 10) {
    message = `${contactName} stays in your Top 10!`;
    Icon = Flame;
  } else if (rankDelta > 50) {
    message = `Nice! ${contactName} moved from #${previousRank} to #${currentRank}!`;
  } else if (rankDelta > 10) {
    message = `${contactName} moved up ${rankDelta} spots to #${currentRank}!`;
  } else if (rankDelta > 0) {
    message = `${contactName} moved up to #${currentRank} of ${totalContacts}`;
  } else {
    // No improvement (shouldn't happen normally)
    return null;
  }

  return (
    <div className={`${bgColor} ${borderColor} border rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={`${iconColor}`}>
          <Icon size={24} />
        </div>
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
    </div>
  );
}
```

---

### 5. StreakBadge.tsx

Weekly enrichment streak display.

```typescript
// src/components/enrichment/completion/StreakBadge.tsx

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

---

### 6. CompletionSummary.tsx

Extracted category grid (from existing code).

```typescript
// src/components/enrichment/completion/CompletionSummary.tsx

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

---

### 7. useCelebrationSounds.ts

Sound effect hook using Web Audio API.

```typescript
// src/components/enrichment/completion/sounds/useCelebrationSounds.ts

"use client";

import { useCallback, useRef, useEffect } from "react";

// Chinese bell/chime-like frequencies (pentatonic scale, soft and pleasant)
const SCORE_COMPLETE_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
const RANK_REVEAL_FREQUENCIES = [783.99, 987.77, 1174.66]; // G5, B5, D6 (higher chord)

export function useCelebrationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on any click (required for mobile)
    document.addEventListener("click", initAudio, { once: true });
    return () => document.removeEventListener("click", initAudio);
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
      // Create oscillator (sine wave for soft bell-like tone)
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Create gain node for envelope
      const gain = ctx.createGain();

      // Bell-like envelope: quick attack, slow decay
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Slow decay

      // Add slight delay for each note (arpeggio effect)
      const delay = i * 0.08;

      // Connect and schedule
      osc.connect(gain);
      gain.connect(ctx.destination);

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

---

## Session Page Integration

### Modifications to `src/app/(dashboard)/enrichment/session/page.tsx`

```typescript
// Add these imports
import { CompletionCelebration } from "@/components/enrichment/completion/CompletionCelebration";

// Add state for completion data
const [completionData, setCompletionData] = useState<CompletionData | null>(null);
const [previousScore, setPreviousScore] = useState<number>(0);

// Capture previous score when session completes
const handleComplete = useCallback(() => {
  setPreviousScore(contact?.enrichmentScore || 0); // Capture BEFORE save
  setIsPlaying(false);
  setSessionComplete(true);
  // ... rest of existing logic
}, [contact, transcript]);

// Fetch completion data after save
const performSave = async (overrides: Record<string, string>) => {
  // ... existing save logic ...

  if (res.ok) {
    // Fetch completion celebration data
    const completionRes = await fetch(
      `/api/enrichment/completion-data?contactId=${contact.id}&previousScore=${previousScore}`
    );
    if (completionRes.ok) {
      const data = await completionRes.json();
      setCompletionData(data);
      // Update contact with new score
      setContact(prev => prev ? { ...prev, enrichmentScore: data.contact.enrichmentScore } : null);
    }
    // Don't navigate away - show celebration screen
  }
};

// Handle "Enrich Next Contact" action
const handleEnrichNext = async () => {
  // Fetch next contact from queue
  const res = await fetch("/api/enrichment/queue?limit=1");
  if (res.ok) {
    const { contacts } = await res.json();
    if (contacts.length > 0) {
      router.push(`/enrichment/session?contact=${contacts[0].id}`);
    } else {
      router.push("/enrichment"); // No more in queue
    }
  }
};

// Replace sessionComplete block with CompletionCelebration
if (sessionComplete) {
  return (
    <CompletionCelebration
      contact={contact}
      previousScore={previousScore}
      newScore={contact.enrichmentScore}
      bubbles={bubbles}
      completionData={completionData}
      onEnrichNext={handleEnrichNext}
      onBackToQueue={() => router.push("/enrichment")}
      saving={saving}
    />
  );
}
```

---

## Animation Timeline Summary

| Time (ms) | Event | Sound |
|-----------|-------|-------|
| 0 | Render starts | - |
| 100 | Success icon scales in | - |
| 300 | Score bar appears, animation starts | - |
| 1800 | Score animation complete | Chime (C-E-G) |
| 2300 | Rank celebration slides in | Chime (G-B-D) |
| 2500 | Streak badge fades in | - |
| 2800 | Category summary appears | - |
| 3200 | CTAs fade in | - |

---

## Testing Checklist

- [ ] Score bar animates from 0 to 100 correctly
- [ ] Color gradient transitions through red → orange → amber → green
- [ ] Number ticker counts smoothly
- [ ] Delta badge shows correct value
- [ ] Rank celebration shows appropriate message for each tier
- [ ] Streak badge shows correct count
- [ ] Sound effects play at correct times
- [ ] Sound effects are subtle (not jarring)
- [ ] "Enrich Next Contact" fetches and navigates to next contact
- [ ] "Back to Queue" returns to queue page
- [ ] Works correctly with only 1 contact (no rank display)
- [ ] Works correctly with perfect 100 score
- [ ] Mobile responsive
- [ ] No layout shift during animations

---

## Files to Create/Modify

### New Files
| File | Description |
|------|-------------|
| `src/app/api/enrichment/completion-data/route.ts` | Completion data endpoint |
| `src/components/enrichment/completion/CompletionCelebration.tsx` | Main component |
| `src/components/enrichment/completion/ScoreImprovementBar.tsx` | Progress bar |
| `src/components/enrichment/completion/NumberTicker.tsx` | Number animation |
| `src/components/enrichment/completion/RankCelebration.tsx` | Rank message |
| `src/components/enrichment/completion/StreakBadge.tsx` | Streak display |
| `src/components/enrichment/completion/CompletionSummary.tsx` | Category grid |
| `src/components/enrichment/completion/sounds/useCelebrationSounds.ts` | Audio hook |
| `prisma/migrations/xxx_add_enrichment_streak/migration.sql` | DB migration |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add EnrichmentStreak model |
| `src/app/(dashboard)/enrichment/session/page.tsx` | Integrate CompletionCelebration |

---

## Implementation Order

1. **Database** - Add EnrichmentStreak model, run migration
2. **API** - Create `/api/enrichment/completion-data` endpoint
3. **Components** - Build in order:
   - NumberTicker (no deps)
   - useCelebrationSounds (no deps)
   - ScoreImprovementBar (uses NumberTicker)
   - RankCelebration (no deps)
   - StreakBadge (no deps)
   - CompletionSummary (extracted from existing)
   - CompletionCelebration (orchestrates all)
4. **Integration** - Update session page
5. **Testing** - Manual QA of all scenarios
