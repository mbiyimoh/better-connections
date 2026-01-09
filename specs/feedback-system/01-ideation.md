# Feedback System for Better Connections

**Slug:** feedback-system
**Author:** Claude Code
**Date:** 2026-01-09
**Branch:** preflight/feedback-system
**Related:** `feedback-system-better-contacts/` (reference implementation)

---

## 1) Intent & Assumptions

- **Task brief:** Implement a persistent/sticky feedback button that leads to a dedicated feedback portal page with upvoteable entries, adapting the existing reference implementation (`feedback-system-better-contacts/`) to integrate thoughtfully with Better Connections' dark theme, gold accent design system, and mobile-first UX.

- **Assumptions:**
  - Single-user product (no multi-user voting initially, but schema supports future expansion)
  - User is always authenticated when using the app (Supabase auth)
  - File storage via Cloudflare R2 (reference impl uses R2, env vars likely already configured or easy to add)
  - Feedback is for the product owner to collect user feedback (primarily self-feedback or beta tester feedback)
  - Admin functionality for status management is needed (user is own admin)

- **Out of scope:**
  - Public roadmap page (Phase 3 future feature)
  - Changelog integration
  - Email notifications for status changes (can add later)
  - AI-powered duplicate detection (Phase 2 feature)
  - Multi-user voting/team features

---

## 2) Pre-reading Log

- `feedback-system-better-contacts/README.md`: Complete architecture overview - FAB button, dialog, form, list, card, upvote components. API routes for CRUD, voting, and file upload. Cloudflare R2 for storage.

- `feedback-system-better-contacts/SETUP-GUIDE.md`: Step-by-step integration guide. Requires shadcn components, Prisma schema additions, env vars for R2.

- `feedback-system-better-contacts/schema/prisma-additions.prisma`: Three models - Feedback, FeedbackVote, FeedbackAttachment. Enums for Area, Type, Status. Denormalized upvoteCount for sorting performance.

- `feedback-system-better-contacts/lib/validation-additions.ts`: Zod schemas for create/update/vote actions. FeedbackArea is customizable per app.

- `feedback-system-better-contacts/components/feedback/`: 7 components - FeedbackButton (FAB), FeedbackDialog (modal wrapper), FeedbackForm (multi-step), FeedbackList (with filters), FeedbackCard (individual item), UpvoteButton (optimistic UI), FileUploadInput (drag-drop).

- `feedback-system-better-contacts/app/api/feedback/`: API routes - POST/GET feedback, GET/PATCH single item, POST vote toggle, POST file upload.

- `src/app/(dashboard)/layout.tsx`: Dashboard layout with AppShell, auth check, onboarding check. FeedbackButton would go here.

- `src/components/layout/Sidebar.tsx`: Navigation structure with navItems array. Feedback could be added as nav item or remain floating.

- `src/lib/supabase/server.ts`: Auth pattern using `createServerSupabaseClient()` and `.auth.getUser()`.

- `src/lib/db.ts`: Prisma client singleton pattern.

- `src/lib/design-system.ts`: BRAND_GOLD colors (#d4a54a, #e5c766), TAG_CATEGORY_COLORS pattern.

- `prisma/schema.prisma`: User model with relations. No existing feedback relations.

- `tailwind.config.ts`: Extended colors including gold, bg, text, category colors. Font families.

---

## 3) Codebase Map

- **Primary components/modules:**
  - `src/app/(dashboard)/layout.tsx` - Where FeedbackButton will be added
  - `src/components/feedback/` - New directory for all feedback components
  - `src/app/feedback/page.tsx` - New feedback portal page
  - `src/app/api/feedback/` - New API routes directory
  - `prisma/schema.prisma` - Schema additions
  - `src/lib/validations/` - New validation schemas

- **Shared dependencies:**
  - `src/lib/supabase/server.ts` - Auth (replaces reference's `@/lib/auth`)
  - `src/lib/db.ts` - Prisma client (replaces `@/lib/db`)
  - `src/lib/design-system.ts` - Colors and design tokens
  - `src/contexts/AuthContext.tsx` - Client-side auth (for UpvoteButton)
  - `sonner` - Toast notifications (already installed)
  - `@aws-sdk/client-s3` - R2 client (needs install if not present)
  - `date-fns` - Date formatting (already used in codebase)

- **Data flow:**
  - User clicks FAB → navigates to `/feedback` (or opens dialog)
  - `/feedback` page fetches list via GET `/api/feedback`
  - User clicks "Add Feedback" → dialog with FeedbackForm
  - Form submission → POST `/api/feedback` with optional file upload
  - Upvote click → POST `/api/feedback/[id]/vote` with optimistic UI
  - Admin status change → PATCH `/api/feedback/[id]`

- **Feature flags/config:**
  - R2 env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - No feature flag needed (always visible after implementation)

- **Potential blast radius:**
  - `prisma/schema.prisma` - Requires migration, adds to User model
  - `src/app/(dashboard)/layout.tsx` - Minor addition (FeedbackButton)
  - No changes to existing components
  - Isolated feature with clear boundaries

---

## 4) Root Cause Analysis

N/A - This is a new feature implementation, not a bug fix.

---

## 5) Research Findings

### Potential Solutions

#### **Option A: Direct Port of Reference Implementation (Recommended)**

Port the existing `feedback-system-better-contacts/` implementation with minimal modifications, adapting only:
- Import paths for auth/db
- FeedbackArea enum values for Better Connections
- Styling to match dark theme/gold accent

**Pros:**
- Fastest implementation (2-3 days)
- Proven, working code
- All edge cases already handled (optimistic UI, file upload, voting)
- Reference code is well-documented with CUSTOMIZE comments

**Cons:**
- May have slight style inconsistencies initially
- FeedbackButton styling needs dark theme adaptation
- Uses bottom-left positioning (may want bottom-right for mobile)

#### **Option B: Build Custom with Reference as Guide**

Use reference as architectural guide but rebuild components to better match existing Better Connections patterns.

**Pros:**
- More consistent with existing codebase style
- Can optimize for mobile-first from start
- Can add features like duplicate detection from start

**Cons:**
- 2-3x longer implementation time
- Risk of introducing bugs reference already solved
- Over-engineering for MVP

#### **Option C: Use Third-Party Feedback Service**

Integrate Canny, Featurebase, or similar SaaS.

**Pros:**
- No maintenance burden
- Advanced features (AI, analytics, roadmap)
- Professional UI

**Cons:**
- Monthly cost ($49-400/mo)
- External dependency
- Less control over UX
- Overkill for single-user product

### Recommendation

**Option A: Direct Port** is the clear winner for MVP:

1. Reference implementation is high-quality, production-ready code
2. CUSTOMIZE comments make adaptation straightforward
3. Can iterate to Option B patterns later if needed
4. Fastest path to working feature

### Key Adaptations Needed

1. **FeedbackArea Enum** - Change from NODE_TREE_UI/MAIN_AI_CHAT/COMPASS/SCOPE_TOOL to:
   - `CONTACTS` - Contact management features
   - `ENRICHMENT` - Enrichment flow
   - `EXPLORE` - Chat exploration
   - `IMPORT_EXPORT` - CSV/VCF import/export
   - `MOBILE` - Mobile-specific issues
   - `OTHER` - Catch-all

2. **FeedbackButton Styling** - Adapt to dark theme:
   ```tsx
   // Reference uses default shadcn Button
   // Better Connections needs gold accent
   className="fixed bottom-6 right-6 z-50 bg-gold-primary hover:bg-gold-light text-bg-primary shadow-lg"
   ```

3. **Auth Import Paths** - Replace:
   ```typescript
   // Reference
   import { getCurrentUser } from '@/lib/auth'

   // Better Connections
   import { createServerSupabaseClient } from '@/lib/supabase/server'
   ```

4. **Position Change** - Move FAB from bottom-left to bottom-right (more natural for right-handed mobile users, doesn't conflict with sidebar on desktop)

5. **Mobile Bottom Nav Conflict** - Add `bottom-20` on mobile to clear the 64px bottom nav:
   ```tsx
   className="fixed bottom-6 md:bottom-6 bottom-20 right-6 z-50"
   ```

---

## 6) Clarifications

### Questions for User Decision

1. **FAB Position:**
   - **Option A:** Bottom-right (recommended - standard mobile pattern, doesn't conflict with sidebar)
   - **Option B:** Bottom-left (matches reference implementation)
   - **Decision needed:** Which position do you prefer?
   >> option A. we already have a fab in the bottom right for adding a contact, but the typical pattern will be import, so maybe we can just create a "add new" contact tile at the very top of the contact list (let me know if you need clarification but basically just imagine the same basic component that we use to display contacts, but the one at the top is actually a button to create a new contact)

2. **Feedback Portal Location:**
   - **Option A:** Dedicated route `/feedback` (recommended - matches reference, cleaner UX)
   - **Option B:** Modal only (no dedicated page, all in dialog)
   - **Option C:** Add to Settings page as section
   - **Decision needed:** Where should the main feedback list live?
   >> option A

3. **Navigation Integration:**
   - **Option A:** FAB only (always visible, no sidebar entry)
   - **Option B:** FAB + sidebar nav item (redundant but discoverable)
   - **Option C:** Sidebar only (no floating button)
   - **Decision needed:** Should feedback have a sidebar entry in addition to/instead of FAB?
   >> option A

4. **File Storage:**
   - **Option A:** Cloudflare R2 (reference uses this, zero egress fees)
   - **Option B:** Vercel Blob (easier setup if already using Vercel)
   - **Option C:** Supabase Storage (already using Supabase)
   - **Decision needed:** Which storage service? (affects env vars needed)
   >> supabase for simplicity / centralization

5. **Admin Status Management:**
   - **Option A:** Inline on cards (click status badge to change)
   - **Option B:** Separate admin view (like reference - admin route only)
   - **Option C:** Both options
   - **Decision needed:** Since you're the admin, how do you want to manage status?
   >> option A sounds like the interaction / UX that I want, but I certainly don't want anybody but me to be able to update those statuses. so ya, maybe a /feedback-admin route that is simple password-protected? I have a user account for this product and I don't want to deal with the headache of those lines getting muddy, unless there's just a simple way to add a "type" to users or something like that, where we can just assign the "type" for my user to "system-admin" which then would give me (or anybody whose user record has that type) access to that route. but I'm no expert in this stuff so let me know your thoughts after considering this response
---

## 7) Implementation Approach (Pending Clarifications)

### Phase 1: Core MVP (2-3 days)
1. Add Prisma schema (Feedback, FeedbackVote, FeedbackAttachment models)
2. Run migration
3. Copy and adapt components from reference:
   - FeedbackButton (with dark theme styling)
   - FeedbackDialog
   - FeedbackForm (with BC-specific areas)
   - FeedbackList
   - FeedbackCard
   - UpvoteButton
   - FileUploadInput
4. Create API routes (copy with auth adaptations)
5. Add R2 client (if not present)
6. Create `/feedback` page
7. Add FeedbackButton to dashboard layout

### Phase 2: Polish (1-2 days)
1. Mobile responsive testing
2. Status management UI
3. Filter by area/type
4. Sort by popular/recent

### Phase 3: Future Enhancements
1. Email notifications
2. Duplicate detection
3. Public roadmap view
4. Analytics dashboard

---

## 8) Technical Notes

### Auth Pattern (Better Connections Style)
```typescript
// In API routes
const supabase = await createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Client Auth (For UpvoteButton)
```typescript
// In client components
import { useAuth } from '@/contexts/AuthContext';

export function UpvoteButton(...) {
  const { user } = useAuth();
  // ...
}
```

### Design System Usage
```typescript
// Use Tailwind classes from tailwind.config.ts
className="bg-gold-primary hover:bg-gold-light text-bg-primary"
className="bg-bg-tertiary border-gold-primary/20"
className="text-text-primary text-text-secondary"
```

### Feedback Status Colors (Dark Theme)
```typescript
const statusColors = {
  OPEN: 'bg-bg-tertiary text-text-secondary',
  IN_REVIEW: 'bg-blue-500/20 text-blue-400',
  PLANNED: 'bg-purple-500/20 text-purple-400',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CLOSED: 'bg-bg-tertiary text-text-tertiary',
}
```

### Feedback Type Colors (Dark Theme)
```typescript
const typeColors = {
  BUG: 'bg-red-500/20 text-red-400',
  ENHANCEMENT: 'bg-blue-500/20 text-blue-400',
  IDEA: 'bg-amber-500/20 text-amber-400',
  QUESTION: 'bg-purple-500/20 text-purple-400',
}
```

---

## 9) Dependencies to Add

```bash
# If not already installed
npm install @aws-sdk/client-s3
```

### shadcn/ui Components (Verify Present)
- Button, Card, Badge, Avatar - likely present
- Dialog, Input, Textarea, Select - likely present
- Check with `ls src/components/ui/`

### Environment Variables Needed
```bash
# .env.local additions
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
```

---

## 10) Files to Create/Modify

### New Files
```
src/components/feedback/
├── FeedbackButton.tsx
├── FeedbackDialog.tsx
├── FeedbackForm.tsx
├── FeedbackList.tsx
├── FeedbackCard.tsx
├── UpvoteButton.tsx
└── FileUploadInput.tsx

src/app/feedback/
└── page.tsx

src/app/api/feedback/
├── route.ts
├── [id]/
│   ├── route.ts
│   └── vote/
│       └── route.ts
└── upload/
    └── route.ts

src/lib/storage/
└── r2-client.ts

src/lib/validations/
└── feedback.ts (or add to existing validation file)
```

### Modified Files
```
prisma/schema.prisma - Add Feedback models, User relations
src/app/(dashboard)/layout.tsx - Add FeedbackButton
```

---

## Summary

This ideation document provides a comprehensive plan for implementing the feedback system. The recommended approach is to **directly port the reference implementation** with adaptations for Better Connections' auth system, design system, and navigation patterns.

**Awaiting clarification on:**
1. FAB position (bottom-right vs bottom-left)
2. Feedback portal location (/feedback page vs modal-only)
3. Navigation integration (FAB only vs sidebar entry)
4. File storage service (R2 vs Vercel Blob vs Supabase)
5. Admin status management approach

Once these decisions are made, implementation can proceed immediately with the Phase 1 MVP (estimated 2-3 days).
