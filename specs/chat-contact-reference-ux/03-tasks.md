# Task Breakdown: Chat Contact Reference UX Enhancement

**Generated:** 2024-12-29
**Source:** specs/chat-contact-reference-ux/02-spec-lean.md
**Feature Slug:** chat-contact-reference-ux
**Last Decompose:** 2024-12-29

---

## Overview

Transform `[CONTACT: hash]` references in chat into interactive gold-themed contact pills with hover synchronization to the contact panel, and fix the stale closure bug preventing panel updates.

## Phase Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 2 tasks | Foundation - New components |
| Phase 2 | 3 tasks | Integration - Wire up state & behavior |
| **Total** | **5 tasks** | |

## Execution Strategy

```
Phase 1 (Parallel):
  Task 1.1: ContactChip component ──┐
  Task 1.2: MessageContent parser ──┴── (can run in parallel)

Phase 2 (Sequential):
  Task 2.1: ChatMessage enhancement (depends on 1.1, 1.2)
      ↓
  Task 2.2: ContactCard highlight + Explore page state (depends on 2.1)
      ↓
  Task 2.3: Bug fix - stale closure (depends on 2.2)
```

---

## Phase 1: Foundation Components

### Task 1.1: Create ContactChip Component

**Description:** Create the inline gold-themed pill component for contact mentions
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

**File to create:** `src/components/chat/ContactChip.tsx`

**Technical Requirements:**
- Gold-themed pill matching 33 Strategies brand (`#C9A227`)
- 16x16 avatar circle with contact initials
- Hover/tap animations with Framer Motion
- Callbacks for hover and click events
- Accessible with proper ARIA attributes

**Complete Implementation:**

```tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContactChipProps {
  contactId: string;
  name: string;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function ContactChip({ contactId, name, onHover, onClick }: ContactChipProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

**Acceptance Criteria:**
- [ ] Component renders gold pill with initials avatar
- [ ] Hover triggers scale animation and onHover callback
- [ ] Click triggers onClick callback
- [ ] Focus ring visible for keyboard navigation
- [ ] ARIA label set for screen readers

---

### Task 1.2: Create MessageContent Parser Component

**Description:** Create component that parses message content and renders ContactChips inline with text
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1 (ContactChip)
**Can run parallel with:** Task 1.1 (can be developed together)

**File to create:** `src/components/chat/MessageContent.tsx`

**Technical Requirements:**
- Parse `[CONTACT: id] Name - reason` pattern from message content
- Render ContactChip for name, trailing text for reason
- Handle multiple contacts in one message
- Preserve text before/between/after contacts
- Reset regex state to avoid stale matches

**Complete Implementation:**

```tsx
"use client";

import { ContactChip } from "./ContactChip";

const CONTACT_PATTERN = /\[CONTACT:\s*([a-zA-Z0-9-]+)\]\s*([^-\n]+)\s*-\s*([^\n\[]+)/g;

interface MessageContentProps {
  content: string;
  onContactHover: (id: string | null) => void;
  onContactClick: (id: string) => void;
}

export function MessageContent({
  content,
  onContactHover,
  onContactClick,
}: MessageContentProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex state for fresh matching
  CONTACT_PATTERN.lastIndex = 0;

  while ((match = CONTACT_PATTERN.exec(content)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Extract groups: [full, contactId, name, reason]
    const [, contactId, name, reason] = match;

    // Contact chip
    parts.push(
      <ContactChip
        key={`chip-${match.index}`}
        contactId={contactId.trim()}
        name={name.trim()}
        onHover={onContactHover}
        onClick={onContactClick}
      />
    );

    // Reason text (trailing)
    parts.push(
      <span key={`reason-${match.index}`}> {reason.trim()}</span>
    );

    lastIndex = CONTACT_PATTERN.lastIndex;
  }

  // Remaining text after last match
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}
```

**Acceptance Criteria:**
- [ ] Parses single `[CONTACT: id] Name - reason` correctly
- [ ] Parses multiple contacts in one message
- [ ] Text before/between/after contacts renders normally
- [ ] ContactChip receives correct props (id, name)
- [ ] Reason text follows chip as regular text
- [ ] Empty/no-match content renders as plain text

---

## Phase 2: Integration & Bug Fix

### Task 2.1: Enhance ChatMessage Component

**Description:** Update ChatMessage to use MessageContent for assistant messages instead of raw content
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2

**File to modify:** `src/components/chat/ChatMessage.tsx`

**Current Code (for reference):**
```tsx
export function ChatMessage({ content, isUser }: ChatMessageProps) {
  return (
    <motion.div ...>
      <div className={...}>
        {content}  // Raw string - THIS IS THE PROBLEM
      </div>
    </motion.div>
  );
}
```

**Updated Implementation:**

```tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  onContactHover?: (id: string | null) => void;
  onContactClick?: (id: string) => void;
}

export function ChatMessage({
  content,
  isUser,
  onContactHover,
  onContactClick,
}: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 whitespace-pre-wrap text-sm leading-relaxed",
          isUser
            ? "bg-[#C9A227] text-black rounded-[16px_16px_4px_16px]"
            : "bg-white/10 text-white rounded-[16px_16px_16px_4px]"
        )}
      >
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

**Acceptance Criteria:**
- [ ] User messages render as plain text (no parsing)
- [ ] Assistant messages use MessageContent component
- [ ] Optional callbacks default to no-op functions
- [ ] Existing styling preserved
- [ ] Animation preserved

---

### Task 2.2: Add ContactCard Highlight + Explore Page State

**Description:** Add isHighlighted prop to ContactCard and wire up hover/click state in explore page
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1

**Files to modify:**
1. `src/components/chat/ContactCard.tsx` - Add highlight state
2. `src/app/(dashboard)/explore/page.tsx` - Add state management

**ContactCard Changes:**

Add to interface:
```tsx
interface ContactCardProps {
  contact: Contact;
  dynamicWhyNow?: string;
  isPinned?: boolean;
  isHighlighted?: boolean;  // NEW
  onPin?: (contactId: string) => void;
  onDraftIntro?: (contact: Contact) => void;
  onViewContact?: (contactId: string) => void;
}
```

Update component (around line 110):
```tsx
export function ContactCard({
  contact,
  dynamicWhyNow,
  isPinned = false,
  isHighlighted = false,  // NEW
  onPin,
  onDraftIntro,
  onViewContact,
}: ContactCardProps) {
```

Update the motion.div (around line 124):
```tsx
<motion.div
  layout
  id={`contact-card-${contact.id}`}  // NEW - for scroll targeting
  animate={{
    boxShadow: isHighlighted
      ? "0 0 0 2px rgba(201, 162, 39, 0.5)"
      : "0 0 0 0px transparent",
    scale: isHighlighted ? 1.02 : 1,
  }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
>
```

**Explore Page Changes (src/app/(dashboard)/explore/page.tsx):**

Add state (after existing useState declarations around line 52):
```tsx
const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

Add click handler (before return statement):
```tsx
const handleContactClick = (contactId: string) => {
  // Clear any existing timeout
  if (highlightTimeoutRef.current) {
    clearTimeout(highlightTimeoutRef.current);
  }

  const element = document.getElementById(`contact-card-${contactId}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHoveredContactId(contactId);

    // Clear highlight after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHoveredContactId(null);
    }, 2000);
  }
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
  };
}, []);
```

Update ChatMessage usage (around line 284-289):
```tsx
<ChatMessage
  key={message.id}
  content={message.content}
  isUser={message.role === "user"}
  onContactHover={setHoveredContactId}
  onContactClick={handleContactClick}
/>
```

Update ContactCard usage (around line 355-364):
```tsx
<ContactCard
  key={contact.id}
  contact={contact}
  dynamicWhyNow={getDynamicWhyNow(contact.id)}
  isPinned={pinnedIds.has(contact.id)}
  isHighlighted={contact.id === hoveredContactId}
  onPin={handlePin}
  onDraftIntro={handleDraftIntro}
  onViewContact={handleViewContact}
/>
```

**Acceptance Criteria:**
- [ ] ContactCard has gold glow when isHighlighted=true
- [ ] ContactCard scales to 1.02x when highlighted
- [ ] Hovering chip in chat highlights card in panel
- [ ] Mouse leave removes highlight
- [ ] Clicking chip scrolls to card and highlights it
- [ ] Highlight clears after 2 seconds
- [ ] Timeout cleaned up on component unmount

---

### Task 2.3: Fix Stale Closure Bug

**Description:** Fix the bug where contact panel doesn't update because handleChatSubmit captures stale contacts array
**Size:** Small
**Priority:** High
**Dependencies:** Task 2.2

**File to modify:** `src/app/(dashboard)/explore/page.tsx`

**Root Cause:**
The `handleChatSubmit` function captures `contacts` in its closure when created. If contacts loads after the function is defined, or changes later, the `find()` operation uses stale data.

**Fix Implementation:**

Add ref after existing state declarations (around line 52):
```tsx
const contactsRef = useRef<Contact[]>([]);
```

Keep ref in sync with state (after fetchContacts useEffect):
```tsx
useEffect(() => {
  contactsRef.current = contacts;
}, [contacts]);
```

Update handleChatSubmit to use ref instead of state (around line 119):
```tsx
// BEFORE (stale closure):
const contact = contacts.find((c) => c.id === suggestion.contactId);

// AFTER (always current):
const contact = contactsRef.current.find((c) => c.id === suggestion.contactId);
```

**Acceptance Criteria:**
- [ ] Panel updates on first query
- [ ] Panel updates on follow-up queries
- [ ] Panel updates even when typing quickly
- [ ] No stale data shown in panel
- [ ] Console shows no warnings about missing contacts

---

## Dependency Graph

```
Task 1.1 (ContactChip) ─────────────┐
                                    ├──→ Task 2.1 (ChatMessage) ──→ Task 2.2 (State) ──→ Task 2.3 (Bug fix)
Task 1.2 (MessageContent) ──────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regex edge cases | Low | Medium | Reuses proven chat-parser.ts pattern |
| Animation jank | Low | Low | Framer Motion spring physics proven |
| Streaming content issues | Medium | Medium | Test with long AI responses |

## Testing Checklist

After implementation, verify:

1. **Visual:**
   - [ ] Gold chips render inline with text
   - [ ] Initials show correctly in chip avatar
   - [ ] Panel card glows gold when highlighted
   - [ ] Animations are smooth

2. **Interaction:**
   - [ ] Hover chip → card highlights
   - [ ] Leave chip → card unhighlights
   - [ ] Click chip → panel scrolls to card
   - [ ] Click chip → card highlights for 2s

3. **Bug fix:**
   - [ ] First query updates panel
   - [ ] Follow-up query updates panel
   - [ ] Rapid queries work correctly

4. **Edge cases:**
   - [ ] Message with no contacts renders normally
   - [ ] Message with 3+ contacts works
   - [ ] Very long reason text wraps correctly
