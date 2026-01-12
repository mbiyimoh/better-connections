# "What's New" Update Notifications System

**Slug:** whats-new-update-notifications
**Author:** Claude Code
**Date:** 2026-01-11
**Branch:** preflight/whats-new-update-notifications
**Related:** Onboarding system (`src/components/onboarding/`), Feedback system (`src/components/feedback/`)

---

## 1) Intent & Assumptions

**Task brief:** Create a system that shows users a "What's New" popup modal whenever new features or improvements are deployed. The system should support two content versions per update (full detailed write-up and bite-sized bullet summary), track whether users have seen each update, and provide a developer workflow where Claude Code can create new "product update checkpoints" from natural language descriptions.

**Assumptions:**
- Single-user product (no multi-tenancy complexity)
- Updates are infrequent (weekly/monthly at most)
- Claude Code will be the primary author of update content
- Users access from multiple devices (need cross-device sync)
- Modal should feel native to the dark theme + gold accent design system
- Updates should be version-controlled in Git alongside code

**Out of scope:**
- Admin UI for creating/editing updates (Claude Code creates files directly)
- Email notifications about updates
- In-app notifications badge outside the modal
- A/B testing different update messaging
- Analytics on update engagement (clicks, dismissals)
- Push notifications

---

## 2) Pre-reading Log

- `prisma/schema.prisma`: User model has `hasCompletedOnboarding: Boolean` pattern - can follow same for `lastSeenUpdateVersion: String?`
- `src/app/(dashboard)/layout.tsx`: Dashboard layout checks user state and conditionally redirects/renders - good place to trigger "What's New" check
- `src/components/onboarding/StoryOnboarding.tsx`: Existing full-screen experience with slides - different pattern than modal overlay
- `src/components/ui/dialog.tsx`: shadcn/ui Dialog component available for modal implementation
- `CLAUDE.md`: Design system uses dark theme, gold (#d4a54a) accents, Framer Motion animations, Lucide icons

---

## 3) Codebase Map

**Primary components/modules:**
- `src/app/(dashboard)/layout.tsx` - Entry point for dashboard, handles auth + onboarding check
- `src/components/ui/dialog.tsx` - shadcn/ui Dialog for modal
- `prisma/schema.prisma` - User model for storing `lastSeenUpdateVersion`

**Shared dependencies:**
- Framer Motion - animations
- Lucide React - icons
- shadcn/ui - Dialog, Button, Badge components
- Design system colors (`@/lib/design-system`)

**Data flow:**
```
Update Files (Markdown/JSON) → Parse at build/runtime → Compare with user.lastSeenUpdateVersion → Show modal if new → User dismisses → Update lastSeenUpdateVersion
```

**Feature flags/config:**
- None currently needed
- Could add `SHOW_WHATS_NEW=false` env var for development

**Potential blast radius:**
- Dashboard layout (adds modal trigger logic)
- User model (adds new field)
- Could conflict with other modals if not managed properly

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research

### Potential Solutions

#### A) User Tracking: Single Column on User Table

**Approach:** Add `lastSeenUpdateVersion: String?` to User model. Compare against latest update version on load.

**Pros:**
- Simple to implement (one Prisma migration)
- Cross-device sync automatic
- Easy to query ("show all users who haven't seen v2024-01-15")
- Follows existing `hasCompletedOnboarding` pattern

**Cons:**
- Can't track which specific updates user has seen (only "latest")
- Requires database call on every page load (can cache with localStorage)

#### B) User Tracking: Join Table (UserSeenUpdates)

**Approach:** Create `UserSeenUpdates` table with `userId` + `updateId` rows.

**Pros:**
- Track exactly which updates each user has seen
- Can show multiple new updates if user missed several
- Analytics-friendly

**Cons:**
- More complex schema
- More database writes (one per update seen)
- Overkill for infrequent updates

#### C) User Tracking: LocalStorage Only

**Approach:** Store `lastSeenUpdateVersion` in browser localStorage.

**Pros:**
- Zero database changes
- Instant checks (no API call)
- Simple implementation

**Cons:**
- No cross-device sync
- Lost on browser clear
- Can't track server-side

---

#### D) Content Storage: Static Markdown Files

**Approach:** Store updates in `/updates/YYYY-MM-DD.md` files with frontmatter for metadata.

```markdown
---
version: "2026-01-15"
title: "AI-Powered Contact Research"
published: true
---

## Summary
- Research contacts with AI-powered web search
- Review and approve recommendations before applying
- Track enrichment score improvements

## Details

### AI-Powered Contact Research
We've added a powerful new research feature...
```

**Pros:**
- Git-versioned (rollback, history, PRs)
- Claude Code can create/edit directly
- No database/CMS infrastructure
- Works with static site generation
- Easy to preview in IDE

**Cons:**
- Requires deployment to publish new updates
- No admin UI (by design for this use case)

#### E) Content Storage: Database Table

**Approach:** Create `ProductUpdate` table with `id`, `version`, `title`, `summary`, `fullContent`, `publishedAt`.

**Pros:**
- Can publish without deploy
- Admin UI possible
- Query-friendly

**Cons:**
- Requires admin UI or SQL to create updates
- Another table to maintain
- Overkill for infrequent updates

---

#### F) Version Scheme: Date-Based (Recommended)

**Approach:** Use ISO date strings like `"2026-01-15"`.

**Pros:**
- Self-documenting (when was this?)
- Natural chronological ordering
- No coordination needed (no "what's the next version number?")
- Claude Code can generate automatically

**Cons:**
- Can't have multiple updates per day (edge case)
- Less "marketing-friendly" than semver

#### G) Version Scheme: Semantic Versioning

**Approach:** Use `v1.2.3` style versions.

**Pros:**
- Industry standard
- Communicates breaking changes
- Marketing-friendly

**Cons:**
- Requires coordination ("is this a minor or patch?")
- Product updates don't map cleanly to semver
- Extra cognitive load

---

### Recommendation

**Hybrid Approach: Database Column + Static Files + Date Versioning**

1. **User tracking:** `lastSeenUpdateVersion: String?` on User model + localStorage cache
2. **Content storage:** Static markdown files in `/updates/YYYY-MM-DD.md`
3. **Version scheme:** Date-based (`"2026-01-15"`)
4. **Triggering:** Check on dashboard layout mount, show modal if new updates exist

**Implementation Flow:**
```
1. Claude Code creates /updates/2026-01-15.md with frontmatter + content
2. Deploy to production
3. User loads dashboard
4. Layout checks: latestUpdate.version > user.lastSeenUpdateVersion?
5. If yes, show WhatsNewModal with parsed content
6. User clicks "Got it" → PATCH /api/user/seen-update → update lastSeenUpdateVersion
7. Modal closes, user continues
```

**Developer Workflow (Claude Code):**
```
User: "Create an update checkpoint for the new research feature"
Claude: Creates /updates/2026-01-15.md with:
  - Frontmatter (version, title, published)
  - Summary section (bullet points for modal)
  - Details section (expandable full content)
```

---

## 6) Clarification

1. **Should users be able to re-access past updates?**
   - Option A: No - once dismissed, gone forever
   - Option B: Yes - "What's New" link in settings/help menu shows all past updates
   - **Recommendation:** Option B (you mentioned "past update logs hyperlinked at bottom")
   >> go with your recommendation

2. **What happens if a user misses multiple updates?**
   - Option A: Show only the latest update
   - Option B: Show all missed updates in sequence/combined modal
   - **Recommendation:** Option A (simpler, users care about current state not history)
   >> go with your recommendation

3. **Should the modal be dismissible by clicking outside / pressing Escape?**
   - Option A: Yes - easy dismiss, might miss content
   - Option B: No - must click "Got it" button
   - **Recommendation:** Option A with prominent "Got it" button (less friction)
   >> go with your recommendation

4. **Should we track partial reads (expanded items)?**
   - Option A: Yes - track which details user expanded
   - Option B: No - just track modal seen/dismissed
   - **Recommendation:** Option B (simpler, analytics out of scope)
   >> go with your recommendation

5. **Should there be a "Don't show these again" option?**
   - Option A: Yes - user can opt out of all future updates
   - Option B: No - always show new updates
   - **Recommendation:** Option B (updates are infrequent, valuable, users should see them)
   >> go with your recommendation

6. **Where should the "View past updates" link live?**
   - Option A: Only in the modal footer
   - Option B: In Settings page
   - Option C: In sidebar/header as persistent link
   - **Recommendation:** Option A + B (modal footer for immediate access, Settings for later)
   >> go with your recommendation

---

## 7) Proposed File Structure

```
/updates/
  2026-01-15.md          # First update
  2026-01-20.md          # Second update
  index.ts               # Exports all updates, sorted

/src/components/whats-new/
  WhatsNewModal.tsx      # Main modal component
  UpdateItem.tsx         # Expandable bullet item
  PastUpdatesList.tsx    # List of past update links
  index.ts               # Barrel exports

/src/lib/updates/
  types.ts               # Update type definitions
  parser.ts              # Parse markdown → Update object
  getLatestUpdate.ts     # Get most recent update
  getAllUpdates.ts       # Get all updates

/src/app/api/user/seen-update/
  route.ts               # PATCH to update lastSeenUpdateVersion

/src/app/(dashboard)/updates/
  page.tsx               # Full changelog page (optional)
```

---

## 8) Estimated Effort

| Task | Estimate |
|------|----------|
| Prisma schema + migration | 30 min |
| Update file parser + types | 1-2 hours |
| WhatsNewModal component | 2-3 hours |
| API route for marking seen | 30 min |
| Dashboard layout integration | 1 hour |
| Past updates page (optional) | 1-2 hours |
| Claude Code slash command | 1 hour |
| Testing + polish | 2 hours |
| **Total** | **8-12 hours** |

---

## 9) Next Steps

1. Get user clarification on questions in Section 6
2. Create detailed spec with component designs
3. Implement in phases:
   - Phase 1: Schema + file structure + parser
   - Phase 2: Modal component + API route
   - Phase 3: Dashboard integration + past updates
   - Phase 4: Claude Code slash command for creating updates
