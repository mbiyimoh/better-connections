# Task Breakdown: Mobile Viewport UX Optimization

**Generated:** 2026-01-04
**Source:** specs/mobile-viewport-ux-audit/02-spec.md
**Feature Slug:** mobile-viewport-ux-audit
**Last Decompose:** 2026-01-04

---

## Overview

This task breakdown covers the mobile-first redesign of Better Connections for viewports under 768px. The implementation spans 3 phases across ~10 days, delivering:

- Bottom navigation bar (replacing hamburger menu)
- Mobile contact cards (replacing table view)
- Touch target optimization
- OLED-optimized colors
- Virtualized lists with react-window
- Swipe-to-enrich gestures
- FAB with scroll-aware visibility
- Pull-to-refresh
- Progressive disclosure (card expansion)

---

## Phase 1: Foundation (Days 1-4)

### Task 1.1: Create SSR-Safe useMediaQuery Hook

**Description:** Build the foundational media query hook that prevents hydration mismatches
**Size:** Small
**Priority:** Critical (blocks all mobile components)
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Technical Requirements:**
- Initialize state with `undefined` to avoid SSR mismatch
- Return `false` during SSR, actual value after hydration
- Listen to media query changes with event listener
- Properly clean up event listeners

**Implementation:**

```typescript
// src/hooks/useMediaQuery.ts
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

**Acceptance Criteria:**
- [ ] Hook initializes with `undefined` state
- [ ] Returns `false` during SSR (no hydration warnings)
- [ ] Correctly detects viewport < 768px
- [ ] Updates on window resize
- [ ] Event listener cleaned up on unmount
- [ ] TypeScript types are correct

---

### Task 1.2: Update Tailwind Config with OLED Colors and Mobile Utilities

**Description:** Update design tokens for OLED screens and add mobile utility classes
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**Technical Requirements:**
- Change background colors from near-black to OLED-optimized gray
- Add safe-area padding utility
- Add z-45 for bottom nav stacking
- Update text colors for reduced eye strain

**Implementation:**

Update `tailwind.config.ts`:

```typescript
// In theme.extend
colors: {
  bg: {
    primary: '#121212',    // was #0D0D0F - OLED optimized
    secondary: '#1E1E1E',  // was #1A1A1F
    tertiary: '#2A2A2A',   // was #252529
    glass: 'rgba(30, 30, 30, 0.85)',
  },
  text: {
    primary: '#E0E0E0',    // was #FFFFFF - reduced eye strain
    secondary: '#A0A0A8',  // unchanged
    tertiary: '#707078',   // was #606068 - better contrast
  },
  // ... rest unchanged
},
padding: {
  'safe': 'env(safe-area-inset-bottom)',
},
zIndex: {
  '45': '45',
},
```

Update `src/app/globals.css`:

```css
:root {
  --background: 18 18 18;  /* #121212 in RGB */
  --foreground: 224 224 224;  /* #E0E0E0 in RGB */
}
```

**Acceptance Criteria:**
- [ ] Background colors updated (#121212, #1E1E1E, #2A2A2A)
- [ ] Text primary is #E0E0E0 (not pure white)
- [ ] `pb-safe` utility class works
- [ ] `z-45` utility class works
- [ ] No visual regressions on desktop
- [ ] Build succeeds without Tailwind errors

---

### Task 1.3: Add Viewport Meta Tag for Safe Areas

**Description:** Update layout.tsx with viewport-fit=cover for iPhone notch support
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1, 1.2

**Technical Requirements:**
- Add viewport-fit=cover to enable safe area CSS functions
- env(safe-area-inset-bottom) won't work without this

**Implementation:**

Update `src/app/layout.tsx`:

```typescript
// In the <head> or metadata
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

Or if using Next.js metadata API:

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
```

**Acceptance Criteria:**
- [ ] Viewport meta tag includes viewport-fit=cover
- [ ] env(safe-area-inset-bottom) returns correct value on iPhone
- [ ] No layout issues on non-notched devices

---

### Task 1.4: Create Bottom Navigation Component

**Description:** Build the fixed bottom navigation bar for mobile viewports
**Size:** Medium
**Priority:** Critical
**Dependencies:** Task 1.1 (useMediaQuery), Task 1.2 (z-45, pb-safe)
**Can run parallel with:** Task 1.5

**Technical Requirements:**
- Fixed positioning at bottom
- 4 nav items: Contacts, Enrich, Explore, Settings
- Active state with gold accent
- Safe area padding for iPhone
- Hidden on desktop (md:hidden)
- Z-index 45 (below modals at z-50)

**Implementation:**

```typescript
// src/components/layout/BottomNav.tsx
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

**Acceptance Criteria:**
- [ ] Bottom nav displays on mobile (<768px)
- [ ] Hidden on desktop (>=768px)
- [ ] 4 nav items with correct icons
- [ ] Active state shows gold color
- [ ] Safe area padding works on iPhone
- [ ] Z-index doesn't conflict with modals
- [ ] Tapping navigates to correct route
- [ ] Accessibility: role="navigation", aria-label, aria-current

---

### Task 1.5: Integrate Bottom Nav into Dashboard Layout

**Description:** Add bottom nav to app shell and adjust main content padding
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.4 (BottomNav component)
**Can run parallel with:** Task 1.6

**Technical Requirements:**
- Import and render BottomNav in dashboard layout
- Add bottom padding to main content on mobile
- Ensure content doesn't get hidden behind nav

**Implementation:**

Update `src/app/(dashboard)/layout.tsx`:

```typescript
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar /> {/* Existing sidebar - hidden on mobile */}

      {/* Add bottom padding on mobile for bottom nav */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav - mobile only */}
      <BottomNav />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] BottomNav renders in dashboard layout
- [ ] Main content has pb-20 on mobile
- [ ] No bottom padding on desktop
- [ ] Content scrolls properly above nav
- [ ] No content hidden behind nav

---

### Task 1.6: Create ContactCard Component

**Description:** Build the memoized contact card component for mobile list view
**Size:** Medium
**Priority:** High
**Dependencies:** None (uses existing types and utilities)
**Can run parallel with:** Task 1.4, 1.5

**Technical Requirements:**
- Display: Avatar, name, title/company, relationship dots, enrichment score
- React.memo for virtualization performance
- Tap to navigate to contact detail
- Active state feedback on tap
- Touch target minimum 44px

**Implementation:**

```typescript
// src/components/contacts/ContactCard.tsx
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
        {/* Avatar - 44px for touch target */}
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

**Acceptance Criteria:**
- [ ] Card displays avatar, name, title/company
- [ ] Relationship dots show correct strength (1-4)
- [ ] Enrichment score badge with color coding
- [ ] Tap navigates to /contacts/:id
- [ ] Active state on tap (bg-bg-tertiary)
- [ ] React.memo prevents unnecessary re-renders
- [ ] Avatar is 44px (touch target minimum)
- [ ] Text truncates properly on small screens

---

### Task 1.7: Create ContactCardList Component

**Description:** Build the contact card list container (non-virtualized initially)
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.6 (ContactCard)
**Can run parallel with:** Task 1.8

**Technical Requirements:**
- Render list of ContactCard components
- Loading skeleton state
- Empty state with icon and message
- Spacing between cards

**Implementation:**

```typescript
// src/components/contacts/ContactCardList.tsx
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

**Acceptance Criteria:**
- [ ] Renders ContactCard for each contact
- [ ] Loading state shows 5 skeleton cards
- [ ] Empty state shows icon and helpful message
- [ ] 12px (space-y-3) gap between cards
- [ ] 16px (p-4) padding around list

---

### Task 1.8: Create ContactsView Switching Component

**Description:** Build the viewport-aware component that switches between table and cards
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1 (useMediaQuery), Task 1.7 (ContactCardList)
**Can run parallel with:** Task 1.7

**Technical Requirements:**
- Use useIsMobile hook to detect viewport
- Render ContactCardList on mobile
- Render ContactsTable on desktop
- Handle undefined state during SSR

**Implementation:**

```typescript
// src/components/contacts/ContactsView.tsx
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

**Acceptance Criteria:**
- [ ] Shows ContactCardList on mobile (<768px)
- [ ] Shows ContactsTable on desktop (>=768px)
- [ ] No hydration warnings
- [ ] Responds to window resize
- [ ] Props passed correctly to both views

---

### Task 1.9: Create Mobile Error Boundary

**Description:** Build error boundary component for mobile gesture components
**Size:** Small
**Priority:** Medium
**Dependencies:** None
**Can run parallel with:** Any Phase 1 task

**Technical Requirements:**
- Class-based component (required for error boundaries)
- Catch errors in mobile gesture components
- User-friendly error UI with recovery option
- Reload page to reset state

**Implementation:**

```typescript
// src/components/layout/MobileErrorBoundary.tsx
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

**Acceptance Criteria:**
- [ ] Catches errors in children
- [ ] Shows user-friendly error message
- [ ] Try Again button reloads page
- [ ] Resets error state before reload

---

### Task 1.10: Touch Target Audit and Fixes

**Description:** Audit and fix all touch targets below 44px minimum
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Any Phase 1 task

**Technical Requirements:**
- All buttons minimum h-11 w-11 (44px) on mobile
- Update icon button variant
- Fix hamburger menu button
- Ensure adequate spacing between tappable elements

**Files to update:**

1. `src/components/ui/button.tsx`:
```typescript
// Update icon variant
icon: "h-11 w-11 md:h-10 md:w-10",
```

2. `src/components/layout/Sidebar.tsx`:
```typescript
// Line ~109: Update hamburger button
className="fixed top-4 left-4 z-40 p-3 rounded-lg..."  // was p-2
```

**Acceptance Criteria:**
- [ ] Icon buttons are 44px on mobile
- [ ] Hamburger menu button is 44px
- [ ] All tappable elements have 44px minimum
- [ ] At least 8px spacing between tappable elements
- [ ] No visual regressions on desktop

---

### Task 1.11: Integrate ContactsView into Contacts Page

**Description:** Replace ContactsTable with ContactsView on contacts page
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.8 (ContactsView)
**Can run parallel with:** None (finishes Phase 1)

**Technical Requirements:**
- Import ContactsView instead of ContactsTable
- Pass all existing props
- Wrap in MobileErrorBoundary

**Implementation:**

Update `src/app/(dashboard)/contacts/page.tsx`:

```typescript
import { ContactsView } from '@/components/contacts/ContactsView';
import { MobileErrorBoundary } from '@/components/layout/MobileErrorBoundary';

// In the component:
<MobileErrorBoundary>
  <ContactsView
    contacts={contacts}
    isLoading={isLoading}
    // ... other existing props
  />
</MobileErrorBoundary>
```

**Acceptance Criteria:**
- [ ] Contacts page uses ContactsView
- [ ] Mobile shows card layout
- [ ] Desktop shows table layout
- [ ] All existing functionality preserved
- [ ] Error boundary catches errors

---

## Phase 2: Interactions (Days 5-7)

### Task 2.1: Install react-window Dependencies

**Description:** Install virtualization dependencies for performant long lists
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.2

**Technical Requirements:**
- Install react-window for virtualized lists
- Install react-virtualized-auto-sizer for responsive container
- Install TypeScript types

**Implementation:**

```bash
npm install react-window @types/react-window react-virtualized-auto-sizer @types/react-virtualized-auto-sizer
```

**Acceptance Criteria:**
- [ ] Dependencies installed
- [ ] TypeScript types available
- [ ] No version conflicts
- [ ] Build succeeds

---

### Task 2.2: Create SwipeableCard Component

**Description:** Build native Touch API swipe gesture wrapper
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1, 2.3

**Technical Requirements:**
- Native Touch API (no @use-gesture/react dependency)
- Swipe right to reveal Enrich action
- Visual feedback during swipe
- 80px threshold to trigger action
- Max swipe distance 120px
- Direction detection (horizontal vs vertical)

**Implementation:**

```typescript
// src/components/ui/SwipeableCard.tsx
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

    // Only handle horizontal swipes to the right
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

**Acceptance Criteria:**
- [ ] Swipe right reveals purple Enrich action
- [ ] Action triggered at 80px threshold
- [ ] Card snaps back on release
- [ ] Vertical scrolling not blocked
- [ ] Visual feedback (opacity) during swipe
- [ ] Smooth animation on release (0.2s ease-out)
- [ ] Disabled prop prevents interaction
- [ ] No external dependencies

---

### Task 2.3: Create PullToRefresh Component

**Description:** Build pull-to-refresh gesture wrapper
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1 complete
**Can run parallel with:** Task 2.1, 2.2

**Technical Requirements:**
- Touch-based pull gesture
- Only triggers when scrolled to top
- Visual progress indicator
- 80px threshold to trigger refresh
- Resistance feel (0.5x multiplier)
- Spinning indicator during refresh

**Implementation:**

```typescript
// src/components/ui/PullToRefresh.tsx
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

**Acceptance Criteria:**
- [ ] Pull gesture only activates at scroll top
- [ ] Progress indicator shows pull distance
- [ ] 80px threshold triggers refresh
- [ ] Resistance feel (0.5x movement)
- [ ] Spinner animates during refresh
- [ ] Content snaps back after release
- [ ] isRefreshing prop shows continuous spin

---

### Task 2.4: Update ContactCardList with Virtualization

**Description:** Add react-window virtualization to contact card list
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1 (dependencies), Task 2.3 (PullToRefresh)
**Can run parallel with:** Task 2.5

**Technical Requirements:**
- Use FixedSizeList from react-window
- AutoSizer for responsive container
- Integrate PullToRefresh wrapper
- Memoized Row renderer
- 100px card height + 12px gap

**Implementation:**

Update `src/components/contacts/ContactCardList.tsx`:

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

const CARD_HEIGHT = 100;
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

**Acceptance Criteria:**
- [ ] Virtualized list renders correctly
- [ ] Smooth scrolling with 100+ contacts
- [ ] Pull-to-refresh works at scroll top
- [ ] Loading state shows skeletons
- [ ] Empty state shows message
- [ ] AutoSizer fills container

---

### Task 2.5: Create FAB Component with Throttled Scroll

**Description:** Build floating action button with scroll-aware visibility
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.2 (z-40)
**Can run parallel with:** Task 2.4

**Technical Requirements:**
- Fixed position bottom-right, above bottom nav
- Hide on scroll down, show on scroll up
- Throttled scroll handler (100ms)
- Gold background with plus icon
- 56px size for touch target

**Implementation:**

```typescript
// src/components/ui/FAB.tsx
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

**Acceptance Criteria:**
- [ ] FAB positioned bottom-right
- [ ] 16px margin from edges
- [ ] Above bottom nav (bottom-20)
- [ ] Hidden on desktop (md:hidden)
- [ ] Hides on scroll down
- [ ] Shows on scroll up or near top
- [ ] Scroll handler throttled to 100ms
- [ ] Gold background with shadow
- [ ] 56px size (w-14 h-14)
- [ ] Accessible label

---

### Task 2.6: Create FilterDrawer Component

**Description:** Build bottom sheet filter drawer for mobile
**Size:** Medium
**Priority:** High
**Dependencies:** None (uses existing Sheet component)
**Can run parallel with:** Task 2.5

**Technical Requirements:**
- Bottom sheet (side="bottom")
- 70% viewport height
- Rounded top corners
- Active filter count badge
- Clear All and Apply buttons

**Implementation:**

```typescript
// src/components/ui/FilterDrawer.tsx
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

**Acceptance Criteria:**
- [ ] Opens from bottom
- [ ] 70% viewport height
- [ ] Rounded top corners (rounded-t-2xl)
- [ ] Shows active filter count
- [ ] Clear All button clears filters
- [ ] Apply button closes drawer
- [ ] Content area scrollable
- [ ] Dark theme styling

---

### Task 2.7: Add Sticky Search Header to ContactCardList

**Description:** Add sticky search bar with filter button to contact list
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.6 (FilterDrawer)
**Can run parallel with:** None (finishes Phase 2)

**Technical Requirements:**
- Sticky at top (z-30)
- Search input with icon
- Filter button with active count badge
- Safe area padding at top

**Implementation:**

Add to ContactCardList above the list:

```typescript
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterDrawer } from '@/components/ui/FilterDrawer';

// In component:
const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

// Before the list content:
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

<FilterDrawer
  isOpen={filterDrawerOpen}
  onOpenChange={setFilterDrawerOpen}
  activeFilters={activeFilters}
  onClearAll={onClearAllFilters}
>
  {/* Filter options */}
</FilterDrawer>
```

**Acceptance Criteria:**
- [ ] Search bar sticky at top
- [ ] Z-index 30 (below nav elements)
- [ ] Search icon inside input
- [ ] Filter button opens drawer
- [ ] Badge shows active filter count
- [ ] 44px touch targets (h-11)
- [ ] Safe area padding at top

---

### Task 2.8: Integrate FAB on Contacts Page

**Description:** Add FAB for "Add Contact" action on contacts page
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.5 (FAB)
**Can run parallel with:** Task 2.7

**Implementation:**

Update contacts page:

```typescript
import { FAB } from '@/components/ui/FAB';
import { Plus } from 'lucide-react';

// In component:
const router = useRouter();

// In JSX:
<FAB
  icon={<Plus className="h-6 w-6 text-black" />}
  label="Add contact"
  onClick={() => router.push('/contacts/new')}
/>
```

**Acceptance Criteria:**
- [ ] FAB visible on contacts page mobile view
- [ ] Plus icon in gold button
- [ ] Navigates to /contacts/new on tap
- [ ] Hides/shows based on scroll
- [ ] Hidden on desktop

---

## Phase 3: Progressive Features (Days 8-10)

### Task 3.1: Add Expandable State to ContactCard

**Description:** Update ContactCard to support expanded/collapsed states
**Size:** Medium
**Priority:** Medium
**Dependencies:** Phase 2 complete
**Can run parallel with:** None

**Technical Requirements:**
- Add isExpanded and onExpand props
- Animate expansion with maxHeight (not height: auto)
- Show additional fields when expanded: email, phone, location, tags
- Action buttons: View Profile, Enrich
- Chevron rotates on expand

**Implementation:**

Update `src/components/contacts/ContactCard.tsx`:

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
        <Avatar className="h-11 w-11 flex-shrink-0">
          <AvatarFallback
            style={{ background: getAvatarColor(contact) }}
            className="text-sm font-medium text-white/90"
          >
            {getInitials(contact)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white truncate">
              {getDisplayName(contact)}
            </h3>
            <ChevronRight
              className={cn(
                'h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
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

      {/* Expanded content - uses maxHeight for performance */}
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

**Acceptance Criteria:**
- [ ] Card expands on tap when onExpand provided
- [ ] Chevron rotates 90 degrees on expand
- [ ] Expanded shows email, phone, location
- [ ] Tags displayed (max 3 + count)
- [ ] View Profile navigates to detail
- [ ] Enrich button triggers enrichment
- [ ] Animation uses maxHeight (not height: auto)
- [ ] Only one card expanded at a time

---

### Task 3.2: Add Expansion State Management to ContactCardList

**Description:** Manage which card is expanded in the list
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.1
**Can run parallel with:** None

**Technical Requirements:**
- Track expandedId state
- Memoized handleExpand callback
- Pass isExpanded and onExpand to ContactCard
- Collapse previous card when expanding new one

**Implementation:**

Update ContactCardList:

```typescript
import { useState, useCallback } from 'react';

// In component:
const [expandedId, setExpandedId] = useState<string | null>(null);

const handleExpand = useCallback((contactId: string) => {
  setExpandedId((prev) => (prev === contactId ? null : contactId));
}, []);

const handleEnrich = useCallback((contactId: string) => {
  router.push(`/enrichment/session?contactId=${contactId}`);
}, [router]);

// Update Row renderer:
const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
  const contact = contacts[index];
  return (
    <div style={{ ...style, paddingLeft: 16, paddingRight: 16, paddingBottom: CARD_GAP }}>
      <ContactCard
        contact={contact}
        isExpanded={expandedId === contact.id}
        onExpand={handleExpand}
        onEnrich={handleEnrich}
      />
    </div>
  );
}, [contacts, expandedId, handleExpand, handleEnrich]);
```

**Note:** With expansion, card heights vary. May need VariableSizeList for proper virtualization.

**Acceptance Criteria:**
- [ ] Tap expands card
- [ ] Tap again collapses card
- [ ] Expanding one collapses previous
- [ ] Callbacks are memoized
- [ ] Performance remains good with expansion

---

### Task 3.3: Integrate SwipeableCard into ContactCard

**Description:** Wrap ContactCard with SwipeableCard for swipe-to-enrich
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.2 (SwipeableCard), Task 3.1 (expanded ContactCard)
**Can run parallel with:** Task 3.2

**Technical Requirements:**
- Wrap card content in SwipeableCard
- Swipe right triggers onEnrich
- Disabled when expanded (to prevent conflicts)

**Implementation:**

Update ContactCard to use SwipeableCard:

```typescript
import { SwipeableCard } from '@/components/ui/SwipeableCard';

// In ContactCard component:
return (
  <SwipeableCard
    onSwipeRight={() => onEnrich?.(contact.id)}
    actionLabel="Enrich"
    disabled={isExpanded}
  >
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      // ... rest of card content
    >
      {/* Card content */}
    </div>
  </SwipeableCard>
);
```

**Acceptance Criteria:**
- [ ] Swipe right shows Enrich action
- [ ] Swipe triggers onEnrich callback
- [ ] Swipe disabled when card is expanded
- [ ] Tap still works for expand/navigate
- [ ] No gesture conflicts

---

### Task 3.4: Final Integration Testing and Polish

**Description:** Complete integration testing and fix any issues
**Size:** Medium
**Priority:** High
**Dependencies:** All previous tasks
**Can run parallel with:** None (final task)

**Testing Checklist:**

**Phase 1 Verification:**
- [ ] Bottom nav displays on mobile, hidden on desktop
- [ ] Bottom nav handles safe-area-inset-bottom on iPhone
- [ ] Active nav state shows gold accent
- [ ] Contact cards display correctly (collapsed)
- [ ] Tapping card navigates to detail page
- [ ] All touch targets are minimum 44x44px
- [ ] OLED background color is #121212
- [ ] Text contrast meets accessibility standards

**Phase 2 Verification:**
- [ ] Pull-to-refresh triggers data reload
- [ ] Pull indicator shows correctly
- [ ] Swipe right on card triggers enrich action
- [ ] FAB appears on contacts page
- [ ] FAB hides on scroll down, shows on scroll up
- [ ] Search bar is sticky at top
- [ ] Filter drawer opens from bottom
- [ ] Virtualized list scrolls smoothly with 100+ contacts

**Phase 3 Verification:**
- [ ] Tap to expand card works
- [ ] Expanded card shows all fields
- [ ] Chevron rotates on expand
- [ ] Expand animation is smooth
- [ ] Only one card expanded at a time

**Performance:**
- [ ] Lighthouse Mobile score >90
- [ ] No jank during scroll
- [ ] Virtualized list maintains 60fps

**Acceptance Criteria:**
- [ ] All manual tests pass
- [ ] No TypeScript errors
- [ ] No hydration warnings
- [ ] Build succeeds
- [ ] No console errors

---

## Summary

| Phase | Tasks | Est. Days |
|-------|-------|-----------|
| Phase 1: Foundation | 11 tasks | 4 days |
| Phase 2: Interactions | 8 tasks | 3 days |
| Phase 3: Progressive | 4 tasks | 3 days |
| **Total** | **23 tasks** | **10 days** |

### Critical Path

1. Task 1.1 (useMediaQuery) → Task 1.4 (BottomNav) → Task 1.5 (Layout)
2. Task 1.6 (ContactCard) → Task 1.7 (CardList) → Task 1.8 (ContactsView) → Task 1.11 (Integration)
3. Task 2.2 (SwipeableCard) + Task 2.3 (PullToRefresh) → Task 2.4 (Virtualization)
4. Task 3.1 (Expandable Card) → Task 3.2 (State Management) → Task 3.3 (Swipe Integration)

### Parallel Execution Opportunities

**Phase 1:**
- Tasks 1.1, 1.2, 1.3 can run in parallel
- Tasks 1.4, 1.6 can run in parallel
- Tasks 1.7, 1.8, 1.9 can run in parallel

**Phase 2:**
- Tasks 2.1, 2.2, 2.3 can run in parallel
- Tasks 2.4, 2.5, 2.6 can run in parallel
- Tasks 2.7, 2.8 can run in parallel

### Dependencies to Install

```bash
npm install react-window @types/react-window react-virtualized-auto-sizer @types/react-virtualized-auto-sizer
```
