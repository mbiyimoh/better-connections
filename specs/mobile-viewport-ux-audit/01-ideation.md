# Mobile Viewport UX Audit & Optimization

**Slug:** mobile-viewport-ux-audit
**Author:** Claude Code
**Date:** 2026-01-03
**Branch:** preflight/mobile-viewport-ux-audit
**Related:** CLAUDE.md design system, developer-guides/

---

## 1) Intent & Assumptions

**Task brief:** Conduct a comprehensive audit of the current mobile viewport UI/UX experience and provide recommendations for optimizing look, feel, and functionality when users access Better Connections on mobile devices.

**Assumptions:**
- Target devices: iOS (iPhone 12-16 sizes) and Android (mid-range to flagship)
- Primary breakpoint for mobile: 768px (`md:` breakpoint)
- Dark theme is non-negotiable (33 Strategies brand)
- Users will use this primarily for quick contact lookups, enrichment sessions on-the-go, and exploring their network
- Voice enrichment is already a key mobile use case (react-speech-recognition)
- Performance matters more on mobile than desktop (often cellular connection)

**Out of scope:**
- Native mobile app development (focus is on responsive web)
- Tablet-specific optimizations (covered by existing responsive patterns)
- Offline-first functionality (Phase 3 PWA consideration)
- Desktop layout changes (only affects screens <768px)

---

## 2) Pre-reading Log

- `src/components/layout/Sidebar.tsx`: Hamburger menu with slide-out drawer for mobile, hardcoded 768px breakpoint check
- `src/components/ui/AlphabetSlider.tsx`: Hidden on mobile (`hidden md:flex` in parent), 24x20px letter buttons
- `src/components/contacts/ContactsTable.tsx`: Full table layout with no mobile adaptation, 820 lines, pagination at bottom
- `src/app/(dashboard)/enrichment/page.tsx`: Card-based layout already, alphabet slider hidden on mobile, `max-w-3xl` container
- `src/components/ui/input.tsx`: Mobile-first font sizing (`text-base md:text-sm`) - good pattern
- `src/components/ui/dialog.tsx`: Responsive dialog with stacked buttons on mobile
- `src/components/ui/sheet.tsx`: Side sheets at 75% width on mobile, max 384px on small+
- `src/components/ui/toast.tsx`: Top-aligned full-width on mobile, bottom-right on desktop
- `tailwind.config.ts`: Standard Tailwind breakpoints, gold accent colors, spacing scale defined

---

## 3) Codebase Map

**Primary components/modules:**
- `src/components/layout/Sidebar.tsx:68-275` - App shell navigation (hamburger + drawer)
- `src/components/contacts/ContactsTable.tsx:111-821` - Main contacts view (table, no mobile cards)
- `src/app/(dashboard)/enrichment/page.tsx:374-642` - Enrichment queue (card-based, better mobile support)
- `src/components/contacts/ContactDetail.tsx` - Contact view with form (grid layout)
- `src/components/contacts/ContactForm.tsx` - Add/edit contact form
- `src/app/(dashboard)/explore/page.tsx` - Chat-based exploration

**Shared dependencies:**
- `src/components/ui/*` - shadcn/ui components (dialog, sheet, input, button, toast)
- `src/lib/utils.ts` - cn() utility for class merging
- `tailwind.config.ts` - Design system tokens (colors, spacing, typography)
- Framer Motion - All animations

**Data flow:**
- API routes at `/api/contacts/*` and `/api/enrichment/*`
- Client-side state with useState, URL params for pagination/filters
- React Query not used (direct fetch calls)

**Feature flags/config:**
- None identified for mobile-specific features

**Potential blast radius:**
- ContactsTable.tsx (most impacted - needs mobile-first redesign)
- Sidebar.tsx (bottom nav addition)
- All form components (touch target sizing)
- Toast positioning and FAB implementation

---

## 4) Root Cause Analysis

This is a UX optimization task, not a bug fix. However, key issues identified:

**Current Mobile Pain Points:**

1. **Contacts page uses desktop table layout**
   - `ContactsTable.tsx:527-705` renders full `<Table>` component
   - 9 columns (checkbox, first name, last name, email, title/company, tags, score, last contact, actions)
   - Requires horizontal scrolling on mobile
   - Tiny touch targets in dense table cells

2. **Navigation relies on hamburger menu**
   - `Sidebar.tsx:107-113` - hamburger button top-left
   - Industry consensus: bottom nav preferred for 3-5 primary destinations
   - Current: 4 items (Contacts, Enrich, Explore, Settings) - perfect for bottom nav

3. **No touch-optimized gestures**
   - No swipe-to-reveal actions on contact cards
   - No pull-to-refresh
   - No long-press for bulk selection

4. **AlphabetSlider hidden on mobile but not replaced**
   - `enrichment/page.tsx:606` - `hidden md:flex`
   - No alternative quick-jump mechanism for mobile users

5. **Dark mode uses pure black background**
   - `bg-[#0D0D0F]` throughout codebase
   - Can cause OLED smearing on scroll
   - Industry recommendation: #121212 instead

6. **Pagination controls at bottom of contacts table**
   - `ContactsTable.tsx:708-798` - complex pagination with page input
   - Takes significant screen real estate
   - Not optimized for thumb reach

---

## 5) Research Findings

### Potential Solutions

#### A. Bottom Navigation Implementation

**Pros:**
- Industry standard for 3-5 destinations (Apple HIG, Material Design 3)
- Always visible primary actions
- Better thumb reach zone
- Replaces hidden hamburger menu cognitive load

**Cons:**
- Takes 56-64px of vertical space permanently
- Requires restructuring layout component hierarchy
- Must handle safe areas on iPhone X+ devices

**Complexity:** Medium (2-3 day implementation)

#### B. Contact Cards Instead of Table (Mobile View)

**Pros:**
- Card layouts outperform tables on mobile (NNGroup research)
- Enables swipe gestures for quick actions
- Better information hierarchy
- Larger touch targets naturally

**Cons:**
- Less dense information display
- Requires maintaining two layouts (table for desktop, cards for mobile)
- More vertical scrolling

**Complexity:** High (3-5 day implementation)

#### C. Swipe Gestures with react-swipeable

**Pros:**
- Native-feeling interactions
- Reduces cognitive load (actions discoverable through gesture)
- Industry standard pattern (iOS Mail, Gmail)

**Cons:**
- Requires additional dependency or custom implementation
- Must handle conflicts with horizontal scroll
- Accessibility concerns (need alternative access)

**Complexity:** Medium (1-2 day implementation)

#### D. FAB (Floating Action Button) for Primary Actions

**Pros:**
- Always accessible primary action
- Material Design standard pattern
- Good for "Add Contact" on contacts page
- Works well with bottom navigation

**Cons:**
- Can obscure content if poorly positioned
- Only one per screen
- Must handle scroll state (show/hide)

**Complexity:** Low (0.5-1 day implementation)

#### E. OLED-Optimized Dark Mode Colors

**Pros:**
- Prevents black smearing on OLED screens
- Maintains 40-60% power savings
- Industry best practice (#121212 vs #000000)

**Cons:**
- Requires updating design tokens globally
- May require design sign-off for brand consistency
- Subtle change may not be noticeable

**Complexity:** Low (2-4 hour implementation)

#### F. Progressive Disclosure in Contact Cards

**Pros:**
- Shows essential info first (name, title, company, strength)
- Tap to expand for full details
- Reduces visual clutter
- Better cognitive load management

**Cons:**
- Requires additional tap for common info
- Animation/state management complexity
- May feel slower for power users

**Complexity:** Medium (2-3 day implementation)

### Recommendation

**Priority 1 (Critical - MVP Mobile):**
1. Contact cards for mobile viewport (replace table at <768px)
2. Bottom navigation bar (4 items: Contacts, Enrich, Explore, Settings)
3. Touch target audit and fix (44x44pt minimum)
4. OLED-optimized background color (#121212)

**Priority 2 (Enhanced Mobile):**
5. Swipe gestures on contact cards
6. Pull-to-refresh on all lists
7. FAB for "Add Contact" on contacts page
8. Sticky search with bottom drawer filters

**Priority 3 (Polish):**
9. Progressive disclosure in cards
10. Long-press for bulk selection
11. Haptic feedback on Android
12. Voice input improvements for enrichment

---

## 6) Clarifications Needed

1. **Design approval for bottom navigation:**
   - Are you comfortable with a persistent bottom nav bar on mobile?
   - Current sidebar icons work well, but labels should be visible - confirm 4 items: Contacts, Enrich, Explore, Settings
   >> yes, I like that

2. **Contact card design direction:**
   - How much information should be visible in collapsed card state?
   - Proposed: Name, title/company (one line), relationship strength dots, enrichment score badge >> sounds good
   - Should swipe-right reveal: Call, Email, Enrich, Delete? >> enrich
   

3. **Background color change (#0D0D0F to #121212):**
   - This is a subtle but recommended change for OLED screens
   - Affects the overall brand appearance slightly darker gray vs near-black
   - Should we proceed or maintain current color?
   >> thats fine

4. **FAB positioning preference:**
   - Standard: bottom-right, 16px from edges, 56dp size
   - Action on contacts page: "Add Contact" (+)
   - Should FAB hide on scroll down, show on scroll up?
   >> standard positioning and yes, hide / show based on scroll

5. **Implementation priority:**
   - Should we tackle all Priority 1 items as a single release?
   - Or implement incrementally (e.g., bottom nav first, then cards)?
   >> I want to tackle all of priorities 1 and 2 + items 9 and 10 from priority 3 (lets cut 11 and 12 entirely). I'm fine if we do it in phases, but I'm not going to push to productions until all of that work is complete

6. **Testing device targets:**
   - Primary: iPhone 14 Pro (OLED) and Pixel 7 (OLED)?
   - Secondary: iPhone SE (smaller screen) and budget Android?
   - Should we set up Playwright mobile emulation tests?
   >> those devices are fine but no, don't set up emulation tests in this spec

---

## 7) Detailed Technical Recommendations

### 7.1 Bottom Navigation Bar

**Implementation approach:**
```
src/components/layout/
├── Sidebar.tsx (keep for desktop >768px)
├── BottomNav.tsx (NEW - mobile <768px)
└── AppShell.tsx (orchestrates which nav to show)
```

**Key technical decisions:**
- Use CSS `safe-area-inset-bottom` for iPhone notch/home indicator
- Fixed positioning at bottom, 56px height
- 4 nav items with icon + label (always visible)
- Active state: gold accent color, filled icon
- Inactive: secondary text color, outline icon

### 7.2 Mobile Contact Cards

**Implementation approach:**
```
src/components/contacts/
├── ContactsTable.tsx (desktop only, >768px)
├── ContactsCards.tsx (NEW - mobile <768px)
└── ContactsView.tsx (NEW - switches based on viewport)
```

**Card anatomy:**
```
┌─────────────────────────────────────┐
│ [Avatar] Name                    [⋮]│
│          Title · Company            │
│          [●●●○] Casual   [65%]     │
└─────────────────────────────────────┘
```

**Swipe actions (revealed on swipe-left):**
- Call (phone icon, blue)
- Email (mail icon, gold)
- Enrich (sparkle icon, purple)
- Delete (trash icon, red)

### 7.3 Touch Target Fixes

**Current issues:**
- Some icon buttons are 32x32px (below 44pt minimum)
- Table cells have minimal padding
- Pagination controls are small

**Fixes needed:**
- All buttons: minimum `h-11 w-11` (44px)
- Card tap areas: entire card clickable
- Spacing between tappable elements: minimum 8px

### 7.4 OLED Background Optimization

**Current:**
```js
bg: { primary: '#0D0D0F' }  // Near pure black
```

**Recommended:**
```js
bg: { primary: '#121212' }  // Dark gray, prevents smearing
```

**Additional changes:**
- Secondary: `#1E1E1E` (was `#1A1A1F`)
- Tertiary: `#2A2A2A` (was `#252529`)
- Primary text: `#E0E0E0` (slightly off-white, reduces strain)

### 7.5 Typography Audit

**Current text sizes (from components):**
- Body: `text-base md:text-sm` (16px mobile, 14px desktop) - GOOD
- Small: `text-xs` (12px) - ACCEPTABLE with constraints
- Caption: `text-[11px]` - NEEDS INCREASE to 12px minimum

**Line height:**
- Add `leading-relaxed` (1.625) to body text
- Currently using default (1.5) which is acceptable

---

## 8) Implementation Phases

### Phase 1: Foundation (3-4 days)
- [ ] Create BottomNav.tsx component
- [ ] Create AppShell.tsx to orchestrate nav display
- [ ] Update tailwind.config.ts with OLED-optimized colors
- [ ] Audit and fix all touch targets below 44px
- [ ] Add `safe-area-inset-bottom` handling

### Phase 2: Contact Cards (3-4 days)
- [ ] Create ContactCard.tsx component
- [ ] Create ContactsCards.tsx (list of cards)
- [ ] Create ContactsView.tsx (switches table/cards by viewport)
- [ ] Implement swipe-to-reveal actions with accessibility fallback
- [ ] Add pull-to-refresh to contacts list

### Phase 3: Enhanced Interactions (2-3 days)
- [ ] Add FAB component
- [ ] Implement FAB on contacts page (Add Contact)
- [ ] Add sticky search with bottom drawer filters
- [ ] Long-press for bulk selection mode
- [ ] Add mobile-specific alphabet quick-jump (horizontal scroll?)

### Phase 4: Polish (2-3 days)
- [ ] Haptic feedback on Android (Vibration API)
- [ ] Progressive disclosure in contact cards (tap to expand)
- [ ] Voice input UI improvements for enrichment
- [ ] E2E tests for mobile viewports
- [ ] Performance audit (Lighthouse mobile score)

---

## 9) Success Metrics

**Quantitative:**
- Lighthouse Mobile Performance score: >90
- Touch target accessibility: 100% pass (44pt minimum)
- Time to first meaningful contact interaction: <3 seconds

**Qualitative:**
- Mobile users can complete core flows without horizontal scrolling
- Primary actions (add, enrich, search) accessible within thumb reach
- Visual consistency maintained between mobile and desktop

---

## 10) Risk Assessment

**Low Risk:**
- OLED background color change (subtle, easily reversible)
- Touch target sizing (additive changes)
- FAB implementation (non-disruptive addition)

**Medium Risk:**
- Bottom navigation (changes core navigation paradigm)
- Contact cards layout (significant UI change, user adjustment)

**Mitigation:**
- Feature flag for bottom nav initially (allow rollback)
- A/B test card layout vs table on mobile if analytics available
- User feedback collection after deployment

---

## Appendix: Current Mobile Screenshots Needed

To complete this audit, capturing screenshots of current mobile experience would be valuable:
1. Contacts page at 375px width (iPhone standard)
2. Contact detail page
3. Enrichment queue page
4. Explore chat page
5. Settings page
6. Add/edit contact form

These would help identify specific pain points not visible in code review alone.
