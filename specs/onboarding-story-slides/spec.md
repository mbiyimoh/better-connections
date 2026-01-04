# Onboarding Story Slides

## Status
**Draft** - Ready for Review

## Authors
Claude | 2026-01-04

## Overview
First-time user onboarding using Instagram-style story slides that communicate the **magic moment**: describe what you need, and the right people from your network appear instantly—even contacts you haven't talked to in years.

## Problem Statement
Users who sign up have no context about what Better Connections does differently from a standard contact manager. They land on an empty contacts page with no understanding of:
- The core pain point (you HAVE the right connection, but can't find them)
- The magic moment (natural language query → instant, relevant people)
- Why enrichment matters (it powers the intelligent matching)

Without seeing the "magic moment" upfront, users won't understand why enrichment is worth doing—and they'll treat this like another static contact list.

## Goals
- **Show the magic moment first**: "Describe what you need → see the right people appear"
- Demonstrate intelligent network activation with a realistic query
- Explain enrichment as the fuel that powers the magic
- Get users excited to enrich their contacts so they can unlock this power
- Track onboarding completion to show only once

## Non-Goals
- Tutorial on CSV/VCF import (users can discover this)
- Detailed explanation of tags, categories, or scoring
- Account setup or preferences configuration
- Interactive walkthrough of the full app

---

## Slide Content & Flow

### Slide Structure (6 slides, ~6 seconds each)

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓  ░░░░░  ░░░░░  ░░░░░  ░░░░░  ░░░░░                      │  <- Progress bar (6 segments)
│                                                                  │
│                                                                  │
│                                                                  │
│                         [ VISUAL ]                               │
│                                                                  │
│                                                                  │
│                        HEADLINE                                  │
│                                                                  │
│                      Subline text                                │
│                                                                  │
│                                                                  │
│                                                                  │
│  ◀ tap left                                    tap right ▶       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Slide 1: The Pain Point

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░    │
│                                                                  │
│                                                                  │
│                     ┌─────────────────┐                          │
│                     │     📇 347      │                          │
│                     │    contacts     │                          │
│                     │                 │                          │
│                     │  ...somewhere   │                          │
│                     └─────────────────┘                          │
│                                                                  │
│                                                                  │
│         You have the perfect connection.                         │
│                                                                  │
│              You just can't find them.                           │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Visual: Contact count badge showing "347 contacts" (grayed out, overwhelming)
Headline: "You have the perfect connection."
Subline: "You just can't find them."
```

---

### Slide 2: The Frustration

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓░░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░   │
│                                                                  │
│                                                                  │
│               "I'm raising a seed round...                       │
│                who do I know that could help?"                   │
│                                                                  │
│                           ╭──────╮                               │
│                           │  ?   │                               │
│                           ╰──────╯                               │
│                                                                  │
│                    [ scrolling... scrolling... ]                 │
│                                                                  │
│                                                                  │
│            Scrolling through names doesn't work.                 │
│                                                                  │
│       Your network is trapped in a flat list of names.           │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Visual: Thought bubble with "?" + implied endless scrolling
Headline: "Scrolling through names doesn't work."
Subline: "Your network is trapped in a flat list of names."
```

---

### Slide 3: THE MAGIC MOMENT (ANIMATED - Key Slide)

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓░░░  ░░░░░░░░  ░░░░░░░░  ░░░░░░░░   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ "I'm raising a seed round for a D2C brand and I'll be   │░ │  │
│  │  in NYC next week. Who should I meet?"                   │░ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                         ↓  ↓  ↓                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ◉ Sarah Chen                                                ││
│  │   Partner @ Founder Collective · Backed 3 D2C brands        ││
│  │   "Met at SaaStr 2024, offered to intro to her LP network"  ││
│  │                                          [ Draft Intro → ]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ◉ Marcus Johnson                                            ││
│  │   Angel · Exited D2C founder · Based in NYC                 ││
│  │   "Sold his brand to P&G, now writes $50-100k checks"       ││
│  │                                          [ Draft Intro → ]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                   Ask. Discover. Connect.                        │
│                                                                  │
│     The right people from your network, served up instantly.     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

*** THIS IS THE MONEY SHOT - ANIMATED SEQUENCE ***

ANIMATION SEQUENCE:
1. (0.0s) Chat input box appears empty
2. (0.5s) Query text types out character by character (typewriter effect)
         "I'm raising a seed round for a D2C brand and I'll be
          in NYC next week. Who should I meet?"
3. (2.5s) Brief "thinking" shimmer/pulse on the input
4. (3.0s) First contact card slides up with spring animation:
         - Gold avatar ring pulses in
         - "Sarah Chen" name fades in
         - Role/company appears
         - WHY context (italic, gold tint) slides in from right
         - "Draft Intro →" button fades in last
5. (4.5s) Second contact card slides up (same sequence, staggered)
6. (5.5s) Hold for impact before auto-advance

Visual Components:
- Chat input box (styled like /explore interface, dark bg, subtle border)
- Contact recommendation cards:
  - Avatar circle with gold border (#C9A227)
  - Name (white, bold) + title/company (gray)
  - WHY line in italics (gold-tinted, most important part!)
  - "Draft Intro →" gold accent button

Headline: "Ask. Discover. Connect."
Subline: "The right people from your network, served up instantly."
```

---

### Slide 4: The "How It Works"

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓░░  ░░░░░░░░  ░░░░░░░░   │
│                                                                  │
│                                                                  │
│                         ╭─────────╮                              │
│                         │   HOW?  │                              │
│                         ╰─────────╯                              │
│                                                                  │
│                                                                  │
│                How does it know who to suggest?                  │
│                                                                  │
│          Because you told it—in 30 seconds per contact.          │
│                                                                  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  "Sarah invested in D2C"  →  matches "seed round, D2C"  │   │
│   │  "Marcus is in NYC"       →  matches "NYC next week"    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Visual: "HOW?" callout badge + example matching arrows
Headline: "How does it know who to suggest?"
Subline: "Because you told it—in 30 seconds per contact."

Note: This slide bridges the magic moment to the enrichment flow.
It shows the direct connection: enriched context → smart matching.
```

---

### Slide 5: The Enrichment Preview (ANIMATED)

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓░░  ░░░░░░░░   │
│                                                                  │
│                        ╭─────────╮                               │
│                        │   :24   │  <- Circular timer (gold)    │
│                        │  ◔────  │     counting down            │
│                        ╰─────────╯                               │
│                                                                  │
│    ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐    │
│    │ ● Invested in  │  │ ● Based in NYC  │  │ ● Writes     │    │
│    │   D2C brands   │  │                 │  │   $50k checks│    │
│    └────────────────┘  └─────────────────┘  └──────────────┘    │
│         (green)            (blue)              (green)           │
│                                                                  │
│                   ┌─────────────────────┐                        │
│                   │ "Met at SaaStr,     │                        │
│                   │  offered intros..." │                        │
│                   └─────────────────────┘                        │
│                                                                  │
│              Just talk. We capture the context.                  │
│                                                                  │
│        This is the fuel that powers your network search.         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Visual:
- CircularTimer component (gold ring, showing countdown from ~24s)
- EnrichmentBubbles appearing with staggered spring animation:
  - Green bubble: "Invested in D2C brands" (opportunity)
  - Blue bubble: "Based in NYC" (relationship/context)
  - Green bubble: "Writes $50k checks" (opportunity)
- "Why Now" context box appears last (the key insight)

Animation sequence:
1. (0.0s) Timer appears with gold glow, starts counting down
2. (1.5s) First bubble pops in (spring: stiffness 400, damping 25)
3. (2.5s) Second bubble pops in
4. (3.5s) Third bubble pops in
5. (4.5s) "Why Now" text box slides up from bottom
6. (5.5s) All elements settle, subtle pulse on timer

KEY INSIGHT: The bubbles shown here directly connect to Slide 3's search.
Users see: "Oh, THAT'S how it knew to suggest Sarah and Marcus!"

Headline: "Just talk. We capture the context."
Subline: "This is the fuel that powers your network search."
```

---

### Slide 6: Call to Action

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓░   │
│                                                                  │
│                                                                  │
│                                                                  │
│                       ╭──────────────╮                           │
│                       │      ✦       │  <- Gold sparkle icon    │
│                       ╰──────────────╯                           │
│                                                                  │
│                                                                  │
│               Unlock your network's full potential.              │
│                                                                  │
│                  ┌─────────────────────────┐                     │
│                  │   Add Your First Contact │  <- Gold button   │
│                  └─────────────────────────┘                     │
│                                                                  │
│            Import existing contacts, or start fresh.             │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Visual: Gold sparkle/star icon (Lucide: Sparkles)
Headline: "Unlock your network's full potential."
CTA Button: "Add Your First Contact" (gold bg, black text)
Secondary text: "Import existing contacts, or start fresh." (muted)

Behavior:
- Primary button click → /contacts/new
- Auto-advance timer PAUSES on this slide (user must take action)
- Tapping right side also triggers the CTA
- Could add secondary link for "Import contacts" → /contacts/import
```

---

## Technical Approach

### Key Files to Create
- `src/components/onboarding/StoryOnboarding.tsx` - Main story container
- `src/components/onboarding/StoryProgressBar.tsx` - Segmented progress indicator
- `src/components/onboarding/slides/` - Individual slide components
- `src/app/(dashboard)/onboarding/page.tsx` - Onboarding route

### Key Files to Modify
- `prisma/schema.prisma` - Add `hasCompletedOnboarding` to User model
- `src/app/(dashboard)/layout.tsx` - Check onboarding status, redirect if needed

### Integration Points
- Reuse `CircularTimer` from `src/components/enrichment/CircularTimer.tsx`
- Reuse `EnrichmentBubbles` from `src/components/enrichment/EnrichmentBubbles.tsx`
- Follow existing Framer Motion patterns for slide transitions
- Use design system colors from `src/lib/design-system.ts`

### Story Mechanics (from reference implementation)
```typescript
// Auto-advance timer
useEffect(() => {
  const interval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 100) {
        if (currentSlide < slides.length - 1) {
          setCurrentSlide(c => c + 1);
          return 0;
        } else {
          clearInterval(interval);
          onComplete();
          return 100;
        }
      }
      return prev + 1.5; // ~6.6 seconds per slide
    });
  }, 100);
  return () => clearInterval(interval);
}, [currentSlide]);

// Tap navigation (left half = back, right half = forward)
const handleTap = (e: React.MouseEvent) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x > rect.width / 2) {
    // Right tap → next
  } else {
    // Left tap → previous
  }
};
```

---

## Implementation Details

### User Model Update
```prisma
model User {
  // ... existing fields
  hasCompletedOnboarding Boolean @default(false)
}
```

### Dashboard Layout Check
```typescript
// src/app/(dashboard)/layout.tsx
const user = await prisma.user.findUnique({
  where: { id: supabaseUser.id },
  select: { hasCompletedOnboarding: true }
});

if (!user?.hasCompletedOnboarding) {
  redirect('/onboarding');
}
```

### Onboarding Completion
```typescript
// After user clicks CTA or completes all slides
await fetch('/api/user/complete-onboarding', { method: 'POST' });
router.push('/contacts/new');
```

---

## Testing Approach

### Key Scenarios
1. **First login** - User sees onboarding, not contacts page
2. **Complete onboarding** - User marked as completed, redirected to add contact
3. **Return visit** - Onboarding skipped, goes directly to contacts
4. **Slide navigation** - Tap left/right works, progress bar updates
5. **Magic moment animation** - Slide 3 typewriter + contact cards animate correctly
6. **Enrichment preview animation** - Slide 5 timer and bubbles animate correctly

### Manual Testing Checklist
- [ ] New user signup → lands on onboarding
- [ ] All 6 slides display correctly with visuals
- [ ] Slide 3 shows typewriter query + contact recommendations animating in
- [ ] Slide 5 shows animated timer + bubbles popping in
- [ ] CTA button on slide 6 works
- [ ] After completion, user goes to contacts and doesn't see onboarding again

---

## Design Decisions (Resolved)

1. **Skip option?** No skip button. It's only ~36 seconds and sets critical context.

2. **Mobile behavior?** Tap zones only (left half = back, right half = forward). No swipe gestures.

3. **Sound effects?** No audio. Keep it silent.

---

## Future Improvements

- **Interactive magic moment demo** - Let users type their own query in Slide 3 and see mock results
- **Live enrichment demo** - Let users actually speak during Slide 5 and see real AI extraction
- **Personalized query examples** - Ask user's role (founder, investor, recruiter) and show relevant query examples
- **Import CTA variant** - If user likely has 100+ contacts, emphasize CSV import on Slide 6
- **Alternative query examples** - Rotate through different realistic queries (hiring, introductions, events)
- **Progress tracking** - Show which slides user viewed if they exit early
- **A/B test the magic moment** - Test different query examples for conversion impact
- **Localization** - Translate onboarding content for international users
- **Re-watch option** - Settings page toggle to replay onboarding
- **Skip to explore** - After import, offer to try a real query immediately

---

## References

- Reference implementation: `components/clients/wsbc/WSBCFinalProposal.tsx:626-727`
- CircularTimer: `src/components/enrichment/CircularTimer.tsx`
- EnrichmentBubbles: `src/components/enrichment/EnrichmentBubbles.tsx`
- Design system: `src/lib/design-system.ts`
- CLAUDE.md design guidelines (dark theme, gold accent, no emojis)
