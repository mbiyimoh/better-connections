# Mobile Optimization Implementation Plan

**Last Updated:** 2026-01-09
**Status:** VALIDATED - Ready for implementation

## Overview

This plan addresses five key mobile UX issues in Better Connections:

1. **Contacts not showing on mobile** - Empty state displays even when contacts exist
2. **Redundant bottom navigation** - Remove BottomNav (hamburger menu suffices) - **DONE**
3. **Settings page polish** - Padding, font sizes, spacing issues
4. **Explorer mobile redesign** - Full-screen overlay pattern instead of side-by-side
5. **Smart scroll indicator** - "New content below" instead of auto-scroll

---

## Problem Analysis

### 1. Contacts Not Showing (CRITICAL)
**Root Cause:** The `ContactCardList` component (`src/components/contacts/ContactCardList.tsx:117`) uses:
```tsx
<div className="h-[calc(100vh-180px)]">
```

The magic number `180px` is wrong - it doesn't match actual layout. The `react-window` List component requires explicit pixel height to render, but the parent containers don't provide proper flex sizing.

**Solution:** Use proper flexbox with `min-h-0` pattern (see Phase 1).

### 2. Bottom Nav Redundancy - COMPLETED
~~The hamburger menu in `Sidebar.tsx` provides all navigation on mobile. The `BottomNav` duplicates this.~~

**Status:** BottomNav removed, AppShell updated, FAB repositioned.

### 3. Settings Page Issues
From screenshots IMG_3008.PNG and IMG_3009.PNG:
- Account ID text overflows on small screens
- Cards have inconsistent internal padding
- Button text cramped on "Export" / "Delete" buttons
- Grid doesn't stack on mobile

### 4. Explorer Page (CRITICAL)
Current implementation (`src/app/(dashboard)/explore/page.tsx:358-488`):
```tsx
<div className="flex h-screen">
  <div className="w-[45%] flex flex-col">  // Chat - FIXED 45%
  <div className="flex-1 flex flex-col">   // Contacts - REMAINING 55%
```

On a 375px iPhone SE:
- Chat panel: 169px (unreadable)
- Contacts panel: 206px (unusable)

**Solution:** Full-screen chat + slide-in overlay for contacts on mobile.

### 5. Chat Auto-Scroll
Current behavior always scrolls to bottom, interrupting users reading earlier content.

**Solution:** IntersectionObserver-based "new content below" indicator.

---

## Prerequisites

### 1. Tailwind Safe Area Configuration
**File:** `tailwind.config.ts`

Add complete safe-area utilities:
```ts
// In theme.extend
padding: {
  'safe': 'env(safe-area-inset-bottom)',
  'safe-top': 'env(safe-area-inset-top)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-left': 'env(safe-area-inset-left)',
  'safe-right': 'env(safe-area-inset-right)',
},
```

### 2. Viewport Meta Tag
**File:** `src/app/layout.tsx`

Ensure viewport includes `viewport-fit=cover`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 3. Z-Index Hierarchy
Define consistent z-index values:
- FAB: `z-30` (update from z-40)
- Overlay backdrop: `z-40`
- Overlay panel: `z-50`
- Modals: `z-50`

---

## Implementation Plan

### Phase 1: Fix ContactCardList Height

**Files to modify:**
1. `src/components/contacts/ContactsView.tsx`
2. `src/components/contacts/ContactCardList.tsx`

#### 1.1 Update ContactsView.tsx
Wrap `ContactCardList` in a proper flex container:

```tsx
// ContactsView.tsx - Mobile view return
if (isMobile) {
  return (
    <div className="flex flex-col h-full">
      {/* Search/filter controls if any */}

      {/* Contact list - flex-1 + min-h-0 enables proper flex sizing */}
      <div className="flex-1 min-h-0">
        <ContactCardList
          contacts={contacts}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      <FAB
        icon={<Plus className="h-6 w-6 text-black" />}
        label="Add contact"
        onClick={() => router.push('/contacts/new')}
      />
    </div>
  );
}
```

#### 1.2 Update ContactCardList.tsx
Change height calculation to use full available space:

```tsx
// ContactCardList.tsx - Line 117
// BEFORE
<div className="h-[calc(100vh-180px)]">

// AFTER
<div className="h-full">
```

**Why this works:**
- Parent has `flex-1 min-h-0` which gives it available space
- `h-full` makes the list container fill that space
- `react-window` gets proper dimensions from the parent

---

### Phase 2: Settings Page Polish

**File:** `src/app/(dashboard)/settings/page.tsx`

#### 2.1 Container Padding
```tsx
// Line 167 - BEFORE
<div className="container max-w-3xl py-8">

// AFTER - Mobile-responsive padding
<div className="container max-w-3xl py-6 px-4 md:py-8 md:px-6">
```

#### 2.2 Grid Responsiveness
```tsx
// Line 201 - BEFORE
<div className="grid grid-cols-2 gap-4 text-sm">

// AFTER - Stack on mobile
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
```

#### 2.3 Account ID - Use break-all (not truncate)
Truncating makes the ID uncopyable. Better to wrap on mobile:
```tsx
// Line 210-211 - BEFORE
<p className="text-white font-mono text-xs truncate">
  {user?.id || "—"}
</p>

// AFTER - Wrap on mobile, truncate on desktop
<p className="text-white font-mono text-xs break-all md:truncate">
  {user?.id || "—"}
</p>
```

#### 2.4 Action Row Flex Wrap
```tsx
// Lines 230, 249, 267, 326 - Action rows
// BEFORE
<div className="flex items-center justify-between p-4 rounded-lg bg-white/5">

// AFTER - Stack on mobile with gap
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg bg-white/5">
```

#### 2.5 Button Sizing - Ensure 44px touch targets
```tsx
// All buttons in Settings
// BEFORE
<Button ... className="shrink-0">

// AFTER - Full width on mobile, explicit height
<Button ... className="h-11 shrink-0 w-full md:w-auto">
```

---

### Phase 3: Explorer Mobile Redesign

This is the most significant change. We'll create a mobile overlay pattern.

#### 3.1 Create MobileContactOverlay Component

**File:** `src/components/explore/MobileContactOverlay.tsx`

```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';

interface MobileContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function MobileContactOverlay({
  isOpen,
  onClose,
  children,
  title = 'Contacts',
  subtitle,
}: MobileContactOverlayProps) {
  // Body scroll lock (SSR-safe)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 bg-bg-primary flex flex-col"
            style={{ willChange: 'transform' }}
          >
            {/* Header */}
            <header className="flex items-center gap-3 p-4 border-b border-border shrink-0">
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Back to chat"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-primary shrink-0" />
                  <h2 id="overlay-title" className="font-semibold text-text-primary truncate">
                    {title}
                  </h2>
                </div>
                {subtitle && (
                  <p className="text-sm text-text-secondary truncate">{subtitle}</p>
                )}
              </div>
            </header>

            {/* Content - with iOS scroll momentum */}
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

#### 3.2 Create JumpToBottomIndicator Component

**File:** `src/components/chat/JumpToBottomIndicator.tsx`

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface JumpToBottomIndicatorProps {
  visible: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function JumpToBottomIndicator({
  visible,
  unreadCount = 0,
  onClick,
}: JumpToBottomIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary border border-border shadow-lg"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(212, 165, 74, 0)',
                '0 0 20px 4px rgba(212, 165, 74, 0.3)',
                '0 0 0 0 rgba(212, 165, 74, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4 text-gold-primary" />
            <span className="text-sm text-text-primary">
              {unreadCount > 0 ? `${unreadCount} new` : 'Jump to latest'}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 3.3 Update Explorer Page

**File:** `src/app/(dashboard)/explore/page.tsx`

**New imports:**
```tsx
import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileContactOverlay } from '@/components/explore/MobileContactOverlay';
import { JumpToBottomIndicator } from '@/components/chat/JumpToBottomIndicator';
import { Users } from 'lucide-react';
```

**New state variables (add after existing state):**
```tsx
const isMobile = useIsMobile();
const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);
const [isAtBottom, setIsAtBottom] = useState(true);
const [showJumpIndicator, setShowJumpIndicator] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);
const userJustSentMessage = useRef(false);
const scrollSentinelRef = useRef<HTMLDivElement>(null);
const scrollContainerRef = useRef<HTMLDivElement>(null);
const prevMessagesLength = useRef(0);
```

**Smart scroll tracking (IntersectionObserver) - add after existing useEffects:**
```tsx
// Scroll position tracking with IntersectionObserver
useEffect(() => {
  const sentinel = scrollSentinelRef.current;
  const container = scrollContainerRef.current;
  if (!sentinel || !container) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      const atBottom = entry.isIntersecting;
      setIsAtBottom(atBottom);
      if (atBottom) {
        setShowJumpIndicator(false);
        setUnreadCount(0);
      }
    },
    {
      root: container,
      threshold: 0.1,
      rootMargin: '-100px'  // Trigger 100px BEFORE reaching bottom
    }
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}, []);

// Track unread count when not at bottom
useEffect(() => {
  if (!isAtBottom && messages.length > prevMessagesLength.current) {
    const newMessages = messages.length - prevMessagesLength.current;
    setUnreadCount(prev => Math.min(prev + newMessages, 99));
  }
  prevMessagesLength.current = messages.length;
}, [messages, isAtBottom]);

// Show jump indicator when streaming and not at bottom
useEffect(() => {
  if (isLoading && !isAtBottom && !userJustSentMessage.current) {
    setShowJumpIndicator(true);
  }
}, [isLoading, isAtBottom]);

// Auto-scroll only when user sends a message (not on AI responses)
useEffect(() => {
  if (userJustSentMessage.current && scrollContainerRef.current) {
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
    setTimeout(() => { userJustSentMessage.current = false; }, 500);
  }
}, [messages]);

// Auto-close overlay when resizing to desktop
useEffect(() => {
  if (!isMobile && mobileOverlayOpen) {
    setMobileOverlayOpen(false);
  }
}, [isMobile, mobileOverlayOpen]);
```

**Update handleSendMessage to set userJustSentMessage:**
```tsx
const handleSendMessage = (message: string) => {
  userJustSentMessage.current = true;  // ADD THIS LINE
  handleChatSubmit(message);
};
```

**Update handleContactClick for mobile:**
```tsx
const handleContactClick = useCallback((identifier: string) => {
  if (highlightTimeoutRef.current) {
    clearTimeout(highlightTimeoutRef.current);
  }
  const actualId = resolveContactId(identifier);
  if (!actualId) return;

  if (isMobile) {
    // Open overlay first, then scroll after animation completes
    setMobileOverlayOpen(true);
    setTimeout(() => {
      const element = document.getElementById(`contact-card-${actualId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setHoveredContactId(actualId);
        highlightTimeoutRef.current = setTimeout(() => {
          setHoveredContactId(null);
        }, 2000);
      }
    }, 350); // Wait for spring animation
  } else {
    // Desktop: existing behavior
    const element = document.getElementById(`contact-card-${actualId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHoveredContactId(actualId);
      highlightTimeoutRef.current = setTimeout(() => {
        setHoveredContactId(null);
      }, 2000);
    }
  }
}, [resolveContactId, isMobile]);
```

**Add handler for showing contacts:**
```tsx
const handleShowContacts = useCallback(() => {
  setMobileOverlayOpen(true);
}, []);

const handleJumpToBottom = useCallback(() => {
  scrollContainerRef.current?.scrollTo({
    top: scrollContainerRef.current.scrollHeight,
    behavior: 'smooth',
  });
  setShowJumpIndicator(false);
  setUnreadCount(0);
}, []);
```

**Mobile layout (replace existing return for mobile):**
```tsx
// Add SSR guard
if (isMobile === undefined) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
    </div>
  );
}

if (isMobile) {
  return (
    <div className="h-screen bg-bg-primary flex flex-col">
      {/* Header with contacts button */}
      <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
            03 — Discover
          </p>
          <h2 className="font-display text-lg text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-gold-primary" />
            Explore
          </h2>
        </div>
        <button
          onClick={handleShowContacts}
          className="relative p-2 rounded-lg bg-bg-secondary border border-border hover:border-gold-primary/50 transition-colors"
          aria-label="View contacts"
        >
          <Users className="w-5 h-5 text-gold-primary" />
          {suggestedContacts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-primary text-black text-xs font-bold rounded-full flex items-center justify-center">
              {Math.min(suggestedContacts.length, 9)}
            </span>
          )}
        </button>
      </header>

      {/* Chat messages - scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 mb-4">
                Start by asking a question about your network
              </p>
              <div className="space-y-2">
                {[
                  "Who should I talk to about raising a seed round?",
                  "Find contacts who work in AI or machine learning",
                  "Who do I know in San Francisco?",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="block w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              content={message.content}
              isUser={message.role === "user"}
              onContactHover={handleContactHover}
              onContactClick={handleContactClick}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scroll sentinel for IntersectionObserver */}
        <div ref={scrollSentinelRef} className="h-1" />

        <JumpToBottomIndicator
          visible={showJumpIndicator}
          unreadCount={unreadCount}
          onClick={handleJumpToBottom}
        />
      </div>

      {/* Chat input - fixed at bottom with safe area */}
      <div className="p-4 border-t border-border shrink-0 pb-safe">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about your network..."
        />
      </div>

      {/* Contact overlay */}
      <MobileContactOverlay
        isOpen={mobileOverlayOpen}
        onClose={() => setMobileOverlayOpen(false)}
        title={suggestedContacts.length > 0 ? 'Suggested Contacts' : 'Your Contacts'}
        subtitle={suggestedContacts.length > 0 ? `${suggestedContacts.length} matches` : undefined}
      >
        <div className="p-4 space-y-3">
          {displayedContacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">
                {searchQuery ? "No contacts match your search" : "No contacts to display"}
              </p>
            </div>
          ) : (
            displayedContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                dynamicWhyNow={getDynamicWhyNow(contact.id)}
                isPinned={pinnedIds.has(contact.id)}
                isHighlighted={hoveredContactId === contact.id}
                onPin={handlePin}
                onDraftIntro={handleDraftIntro}
                onViewContact={handleViewContact}
              />
            ))
          )}
        </div>
      </MobileContactOverlay>

      {/* Draft Intro Modal */}
      <DraftIntroModal
        contact={draftIntroContact}
        isOpen={!!draftIntroContact}
        onClose={() => setDraftIntroContact(null)}
      />
    </div>
  );
}

// Desktop layout (existing code stays mostly the same)
// ... existing desktop return ...
```

#### 3.4 Update ContactChip Touch Support

**File:** `src/components/chat/ContactChip.tsx`

Replace mouse events with unified pointer events that work on both touch and mouse:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ... existing interfaces and helper functions ...

export function ContactChip({
  contactId,
  name,
  onHover,
  onClick,
}: ContactChipProps) {
  const [isPressed, setIsPressed] = useState(false);
  const initials = getInitialsFromName(name);
  const hue = useMemo(() => getHueFromName(name), [name]);

  const colors = useMemo(() => ({
    bg: `hsla(${hue}, 60%, 50%, 0.15)`,
    bgHover: `hsla(${hue}, 60%, 50%, 0.25)`,
    border: `hsla(${hue}, 60%, 50%, 0.30)`,
    borderHover: `hsla(${hue}, 60%, 50%, 0.50)`,
    text: `hsl(${hue}, 60%, 65%)`,
    avatarBg: `hsla(${hue}, 60%, 50%, 0.30)`,
    focusRing: `hsla(${hue}, 60%, 50%, 0.50)`,
  }), [hue]);

  // Unified handler for press state (touch + mouse)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressed(true);
    // Only call onHover for mouse (desktop hover preview)
    if (e.pointerType === 'mouse') {
      onHover(contactId);
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    setIsPressed(false);
    // Only call onHover(null) for mouse
    if (e.pointerType === 'mouse') {
      onHover(null);
    }
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
  };

  // Keep mouse enter/leave for desktop hover (when not pressing)
  const handleMouseEnter = () => {
    if (!isPressed) {
      onHover(contactId);
    }
  };

  const handleMouseLeave = () => {
    if (!isPressed) {
      onHover(null);
    }
  };

  const isHighlighted = isPressed;

  return (
    <motion.button
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "text-sm font-medium",
        "transition-colors cursor-pointer",
        "focus:outline-none focus:ring-2"
      )}
      style={{
        backgroundColor: isHighlighted ? colors.bgHover : colors.bg,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: isHighlighted ? colors.borderHover : colors.border,
        color: colors.text,
        // @ts-expect-error CSS variable
        "--tw-ring-color": colors.focusRing,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(contactId)}
      whileTap={{ scale: 0.98 }}
      role="button"
      aria-label={`View contact: ${name}`}
    >
      <span
        className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-semibold"
        style={{ backgroundColor: colors.avatarBg }}
      >
        {initials}
      </span>
      <span>{name}</span>
    </motion.button>
  );
}
```

---

## Phase 4: Update FAB Z-Index

**File:** `src/components/ui/FAB.tsx`

```tsx
// Change z-40 to z-30 to avoid conflict with overlay
className={cn(
  'fixed z-30 md:hidden',  // Changed from z-40
  'right-4 bottom-6',
  // ... rest
)}
```

---

## Testing Checklist

### Mobile Contacts Page
- [ ] Contacts load and display on iPhone SE (375px)
- [ ] Virtualized list scrolls smoothly
- [ ] Pull-to-refresh works
- [ ] FAB positioned correctly (bottom-6, z-30)
- [ ] Empty state displays correctly when no contacts

### Settings Page
- [ ] All cards readable on iPhone SE
- [ ] Account ID wraps on mobile (not truncated)
- [ ] Buttons are 44px tall touch targets
- [ ] Export/Delete actions work
- [ ] Grid stacks to single column on mobile

### Explorer Page Mobile
- [ ] Chat takes full screen
- [ ] Header shows contact button with badge
- [ ] Tapping contact button opens overlay
- [ ] Overlay slides in smoothly from right (350ms spring)
- [ ] Back button closes overlay
- [ ] Escape key closes overlay
- [ ] Backdrop click closes overlay
- [ ] Tapping ContactChip in chat opens overlay
- [ ] ContactChip highlights correct card in overlay (after 350ms delay)
- [ ] Smart scroll indicator appears when content below
- [ ] Tapping indicator scrolls to bottom
- [ ] User-sent messages auto-scroll
- [ ] AI streaming responses don't force scroll
- [ ] Unread count shows number of new messages

### Explorer Page Desktop
- [ ] Side-by-side layout preserved (768px+)
- [ ] Existing functionality unchanged
- [ ] Contact hover still highlights card in panel

### Accessibility
- [ ] Overlay has `role="dialog"` and `aria-modal="true"`
- [ ] Buttons have minimum 44px touch targets
- [ ] Account ID is copyable on mobile
- [ ] Focus returns to trigger when overlay closes

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/BottomNav.tsx` | DELETED | Already removed |
| `src/components/layout/AppShell.tsx` | DONE | BottomNav removed, pb-20 removed |
| `src/components/ui/FAB.tsx` | EDIT | Change z-40 to z-30 |
| `src/components/contacts/ContactsView.tsx` | EDIT | Add flex container with min-h-0 |
| `src/components/contacts/ContactCardList.tsx` | EDIT | Change calc to h-full |
| `src/app/(dashboard)/settings/page.tsx` | EDIT | Mobile responsive polish |
| `src/components/explore/MobileContactOverlay.tsx` | CREATE | Full-screen overlay |
| `src/components/chat/JumpToBottomIndicator.tsx` | CREATE | Smart scroll indicator |
| `src/app/(dashboard)/explore/page.tsx` | EDIT | Major restructure for mobile |
| `src/components/chat/ContactChip.tsx` | EDIT | Touch + mouse event support |
| `tailwind.config.ts` | EDIT | Add safe-area utilities |

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| ContactCardList height | LOW | Isolated change, standard flexbox pattern |
| Settings polish | LOW | CSS-only changes |
| Explorer mobile redesign | MEDIUM | Test thoroughly on real devices |
| Smart scroll | MEDIUM | IntersectionObserver well-supported |
| ContactChip touch | LOW | Preserves desktop behavior |

---

## Estimated Effort

- Phase 1 (ContactCardList height): 15 minutes
- Phase 2 (Settings polish): 30 minutes
- Phase 3 (Explorer redesign): 2 hours
- Phase 4 (FAB z-index): 5 minutes
- Testing: 1 hour

**Total: ~4 hours**

---

## Success Criteria

1. All contacts visible on mobile viewport
2. Settings page readable on iPhone SE with copyable Account ID
3. Explorer chat full-screen on mobile with accessible contact overlay
4. Smart scroll indicator instead of forced auto-scroll
5. ContactChip works on both touch and mouse
6. No regressions on desktop
