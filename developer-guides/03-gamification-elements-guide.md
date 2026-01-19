# Gamification Elements & Animations - Developer Guide

**Last Updated:** 2026-01-15
**Component:** Gamification System (Scores, Ranks, Streaks, Sounds)

---

## 1. Architecture Overview

The gamification system provides visual feedback, sounds, and progress tracking to make contact enrichment engaging and habit-forming.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GAMIFICATION COMPONENTS                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CompletionCelebration                            │    │
│  │  (Master container - orchestrates animation timeline)               │    │
│  │                                                                      │    │
│  │  Phase: initial → score-animating → score-complete → rank-reveal →  │    │
│  │         summary → complete                                          │    │
│  │                                                                      │    │
│  │  Timeline:                                                          │    │
│  │    0ms      → initial (mounting)                                    │    │
│  │    300ms    → score-animating (bar fills)                           │    │
│  │    1800ms   → score-complete (chime 1)                              │    │
│  │    2300ms   → rank-reveal (chime 2)                                 │    │
│  │    2800ms   → summary (tags, notes, mentions)                       │    │
│  │    3200ms   → complete (CTAs visible)                               │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    VISUAL COMPONENTS                                │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │    │
│  │  │ScoreImprovementBar│  │ RankCelebration │  │   StreakBadge   │   │    │
│  │  │                  │  │                  │  │                  │   │    │
│  │  │ [████████░░] 72  │  │ 🏆 #3 of 47      │  │ ⚡ 5 this week  │   │    │
│  │  │        +27       │  │ "cracked Top 3!" │  │                  │   │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                         │    │
│  │  │  NumberTicker   │  │BubbleTagSuggestions│                       │    │
│  │  │     45 → 72     │  │ [x] expertise     │                        │    │
│  │  │  (1.5s animated) │  │ [x] opportunity   │                        │    │
│  │  └──────────────────┘  └──────────────────┘                         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    AUDIO SYSTEM                                      │    │
│  │                                                                      │    │
│  │  useCelebrationSounds hook                                          │    │
│  │  ├── Web Audio API (AudioContext)                                   │    │
│  │  ├── playScoreComplete() → C5-E5-G5 major chord (1.0s)              │    │
│  │  └── playRankReveal() → G5-B5-D6 higher chord (1.2s)                │    │
│  │                                                                      │    │
│  │  Sound design: Chinese bell / meditation bowl quality               │    │
│  │  Volume: 0.15 (subtle, non-jarring)                                 │    │
│  │  Envelope: 20ms attack, exponential decay                           │    │
│  │  Arpeggio: 80ms delay between notes                                 │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA SOURCES                                      │    │
│  │                                                                      │    │
│  │  /api/enrichment/completion-data                                    │    │
│  │  ├── ranking: { currentRank, previousRank, totalContacts }          │    │
│  │  ├── streak: { count } (enrichments this week)                      │    │
│  │  └── scoreDelta: newScore - previousScore                           │    │
│  │                                                                      │    │
│  │  Database: EnrichmentStreak model                                   │    │
│  │  ├── userId                                                         │    │
│  │  ├── count (resets weekly)                                          │    │
│  │  └── weekStart (Monday of current week)                             │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependencies

### External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `framer-motion` | ^11.15.0 | Spring animations, AnimatePresence |
| `lucide-react` | ^0.469.0 | Icons (Trophy, Flame, Zap, Star) |

### Internal Dependencies

| File | Purpose |
|------|---------|
| `src/lib/enrichment.ts` | Score calculation (0-100) |
| `src/lib/design-system.ts` | TAG_CATEGORY_COLORS |
| `src/types/contact.ts` | TagCategory enum |

---

## 3. User Experience Flow

### Enrichment Score Progression

```
Score 0-25:   🔴 Getting Started (red bar)
Score 26-50:  🟠 Building Depth (orange bar)
Score 51-75:  🟡 Well Connected (amber bar)
Score 76-100: 🟢 Fully Enriched (green bar)
```

### Animation Timeline (After Session Complete)

```
0ms        Initial mount, sparkles icon bounces in
           ↓
300ms      Score bar starts filling (spring animation)
           ↓
1800ms     Score complete - delta badge fades in
           🔔 playScoreComplete() - major chord chime
           ↓
2300ms     Rank celebration card slides in
           🔔 playRankReveal() - higher chord chime
           ↓
2800ms     Summary section fades in:
           - Tag suggestions
           - Notes change summary
           - Mentioned people
           ↓
3200ms     CTAs become visible:
           - "Enrich Next Contact"
           - "Continue Enriching [Name]"
           - "Back to Queue"
```

---

## 4. File-by-File Mapping

### Master Component

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/enrichment/completion/CompletionCelebration.tsx` | 1-316 | Animation timeline, phase state |

**Key Sections:**
- Lines 61-67: AnimationPhase type definition
- Lines 88-117: Animation timeline effect with timers
- Lines 119-123: Phase visibility flags

### Visual Components

| File | Purpose |
|------|---------|
| `ScoreImprovementBar.tsx` | Gradient progress bar with spring animation |
| `NumberTicker.tsx` | Animated number counter (ease-out quad) |
| `RankCelebration.tsx` | Rank achievement card with tier icons |
| `StreakBadge.tsx` | Weekly streak counter |
| `CompletionSummary.tsx` | Category breakdown of bubbles |
| `BubbleTagSuggestions.tsx` | Save bubbles as tags UI |
| `TagEditModal.tsx` | Edit tag text/category before saving |
| `MentionedPeopleSection.tsx` | Detected people mentions |

### Audio System

| File | Purpose |
|------|---------|
| `sounds/useCelebrationSounds.ts` | Web Audio API hook |

### API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/enrichment/completion-data` | GET | Fetch rank, streak, delta |

---

## 5. Connections & Integrations

### Score Calculation

```typescript
// src/lib/enrichment.ts
export function calculateEnrichmentScore(
  contact: Partial<Contact>,
  tagCount: number
): number {
  let score = 0;

  // Basic fields (10 pts each)
  if (contact.firstName) score += 10;
  if (contact.primaryEmail) score += 10;
  if (contact.title) score += 10;
  if (contact.company) score += 10;

  // Medium fields (5 pts each)
  if (contact.location) score += 5;
  if (contact.linkedinUrl) score += 5;
  if (tagCount > 0) score += 5;

  // High-value fields
  if (contact.howWeMet) score += 15;
  if (contact.whyNow) score += 20;      // KEY DIFFERENTIATOR
  if (contact.notes) score += 10;

  return Math.min(score, 100);
}
```

### Web Audio Frequencies

```typescript
// Chinese bell / meditation bowl quality
const SCORE_COMPLETE_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5
const RANK_REVEAL_FREQUENCIES = [783.99, 987.77, 1174.66];   // G5, B5, D6
```

### Rank Celebration Tiers

```typescript
currentRank === 1        → Trophy (gold)   → "most enriched contact!"
currentRank <= 3         → Star (purple)   → "cracked your Top 3!"
currentRank <= 10        → Flame (orange)  → "entered your Top 10!"
rankDelta > 50           → TrendingUp      → "moved from #X to #Y!"
rankDelta > 10           → TrendingUp      → "moved up N spots!"
rankDelta > 0            → TrendingUp      → "moved up to #X of Y"
```

### Streak Messages

```typescript
count >= 20 → "On fire! N contacts enriched this week"
count >= 10 → "Great streak! N this week"
count >= 5  → "N contacts enriched this week"
count >= 2  → "N enriched this week"
count <= 1  → (hidden)
```

---

## 6. Gotchas & Pitfalls

### Audio Initialization

```typescript
// Mobile browsers require user interaction before playing audio
useEffect(() => {
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  };
  document.addEventListener("click", initAudio, { once: true });
  document.addEventListener("touchstart", initAudio, { once: true });
}, []);

// Resume if suspended (autoplay policy)
if (ctx.state === "suspended") {
  ctx.resume();
}
```

### Animation Phase Dependencies

```typescript
// Use proper cleanup to avoid memory leaks
useEffect(() => {
  const timers: NodeJS.Timeout[] = [];

  timers.push(setTimeout(() => setPhase("score-animating"), 300));
  // ... more timers

  return () => timers.forEach(clearTimeout);
}, []);
```

### Tag Category Conversion

```typescript
// Bubbles use lowercase: 'relationship'
// Tags use uppercase: 'RELATIONSHIP'
function bubbleCategoryToTagCategory(category: string): TagCategory {
  return category.toUpperCase() as TagCategory;
}
```

### Race Condition Guard

```typescript
// BubbleTagSuggestions.tsx - prevent double-submit
const addSelectedTags = async () => {
  if (isAdding) return; // Guard against rapid clicks
  setIsAdding(true);
  // ...
};
```

### Score Color Thresholds

```typescript
function getScoreColor(score: number): string {
  if (score <= 25) return "#EF4444"; // red
  if (score <= 50) return "#F97316"; // orange
  if (score <= 75) return "#F59E0B"; // amber
  return "#22C55E";                   // green
}
```

### Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Playing audio before interaction | Init AudioContext on first click |
| Not cleaning up timers | Return cleanup function in useEffect |
| Lowercase tag categories | Always convert to UPPERCASE |
| Missing Safari AudioContext | Check for webkitAudioContext fallback |
| Forgetting spring animation config | Use stiffness: 50, damping: 20 |

---

## 7. Development Scenarios

### Adding a New Sound Effect

1. **Define frequencies** (useCelebrationSounds.ts)
   ```typescript
   const NEW_SOUND_FREQUENCIES = [440, 554.37, 659.25]; // A4, C#5, E5
   ```

2. **Add playback function**
   ```typescript
   const playNewSound = useCallback(() => {
     playChime(NEW_SOUND_FREQUENCIES, 0.8);
   }, [playChime]);

   return { ...existingSounds, playNewSound };
   ```

3. **Trigger at appropriate phase**
   ```typescript
   timers.push(setTimeout(() => {
     setPhase("new-phase");
     playNewSound();
   }, 2500));
   ```

### Adding a New Achievement Tier

1. **Update RankCelebration.tsx**
   ```typescript
   } else if (currentRank <= 5 && previousRank > 5) {
     message = `${contactName} just entered your Top 5!`;
     Icon = Medal;
     iconColor = "text-cyan-400";
     bgColor = "bg-cyan-500/10";
     borderColor = "border-cyan-500/20";
   }
   ```

2. **Add new icon import**
   ```typescript
   import { Medal } from "lucide-react";
   ```

### Adding a New Celebration Section

1. **Create component**
   ```typescript
   // NewSection.tsx
   export function NewSection({ data }: Props) {
     return (
       <div className="...">
         {/* Content */}
       </div>
     );
   }
   ```

2. **Add to CompletionCelebration**
   ```typescript
   <AnimatePresence>
     {showSummary && (
       <motion.div
         initial={{ opacity: 0, y: 5 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.25 }}
         className="mb-6"
       >
         <NewSection data={newData} />
       </motion.div>
     )}
   </AnimatePresence>
   ```

### Debugging Animation Issues

```typescript
// Add logging to track phases
useEffect(() => {
  console.log('[Celebration] Phase changed:', phase);
}, [phase]);

// Log visibility flags
console.log({
  showScoreBar,
  showDelta,
  showRank,
  showSummary,
  showCTAs,
});
```

---

## 8. Testing Approach

### Manual Test Cases

| Test | Steps | Expected |
|------|-------|----------|
| Score animation | Complete enrichment | Bar fills smoothly, number ticks up |
| Delta badge | Increase score | "+N" badge appears after bar |
| Sound playback | Click during session, complete | Both chimes play |
| Rank #1 | Enrich to top score | Trophy icon, "most enriched" message |
| Top 3 entry | Improve rank to <=3 | Star icon, "cracked Top 3" message |
| Streak badge | Enrich 2+ contacts in week | Zap icon with count |
| Tag suggestions | Complete with bubbles | Checkboxes appear, can add tags |
| Edit tag | Click pencil on suggestion | Modal opens, can change text/category |

### E2E Test Approach

```typescript
test('celebration shows score increase', async ({ page }) => {
  // Complete enrichment session
  await page.goto('/enrichment/session?contact=xxx');
  await page.fill('textarea', 'Met at TechCrunch');
  await page.click('button:has-text("Send")');
  await page.click('text=Complete Session');

  // Verify celebration elements
  await expect(page.locator('text=enriched')).toBeVisible();
  await expect(page.locator('.score-bar')).toBeVisible();
  await expect(page.locator('text=Enrich Next Contact')).toBeVisible({ timeout: 5000 });
});
```

---

## 9. Quick Reference

### Animation Timing

| Phase | Delay | Duration |
|-------|-------|----------|
| score-animating | 300ms | ~1500ms (spring) |
| score-complete | 1800ms | instant |
| rank-reveal | 2300ms | instant |
| summary | 2800ms | instant |
| complete | 3200ms | instant |

### Sound Frequencies

| Sound | Frequencies | Duration |
|-------|-------------|----------|
| Score Complete | C5, E5, G5 (major) | 1.0s |
| Rank Reveal | G5, B5, D6 (higher) | 1.2s |

### Spring Animation Config

```typescript
// Score bar
{ stiffness: 50, damping: 20 }

// General UI elements
{ type: "spring", stiffness: 300, damping: 20 }
```

### Score Thresholds

| Range | Color | Label |
|-------|-------|-------|
| 0-25 | Red (#EF4444) | Getting Started |
| 26-50 | Orange (#F97316) | Building Depth |
| 51-75 | Amber (#F59E0B) | Well Connected |
| 76-100 | Green (#22C55E) | Fully Enriched |

### Field Point Values

| Field | Points |
|-------|--------|
| whyNow | 20 |
| howWeMet | 15 |
| firstName, email, title, company | 10 each |
| location, linkedinUrl, tags, notes | 5 each |
| **Max Score** | **100** |

### Component Props Reference

```typescript
// CompletionCelebration
interface Props {
  contact: Contact;
  previousScore: number;
  newScore: number;
  bubbles: EnrichmentBubble[];
  completionData: CompletionData | null;
  notesChangeSummary?: string;
  mentionedPeople?: MentionMatch[];
  sourceContactId: string;
  onEnrichNext: () => void;
  onBackToQueue: () => void;
  onContinueEnriching?: () => void;
  saving?: boolean;
}

// CompletionData
interface CompletionData {
  ranking: { currentRank: number; previousRank: number; totalContacts: number; };
  streak: { count: number; };
  scoreDelta: number;
}
```
