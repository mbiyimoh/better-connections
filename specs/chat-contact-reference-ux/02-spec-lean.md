# Chat Contact Reference UX Enhancement

**Status:** Draft
**Authors:** Claude Code
**Date:** 2024-12-29
**Ideation:** `specs/chat-contact-reference-ux/01-ideation.md`

---

## Overview

Transform ugly `[CONTACT: hash]` references in chat messages into interactive gold-themed contact pills, and fix the bug where the contact panel doesn't update when users refine their query.

## Problem Statement

Two issues degrade the explore page experience:

1. **Ugly contact references:** AI responses display raw technical strings like `[CONTACT: cm5jk...abc] John Smith - reason` instead of polished UI elements
2. **Panel sync bug:** When users ask follow-up questions, the contact panel sometimes doesn't update with new AI suggestions due to a stale closure capturing an empty contacts array

## Goals

- Replace `[CONTACT: id] Name - reason` with interactive gold-themed contact chips
- Chip shows name only; reason displays as trailing text
- Clicking a chip scrolls to and highlights the contact in the panel
- Hovering a chip highlights the corresponding panel card (and vice versa)
- Fix stale closure bug so panel always reflects latest AI suggestions

## Non-Goals

- Changes to AI prompt or response format (keep `[CONTACT: id]` in API layer)
- New API endpoints
- Hover preview popovers (Notion-style)
- Full keyboard navigation for chips
- Redesigning explore page layout
- Contact inline editing from chat

---

## Technical Approach

### Files to Change/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/chat/ContactChip.tsx` | Create | Inline pill component |
| `src/components/chat/MessageContent.tsx` | Create | Parses content, renders chips + text |
| `src/components/chat/ChatMessage.tsx` | Modify | Use MessageContent instead of raw string |
| `src/components/chat/ContactCard.tsx` | Modify | Add `isHighlighted` prop |
| `src/app/(dashboard)/explore/page.tsx` | Modify | Add hover state, fix stale closure |

### Integration Points

- **Parsing:** Reuse existing regex from `chat-parser.ts`
- **Animation:** Framer Motion (already a dependency)
- **Styling:** Tailwind with brand colors from design system

---

## Implementation Details

### 1. ContactChip Component

```tsx
// src/components/chat/ContactChip.tsx
interface ContactChipProps {
  contactId: string;
  name: string;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function ContactChip({ contactId, name, onHover, onClick }: ContactChipProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <motion.button
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "bg-[#C9A227]/15 border border-[#C9A227]/30",
        "text-[#C9A227] text-sm font-medium",
        "hover:bg-[#C9A227]/25 hover:border-[#C9A227]/50",
        "transition-colors cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50"
      )}
      onMouseEnter={() => onHover(contactId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(contactId)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      aria-label={`View contact: ${name}`}
    >
      <span className="w-4 h-4 rounded-full bg-[#C9A227]/30 text-[10px] flex items-center justify-center font-semibold">
        {initials}
      </span>
      <span>{name}</span>
    </motion.button>
  );
}
```

### 2. MessageContent Parser

```tsx
// src/components/chat/MessageContent.tsx
const CONTACT_PATTERN = /\[CONTACT:\s*([a-zA-Z0-9-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g;

interface MessageContentProps {
  content: string;
  onContactHover: (id: string | null) => void;
  onContactClick: (id: string) => void;
}

export function MessageContent({ content, onContactHover, onContactClick }: MessageContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  CONTACT_PATTERN.lastIndex = 0;

  while ((match = CONTACT_PATTERN.exec(content)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>);
    }

    // Contact chip + reason text
    const [, contactId, name, reason] = match;
    parts.push(
      <ContactChip
        key={`chip-${match.index}`}
        contactId={contactId.trim()}
        name={name.trim()}
        onHover={onContactHover}
        onClick={onContactClick}
      />
    );
    parts.push(<span key={`reason-${match.index}`}> {reason.trim()}</span>);

    lastIndex = CONTACT_PATTERN.lastIndex;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}
```

### 3. ChatMessage Enhancement

```tsx
// src/components/chat/ChatMessage.tsx
interface ChatMessageProps {
  content: string;
  isUser: boolean;
  onContactHover?: (id: string | null) => void;
  onContactClick?: (id: string) => void;
}

export function ChatMessage({ content, isUser, onContactHover, onContactClick }: ChatMessageProps) {
  return (
    <motion.div /* existing animation props */>
      <div className={/* existing classes */}>
        {isUser ? (
          content
        ) : (
          <MessageContent
            content={content}
            onContactHover={onContactHover ?? (() => {})}
            onContactClick={onContactClick ?? (() => {})}
          />
        )}
      </div>
    </motion.div>
  );
}
```

### 4. ContactCard Highlight State

Add to existing ContactCard:

```tsx
interface ContactCardProps {
  // ... existing props
  isHighlighted?: boolean;
}

export function ContactCard({ contact, isHighlighted = false, /* ... */ }: ContactCardProps) {
  return (
    <motion.div
      layout
      animate={{
        boxShadow: isHighlighted
          ? '0 0 0 2px rgba(201, 162, 39, 0.5)'
          : '0 0 0 0px transparent',
        scale: isHighlighted ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* existing content */}
    </motion.div>
  );
}
```

### 5. Explore Page State Management

```tsx
// src/app/(dashboard)/explore/page.tsx

// Add state for hover synchronization
const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);

// Fix stale closure with ref
const contactsRef = useRef<Contact[]>([]);
useEffect(() => {
  contactsRef.current = contacts;
}, [contacts]);

// In handleChatSubmit, use ref instead of state
const contact = contactsRef.current.find((c) => c.id === suggestion.contactId);

// Scroll-to-contact handler
const handleContactClick = (contactId: string) => {
  const element = document.getElementById(`contact-card-${contactId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredContactId(contactId);
    // Clear highlight after 2 seconds
    setTimeout(() => setHoveredContactId(null), 2000);
  }
};

// Pass to ChatMessage
<ChatMessage
  content={message.content}
  isUser={message.role === "user"}
  onContactHover={setHoveredContactId}
  onContactClick={handleContactClick}
/>

// Pass to ContactCard (add id for scroll target)
<ContactCard
  key={contact.id}
  contact={contact}
  isHighlighted={contact.id === hoveredContactId}
  // Add id attribute for scroll targeting
/>
```

---

## Testing Approach

### Key Scenarios to Verify

1. **Chip rendering:**
   - AI response with `[CONTACT: xyz] John Smith - reason` displays gold chip + trailing text
   - Multiple contacts in one message render correctly
   - Text before/between/after contacts renders normally

2. **Hover synchronization:**
   - Hovering chip highlights corresponding panel card
   - Mouse leave removes highlight

3. **Click scroll behavior:**
   - Clicking chip scrolls panel to card and highlights it
   - Highlight clears after ~2 seconds

4. **Panel update bug fix:**
   - Ask initial query, panel updates
   - Ask follow-up, panel updates with new suggestions
   - Verify this works even when typing quickly

### Manual QA

- Test with real chat interactions using varied queries
- Verify animation smoothness on scroll
- Check chip appearance in different message lengths

---

## User Experience

### Visual Design

| Element | Value |
|---------|-------|
| Chip background | `#C9A227` at 15% opacity |
| Chip border | `#C9A227` at 30% opacity |
| Chip text | `#C9A227` (gold) |
| Avatar | 16x16 circle, initials, 30% gold bg |
| Hover | bg 25%, border 50%, scale 1.02 |
| Panel highlight | 2px gold glow, 1.02x scale |
| Animation | Spring (stiffness: 300, damping: 25) |

### Interaction Flow

```
User asks question
    ↓
AI streams response with [CONTACT:...] tags
    ↓
MessageContent parses and renders chips inline
    ↓
User hovers chip → Panel card glows gold
    ↓
User clicks chip → Panel scrolls to card + highlight
    ↓
Highlight fades after 2s
```

---

## Open Questions

1. Should bidirectional hover work? (Hover card in panel highlights chip in chat)
   - **Recommendation:** Not for V1 - adds complexity, unclear value

---

## Future Improvements and Enhancements

**Out of scope for initial implementation:**

- **Hover preview popovers:** Notion-style mini-card on chip hover with contact details
- **Bidirectional highlight:** Hovering panel card highlights chat chip
- **Keyboard navigation:** Tab through chips, Enter to activate
- **Chip in user messages:** Show chips when user types @mentions
- **Persistent highlights:** Multiple contacts stay highlighted until dismissed
- **Alternative click behavior:** Option to open contact detail page instead of scroll
- **Chip animation on appear:** Subtle fade-in as streaming reveals contacts

---

## References

- Ideation document: `specs/chat-contact-reference-ux/01-ideation.md`
- Design system: `CLAUDE.md` (33 Strategies brand colors)
- Existing parser: `src/lib/chat-parser.ts`
- Baymard synchronized hover patterns: https://baymard.com/blog/list-items-hover-and-hit-area
