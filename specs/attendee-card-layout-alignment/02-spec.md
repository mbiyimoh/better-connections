# AttendeeCard Layout Alignment & Current Focus Redesign - Specification

**Slug:** attendee-card-layout-alignment
**Author:** Claude Code
**Date:** 2026-01-24
**Status:** Ready for Implementation
**Related:** `01-ideation.md`, `src/app/m33t/[slug]/components/AttendeeCard.tsx`

---

## Overview

Redesign the AttendeeCard component to achieve consistent vertical alignment across cards in carousels. All cards will have uniform fixed height with content zones that ensure expertise tags and current focus always appear at the same vertical position, regardless of variable header content.

---

## Requirements

### R1: Fixed Card Height with Uniform Layout

**Description:** All AttendeeCards must have the same base height to ensure visual alignment in carousel views.

**Acceptance Criteria:**
- [ ] Card height is fixed at 280px (adjustable via testing)
- [ ] Cards with sparse content (missing company, location) maintain same height as full cards
- [ ] Cards with no expertise tags AND no current focus still maintain fixed height (empty space preserved)
- [ ] Hover state may grow card height slightly (existing `hover:translate-y-[-3px]` behavior)

### R2: Three-Zone Layout Structure

**Description:** Cards use a flex-column layout with three distinct zones.

**Layout Structure:**
```
┌─────────────────────────────┐
│ HEADER ZONE (fixed ~100px)  │
│ ├─ Avatar + Status dot      │
│ ├─ Name (truncate)          │
│ ├─ Title (truncate)         │
│ ├─ Company (truncate)       │
│ └─ Location (truncate)      │
├─────────────────────────────┤
│ CONTENT ZONE (flex-1)       │
│ ├─ Divider                  │
│ └─ Tags (2 rows max + "+N") │
├─────────────────────────────┤
│ FOOTER ZONE (fixed ~72px)   │
│ └─ Current Focus Callout    │
└─────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Header zone has fixed height accommodating avatar + 4 lines of text
- [ ] Content zone uses `flex-1` to absorb variable space
- [ ] Footer zone has fixed height for current focus callout
- [ ] Divider appears at consistent Y position across all cards

### R3: Header Field Truncation

**Description:** All header text fields truncate to single line with ellipsis.

**Acceptance Criteria:**
- [ ] Name: Single line, truncate with ellipsis
- [ ] Title: Single line, truncate with ellipsis
- [ ] Company: Single line, truncate with ellipsis
- [ ] Location: Single line, truncate with ellipsis (with MapPin icon)

### R4: Two-Row Tag Display with Overflow Count

**Description:** Expertise tags display in up to 2 rows, with remaining count shown as "+N".

**Acceptance Criteria:**
- [ ] Tags wrap naturally up to 2 rows maximum
- [ ] Tag container has `max-h-[68px]` (approximately 2 rows of tags with gap)
- [ ] Tags beyond 2 rows are hidden with "+N" indicator
- [ ] No scrolling within the tag area
- [ ] Existing metallic badge styling preserved

**Implementation Note:** Calculate visible tag count dynamically or use CSS `line-clamp` equivalent for flex containers. May need to measure and limit programmatically.

### R5: Current Focus Callout Styling

**Description:** Replace italic amber text with a tasteful callout design that maintains premium aesthetic.

**Design Options (choose during implementation):**

**Option A: Subtle Inset Panel**
```
┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Darker inset background
│ ░ "Right now, Ikechi is..." │  ← Amber text, 2-line clamp
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────┘
```
- Inset shadow effect (opposite of card's outset)
- Slightly darker background than card
- Rounded corners (8px)
- Amber text color preserved

**Option B: Left Border Accent**
```
│▌ "Right now, Ikechi is building    │
│▌  businesses using AI..."          │
```
- 3px amber/gold left border
- Subtle background tint
- Clean, minimal callout style

**Option C: Quote-Style with Subtle Quotation Mark**
```
│  ❝                                  │
│  Right now, Ikechi is building     │
│  businesses using AI...            │
```
- Small decorative quotation mark (gold, low opacity)
- No background change
- Elegant, editorial feel

**Acceptance Criteria:**
- [ ] Current focus has distinct visual treatment (not just italic text)
- [ ] Styling complements existing pebble/metallic aesthetic
- [ ] 2-line maximum with `line-clamp-2`
- [ ] Empty state: Space preserved but no placeholder text
- [ ] Amber/gold color scheme maintained

### R6: Consistent Spacing

**Description:** Standardized spacing throughout card.

**Acceptance Criteria:**
- [ ] Card padding: 20px (`p-5`)
- [ ] Gap between header and content zone: 10px (`my-2.5` on divider)
- [ ] Gap between tags and footer: handled by flex layout
- [ ] Tag gap: 6px (`gap-1.5`)

---

## Technical Implementation

### File Changes

**Primary:** `src/app/m33t/[slug]/components/AttendeeCard.tsx`

```tsx
// Proposed structure
<div className="w-80 h-[280px] flex flex-col p-5 rounded-2xl ... ${FLOATING_CARD_CLASS}">
  {/* Pebble highlight overlay */}
  <div style={PEBBLE_HIGHLIGHT_STYLE} />

  {/* HEADER ZONE - Fixed height */}
  <div className="min-h-[88px] max-h-[88px]">
    {/* Avatar with status */}
    <div className="relative mb-3">...</div>

    {/* Name - truncate */}
    <p className="truncate ...">{name}</p>

    {/* Title - truncate */}
    {title && <p className="truncate ...">{title}</p>}

    {/* Company - truncate */}
    {company && <p className="truncate ...">{company}</p>}

    {/* Location - truncate */}
    {location && <p className="truncate ...">{location}</p>}
  </div>

  {/* CONTENT ZONE - Flexible */}
  <div className="flex-1 flex flex-col">
    {/* Divider */}
    <div className="border-t border-white/[0.06] my-2.5" />

    {/* Tags - 2 rows max */}
    <div className="flex flex-wrap gap-1.5 max-h-[68px] overflow-hidden">
      {visibleTags.map(...)}
      {hiddenCount > 0 && <span>+{hiddenCount}</span>}
    </div>
  </div>

  {/* FOOTER ZONE - Fixed height */}
  <div className="min-h-[56px] mt-auto">
    {currentFocus && (
      <CurrentFocusCallout text={currentFocus} />
    )}
  </div>
</div>
```

**Secondary:** `src/app/m33t/[slug]/components/styles.ts`

Add new style constants:
```tsx
// Current focus callout styling (Option A - Inset Panel)
export const CURRENT_FOCUS_CALLOUT_CLASS = `
  bg-black/20
  rounded-lg
  px-3 py-2
  [box-shadow:inset_0_1px_3px_rgba(0,0,0,0.3)]
`.replace(/\n\s*/g, ' ').trim();

export const CURRENT_FOCUS_TEXT_STYLE: React.CSSProperties = {
  color: 'rgba(245, 158, 11, 0.85)', // amber-500 with slight transparency
  fontStyle: 'italic',
  fontSize: '12px',
  lineHeight: '1.4',
};
```

### Tag Row Calculation

To limit tags to 2 rows without scrolling:

```tsx
// Simple approach: Estimate ~6 tags fit in 2 rows at current sizing
const MAX_VISIBLE_TAGS = 6;
const visibleTags = expertise?.slice(0, MAX_VISIBLE_TAGS) || [];
const hiddenCount = (expertise?.length || 0) - visibleTags.length;

// Better approach: Use ResizeObserver to measure actual overflow
// (implement if simple approach doesn't work well)
```

---

## Testing Checklist

### Visual Testing
- [ ] Two cards side-by-side: tags at same Y position
- [ ] Card with all fields vs card with minimal fields: same height
- [ ] Card with 1 tag vs card with 8 tags: consistent layout
- [ ] Card with long current focus text: properly truncated
- [ ] Card with no current focus: empty footer space preserved
- [ ] Hover state: slight lift without breaking alignment

### Content Variations to Test
1. Full profile (all fields populated)
2. Minimal profile (name only)
3. No expertise tags
4. Many expertise tags (8+)
5. Very long current focus text
6. No current focus
7. Long name/title/company/location strings

### Responsive Testing
- [ ] Carousel scroll behavior unchanged
- [ ] Touch scrolling on mobile works
- [ ] Cards don't clip on hover (existing fix preserved)

---

## Out of Scope

- ProfileModal layout changes (future task)
- FullGuestListModal layout changes (future task)
- Data structure changes
- Backend/API changes

---

## Estimated Effort

- Implementation: ~2 hours
- Visual tuning: ~1 hour
- Testing across content variations: ~30 minutes

---

## Success Metrics

1. **Visual alignment:** Side-by-side cards have tags at identical Y position
2. **Consistent height:** All cards 280px regardless of content
3. **Premium feel:** Current focus callout enhances rather than detracts from pebble aesthetic
4. **No regressions:** Hover effects, carousel scrolling, and metallic badges work as before
