# Mobile Viewport UX Optimization - Implementation Spec

**Slug:** mobile-viewport-ux-audit
**Author:** Claude Code
**Date:** 2026-01-04
**Status:** Ready for Implementation
**Estimated Effort:** 10 days across 3 phases

---

## 1. Overview

This specification covers the mobile-first redesign of Better Connections for viewports under 768px. The goal is to deliver a native-feeling mobile experience with proper touch targets, intuitive navigation, and gesture-based interactions.

### Scope Summary

| Phase | Feature | Est. Days |
|-------|---------|-----------|
| **Phase 1** | Bottom navigation bar | 1 |
| **Phase 1** | Mobile contact cards (collapsed only) | 2 |
| **Phase 1** | Touch target audit | 0.5 |
| **Phase 1** | OLED colors + globals.css | 0.5 |
| **Phase 2** | Virtualization (react-window) | 1 |
| **Phase 2** | Swipe-to-enrich (native Touch API) | 1 |
| **Phase 2** | FAB with throttled scroll | 0.5 |
| **Phase 2** | Sticky search + filter drawer | 1 |
| **Phase 2** | Pull-to-refresh | 1 |
| **Phase 3** | Progressive disclosure (card expansion) | 2 |

**Total:** ~10 days

### Scope Decisions

**Included:**
- All P1 foundation items
- All P2 interaction items (including pull-to-refresh)
- Progressive disclosure (card expansion)

**Cut:**
- Long-press bulk selection (desktop-only feature)
- `@use-gesture/react` dependency (using native Touch API instead)

---

## 2. Technical Architecture

### 2.1 New Components

```
src/components/
├── layout/
│   ├── Sidebar.tsx              (existing - desktop only)
│   ├── BottomNav.tsx            (NEW - mobile nav)
│   └── MobileErrorBoundary.tsx  (NEW - error handling for mobile)
├── contacts/
│   ├── ContactsTable.tsx        (existing - desktop only >768px)
│   ├── ContactCard.tsx          (NEW - single contact card, memoized)
│   ├── ContactCardList.tsx      (NEW - virtualized card list)
│   └── ContactsView.tsx         (NEW - switches table/cards by viewport)
├── ui/
│   ├── FAB.tsx                  (NEW - floating action button)
│   ├── SwipeableCard.tsx        (NEW - native touch swipe wrapper)
│   ├── PullToRefresh.tsx        (NEW - pull gesture wrapper)
│   └── FilterDrawer.tsx         (NEW - bottom sheet filters)
├── hooks/
│   └── useMediaQuery.ts         (NEW - SSR-safe media query hook)
```

### 2.2 Design Token Updates

**File:** `tailwind.config.ts`

```typescript
// BEFORE
bg: {
  primary: '#0D0D0F',
  secondary: '#1A1A1F',
  tertiary: '#252529',
}

// AFTER (OLED-optimized)
bg: {
  primary: '#121212',
  secondary: '#1E1E1E',
  tertiary: '#2A2A2A',
}

// Text updates for reduced eye strain
text: {
  primary: '#E0E0E0',    // was #FFFFFF
  secondary: '#A0A0A8',  // unchanged
  tertiary: '#707078',   // was #606068
}
```

**File:** `src/app/globals.css`

Also update CSS variables to match:
```css
:root {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-tertiary: #2A2A2A;
  --text-primary: #E0E0E0;
  /* ... */
}
```

### 2.3 Required Meta Tag

**File:** `src/app/layout.tsx`

Add viewport-fit=cover for safe area support:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 2.4 Z-Index Hierarchy

Establish clear stacking order to prevent conflicts:

| Element | Z-Index | Notes |
|---------|---------|-------|
| Modals/Dialogs | z-50 | Existing - don't change |
| Bottom nav | z-45 | NEW - below modals |
| FAB | z-40 | Above content |
| Sticky search header | z-30 | Above scrolling content |
| Mobile sidebar overlay | z-43 | When hamburger is open |

### 2.5 Breakpoint Strategy

- `<768px` (mobile): Bottom nav, card layout, swipe gestures
- `>=768px` (tablet/desktop): Sidebar, table layout, hover states

Use Tailwind's `md:` prefix consistently. No custom breakpoints needed.

### 2.6 Dependencies

**NO new npm dependencies required.**

Using native Touch API instead of `@use-gesture/react` (saves 54KB bundle size).

Existing dependencies used:
- `use-debounce` (already installed) - for FAB scroll throttling
- `react-window` (to install) - for list virtualization
- `framer-motion` (already installed) - for animations

```bash
npm install react-window @types/react-window
```

---

## 3. Phase 1: Foundation + Cards (Days 1-4)

### 3.1 Bottom Navigation Bar

**File:** `src/components/layout/BottomNav.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Sparkles, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'contacts', label: 'Contacts', href: '/contacts', icon: Users },
  { id: 'enrich', label: 'Enrich', href: '/enrich', icon: Sparkles },
  { id: 'explore', label: 'Explore', href: '/explore', icon: MessageSquare },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-45',
        'h-16 pb-safe',
        'bg-bg-primary border-t border-border',
        'flex items-center justify-around',
        'md:hidden'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'min-w-[64px] h-full px-3',
              'transition-colors',
              isActive ? 'text-gold-primary' : 'text-text-secondary'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn('h-6 w-6', isActive && 'fill-current')} />
            <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

**Visual Specs:**
- Height: 64px + safe-area-inset-bottom
- Background: `bg-bg-primary` with `border-t border-border`
- Fixed position at bottom
- Z-index: 45 (above content, below modals)
- Active state: Gold icon (#C9A227), semibold label
- Inactive state: Secondary text color, normal weight

**Safe Area Handling:**

Add to `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    padding: {
      'safe': 'env(safe-area-inset-bottom)',
    },
    zIndex: {
      '45': '45',
    },
  },
}
```

### 3.2 Mobile Layout Integration

**File:** `src/app/(dashboard)/layout.tsx`

Update existing layout to include bottom nav padding on mobile:

```typescript
// Add bottom padding on mobile for bottom nav
<main className="flex-1 overflow-auto pb-20 md:pb-0">
  {children}
</main>

{/* Bottom nav - mobile only */}
<BottomNav />
```

### 3.3 useMediaQuery Hook (SSR-Safe)

**File:** `src/hooks/useMediaQuery.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns undefined during SSR, then actual value after hydration.
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with undefined to avoid hydration mismatch
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // Return false during SSR/initial render, actual value after hydration
  return matches ?? false;
}

/**
 * Convenience hook for mobile detection.
 * Mobile = viewport < 768px
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
```

### 3.4 ContactCard Component (Memoized)

**File:** `src/components/contacts/ContactCard.tsx`

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials, getAvatarColor } from '@/types/contact';

interface ContactCardProps {
  contact: Contact;
  onEnrich?: (id: string) => void;
}

function RelationshipDots({ strength }: { strength: number }) {
  return (
    <div className="flex gap-1" aria-label={`Relationship strength: ${strength} of 4`}>
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={cn(
            'w-2 h-2 rounded-full',
            level <= strength ? 'bg-gold-primary' : 'bg-zinc-600'
          )}
        />
      ))}
    </div>
  );
}

export const ContactCard = React.memo(function ContactCard({
  contact,
  onEnrich,
}: ContactCardProps) {
  const router = useRouter();

  const handleTap = () => {
    router.push(`/contacts/${contact.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onKeyDown={(e) => e.key === 'Enter' && handleTap()}
      className={cn(
        'bg-bg-secondary rounded-xl border border-border',
        'p-4',
        'transition-colors duration-150',
        'active:bg-bg-tertiary',
        'cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="h-11 w-11 flex-shrink-0">
          <AvatarFallback
            style={{ background: getAvatarColor(contact) }}
            className="text-sm font-medium text-white/90"
          >
            {getInitials(contact)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white truncate">
              {getDisplayName(contact)}
            </h3>
            <ChevronRight className="h-4 w-4 text-text-tertiary flex-shrink-0" />
          </div>

          <p className="text-sm text-text-secondary truncate">
            {contact.title || 'No title'}
            {contact.title && contact.company && ' · '}
            {contact.company}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <RelationshipDots strength={contact.relationshipStrength || 1} />
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-2 py-0.5',
                contact.enrichmentScore >= 80
                  ? 'bg-success/20 text-success border-success/30'
                  : contact.enrichmentScore >= 50
                  ? 'bg-gold-subtle text-gold-primary border-gold-primary/30'
                  : 'bg-warning/20 text-warning border-warning/30'
              )}
            >
              {contact.enrichmentScore}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### 3.5 ContactCardList Component

**File:** `src/components/contacts/ContactCardList.tsx`

Initial implementation without virtualization (added in Phase 2):

```typescript
'use client';

import { ContactCard } from './ContactCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { Contact } from '@/types/contact';

interface ContactCardListProps {
  contacts: Contact[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function ContactCardList({
  contacts,
  isLoading,
}: ContactCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Users className="h-12 w-12 text-text-tertiary opacity-30 mb-4" />
        <p className="text-base font-medium text-text-secondary mb-1">
          No contacts yet
        </p>
        <p className="text-sm text-text-tertiary text-center">
          Add your first contact to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### 3.6 ContactsView Component

**File:** `src/components/contacts/ContactsView.tsx`

```typescript
'use client';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { ContactCardList } from './ContactCardList';
import { ContactsTable } from './ContactsTable';
import type { Contact } from '@/types/contact';

interface ContactsViewProps {
  contacts: Contact[];
  isLoading?: boolean;
  // ... other props passed to both views
}

export function ContactsView(props: ContactsViewProps) {
  const isMobile = useIsMobile();

  // Show nothing during SSR to avoid hydration mismatch
  // The actual view will render after hydration
  if (isMobile === undefined) {
    return null;
  }

  if (isMobile) {
    return <ContactCardList {...props} />;
  }

  return <ContactsTable {...props} />;
}
```

### 3.7 OLED Background Color Updates

**File:** `tailwind.config.ts`

Update the `colors` object:

```typescript
colors: {
  bg: {
    primary: '#121212',    // was #0D0D0F
    secondary: '#1E1E1E',  // was #1A1A1F
    tertiary: '#2A2A2A',   // was #252529
    glass: 'rgba(30, 30, 30, 0.85)', // updated for new secondary
  },
  text: {
    primary: '#E0E0E0',    // was #FFFFFF
    secondary: '#A0A0A8',  // unchanged
    tertiary: '#707078',   // was #606068
  },
  // ... rest unchanged
}
```

**File:** `src/app/globals.css`

Update CSS variables if used:

```css
:root {
  --background: 18 18 18;  /* #121212 in RGB */
  --foreground: 224 224 224;  /* #E0E0E0 in RGB */
}
```

### 3.8 Touch Target Audit

**Minimum size:** 44x44px (h-11 w-11 in Tailwind)

**Files to update:**

1. **`src/components/ui/button.tsx`** - Add mobile-responsive sizing:
```typescript
// Update icon variant
icon: "h-11 w-11 md:h-10 md:w-10",
```

2. **`src/components/layout/Sidebar.tsx`** - Mobile menu button:
```typescript
// Line ~109: Update hamburger button
className="fixed top-4 left-4 z-40 p-3 rounded-lg..."  // was p-2
```

3. **All icon-only buttons** - Ensure minimum 44px on mobile

### 3.9 Error Boundary

**File:** `src/components/layout/MobileErrorBoundary.tsx`

```typescript
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MobileErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            We encountered an error loading this view.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 4. Phase 2: Interactions (Days 5-7)

### 4.1 Virtualized Contact List

**File:** `src/components/contacts/ContactCardList.tsx` (updated)

```typescript
'use client';

import { useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ContactCard } from './ContactCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { Contact } from '@/types/contact';

const CARD_HEIGHT = 100; // Fixed height for virtualization
const CARD_GAP = 12;

interface ContactCardListProps {
  contacts: Contact[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function ContactCardList({
  contacts,
  isLoading,
  onRefresh,
  isRefreshing,
}: ContactCardListProps) {
  const listRef = useRef<List>(null);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const contact = contacts[index];
    return (
      <div style={{ ...style, paddingLeft: 16, paddingRight: 16, paddingBottom: CARD_GAP }}>
        <ContactCard contact={contact} />
      </div>
    );
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Users className="h-12 w-12 text-text-tertiary opacity-30 mb-4" />
        <p className="text-base font-medium text-text-secondary mb-1">
          No contacts yet
        </p>
        <p className="text-sm text-text-tertiary text-center">
          Add your first contact to get started
        </p>
      </div>
    );
  }

  const content = (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          height={height}
          width={width}
          itemCount={contacts.length}
          itemSize={CARD_HEIGHT + CARD_GAP}
          overscanCount={5}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );

  if (onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh} isRefreshing={isRefreshing}>
        <div className="h-[calc(100vh-180px)]">
          {content}
        </div>
      </PullToRefresh>
    );
  }

  return <div className="h-[calc(100vh-180px)]">{content}</div>;
}
```

**Additional dependency:**
```bash
npm install react-virtualized-auto-sizer @types/react-virtualized-auto-sizer
```

### 4.2 SwipeableCard (Native Touch API)

**File:** `src/components/ui/SwipeableCard.tsx`

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 120;

export function SwipeableCard({
  children,
  onSwipeRight,
  actionLabel = 'Enrich',
  disabled = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsTransitioning(false);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current && diffX > 0) {
      setTranslateX(Math.min(diffX, MAX_SWIPE));
    }
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setIsTransitioning(true);

    if (translateX > SWIPE_THRESHOLD) {
      // Trigger action
      onSwipeRight?.();
    }

    // Reset position
    setTranslateX(0);
    isHorizontalSwipe.current = null;
  }, [disabled, translateX, onSwipeRight]);

  const progress = Math.min(translateX / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action background revealed on swipe */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-24',
          'bg-purple-600 flex items-center justify-center gap-2',
          'transition-opacity duration-150'
        )}
        style={{ opacity: progress }}
      >
        <Sparkles className="h-5 w-5 text-white" />
        <span className="text-white text-sm font-medium">{actionLabel}</span>
      </div>

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isTransitioning ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

### 4.3 PullToRefresh Component

**File:** `src/components/ui/PullToRefresh.tsx`

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({
  children,
  onRefresh,
  isRefreshing = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only start pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Apply resistance for natural feel
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance > THRESHOLD && !isRefreshing) {
      await onRefresh();
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false to allow preventDefault if needed
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;

  return (
    <div ref={containerRef} className="relative overflow-auto">
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-10',
          'flex items-center justify-center',
          'transition-transform duration-150'
        )}
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: progress,
        }}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 border-gold-primary',
            isRefreshing ? 'animate-spin' : ''
          )}
          style={{
            borderTopColor: 'transparent',
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

### 4.4 FAB with Throttled Scroll

**File:** `src/components/ui/FAB.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useThrottledCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FABProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hideOnScroll?: boolean;
}

export function FAB({
  icon,
  label,
  onClick,
  hideOnScroll = true,
}: FABProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useThrottledCallback(() => {
    const currentScrollY = window.scrollY;
    const isScrollingUp = currentScrollY < lastScrollY.current;
    const isNearTop = currentScrollY < 10;

    setIsVisible(isScrollingUp || isNearTop);
    lastScrollY.current = currentScrollY;
  }, 100);

  useEffect(() => {
    if (!hideOnScroll) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll, handleScroll]);

  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 1, y: 0 }}
      animate={{
        scale: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed z-40 md:hidden',
        'right-4 bottom-20', // 16px from right, above bottom nav (64px + 16px)
        'w-14 h-14 rounded-full',
        'bg-gold-primary hover:bg-gold-light active:bg-gold-primary',
        'flex items-center justify-center',
        'shadow-lg shadow-black/25',
        'transition-colors'
      )}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}
```

### 4.5 Sticky Search + Filter Drawer

**File:** `src/components/ui/FilterDrawer.tsx`

```typescript
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

export function FilterDrawer({
  isOpen,
  onOpenChange,
  activeFilters,
  onClearAll,
  children,
}: FilterDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl bg-bg-secondary border-border"
      >
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center justify-between text-white">
            <span>Filters</span>
            {activeFilters > 0 && (
              <Badge variant="secondary" className="bg-gold-subtle text-gold-primary">
                {activeFilters} active
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto py-4 flex-1">
          {children}
        </div>

        <SheetFooter className="border-t border-border pt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={activeFilters === 0}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-gold-primary hover:bg-gold-light text-black"
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

**Sticky Search Header (integrate into ContactCardList):**

```typescript
// Add to top of ContactCardList
<div className="sticky top-0 z-30 bg-bg-primary p-4 pt-safe border-b border-border">
  <div className="flex gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
      <Input
        placeholder="Search contacts..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 h-11"
      />
    </div>
    <Button
      variant="outline"
      size="icon"
      onClick={() => setFilterDrawerOpen(true)}
      className="h-11 w-11 relative"
    >
      <SlidersHorizontal className="h-4 w-4" />
      {activeFilters > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-primary text-black text-xs font-semibold rounded-full flex items-center justify-center">
          {activeFilters}
        </span>
      )}
    </Button>
  </div>
</div>
```

---

## 5. Phase 3: Progressive Features (Days 8-10)

### 5.1 Progressive Disclosure (Card Expansion)

Update `ContactCard.tsx` to support expansion:

```typescript
interface ContactCardProps {
  contact: Contact;
  isExpanded?: boolean;
  onExpand?: (id: string) => void;
  onEnrich?: (id: string) => void;
}

export const ContactCard = React.memo(function ContactCard({
  contact,
  isExpanded = false,
  onExpand,
  onEnrich,
}: ContactCardProps) {
  const router = useRouter();

  const handleTap = () => {
    if (onExpand) {
      onExpand(contact.id);
    } else {
      router.push(`/contacts/${contact.id}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onKeyDown={(e) => e.key === 'Enter' && handleTap()}
      className={cn(
        'bg-bg-secondary rounded-xl border border-border',
        'p-4',
        'transition-colors duration-150',
        'active:bg-bg-tertiary',
        'cursor-pointer',
        isExpanded && 'bg-bg-tertiary'
      )}
    >
      {/* Collapsed content - always visible */}
      <div className="flex items-center gap-3">
        {/* ... avatar and basic info ... */}
        <ChevronRight
          className={cn(
            'h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
      </div>

      {/* Expanded content */}
      <motion.div
        initial={false}
        animate={{
          maxHeight: isExpanded ? 300 : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="pt-4 mt-4 border-t border-border space-y-3">
          {contact.primaryEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-text-tertiary" />
              <span className="text-text-secondary">{contact.primaryEmail}</span>
            </div>
          )}
          {contact.primaryPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-text-tertiary" />
              <span className="text-text-secondary">{contact.primaryPhone}</span>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-text-tertiary" />
              <span className="text-text-secondary">{contact.location}</span>
            </div>
          )}

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {contact.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.text}
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <span className="text-xs text-text-tertiary">
                  +{contact.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/contacts/${contact.id}`);
              }}
            >
              View Profile
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 bg-gold-primary hover:bg-gold-light text-black"
              onClick={(e) => {
                e.stopPropagation();
                onEnrich?.(contact.id);
              }}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Enrich
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
```

**State management in ContactCardList:**

```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);

const handleExpand = useCallback((contactId: string) => {
  setExpandedId((prev) => (prev === contactId ? null : contactId));
}, []);
```

**Note:** With virtualization and variable card heights, you may need to use `VariableSizeList` instead of `FixedSizeList`. This adds complexity - consider if expansion is worth the trade-off.

---

## 6. Testing Checklist

### Manual Testing

**Devices:**
- iPhone 14 Pro (OLED, notch, 393px width)
- Pixel 7 (OLED, 412px width)
- iPhone SE (LCD, 375px width, smaller screen)

**Test Cases:**

**Phase 1:**
- [ ] Bottom nav displays on mobile, hidden on desktop
- [ ] Bottom nav handles safe-area-inset-bottom on iPhone
- [ ] Active nav state shows gold accent
- [ ] Contact cards display correctly (collapsed)
- [ ] Tapping card navigates to detail page
- [ ] All touch targets are minimum 44x44px
- [ ] OLED background color is #121212 (not pure black)
- [ ] No OLED smearing on scroll (test on device)
- [ ] Text contrast meets accessibility standards

**Phase 2:**
- [ ] Pull-to-refresh triggers data reload
- [ ] Pull indicator shows correctly
- [ ] Swipe right on card triggers enrich action
- [ ] Swipe gesture has visual feedback
- [ ] FAB appears on contacts page
- [ ] FAB hides on scroll down, shows on scroll up
- [ ] FAB positioned above bottom nav (not overlapping)
- [ ] Search bar is sticky at top
- [ ] Filter drawer opens from bottom
- [ ] Filter drawer dismisses correctly
- [ ] Virtualized list scrolls smoothly with 100+ contacts

**Phase 3:**
- [ ] Tap to expand card works
- [ ] Expanded card shows all fields
- [ ] Chevron rotates on expand
- [ ] Expand animation is smooth
- [ ] Only one card expanded at a time

### Performance

- [ ] Lighthouse Mobile score >90
- [ ] First Contentful Paint <2s on 4G
- [ ] No jank during scroll
- [ ] Virtualized list maintains 60fps

---

## 7. File Changes Summary

### New Files
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/MobileErrorBoundary.tsx`
- `src/components/contacts/ContactCard.tsx`
- `src/components/contacts/ContactCardList.tsx`
- `src/components/contacts/ContactsView.tsx`
- `src/components/ui/FAB.tsx`
- `src/components/ui/SwipeableCard.tsx`
- `src/components/ui/PullToRefresh.tsx`
- `src/components/ui/FilterDrawer.tsx`
- `src/hooks/useMediaQuery.ts`

### Modified Files
- `tailwind.config.ts` - OLED colors, safe-area padding, z-index
- `src/app/layout.tsx` - viewport meta tag
- `src/app/globals.css` - CSS variable updates
- `src/app/(dashboard)/layout.tsx` - integrate BottomNav
- `src/app/(dashboard)/contacts/page.tsx` - use ContactsView
- `src/components/ui/button.tsx` - touch target sizing

### Dependencies
```bash
npm install react-window @types/react-window react-virtualized-auto-sizer @types/react-virtualized-auto-sizer
```

---

## 8. Definition of Done

- [ ] All Phase 1, 2, and 3 features implemented
- [ ] Manual testing completed on target devices
- [ ] No TypeScript errors
- [ ] Build succeeds without warnings
- [ ] Lighthouse Mobile score >90
- [ ] Pull-to-refresh works on all list views
- [ ] No hydration warnings in console
- [ ] Deployed to production
