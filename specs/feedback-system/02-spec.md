# Feedback System Specification

**Slug:** feedback-system
**Author:** Claude Code
**Date:** 2026-01-09
**Status:** Draft
**Related:** `specs/feedback-system/01-ideation.md`, `feedback-system-better-contacts/`

---

## 1. Overview

### 1.1 Purpose
Implement a user feedback system for Better Connections that allows users to submit feedback (bugs, feature requests, ideas, questions), view existing feedback, and upvote entries they support. The system owner (SYSTEM_ADMIN role) can manage feedback status inline.

### 1.2 Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| FAB Position | Bottom-right | Standard mobile pattern; replaces existing "Add Contact" FAB |
| Add Contact Action | Tile at top of contact list | Frees FAB for feedback; visually consistent |
| Feedback Portal | `/feedback` route | Dedicated page, clean UX |
| Navigation | FAB only | No sidebar clutter; always accessible |
| File Storage | Supabase Storage | Centralized with existing infrastructure |
| Admin Access | Role-based (SYSTEM_ADMIN) | Inline status editing for admins only |

### 1.3 Scope

**In Scope:**
- Feedback FAB (bottom-right, all dashboard pages)
- Feedback portal page (`/feedback`)
- Feedback submission form (area, type, title, description, screenshots)
- Feedback list with filtering and sorting
- Upvoting system with optimistic UI
- Role-based admin status management (inline on cards)
- File attachments via Supabase Storage
- "Add Contact" tile at top of contacts list
- Mobile-responsive design

**Out of Scope:**
- Email notifications
- AI duplicate detection
- Public roadmap
- Changelog integration
- Comments/replies on feedback

---

## 2. Data Models

### 2.1 Database Schema Changes

```prisma
// Add to prisma/schema.prisma

// ============================================================================
// User Role System
// ============================================================================

enum UserRole {
  USER          // Default - can submit feedback, vote
  SYSTEM_ADMIN  // Can change status, see admin controls
}

// Modify existing User model - add role field
model User {
  // ... existing fields ...
  role                    UserRole  @default(USER)

  // Add feedback relations
  feedbackSubmissions     Feedback[]
  feedbackVotes           FeedbackVote[]
}

// ============================================================================
// Feedback System Models
// ============================================================================

enum FeedbackArea {
  CONTACTS        // Contact management features
  ENRICHMENT      // Enrichment flow
  EXPLORE         // Chat exploration
  IMPORT_EXPORT   // CSV/VCF import/export
  MOBILE          // Mobile-specific issues
  OTHER           // Catch-all
}

enum FeedbackType {
  BUG             // Something is broken
  ENHANCEMENT     // Improvement to existing feature
  IDEA            // New feature suggestion
  QUESTION        // General question
}

enum FeedbackStatus {
  OPEN            // New, unreviewed
  IN_REVIEW       // Being evaluated
  PLANNED         // Accepted, will be implemented
  IN_PROGRESS     // Currently being worked on
  COMPLETED       // Done/shipped
  CLOSED          // Won't do / duplicate / invalid
}

model Feedback {
  id          String         @id @default(cuid())
  userId      String

  // Content
  title       String         @db.VarChar(200)
  description String         @db.Text

  // Categorization
  area        FeedbackArea
  type        FeedbackType
  status      FeedbackStatus @default(OPEN)

  // Metrics - denormalized for sorting performance
  upvoteCount Int            @default(0)

  // Timestamps
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  votes       FeedbackVote[]
  attachments FeedbackAttachment[]

  // Indexes for common queries
  @@index([userId])
  @@index([status])
  @@index([area])
  @@index([type])
  @@index([createdAt])
  @@index([upvoteCount])
}

model FeedbackVote {
  id         String   @id @default(cuid())
  feedbackId String
  visitorId  String   // Can be visitorId for anonymous or visitorId for logged-in
  createdAt  DateTime @default(now())

  // Relations
  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  // One vote per visitor per feedback
  @@unique([feedbackId, visitorId])
  @@index([feedbackId])
  @@index([visitorId])
}

model FeedbackAttachment {
  id         String   @id @default(cuid())
  feedbackId String

  // File metadata
  url        String   @db.Text
  filename   String   @db.VarChar(255)
  mimeType   String   @db.VarChar(100)
  sizeBytes  Int

  createdAt  DateTime @default(now())

  // Relations
  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  @@index([feedbackId])
}
```

### 2.2 Validation Schemas

```typescript
// src/lib/validations/feedback.ts

import { z } from 'zod';

export const FeedbackAreaSchema = z.enum([
  'CONTACTS',
  'ENRICHMENT',
  'EXPLORE',
  'IMPORT_EXPORT',
  'MOBILE',
  'OTHER'
]);

export const FeedbackTypeSchema = z.enum([
  'BUG',
  'ENHANCEMENT',
  'IDEA',
  'QUESTION'
]);

export const FeedbackStatusSchema = z.enum([
  'OPEN',
  'IN_REVIEW',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED'
]);

export const FeedbackAttachmentMetadataSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
});

export const CreateFeedbackSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be 200 characters or less')
    .transform(s => s.trim()),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be 5000 characters or less')
    .transform(s => s.trim()),
  area: FeedbackAreaSchema,
  type: FeedbackTypeSchema,
  attachments: z.array(FeedbackAttachmentMetadataSchema)
    .optional()
    .default([])
});

export const UpdateFeedbackStatusSchema = z.object({
  status: FeedbackStatusSchema
});

export const VoteActionSchema = z.object({
  action: z.enum(['upvote', 'remove'])
});

// Inferred types
export type FeedbackArea = z.infer<typeof FeedbackAreaSchema>;
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export type FeedbackAttachmentMetadata = z.infer<typeof FeedbackAttachmentMetadataSchema>;
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof UpdateFeedbackStatusSchema>;
export type VoteActionInput = z.infer<typeof VoteActionSchema>;
```

---

## 3. API Endpoints

### 3.1 Feedback CRUD

#### POST /api/feedback
Create new feedback submission.

**Auth:** Required (any authenticated user)

**Request Body:**
```typescript
{
  title: string;        // 5-200 chars
  description: string;  // 10-5000 chars
  area: FeedbackArea;
  type: FeedbackType;
  attachments?: FeedbackAttachmentMetadata[];
}
```

**Response (201):**
```typescript
{
  feedback: {
    id: string;
    title: string;
    description: string;
    area: FeedbackArea;
    type: FeedbackType;
    status: 'OPEN';
    upvoteCount: 0;
    createdAt: string;
    user: { id: string; name: string; };
    attachments: FeedbackAttachmentMetadata[];
  }
}
```

#### GET /api/feedback
List feedback with filtering and pagination.

**Auth:** Optional (public list)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| sort | 'popular' \| 'recent' \| 'oldest' | 'popular' | Sort order |
| area | FeedbackArea | - | Filter by area |
| type | FeedbackType | - | Filter by type |
| status | FeedbackStatus | non-CLOSED | Filter by status |
| limit | number | 50 | Max results (1-100) |
| cursor | string | - | Pagination cursor |

**Response (200):**
```typescript
{
  feedback: Array<{
    id: string;
    title: string;
    description: string;
    area: FeedbackArea;
    type: FeedbackType;
    status: FeedbackStatus;
    upvoteCount: number;
    hasUserUpvoted: boolean;
    createdAt: string;
    user: { id: string; name: string; };
    attachments: Array<{ url: string; filename: string; }>;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
}
```

#### GET /api/feedback/[id]
Get single feedback item.

**Auth:** Optional

**Response (200):** Same as single item in list

#### PATCH /api/feedback/[id]
Update feedback status.

**Auth:** Required (SYSTEM_ADMIN only)

**Request Body:**
```typescript
{
  status: FeedbackStatus;
}
```

**Response (200):** Updated feedback object

### 3.2 Voting

#### POST /api/feedback/[id]/vote
Toggle vote on feedback.

**Auth:** Required OR visitor ID cookie

**Request Body:**
```typescript
{
  action: 'upvote' | 'remove';
}
```

**Response (200):**
```typescript
{
  success: true;
  upvoteCount: number;
  hasUserUpvoted: boolean;
}
```

### 3.3 File Upload

#### POST /api/feedback/upload
Upload attachment to Supabase Storage.

**Auth:** Required

**Request:** `multipart/form-data` with `file` field

**Validation:**
- Max size: 5MB
- Allowed types: image/png, image/jpeg, image/gif, image/webp

**Response (200):**
```typescript
{
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}
```

---

## 4. Components

### 4.1 Component Tree

```
src/components/feedback/
├── FeedbackButton.tsx      # Floating action button
├── FeedbackDialog.tsx      # Submission modal wrapper
├── FeedbackForm.tsx        # Multi-step form
├── FeedbackList.tsx        # List with filters/sort
├── FeedbackCard.tsx        # Individual feedback card
├── UpvoteButton.tsx        # Optimistic vote button
├── StatusBadge.tsx         # Status indicator (editable for admin)
├── FileUploadInput.tsx     # Drag-drop file upload
└── index.ts                # Barrel export

src/components/contacts/
└── AddContactTile.tsx      # "Add Contact" tile for list header
```

### 4.2 Component Specifications

#### FeedbackButton
Floating action button fixed to bottom-right corner.

**Props:** None

**Behavior:**
- Navigates to `/feedback` on click
- Position: `fixed bottom-6 right-6` (desktop), `fixed bottom-20 right-4` (mobile, clears bottom nav)
- Style: Gold primary background, dark text, shadow
- Icon: MessageSquarePlus from Lucide

**Styling:**
```tsx
className="fixed z-50 h-14 w-14 rounded-full bg-gold-primary hover:bg-gold-light
           text-bg-primary shadow-lg transition-all
           bottom-20 right-4 md:bottom-6 md:right-6"
```

#### FeedbackDialog
Modal wrapper for feedback submission form.

**Props:**
```typescript
interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

**Behavior:**
- Handles form submission to API
- Shows loading state during submission
- Toast on success/error
- Closes and triggers onSuccess callback

#### FeedbackForm
Multi-step feedback submission form.

**Props:**
```typescript
interface FeedbackFormProps {
  onSubmit: (data: CreateFeedbackInput) => Promise<void>;
  isSubmitting: boolean;
}
```

**Form Fields:**
1. **Area** - Button group (CONTACTS, ENRICHMENT, EXPLORE, IMPORT_EXPORT, MOBILE, OTHER)
2. **Type** - Button group with icons (BUG, ENHANCEMENT, IDEA, QUESTION)
3. **Title** - Text input (5-200 chars, required)
4. **Description** - Textarea (10-5000 chars, required)
5. **Attachments** - FileUploadInput (optional, max 3 files)

**Area Labels:**
```typescript
const areaOptions = [
  { value: 'CONTACTS', label: 'Contacts' },
  { value: 'ENRICHMENT', label: 'Enrichment' },
  { value: 'EXPLORE', label: 'Explore / Chat' },
  { value: 'IMPORT_EXPORT', label: 'Import / Export' },
  { value: 'MOBILE', label: 'Mobile App' },
  { value: 'OTHER', label: 'Other' },
];
```

**Type Options with Icons:**
```typescript
const typeOptions = [
  { value: 'BUG', label: 'Bug', icon: Bug, color: 'text-red-400' },
  { value: 'ENHANCEMENT', label: 'Enhancement', icon: Sparkles, color: 'text-blue-400' },
  { value: 'IDEA', label: 'Idea', icon: Lightbulb, color: 'text-amber-400' },
  { value: 'QUESTION', label: 'Question', icon: HelpCircle, color: 'text-purple-400' },
];
```

#### FeedbackList
Displays list of feedback items with controls.

**Props:**
```typescript
interface FeedbackListProps {
  refreshTrigger?: number;  // Increment to trigger refresh
}
```

**Features:**
- Sort dropdown: Most Popular, Most Recent, Oldest First
- Filter by Area dropdown
- Filter by Type dropdown
- Item count badge
- Empty state message
- Loading skeleton

#### FeedbackCard
Individual feedback item display.

**Props:**
```typescript
interface FeedbackCardProps {
  feedback: {
    id: string;
    title: string;
    description: string;
    area: FeedbackArea;
    type: FeedbackType;
    status: FeedbackStatus;
    upvoteCount: number;
    hasUserUpvoted: boolean;
    createdAt: string;
    user: { id: string; name: string; };
    attachments: Array<{ url: string; filename: string; }>;
  };
  isAdmin?: boolean;  // Shows status dropdown if true
}
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [▲]  Title                      [Type] [Status] │
│ [5]  Description (2 lines, truncated)...        │
│      📎 attachment.png                          │
│      User Name • 2 hours ago • [Area]           │
└─────────────────────────────────────────────────┘
```

**Status Badge Colors (Dark Theme):**
```typescript
const statusColors = {
  OPEN: 'bg-bg-tertiary text-text-secondary',
  IN_REVIEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PLANNED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CLOSED: 'bg-bg-tertiary text-text-tertiary',
};
```

**Type Badge Colors:**
```typescript
const typeColors = {
  BUG: 'bg-red-500/20 text-red-400 border-red-500/30',
  ENHANCEMENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IDEA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  QUESTION: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};
```

#### UpvoteButton
Optimistic voting button.

**Props:**
```typescript
interface UpvoteButtonProps {
  feedbackId: string;
  initialUpvotes: number;
  initialHasUpvoted: boolean;
  onUpdate?: (upvotes: number, hasUpvoted: boolean) => void;
}
```

**Behavior:**
- Immediate UI update on click (optimistic)
- Rollback on API error
- Uses visitor ID for vote tracking (works for logged-in and anonymous)
- Visual states: voted (gold bg), not voted (outline)

#### StatusBadge
Status indicator with optional edit capability.

**Props:**
```typescript
interface StatusBadgeProps {
  status: FeedbackStatus;
  feedbackId: string;
  isEditable: boolean;  // True for SYSTEM_ADMIN
  onStatusChange?: (newStatus: FeedbackStatus) => void;
}
```

**Behavior:**
- If `isEditable`: Renders as dropdown menu
- If not editable: Renders as static badge
- Updates via PATCH API on change

#### FileUploadInput
Drag-and-drop file upload with preview.

**Props:**
```typescript
interface FileUploadInputProps {
  onUpload: (metadata: FeedbackAttachmentMetadata) => void;
  onRemove: (url: string) => void;
  attachments: FeedbackAttachmentMetadata[];
  maxFiles?: number;  // Default: 3
}
```

**Features:**
- Drag-and-drop zone
- Click to select file
- Upload progress indicator
- Image preview thumbnails
- Remove button
- File count indicator

#### AddContactTile
"Add Contact" tile for top of contacts list.

**Props:**
```typescript
interface AddContactTileProps {
  variant: 'card' | 'row';  // Match surrounding contact display
}
```

**Behavior:**
- Navigates to `/contacts/new` on click
- Styled to match ContactCard but with "+" icon and "Add Contact" text
- Appears at top of contact list on `/contacts` page
- Also appears on mobile contact card views
- Does NOT appear in search results or filtered views

**Styling:**
```tsx
// Card variant (mobile)
className="bg-bg-tertiary/50 border-2 border-dashed border-gold-primary/30
           hover:border-gold-primary/50 hover:bg-bg-tertiary
           rounded-xl p-4 flex items-center justify-center gap-3
           transition-all cursor-pointer"

// Row variant (desktop table)
className="bg-bg-tertiary/30 border-b border-gold-primary/20
           hover:bg-bg-tertiary/50 cursor-pointer"
```

---

## 5. Pages

### 5.1 Feedback Portal Page

**Route:** `/feedback`

**File:** `src/app/(dashboard)/feedback/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Feedback Portal                    [+ Add Feedback]     │
│ Share your feedback, report bugs, or suggest features   │
├─────────────────────────────────────────────────────────┤
│ Sort: [Popular ▼]  Area: [All ▼]  Type: [All ▼]  [12]  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ FeedbackCard                                        │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ FeedbackCard                                        │ │
│ └─────────────────────────────────────────────────────┘ │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**State:**
- `isDialogOpen: boolean` - Controls submission dialog
- `refreshTrigger: number` - Incremented to refresh list after submission

**Admin Detection:**
- Fetch current user's role from session
- Pass `isAdmin` prop to FeedbackCard components

### 5.2 Contacts Page Modifications

**File:** `src/app/(dashboard)/contacts/page.tsx`

**Changes:**
1. Remove FAB component (if exists)
2. Add `<AddContactTile />` at top of contact list
3. Conditionally render based on:
   - Show on main list (no search query, no filters active)
   - Show on mobile card view
   - Hide in search results
   - Hide when filters are active

---

## 6. Storage Integration

### 6.1 Supabase Storage Setup

**Bucket:** `feedback-attachments`

**Configuration:**
- Public bucket (images viewable by anyone with URL)
- Max file size: 5MB (enforced in app + bucket policy)
- Allowed MIME types: image/png, image/jpeg, image/gif, image/webp

**File Path Pattern:**
```
feedback-attachments/{userId}/{timestamp}-{random}-{filename}
```

### 6.2 Upload Implementation

```typescript
// src/lib/storage/supabase-storage.ts

import { createServerSupabaseClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'feedback-attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export async function uploadFeedbackAttachment(
  file: File,
  userId: string
): Promise<{ url: string; filename: string; mimeType: string; sizeBytes: number }> {
  // Validate
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 5MB)');
  }

  const supabase = await createServerSupabaseClient();

  // Generate unique path
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}-${random}-${safeName}`;

  // Upload
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
```

---

## 7. Authentication & Authorization

### 7.1 Role-Based Access Control

**Roles:**
| Role | Permissions |
|------|-------------|
| USER | Submit feedback, vote, view list |
| SYSTEM_ADMIN | All USER permissions + change status |

**Role Check Helper:**
```typescript
// src/lib/auth-helpers.ts

export async function isSystemAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return dbUser?.role === 'SYSTEM_ADMIN';
}

export async function requireSystemAdmin(): Promise<void> {
  const isAdmin = await isSystemAdmin();
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}
```

### 7.2 Visitor ID for Anonymous Voting

For users who view feedback without logging in, track votes via cookie:

```typescript
// src/lib/visitor.ts

import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const VISITOR_COOKIE = 'bc_visitor_id';

export async function getVisitorId(): Promise<string> {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;

  if (!visitorId) {
    visitorId = uuidv4();
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return visitorId;
}
```

---

## 8. File Structure

### 8.1 New Files

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── feedback/
│   │       └── page.tsx              # Feedback portal page
│   └── api/
│       └── feedback/
│           ├── route.ts              # GET list, POST create
│           ├── [id]/
│           │   ├── route.ts          # GET single, PATCH status
│           │   └── vote/
│           │       └── route.ts      # POST toggle vote
│           └── upload/
│               └── route.ts          # POST file upload
├── components/
│   ├── feedback/
│   │   ├── index.ts
│   │   ├── FeedbackButton.tsx
│   │   ├── FeedbackDialog.tsx
│   │   ├── FeedbackForm.tsx
│   │   ├── FeedbackList.tsx
│   │   ├── FeedbackCard.tsx
│   │   ├── UpvoteButton.tsx
│   │   ├── StatusBadge.tsx
│   │   └── FileUploadInput.tsx
│   └── contacts/
│       └── AddContactTile.tsx        # New "Add Contact" tile
├── lib/
│   ├── validations/
│   │   └── feedback.ts               # Zod schemas
│   ├── storage/
│   │   └── supabase-storage.ts       # Upload helper
│   ├── auth-helpers.ts               # Role check helpers
│   └── visitor.ts                    # Visitor ID helper
└── prisma/
    └── schema.prisma                 # Schema additions
```

### 8.2 Modified Files

```
src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx                # Add FeedbackButton
│       └── contacts/
│           └── page.tsx              # Add AddContactTile, remove FAB
├── components/
│   └── contacts/
│       └── ContactsView.tsx          # Integrate AddContactTile
└── prisma/
    └── schema.prisma                 # Add role to User, add Feedback models
```

---

## 9. Implementation Tasks

### Phase 1: Database & API (Day 1)

- [ ] Add UserRole enum and role field to User model
- [ ] Add Feedback, FeedbackVote, FeedbackAttachment models
- [ ] Run Prisma migration
- [ ] Create Supabase Storage bucket `feedback-attachments`
- [ ] Create `/api/feedback` route (GET, POST)
- [ ] Create `/api/feedback/[id]` route (GET, PATCH)
- [ ] Create `/api/feedback/[id]/vote` route (POST)
- [ ] Create `/api/feedback/upload` route (POST)
- [ ] Add validation schemas
- [ ] Add auth helpers (isSystemAdmin, getVisitorId)
- [ ] Set current user as SYSTEM_ADMIN via SQL

### Phase 2: Components (Day 2)

- [ ] Create FeedbackButton component
- [ ] Create FileUploadInput component
- [ ] Create FeedbackForm component
- [ ] Create FeedbackDialog component
- [ ] Create UpvoteButton component
- [ ] Create StatusBadge component
- [ ] Create FeedbackCard component
- [ ] Create FeedbackList component

### Phase 3: Pages & Integration (Day 3)

- [ ] Create `/feedback` page
- [ ] Add FeedbackButton to dashboard layout
- [ ] Create AddContactTile component
- [ ] Integrate AddContactTile into contacts page
- [ ] Remove existing Add Contact FAB (if present)
- [ ] Test on mobile viewport
- [ ] Test admin status editing
- [ ] Test voting flow

### Phase 4: Polish (Day 4)

- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Test all filter/sort combinations
- [ ] Verify dark theme consistency
- [ ] Test file upload edge cases
- [ ] Verify mobile bottom nav clearance
- [ ] Manual QA pass

---

## 10. Testing Checklist

### Functional Tests

- [ ] Submit feedback with all areas
- [ ] Submit feedback with all types
- [ ] Submit feedback with attachments
- [ ] Submit feedback without attachments
- [ ] Upvote feedback (logged in)
- [ ] Remove upvote
- [ ] Filter by area
- [ ] Filter by type
- [ ] Sort by popular
- [ ] Sort by recent
- [ ] Sort by oldest
- [ ] Admin: Change status to each value
- [ ] Non-admin: Cannot see status dropdown

### Edge Cases

- [ ] Submit with minimum title length (5 chars)
- [ ] Submit with maximum title length (200 chars)
- [ ] Submit with maximum description length (5000 chars)
- [ ] Upload max file size (5MB)
- [ ] Upload invalid file type (rejected)
- [ ] Upload more than 3 files (rejected)
- [ ] Vote on same item twice (toggle off)
- [ ] Empty feedback list state

### Mobile Tests

- [ ] FAB clears bottom nav
- [ ] Form is usable on small screens
- [ ] Cards render correctly
- [ ] AddContactTile appears on mobile list
- [ ] Touch targets are adequate (44px+)

### Accessibility

- [ ] Keyboard navigation through form
- [ ] Screen reader labels on icons
- [ ] Focus states visible
- [ ] Color contrast sufficient

---

## 11. Success Criteria

### MVP Complete When:

1. FeedbackButton visible on all dashboard pages (bottom-right)
2. `/feedback` page loads with list of feedback
3. Users can submit new feedback with optional screenshots
4. Users can upvote/remove votes with optimistic UI
5. SYSTEM_ADMIN can change status inline
6. AddContactTile appears at top of contacts list
7. All tests in Section 10 pass
8. No TypeScript errors
9. Mobile-responsive on 375px+ viewports

---

## 12. Future Enhancements (Out of Scope for MVP)

1. Email notifications when status changes
2. AI-powered duplicate detection as user types
3. Public roadmap page showing planned items
4. Changelog integration linking to completed feedback
5. Comments/replies on feedback items
6. Search within feedback
7. Bulk admin actions (merge, close multiple)
8. Analytics dashboard (submission trends, resolution time)
