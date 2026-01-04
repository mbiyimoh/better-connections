# Task Breakdown: Onboarding Story Slides

**Generated**: 2026-01-04
**Source**: specs/onboarding-story-slides/spec.md
**Mode**: Full (first-time decompose)
**Last Decompose**: 2026-01-04

---

## Overview

Instagram-style story slides for first-time user onboarding that communicate the "magic moment" - describe what you need and the right people from your network appear instantly. 6 slides, ~36 seconds total, with animated demos of the explore query and enrichment flow.

---

## Phase 1: Foundation & Infrastructure

### Task 1.1: Add hasCompletedOnboarding to User Model
**Description**: Add database field to track onboarding completion status
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Add `hasCompletedOnboarding Boolean @default(false)` to User model in Prisma schema
- Run migration to update database
- Ensure field is queryable for dashboard layout check

**Implementation**:
```prisma
model User {
  // ... existing fields
  hasCompletedOnboarding Boolean @default(false)
}
```

**Migration command**:
```bash
npx prisma migrate dev --name add-onboarding-completion-flag
```

**Acceptance Criteria**:
- [ ] Prisma schema updated with new field
- [ ] Migration runs successfully
- [ ] Field defaults to false for new users
- [ ] Existing users get false as default

---

### Task 1.2: Create Onboarding Route and Page Shell
**Description**: Set up the /onboarding route with basic page structure
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1

**Technical Requirements**:
- Create `src/app/(dashboard)/onboarding/page.tsx`
- Full-screen dark background (#0D0D0F)
- No sidebar/header (standalone experience)
- Placeholder for story component

**Implementation**:
```typescript
// src/app/(dashboard)/onboarding/page.tsx
import { StoryOnboarding } from "@/components/onboarding/StoryOnboarding";

export default function OnboardingPage() {
  return (
    <div className="fixed inset-0 bg-[#0D0D0F] z-50">
      <StoryOnboarding />
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Route `/onboarding` renders without errors
- [ ] Page takes full screen with dark background
- [ ] No navigation elements visible

---

### Task 1.3: Implement Dashboard Layout Redirect Logic
**Description**: Check onboarding status and redirect first-time users
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Modify `src/app/(dashboard)/layout.tsx`
- Query user's `hasCompletedOnboarding` field
- Redirect to `/onboarding` if false
- Skip redirect if already on `/onboarding` route

**Implementation**:
```typescript
// In src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";

// After getting supabaseUser, add:
const user = await prisma.user.findUnique({
  where: { id: supabaseUser.id },
  select: { hasCompletedOnboarding: true }
});

// Get current path to avoid redirect loop
const pathname = headers().get("x-pathname") || "";

if (!user?.hasCompletedOnboarding && !pathname.includes("/onboarding")) {
  redirect("/onboarding");
}
```

**Acceptance Criteria**:
- [ ] New users redirected to /onboarding on first login
- [ ] No redirect loop when on /onboarding page
- [ ] Users with completed onboarding go to /contacts

---

### Task 1.4: Create Complete Onboarding API Endpoint
**Description**: API endpoint to mark onboarding as complete
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Technical Requirements**:
- Create `src/app/api/user/complete-onboarding/route.ts`
- POST endpoint that sets `hasCompletedOnboarding` to true
- Authenticate user from session
- Return success/error status

**Implementation**:
```typescript
// src/app/api/user/complete-onboarding/route.ts
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { hasCompletedOnboarding: true }
  });

  return NextResponse.json({ success: true });
}
```

**Acceptance Criteria**:
- [ ] POST /api/user/complete-onboarding returns 200 on success
- [ ] User's hasCompletedOnboarding set to true in database
- [ ] Returns 401 if not authenticated

---

## Phase 2: Core Story Components

### Task 2.1: Build StoryProgressBar Component
**Description**: Segmented progress bar showing current slide position
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 2.2, 2.3

**Technical Requirements**:
- 6 segments (one per slide)
- Completed slides: 100% filled (gold #C9A227)
- Current slide: animated fill based on progress %
- Future slides: empty (rgba(255,255,255,0.15))
- Positioned at top of screen

**Implementation**:
```typescript
// src/components/onboarding/StoryProgressBar.tsx
"use client";

interface StoryProgressBarProps {
  totalSlides: number;
  currentSlide: number;
  progress: number; // 0-100
}

export function StoryProgressBar({ totalSlides, currentSlide, progress }: StoryProgressBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex gap-1 z-10">
      {Array.from({ length: totalSlides }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: i < currentSlide ? "100%" : i === currentSlide ? `${progress}%` : "0%",
              backgroundColor: "#C9A227"
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Shows 6 segments
- [ ] Completed slides fully filled
- [ ] Current slide animates fill smoothly
- [ ] Uses brand gold color (#C9A227)

---

### Task 2.2: Build StoryOnboarding Container Component
**Description**: Main story container with auto-advance timer and tap navigation
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 2.3

**Technical Requirements**:
- State for currentSlide (0-5) and progress (0-100)
- Auto-advance timer: 100ms interval, increment by 1.5 (≈6.6s per slide)
- Tap zones: left half = back, right half = forward
- Pause auto-advance on final slide
- Call onComplete when user clicks CTA or taps right on last slide

**Implementation**:
```typescript
// src/components/onboarding/StoryOnboarding.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StoryProgressBar } from "./StoryProgressBar";
// Import all slide components

const TOTAL_SLIDES = 6;

export function StoryOnboarding() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleComplete = useCallback(async () => {
    await fetch("/api/user/complete-onboarding", { method: "POST" });
    router.push("/contacts/new");
  }, [router]);

  // Auto-advance timer
  useEffect(() => {
    // Pause on final slide
    if (currentSlide === TOTAL_SLIDES - 1) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide(c => c + 1);
            return 0;
          }
          return 100;
        }
        return prev + 1.5; // ~6.6 seconds per slide
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentSlide]);

  // Tap navigation
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x > rect.width / 2) {
      // Right tap → next
      if (currentSlide < TOTAL_SLIDES - 1) {
        setCurrentSlide(c => c + 1);
        setProgress(0);
      } else {
        handleComplete();
      }
    } else if (currentSlide > 0) {
      // Left tap → previous
      setCurrentSlide(c => c - 1);
      setProgress(0);
    }
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleTap}
    >
      <StoryProgressBar
        totalSlides={TOTAL_SLIDES}
        currentSlide={currentSlide}
        progress={progress}
      />

      {/* Render current slide */}
      {currentSlide === 0 && <Slide1PainPoint />}
      {currentSlide === 1 && <Slide2Frustration />}
      {currentSlide === 2 && <Slide3MagicMoment />}
      {currentSlide === 3 && <Slide4HowItWorks />}
      {currentSlide === 4 && <Slide5EnrichmentPreview />}
      {currentSlide === 5 && <Slide6CTA onComplete={handleComplete} />}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Auto-advances through slides 1-5
- [ ] Pauses on slide 6 (CTA)
- [ ] Tap left goes back (except on slide 1)
- [ ] Tap right goes forward or completes
- [ ] Calls API on completion
- [ ] Redirects to /contacts/new after completion

---

### Task 2.3: Create Base Slide Layout Component
**Description**: Reusable slide layout with headline/subline structure
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2

**Technical Requirements**:
- Centered layout with visual, headline, subline
- Uses design system typography
- Headline: 28-32px, bold, white
- Subline: 16px, text-secondary (#A0A0A8)
- Responsive padding

**Implementation**:
```typescript
// src/components/onboarding/slides/SlideLayout.tsx
"use client";

import { ReactNode } from "react";

interface SlideLayoutProps {
  visual: ReactNode;
  headline: string;
  subline: string;
  children?: ReactNode; // For CTA buttons etc
}

export function SlideLayout({ visual, headline, subline, children }: SlideLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 max-w-lg mx-auto">
      <div className="mb-8">
        {visual}
      </div>
      <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-4 leading-tight">
        {headline}
      </h1>
      <p className="text-base text-[#A0A0A8] leading-relaxed">
        {subline}
      </p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Renders visual, headline, subline in correct order
- [ ] Typography matches design system
- [ ] Centered and responsive

---

## Phase 3: Individual Slide Components

### Task 3.1: Build Slide 1 - Pain Point
**Description**: First slide showing contact count overwhelm
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.2, 3.3, 3.4

**Technical Requirements**:
- Visual: Contact count badge "347 contacts" (grayed out)
- Headline: "You have the perfect connection."
- Subline: "You just can't find them."
- Use Lucide ContactRound icon

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide1PainPoint.tsx
"use client";

import { SlideLayout } from "./SlideLayout";
import { Users } from "lucide-react";

export function Slide1PainPoint() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center justify-center w-32 h-32 rounded-2xl border border-white/10 bg-white/5">
          <Users className="w-10 h-10 text-[#606068] mb-2" />
          <span className="text-2xl font-bold text-[#606068]">347</span>
          <span className="text-xs text-[#606068]">contacts</span>
        </div>
      }
      headline="You have the perfect connection."
      subline="You just can't find them."
    />
  );
}
```

**Acceptance Criteria**:
- [ ] Displays grayed contact count visual
- [ ] Correct headline and subline
- [ ] Matches design spec

---

### Task 3.2: Build Slide 2 - Frustration
**Description**: Second slide showing the search frustration
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.1, 3.3, 3.4

**Technical Requirements**:
- Visual: Thought quote + question mark bubble
- Headline: "Scrolling through names doesn't work."
- Subline: "Your network is trapped in a flat list of names."

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide2Frustration.tsx
"use client";

import { SlideLayout } from "./SlideLayout";
import { HelpCircle } from "lucide-react";

export function Slide2Frustration() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center">
          <p className="text-lg text-white/80 italic mb-4 max-w-xs">
            "I'm raising a seed round... who do I know that could help?"
          </p>
          <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-white/40" />
          </div>
          <p className="text-sm text-white/30 mt-4">scrolling... scrolling...</p>
        </div>
      }
      headline="Scrolling through names doesn't work."
      subline="Your network is trapped in a flat list of names."
    />
  );
}
```

**Acceptance Criteria**:
- [ ] Shows frustration quote
- [ ] Question mark visual
- [ ] Correct copy

---

### Task 3.3: Build Slide 4 - How It Works
**Description**: Bridge slide explaining enrichment → matching
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.1, 3.2, 3.4

**Technical Requirements**:
- Visual: "HOW?" badge + matching examples
- Headline: "How does it know who to suggest?"
- Subline: "Because you told it—in 30 seconds per contact."
- Show example matches with arrows

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide4HowItWorks.tsx
"use client";

import { SlideLayout } from "./SlideLayout";
import { ArrowRight } from "lucide-react";

export function Slide4HowItWorks() {
  return (
    <SlideLayout
      visual={
        <div className="flex flex-col items-center">
          <div className="px-4 py-2 rounded-full border-2 border-[#C9A227] text-[#C9A227] font-bold text-lg mb-6">
            HOW?
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-white">"Sarah invested in D2C"</span>
              <ArrowRight className="w-4 h-4 text-[#C9A227]" />
              <span className="text-[#C9A227]">matches "seed round, D2C"</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-white">"Marcus is in NYC"</span>
              <ArrowRight className="w-4 h-4 text-[#C9A227]" />
              <span className="text-[#C9A227]">matches "NYC next week"</span>
            </div>
          </div>
        </div>
      }
      headline="How does it know who to suggest?"
      subline="Because you told it—in 30 seconds per contact."
    />
  );
}
```

**Acceptance Criteria**:
- [ ] Shows HOW? badge in gold
- [ ] Displays matching examples with arrows
- [ ] Correct copy

---

### Task 3.4: Build Slide 6 - CTA
**Description**: Final slide with call to action button
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 3.1, 3.2, 3.3

**Technical Requirements**:
- Visual: Gold sparkle icon
- Headline: "Unlock your network's full potential."
- CTA Button: "Add Your First Contact" (gold bg, black text)
- Secondary text: "Import existing contacts, or start fresh."
- Button click calls onComplete callback

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide6CTA.tsx
"use client";

import { SlideLayout } from "./SlideLayout";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide6CTAProps {
  onComplete: () => void;
}

export function Slide6CTA({ onComplete }: Slide6CTAProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tap navigation
    onComplete();
  };

  return (
    <SlideLayout
      visual={
        <div className="w-20 h-20 rounded-full bg-[#C9A227]/20 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-[#C9A227]" />
        </div>
      }
      headline="Unlock your network's full potential."
      subline=""
    >
      <Button
        onClick={handleClick}
        className="bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold px-8 py-6 text-lg"
      >
        Add Your First Contact
      </Button>
      <p className="text-sm text-[#606068] mt-4">
        Import existing contacts, or start fresh.
      </p>
    </SlideLayout>
  );
}
```

**Acceptance Criteria**:
- [ ] Shows gold sparkle icon
- [ ] CTA button with correct styling
- [ ] Button click triggers onComplete
- [ ] Click doesn't trigger tap navigation

---

## Phase 4: Animated Slides (Complex)

### Task 4.1: Build Slide 3 - Magic Moment (Animated)
**Description**: The "money shot" - animated query and contact recommendations
**Size**: Large
**Priority**: Critical
**Dependencies**: Task 2.3
**Can run parallel with**: Task 4.2

**Technical Requirements**:
- Animation sequence (timed to slide duration):
  1. (0.0s) Chat input appears empty
  2. (0.5s) Query types character by character (typewriter)
  3. (2.5s) Brief shimmer/pulse
  4. (3.0s) First contact card slides up with spring
  5. (4.5s) Second contact card slides up
  6. (5.5s) Hold for impact
- Contact cards show: avatar, name, role, WHY context (gold tinted), "Draft Intro" button
- Use Framer Motion for all animations

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide3MagicMoment.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";

const QUERY = "I'm raising a seed round for a D2C brand and I'll be in NYC next week. Who should I meet?";

const CONTACTS = [
  {
    name: "Sarah Chen",
    role: "Partner @ Founder Collective",
    detail: "Backed 3 D2C brands",
    why: "Met at SaaStr 2024, offered to intro to her LP network"
  },
  {
    name: "Marcus Johnson",
    role: "Angel · Exited D2C founder",
    detail: "Based in NYC",
    why: "Sold his brand to P&G, now writes $50-100k checks"
  }
];

export function Slide3MagicMoment() {
  const [typedText, setTypedText] = useState("");
  const [showShimmer, setShowShimmer] = useState(false);
  const [visibleContacts, setVisibleContacts] = useState(0);

  useEffect(() => {
    // Typewriter effect (0.5s - 2.5s)
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < QUERY.length) {
        setTypedText(QUERY.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        // Show shimmer (2.5s)
        setShowShimmer(true);
        setTimeout(() => setShowShimmer(false), 500);
        // Show first contact (3.0s)
        setTimeout(() => setVisibleContacts(1), 500);
        // Show second contact (4.5s)
        setTimeout(() => setVisibleContacts(2), 2000);
      }
    }, 25); // ~2s for full query

    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md px-4">
      {/* Chat Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full rounded-xl border border-white/10 bg-white/5 p-4 mb-6 ${
          showShimmer ? "animate-pulse" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-[#C9A227] mt-1 flex-shrink-0" />
          <p className="text-white/90 text-sm leading-relaxed min-h-[40px]">
            {typedText}
            <span className="animate-pulse">|</span>
          </p>
        </div>
      </motion.div>

      {/* Arrow indicators */}
      {visibleContacts > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#C9A227] text-xl mb-4"
        >
          ↓ ↓ ↓
        </motion.div>
      )}

      {/* Contact Cards */}
      <div className="w-full space-y-3">
        <AnimatePresence>
          {CONTACTS.slice(0, visibleContacts).map((contact, index) => (
            <motion.div
              key={contact.name}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: index * 0.1
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full border-2 border-[#C9A227] bg-[#C9A227]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A227] font-bold text-sm">
                    {contact.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">{contact.name}</h3>
                  <p className="text-white/60 text-sm">
                    {contact.role} · {contact.detail}
                  </p>
                  <p className="text-[#C9A227]/80 text-sm italic mt-1">
                    "{contact.why}"
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <span className="text-[#C9A227] text-sm font-medium">
                  Draft Intro →
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Headline */}
      {visibleContacts >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <h1 className="text-2xl font-bold text-white mb-2">
            Ask. Discover. Connect.
          </h1>
          <p className="text-[#A0A0A8]">
            The right people from your network, served up instantly.
          </p>
        </motion.div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Typewriter effect types query smoothly
- [ ] Shimmer effect shows after typing
- [ ] Contact cards animate in with spring physics
- [ ] Cards show name, role, WHY context in gold
- [ ] Draft Intro button visible
- [ ] Headline appears after cards

---

### Task 4.2: Build Slide 5 - Enrichment Preview (Animated)
**Description**: Animated enrichment demo with timer and bubbles
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.3, existing CircularTimer and EnrichmentBubbles components
**Can run parallel with**: Task 4.1

**Technical Requirements**:
- Reuse existing CircularTimer component (simplified/demo version)
- Reuse EnrichmentBubbles component pattern
- Animation sequence:
  1. (0.0s) Timer appears, shows :24
  2. (1.5s) First bubble pops in
  3. (2.5s) Second bubble pops in
  4. (3.5s) Third bubble pops in
  5. (4.5s) "Why Now" box slides up
- Bubbles match example from Slide 3 (D2C, NYC, $50k checks)

**Implementation**:
```typescript
// src/components/onboarding/slides/Slide5EnrichmentPreview.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BUBBLE_CATEGORY_COLORS, type BubbleCategory } from "@/lib/design-system";

interface DemoBubble {
  id: string;
  text: string;
  category: BubbleCategory;
}

const DEMO_BUBBLES: DemoBubble[] = [
  { id: "1", text: "Invested in D2C brands", category: "opportunity" },
  { id: "2", text: "Based in NYC", category: "relationship" },
  { id: "3", text: "Writes $50k checks", category: "opportunity" }
];

export function Slide5EnrichmentPreview() {
  const [visibleBubbles, setVisibleBubbles] = useState(0);
  const [showWhyNow, setShowWhyNow] = useState(false);
  const [timerValue, setTimerValue] = useState(24);

  useEffect(() => {
    // Timer countdown animation (cosmetic only)
    const timerInterval = setInterval(() => {
      setTimerValue(prev => (prev > 20 ? prev - 1 : prev));
    }, 250);

    // Staggered bubble appearance
    const bubble1 = setTimeout(() => setVisibleBubbles(1), 1500);
    const bubble2 = setTimeout(() => setVisibleBubbles(2), 2500);
    const bubble3 = setTimeout(() => setVisibleBubbles(3), 3500);
    const whyNow = setTimeout(() => setShowWhyNow(true), 4500);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(bubble1);
      clearTimeout(bubble2);
      clearTimeout(bubble3);
      clearTimeout(whyNow);
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md px-4">
      {/* Timer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-32 h-32 mb-8"
      >
        <svg width={128} height={128} className="-rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#C9A227"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            strokeDashoffset={2 * Math.PI * 52 * (1 - timerValue / 30)}
            style={{ filter: "drop-shadow(0 0 8px rgba(201, 162, 39, 0.3))" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[32px] font-bold text-white tabular-nums">
            :{timerValue.toString().padStart(2, "0")}
          </span>
        </div>
      </motion.div>

      {/* Bubbles */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        <AnimatePresence>
          {DEMO_BUBBLES.slice(0, visibleBubbles).map((bubble, index) => {
            const styles = BUBBLE_CATEGORY_COLORS[bubble.category];
            return (
              <motion.span
                key={bubble.id}
                initial={{ scale: 0.6, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: index * 0.08
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border ${styles.bg} ${styles.text} ${styles.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                {bubble.text}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Why Now Box */}
      <AnimatePresence>
        {showWhyNow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-4 mb-8"
          >
            <p className="text-[#C9A227] text-sm italic text-center">
              "Met at SaaStr, offered intros..."
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showWhyNow ? 1 : 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Just talk. We capture the context.
        </h1>
        <p className="text-[#A0A0A8]">
          This is the fuel that powers your network search.
        </p>
      </motion.div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Timer appears with gold ring animation
- [ ] Bubbles pop in staggered (1.5s, 2.5s, 3.5s)
- [ ] Bubbles use correct category colors (green, blue, green)
- [ ] Why Now box slides up last
- [ ] Headline appears after all animations

---

## Phase 5: Integration & Testing

### Task 5.1: Wire Up All Slide Components
**Description**: Connect all slides to StoryOnboarding container
**Size**: Small
**Priority**: High
**Dependencies**: Tasks 3.1-3.4, 4.1, 4.2
**Can run parallel with**: None

**Technical Requirements**:
- Import all slide components into StoryOnboarding
- Ensure proper slide switching
- Test full flow from slide 1 to completion

**Implementation**:
```typescript
// Update src/components/onboarding/StoryOnboarding.tsx imports
import { Slide1PainPoint } from "./slides/Slide1PainPoint";
import { Slide2Frustration } from "./slides/Slide2Frustration";
import { Slide3MagicMoment } from "./slides/Slide3MagicMoment";
import { Slide4HowItWorks } from "./slides/Slide4HowItWorks";
import { Slide5EnrichmentPreview } from "./slides/Slide5EnrichmentPreview";
import { Slide6CTA } from "./slides/Slide6CTA";
```

**Acceptance Criteria**:
- [ ] All 6 slides render correctly
- [ ] Transitions work smoothly
- [ ] No import/export errors

---

### Task 5.2: Manual E2E Testing
**Description**: Comprehensive manual testing of onboarding flow
**Size**: Medium
**Priority**: High
**Dependencies**: Task 5.1
**Can run parallel with**: None

**Test Scenarios**:

1. **First Login Flow**:
   - Create new user account
   - After signup, verify redirect to /onboarding
   - Verify all 6 slides display correctly

2. **Slide Navigation**:
   - Tap right side → advance to next slide
   - Tap left side → go back (except on slide 1)
   - Verify progress bar updates correctly

3. **Auto-Advance**:
   - Let slides auto-advance (wait ~6s each)
   - Verify timer pauses on slide 6

4. **Animated Slides**:
   - Slide 3: Query types out, contact cards animate in
   - Slide 5: Timer appears, bubbles pop in, Why Now slides up

5. **Completion**:
   - Click CTA button on slide 6
   - Verify redirect to /contacts/new
   - Close browser, reopen app
   - Verify user goes directly to /contacts (skips onboarding)

6. **Mobile Testing**:
   - Test on mobile viewport
   - Verify tap zones work
   - Verify layout is responsive

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Animations smooth on mobile
- [ ] Database flag properly set after completion

---

## Execution Summary

| Phase | Tasks | Priority | Est. Complexity |
|-------|-------|----------|-----------------|
| 1. Foundation | 4 tasks | High | Small-Medium |
| 2. Core Story | 3 tasks | High | Small-Large |
| 3. Static Slides | 4 tasks | High | Small |
| 4. Animated Slides | 2 tasks | Critical | Large |
| 5. Integration | 2 tasks | High | Small-Medium |

**Total Tasks**: 15

**Critical Path**: 1.1 → 1.3 → 2.2 → 4.1/4.2 → 5.1 → 5.2

**Parallel Opportunities**:
- Phase 1: Tasks 1.1 and 1.2 can run in parallel
- Phase 2: Tasks 2.1, 2.2, 2.3 can mostly run in parallel
- Phase 3: All static slides (3.1-3.4) can run in parallel
- Phase 4: Tasks 4.1 and 4.2 can run in parallel
