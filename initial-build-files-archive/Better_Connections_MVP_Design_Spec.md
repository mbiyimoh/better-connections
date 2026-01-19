# Better Connections MVP — Design Specification

> **Purpose:** Reference document for prototyping all MVP pages/experiences.  
> **Status:** Working spec — will evolve during prototyping.  
> **Design System:** Inherits from V1 prototype (dark theme, gold accents, glassmorphism).

---

## Design System Reference

### Colors
```
Background Primary:    #0D0D0F
Background Secondary:  #1A1A1F  
Background Tertiary:   #252529
Glass:                 rgba(26, 26, 31, 0.85)
Border:                rgba(255, 255, 255, 0.08)

Text Primary:          #FFFFFF
Text Secondary:        #A0A0A8
Text Tertiary:         #606068

Gold Primary:          #C9A227
Gold Light:            #E5C766
Gold Subtle:           rgba(201, 162, 39, 0.15)

Category - Relationship: #3B82F6 (blue)
Category - Opportunity:  #22C55E (green)
Category - Expertise:    #A855F7 (purple)
Category - Interest:     #F59E0B (amber)

Success:               #4ADE80
Warning:               #FBBF24
Error:                 #EF4444
```

### Typography
```
Font Family:           -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Heading 1:             32px / 700
Heading 2:             24px / 600
Heading 3:             18px / 600
Body:                  14px / 400
Small:                 13px / 400
Caption:               11px / 600 / uppercase / letter-spacing: 1px
```

### Spacing Scale
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Components (Reusable)
- GlassCard (with hover variant)
- Button (primary/secondary/ghost, sm/md/lg)
- Badge (category-coded)
- Input (text, textarea, search)
- Table (with sortable headers)
- Modal (centered, backdrop blur)
- Dropdown/Select
- Checkbox
- Avatar (initials fallback)
- EmptyState (icon + message + CTA)
- Toast (success/error/info)

---

## Page Architecture

```
┌─────────────────────────────────────────────────────────┐
│  App Shell (persistent)                                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Sidebar (collapsible on mobile)                    ││
│  │  - Logo                                             ││
│  │  - Nav: Contacts, Enrichment, Explore, Settings     ││
│  │  - User menu (bottom)                               ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │  Main Content Area                                  ││
│  │  - Page header (title + actions)                    ││
│  │  - Page content                                     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 1. App Shell & Navigation

### Purpose
Persistent wrapper providing navigation and user context across all authenticated pages.

### Layout
```
┌──────┬────────────────────────────────────────────────┐
│      │                                                │
│  N   │                                                │
│  A   │          Main Content Area                     │
│  V   │          (varies by page)                      │
│      │                                                │
│      │                                                │
├──────┤                                                │
│ User │                                                │
└──────┴────────────────────────────────────────────────┘
```

### Sidebar Nav Items
| Icon | Label | Route | Badge |
|------|-------|-------|-------|
| Users | Contacts | /contacts | Total count |
| Sparkles | Enrich | /enrich | "X to enrich" |
| MessageSquare | Explore | /explore | — |
| Settings | Settings | /settings | — |

### Sidebar Specs
- Width: 240px (expanded), 64px (collapsed)
- Background: #0D0D0F
- Border-right: 1px solid rgba(255,255,255,0.08)
- Logo: "BC" monogram or full "Better Connections" when expanded
- Active state: Gold left border + subtle gold background
- Hover state: rgba(255,255,255,0.05) background

### User Menu (Bottom of Sidebar)
- Avatar (initials) + Name + dropdown arrow
- Dropdown: Profile, Settings, Logout

### Mobile Behavior
- Hamburger menu in top-left
- Sidebar slides in as overlay
- Backdrop blur behind

---

## 2. Contacts Table Page

### Purpose
Central hub for viewing, searching, filtering, and acting on all contacts.

### Route
`/contacts` (default landing page after login)

### Layout
```
┌────────────────────────────────────────────────────────┐
│ Contacts                              [+ Add Contact]  │
├────────────────────────────────────────────────────────┤
│ [🔍 Search contacts...]  [Filter ▾]  [Sort ▾]         │
├────────────────────────────────────────────────────────┤
│ ☐ │ Name          │ Title        │ Tags    │ Last    │→│
├───┼───────────────┼──────────────┼─────────┼─────────┼─┤
│ ☐ │ ●  Sarah Chen │ Angel invest │ ●● ●    │ 3mo ago │⋯│
│ ☐ │ ●  David Park │ VC Partner   │ ●●      │ 6mo ago │⋯│
│ ☐ │ ●  Marcus Che │ Founder, Acm │ ●       │ 1mo ago │⋯│
│   │               │              │         │         │ │
│   │               │              │         │         │ │
├────────────────────────────────────────────────────────┤
│ Showing 1-25 of 142 contacts          [< 1 2 3 ... >] │
└────────────────────────────────────────────────────────┘
```

### Header Bar
- Page title: "Contacts" (H1)
- Primary action: [+ Add Contact] button (gold)

### Search & Filter Bar
- Search input: Full-text search across name, email, notes, tags
- Filter dropdown: 
  - By category (Relationship, Opportunity, Expertise, Interest)
  - By tag (multi-select from existing tags)
  - By relationship strength (1-4)
  - By enrichment status (Enriched / Needs enrichment)
  - By date added (last 7d, 30d, 90d, all)
- Sort dropdown:
  - Name (A-Z, Z-A)
  - Last contacted (recent first, oldest first)
  - Date added (newest, oldest)
  - Relationship strength (strongest, weakest)

### Table Columns
| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Checkbox | 40px | No | Bulk selection |
| Name | flex | Yes | Avatar + Full name (link to detail) |
| Title | 180px | No | Job title, truncated |
| Tags | 150px | No | Up to 3 badge dots, "+X" overflow |
| Last Contact | 100px | Yes | Relative time (e.g., "3mo ago") |
| Actions | 48px | No | ⋯ menu |

### Row States
- Default: Standard styling
- Hover: Subtle background highlight (rgba(255,255,255,0.03))
- Selected (checkbox): Faint gold background (rgba(201,162,39,0.08))

### Row Actions Menu (⋯)
- View Profile
- Quick Enrich
- Draft Intro
- Edit
- Delete (with confirmation)

### Bulk Actions (appears when rows selected)
- Floating bar at bottom of screen
- Shows: "X selected" + action buttons
- Actions: Add Tags, Remove Tags, Delete, Export

### Empty State
- Icon: Users (large, muted)
- Headline: "No contacts yet"
- Subtext: "Add your first contact or import from CSV"
- CTAs: [Add Contact] [Import CSV]

### Empty Search State
- Icon: Search (muted)
- Headline: "No results found"
- Subtext: "Try adjusting your search or filters"
- CTA: [Clear filters]

### Pagination
- 25 items per page
- Show: "Showing 1-25 of 142 contacts"
- Controls: Previous / page numbers / Next

---

## 3. Contact Detail Page

### Purpose
Full view and edit interface for a single contact. All information in one place.

### Route
`/contacts/:id`

### Layout
```
┌────────────────────────────────────────────────────────┐
│ ← Back to Contacts                        [Edit] [⋯]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌──────────┐                                         │
│   │  Avatar  │   Sarah Chen                            │
│   │   (SC)   │   Angel Investor · Sold SaaS 2021       │
│   └──────────┘   📍 San Francisco · 📧 sarah@email.com │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ Why Now ────────────────────────────────────────┐  │
│  │ F&F round experience, warm relationship, you     │  │
│  │ helped her with analytics last year.             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Relationship ───────────────────────────────────┐  │
│  │ Strength: ●●●○ Strong                            │  │
│  │ Last contact: 3 months ago                       │  │
│  │ How we met: Google AI program (2023)             │  │
│  │ History: Collaborated on analytics — impressed   │  │
│  │ with speed of delivery.                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Profile ────────────────────────────────────────┐  │
│  │ Expertise: SaaS operations, B2B sales, fundrais  │  │
│  │ Interests: Trail running, mentoring, wine        │  │
│  │ LinkedIn: linkedin.com/in/sarahchen              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Tags ───────────────────────────────────────────┐  │
│  │ [● Potential LP] [● Warm relationship] [+ Add]   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Notes ──────────────────────────────────────────┐  │
│  │ She mentioned her fund is deploying in Q1.       │  │
│  │ Follow up after the holidays.                    │  │
│  │                                                  │  │
│  │ [Save note]                                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Quick Actions ──────────────────────────────────┐  │
│  │ [Enrich Contact] [Draft Intro] [Set Reminder]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Header
- Back link: "← Back to Contacts"
- Actions: [Edit] (secondary button), [⋯] menu (Delete, Export)

### Profile Header Card
- Large avatar (80px) with initials fallback
- Name (H1)
- Title/Role
- Location (with icon)
- Email (with icon, clickable mailto:)
- LinkedIn (if available, external link)

### Sections (GlassCards)

**Why Now**
- Gold-tinted background (like in chat exploration)
- Editable text field
- Auto-saves on blur

**Relationship**
- Strength: Visual indicator (4 dots) + label
- Last contact: Date with relative time
- How we met: Text field
- History: Longer text area

**Profile**
- Expertise: Text (comma-separated or freeform)
- Interests: Text
- External links: LinkedIn, Twitter, Website (optional)

**Tags**
- Display existing tags as Badges
- [+ Add] button opens tag picker/creator
- Click X on badge to remove

**Notes**
- Expandable textarea
- Timestamp on each note (future: multiple notes as timeline)
- [Save] button (or auto-save)

### Quick Actions Bar
- Sticky at bottom on mobile, inline on desktop
- [Enrich Contact] → Opens enrichment session with this contact preloaded
- [Draft Intro] → Opens draft modal
- [Set Reminder] → Future feature (disabled/hidden for MVP)

---

## 4. Add Contact / Import Page

### Purpose
Get contacts into the system — manually or via CSV import.

### Route
`/contacts/new` (manual add)  
`/contacts/import` (CSV import)

### Tab Structure
```
┌────────────────────────────────────────────────────────┐
│ Add Contacts                                           │
├────────────────────────────────────────────────────────┤
│ [Manual Entry]  [Import CSV]                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│   (Tab content below)                                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Tab 1: Manual Entry
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Name *              [________________________]        │
│  Email               [________________________]        │
│  Title / Role        [________________________]        │
│  Company             [________________________]        │
│  Location            [________________________]        │
│  LinkedIn URL        [________________________]        │
│                                                        │
│  How do you know them?                                 │
│  [_______________________________________________]     │
│  [_______________________________________________]     │
│                                                        │
│  Tags                [+ Add tag]                       │
│                                                        │
│  ☐ Start enrichment session after saving              │
│                                                        │
│            [Cancel]  [Save Contact]                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Fields**
| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Name | Yes | text | First + Last |
| Email | No | email | Validated format |
| Title | No | text | Job title |
| Company | No | text | Current company |
| Location | No | text | City or City, State |
| LinkedIn | No | url | Validated LinkedIn URL |
| How we know | No | textarea | Seeds relationship context |
| Tags | No | tag picker | Multi-select or create new |

**Checkbox Option**
- "Start enrichment session after saving" — defaults checked
- If checked, after save → redirect to enrichment with new contact

### Tab 2: Import CSV
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │                                                │   │
│   │      📄 Drag & drop CSV file here              │   │
│   │         or click to browse                     │   │
│   │                                                │   │
│   │      Supports: .csv, .xlsx                     │   │
│   │                                                │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
│   Download template: [CSV Template]                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**After File Upload — Field Mapping**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Map your columns to contact fields                    │
│                                                        │
│  Your Column          →    Contact Field              │
│  ─────────────────────────────────────────────        │
│  "Full Name"          →    [Name           ▾]         │
│  "Email Address"      →    [Email          ▾]         │
│  "Job Title"          →    [Title          ▾]         │
│  "Company Name"       →    [Company        ▾]         │
│  "City"               →    [Location       ▾]         │
│  "Notes"              →    [How we know    ▾]         │
│                                                        │
│  Preview (first 3 rows):                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Sarah Chen | sarah@... | Angel Investor | SF     │ │
│  │ David Park | david@... | VC Partner     | Austin │ │
│  │ Marcus Che | marcus@.. | Founder        | NYC    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Found: 142 contacts                                   │
│  Duplicates detected: 3 (will be skipped)             │
│                                                        │
│            [Cancel]  [Import 139 Contacts]             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Import Progress**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   Importing contacts...                                │
│                                                        │
│   [████████████░░░░░░░░░░░░░░]  47 / 139               │
│                                                        │
│   ✓ Sarah Chen                                         │
│   ✓ David Park                                         │
│   → Marcus Chen (importing...)                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Import Complete**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   ✓ Import complete!                                   │
│                                                        │
│   139 contacts imported                                │
│   3 duplicates skipped                                 │
│   0 errors                                             │
│                                                        │
│   [View Contacts]  [Import More]                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 5. Enrichment Queue Page

### Purpose
Dedicated view for contacts that need enrichment. Drives the enrichment habit.

### Route
`/enrich`

### Layout
```
┌────────────────────────────────────────────────────────┐
│ Enrichment Queue                     [Start Session]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  You have 47 contacts that could use more depth.       │
│                                                        │
│  ┌─ Stats ──────────────────────────────────────────┐  │
│  │  Total: 142   Enriched: 95 (67%)   Pending: 47   │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Priority Queue ─────────────────────────────────┐  │
│  │                                                  │  │
│  │  1. Marcus Chen — Added 2 days ago, no context   │  │
│  │     [Enrich Now]  [Skip]                         │  │
│  │                                                  │  │
│  │  2. Lisa Wong — Has email only                   │  │
│  │     [Enrich Now]  [Skip]                         │  │
│  │                                                  │  │
│  │  3. James Miller — Imported, needs details       │  │
│  │     [Enrich Now]  [Skip]                         │  │
│  │                                                  │  │
│  │  ... (scrollable list)                           │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Header
- Title: "Enrichment Queue"
- Primary action: [Start Session] — picks top contact and opens enrichment flow

### Stats Card
- Total contacts
- Enriched count + percentage
- Pending count
- Visual progress bar (gold fill)

### Priority Queue List
Each item shows:
- Rank number
- Name
- Reason for being in queue (e.g., "no context", "email only", "imported recently")
- Actions: [Enrich Now] (primary small), [Skip] (ghost)

**Queue Priority Logic (for backend)**
1. Recently added with no notes/context
2. Has only name + email (low data score)
3. Imported via CSV (bulk adds often need context)
4. Manually skipped items sink to bottom
5. Recently enriched items exit queue

### Empty State
- Icon: Sparkles
- Headline: "All caught up!"
- Subtext: "Every contact has been enriched. Nice work."
- CTA: [View Contacts]

---

## 6. Auth: Login Page

### Purpose
Entry point for existing users.

### Route
`/login`

### Layout
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                                                        │
│            Better Connections                          │
│            ──────────────────                          │
│            Your contacts are flat.                     │
│            Give them some depth.                       │
│                                                        │
│            ┌────────────────────────────┐              │
│            │                            │              │
│            │  Email                     │              │
│            │  [______________________]  │              │
│            │                            │              │
│            │  Password                  │              │
│            │  [______________________]  │              │
│            │                            │              │
│            │  [      Log In         ]   │              │
│            │                            │              │
│            │  Forgot password?          │              │
│            │                            │              │
│            └────────────────────────────┘              │
│                                                        │
│            Don't have an account? Sign up              │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Specs
- Centered card on dark background
- Logo/wordmark at top
- Tagline beneath
- Form fields with floating labels or stacked labels
- Primary button: [Log In] (gold, full width)
- Link: "Forgot password?" → /forgot-password
- Link: "Sign up" → /signup
- Error states: Red border on field, error message below

### Error States
- Invalid email format: "Please enter a valid email"
- Wrong credentials: "Invalid email or password"
- Account not found: "No account found with this email"

---

## 7. Auth: Signup Page

### Purpose
New user registration.

### Route
`/signup`

### Layout
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            Better Connections                          │
│            ──────────────────                          │
│            Start building deeper relationships.        │
│                                                        │
│            ┌────────────────────────────┐              │
│            │                            │              │
│            │  Full Name                 │              │
│            │  [______________________]  │              │
│            │                            │              │
│            │  Email                     │              │
│            │  [______________________]  │              │
│            │                            │              │
│            │  Password                  │              │
│            │  [______________________]  │              │
│            │  Min 8 characters          │              │
│            │                            │              │
│            │  [   Create Account    ]   │              │
│            │                            │              │
│            └────────────────────────────┘              │
│                                                        │
│            Already have an account? Log in             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Fields
| Field | Validation |
|-------|------------|
| Full Name | Required, min 2 chars |
| Email | Required, valid format, unique |
| Password | Required, min 8 chars |

### Post-Signup Flow
1. Create account
2. Auto-login
3. Redirect to `/contacts` (empty state) or `/contacts/import` 
4. Welcome toast: "Welcome to Better Connections!"

---

## 8. Auth: Forgot Password

### Purpose
Password reset initiation.

### Route
`/forgot-password`

### Layout (Request)
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            Reset Password                              │
│            ──────────────────                          │
│            Enter your email to receive reset link.     │
│                                                        │
│            ┌────────────────────────────┐              │
│            │                            │              │
│            │  Email                     │              │
│            │  [______________________]  │              │
│            │                            │              │
│            │  [   Send Reset Link   ]   │              │
│            │                            │              │
│            └────────────────────────────┘              │
│                                                        │
│            ← Back to login                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Layout (Confirmation)
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            ✓ Check your email                          │
│            ───────────────────                         │
│            We sent a reset link to                     │
│            sarah@example.com                           │
│                                                        │
│            [Back to Login]                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 9. Settings Page

### Purpose
Account management and preferences.

### Route
`/settings`

### Layout
```
┌────────────────────────────────────────────────────────┐
│ Settings                                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ Profile ────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Name         [Mbiyimoh Ghogomu     ]            │  │
│  │  Email        [beems@33strategies.com] (verified)│  │
│  │                                                  │  │
│  │                              [Save Changes]      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Security ───────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Password     ••••••••••••  [Change Password]    │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Data ───────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Export all contacts as CSV    [Export]          │  │
│  │                                                  │  │
│  │  Delete account                [Delete Account]  │  │
│  │  This cannot be undone.        (destructive)     │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Sections

**Profile**
- Name: Editable text input
- Email: Editable (with re-verification flow if changed)
- [Save Changes] button (only enabled when dirty)

**Security**
- Password: Masked display + [Change Password] link
- Change password flow: Current password → New password → Confirm

**Data**
- Export: Triggers CSV download of all contacts
- Delete Account: Opens confirmation modal
  - "Are you sure? This will permanently delete your account and all contacts."
  - Must type "DELETE" to confirm
  - [Cancel] [Delete Forever] (red)

---

## 10. Data Model Reference

### Contact
```typescript
interface Contact {
  id: string;
  userId: string;
  
  // Core fields
  name: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  
  // Relationship data
  howWeMet?: string;
  relationshipStrength: 1 | 2 | 3 | 4;  // 1=weak, 4=strong
  lastContactDate?: Date;
  
  // Rich context
  whyNow?: string;
  expertise?: string;
  interests?: string;
  notes?: string;
  
  // Organization
  tags: Tag[];
  
  // Metadata
  enrichmentScore: number;  // 0-100, calculated from field completeness
  source: 'manual' | 'csv' | 'google' | 'linkedin';
  createdAt: Date;
  updatedAt: Date;
  lastEnrichedAt?: Date;
}

interface Tag {
  id: string;
  text: string;
  category: 'relationship' | 'opportunity' | 'expertise' | 'interest';
}
```

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt: Date;
}
```

---

## 11. Prototype Build Order

### Phase 1: Core Structure
1. **App Shell** — Sidebar nav, user menu, layout wrapper
2. **Contacts Table** — The hub (most important page)
3. **Contact Detail** — View/edit single contact

### Phase 2: Data Entry
4. **Add Contact (Manual)** — Simple form
5. **Import CSV** — File upload + field mapping

### Phase 3: Auth
6. **Login** — Entry point
7. **Signup** — Registration
8. **Forgot Password** — Reset flow

### Phase 4: Features
9. **Enrichment Queue** — Priority list view
10. **Settings** — Account management

### Already Prototyped
- ✅ Gamified Enrichment flow
- ✅ Chat Exploration with contact cards
- ✅ Draft Intro modal

---

## 12. Open Questions

- [ ] Should contacts table have inline editing?
- [ ] How do we calculate enrichment score? (field completeness weighted?)
- [ ] Do we need a "recent" or "favorites" quick access section?
- [ ] Should notes be timestamped entries (timeline) or single blob?
- [ ] What's the skip behavior in enrichment queue? Temporary or permanent?
- [ ] Do we want keyboard shortcuts (j/k navigation, e to enrich)?

---

*Last updated: [Current Date]*
*Version: MVP v1.0*
