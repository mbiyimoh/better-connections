# Chat Contact Reference UX Enhancement

**Slug:** chat-contact-reference-ux
**Author:** Claude Code
**Date:** 2024-12-29
**Branch:** preflight/chat-contact-reference-ux
**Related:** `/src/app/(dashboard)/explore/page.tsx`, `/src/components/chat/ChatMessage.tsx`

---

## 1) Intent & Assumptions

**Task brief:** Transform the technical `[CONTACT: cuid123] Name - reason` references in chat messages into elegant, interactive contact pills/chips with visual synchronization to the contact viewer panel. Additionally, fix the bug where the contact panel doesn't update when users refine their query and receive new AI suggestions.

**Assumptions:**
- The current chat-parser.ts regex correctly extracts contact references
- Contact IDs in AI responses match the actual contact IDs in the database
- Users want to quickly identify and interact with mentioned contacts
- Visual connection between chat mentions and panel cards improves discoverability
- The streaming response pattern will continue (pills should appear as content streams in)

**Out of scope:**
- Changes to the AI prompt or response format (keep `[CONTACT: id]` format in API)
- New API endpoints
- Redesigning the entire explore page layout
- Adding new contact fields or data models
- Inline editing of contacts from chat

---

## 2) Pre-reading Log

| File | Takeaway |
|------|----------|
| `src/app/(dashboard)/explore/page.tsx` | Two-panel layout (45% chat / 55% contacts). State: `suggestedContacts` array updates after parsing. Bug: potential stale closure on `contacts` in async handler. |
| `src/components/chat/ChatMessage.tsx` | Renders raw `content` with no transformation - this is why `[CONTACT:...]` tags appear. Simple component, easy to enhance. |
| `src/lib/chat-parser.ts` | Has `cleanResponseText()` that converts to bold markdown but isn't used. `parseContactSuggestions()` extracts structured data. Regex: `/\[CONTACT:\s*([a-zA-Z0-9-]+)\]/` |
| `src/components/chat/ContactCard.tsx` | Already accepts `dynamicWhyNow` prop for AI context. Has expand/collapse, pin, draft intro actions. Uses Framer Motion. |
| `CLAUDE.md` | Design system: gold accent `#C9A227`, glassmorphism, Framer Motion animations, Lucide icons. No emojis. |

---

## 3) Codebase Map

**Primary components/modules:**
- `src/app/(dashboard)/explore/page.tsx` - Main orchestrator, state management
- `src/components/chat/ChatMessage.tsx` - Message rendering (needs enhancement)
- `src/components/chat/ContactCard.tsx` - Panel card component
- `src/lib/chat-parser.ts` - Parsing logic (solid, minimal changes needed)

**Shared dependencies:**
- `framer-motion` - Animations throughout
- `lucide-react` - Icons
- `use-debounce` - Search debouncing
- `@/lib/utils` (cn) - Class merging
- `@/types/contact` - Type definitions, `getDisplayName()`

**Data flow:**
```
User query → API stream → ChatMessage (raw) → parseContactSuggestions()
                                                      ↓
                                              setSuggestedContacts()
                                                      ↓
                                              ContactCard panel updates
```

**Feature flags/config:** None

**Potential blast radius:**
- `ChatMessage` component (direct change)
- `explore/page.tsx` (state + new hover sync)
- New `ContactChip` component (new file)
- Possibly `ContactCard` (add highlight state)

---

## 4) Root Cause Analysis

### Issue #1: Ugly contact references in chat

**Observed:** Chat messages display raw `[CONTACT: cm5jk...abc] John Smith - They work in VC` text

**Expected:** Beautiful inline pills/chips like Slack @mentions

**Root cause:** `ChatMessage.tsx:26` renders `{content}` directly with no transformation. The `cleanResponseText()` function exists but:
1. It's not imported or called
2. Even if used, it only converts to markdown (`**Name**`), not interactive components

**Evidence:** `ChatMessage.tsx` line 26: `{content}` - raw string rendering

### Issue #2: Contact panel not updating

**Repro steps:**
1. Ask initial query ("Who knows about fundraising?")
2. Panel updates with suggested contacts
3. Refine query ("Actually, focus on Series A experience")
4. Chat shows new suggestions, but panel may not update

**Observed:** Panel sometimes doesn't reflect new suggestions

**Expected:** Panel updates with each new set of AI suggestions

**Root-cause hypotheses:**
1. **Stale closure (HIGH confidence):** `handleChatSubmit` captures `contacts` at function creation time. If contacts loaded after first render, the `find()` on line 119 uses stale empty array
2. **ID mismatch (MEDIUM):** AI might format IDs differently than stored (whitespace, case)
3. **Silent failure (MEDIUM):** If no matches found, `newSuggested` stays empty, no feedback to user

**Decision:** Hypothesis #1 is most likely. The async handler captures `contacts` in closure. If the handler runs before `contacts` is populated (or if it changed), matches fail silently.

**Fix approach:** Use functional update pattern or ref to access current contacts state.

---

## 5) Research Findings

### Design Pattern Analysis

**Slack @mentions:**
- Pill shape with subtle background tint
- User's theme color applied (8-part color system)
- Hover reveals full name tooltip
- Click opens profile sidebar
- Bold text weight, slightly smaller than body

**Discord @mentions:**
- Blue background highlight (`#5865F2` brand blue)
- Pill/badge with rounded corners
- Hover darkens background
- Tightly coupled to ping/notification system

**Notion entity references:**
- Icon + text inline
- Hover shows preview card (700ms delay - research-backed sweet spot)
- Click navigates to page
- Subtle underline on hover

**Linear linked items:**
- Compact chip with icon prefix
- Hover shows mini-preview
- Click opens in side panel
- Muted colors that don't distract from content

### Recommended Implementation Approach

**Option A: Custom tokenizer with React components (RECOMMENDED)**
```tsx
// Parse content and render mixed text + ContactChip components
function parseAndRenderContent(content: string, onHover: (id: string | null) => void) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[CONTACT:\s*([a-zA-Z0-9-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    // Add ContactChip component
    parts.push(
      <ContactChip
        key={match.index}
        contactId={match[1]}
        name={match[2].trim()}
        reason={match[3].trim()}
        onHover={onHover}
      />
    );
    lastIndex = regex.lastIndex;
  }
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  }
  return parts;
}
```

**Option B: react-markdown with custom remark plugin**
- More complex setup
- Better for full markdown support
- Overkill for this use case

**Option C: html-react-parser**
- Convert to HTML first, then parse
- Adds extra step, no real benefit

### Cross-Panel Synchronization

**Pattern: Lifted state with memoization**
```tsx
// In explore/page.tsx
const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);

// Pass to ChatMessage
<ChatMessage
  content={message.content}
  onContactHover={setHoveredContactId}
/>

// Pass to ContactCard
<ContactCard
  contact={contact}
  isHighlighted={contact.id === hoveredContactId}
/>
```

**Animation approach (Framer Motion):**
```tsx
// ContactCard highlight state
<motion.div
  animate={{
    boxShadow: isHighlighted
      ? '0 0 0 2px rgba(201, 162, 39, 0.5)' // Gold glow
      : '0 0 0 0px transparent',
    scale: isHighlighted ? 1.02 : 1,
  }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
>
```

### ContactChip Design (Brand-aligned)

```tsx
// Inline pill component
<motion.button
  className={cn(
    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
    "bg-[#C9A227]/15 border border-[#C9A227]/30",
    "text-[#C9A227] text-sm font-medium",
    "hover:bg-[#C9A227]/25 hover:border-[#C9A227]/50",
    "transition-colors cursor-pointer"
  )}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  {/* Avatar circle with initials */}
  <span className="w-4 h-4 rounded-full bg-[#C9A227]/30 text-[10px] flex items-center justify-center">
    {initials}
  </span>
  <span>{name}</span>
</motion.button>
```

### Accessibility Requirements

- `role="button"` for clickable chips
- `tabIndex={0}` for keyboard navigation
- `aria-label="View contact: {name}"` for screen readers
- Enter/Space activates chip
- Focus ring visible (gold outline)
- Hover states don't rely solely on color

---

## 6) Design Decisions (Confirmed)

1. **Click behavior for contact chips:**
   - **Decision:** Scroll to & highlight the contact in the panel
   - Keeps user in context, reinforces the two-panel UX

2. **Reason text display:**
   - **Decision:** Chip shows name only, reason text follows as normal text
   - Example: `[ContactChip: John Smith] They have Series A experience at Accel`
   - Clean separation between interactive element and context

3. **Animation intensity:**
   - **Decision:** Moderate (gold border glow + 1.02x scale)
   - Clear visual connection without being jarring
   - No auto-scroll on hover (only on click)

4. **Empty state handling:**
   - **Decision:** Skip silently (current behavior)
   - AI should only reference contacts in the user's database

---

## 7) Proposed Solution Architecture

### New Components
```
src/components/chat/
├── ChatMessage.tsx          # Enhanced with content parsing
├── ContactChip.tsx          # NEW: Inline contact pill
├── MessageContent.tsx       # NEW: Parses and renders mixed content
└── ContactCard.tsx          # Add isHighlighted prop
```

### State Changes (explore/page.tsx)
```tsx
// Add hover synchronization state
const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
const contactsRef = useRef<Contact[]>([]);

// Keep ref in sync
useEffect(() => {
  contactsRef.current = contacts;
}, [contacts]);

// Use ref in handler to avoid stale closure
const contact = contactsRef.current.find((c) => c.id === suggestion.contactId);
```

### Visual Design Summary

| Element | Style |
|---------|-------|
| Chip background | `#C9A227` at 15% opacity |
| Chip border | `#C9A227` at 30% opacity |
| Chip text | `#C9A227` (gold) |
| Chip avatar | 16x16 circle, initials, 30% gold bg |
| Hover state | Background 25%, border 50% |
| Panel highlight | 2px gold glow, 1.02x scale |
| Animation | Spring physics (stiffness: 300, damping: 25) |

---

## 8) Estimated Complexity

| Task | Complexity | Notes |
|------|------------|-------|
| ContactChip component | Low | New component, straightforward |
| MessageContent parser | Medium | Regex + React rendering |
| Hover synchronization | Medium | State lifting, prop threading |
| Panel highlight animation | Low | Framer Motion, already in use |
| Bug fix (stale closure) | Low | Ref pattern |
| Accessibility | Low | Standard ARIA patterns |
| **Total** | **Medium** | ~2-3 focused hours |

---

## Next Steps

1. User clarifies decision points in Section 6
2. Convert this ideation to lean spec (`/spec:create-lean`)
3. Implement with test coverage
4. Visual QA with real chat interactions
