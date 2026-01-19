# Building Blocks Research: Better Connections V1

## Executive Summary

Better Connections V1 requires a unique combination of voice input, gamified UI elements, chat interfaces, and progressive disclosure patterns. The recommended stack leverages modern, well-maintained libraries that work cohesively together.

**Recommended Core Stack:**
- **Animation:** Framer Motion (physics-based, gesture support, React-native)
- **Speech-to-Text:** Web Speech API via react-speech-recognition
- **Chat Interface:** Custom build with shadcn/ui primitives
- **Split Panels:** react-resizable-panels
- **Timer:** react-countdown-circle-timer
- **UI Foundation:** shadcn/ui + Tailwind CSS (dark theme + glassmorphism)

---

## 1. Core Libraries & Frameworks

### Animation Library

#### Option A: Framer Motion ⭐ RECOMMENDED
- **GitHub:** 24k+ stars | Active maintenance (2025)
- **License:** MIT
- **Bundle:** ~32kb minified
- **Pros:**
  - Physics-based spring animations (perfect for bubble pop-in effects)
  - Built-in gesture support (drag, tap, hover)
  - Declarative, React-native API
  - AnimatePresence for mount/unmount animations
  - Layout animations for list reordering
  - SSR compatible
- **Cons:**
  - Learning curve for complex choreography
  - Bundle size larger than alternatives
- **Best For:** Interactive UI with gestures, spring physics, component transitions
- **Resources:** [motion.dev](https://motion.dev), [Documentation](https://www.framer.com/motion/)

#### Option B: React Spring
- **GitHub:** 28k+ stars
- **License:** MIT
- **Pros:** Pure physics simulation, lighter weight, hooks-based
- **Cons:** Steeper learning curve, less built-in gesture support, requires react-use-gesture separately
- **Best For:** Complex physics animations, performance-critical apps

**Decision:** Framer Motion wins for Better Connections due to gesture support (for bubble interactions) and easier API for rapid prototyping.

---

### Speech-to-Text

#### Option A: react-speech-recognition ⭐ RECOMMENDED
- **npm:** 4.0.1 | Updated 7 months ago | 92 dependents
- **License:** MIT
- **Pros:**
  - Wraps Web Speech API cleanly
  - Hooks-based (useSpeechRecognition)
  - Supports continuous listening
  - interimResults for real-time transcription
  - No external API key required for Chrome
- **Cons:**
  - Browser support limited (Chrome, Edge, Safari)
  - No offline support
- **Best For:** Web prototypes where Chrome is primary target
- **Resources:** [npm](https://www.npmjs.com/package/react-speech-recognition)

#### Option B: react-hook-speech-to-text
- **GitHub:** Active
- **Pros:** Cross-browser with Google Cloud fallback, interimResult support
- **Cons:** Requires Google API key for non-Chrome
- **Best For:** Production apps needing broader browser support

#### Option C: Picovoice Cheetah (Future)
- Edge AI, offline capable, premium quality
- Requires SDK license
- **Best For:** Production apps needing offline/privacy

**Decision:** react-speech-recognition for v1 prototype (simplicity), consider Picovoice for production.

---

### Chat Interface Components

#### Option A: Custom Build with shadcn/ui ⭐ RECOMMENDED
- **Approach:** Build from shadcn primitives (Input, ScrollArea, Avatar, Card)
- **Pros:**
  - Full design control
  - Matches your glassmorphism aesthetic
  - No fighting with library styling
  - Smaller bundle (only what you use)
- **Cons:** More initial dev time
- **Best For:** Highly customized chat experiences

#### Option B: @chatscope/chat-ui-kit-react
- **GitHub:** 1.5k+ stars
- **Pros:** Full-featured, message lists, typing indicators, responsive
- **Cons:** Heavy styling opinions, may conflict with dark theme

#### Option C: assistant-ui
- **YC-backed** | 50k+ monthly downloads
- **Pros:** AI-chat focused, streaming support, Radix-style composability
- **Cons:** Newer library, may have edge cases
- **Best For:** AI assistant interfaces (future consideration)

**Decision:** Custom build with shadcn/ui for maximum design control.

---

### Split Panel Layout

#### Option A: react-resizable-panels ⭐ RECOMMENDED
- **GitHub:** bvaughn/react-resizable-panels | 4k+ stars
- **License:** MIT
- **Pros:**
  - By Brian Vaughn (React core team member)
  - Minimal, unstyled (works with any design system)
  - Keyboard accessible (Window Splitter pattern)
  - Auto-save layout with autoSaveId
  - Supports nested panels
- **Cons:** Requires custom styling for resize handles
- **Best For:** IDE-like layouts, flexible panel arrangements
- **Resources:** [npm](https://www.npmjs.com/package/react-resizable-panels)

```jsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="horizontal">
  <Panel defaultSize={40} minSize={30}>
    <ChatPanel />
  </Panel>
  <PanelResizeHandle className="w-1 bg-white/10 hover:bg-gold/50" />
  <Panel defaultSize={60}>
    <ContactsViewer />
  </Panel>
</PanelGroup>
```

#### Option B: allotment
- VSCode-style panels, good defaults
- Slightly heavier

**Decision:** react-resizable-panels for flexibility and Brian Vaughn's maintenance track record.

---

### Countdown Timer

#### Option A: react-countdown-circle-timer ⭐ RECOMMENDED
- **GitHub:** vydimitrov/react-countdown-circle-timer | 500+ stars
- **npm:** 42k+ weekly downloads
- **License:** MIT
- **Pros:**
  - Circular progress with smooth SVG animation
  - Single requestAnimationFrame loop (performance optimized)
  - Color transitions during countdown
  - Customizable center content
  - Hook available (useCountdown) for custom UIs
- **Cons:** Circle-shaped only (but center content is customizable)
- **Best For:** Gamified timers, visual countdown experiences
- **Resources:** [npm](https://www.npmjs.com/package/react-countdown-circle-timer)

```jsx
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

<CountdownCircleTimer
  isPlaying
  duration={30}
  colors={['#C9A227', '#F7B801', '#EF4444']}
  colorsTime={[30, 15, 5]}
  onComplete={() => handleTimerComplete()}
>
  {({ remainingTime }) => remainingTime}
</CountdownCircleTimer>
```

**Decision:** Perfect fit for the 30-second enrichment experience.

---

### UI Foundation

#### Option A: shadcn/ui + Tailwind CSS ⭐ RECOMMENDED
- **Approach:** Copy-paste components, full ownership
- **License:** MIT
- **Pros:**
  - Radix UI primitives (accessibility built-in)
  - Full design control
  - Dark mode native
  - Glassmorphism variants available (glasscn-ui)
  - Active community, extensive component library
- **Cons:** Initial setup time
- **Key Components for Better Connections:**
  - Card (contact cards)
  - HoverCard (contact preview on hover)
  - Input, Textarea (chat input)
  - ScrollArea (message lists, contact lists)
  - Avatar (contact photos)
  - Badge (tag bubbles)
  - Dialog/Sheet (expanded contact view)
  - Command (quick search)
- **Resources:** [ui.shadcn.com](https://ui.shadcn.com)

#### Glassmorphism Extension: glasscn-ui
- **GitHub:** itsjavi/glasscn-ui
- Adds `glass`, `blur`, `translucent` variants to shadcn components
- CSS variables for blur intensity
- Perfect for the design spec's elevated surfaces

**Decision:** shadcn/ui as foundation with custom glassmorphism styling.

---

## 2. Template Projects & Starting Points

### Template A: shadcn/ui Dashboard Template ⭐ Reference
- **Source:** [shadcn.io/template](https://www.shadcn.io/template)
- **Stack:** Next.js 14, Tailwind, TypeScript
- **Features:** Sidebar nav, responsive layouts, dark mode
- **Adoption Strategy:** Reference for layout patterns, don't copy wholesale
- **Setup Time:** N/A (reference only)

### Template B: Magic UI
- **Source:** [magicui.design](https://magicui.design)
- **Stack:** React, Framer Motion, Tailwind
- **Features:** 50+ animated components, text effects, backgrounds
- **Adoption Strategy:** Cherry-pick animation patterns for bubble effects
- **Relevant Components:**
  - Animated Grid Pattern (for backgrounds)
  - Blur Fade (for progressive disclosure)
  - Shimmer Button (for CTA styling)

### Template C: Aceternity UI
- **Source:** [ui.aceternity.com](https://ui.aceternity.com)
- **Features:** High-end animated components
- **Relevant Components:**
  - Floating dock (for action buttons)
  - Spotlight effect (for hover states)
  - Moving border (for active states)

**Recommendation:** Start fresh with shadcn/ui primitives, reference Magic UI for animation inspiration.

---

## 3. Pre-built Components

### Tags/Bubbles
**For the enrichment bubble system, build custom with:**
- Framer Motion for spring pop-in animations
- Tailwind for pill/badge styling
- CSS custom properties for category colors

```jsx
// Custom bubble component concept
const EnrichmentBubble = ({ text, category, delay }) => (
  <motion.span
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 25, delay }}
    className={`px-3 py-1.5 rounded-full text-sm font-medium ${categoryColors[category]}`}
  >
    <span className={`w-2 h-2 rounded-full mr-2 inline-block ${categoryDots[category]}`} />
    {text}
  </motion.span>
);
```

### Contact Cards with HoverCard
**Use shadcn/ui HoverCard (built on Radix):**
- Trigger: Contact name/row
- Content: Quick preview with "Why Now" context
- Expanded: Full profile in Sheet/Dialog

### Icons
- **lucide-react:** Default for shadcn/ui, comprehensive icon set
- **Phosphor Icons:** Alternative with more weights/variants

---

## 4. Integration Recommendations

### Build & Deploy
- **Framework:** Next.js 14+ (App Router) or Vite + React
- **Styling:** Tailwind CSS v4 (new @theme directive)
- **Hosting:** Vercel (free tier: 100GB bandwidth, serverless functions)
- **CI/CD:** GitHub Actions (built-in with Vercel)

### Data Layer (Future)
- **Local State:** Zustand (lightweight, no boilerplate)
- **Server State:** React Query / TanStack Query
- **Database:** Supabase (free tier: 500MB, auth included)

### Import Connectors
**Google Contacts:**
- Google People API v1
- OAuth 2.0 with `contacts.readonly` scope
- Library: `react-google-contacts` or direct gapi integration

**LinkedIn:**
- Requires LinkedIn API partnership (restricted)
- Alternative: CSV export/import workflow
- Alternative: Browser extension approach (legal considerations)

---

## 5. Learning Resources

### Quick Start Tutorials
1. **Framer Motion Basics** - [motion.dev/docs](https://motion.dev/docs) - 30 min
2. **shadcn/ui Setup** - [ui.shadcn.com/docs/installation](https://ui.shadcn.com/docs/installation) - 15 min
3. **react-speech-recognition Guide** - [npm docs](https://www.npmjs.com/package/react-speech-recognition) - 20 min

### Production Examples
1. **Linear App** - Exemplary animation and interaction design
2. **Vercel Dashboard** - shadcn/ui + dark theme reference
3. **Raycast** - Command palette and keyboard-first UX

### Gotchas & Best Practices
- ⚠️ **Speech Recognition Browser Support:** Test in Chrome first, Safari has quirks
- ⚠️ **AnimatePresence:** Requires `key` prop on children for exit animations
- ⚠️ **Tailwind Dark Mode:** Use `dark:` variants, set `darkMode: 'class'` in config
- ✅ **Framer Motion Performance:** Use `layout` prop sparingly, `layoutId` for shared transitions
- ✅ **Voice Input UX:** Always show visual feedback when listening
- ✅ **Timer Feedback:** Pulse animation in final 10 seconds creates urgency

---

## Implementation Roadmap

### Phase 1: Foundation (3-4 hours)
1. Initialize Next.js + Tailwind + shadcn/ui
2. Configure dark theme with CSS variables
3. Set up Framer Motion
4. Create basic layout shell

### Phase 2: Enrichment Experience (4-6 hours)
1. Build timer component with countdown-circle-timer
2. Implement speech recognition hook
3. Create bubble animation system
4. Build enrichment session flow

### Phase 3: Chat Exploration (4-6 hours)
1. Build split-panel layout
2. Create chat interface
3. Build contact card components
4. Implement hover/expanded states

### Phase 4: Polish (2-4 hours)
1. Animation refinement
2. Responsive adjustments
3. Loading states
4. Edge case handling

**Total Estimated:** 13-20 hours for full V1 prototype

---

## Decision Matrix

| Criteria | Framer Motion | react-speech-recognition | shadcn/ui | react-resizable-panels |
|----------|---------------|-------------------------|-----------|----------------------|
| Ease of Use | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Customization | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Community | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Cost Analysis

| Component | Free Tier | Paid Threshold | Monthly Cost |
|-----------|-----------|----------------|--------------|
| Vercel Hosting | 100GB bandwidth | >100GB | $20/mo |
| Supabase | 500MB DB, 50k MAU | >limits | $25/mo |
| Google APIs | 10k requests/day | >10k | Pay per use |
| All Libraries | MIT Licensed | N/A | $0 |

**Estimated Monthly Cost (first year):** $0 (within free tiers for prototype/MVP)

---

## Next Steps

1. **Immediate:** Set up Next.js project with the recommended stack
2. **This Week:** Build enrichment timer + bubble system prototype
3. **Before Commit:** Test speech recognition across target browsers

**Questions to Validate:**
- [ ] Does Web Speech API meet latency requirements for real-time bubbles?
- [ ] Can Framer Motion handle 20+ simultaneous bubble animations smoothly?
- [ ] Does glassmorphism blur perform well on mobile Safari?

---

*Research Completed: December 2024*
*Libraries verified for 2024-2025 compatibility*
