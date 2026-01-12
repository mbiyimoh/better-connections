# Task Breakdown: What's New Update Notifications

**Generated:** 2026-01-11
**Source:** specs/whats-new-update-notifications/02-spec.md
**Mode:** Full
**Last Decompose:** 2026-01-11

---

## Overview

A system to show users a "What's New" popup modal when new features are released. Shows bullet summaries with expandable details, tracks user view state in database + localStorage.

---

## Phase 1: Foundation

### Task 1.1: Install dependency and update Prisma schema

**Description:** Install gray-matter package and add lastSeenUpdateVersion field to User model
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** None (foundation)

**Implementation Steps:**
1. Install gray-matter: `npm install gray-matter`
2. Add field to prisma/schema.prisma:
```prisma
model User {
  // ... existing fields ...
  lastSeenUpdateVersion String?  // ISO date string, e.g., "2026-01-15"
}
```
3. Run migration: `npx prisma migrate dev --name add-last-seen-update-version`
4. Verify with Prisma Studio

**Acceptance Criteria:**
- [ ] gray-matter installed and in package.json
- [ ] User model has lastSeenUpdateVersion field (nullable String)
- [ ] Migration applied successfully
- [ ] No type errors in Prisma client

---

### Task 1.2: Create type definitions

**Description:** Create TypeScript types for Update and UpdateSummaryItem
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**File:** `src/lib/updates/types.ts`

**Implementation:**
```typescript
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

**Acceptance Criteria:**
- [ ] Types exported from src/lib/updates/types.ts
- [ ] No TypeScript errors
- [ ] Types match spec exactly

---

### Task 1.3: Implement markdown parser

**Description:** Create parser to extract frontmatter and match summary bullets to detail sections
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2

**File:** `src/lib/updates/parser.ts`

**Implementation:**
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

**Acceptance Criteria:**
- [ ] Parser extracts frontmatter (version, title, published)
- [ ] Parser extracts summary bullets with bold titles
- [ ] Parser matches summary items to detail sections by title
- [ ] toKebabCase generates valid IDs
- [ ] Handles missing sections gracefully

---

### Task 1.4: Create get updates helper

**Description:** Server-side helper to read and parse update files from /updates directory
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3

**File:** `src/lib/updates/index.ts`

**Implementation:**
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

export type { Update, UpdateSummaryItem } from './types';
```

**Acceptance Criteria:**
- [ ] getAllUpdates reads all .md files from /updates
- [ ] Files sorted by filename (date prefix) descending
- [ ] Only published updates returned
- [ ] getLatestUpdate returns most recent published update
- [ ] Caching works (same result on multiple calls)
- [ ] Handles missing directory gracefully

---

### Task 1.5: Create first example update file

**Description:** Create the example update markdown file documenting recent features
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1-1.4

**File:** `updates/2026-01-11-contact-research.md`

**Implementation:**
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

**Acceptance Criteria:**
- [ ] File created in /updates directory
- [ ] Frontmatter has version, title, published fields
- [ ] Summary section has 3 bullets with **bold** titles
- [ ] Details section has matching H3 headings
- [ ] Parser can successfully parse this file

---

## Phase 2: Modal Component

### Task 2.1: Create WhatsNewModal component

**Description:** Main modal with expandable accordion items, "Got it" button, and dark+gold styling
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.2

**File:** `src/components/whats-new/WhatsNewModal.tsx`

**Props:**
```typescript
interface WhatsNewModalProps {
  update: Update;
  isOpen: boolean;
  onClose: () => void;
  onMarkSeen: (version: string) => Promise<void>;
}
```

**Implementation Requirements:**
- Use shadcn/ui Dialog component as base
- Dark theme: bg-secondary background
- Gold accent (#d4a54a) for sparkle icon and "Got it" button
- Framer Motion AnimatePresence for accordion expand/collapse
- ChevronRight/ChevronDown for expand state
- Max height with overflow-y-auto for scrolling
- Escape key and click outside call onMarkSeen then close
- "Got it" button calls onMarkSeen then closes
- Sparkles icon (from lucide-react) in header

**UI Structure:**
```
┌─────────────────────────────────────────────┐
│  ✨ What's New                          [X] │
│  {update.title}                             │
├─────────────────────────────────────────────┤
│                                             │
│  ▸ {item.title}                             │
│    {item.summary}                           │
│                                             │
│  ▾ {item.title} (expanded)                  │
│    {item.summary}                           │
│    ┌─────────────────────────────────────┐  │
│    │ {item.details as markdown}         │  │
│    └─────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│              [ Got it! ]                    │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Modal opens/closes correctly
- [ ] Accordion items expand/collapse with animation
- [ ] "Got it" button styled with gold accent
- [ ] Sparkle icon in header
- [ ] Dark theme styling matches design system
- [ ] Click outside/Escape marks as seen and closes
- [ ] Details rendered as markdown prose
- [ ] Scrollable when content is long

---

### Task 2.2: Create WhatsNewProvider client wrapper

**Description:** Client component to wrap modal logic for Server Component layout integration
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1

**File:** `src/components/whats-new/WhatsNewProvider.tsx`

**Implementation:**
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

**Acceptance Criteria:**
- [ ] 'use client' directive at top
- [ ] Checks localStorage on mount
- [ ] Compares versions correctly (string comparison)
- [ ] Updates localStorage immediately on dismiss
- [ ] Calls API to persist to database
- [ ] Returns null if no update or already seen

---

### Task 2.3: Create barrel exports

**Description:** Create index.ts for clean imports
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.1, Task 2.2

**File:** `src/components/whats-new/index.ts`

**Implementation:**
```typescript
export { WhatsNewModal } from './WhatsNewModal';
export { WhatsNewProvider } from './WhatsNewProvider';
```

**Acceptance Criteria:**
- [ ] Both components exported
- [ ] Imports work from '@/components/whats-new'

---

## Phase 3: Integration

### Task 3.1: Create API route for marking updates as seen

**Description:** PATCH endpoint to update user's lastSeenUpdateVersion in database
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1

**File:** `src/app/api/user/seen-update/route.ts`

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { version } = body;

    // Validate version format (YYYY-MM-DD)
    if (!version || !/^\d{4}-\d{2}-\d{2}$/.test(version)) {
      return NextResponse.json(
        { error: 'Invalid version format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenUpdateVersion: version },
    });

    return NextResponse.json({
      success: true,
      lastSeenUpdateVersion: version,
    });
  } catch (error) {
    console.error('Error updating seen update version:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Returns 401 if not authenticated
- [ ] Returns 400 if version format invalid
- [ ] Updates user.lastSeenUpdateVersion in database
- [ ] Returns success response with version
- [ ] Handles errors gracefully

---

### Task 3.2: Integrate with dashboard layout

**Description:** Add WhatsNewProvider to dashboard layout, fetch lastSeenUpdateVersion
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4, Task 2.2, Task 3.1

**File:** `src/app/(dashboard)/layout.tsx`

**Changes Required:**
1. Add `lastSeenUpdateVersion` to the User query select
2. Import and call `getLatestUpdate()` (server-side)
3. Render `<WhatsNewProvider>` after AppShell children

**Implementation:**
```typescript
// Add imports at top
import { getLatestUpdate } from '@/lib/updates';
import { WhatsNewProvider } from '@/components/whats-new';

// Modify the existing Promise.all to include lastSeenUpdateVersion
const [dbUser, totalContacts, enrichQueue] = await Promise.all([
  prisma.user.findUnique({
    where: { id: user.id },
    select: {
      hasCompletedOnboarding: true,
      lastSeenUpdateVersion: true,  // ADD THIS
    },
  }),
  prisma.contact.count({
    where: { userId: user.id },
  }),
  prisma.contact.count({
    where: {
      userId: user.id,
      enrichmentScore: { lt: 50 },
    },
  }),
]);

// Get latest update (server-side)
const latestUpdate = getLatestUpdate();

// In the return, add after AppShell closing tag but inside the fragment:
return (
  <>
    <AppShell ...>
      {children}
      <FeedbackButton hideOnMobile />
    </AppShell>
    <WhatsNewProvider
      latestUpdate={latestUpdate}
      userLastSeenVersion={dbUser?.lastSeenUpdateVersion ?? null}
    />
  </>
);
```

**Acceptance Criteria:**
- [ ] lastSeenUpdateVersion fetched from database
- [ ] getLatestUpdate called server-side
- [ ] WhatsNewProvider rendered with correct props
- [ ] Modal shows for users with unseen updates
- [ ] Modal doesn't show for users who've seen latest
- [ ] No hydration errors

---

## Phase 4: Developer Workflow

### Task 4.1: Create Claude Code slash command

**Description:** Create slash command for generating new product updates
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 1.5

**File:** `.claude/commands/create-product-update.md`

**Implementation:**
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

## Template

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

## User Input

{$ARGUMENTS}
```

**Acceptance Criteria:**
- [ ] Command file created in .claude/commands/
- [ ] Has description in frontmatter
- [ ] Instructions are clear
- [ ] Template matches spec format

---

### Task 4.2: Update CLAUDE.md documentation

**Description:** Add What's New pattern documentation to CLAUDE.md
**Size:** Small
**Priority:** Low
**Dependencies:** All other tasks

**Changes to CLAUDE.md:**

Add new section under "Agent Protocols & Patterns":

```markdown
### What's New Update Notifications Pattern

**Purpose:** Show users new features via popup modal on first login after update.

**Files:**
- `/updates/YYYY-MM-DD-slug.md` - Update content files
- `src/lib/updates/` - Parser and helpers
- `src/components/whats-new/` - Modal and provider components
- `src/app/api/user/seen-update/route.ts` - Mark seen API

**Creating new updates:**
Use `/create-product-update` slash command or create manually:

```markdown
---
version: "2026-01-15"
title: "Feature Title"
published: true
---

## Summary

- **Feature name** - Brief description

## Details

### Feature name

Detailed explanation...
```

**Gotchas:**
- Version must be YYYY-MM-DD format
- Summary bullet titles must match Details H3 headings exactly
- Files sorted by filename, so date prefix ensures order
- Dashboard layout is Server Component - modal logic in WhatsNewProvider client component
```

**Acceptance Criteria:**
- [ ] Pattern documented in CLAUDE.md
- [ ] Includes file locations
- [ ] Includes usage instructions
- [ ] Includes gotchas

---

## Execution Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 1.1-1.5 | Foundation: deps, schema, types, parser, example |
| Phase 2 | 2.1-2.3 | Modal: component, provider, exports |
| Phase 3 | 3.1-3.2 | Integration: API route, layout |
| Phase 4 | 4.1-4.2 | Workflow: slash command, docs |

**Parallel Opportunities:**
- Tasks 1.1 and 1.2 can run in parallel
- Task 1.5 can run in parallel with 1.1-1.4

**Critical Path:**
1.1 → 1.3 → 1.4 → 3.2 (database → parser → helper → layout integration)

**Total Tasks:** 9
