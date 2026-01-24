# AttendeeCard Layout Alignment & Current Focus Redesign

**Slug:** attendee-card-layout-alignment
**Author:** Claude Code
**Date:** 2026-01-24
**Branch:** preflight/attendee-card-layout-alignment
**Related:** Previous pebble/metallic badge styling work in `styles.ts`

---

## 1) Intent & Assumptions

- **Task brief:** Redesign the AttendeeCard layout to achieve consistent vertical alignment across cards in a carousel, where the same types of information (particularly expertise tags and current focus) appear at the same vertical position regardless of variable content in the header section (title, company, location).

- **Assumptions:**
  - Card width remains fixed at 320px (`w-80`)
  - Cards are displayed in a horizontal carousel context
  - All cards in a carousel should have visual consistency
  - The current "pebble" styling and metallic badge aesthetics remain
  - Mobile touch scrolling must continue to work
  - Card height can be fixed or variable (TBD)

- **Out of scope:**
  - ProfileModal redesign (separate component)
  - Carousel navigation changes
  - Data structure changes to PublicAttendee type
  - Backend/API changes

---

## 2) Pre-reading Log

- `src/app/m33t/[slug]/components/AttendeeCard.tsx`: Current implementation uses flex-column layout with variable header section, divider, tags, and current focus. No fixed heights - each section grows naturally.
- `src/app/m33t/[slug]/components/styles.ts`: Shared style constants including `FLOATING_CARD_CLASS`, `METALLIC_BADGE_CLASS`, `PEBBLE_HIGHLIGHT_STYLE`, text shadow styles
- `src/app/m33t/[slug]/components/AttendeeCarousel.tsx`: Horizontal scroll container with `gap-4`, cards rendered inline with no height constraints
- `src/app/m33t/[slug]/types.ts`: `PublicAttendee` has optional fields: title, company, location, expertise[], currentFocus

---

## 3) Codebase Map

- **Primary components/modules:**
  - `AttendeeCard.tsx`: Main card component (lines 1-115)
  - `styles.ts`: Shared style constants
  - `AttendeeCarousel.tsx`: Container component

- **Shared dependencies:**
  - `@/lib/contact-utils`: `getInitialsFromName()`
  - `@/lib/design-system`: `RSVP_STATUS_COLORS`
  - `lucide-react`: `MapPin` icon

- **Data flow:**
  - PublicAttendee → AttendeeCard props → Rendered fields
  - Optional fields conditionally rendered with `{field && <Element/>}`

- **Feature flags/config:** None

- **Potential blast radius:**
  - AttendeeCard (primary)
  - ProfileModal (may need similar alignment)
  - FullGuestListModal (uses similar card layout)

---

## 4) Root Cause Analysis

**The Problem:**
When two cards are displayed side-by-side, the expertise tags and current focus text appear at different vertical positions.

**Evidence from screenshot (`mobile-screenshots/Screenshot 2026-01-24 at 1.07.56 PM.png`):**

| Element | Emily Card (Left) | Ikechi Card (Right) |
|---------|-------------------|---------------------|
| Title | Founder & Investor | Property Manager |
| Company | (missing) | Real Estate |
| Location | (missing) | Atlanta, GA US |
| **Tag Y-position** | ~200px | ~280px |

**Root Cause:** The header section has no fixed height. When company and location are missing, the divider and tags move up. When they're present, everything below shifts down.

**Current Layout Structure (problematic):**
```
┌─────────────────────┐
│ Avatar + Status     │ ← Variable padding
│ Name               │
│ Title (optional)   │
│ Company (optional) │ ← Missing = space collapses
│ Location (optional)│ ← Missing = space collapses
├─────────────────────┤
│ Tags               │ ← Position varies!
│ Current Focus      │ ← Position varies!
└─────────────────────┘
```

---

## 5) Research Findings

### Potential Solution 1: Fixed-Height Header + Stretchy Middle

**Approach:** Set a fixed height on the header section that accommodates all possible content combinations. Use `flex-1` on a middle "info zone" to create consistent tag positioning.

**Layout:**
```
┌────────────────────────┐
│ HEADER ZONE (fixed)    │ 88-100px fixed
│ Avatar, Name, Meta     │ Overflow: truncate
├────────────────────────┤
│ CONTENT ZONE (flex-1)  │ Stretchy middle
│ Tags (flex-wrap)       │
├────────────────────────┤
│ FOOTER ZONE (fixed)    │ Fixed height
│ Current Focus          │
└────────────────────────┘
```

**Pros:**
- Tags always at same Y position
- Current focus always at bottom
- Clean separation of concerns
- Works with variable content

**Cons:**
- Fixed header height may waste space for sparse profiles
- Requires careful measurement to fit all content
- Truncation needed for long titles/companies

**CSS Pattern:**
```css
.card { display: flex; flex-direction: column; height: 280px; }
.header { min-height: 100px; max-height: 100px; }
.content { flex: 1; align-content: flex-start; }
.footer { min-height: 72px; }
```

---

### Potential Solution 2: CSS Grid with Fixed Row Template

**Approach:** Use CSS Grid with explicit row sizes to lock content into specific vertical slots.

**Layout:**
```css
.card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 280px;
}
```

**Pros:**
- Very precise control over row heights
- Native browser layout engine handles distribution
- Can use `minmax()` for flexibility

**Cons:**
- Slightly more complex than flexbox
- May need nested flex for header internals
- Grid gap handling differs from flexbox

---

### Potential Solution 3: Absolute Positioning for Footer

**Approach:** Keep the natural flow for header/tags but absolutely position the current focus at the bottom.

**Layout:**
```css
.card { position: relative; min-height: 280px; padding-bottom: 72px; }
.current-focus { position: absolute; bottom: 20px; left: 20px; right: 20px; }
```

**Pros:**
- Minimal changes to existing layout
- Current focus always at bottom
- Header flows naturally

**Cons:**
- Tags still at variable Y position
- Potential overlap if tags extend too far
- Breaks natural document flow

---

### Potential Solution 4: Fixed Total Card Height + Internal Flex

**Approach:** Set a fixed card height and let internal flex layout distribute space.

**Recommended implementation:**
```tsx
// Card container
<div className="w-80 h-[280px] flex flex-col p-5 ...">
  {/* Fixed header zone */}
  <div className="min-h-[88px] max-h-[88px] overflow-hidden">
    <Avatar />
    <Name />
    <Title className="truncate" />
    <Company className="truncate" />
    <Location className="truncate" />
  </div>

  {/* Divider */}
  <div className="border-t my-2.5" />

  {/* Stretchy content zone - tags stay at top */}
  <div className="flex-1 flex flex-col">
    <div className="flex flex-wrap gap-1.5">
      {tags.map(...)}
    </div>
  </div>

  {/* Fixed footer - current focus */}
  <div className="min-h-[56px] pt-2">
    <p className="line-clamp-2 text-amber-500/80 italic">
      {currentFocus}
    </p>
  </div>
</div>
```

**Pros:**
- Consistent card heights across carousel
- Tags always at same Y (~108px from top)
- Current focus always at bottom
- Works with our existing pebble/badge styling
- Simple to implement

**Cons:**
- Fixed height may feel restrictive
- Long content truncates (but arguably better UX)
- Need to tune exact heights through testing

---

### Potential Solution 5: "Current Focus" as Floating Badge/Tooltip

**Approach:** Remove current focus from the card entirely and show it on hover/tap as a floating element or badge.

**Pros:**
- Cleaner card layout
- More content visible on tap
- Could use our metallic badge styling

**Cons:**
- Hides important information by default
- Extra interaction required
- May confuse users

---

### Recommendation

**Solution 4 (Fixed Card Height + Internal Flex)** is the best approach because:

1. **Achieves the core goal:** Consistent vertical alignment across all cards
2. **Minimal refactoring:** Works with existing styling (`FLOATING_CARD_CLASS`, etc.)
3. **Battle-tested pattern:** Used by Spotify, LinkedIn, Apple for profile cards
4. **Handles edge cases:** Truncation with `line-clamp-2` for current focus, `truncate` for header fields
5. **Maintains aesthetics:** Pebble depth and metallic badges unaffected

**Specific measurements (starting point for tuning):**
- Total card height: `280px`
- Header zone: `88px` (avatar 56px + 16px name + 16px for 1-2 meta lines)
- Content zone: `flex-1` (~64-80px depending on focus)
- Footer zone: `56px` (2 lines of current focus at 14px + padding)

---

## 6) Clarification Questions

1. **Card height uniformity:** Should all cards be the exact same height (280px), or is it acceptable for cards with current focus to be taller than those without?
>> growing a bit is good on hover / current focus. but other than that yes, all cards should be uniform

2. **Truncation behavior for header fields:**
   - Title: Single line with ellipsis?
   - Company: Single line with ellipsis?
   - Location: Single line with ellipsis?
   >> ya all that sounds fine

3. **Current focus display:**
   - Keep as italic amber text at bottom?
   - Alternative: Move to a subtle "speech bubble" or callout style?
   - If missing: Show empty space or collapse footer?
   >> alternative. not speech bubble, that's tacky. but some sort of tasteful callout style for sure. and if missing, show empty space. It will help organizers ensure that those things get filled out

4. **Tag overflow:** When there are many tags (currently limited to 3 + "+N"):
   - Keep the 3-tag limit?
   - Allow 2 rows with overflow scroll?
   - Dynamic based on available space?
   >> 2 rows and then "+N" — I dont want any scrolling within the tile itself

5. **Cards without any content below header:** If a card has no expertise tags AND no current focus, should:
   - Card height remain fixed (empty space)?
   - Card height collapse (but then misaligns)?
   - Show placeholder text ("Learn more about Emily")?
   >> remain fixed. same principle as the second half of my answer to #3

---

## Visual Mockup (ASCII)

### Before (Current - Variable Heights)
```
┌──────────┐  ┌──────────┐
│ Avatar   │  │ Avatar   │
│ Name     │  │ Name     │
│ Title    │  │ Title    │
│          │  │ Company  │
│          │  │ Location │
├──────────┤  ├──────────┤
│ Tags     │  │          │
│          │  │ Tags     │
│ Focus    │  │          │
└──────────┘  │ Focus    │
              └──────────┘
   ↑ Tags at different Y positions!
```

### After (Fixed Height - Aligned)
```
┌──────────┐  ┌──────────┐
│ Avatar   │  │ Avatar   │
│ Name     │  │ Name     │
│ Title    │  │ Title    │
│          │  │ Company  │  ← Empty space absorbed
│ -------- │  │ Location │
├──────────┤  ├──────────┤  ← Divider at same Y
│ Tags     │  │ Tags     │  ← Tags at same Y!
│          │  │          │
│ Focus    │  │ Focus    │  ← Focus at same Y!
└──────────┘  └──────────┘
   ↑ Consistent alignment
```

---

## Next Steps

1. User to answer clarification questions above
2. Create spec document with finalized requirements
3. Implement Solution 4 with tuned measurements
4. Test with real attendee data across various content combinations
5. Fine-tune heights based on visual testing
