# Better Connections
## V1 Product Design Specification

**Design Philosophy:** *Handle the complexity. Surface what matters.*

---

## Design Principles

### 1. Depth on Demand
We capture rich, multi-dimensional data on every contact. Users should never feel that complexity — until they want it.

**The Pattern:**
- First glance: Essential information only
- Hover/focus: Contextual preview
- Click/expand: Full depth available
- Deep dive: Everything we know, fully explorable

### 2. Context Over Data
Never show raw data. Always show *meaning*. A contact's value isn't their title — it's why they matter to what you're doing right now.

**The Pattern:**
- Lead with "Why Now" / relevance
- Supporting details secondary
- Raw data accessible but buried

### 3. Conversation as Interface
The primary interaction model is talking to an intelligent system, not navigating menus and filters.

**The Pattern:**
- Chat-first exploration
- Natural language over dropdowns
- System asks clarifying questions vs. requiring precise queries

### 4. Momentum Over Friction
Every interaction should feel like acceleration. Enrich contacts in 30-second bursts. Get recommendations in a single sentence. Draft intros with one click.

**The Pattern:**
- Aggressive defaults
- One-click actions for common paths
- Never require navigation to accomplish core tasks

### 5. Visual Restraint with Purposeful Delight
Dark, refined aesthetic. Minimal chrome. Animation and color serve function — moments of delight earned through utility, not decoration.

**The Pattern:**
- Dark theme as foundation
- Accent colors carry meaning (not decoration)
- Animation confirms action and guides attention
- White space creates hierarchy

---

## Visual Design System

### Color Palette

**Foundation:**
```
Background Primary:    #0D0D0F  (near-black)
Background Secondary:  #1A1A1F  (elevated surfaces)
Background Tertiary:   #252529  (cards, modals)
```

**Text:**
```
Text Primary:          #FFFFFF  (high emphasis)
Text Secondary:        #A0A0A8  (medium emphasis)
Text Tertiary:         #606068  (low emphasis, hints)
```

**Accent — Gold (Primary Actions & Success):**
```
Gold Primary:          #C9A227  (buttons, key highlights)
Gold Light:            #E5C766  (hover states)
Gold Subtle:           #C9A22720  (backgrounds, glows)
```

**Semantic Colors:**
```
Blue (Relationship):   #3B82F6  (contact type: connection)
Green (Opportunity):   #22C55E  (contact type: prospect/value)
Purple (Expertise):    #A855F7  (skills, knowledge areas)
Amber (Interest):      #F59E0B  (hobbies, personal details)
Red (Attention):       #EF4444  (stale relationships, alerts)
```

### Typography

**Font Stack:**
```
Primary:    "Inter", system-ui, sans-serif
Monospace:  "JetBrains Mono", monospace (for data, counts)
```

**Scale:**
```
Display:    32px / 40px line-height / -0.02em tracking
Heading 1:  24px / 32px / -0.01em
Heading 2:  20px / 28px / -0.01em
Body:       15px / 24px / 0
Body Small: 13px / 20px / 0
Caption:    11px / 16px / 0.02em (uppercase)
```

### Spacing System
```
4px base unit
xs: 4px   | sm: 8px   | md: 16px
lg: 24px  | xl: 32px  | 2xl: 48px
```

### Border Radius
```
Subtle:     4px   (inputs, small elements)
Standard:   8px   (cards, buttons)
Rounded:    12px  (modals, panels)
Pill:       9999px (tags, badges)
```

### Elevation (Glassmorphism)
```
Level 1:  background: rgba(26, 26, 31, 0.8)
          backdrop-filter: blur(12px)
          border: 1px solid rgba(255, 255, 255, 0.06)

Level 2:  background: rgba(37, 37, 41, 0.9)
          backdrop-filter: blur(16px)
          border: 1px solid rgba(255, 255, 255, 0.08)
          
Level 3:  background: rgba(45, 45, 50, 0.95)
          backdrop-filter: blur(20px)
          border: 1px solid rgba(255, 255, 255, 0.1)
```

### Shadows
```
Glow (gold):    0 0 20px rgba(201, 162, 39, 0.3)
Ambient:        0 4px 24px rgba(0, 0, 0, 0.4)
Elevated:       0 8px 32px rgba(0, 0, 0, 0.6)
```

---

## Core Experiences

### Experience 1: Dashboard / Home

**Purpose:** Entry point. Show what matters now without overwhelming.

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  Better Connections                          [Search] [+ Add]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐             │
│  │ Explore Your Network│  │ Enrich Contacts     │             │
│  │                     │  │                     │             │
│  │ "I'm looking for..."|  │ 23 contacts need    │             │
│  │ [Start exploring →] │  │ enrichment          │             │
│  │                     │  │ [Start session →]   │             │
│  └─────────────────────┘  └─────────────────────┘             │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  RECENT ACTIVITY                                    [View all] │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🟢 Enriched Marcus Chen              2 hours ago         │ │
│  │ 🔵 Intro sent: Sarah → David         Yesterday           │ │
│  │ 🟡 New import: 47 LinkedIn contacts  2 days ago          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  QUICK STATS                                                   │
│                                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │   847   │ │   621   │ │   226   │ │    12   │             │
│  │ Total   │ │Enriched │ │  Flat   │ │Intros   │             │
│  │Contacts │ │         │ │         │ │This Mo. │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Progressive Disclosure:**
- Stats are glanceable numbers; click any stat to filter contact list
- Recent activity shows summary; click to expand full detail
- "Flat contacts" count subtly emphasizes enrichment opportunity without nagging

**Interaction:**
- Primary CTAs (Explore, Enrich) are large, inviting
- Search is always accessible but not dominant
- Quick-add allows manual contact entry without leaving context

---

### Experience 2: Gamified Enrichment

**Purpose:** Transform "dead" imported contacts into rich, useful profiles through voice-first rapid capture.

**Layout — Pre-Session:**
```
┌────────────────────────────────────────────────────────────────┐
│  ← Back                              Enrich Contacts           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                    ┌─────────────────────┐                     │
│                    │                     │                     │
│                    │   226 contacts      │                     │
│                    │   need enrichment   │                     │
│                    │                     │                     │
│                    └─────────────────────┘                     │
│                                                                │
│  How should we serve them?                                     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ○ Random                                               │  │
│  │  ○ Most recent imports first                            │  │
│  │  ○ By tag:  [ Select tag          ▼ ]                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│                                                                │
│                    ┌─────────────────────┐                     │
│                    │   Start Session     │                     │
│                    │        🎙️           │                     │
│                    └─────────────────────┘                     │
│                                                                │
│  ───────────────────────────────────────────────────────────  │
│  💡 Tip: Think about how you know them, what they're good     │
│     at, and when you'd want to connect with them.             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Layout — Active Session:**
```
┌────────────────────────────────────────────────────────────────┐
│  [Pause]  [End Session]                    3 of 226 enriched   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                    ┌─────────────────────┐                     │
│                    │                     │                     │
│                    │    Marcus Chen      │                     │
│                    │    marcus@email.com │                     │
│                    │                     │                     │
│                    │   [Photo if avail]  │                     │
│                    │                     │                     │
│                    └─────────────────────┘                     │
│                                                                │
│                         ┌──────┐                               │
│                         │ :23  │  ← Countdown timer            │
│                         └──────┘                               │
│                                                                │
│         [+30 sec]              [⏸ Pause]                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │    ┌──────────────────┐  ┌─────────────────┐           │  │
│  │    │ Potential LP     │  │ Met at Google   │           │  │
│  │    │ 🟢               │  │ program 🔵      │           │  │
│  │    └──────────────────┘  └─────────────────┘           │  │
│  │                                                         │  │
│  │         ┌────────────────────────┐                      │  │
│  │         │ Connected to Sequoia   │  ← Appearing now     │  │
│  │         │ partner 🟡             │                      │  │
│  │         └────────────────────────┘                      │  │
│  │                                                         │  │
│  │    ┌──────────────────┐                                 │  │
│  │    │ Board game       │                                 │  │
│  │    │ enthusiast 🟠    │                                 │  │
│  │    └──────────────────┘                                 │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│                    🎙️ Listening...                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Bubble Behavior:**
- Bubbles appear with subtle scale-up animation (0.8 → 1.0) and fade-in
- Each bubble has colored dot indicating category
- Bubbles arrange organically (not grid) with slight randomness in position
- Combo statements (hitting multiple categories) spawn clustered bubbles with subtle glow
- Timer pulses gently in last 10 seconds
- "+30 sec" button glows gold when available

**Post-Timer Flow:**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                    ✓ Marcus Chen enriched                      │
│                                                                │
│  We captured:                                                  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ RELATIONSHIP        │ STRATEGIC VALUE                   │  │
│  │ • Met at Google AI  │ • Potential LP                    │  │
│  │   program           │ • Connected to Sequoia partner    │  │
│  │                     │                                   │  │
│  │ INTERESTS           │ EXPERTISE                         │  │
│  │ • Board games       │ • (none captured)                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 💬 Quick follow-up:                                     │  │
│  │                                                         │  │
│  │ "What does Marcus do professionally? Any specific       │  │
│  │  expertise areas?"                                      │  │
│  │                                                         │  │
│  │  [Answer quickly]           [Skip]                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│              ┌─────────────────────────────┐                   │
│              │   Next Contact →            │                   │
│              └─────────────────────────────┘                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Progressive Disclosure:**
- Summary shows categories with bullet points
- "(none captured)" subtly indicates gaps without judgment
- Follow-up question targets highest-value missing info
- Skip option respects momentum over completeness

---

### Experience 3: Chat-Based Network Exploration

**Purpose:** Natural language interface to explore your network based on current needs.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back                                                    Explore Network  │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  CONVERSATION                    │  RECOMMENDED CONTACTS                    │
│                                  │                                          │
│  ┌────────────────────────────┐  │  Showing contacts relevant to:           │
│  │ What are you looking for?  │  │  "friends and family round"              │
│  │                            │  │                                          │
│  │ I'm trying to raise a      │  │  ┌────────────────────────────────────┐  │
│  │ small friends and family   │  │  │ Sarah Chen                         │  │
│  │ round for 33 Strategies    │  │  │ Angel investor · Sold SaaS 2021    │  │
│  │                            │  │  │                                    │  │
│  │ ─────────────────────────  │  │  │ WHY NOW                            │  │
│  │                            │  │  │ F&F round experience, warm         │  │
│  │ 🤖 Great — a few quick     │  │  │ relationship, you helped her       │  │
│  │ questions to help me       │  │  │ with analytics last year           │  │
│  │ surface the best contacts: │  │  │                                    │  │
│  │                            │  │  │ [Draft Intro]        [View Full]   │  │
│  │ • What's the target raise  │  │  └────────────────────────────────────┘  │
│  │   amount?                  │  │                                          │
│  │ • Are you looking for      │  │  ┌────────────────────────────────────┐  │
│  │   capital, advice, or both?│  │  │ David Park                         │  │
│  │                            │  │  │ Wrote $25K F&F checks before       │  │
│  │ ─────────────────────────  │  │  │                                    │  │
│  │                            │  │  │ WHY NOW                            │  │
│  │ Probably $150K total.      │  │  │ Has deployed F&F capital before,   │  │
│  │ Mostly capital but advice  │  │  │ interested in AI/automation        │  │
│  │ from people who've done    │  │  │                                    │  │
│  │ it would be helpful too.   │  │  │ [Draft Intro]        [View Full]   │  │
│  │                            │  │  └────────────────────────────────────┘  │
│  │ ─────────────────────────  │  │                                          │
│  │                            │  │  ┌────────────────────────────────────┐  │
│  │ 🤖 Based on that, here     │  │  │ ︙ 4 more contacts                  │  │
│  │ are people who could help  │  │  │   [Show more]                      │  │
│  │ with both. I've sorted by  │  │  └────────────────────────────────────┘  │
│  │ warmth of relationship +   │  │                                          │
│  │ relevance to early-stage   │  │  ──────────────────────────────────────  │
│  │ fundraising...             │  │                                          │
│  └────────────────────────────┘  │  PINNED (2)                              │
│                                  │  ┌─────────────────┐ ┌─────────────────┐ │
│  ┌────────────────────────────┐  │  │ Sarah C. [×]    │ │ James M. [×]    │ │
│  │ Type a message...      🎙️ │  │  └─────────────────┘ └─────────────────┘ │
│  └────────────────────────────┘  │                                          │
│                                  │                                          │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

**Contact Card States:**

*Collapsed (Default):*
```
┌────────────────────────────────────┐
│ Sarah Chen                         │
│ Angel investor · Sold SaaS 2021    │
│                                    │
│ WHY NOW                            │
│ F&F round experience, warm         │
│ relationship, helped with...       │
│                                    │
│ [Draft Intro]        [View Full]   │
└────────────────────────────────────┘
```

*Hover Preview (Quick Info):*
```
┌────────────────────────────────────┐
│ Sarah Chen                         │
│ Angel investor · Sold SaaS 2021    │
│                                    │
│ WHY NOW                            │
│ F&F round experience, warm         │
│ relationship, helped with          │
│ analytics project last year        │
│                                    │
│ ─────────────────────────────────  │
│ 📍 San Francisco                   │
│ 🤝 Last contact: 3 months ago      │
│ 🔗 Mutual: David P., Marcus C.     │
│                                    │
│ [Draft Intro]        [View Full]   │
└────────────────────────────────────┘
```

*Expanded (Full Profile):*
```
┌────────────────────────────────────────────────────────────┐
│ Sarah Chen                                            [×]  │
│ Angel investor · Sold SaaS company 2021                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ WHY NOW (for this conversation)                            │
│ ───────────────────────────────────────────────────────── │
│ Friends & family round experience, warm relationship,      │
│ you helped her with analytics project last year. She's     │
│ deployed angel capital 3x in past 2 years.                 │
│                                                            │
│ RELATIONSHIP                                               │
│ ───────────────────────────────────────────────────────── │
│ Met at Google AI program (2023). Collaborated on her       │
│ analytics needs — she was impressed with speed of          │
│ delivery. Follow up energy has been strong.                │
│                                                            │
│ Last contact: 3 months ago (coffee in SF)                  │
│ Relationship strength: ████████░░ Strong                   │
│                                                            │
│ PROFILE                                                    │
│ ───────────────────────────────────────────────────────── │
│ Expertise: SaaS operations, B2B sales, early-stage         │
│           fundraising                                      │
│ Interests: Trail running, mentoring founders, wine         │
│ Location: San Francisco, CA                                │
│                                                            │
│ CONNECTIONS                                                │
│ ───────────────────────────────────────────────────────── │
│ Mutual contacts: David Park, Marcus Chen                   │
│ Could intro to: 2 Sequoia connections, 1 a16z partner      │
│                                                            │
│ HISTORY                                                    │
│ ───────────────────────────────────────────────────────── │
│ • Intro sent to James M. (successful - they met)           │
│ • Enriched via Better Networking event                     │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ [Draft Intro Email]    [Re-engagement Note]    [Pin]  ││
│ └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

**Progressive Disclosure Summary:**
| Level | What's Shown | Trigger |
|-------|--------------|---------|
| Card | Name, role, Why Now (truncated) | Default |
| Hover | + Location, last contact, mutual connections | Mouse hover |
| Expanded | Full profile, relationship history, all metadata | Click "View Full" |

**Interaction Patterns:**
- Pin contacts to keep them visible while continuing to explore
- Compare pinned contacts side-by-side
- Draft intro directly from any card state
- Voice input available for conversation panel

---

### Experience 4: Intro Email Drafting

**Purpose:** Generate contextual intro emails with minimal friction.

**Trigger:** Click "Draft Intro" from any contact card.

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ Draft Introduction                                    [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  CONNECTING                                                │
│  You → Sarah Chen                                          │
│                                                            │
│  CONTEXT (from your exploration)                           │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Looking for: Friends & family round, $150K target      ││
│  │ Why Sarah: F&F experience, warm relationship, has      ││
│  │            deployed angel capital before               ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  DRAFT                                                     │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Subject: Quick catch-up + something I'm working on     ││
│  │ ─────────────────────────────────────────────────────  ││
│  │ Hey Sarah,                                             ││
│  │                                                        ││
│  │ Hope you've been well — been thinking about our        ││
│  │ conversation at coffee a few months back. Your         ││
│  │ perspective on early-stage fundraising stuck with me.  ││
│  │                                                        ││
│  │ I'm starting something new (AI consulting practice     ││
│  │ called 33 Strategies) and putting together a small     ││
│  │ friends & family round. Given your experience both     ││
│  │ raising and deploying early capital, I'd love to get   ││
│  │ your take — and if it's interesting, potentially       ││
│  │ have you involved.                                     ││
│  │                                                        ││
│  │ Any chance you have 20 minutes this week or next?      ││
│  │                                                        ││
│  │ [Edit draft]                                           ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  [Regenerate]   [Try different angle ▼]   [Copy to send]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**"Try different angle" options:**
- More direct ask
- Softer approach (advice-first)
- Mutual connection reference
- Re-engagement focus (if stale relationship)

**Post-Send Tracking:**
After copying, prompt appears:
```
┌────────────────────────────────────────────────────────────┐
│ Did you send the intro to Sarah?                          │
│                                                            │
│ [Yes, sent]        [Not yet]        [Changed my mind]      │
└────────────────────────────────────────────────────────────┘
```

If "Yes, sent" → Add to pending outcomes, prompt for result in 1 week.

---

### Experience 5: Reverse Lookup

**Purpose:** Instant context when someone reaches out unexpectedly.

**Trigger:** Search bar or dedicated "Who is this?" entry point.

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Who is this?                                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 🔍 Enter name or email...                              ││
│  │                                                        ││
│  │ james.wilson@techcorp.com                              ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  ───────────────────────────────────────────────────────  │
│                                                            │
│  MATCH FOUND                                               │
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ James Wilson                                           ││
│  │ VP Engineering at TechCorp                             ││
│  │                                                        ││
│  │ HOW YOU KNOW THEM                                      ││
│  │ Met at Austin AI Meetup (March 2024). David Park       ││
│  │ introduced you. He was interested in automating        ││
│  │ their QA processes.                                    ││
│  │                                                        ││
│  │ WHY THEY MIGHT BE REACHING OUT                         ││
│  │ • You mentioned following up about QA automation       ││
│  │ • TechCorp recently raised Series B (may have budget)  ││
│  │ • David may have mentioned you again                   ││
│  │                                                        ││
│  │ QUICK CONTEXT FOR RESPONSE                             ││
│  │ He's technical but manages team, not hands-on.         ││
│  │ Mentioned he's skeptical of AI hype but open to        ││
│  │ practical applications.                                ││
│  │                                                        ││
│  │ [View full profile]     [Draft response]               ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Progressive Disclosure:**
- Immediate: How you know them + why they might be reaching out
- On demand: Full profile with all enriched data

---

## Micro-Interactions & Animations

### Bubble Appearance (Enrichment)
```
Duration: 300ms
Easing: cubic-bezier(0.34, 1.56, 0.64, 1) — slight overshoot
Transform: scale(0.8) → scale(1.05) → scale(1)
Opacity: 0 → 1

Combo cluster: staggered 50ms between bubbles, shared glow pulse
```

### Contact Card Expansion
```
Duration: 250ms
Easing: ease-out
Height: auto-animate
Content: fade-in with 50ms delay after height completes
```

### Panel Transitions (Chat ↔ Results)
```
Duration: 200ms
Easing: ease-in-out
Pattern: Slide + fade (content slides in direction of navigation)
```

### Timer Pulse (Last 10 seconds)
```
Duration: 1000ms per pulse
Transform: scale(1) → scale(1.05) → scale(1)
Color: neutral → gold subtle → neutral
Easing: ease-in-out
```

### Button Press Feedback
```
Duration: 100ms
Transform: scale(0.97)
Background: lighten 10%
Easing: ease-out
```

---

## Responsive Considerations

### Desktop (Primary Target)
Full split-panel layout as designed. Optimal experience.

### Tablet
- Chat exploration: Stack panels vertically (conversation top, contacts bottom)
- Enrichment: Full-screen focus mode

### Mobile
- Conversation-first: Contacts accessible via swipe or toggle
- Enrichment: Portrait optimized, bubbles arrange in tighter space
- Voice input critical for mobile enrichment

---

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate
- Escape to close modals/expanded states
- Arrow keys for contact list navigation

### Screen Reader
- All bubbles have aria-labels with full text
- Contact cards have comprehensive aria-descriptions
- Timer announces at 10 seconds and completion

### Motion Sensitivity
- `prefers-reduced-motion`: Disable bubble animations, instant state changes
- Timer still visible but without pulse animation

### Color Contrast
- All text meets WCAG AA minimum (4.5:1 for body, 3:1 for large)
- Bubble colors supplemented with category labels, not color-dependent

---

## Implementation Priority

### Phase 1: Core Shell
- Navigation structure
- Dashboard layout
- Contact data model
- Import flow (Google, LinkedIn, manual)

### Phase 2: Enrichment Experience
- Timer UI and countdown logic
- Voice input integration
- Real-time transcription to bubbles
- Bubble rendering and animation
- Post-timer summary and follow-up

### Phase 3: Chat Exploration
- Split-panel layout
- Conversation interface
- Dynamic contact viewer
- Contextual relevance ("Why Now") generation
- Contact card states (collapsed, hover, expanded)

### Phase 4: Action Layer
- Intro email drafting
- Copy/send tracking
- Outcome prompts
- Reverse lookup

### Phase 5: Polish
- Animation refinement
- Edge case handling
- Performance optimization
- Mobile responsive pass

---

*Design Specification Version: 1.0*
*Last Updated: [Date]*
*Author: 33 Strategies*
