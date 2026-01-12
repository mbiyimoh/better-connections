# "What's New" Update Notifications System - Specification

**Slug:** whats-new-update-notifications
**Author:** Claude Code
**Date:** 2026-01-11
**Status:** Ready for Implementation
**Ideation:** [01-ideation.md](./01-ideation.md)

---

## Overview

A system to show users a "What's New" popup modal when new features are released. The modal displays a bite-sized bullet summary with expandable details and tracks whether users have seen each update.

### User Stories

1. **As a user**, I want to see what's new when I log in after an update, so I know about new features
2. **As a user**, I want to expand bullet points to see more details without leaving the modal
3. **As a developer**, I want Claude Code to create update checkpoints from natural language descriptions

### Decisions from Ideation

| Decision | Choice |
|----------|--------|
| User tracking | Database column `lastSeenUpdateVersion` + localStorage cache |
| Content storage | Static markdown files in `/updates/YYYY-MM-DD-slug.md` |
| Version scheme | Date-based (`"2026-01-15"`) |
| Re-access past updates | Deferred to V2 |
| Multiple missed updates | Show only the latest |
| Modal dismissibility | Yes - click outside/Escape allowed |
| Track partial reads | No - just track seen/dismissed |
| "Don't show again" option | No - always show new updates |

### Dependencies

**Required package:** `gray-matter` (frontmatter parsing)
```bash
npm install gray-matter
```

---

## 1. Database Schema

### 1.1 User Model Update

Add a single field to track the last seen update version:

```prisma
model User {
  // ... existing fields ...
  lastSeenUpdateVersion String?  // ISO date string, e.g., "2026-01-15"
}
```

**Migration:** Non-destructive, nullable field with no default.

---

## 2. Update Content Structure

### 2.1 File Location

Updates are stored as markdown files in the `/updates/` directory at the project root:

```
/updates/
  2026-01-11-contact-research.md
  2026-01-15-bulk-actions.md
  index.ts
```

### 2.2 Markdown File Format

Each update file follows this structure:

```markdown
---
version: "2026-01-11"
title: "AI-Powered Contact Research"
published: true
---

## Summary

- **Research contacts with AI** - Automatically find information about your contacts from the web
- **Review recommendations** - Approve, reject, or edit AI suggestions before applying
- **Track improvements** - See your enrichment score increase in real-time

## Details

### Research contacts with AI

We've added a powerful new research feature that uses AI to search the web for information about your contacts. Simply click the "Research" button on any contact's detail page to get started.

The AI will search for:
- Professional background and current role
- Recent news and publications
- Areas of expertise and interests
- Reasons why now might be a good time to reconnect

### Review recommendations

After research completes, you'll see a list of recommendations. Each recommendation shows:
- The field being updated (e.g., "Job Role", "Company")
- The proposed value with confidence score
- The reasoning behind the suggestion
- Source links for verification

You can approve, reject, or edit each recommendation before applying.

### Track improvements

When you apply recommendations, you'll see a celebration showing:
- Your contact's enrichment score improvement
- Their new ranking among your contacts
- A summary of changes made
```

### 2.3 Frontmatter Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | ISO date string (YYYY-MM-DD), used for comparison |
| `title` | string | Yes | Display title for the update |
| `published` | boolean | Yes | Whether to show this update (false = draft) |

### 2.4 Content Sections

**Summary Section (Required):**
- Bullet list format with `**bold title**` followed by description
- Each bullet becomes an expandable item in the modal
- Keep to 3-5 bullets maximum

**Details Section (Required):**
- H3 headings (`###`) must match the bold titles from Summary
- Content under each heading is shown when user expands that bullet
- Supports full markdown (paragraphs, lists, code blocks, etc.)

### 2.5 Index File

`/updates/index.ts` exports all updates for easy importing:

```typescript
import { Update } from '@/lib/updates/types';

// Import all update files (parsed at build time)
import contactResearch from './2026-01-11-contact-research.md';
import bulkActions from './2026-01-15-bulk-actions.md';

export const updates: Update[] = [
  bulkActions,      // Most recent first
  contactResearch,
];

export const latestUpdate = updates.find(u => u.published) || null;
```

---

## 3. Type Definitions

### 3.1 Core Types

```typescript
// /src/lib/updates/types.ts

export interface UpdateSummaryItem {
  id: string;           // Generated from title (kebab-case)
  title: string;        // Bold text from bullet
  summary: string;      // Text after the bold title
  details: string;      // Markdown content from Details section
}

export interface Update {
  version: string;      // "2026-01-11"
  title: string;        // "AI-Powered Contact Research"
  published: boolean;
  items: UpdateSummaryItem[];
}
```

---

## 4. API Endpoints

### 4.1 Mark Update as Seen

**Endpoint:** `PATCH /api/user/seen-update`

**Request Body:**
```typescript
{
  version: string;  // The update version being marked as seen
}
```

**Response:**
```typescript
{
  success: true;
  lastSeenUpdateVersion: string;
}
```

**Logic:**
1. Authenticate user via Supabase
2. Update `user.lastSeenUpdateVersion` to the provided version
3. Return success

**Error Cases:**
- 401: Not authenticated
- 400: Invalid version format

---

## 5. Components

### 5.1 WhatsNewModal

**Location:** `src/components/whats-new/WhatsNewModal.tsx`

**Props:**
```typescript
interface WhatsNewModalProps {
  update: Update;
  isOpen: boolean;
  onClose: () => void;
  onMarkSeen: (version: string) => Promise<void>;
}
```

**Behavior:**
- Opens automatically when `isOpen` is true
- Dismissible via click outside, Escape key, or "Got it" button
- Calls `onMarkSeen` when closed (any method)
- Shows update title in header
- Renders summary items as expandable accordions (inline, not separate component)
- Footer contains "Got it" button

**UI Structure:**
```
┌─────────────────────────────────────────────┐
│  ✨ What's New                          [X] │
│  AI-Powered Contact Research                │
├─────────────────────────────────────────────┤
│                                             │
│  ▸ Research contacts with AI                │
│    Automatically find information...        │
│                                             │
│  ▾ Review recommendations                   │
│    Approve, reject, or edit AI...           │
│    ┌─────────────────────────────────────┐  │
│    │ After research completes, you'll   │  │
│    │ see a list of recommendations...   │  │
│    └─────────────────────────────────────┘  │
│                                             │
│  ▸ Track improvements                       │
│    See your enrichment score...             │
│                                             │
├─────────────────────────────────────────────┤
│              [ Got it! ]                    │
└─────────────────────────────────────────────┘
```

**Styling:**
- Dark theme background (`bg-secondary`)
- Gold accent for "What's New" sparkle icon and "Got it" button
- Framer Motion animations for expand/collapse
- Max height with scroll for long content
- Uses existing shadcn/ui Dialog component

**Accordion Item (inline):**
- Displays title (bold) and summary always visible
- ChevronRight/ChevronDown indicator for expand/collapse state
- AnimatePresence for smooth expand/collapse of details
- Details rendered as markdown (use existing markdown renderer if available, otherwise simple prose)

---

## 6. Integration Points

### 6.1 Dashboard Layout Integration

**IMPORTANT:** The dashboard layout is a **Server Component**. We need a client wrapper.

**New File:** `src/components/whats-new/WhatsNewProvider.tsx`

This client component wraps the modal logic:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { WhatsNewModal } from './WhatsNewModal';
import type { Update } from '@/lib/updates/types';

interface WhatsNewProviderProps {
  latestUpdate: Update | null;
  userLastSeenVersion: string | null;
}

export function WhatsNewProvider({
  latestUpdate,
  userLastSeenVersion
}: WhatsNewProviderProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!latestUpdate) return;

    // Check localStorage first for instant feedback
    const localLastSeen = localStorage.getItem('lastSeenUpdateVersion');
    const lastSeen = userLastSeenVersion || localLastSeen;

    if (!lastSeen || latestUpdate.version > lastSeen) {
      setShowModal(true);
    }
  }, [latestUpdate, userLastSeenVersion]);

  const handleMarkSeen = async (version: string) => {
    // Update localStorage immediately
    localStorage.setItem('lastSeenUpdateVersion', version);

    // Update database
    await fetch('/api/user/seen-update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });

    setShowModal(false);
  };

  if (!latestUpdate || !showModal) return null;

  return (
    <WhatsNewModal
      update={latestUpdate}
      isOpen={showModal}
      onClose={() => handleMarkSeen(latestUpdate.version)}
      onMarkSeen={handleMarkSeen}
    />
  );
}
```

**File:** `src/app/(dashboard)/layout.tsx`

**Changes:**
1. Add `lastSeenUpdateVersion` to the User query select
2. Import and call `getLatestUpdate()` (server-side)
3. Render `<WhatsNewProvider>` with props

```typescript
// Add to existing query
const dbUser = await prisma.user.findUnique({
  where: { id: user.id },
  select: {
    hasCompletedOnboarding: true,
    lastSeenUpdateVersion: true,  // NEW
  },
});

// Import update (at top of file)
import { getLatestUpdate } from '@/lib/updates';
import { WhatsNewProvider } from '@/components/whats-new/WhatsNewProvider';

// Get latest update (server-side)
const latestUpdate = getLatestUpdate();

// In return, after AppShell children:
<WhatsNewProvider
  latestUpdate={latestUpdate}
  userLastSeenVersion={dbUser?.lastSeenUpdateVersion ?? null}
/>
```

### 6.2 LocalStorage Caching

To avoid showing the modal while waiting for database response:

```typescript
// On app load
const localLastSeen = localStorage.getItem('lastSeenUpdateVersion');

// When marking as seen
localStorage.setItem('lastSeenUpdateVersion', version);

// Comparison logic
const shouldShowModal = latestUpdate.version > (serverLastSeen || localLastSeen || '');
```

---

## 7. Update Parser

### 7.1 Parser Implementation

**File:** `src/lib/updates/parser.ts`

```typescript
import matter from 'gray-matter';
import { Update, UpdateSummaryItem } from './types';

export function parseUpdateMarkdown(markdown: string): Update {
  const { data, content } = matter(markdown);

  // Extract summary items from ## Summary section
  const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=## Details|$)/);
  const detailsMatch = content.match(/## Details\n([\s\S]*?)$/);

  const summaryItems = parseSummaryBullets(summaryMatch?.[1] || '');
  const detailsMap = parseDetailsHeadings(detailsMatch?.[1] || '');

  // Match summary items with their details
  const items: UpdateSummaryItem[] = summaryItems.map(item => ({
    ...item,
    details: detailsMap[item.title] || '',
  }));

  return {
    version: data.version,
    title: data.title,
    published: data.published,
    items,
    rawMarkdown: markdown,
  };
}

function parseSummaryBullets(summaryContent: string): Omit<UpdateSummaryItem, 'details'>[] {
  const bulletRegex = /^- \*\*(.+?)\*\* - (.+)$/gm;
  const items: Omit<UpdateSummaryItem, 'details'>[] = [];

  let match;
  while ((match = bulletRegex.exec(summaryContent)) !== null) {
    items.push({
      id: toKebabCase(match[1]),
      title: match[1],
      summary: match[2],
    });
  }

  return items;
}

function parseDetailsHeadings(detailsContent: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingRegex = /### (.+)\n([\s\S]*?)(?=### |$)/g;

  let match;
  while ((match = headingRegex.exec(detailsContent)) !== null) {
    sections[match[1]] = match[2].trim();
  }

  return sections;
}

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
```

### 7.2 Get Updates (Server-Side)

**File:** `src/lib/updates/index.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { parseUpdateMarkdown } from './parser';
import type { Update } from './types';

let cachedUpdates: Update[] | null = null;

export function getAllUpdates(): Update[] {
  if (cachedUpdates) return cachedUpdates;

  const updatesDir = path.join(process.cwd(), 'updates');

  if (!fs.existsSync(updatesDir)) {
    return [];
  }

  const files = fs.readdirSync(updatesDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first (date-prefixed filenames)

  cachedUpdates = files
    .map(filename => {
      const content = fs.readFileSync(path.join(updatesDir, filename), 'utf-8');
      try {
        return parseUpdateMarkdown(content);
      } catch {
        console.warn(`Failed to parse update: ${filename}`);
        return null;
      }
    })
    .filter((u): u is Update => u !== null && u.published);

  return cachedUpdates;
}

export function getLatestUpdate(): Update | null {
  const updates = getAllUpdates();
  return updates[0] ?? null;
}
```

**Note:** Uses filesystem at build/runtime. Updates cached in memory after first read.

---

## 8. Claude Code Slash Command

### 8.1 Command Definition

**File:** `.claude/commands/create-product-update.md`

```markdown
---
description: Create a new product update checkpoint for the What's New modal
---

# Create Product Update

Create a new product update file based on the user's description of recent improvements.

## Instructions

1. Generate a filename using today's date and a slug: `YYYY-MM-DD-{slug}.md`
2. Create the file in `/updates/` directory
3. Follow the exact markdown format with frontmatter, Summary, and Details sections
4. Each bullet in Summary must have a matching H3 in Details
5. Keep summary bullets concise (under 100 characters)
6. Write details in a friendly, informative tone
7. Update `/updates/index.ts` to include the new update

## Template

```markdown
---
version: "{YYYY-MM-DD}"
title: "{Title}"
published: true
---

## Summary

- **{Feature 1}** - {Brief description}
- **{Feature 2}** - {Brief description}

## Details

### {Feature 1}

{Detailed explanation with markdown formatting}

### {Feature 2}

{Detailed explanation with markdown formatting}
```

## User Input

{$ARGUMENTS}
```

---

## 9. File Structure Summary

```
/updates/
  2026-01-11-contact-research.md    # First example update

/src/lib/updates/
  types.ts                           # Update, UpdateSummaryItem types
  parser.ts                          # parseUpdateMarkdown + helpers
  index.ts                           # getLatestUpdate, getAllUpdates

/src/components/whats-new/
  WhatsNewModal.tsx                  # Main modal with inline accordion items
  WhatsNewProvider.tsx               # Client wrapper for layout integration
  index.ts                           # Barrel exports

/src/app/api/user/seen-update/
  route.ts                           # PATCH endpoint

/.claude/commands/
  create-product-update.md           # Slash command for creating updates
```

---

## 10. Testing Checklist

### Manual Testing
- [ ] Modal shows when user has unseen update (first dashboard load)
- [ ] Modal does not show when user has seen latest version
- [ ] "Got it" button marks update as seen and closes modal
- [ ] Clicking outside closes and marks as seen
- [ ] Escape key closes and marks as seen
- [ ] Accordion items expand/collapse smoothly
- [ ] Details markdown renders correctly
- [ ] localStorage syncs with database value
- [ ] Cross-device: marking seen on one device prevents modal on another

---

## 11. Implementation Phases

### Phase 1: Foundation (1.5 hours)
- Install `gray-matter` dependency
- Prisma schema migration (`lastSeenUpdateVersion`)
- Type definitions (`src/lib/updates/types.ts`)
- Update parser (`src/lib/updates/parser.ts`)
- Get updates helper (`src/lib/updates/index.ts`)
- First example update file

### Phase 2: Modal Component (2 hours)
- WhatsNewModal with inline accordion items
- WhatsNewProvider client wrapper
- Framer Motion animations for expand/collapse
- Styling to match design system (dark + gold)

### Phase 3: Integration (1.5 hours)
- API route `PATCH /api/user/seen-update`
- Dashboard layout integration
- LocalStorage caching logic

### Phase 4: Developer Workflow (30 min)
- Claude Code slash command
- Documentation in CLAUDE.md

**Total Estimated: 5-6 hours**

---

## 12. Future Enhancements (Out of Scope for V1)

- Past updates list / "View past updates" link
- Settings page "View What's New" button
- Full changelog page at `/updates`
- Badge indicator in sidebar for unseen updates
- Email notification when major updates ship
- Analytics on update engagement
