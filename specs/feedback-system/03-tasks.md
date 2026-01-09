# Task Breakdown: Feedback System

**Generated:** 2026-01-09
**Source:** specs/feedback-system/02-spec.md
**Feature Slug:** feedback-system
**Last Decompose:** 2026-01-09

---

## Overview

Implement a user feedback system for Better Connections with:
- Floating action button (FAB) for feedback access
- Dedicated `/feedback` portal page
- Upvoting with optimistic UI
- Role-based admin status management
- Supabase Storage for file attachments
- "Add Contact" tile replacing existing FAB

---

## Phase 1: Database & Infrastructure

### Task 1.1: Add Prisma Schema Models
**Description:** Add UserRole enum, Feedback models, and User relation to Prisma schema
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2

**Technical Requirements:**
Add to `prisma/schema.prisma`:

```prisma
// User Role System
enum UserRole {
  USER          // Default - can submit feedback, vote
  SYSTEM_ADMIN  // Can change status, see admin controls
}

// Modify existing User model - add role field and relations
// Add after existing User fields:
//   role                    UserRole  @default(USER)
//   feedbackSubmissions     Feedback[]
//   feedbackVotes           FeedbackVote[]

// Feedback System Enums
enum FeedbackArea {
  CONTACTS
  ENRICHMENT
  EXPLORE
  IMPORT_EXPORT
  MOBILE
  OTHER
}

enum FeedbackType {
  BUG
  ENHANCEMENT
  IDEA
  QUESTION
}

enum FeedbackStatus {
  OPEN
  IN_REVIEW
  PLANNED
  IN_PROGRESS
  COMPLETED
  CLOSED
}

// Feedback Model
model Feedback {
  id          String         @id @default(cuid())
  userId      String

  title       String         @db.VarChar(200)
  description String         @db.Text

  area        FeedbackArea
  type        FeedbackType
  status      FeedbackStatus @default(OPEN)

  upvoteCount Int            @default(0)

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  votes       FeedbackVote[]
  attachments FeedbackAttachment[]

  @@index([userId])
  @@index([status])
  @@index([area])
  @@index([type])
  @@index([createdAt])
  @@index([upvoteCount])
}

model FeedbackVote {
  id         String   @id @default(cuid())
  visitorId  String
  feedbackId String
  createdAt  DateTime @default(now())

  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  @@unique([feedbackId, visitorId])
  @@index([feedbackId])
  @@index([visitorId])
}

model FeedbackAttachment {
  id         String   @id @default(cuid())
  feedbackId String

  url        String   @db.Text
  filename   String   @db.VarChar(255)
  mimeType   String   @db.VarChar(100)
  sizeBytes  Int

  createdAt  DateTime @default(now())

  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  @@index([feedbackId])
}
```

**Implementation Steps:**
1. Open `prisma/schema.prisma`
2. Add UserRole enum after existing enums
3. Add `role` field to User model with `@default(USER)`
4. Add `feedbackSubmissions` and `feedbackVotes` relations to User model
5. Add FeedbackArea, FeedbackType, FeedbackStatus enums
6. Add Feedback, FeedbackVote, FeedbackAttachment models
7. Verify all relations and indexes

**Acceptance Criteria:**
- [ ] UserRole enum added with USER and SYSTEM_ADMIN values
- [ ] User model has role field with USER default
- [ ] User model has feedbackSubmissions and feedbackVotes relations
- [ ] All three Feedback models added with proper relations
- [ ] All indexes defined for query optimization
- [ ] Schema validates with `npx prisma validate`

---

### Task 1.2: Create Validation Schemas
**Description:** Create Zod validation schemas for feedback operations
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1

**Technical Requirements:**
Create `src/lib/validations/feedback.ts`:

```typescript
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

**Acceptance Criteria:**
- [ ] All enum schemas match Prisma enums exactly
- [ ] CreateFeedbackSchema validates title (5-200 chars) and description (10-5000 chars)
- [ ] Attachment metadata schema validates URL, filename, mimeType, sizeBytes
- [ ] All types are exported for use in components
- [ ] Transform functions trim whitespace from title/description

---

### Task 1.3: Run Prisma Migration
**Description:** Generate and run Prisma migration for feedback schema
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.4

**Implementation Steps:**
```bash
npx prisma migrate dev --name add-feedback-system
npx prisma generate
```

**Acceptance Criteria:**
- [ ] Migration runs without errors
- [ ] All tables created in database
- [ ] Prisma client regenerated
- [ ] TypeScript types available for new models

---

### Task 1.4: Create Auth Helper Functions
**Description:** Add role-based access control helpers and visitor ID utility
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1
**Can run parallel with:** Task 1.3

**Technical Requirements:**

Create `src/lib/auth-helpers.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

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

export async function getCurrentUserRole(): Promise<'USER' | 'SYSTEM_ADMIN' | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return dbUser?.role ?? 'USER';
}
```

Create `src/lib/visitor.ts`:

```typescript
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

export async function getOrCreateVisitorId(): Promise<string> {
  return getVisitorId();
}
```

**Acceptance Criteria:**
- [ ] isSystemAdmin() correctly checks user role
- [ ] requireSystemAdmin() throws for non-admin users
- [ ] getCurrentUserRole() returns role or null for unauthenticated
- [ ] getVisitorId() returns existing or creates new visitor ID
- [ ] Visitor cookie is httpOnly, secure in production, 1-year expiry

---

### Task 1.5: Create Supabase Storage Helper
**Description:** Create upload helper for feedback attachments using Supabase Storage
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1, 1.2

**Technical Requirements:**

Create `src/lib/storage/supabase-storage.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'feedback-attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadFeedbackAttachment(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 5MB)');
  }

  const supabase = await createServerSupabaseClient();

  // Generate unique path: userId/timestamp-random-filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}-${random}-${safeName}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

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

export function validateFileForUpload(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: PNG, JPEG, GIF, WebP` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large (max 5MB)' };
  }
  return { valid: true };
}
```

**Note:** Bucket `feedback-attachments` must be created manually in Supabase dashboard as a public bucket.

**Acceptance Criteria:**
- [ ] uploadFeedbackAttachment validates file type and size
- [ ] Unique file paths generated with userId/timestamp-random-filename
- [ ] Public URL returned after successful upload
- [ ] validateFileForUpload helper for client-side validation
- [ ] Error messages are user-friendly

---

### Task 1.6: Set Current User as SYSTEM_ADMIN
**Description:** Update current user's role to SYSTEM_ADMIN via SQL
**Size:** Small
**Priority:** High
**Dependencies:** Task 1.3

**Implementation Steps:**
1. Get current user's email from Supabase Auth
2. Run SQL to update role:

```sql
UPDATE "User" SET role = 'SYSTEM_ADMIN' WHERE email = 'your-email@example.com';
```

Or via Prisma:

```typescript
await prisma.user.update({
  where: { email: 'your-email@example.com' },
  data: { role: 'SYSTEM_ADMIN' }
});
```

**Acceptance Criteria:**
- [ ] Current user's role is SYSTEM_ADMIN
- [ ] Verified via `SELECT role FROM "User" WHERE email = '...'`

---

## Phase 2: API Routes

### Task 2.1: Create POST /api/feedback Route
**Description:** API route for creating new feedback submissions
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, 1.2, 1.3
**Can run parallel with:** Task 2.2

**Technical Requirements:**

Create `src/app/api/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { CreateFeedbackSchema } from '@/lib/validations/feedback';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = CreateFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, area, type, attachments } = validationResult.data;

    // Create feedback with attachments
    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        title,
        description,
        area,
        type,
        status: 'OPEN',
        upvoteCount: 0,
        attachments: {
          create: attachments.map(att => ({
            url: att.url,
            filename: att.filename,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { url: true, filename: true } },
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Requires authentication
- [ ] Validates input with Zod schema
- [ ] Creates feedback with attachments in single transaction
- [ ] Returns created feedback with user info
- [ ] Returns 401 for unauthenticated
- [ ] Returns 400 for validation errors
- [ ] Returns 500 for server errors

---

### Task 2.2: Create GET /api/feedback Route
**Description:** API route for listing feedback with filtering and sorting
**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, 1.3
**Can run parallel with:** Task 2.1

**Technical Requirements:**

Add to `src/app/api/feedback/route.ts`:

```typescript
import { getVisitorId } from '@/lib/visitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const sort = searchParams.get('sort') || 'popular';
    const area = searchParams.get('area');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');

    // Get visitor ID for vote status
    const visitorId = await getVisitorId();

    // Build where clause
    const where: Record<string, unknown> = {};

    if (area) where.area = area;
    if (type) where.type = type;
    if (status) {
      where.status = status;
    } else {
      // Default: exclude CLOSED
      where.status = { not: 'CLOSED' };
    }

    // Build orderBy
    let orderBy: Record<string, string>[] = [];
    switch (sort) {
      case 'popular':
        orderBy = [{ upvoteCount: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'recent':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'oldest':
        orderBy = [{ createdAt: 'asc' }];
        break;
      default:
        orderBy = [{ upvoteCount: 'desc' }, { createdAt: 'desc' }];
    }

    // Cursor-based pagination
    const cursorClause = cursor ? { cursor: { id: cursor }, skip: 1 } : {};

    // Fetch feedback
    const feedbackItems = await prisma.feedback.findMany({
      where,
      orderBy,
      take: limit + 1, // Fetch one extra to check if there's more
      ...cursorClause,
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { url: true, filename: true } },
        votes: {
          where: { visitorId },
          select: { id: true },
        },
      },
    });

    // Check if there are more results
    const hasMore = feedbackItems.length > limit;
    const items = hasMore ? feedbackItems.slice(0, -1) : feedbackItems;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Transform response
    const feedback = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      area: item.area,
      type: item.type,
      status: item.status,
      upvoteCount: item.upvoteCount,
      hasUserUpvoted: item.votes.length > 0,
      createdAt: item.createdAt.toISOString(),
      user: item.user,
      attachments: item.attachments,
    }));

    return NextResponse.json({
      feedback,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Supports sort: popular, recent, oldest
- [ ] Supports area filter
- [ ] Supports type filter
- [ ] Supports status filter (defaults to exclude CLOSED)
- [ ] Cursor-based pagination with limit (max 100)
- [ ] Returns hasUserUpvoted based on visitor ID
- [ ] Returns user info and attachments

---

### Task 2.3: Create GET/PATCH /api/feedback/[id] Route
**Description:** API routes for single feedback retrieval and status update
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4
**Can run parallel with:** Task 2.4

**Technical Requirements:**

Create `src/app/api/feedback/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { UpdateFeedbackStatusSchema } from '@/lib/validations/feedback';
import { isSystemAdmin } from '@/lib/auth-helpers';
import { getVisitorId } from '@/lib/visitor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const visitorId = await getVisitorId();

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { url: true, filename: true } },
        votes: {
          where: { visitorId },
          select: { id: true },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({
      feedback: {
        id: feedback.id,
        title: feedback.title,
        description: feedback.description,
        area: feedback.area,
        type: feedback.type,
        status: feedback.status,
        upvoteCount: feedback.upvoteCount,
        hasUserUpvoted: feedback.votes.length > 0,
        createdAt: feedback.createdAt.toISOString(),
        user: feedback.user,
        attachments: feedback.attachments,
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Admin check
    const adminStatus = await isSystemAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = UpdateFeedbackStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // Update feedback
    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { url: true, filename: true } },
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] GET returns single feedback with user vote status
- [ ] GET returns 404 for non-existent feedback
- [ ] PATCH requires SYSTEM_ADMIN role
- [ ] PATCH returns 403 for non-admin users
- [ ] PATCH validates status value
- [ ] PATCH returns updated feedback

---

### Task 2.4: Create POST /api/feedback/[id]/vote Route
**Description:** API route for toggling votes on feedback
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.4
**Can run parallel with:** Task 2.3

**Technical Requirements:**

Create `src/app/api/feedback/[id]/vote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoteActionSchema } from '@/lib/validations/feedback';
import { getVisitorId } from '@/lib/visitor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: feedbackId } = await context.params;
    const visitorId = await getVisitorId();

    // Parse and validate body
    const body = await request.json();
    const validationResult = VoteActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = validationResult.data;

    // Check if feedback exists
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Check existing vote
    const existingVote = await prisma.feedbackVote.findUnique({
      where: {
        feedbackId_visitorId: { feedbackId, visitorId },
      },
    });

    let newUpvoteCount = feedback.upvoteCount;
    let hasUserUpvoted = false;

    if (action === 'upvote') {
      if (!existingVote) {
        // Create vote and increment count
        await prisma.$transaction([
          prisma.feedbackVote.create({
            data: { feedbackId, visitorId },
          }),
          prisma.feedback.update({
            where: { id: feedbackId },
            data: { upvoteCount: { increment: 1 } },
          }),
        ]);
        newUpvoteCount++;
        hasUserUpvoted = true;
      } else {
        // Already voted
        hasUserUpvoted = true;
      }
    } else if (action === 'remove') {
      if (existingVote) {
        // Delete vote and decrement count
        await prisma.$transaction([
          prisma.feedbackVote.delete({
            where: { id: existingVote.id },
          }),
          prisma.feedback.update({
            where: { id: feedbackId },
            data: { upvoteCount: { decrement: 1 } },
          }),
        ]);
        newUpvoteCount--;
        hasUserUpvoted = false;
      }
    }

    return NextResponse.json({
      success: true,
      upvoteCount: Math.max(0, newUpvoteCount), // Ensure non-negative
      hasUserUpvoted,
    });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] Uses visitor ID for vote tracking
- [ ] Upvote creates vote and increments count
- [ ] Remove deletes vote and decrements count
- [ ] Transaction ensures count and vote are atomic
- [ ] Idempotent: upvote when already voted is no-op
- [ ] Returns new count and hasUserUpvoted

---

### Task 2.5: Create POST /api/feedback/upload Route
**Description:** API route for uploading feedback attachments
**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.5
**Can run parallel with:** Task 2.1-2.4

**Technical Requirements:**

Create `src/app/api/feedback/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { uploadFeedbackAttachment } from '@/lib/storage/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file
    const result = await uploadFeedbackAttachment(file, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

**Acceptance Criteria:**
- [ ] Requires authentication
- [ ] Accepts multipart/form-data with 'file' field
- [ ] Validates file type (PNG, JPEG, GIF, WebP)
- [ ] Validates file size (max 5MB)
- [ ] Returns URL, filename, mimeType, sizeBytes
- [ ] Returns user-friendly error messages

---

## Phase 3: Components

### Task 3.1: Create FeedbackButton Component
**Description:** Floating action button for feedback access
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** All Phase 3 tasks

**Technical Requirements:**

Create `src/components/feedback/FeedbackButton.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FeedbackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/feedback')}
      className={cn(
        'fixed z-50',
        // Position: bottom-right with mobile bottom nav clearance
        'bottom-20 right-4 md:bottom-6 md:right-6',
        // Size and shape
        'h-14 w-14 rounded-full',
        // Colors (gold primary)
        'bg-gold-primary hover:bg-gold-light active:bg-gold-primary',
        'text-bg-primary',
        // Shadow and transitions
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-gold-primary focus:ring-offset-2 focus:ring-offset-bg-primary',
        // Flex for centering icon
        'flex items-center justify-center'
      )}
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="h-6 w-6" />
    </button>
  );
}
```

**Acceptance Criteria:**
- [ ] Fixed position bottom-right
- [ ] Mobile: bottom-20 (clears 64px bottom nav)
- [ ] Desktop: bottom-6
- [ ] Gold primary background with hover state
- [ ] MessageSquarePlus icon
- [ ] Navigates to /feedback on click
- [ ] Accessible: has aria-label

---

### Task 3.2: Create UpvoteButton Component
**Description:** Optimistic voting button with visual feedback
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.4
**Can run parallel with:** Task 3.1, 3.3

**Technical Requirements:**

Create `src/components/feedback/UpvoteButton.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UpvoteButtonProps {
  feedbackId: string;
  initialUpvotes: number;
  initialHasUpvoted: boolean;
  onUpdate?: (upvotes: number, hasUpvoted: boolean) => void;
}

export function UpvoteButton({
  feedbackId,
  initialUpvotes,
  initialHasUpvoted,
  onUpdate,
}: UpvoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // Optimistic update
    const newHasUpvoted = !hasUpvoted;
    const newUpvotes = newHasUpvoted ? upvotes + 1 : upvotes - 1;

    setHasUpvoted(newHasUpvoted);
    setUpvotes(newUpvotes);
    onUpdate?.(newUpvotes, newHasUpvoted);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/feedback/${feedbackId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: newHasUpvoted ? 'upvote' : 'remove',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to vote');
        }

        const data = await response.json();

        // Sync with server state
        setUpvotes(data.upvoteCount);
        setHasUpvoted(data.hasUserUpvoted);
        onUpdate?.(data.upvoteCount, data.hasUserUpvoted);
      } catch (error) {
        // Rollback on error
        setHasUpvoted(hasUpvoted);
        setUpvotes(upvotes);
        onUpdate?.(upvotes, hasUpvoted);
        toast.error('Failed to save vote');
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'flex flex-col items-center justify-center',
        'min-w-[48px] py-2 px-1 rounded-lg',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-gold-primary/50',
        hasUpvoted
          ? 'bg-gold-primary/20 text-gold-primary border border-gold-primary/30'
          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 border border-transparent',
        isPending && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={hasUpvoted ? 'Remove upvote' : 'Upvote'}
      aria-pressed={hasUpvoted}
    >
      <ChevronUp
        className={cn(
          'h-5 w-5 transition-transform',
          hasUpvoted && 'text-gold-primary'
        )}
      />
      <span className="text-sm font-medium tabular-nums">{upvotes}</span>
    </button>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows upvote count and arrow icon
- [ ] Optimistic update on click
- [ ] Rollback on API error
- [ ] Visual distinction for voted state (gold background)
- [ ] Disabled during pending state
- [ ] Calls onUpdate callback with new values
- [ ] Accessible: aria-label and aria-pressed

---

### Task 3.3: Create StatusBadge Component
**Description:** Status indicator with optional dropdown for admins
**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.3
**Can run parallel with:** Task 3.1, 3.2

**Technical Requirements:**

Create `src/components/feedback/StatusBadge.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FeedbackStatus } from '@/lib/validations/feedback';

const statusConfig: Record<FeedbackStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-bg-tertiary text-text-secondary border-bg-tertiary',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  PLANNED: {
    label: 'Planned',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-bg-tertiary text-text-tertiary border-bg-tertiary',
  },
};

const allStatuses: FeedbackStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
];

interface StatusBadgeProps {
  status: FeedbackStatus;
  feedbackId: string;
  isEditable: boolean;
  onStatusChange?: (newStatus: FeedbackStatus) => void;
}

export function StatusBadge({
  status,
  feedbackId,
  isEditable,
  onStatusChange,
}: StatusBadgeProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const config = statusConfig[currentStatus];

  const handleStatusChange = (newStatus: FeedbackStatus) => {
    if (newStatus === currentStatus) return;

    const oldStatus = currentStatus;
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/feedback/${feedbackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }

        toast.success(`Status updated to ${statusConfig[newStatus].label}`);
      } catch (error) {
        // Rollback
        setCurrentStatus(oldStatus);
        onStatusChange?.(oldStatus);
        toast.error('Failed to update status');
      }
    });
  };

  const badgeElement = (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'px-2 py-0.5 rounded-full text-xs font-medium',
        'border',
        config.className,
        isPending && 'opacity-50',
        isEditable && 'cursor-pointer hover:opacity-80'
      )}
    >
      {config.label}
      {isEditable && <ChevronDown className="h-3 w-3" />}
    </span>
  );

  if (!isEditable) {
    return badgeElement;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        {badgeElement}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {allStatuses.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleStatusChange(s)}
            className={cn(
              'cursor-pointer',
              s === currentStatus && 'bg-bg-tertiary'
            )}
          >
            <span
              className={cn(
                'inline-block w-2 h-2 rounded-full mr-2',
                statusConfig[s].className.replace('text-', 'bg-').split(' ')[0]
              )}
            />
            {statusConfig[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows status with appropriate color
- [ ] Static badge when isEditable=false
- [ ] Dropdown menu when isEditable=true
- [ ] Updates status via API on selection
- [ ] Shows toast on success/error
- [ ] Optimistic update with rollback
- [ ] Disabled during pending state

---

### Task 3.4: Create FileUploadInput Component
**Description:** Drag-and-drop file upload with preview
**Size:** Large
**Priority:** Medium
**Dependencies:** Task 2.5
**Can run parallel with:** Task 3.1-3.3

**Technical Requirements:**

Create `src/components/feedback/FileUploadInput.tsx`:

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FeedbackAttachmentMetadata } from '@/lib/validations/feedback';

interface FileUploadInputProps {
  onUpload: (metadata: FeedbackAttachmentMetadata) => void;
  onRemove: (url: string) => void;
  attachments: FeedbackAttachmentMetadata[];
  maxFiles?: number;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FileUploadInput({
  onUpload,
  onRemove,
  attachments,
  maxFiles = 3,
}: FileUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = attachments.length < maxFiles;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PNG, JPEG, GIF, and WebP images are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be smaller than 5MB';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/feedback/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const metadata: FeedbackAttachmentMetadata = await response.json();
      onUpload(metadata);
      toast.success('File uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!canUpload) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      const remainingSlots = maxFiles - attachments.length;

      files.slice(0, remainingSlots).forEach(uploadFile);
    },
    [canUpload, maxFiles, attachments.length]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxFiles - attachments.length;
    Array.from(files)
      .slice(0, remainingSlots)
      .forEach(uploadFile);

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => canUpload && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6',
          'flex flex-col items-center justify-center gap-2',
          'transition-all cursor-pointer',
          isDragging
            ? 'border-gold-primary bg-gold-primary/10'
            : 'border-border hover:border-gold-primary/50 hover:bg-bg-tertiary/50',
          (!canUpload || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-gold-primary animate-spin" />
            <span className="text-sm text-text-secondary">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-text-tertiary" />
            <span className="text-sm text-text-secondary">
              {canUpload
                ? 'Drag & drop or click to upload'
                : `Maximum ${maxFiles} files reached`}
            </span>
            <span className="text-xs text-text-tertiary">
              PNG, JPEG, GIF, WebP up to 5MB
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File count indicator */}
      <div className="text-xs text-text-tertiary text-right">
        {attachments.length}/{maxFiles} files
      </div>

      {/* Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.url}
              className="relative group rounded-lg overflow-hidden border border-border"
            >
              <img
                src={att.url}
                alt={att.filename}
                className="w-20 h-20 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(att.url)}
                className={cn(
                  'absolute top-1 right-1',
                  'p-1 rounded-full bg-bg-primary/80 hover:bg-bg-primary',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}
                aria-label={`Remove ${att.filename}`}
              >
                <X className="h-3 w-3 text-text-primary" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-bg-primary/80 px-1 py-0.5">
                <span className="text-xs text-text-secondary truncate block">
                  {att.filename}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Drag-and-drop zone with visual feedback
- [ ] Click to select files
- [ ] Client-side validation (type, size)
- [ ] Upload progress indicator
- [ ] Image preview thumbnails
- [ ] Remove button on hover
- [ ] File count indicator
- [ ] Max files limit enforced
- [ ] Multiple file upload support

---

### Task 3.5: Create FeedbackForm Component
**Description:** Multi-field feedback submission form
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.4
**Can run parallel with:** Task 3.1-3.3

**Technical Requirements:**

Create `src/components/feedback/FeedbackForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Bug, Sparkles, Lightbulb, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUploadInput } from './FileUploadInput';
import type {
  CreateFeedbackInput,
  FeedbackArea,
  FeedbackType,
  FeedbackAttachmentMetadata,
} from '@/lib/validations/feedback';

interface FeedbackFormProps {
  onSubmit: (data: CreateFeedbackInput) => Promise<void>;
  isSubmitting: boolean;
}

const areaOptions: { value: FeedbackArea; label: string }[] = [
  { value: 'CONTACTS', label: 'Contacts' },
  { value: 'ENRICHMENT', label: 'Enrichment' },
  { value: 'EXPLORE', label: 'Explore / Chat' },
  { value: 'IMPORT_EXPORT', label: 'Import / Export' },
  { value: 'MOBILE', label: 'Mobile App' },
  { value: 'OTHER', label: 'Other' },
];

const typeOptions: { value: FeedbackType; label: string; icon: typeof Bug; color: string }[] = [
  { value: 'BUG', label: 'Bug', icon: Bug, color: 'text-red-400' },
  { value: 'ENHANCEMENT', label: 'Enhancement', icon: Sparkles, color: 'text-blue-400' },
  { value: 'IDEA', label: 'Idea', icon: Lightbulb, color: 'text-amber-400' },
  { value: 'QUESTION', label: 'Question', icon: HelpCircle, color: 'text-purple-400' },
];

export function FeedbackForm({ onSubmit, isSubmitting }: FeedbackFormProps) {
  const [area, setArea] = useState<FeedbackArea | null>(null);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<FeedbackAttachmentMetadata[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!area) newErrors.area = 'Please select an area';
    if (!type) newErrors.type = 'Please select a type';
    if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }
    if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.trim().length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit({
      area: area!,
      type: type!,
      title: title.trim(),
      description: description.trim(),
      attachments,
    });
  };

  const handleUpload = (metadata: FeedbackAttachmentMetadata) => {
    setAttachments((prev) => [...prev, metadata]);
  };

  const handleRemove = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Area Selection */}
      <div className="space-y-2">
        <Label>What area is this about?</Label>
        <div className="flex flex-wrap gap-2">
          {areaOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setArea(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium',
                'border transition-all',
                area === opt.value
                  ? 'bg-gold-primary text-bg-primary border-gold-primary'
                  : 'bg-bg-tertiary text-text-secondary border-border hover:border-gold-primary/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.area && <p className="text-sm text-red-400">{errors.area}</p>}
      </div>

      {/* Type Selection */}
      <div className="space-y-2">
        <Label>What type of feedback?</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg',
                  'border transition-all',
                  type === opt.value
                    ? 'bg-gold-primary/10 border-gold-primary'
                    : 'bg-bg-tertiary border-border hover:border-gold-primary/50'
                )}
              >
                <Icon className={cn('h-5 w-5', opt.color)} />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {errors.type && <p className="text-sm text-red-400">{errors.type}</p>}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your feedback"
          maxLength={200}
          className="bg-bg-tertiary border-border"
        />
        <div className="flex justify-between text-xs text-text-tertiary">
          {errors.title ? (
            <span className="text-red-400">{errors.title}</span>
          ) : (
            <span />
          )}
          <span>{title.length}/200</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please provide as much detail as possible..."
          rows={5}
          maxLength={5000}
          className="bg-bg-tertiary border-border resize-none"
        />
        <div className="flex justify-between text-xs text-text-tertiary">
          {errors.description ? (
            <span className="text-red-400">{errors.description}</span>
          ) : (
            <span />
          )}
          <span>{description.length}/5000</span>
        </div>
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <Label>Screenshots (optional)</Label>
        <FileUploadInput
          attachments={attachments}
          onUpload={handleUpload}
          onRemove={handleRemove}
          maxFiles={3}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gold-primary hover:bg-gold-light text-bg-primary"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </Button>
    </form>
  );
}
```

**Acceptance Criteria:**
- [ ] Area selection with button group
- [ ] Type selection with icons and colors
- [ ] Title input with character counter (5-200)
- [ ] Description textarea with counter (10-5000)
- [ ] File upload integration
- [ ] Client-side validation with error messages
- [ ] Disabled state during submission
- [ ] Calls onSubmit with validated data

---

### Task 3.6: Create FeedbackDialog Component
**Description:** Modal wrapper for feedback submission
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.5
**Can run parallel with:** Task 3.7

**Technical Requirements:**

Create `src/components/feedback/FeedbackDialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FeedbackForm } from './FeedbackForm';
import { toast } from 'sonner';
import type { CreateFeedbackInput } from '@/lib/validations/feedback';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FeedbackDialog({ open, onOpenChange, onSuccess }: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateFeedbackInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted! Thank you.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit feedback';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-bg-secondary border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Submit Feedback</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Help us improve by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Uses shadcn Dialog component
- [ ] Contains FeedbackForm
- [ ] Handles form submission to API
- [ ] Shows loading state during submission
- [ ] Closes and calls onSuccess on success
- [ ] Shows toast for success/error
- [ ] Scrollable for small viewports

---

### Task 3.7: Create FeedbackCard Component
**Description:** Individual feedback item display
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.2, 3.3
**Can run parallel with:** Task 3.6

**Technical Requirements:**

Create `src/components/feedback/FeedbackCard.tsx`:

```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpvoteButton } from './UpvoteButton';
import { StatusBadge } from './StatusBadge';
import type { FeedbackArea, FeedbackType, FeedbackStatus } from '@/lib/validations/feedback';

const typeColors: Record<FeedbackType, string> = {
  BUG: 'bg-red-500/20 text-red-400 border-red-500/30',
  ENHANCEMENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IDEA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  QUESTION: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const areaLabels: Record<FeedbackArea, string> = {
  CONTACTS: 'Contacts',
  ENRICHMENT: 'Enrichment',
  EXPLORE: 'Explore',
  IMPORT_EXPORT: 'Import/Export',
  MOBILE: 'Mobile',
  OTHER: 'Other',
};

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
    user: { id: string; name: string };
    attachments: { url: string; filename: string }[];
  };
  isAdmin?: boolean;
}

export function FeedbackCard({ feedback, isAdmin = false }: FeedbackCardProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-gold-primary/20 transition-colors">
      <div className="flex gap-3">
        {/* Upvote button */}
        <UpvoteButton
          feedbackId={feedback.id}
          initialUpvotes={feedback.upvoteCount}
          initialHasUpvoted={feedback.hasUserUpvoted}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Title + badges */}
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h3 className="font-semibold text-text-primary flex-1 min-w-0">
              {feedback.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Type badge */}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium border',
                  typeColors[feedback.type]
                )}
              >
                {feedback.type.charAt(0) + feedback.type.slice(1).toLowerCase()}
              </span>
              {/* Status badge */}
              <StatusBadge
                status={feedback.status}
                feedbackId={feedback.id}
                isEditable={isAdmin}
              />
            </div>
          </div>

          {/* Description (truncated) */}
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">
            {feedback.description}
          </p>

          {/* Attachments indicator */}
          {feedback.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary mb-3">
              <Paperclip className="h-3 w-3" />
              <span>
                {feedback.attachments.length} attachment
                {feedback.attachments.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Footer: Author, time, area */}
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{feedback.user.name}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
            </span>
            <span>•</span>
            <span className="text-gold-primary/70">{areaLabels[feedback.area]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Shows upvote button on left
- [ ] Title, type badge, status badge in header
- [ ] Description truncated to 2 lines
- [ ] Attachment count indicator
- [ ] Author name, relative time, area in footer
- [ ] Status badge is editable only for admin
- [ ] Proper dark theme colors
- [ ] Hover state on card

---

### Task 3.8: Create FeedbackList Component
**Description:** List of feedback items with filtering and sorting
**Size:** Large
**Priority:** High
**Dependencies:** Task 3.7
**Can run parallel with:** None

**Technical Requirements:**

Create `src/components/feedback/FeedbackList.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeedbackCard } from './FeedbackCard';
import type { FeedbackArea, FeedbackType, FeedbackStatus } from '@/lib/validations/feedback';

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  area: FeedbackArea;
  type: FeedbackType;
  status: FeedbackStatus;
  upvoteCount: number;
  hasUserUpvoted: boolean;
  createdAt: string;
  user: { id: string; name: string };
  attachments: { url: string; filename: string }[];
}

interface FeedbackListProps {
  refreshTrigger?: number;
  isAdmin?: boolean;
}

const areaOptions = [
  { value: 'all', label: 'All Areas' },
  { value: 'CONTACTS', label: 'Contacts' },
  { value: 'ENRICHMENT', label: 'Enrichment' },
  { value: 'EXPLORE', label: 'Explore' },
  { value: 'IMPORT_EXPORT', label: 'Import/Export' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'OTHER', label: 'Other' },
];

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'BUG', label: 'Bug' },
  { value: 'ENHANCEMENT', label: 'Enhancement' },
  { value: 'IDEA', label: 'Idea' },
  { value: 'QUESTION', label: 'Question' },
];

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
];

export function FeedbackList({ refreshTrigger = 0, isAdmin = false }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState('popular');
  const [areaFilter, setAreaFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (areaFilter !== 'all') params.set('area', areaFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const response = await fetch(`/api/feedback?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [sort, areaFilter, typeFilter, refreshTrigger]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-border">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-border">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            {areaOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] bg-bg-tertiary border-border">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Count badge */}
        <span className="ml-auto text-sm text-text-tertiary">
          {feedback.length} item{feedback.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && feedback.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>No feedback found.</p>
          <p className="text-sm text-text-tertiary mt-1">
            Be the first to share your thoughts!
          </p>
        </div>
      )}

      {/* Feedback list */}
      {!isLoading && feedback.length > 0 && (
        <div className="space-y-3">
          {feedback.map((item) => (
            <FeedbackCard key={item.id} feedback={item} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Fetches feedback from API
- [ ] Sort dropdown (popular, recent, oldest)
- [ ] Area filter dropdown
- [ ] Type filter dropdown
- [ ] Item count badge
- [ ] Loading spinner
- [ ] Empty state message
- [ ] Refreshes on filter/sort change
- [ ] Refreshes on refreshTrigger change
- [ ] Passes isAdmin to FeedbackCard

---

### Task 3.9: Create Barrel Export
**Description:** Create index.ts for feedback components
**Size:** Small
**Priority:** Low
**Dependencies:** Task 3.1-3.8

**Technical Requirements:**

Create `src/components/feedback/index.ts`:

```typescript
export { FeedbackButton } from './FeedbackButton';
export { FeedbackDialog } from './FeedbackDialog';
export { FeedbackForm } from './FeedbackForm';
export { FeedbackList } from './FeedbackList';
export { FeedbackCard } from './FeedbackCard';
export { UpvoteButton } from './UpvoteButton';
export { StatusBadge } from './StatusBadge';
export { FileUploadInput } from './FileUploadInput';
```

**Acceptance Criteria:**
- [ ] All components exported from index.ts
- [ ] Can import as `import { FeedbackButton } from '@/components/feedback'`

---

### Task 3.10: Create AddContactTile Component
**Description:** "Add Contact" tile for contacts list header
**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 3.1-3.8

**Technical Requirements:**

Create `src/components/contacts/AddContactTile.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddContactTileProps {
  variant: 'card' | 'row';
}

export function AddContactTile({ variant }: AddContactTileProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push('/contacts/new');
  };

  if (variant === 'card') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full bg-bg-tertiary/50',
          'border-2 border-dashed border-gold-primary/30',
          'hover:border-gold-primary/50 hover:bg-bg-tertiary',
          'rounded-xl p-4',
          'flex items-center justify-center gap-3',
          'transition-all cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-gold-primary/50'
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-primary/20">
          <Plus className="h-5 w-5 text-gold-primary" />
        </div>
        <span className="font-medium text-text-secondary">Add Contact</span>
      </button>
    );
  }

  // Row variant for desktop table
  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full bg-bg-tertiary/30',
        'border-b border-gold-primary/20',
        'hover:bg-bg-tertiary/50',
        'px-4 py-3',
        'flex items-center gap-3',
        'cursor-pointer transition-all',
        'focus:outline-none focus:ring-2 focus:ring-gold-primary/50 focus:ring-inset'
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-primary/20">
        <Plus className="h-4 w-4 text-gold-primary" />
      </div>
      <span className="text-sm font-medium text-text-secondary">Add Contact</span>
    </button>
  );
}
```

**Acceptance Criteria:**
- [ ] Two variants: card (mobile) and row (desktop)
- [ ] Card: dashed border, centered content, rounded
- [ ] Row: subtle background, left-aligned
- [ ] Plus icon with gold accent
- [ ] Navigates to /contacts/new on click
- [ ] Hover and focus states
- [ ] Accessible: button element

---

## Phase 4: Pages & Integration

### Task 4.1: Create Feedback Portal Page
**Description:** Main feedback page at /feedback
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.6, 3.8
**Can run parallel with:** Task 4.2

**Technical Requirements:**

Create `src/app/(dashboard)/feedback/page.tsx`:

```typescript
import { Metadata } from 'next';
import { FeedbackPageClient } from './FeedbackPageClient';
import { getCurrentUserRole } from '@/lib/auth-helpers';

export const metadata: Metadata = {
  title: 'Feedback | Better Connections',
  description: 'Share feedback, report bugs, or suggest features',
};

export default async function FeedbackPage() {
  const role = await getCurrentUserRole();
  const isAdmin = role === 'SYSTEM_ADMIN';

  return <FeedbackPageClient isAdmin={isAdmin} />;
}
```

Create `src/app/(dashboard)/feedback/FeedbackPageClient.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackDialog, FeedbackList } from '@/components/feedback';

interface FeedbackPageClientProps {
  isAdmin: boolean;
}

export function FeedbackPageClient({ isAdmin }: FeedbackPageClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Feedback Portal</h1>
          <p className="text-sm text-text-secondary mt-1">
            Share your feedback, report bugs, or suggest features
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-gold-primary hover:bg-gold-light text-bg-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Feedback
        </Button>
      </div>

      {/* Feedback List */}
      <FeedbackList refreshTrigger={refreshTrigger} isAdmin={isAdmin} />

      {/* Submission Dialog */}
      <FeedbackDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Page at /feedback within dashboard layout
- [ ] Header with title and "Add Feedback" button
- [ ] FeedbackList with admin detection
- [ ] FeedbackDialog opens on button click
- [ ] List refreshes after successful submission
- [ ] Metadata for SEO

---

### Task 4.2: Add FeedbackButton to Dashboard Layout
**Description:** Add FeedbackButton component to dashboard layout
**Size:** Small
**Priority:** High
**Dependencies:** Task 3.1
**Can run parallel with:** Task 4.1

**Technical Requirements:**

Modify `src/app/(dashboard)/layout.tsx`:

```typescript
// Add import
import { FeedbackButton } from '@/components/feedback';

// Add FeedbackButton before closing tag of layout wrapper
// Inside the return, add:
<FeedbackButton />
```

**Implementation Steps:**
1. Open `src/app/(dashboard)/layout.tsx`
2. Add import for FeedbackButton
3. Add `<FeedbackButton />` as last child of the layout wrapper

**Acceptance Criteria:**
- [ ] FeedbackButton visible on all dashboard pages
- [ ] Positioned bottom-right with correct mobile clearance
- [ ] Navigates to /feedback on click

---

### Task 4.3: Integrate AddContactTile into Contacts Page
**Description:** Add AddContactTile to contacts list and remove FAB if present
**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.10
**Can run parallel with:** Task 4.1, 4.2

**Technical Requirements:**

Modify `src/components/contacts/ContactsView.tsx` (or contacts page):

1. Import AddContactTile
2. Render AddContactTile at top of list when:
   - No search query active
   - No filters active
3. Remove existing FAB for "Add contact" if present

**Implementation Logic:**
```typescript
// At top of contacts list, before first contact
{!searchQuery && !hasActiveFilters && (
  <AddContactTile variant={isMobile ? 'card' : 'row'} />
)}
```

**Acceptance Criteria:**
- [ ] AddContactTile appears at top of contacts list
- [ ] Card variant on mobile, row variant on desktop
- [ ] Hidden when search query is active
- [ ] Hidden when filters are active
- [ ] Existing "Add contact" FAB removed
- [ ] FeedbackButton is the only FAB now

---

### Task 4.4: Create Supabase Storage Bucket
**Description:** Create feedback-attachments bucket in Supabase
**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** All tasks

**Implementation Steps:**
1. Open Supabase dashboard
2. Navigate to Storage
3. Create new bucket: `feedback-attachments`
4. Set as Public bucket
5. Configure policy to allow authenticated uploads

**Supabase Policy:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

-- Allow public reads
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'feedback-attachments');
```

**Acceptance Criteria:**
- [ ] Bucket `feedback-attachments` exists
- [ ] Public access enabled
- [ ] Authenticated users can upload
- [ ] Anyone can view uploaded files

---

## Phase 5: Testing & Polish

### Task 5.1: Test Feedback Submission Flow
**Description:** Manual QA of feedback submission
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1-4 complete

**Test Cases:**
- [ ] Submit feedback with all area options
- [ ] Submit feedback with all type options
- [ ] Submit with attachments (1, 2, 3 files)
- [ ] Submit without attachments
- [ ] Verify title validation (min 5, max 200)
- [ ] Verify description validation (min 10, max 5000)
- [ ] Verify file type validation (reject non-image)
- [ ] Verify file size validation (reject > 5MB)
- [ ] Verify toast on success
- [ ] Verify list refresh after submission

---

### Task 5.2: Test Voting Flow
**Description:** Manual QA of upvoting functionality
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1-4 complete

**Test Cases:**
- [ ] Upvote feedback item (count increases)
- [ ] Remove upvote (count decreases)
- [ ] Verify vote persists across page refresh
- [ ] Verify optimistic UI (instant feedback)
- [ ] Verify rollback on API error
- [ ] Test voting on multiple items

---

### Task 5.3: Test Admin Status Management
**Description:** Manual QA of admin status editing
**Size:** Small
**Priority:** High
**Dependencies:** Phase 1-4 complete, Task 1.6

**Test Cases:**
- [ ] Verify status dropdown visible for admin
- [ ] Verify status badge is static for non-admin
- [ ] Change status to each value
- [ ] Verify toast on status change
- [ ] Verify list updates after status change
- [ ] Test status change on multiple items

---

### Task 5.4: Test Mobile Responsiveness
**Description:** Manual QA on mobile viewport
**Size:** Medium
**Priority:** High
**Dependencies:** Phase 1-4 complete

**Test Cases:**
- [ ] FeedbackButton clears bottom nav (bottom-20)
- [ ] FeedbackDialog is scrollable
- [ ] FeedbackForm is usable on small screens
- [ ] FeedbackCard renders correctly
- [ ] AddContactTile shows card variant
- [ ] Touch targets are adequate (44px+)
- [ ] Filters are accessible on mobile

---

### Task 5.5: Add Loading Skeletons
**Description:** Add skeleton loading states
**Size:** Small
**Priority:** Medium
**Dependencies:** Task 3.8

**Technical Requirements:**
Add skeleton loading in FeedbackList while fetching:

```typescript
// Skeleton card
<div className="bg-bg-secondary border border-border rounded-xl p-4 animate-pulse">
  <div className="flex gap-3">
    <div className="w-12 h-16 bg-bg-tertiary rounded-lg" />
    <div className="flex-1 space-y-3">
      <div className="h-5 bg-bg-tertiary rounded w-3/4" />
      <div className="h-4 bg-bg-tertiary rounded w-full" />
      <div className="h-3 bg-bg-tertiary rounded w-1/2" />
    </div>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Skeleton shown while loading
- [ ] Skeleton matches FeedbackCard layout
- [ ] Smooth transition to real content

---

## Summary

**Total Tasks:** 27
**Estimated Duration:** 4 days

### Phase Breakdown:
- **Phase 1 (Database & Infrastructure):** 6 tasks
- **Phase 2 (API Routes):** 5 tasks
- **Phase 3 (Components):** 10 tasks
- **Phase 4 (Pages & Integration):** 4 tasks
- **Phase 5 (Testing & Polish):** 5 tasks

### Parallel Execution Opportunities:
- Tasks 1.1, 1.2, 1.5 can run in parallel
- Tasks 1.3, 1.4 can run in parallel (after 1.1)
- All Phase 2 tasks can run in parallel (after Phase 1)
- All Phase 3 tasks can run in parallel
- Phase 4 tasks mostly parallel
- Phase 5 sequential (manual testing)

### Critical Path:
1. Schema (1.1) → Migration (1.3) → API Routes (Phase 2) → Components (Phase 3) → Pages (Phase 4)

### Dependencies Chart:
```
1.1 Schema ──┬──> 1.3 Migration ──> 2.1-2.5 API Routes ──┐
1.2 Zod ────┘                                            │
1.4 Auth Helpers ──> 2.3, 2.4                            │
1.5 Storage ──> 2.5                                      │
                                                         │
3.1-3.10 Components (parallel) ─────────────────────────>├──> 4.1-4.4 Pages
                                                         │
                                                         └──> 5.1-5.5 Testing
```
