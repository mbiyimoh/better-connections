# M33T ORGANIZER EXPERIENCE — DESIGN SPECIFICATION

> Comprehensive design document for the five organizer-facing prototypes that extend Better Contacts with event networking capabilities.

**Version:** 1.0  
**Date:** January 2025  
**Purpose:** Handoff guide for Claude Code agents building the M33T event layer on top of Better Contacts

---

## EXECUTIVE SUMMARY

### The Vision

M33T is not a standalone product — it's an **event layer** that sits on top of the Better Contacts CRM platform. This architecture unlocks a powerful synergy:

1. **Guest curation** leverages existing enriched contacts from Better Contacts
2. **Connection recommendations** use the rich profile data already captured
3. **Post-event contacts** flow back into Better Contacts for long-term relationship management
4. **Organizer context** (who you know, relationship strength, "Why Now") enriches every recommendation

### The Five Prototypes

| # | Prototype | Core Purpose |
|---|-----------|--------------|
| 1 | **Event Creation Flow** | Multi-step wizard for creating events and inviting co-organizers |
| 2 | **Guest List Curation Interface** | Build invite list from Better Contacts + AI-powered curation |
| 3 | **Curate Connections Dashboard** | Organizer view of recommended matches, filtered by RSVP status |
| 4 | **Updated Interview Experience** | Slimmed-down pre-event intake that assumes profile data exists |
| 5 | **RSVP Flow & Status Management** | Attendee RSVP journey + organizer tracking dashboard |

---

## RESEARCH FINDINGS: PATTERNS & BUILDING BLOCKS

### Event Management Platforms Analyzed

**RSVPify** — Industry leader in event management dashboards
- Real-time RSVP tracking with live dashboard updates
- Guest segmentation by status, ticket type, custom fields
- Multi-user collaboration with permission levels
- CSV/Excel guest list import with field mapping

**Grip** — AI-powered event networking
- 16+ algorithms for attendee matching
- "Why this match?" visible logic for transparency
- Pre-event meeting scheduling
- Learning algorithm that improves with user interactions

**Brella** — Event matchmaking platform
- Intent-based matching (what attendees want to accomplish)
- Onboarding questions determine matching categories
- Mutual availability for meeting scheduling
- Data compounds across recurring events

**Remo** — AI recommendations
- Complementary interests and opportunities matching
- Background info + conversation starters provided
- "Why Now" contextual relevance for each recommendation

### Key UX Patterns to Adopt

**1. Multi-Step Wizard (Event Creation)**
- Horizontal stepper with labeled steps
- Progress indication (step X of Y)
- Save/resume capability
- Validation between steps
- Summary/review before confirmation

**2. Split-Panel Interface (Guest Curation)**
- Left panel: Search/filter controls
- Right panel: Selected items
- Drag-and-drop between panels
- Bulk actions on selections
- Real-time count indicators

**3. Real-Time Dashboard (RSVP Tracking)**
- Live-updating statistics
- Filter tabs (Confirmed / Maybe / Invited / Declined)
- Expandable cards with progressive disclosure
- Status badges with color coding
- Export functionality

**4. Card-Based Recommendations (Curate Connections)**
- Match cards with "Why" explanation
- Accept/Decline/Skip actions
- Visual match quality indicators
- Filterable by attendee status
- Reorderable based on priority

### React Component Libraries to Consider

**Tremor** — Dashboard components built on Tailwind + Recharts
- Cards, KPIs, progress indicators
- Dark theme support
- Excellent for stat displays

**shadcn/ui** — Already in use for Better Contacts
- Consistent design language
- Accessible components
- Easy theming

**react-resizable-panels** — For split-panel layouts
- Draggable dividers
- Collapsible panels
- Responsive breakpoints

**react-countdown-circle-timer** — For interview timing
- SVG-based circular timer
- Color transitions
- Pause/resume capability

---

## PROTOTYPE 1: EVENT CREATION FLOW

### Purpose

Enable organizers to create a new event with all necessary metadata, invite co-organizers, and establish the foundation for guest curation and connection matching.

### User Stories

1. As an organizer, I want to create a new event so I can start building my guest list
2. As an organizer, I want to add co-organizers so they can help curate guests from their networks
3. As an organizer, I want to set RSVP deadlines so attendees know when to respond
4. As an organizer, I want to configure what profile fields to display on trading cards

### Flow Structure

```
Step 1: Event Basics        Step 2: Venue & Logistics      Step 3: Co-Organizers
┌─────────────────────┐     ┌─────────────────────┐        ┌─────────────────────┐
│ Event Name          │ →   │ Venue Name          │ →      │ Search contacts...  │
│ Date & Time         │     │ Address             │        │ [+ Add Co-Organizer]│
│ Event Type dropdown │     │ Parking Notes       │        │                     │
│ Description         │     │ Dress Code          │        │ ┌─────────────────┐ │
│ Event Goals         │     │ Other Logistics     │        │ │ Sarah Chen      │ │
│                     │     │                     │        │ │ Can invite: ✓   │ │
│                     │     │                     │        │ │ Can curate: ✓   │ │
│                     │     │                     │        │ └─────────────────┘ │
└─────────────────────┘     └─────────────────────┘        └─────────────────────┘
                                                                      │
                                                                      ▼
Step 4: RSVP Settings       Step 5: Profile Card Config    Step 6: Review & Create
┌─────────────────────┐     ┌─────────────────────┐        ┌─────────────────────┐
│ RSVP Deadline       │ ←   │ ☑ Professional Role │ ←      │ Event Summary       │
│ Allow +1s? ○ Yes    │     │ ☑ Company           │        │ ─────────────────── │
│ Capacity Limit      │     │ ☑ Looking For       │        │ Name: AI Summit     │
│ Waitlist? ○ No      │     │ ☑ Can Help With     │        │ Date: Mar 30, 2025  │
│                     │     │ ☐ Personal Interests│        │ Venue: ...          │
│ Reminder Schedule:  │     │ ☐ Fun Facts         │        │ Co-Organizers: 2    │
│ ☑ 1 week before     │     │                     │        │                     │
│ ☑ 1 day before      │     │ [Preview Card →]    │        │ [Create Event]      │
└─────────────────────┘     └─────────────────────┘        └─────────────────────┘
```

### Detailed Screen Specifications

#### Step 1: Event Basics

**Layout:** Single-column form, centered on page

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Event Name | Text input | Yes | Max 100 chars |
| Date | Date picker | Yes | Future dates only |
| Start Time | Time picker | Yes | 15-min increments |
| End Time | Time picker | Yes | After start time |
| Event Type | Dropdown | Yes | Options: Networking, Conference, Workshop, Social, Other |
| Description | Textarea | No | Max 500 chars, supports markdown |
| Event Goals | Multi-select chips | No | Options: Fundraising, Hiring, Partnerships, Learning, Community |

**Validation:**
- All required fields must be filled
- End time must be after start time
- Date must be in future

**Interactions:**
- Auto-save draft every 30 seconds
- "Save & Continue" button (disabled until valid)
- "Save Draft" for partial completion

#### Step 2: Venue & Logistics

**Layout:** Two-column layout on desktop, stacked on mobile

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Venue Name | Text input | Yes | Max 100 chars |
| Address | Google Places autocomplete | Yes | Full address |
| Parking Notes | Textarea | No | Max 200 chars |
| Dress Code | Dropdown | No | Casual, Business Casual, Formal, Creative |
| Additional Notes | Textarea | No | Max 500 chars |
| Upload Venue Photo | Image upload | No | Max 5MB, preview shown |

**Map Integration:**
- Display Google Maps embed with pin after address selection
- Show estimated travel time from user's location (if available)

#### Step 3: Co-Organizers

**Layout:** Split panel — search left, selected right

**Left Panel: Add Co-Organizers**
```
┌──────────────────────────────────────────┐
│ 🔍 Search your contacts...              │
│ ────────────────────────────────────────│
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ○ Marcus Williams                  │  │
│ │   Managing Partner, Foundry Cap    │  │
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │ ○ Sarah Chen                       │  │
│ │   Founder & CEO, Nexus AI          │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Recently contacted:                      │
│ [Emily] [Kirill] [Darshan]              │
│                                          │
└──────────────────────────────────────────┘
```

**Right Panel: Selected Co-Organizers**
```
┌──────────────────────────────────────────┐
│ Co-Organizers (2)                        │
│ ────────────────────────────────────────│
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ You (Super Admin)                  │  │
│ │ ✓ All permissions                  │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Sarah Chen                    [×]  │  │
│ │ ────────────────────────────────── │  │
│ │ ☑ Can invite from their contacts   │  │
│ │ ☑ Can curate connections           │  │
│ │ ☐ Can edit event details           │  │
│ │ ☐ Can manage other organizers      │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [+ Add Another]                          │
└──────────────────────────────────────────┘
```

**Permissions Model:**

| Permission | Description |
|------------|-------------|
| Invite from contacts | Can add guests from their Better Contacts |
| Curate connections | Can suggest/override connection recommendations |
| Edit event details | Can modify venue, date, settings |
| Manage organizers | Can add/remove other co-organizers |

**Notifications:**
- Co-organizers receive email invitation to join event
- Accept/decline flow before access is granted

#### Step 4: RSVP Settings

**Fields:**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| RSVP Deadline | Date picker | 7 days before event | Can't be after event date |
| Allow Plus-Ones | Toggle | Off | If on, show max +1 count |
| Max +1 per guest | Number | 1 | Only shown if +1 enabled |
| Capacity Limit | Number | None | 0 = unlimited |
| Enable Waitlist | Toggle | Off | Auto-enable if capacity set |
| Require Approval | Toggle | Off | If on, RSVPs need organizer approval |

**Reminder Schedule:**
```
┌──────────────────────────────────────────┐
│ Automated Reminders                      │
│ ────────────────────────────────────────│
│ ☑ 2 weeks before event                  │
│ ☑ 1 week before event                   │
│ ☑ 1 day before event                    │
│ ☐ Day of event (morning)                │
│                                          │
│ Custom reminder:                         │
│ [Date picker] [Add Reminder]            │
└──────────────────────────────────────────┘
```

#### Step 5: Profile Card Configuration

**Purpose:** Customize which fields appear on attendee trading cards for this specific event.

**Layout:** Two-column checkbox grid with live preview

**Left: Field Selection**
```
┌──────────────────────────────────────────┐
│ What to show on Trading Cards            │
│ ────────────────────────────────────────│
│                                          │
│ PROFESSIONAL                             │
│ ☑ Current Role & Company                │
│ ☑ Industry                              │
│ ☑ Expertise Areas                       │
│ ☐ Years of Experience                   │
│                                          │
│ EVENT-SPECIFIC                           │
│ ☑ Looking For (from interview)          │
│ ☑ Can Help With (from interview)        │
│ ☐ Event Goals (from interview)          │
│                                          │
│ PERSONAL                                 │
│ ☐ Personal Interests                    │
│ ☐ Fun Facts                             │
│ ☐ Social Links                          │
│                                          │
│ CONTEXT                                  │
│ ☑ "Why Now" contextual relevance        │
│ ☑ Mutual connections                    │
│ ☑ Conversation starters                 │
└──────────────────────────────────────────┘
```

**Right: Live Preview**
```
┌──────────────────────────────────────────┐
│           TRADING CARD PREVIEW           │
│ ────────────────────────────────────────│
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  ┌────┐  SARAH CHEN               │ │
│  │  │    │  Founder & CEO             │ │
│  │  └────┘  Nexus AI                  │ │
│  │          Austin, TX                │ │
│  │                                    │ │
│  │  LOOKING FOR                       │ │
│  │  Series A investors in AI/ML       │ │
│  │                                    │ │
│  │  CAN HELP WITH                     │ │
│  │  AI product strategy, hiring       │ │
│  │                                    │ │
│  │  WHY MEET                          │ │
│  │  Raised similar round last year,   │ │
│  │  connected through Google program  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [← Previous]  [Next →]                  │
│  Showing 1 of 3 sample profiles          │
└──────────────────────────────────────────┘
```

#### Step 6: Review & Create

**Layout:** Summary card with all settings, confirm button

**Content:**
- Event name, date, time, venue
- Number of co-organizers
- RSVP settings summary
- Profile card fields selected
- "Edit" links for each section

**Actions:**
- "Create Event" → Creates event, redirects to Guest List Curation
- "Save as Draft" → Saves incomplete event
- "Back" → Return to previous step

### Technical Notes

**State Management:**
- Use React Context or Zustand for wizard state
- Persist to localStorage for save/resume
- Validate each step before progression

**API Endpoints:**
```
POST   /api/events              # Create event
PUT    /api/events/:id          # Update event
POST   /api/events/:id/organizers   # Add co-organizer
DELETE /api/events/:id/organizers/:userId  # Remove co-organizer
```

**Database Schema Additions:**

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  event_type VARCHAR(50),
  goals TEXT[], -- Array of goal tags
  venue_name VARCHAR(100),
  venue_address TEXT,
  venue_photo_url TEXT,
  parking_notes TEXT,
  dress_code VARCHAR(50),
  rsvp_deadline DATE,
  allow_plus_ones BOOLEAN DEFAULT FALSE,
  max_plus_ones INTEGER DEFAULT 1,
  capacity_limit INTEGER,
  enable_waitlist BOOLEAN DEFAULT FALSE,
  require_approval BOOLEAN DEFAULT FALSE,
  profile_fields_config JSONB, -- Which fields to show
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_organizers (
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  permissions JSONB, -- {canInvite, canCurate, canEdit, canManage}
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  PRIMARY KEY (event_id, user_id)
);
```

---

## PROTOTYPE 2: GUEST LIST CURATION INTERFACE

### Purpose

Enable organizers to build their guest list by selecting contacts from Better Contacts, using both manual search and AI-powered curation suggestions.

### User Stories

1. As an organizer, I want to search my contacts to find people to invite
2. As an organizer, I want AI to suggest contacts based on event goals
3. As an organizer, I want co-organizers to contribute from their contact lists
4. As an organizer, I want to see who's already been invited to avoid duplicates
5. As an organizer, I want to add new contacts who aren't in my CRM yet

### Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Summit 2025 — Guest List                           [Save] [Send Invites] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ FIND GUESTS                     │  │ INVITED GUESTS (47)              │ │
│  │ ───────────────────────────────│  │ ─────────────────────────────── │ │
│  │                                 │  │                                  │ │
│  │ [🔍 Search contacts...]         │  │ [Filter: All ▼] [Sort: Name ▼]  │ │
│  │                                 │  │                                  │ │
│  │ ┌─────────────────────────────┐│  │ ┌──────────────────────────────┐│ │
│  │ │ 🤖 AI Curation              ││  │ │ ☑ Sarah Chen                 ││ │
│  │ │ ─────────────────────────── ││  │ │   Founder, Nexus AI          ││ │
│  │ │ "Suggest people for an AI   ││  │ │   Added by: You              ││ │
│  │ │  summit focused on          ││  │ │   Status: Not sent           ││ │
│  │ │  practical implementation"  ││  │ └──────────────────────────────┘│ │
│  │ │                             ││  │ ┌──────────────────────────────┐│ │
│  │ │ [Generate Suggestions]      ││  │ │ ☑ Marcus Williams            ││ │
│  │ └─────────────────────────────┘│  │ │   Partner, Foundry Capital   ││ │
│  │                                 │  │ │   Added by: Emily            ││ │
│  │ BROWSE YOUR CONTACTS            │  │ │   Status: Sent ✓             ││ │
│  │ ───────────────────────────────│  │ └──────────────────────────────┘│ │
│  │                                 │  │                                  │ │
│  │ [All] [Investors] [Founders]   │  │ ...                              │ │
│  │ [AI/ML] [Austin] [Recently met]│  │                                  │ │
│  │                                 │  │ ─────────────────────────────── │ │
│  │ ┌───────────────────────────┐  │  │ BULK ACTIONS:                    │ │
│  │ │ ○ David Park             →│  │  │ [Select All] [Remove Selected]  │ │
│  │ │   Angel Investor          │  │  │ [Send Invites to Selected]      │ │
│  │ └───────────────────────────┘  │  │                                  │ │
│  │ ┌───────────────────────────┐  │  │ ─────────────────────────────── │ │
│  │ │ ○ Lisa Wang              →│  │  │ [+ Add Someone New]             │ │
│  │ │   VP Engineering, Stripe  │  │  │ Not in your contacts? Add them  │ │
│  │ └───────────────────────────┘  │  │ manually and they'll be saved   │ │
│  │                                 │  │ to Better Contacts too.         │ │
│  └─────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Specifications

#### AI Curation Panel

**Purpose:** Use natural language to describe who should be invited; AI suggests matches from contacts.

**Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI-Powered Guest Curation                                    │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ Describe who you're looking to invite:                          │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Founders and investors interested in AI implementation,     ││
│ │ particularly those who've raised or deployed Series A+      ││
│ │ funding. Bonus if they're Austin-based or can travel.       ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [🔮 Generate Suggestions]  [Clear]                              │
│                                                                 │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ SUGGESTIONS (12 matches)                                        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ☐ Sarah Chen                                     [+ Add]    ││
│ │    Founder, Nexus AI · Austin, TX                           ││
│ │    ────────────────────────────────────────────────────     ││
│ │    WHY: Series A raised 2023, deep AI implementation        ││
│ │    expertise, local, you met at Google AI program           ││
│ └─────────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ☐ David Park                                     [+ Add]    ││
│ │    Angel Investor · San Francisco, CA                       ││
│ │    ────────────────────────────────────────────────────     ││
│ │    WHY: Invested in 5 AI startups, writes about practical   ││
│ │    AI adoption, connected through your LP network           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [Add All 12]  [Load More Suggestions]                           │
└─────────────────────────────────────────────────────────────────┘
```

**AI Integration:**
- Uses Claude API with Better Contacts data as context
- Prompt structure:
  ```
  Given this user's contact database and their description of ideal guests:
  "{user_prompt}"
  
  Suggest the most relevant contacts, explaining why each matches.
  Consider: relevance to event theme, relationship strength, 
  geographic proximity, and potential value to other attendees.
  ```

#### Contact Browser with Filters

**Smart Filters:**
```
┌─────────────────────────────────────────┐
│ FILTER BY                               │
│ ─────────────────────────────────────── │
│                                         │
│ Tags:                                   │
│ [Investor] [Founder] [AI/ML] [Austin]   │
│ [F&F Round] [Series A+] [Enterprise]    │
│                                         │
│ Relationship:                           │
│ ○ All  ○ Strong  ○ Recent contact      │
│                                         │
│ Source:                                 │
│ ☑ My contacts                          │
│ ☑ Sarah's contacts                     │
│ ☐ Show duplicates                      │
│                                         │
│ [Apply Filters]  [Clear All]            │
└─────────────────────────────────────────┘
```

**Contact Card in Browser:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ○ David Park                                           [+ Add] │
│    ─────────────────────────────────────────────────────────── │
│    Angel Investor · San Francisco, CA                          │
│    ●●●○ Relationship Strength                                  │
│    Last contact: 2 weeks ago                                   │
│    Tags: [Investor] [AI] [F&F]                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Expand on hover/click:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ● David Park                                           [+ Add] │
│    ─────────────────────────────────────────────────────────── │
│    Angel Investor · San Francisco, CA                          │
│                                                                 │
│    BACKGROUND                                                   │
│    Former engineering lead at Google. Invests in AI/ML         │
│    startups, typically $25K-100K checks. Portfolio includes    │
│    Notion, Figma, Linear.                                      │
│                                                                 │
│    WHY YOU KNOW HIM                                             │
│    Met at LP Summit 2024. Had coffee twice. Expressed          │
│    interest in TradeBlock's AI applications.                   │
│                                                                 │
│    POTENTIAL VALUE TO EVENT                                     │
│    Can connect founders with his network, experienced with     │
│    practical AI implementation from operator days.             │
│                                                                 │
│    [View Full Profile]  [+ Add to Guest List]                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Multi-Organizer Contact Aggregation

**Visual Distinction:**
- Contacts from different organizers show badge: "Added by: Sarah"
- Duplicate detection: If same person in multiple lists, show once with "In Sarah's + Your contacts"
- Permission indicator: If organizer can't see contact details (privacy), show limited view

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTACT SOURCES                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ● Your Contacts                                  847 total │  │
│ │   Can browse and add any contact                          │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ○ Sarah Chen's Contacts                          312 total │  │
│ │   Sarah will be notified of suggestions                   │  │
│ │   [Request Access to Browse]                              │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ● Emily's Contacts                              156 total │  │
│ │   Full browse access granted                              │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ Tip: Co-organizers see a similar interface with their own      │
│ contacts. Anyone they add appears in the shared guest list.    │
└─────────────────────────────────────────────────────────────────┘
```

#### Add New Contact Modal

**For people not in any organizer's Better Contacts:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Someone New                                            [×]  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ This person will be added to your Better Contacts AND invited  │
│ to the event.                                                   │
│                                                                 │
│ Name *                                                          │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Email *                                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Company                                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Role                                                            │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ How do you know them?                                           │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ☑ Enrich profile with AI after adding                          │
│                                                                 │
│ [Cancel]                              [Add to List & Contacts]  │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**API Endpoints:**
```
GET    /api/events/:id/guests              # List guests
POST   /api/events/:id/guests              # Add guest
DELETE /api/events/:id/guests/:guestId     # Remove guest
POST   /api/events/:id/guests/bulk         # Bulk add
POST   /api/events/:id/guests/suggest      # AI suggestions

GET    /api/contacts/search?q=...          # Search contacts
GET    /api/contacts/:id                   # Get contact details
```

**Database Schema:**

```sql
CREATE TABLE event_guests (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  contact_id UUID REFERENCES contacts(id),
  added_by UUID REFERENCES users(id),
  rsvp_status VARCHAR(20) DEFAULT 'invited', -- invited, yes, no, maybe, waitlist
  rsvp_date TIMESTAMP,
  plus_ones INTEGER DEFAULT 0,
  interview_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_guests_event ON event_guests(event_id);
CREATE INDEX idx_event_guests_status ON event_guests(event_id, rsvp_status);
```

---

## PROTOTYPE 3: CURATE CONNECTIONS DASHBOARD

### Purpose

This is the **killer feature** of M33T. Enable organizers to review and manage AI-generated connection recommendations for each attendee, with real-time updates as RSVPs change.

### User Stories

1. As an organizer, I want to see the top 5 recommended connections for each attendee
2. As an organizer, I want to filter by RSVP status to see realistic match possibilities
3. As an organizer, I want to understand *why* two people are being matched
4. As an organizer, I want to override or adjust recommendations manually
5. As an organizer, I want recommendations to update in real-time as RSVPs roll in

### Interface Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Summit 2025 — Curate Connections                       [Export] [Refresh]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ FILTER BY RSVP STATUS:                                                      │
│ [All (47)] [Confirmed (23)] [Maybe (12)] [No Response (12)]                │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ SARAH CHEN                                              ● Confirmed         │
│ Founder & CEO, Nexus AI                                                     │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ TOP 5 CONNECTIONS:                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ #1  MARCUS WILLIAMS                                  ● Confirmed        ││
│ │     Managing Partner, Foundry Capital                                   ││
│ │     ─────────────────────────────────────────────────────────────────── ││
│ │     MATCH SCORE: 94%                                                    ││
│ │                                                                         ││
│ │     WHY THIS MATCH:                                                     ││
│ │     • Both focused on AI-native business models                         ││
│ │     • Marcus looking for Series A deals, Sarah raising                  ││
│ │     • Mutual connection through Google AI program                       ││
│ │                                                                         ││
│ │     CONVERSATION STARTERS:                                              ││
│ │     • "How are you thinking about AI governance in portfolio?"          ││
│ │     • "Sarah's approach to enterprise sales as technical founder"       ││
│ │                                                                         ││
│ │     [Approve] [Remove] [Swap Position ↕]                               ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ #2  DAVID PARK                                       ○ Maybe            ││
│ │     Angel Investor                                                      ││
│ │     ─────────────────────────────────────────────────────────────────── ││
│ │     MATCH SCORE: 87%                                                    ││
│ │     ⚠️ RSVP not confirmed — may not attend                              ││
│ │     ...                                                                 ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ MARCUS WILLIAMS                                         ● Confirmed         │
│ Managing Partner, Foundry Capital                                           │
│ ...                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Specifications

#### Filter Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FILTER BY RSVP STATUS:                                                      │
│                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐      │
│ │ All          │ │ ● Confirmed  │ │ ○ Maybe      │ │ ○ No Response  │      │
│ │ (47)         │ │ (23)         │ │ (12)         │ │ (12)           │      │
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────────┘
│                                                                             │
│ When filtered:                                                              │
│ • Only show attendees matching that status                                  │
│ • Recommendations also filtered to that status                              │
│ • Non-matching recommendations show warning badge                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Filter Behavior:**

| Filter | Shows Attendees | Shows Recommendations |
|--------|-----------------|----------------------|
| All | All invited | All recommendations (RSVP status shown on each) |
| Confirmed | Only confirmed RSVPs | Only confirmed RSVPs as matches |
| Maybe | Only maybe RSVPs | Confirmed + Maybe as matches |
| No Response | Only no response | All (since they might confirm) |

#### Match Card Anatomy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ #1  MARCUS WILLIAMS                                        ● Confirmed      │
│     Managing Partner, Foundry Capital · San Francisco, CA                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ MATCH SCORE                                                                 │
│ ████████████████████░░░░░ 94%                                              │
│                                                                             │
│ Score Breakdown:                                                            │
│ • Goal Alignment: 98%  (Both seeking: AI investment opportunities)         │
│ • Expertise Fit: 92%   (Complementary: founder ↔ investor)                  │
│ • Relationship: 85%    (Mutual connection, warm intro possible)            │
│ • Availability: 100%   (Both confirmed attending)                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ WHY THIS MATCH:                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│ • Both focused on AI-native business models rather than AI features        │
│ • Marcus' fund thesis aligns with Nexus AI's positioning                   │
│ • Sarah looking for Series A, Marcus' fund does $2-5M checks               │
│ • Connected through Google AI program — warm intro available               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ CONVERSATION STARTERS:                                                      │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 1. "How are you thinking about AI governance in your portfolio companies?" │
│ 2. "Sarah's approach to enterprise sales as a deeply technical founder"    │
│ 3. "The evolution from AI features to AI-native business models"           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ POTENTIAL COLLABORATION:                                                    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Investment discussion for Nexus AI Series A. Marcus could also connect     │
│ Sarah with portfolio company CTOs dealing with similar technical challenges.│
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [✓ Approve]  [× Remove]  [↕ Change Position]  [✏️ Edit Reason]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Real-Time Updates

**WebSocket Events:**

| Event | Trigger | Action |
|-------|---------|--------|
| `rsvp:updated` | Guest RSVPs or changes response | Re-calculate affected recommendations |
| `guest:added` | New guest added to event | Generate recommendations for new guest |
| `guest:removed` | Guest removed from event | Remove from all recommendation lists |
| `match:approved` | Organizer approves a match | Lock match, prevent re-ordering |
| `match:removed` | Organizer removes a match | Generate replacement recommendation |

**UI Update Behavior:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔔 RSVP Update                                                         [×]  │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ David Park just confirmed attendance!                                       │
│                                                                             │
│ This affects recommendations for:                                           │
│ • Sarah Chen (+1 new potential match)                                       │
│ • Marcus Williams (existing match now confirmed)                            │
│ • 3 others                                                                  │
│                                                                             │
│ [View Changes]  [Dismiss]                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Late RSVP Handling

When someone confirms late (close to or at the event):

1. **Don't replace existing matches** — People have already been told who to meet
2. **Add to affected attendees' lists** — New person appears as match #6+ for compatible people
3. **Generate matches for late confirmer** — They get their own top 5 from confirmed attendees
4. **Highlight as "Late Addition"** — Visual badge indicates this is a recent change

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ LATE ADDITION                                                            │
│                                                                             │
│ #6  LISA WANG                                    ● Confirmed (just now)     │
│     VP Engineering, Stripe                                                  │
│     ─────────────────────────────────────────────────────────────────────── │
│     This attendee confirmed late. They've been added to compatible          │
│     attendees' lists but won't replace anyone's existing matches.           │
│                                                                             │
│     MATCH SCORE: 91%                                                        │
│     ...                                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Manual Curation Actions

**1. Approve Match:**
- Locks this pairing
- Won't be displaced by algorithm changes
- Visual indicator: ✓ Approved

**2. Remove Match:**
- Removes from recommendations
- Generates next-best replacement
- Stored in "removed" list (can undo)

**3. Change Position:**
- Drag-and-drop reordering
- Affects priority for at-event facilitation
- Generates "Manual Override" badge

**4. Add Custom Match:**
- Search for any attendee
- Write custom "why" reason
- Appears with "Curator Pick" badge

**5. Edit Match Reason:**
- Override AI-generated explanation
- Add personal context organizer knows
- Indicated as "Edited by [Organizer]"

### Technical Implementation

**Matching Algorithm Weights:**

| Factor | Default Weight | Notes |
|--------|----------------|-------|
| Goal Alignment | 40% | "Looking for" ↔ "Can help with" |
| Expertise Complementarity | 25% | Different but relevant expertise |
| Relationship Context | 15% | Mutual connections, warm intro potential |
| Availability Match | 10% | Same RSVP status bonus |
| Location Proximity | 5% | Ease of continued relationship |
| Recency Bonus | 5% | Actively engaged contacts |

**API Endpoints:**

```
GET    /api/events/:id/matches                    # Get all match recommendations
GET    /api/events/:id/matches/:attendeeId        # Get matches for one attendee
POST   /api/events/:id/matches/:matchId/approve   # Approve a match
DELETE /api/events/:id/matches/:matchId           # Remove a match
PUT    /api/events/:id/matches/:matchId/position  # Change position
POST   /api/events/:id/matches/custom             # Add custom match
PUT    /api/events/:id/matches/:matchId/reason    # Edit match reason

# WebSocket
ws://api/events/:id/matches/stream               # Real-time updates
```

**Database Schema:**

```sql
CREATE TABLE event_matches (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  attendee_id UUID REFERENCES event_guests(id),
  match_id UUID REFERENCES event_guests(id),
  position INTEGER, -- 1-5 for top matches
  match_score DECIMAL(5,2),
  score_breakdown JSONB, -- {goal: 98, expertise: 92, relationship: 85, availability: 100}
  why_match TEXT[], -- Array of reasons
  conversation_starters TEXT[],
  collaboration_potential TEXT,
  status VARCHAR(20) DEFAULT 'suggested', -- suggested, approved, removed
  is_manual BOOLEAN DEFAULT FALSE,
  is_late_addition BOOLEAN DEFAULT FALSE,
  edited_reason TEXT, -- Organizer override
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_attendee ON event_matches(event_id, attendee_id);
CREATE INDEX idx_matches_status ON event_matches(status);
```

---

## PROTOTYPE 4: UPDATED INTERVIEW EXPERIENCE

### Purpose

Since attendees are coming from Better Contacts (which already has rich profile data), the pre-event interview should be **slimmed down** to focus only on **event-specific goals** and any quick profile updates.

### User Stories

1. As an attendee, I want a quick interview that respects my time
2. As an attendee, I want to see what you already know about me
3. As an attendee, I want to focus on what I'm hoping to get from THIS event
4. As an attendee, I want to correct any outdated profile information

### Interview Flow Comparison

**Old Flow (Original Better Networking):**
```
Stories Intro (4 slides) → Full Interview (6-8 questions) → Card Preview → Confirm
Total time: 5-8 minutes
```

**New Flow (Better Contacts Integration):**
```
Quick Intro (2 slides) → Profile Check → Event Goals (2-3 questions) → Card Preview → Confirm
Total time: 2-3 minutes
```

### Detailed Screen Specifications

#### Screen 1: Quick Intro (2 slides)

**Slide 1: Welcome**
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           AI SUMMIT 2025                │
│                                         │
│           March 30, Austin              │
│                                         │
│       You're invited to connect         │
│       with 47 exceptional people.       │
│                                         │
│                                         │
│              [Swipe →]                  │
│                                         │
└─────────────────────────────────────────┘
```

**Slide 2: What to Expect**
```
┌─────────────────────────────────────────┐
│                                         │
│       Before we match you with          │
│       the right people...               │
│                                         │
│       We already know a bit about       │
│       you from our network.             │
│                                         │
│       We just need 2 minutes to:        │
│       ✓ Confirm your info is current    │
│       ✓ Learn your goals for tonight    │
│                                         │
│              [Let's Go →]               │
│                                         │
└─────────────────────────────────────────┘
```

#### Screen 2: Profile Check

**Purpose:** Show what we already know, invite corrections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ Here's what we know about you:                                              │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ │  ┌────────┐                                                             ││
│ │  │        │   SARAH CHEN                                               ││
│ │  │ [Photo]│   Founder & CEO                                            ││
│ │  │        │   Nexus AI                                                 ││
│ │  └────────┘   Austin, TX                                               ││
│ │                                                                         ││
│ │  ─────────────────────────────────────────────────────────────────────  ││
│ │                                                                         ││
│ │  EXPERTISE                                                              ││
│ │  AI/ML, Enterprise Sales, Product Strategy                             ││
│ │                                                                         ││
│ │  BACKGROUND                                                             ││
│ │  Former ML lead at Google. Founded Nexus AI in 2022. Currently         ││
│ │  building enterprise automation tools, raised Series A in 2023.        ││
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  💡 This info comes from 33 Strategies' Better Contacts database.          │
│     It helps us find your best matches without a long questionnaire.       │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ [✓ This looks right]          [✏️ Something's changed]                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**If "Something's changed" is clicked:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ What's changed?                                                             │
│                                                                             │
│ ☐ My role/title                                                            │
│ ☐ My company                                                               │
│ ☐ My expertise areas                                                       │
│ ☐ Other                                                                    │
│                                                                             │
│ Tell us briefly:                                                            │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ I'm now focusing on AI agents specifically, not general ML...          ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ [Update & Continue]                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 3: Event Goals (Chat-Based)

**Purpose:** Quick, focused questions about THIS event specifically

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 🤖 M33T                                                                 ││
│ │ ───────────────────────────────────────────────────────────────────────││
│ │ Perfect, Sarah. Now let's focus on this event specifically.            ││
│ │                                                                         ││
│ │ What's the ONE thing you most want to get from tonight?                ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Quick answers:                                                              │
│ [Find investors] [Meet potential hires] [Learn from others]                │
│ [Find partners] [Just explore]                                             │
│                                                                             │
│ Or type your own:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Follow-up Question:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 👤 You                                                                  ││
│ │ Find investors — specifically those who understand technical            ││
│ │ founders and don't push for quick exits                                 ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 🤖 M33T                                                                 ││
│ │ ───────────────────────────────────────────────────────────────────────││
│ │ Got it — patient capital, founder-friendly. Last question:              ││
│ │                                                                         ││
│ │ Is there anything you could help OTHER attendees with tonight?         ││
│ │ Sometimes the best connections are about what you can give.             ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Quick answers:                                                              │
│ [AI/ML advice] [Hiring tips] [Fundraising guidance] [Intro to my network] │
│                                                                             │
│ Or type your own:                                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 4: Card Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ Here's how others will see you tonight:                                     │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ │  ┌────────┐                                                             ││
│ │  │        │   SARAH CHEN                                               ││
│ │  │ [Photo]│   Founder & CEO, Nexus AI                                  ││
│ │  │        │   Austin, TX                                               ││
│ │  └────────┘                                                             ││
│ │                                                                         ││
│ │  LOOKING FOR                                                            ││
│ │  Patient capital from investor who understands technical founders       ││
│ │                                                                         ││
│ │  CAN HELP WITH                                                          ││
│ │  AI/ML implementation, enterprise sales strategy, hiring                ││
│ │                                                                         ││
│ │  ─────────────────────────────────────────────────────────────────────  ││
│ │                                                                         ││
│ │  Tap any field to edit                                                  ││
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ [← Edit Responses]                              [Looks Good →]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 5: Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              ✓                                              │
│                                                                             │
│                    You're all set for                                       │
│                    AI Summit 2025                                           │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│                    📅 March 30, 2025                                        │
│                    🕕 6:00 PM - 9:00 PM                                     │
│                    📍 The Domain, Austin                                    │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│         We'll send your personalized matches                                │
│         2 days before the event.                                            │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ [Add to Calendar]                                                           │
│                                                                             │
│ [Share with a friend]                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### For Non-Contacts (New People)

If the attendee is NOT in the organizer's Better Contacts:

**Alternative Screen 2:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ We'd love to get to know you!                                               │
│                                                                             │
│ Since this is our first time meeting, we'll ask a few                       │
│ quick questions to find your best connections.                              │
│                                                                             │
│ [Get Started →]                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Then use a slightly longer interview (4-5 questions):
1. What do you do? (Role + Company)
2. What are you working on right now?
3. What's your expertise?
4. What are you hoping to get from tonight?
5. What could you help others with?

### Technical Implementation

**Conditional Flow Logic:**

```javascript
const determineInterviewPath = async (attendeeEmail, eventId) => {
  // Check if attendee exists in any organizer's contacts
  const contact = await findContactByEmail(attendeeEmail, eventId);
  
  if (contact) {
    return {
      path: 'quick', // 2-3 questions
      prefillData: contact.profile,
      showProfileCheck: true
    };
  } else {
    return {
      path: 'full', // 4-5 questions
      prefillData: null,
      showProfileCheck: false
    };
  }
};
```

**API Endpoints:**

```
GET  /api/events/:id/interview/prefill?email=...  # Get prefill data
POST /api/events/:id/interview/responses          # Submit interview
PUT  /api/events/:id/interview/profile-update     # Update profile from corrections
```

---

## PROTOTYPE 5: RSVP FLOW & STATUS MANAGEMENT

### Purpose

Two interconnected experiences:
1. **Attendee-facing:** Clean RSVP flow with interview integration
2. **Organizer-facing:** Dashboard to track RSVPs and send reminders

### Part A: Attendee RSVP Flow

#### Entry Point: Email/Text Invitation

```
Subject: You're invited to AI Summit 2025

Sarah,

You've been personally selected for AI Summit 2025 — an intimate 
gathering of founders, investors, and operators rethinking how 
AI changes business.

📅 March 30, 2025  |  🕕 6:00 PM  |  📍 The Domain, Austin

[VIEW INVITATION & RSVP →]

This link is unique to you.
```

#### RSVP Landing Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           AI SUMMIT 2025                                    │
│                                                                             │
│                    March 30  ·  6:00 PM  ·  Austin                         │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ You've been personally invited by Mbiyimoh Ghogomu.                        │
│                                                                             │
│ An intimate evening exploring how AI changes what's possible               │
│ for founders and operators. 47 carefully selected attendees.               │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│                    Will you be joining us?                                  │
│                                                                             │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │                 │  │                 │  │                 │           │
│   │    Yes, I'm in  │  │     Maybe       │  │   Can't make it │           │
│   │                 │  │                 │  │                 │           │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ VENUE                                                                       │
│ The Domain · 123 Innovation Way · Austin, TX                               │
│ [View Map]                                                                  │
│                                                                             │
│ DRESS CODE                                                                  │
│ Smart Casual                                                                │
│                                                                             │
│ PARKING                                                                     │
│ Validated parking available in garage B                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### After "Yes" or "Maybe"

Immediately flows into Interview (Prototype 4):
```
[RSVP: Yes] → Stories Intro → Profile Check → Event Goals → Card Preview → Confirmation
```

#### After "Can't make it"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    We're sorry to miss you!                                 │
│                                                                             │
│ Would you like us to keep you in mind for future events?                    │
│                                                                             │
│ [Yes, please]  [No thanks]                                                  │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ If plans change, you can update your RSVP anytime using                     │
│ this link.                                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Part B: Organizer RSVP Dashboard

#### Main Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Summit 2025 — RSVP Tracking                    [Send Reminders] [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ RESPONSE SUMMARY                                                            │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │              │  │              │  │              │  │              │   │
│  │      23      │  │      12      │  │      8       │  │      4       │   │
│  │              │  │              │  │              │  │              │   │
│  │  Confirmed   │  │    Maybe     │  │  No Response │  │   Declined   │   │
│  │    49%       │  │     26%      │  │     17%      │  │     8%       │   │
│  │              │  │              │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  Capacity: 47 invited · 35 max                                             │
│  Interview completion: 29/35 (83%)                                          │
│  RSVP deadline: 5 days remaining                                           │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ [Confirmed (23)] [Maybe (12)] [No Response (8)] [Declined (4)] [All]       │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ ☐ | NAME           | STATUS      | INTERVIEW | RESPONDED    | ACTIONS  ││
│ ├─────────────────────────────────────────────────────────────────────────┤│
│ │ ☐ | Sarah Chen     | ● Confirmed | ✓ Done    | Jan 8, 2025  | [···]    ││
│ │ ☐ | Marcus Williams| ● Confirmed | ✓ Done    | Jan 7, 2025  | [···]    ││
│ │ ☐ | David Park     | ○ Maybe     | ✓ Done    | Jan 9, 2025  | [···]    ││
│ │ ☐ | Lisa Wang      | ◌ None      | — Pending | —            | [···]    ││
│ │ ☐ | James Liu      | × Declined  | — N/A     | Jan 6, 2025  | [···]    ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ BULK ACTIONS: [Select All] [Send Reminder] [Change Status] [Remove]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Reminder System

**Send Reminder Modal:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Send Reminder                                                          [×]  │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Send to:                                                                    │
│ ○ No Response only (8 people)                                              │
│ ○ Maybe + No Response (20 people)                                          │
│ ○ Selected guests (3 people)                                               │
│ ○ Custom selection                                                         │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Message:                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Hi {first_name},                                                        ││
│ │                                                                         ││
│ │ Quick reminder — AI Summit 2025 is coming up on March 30th!            ││
│ │                                                                         ││
│ │ We've got an incredible group of founders and investors confirmed,     ││
│ │ and we'd love to know if you can join us.                              ││
│ │                                                                         ││
│ │ RSVP deadline is in 5 days.                                            ││
│ │                                                                         ││
│ │ [RSVP Now →]                                                           ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Available variables: {first_name}, {event_name}, {event_date}, {deadline}  │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Delivery:                                                                   │
│ ☑ Email                                                                    │
│ ☐ SMS (if phone available)                                                 │
│                                                                             │
│ [Cancel]                                              [Preview] [Send Now]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Individual Guest Actions

**Dropdown menu (···):**
- View Profile
- View Interview Responses
- Send Personal Reminder
- Change RSVP Status (manual override)
- Add Note
- Remove from Event

#### Activity Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ RECENT ACTIVITY                                           [View All]        │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ 🟢 Sarah Chen confirmed attendance                           2 hours ago   │
│ 📧 Reminder sent to 8 no-response guests                     5 hours ago   │
│ 🟡 David Park changed from Confirmed to Maybe               Yesterday      │
│ 🟢 Marcus Williams confirmed attendance                     Yesterday      │
│ 🟢 5 new confirmations                                       2 days ago    │
│ ➕ Emily added 12 guests from her contacts                   3 days ago    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

**RSVP States:**

| State | Meaning | Can Interview? |
|-------|---------|----------------|
| `invited` | Initial state, no response | No |
| `yes` | Confirmed attending | Yes |
| `maybe` | Might attend | Yes |
| `no` | Cannot attend | No |
| `waitlist` | Confirmed but over capacity | Yes |

**Webhook Triggers:**

| Event | Action |
|-------|--------|
| RSVP submitted | Trigger match recalculation |
| Interview completed | Update profile, recalculate matches |
| Status changed | Notify organizers, update dashboard |
| Deadline passed | Auto-send final reminder |

**API Endpoints:**

```
# Attendee-facing
GET  /api/rsvp/:token                    # Get RSVP page data
POST /api/rsvp/:token/respond            # Submit RSVP
PUT  /api/rsvp/:token/update             # Change RSVP

# Organizer-facing  
GET  /api/events/:id/rsvps               # Get all RSVPs
PUT  /api/events/:id/rsvps/:guestId      # Manual status change
POST /api/events/:id/rsvps/remind        # Send reminders
GET  /api/events/:id/rsvps/activity      # Get activity feed
```

**Database Schema:**

```sql
CREATE TABLE rsvp_tokens (
  token VARCHAR(64) PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  guest_id UUID REFERENCES event_guests(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Optional expiry
);

CREATE TABLE rsvp_activity (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  guest_id UUID REFERENCES event_guests(id),
  action VARCHAR(50), -- responded, reminded, status_changed, interview_completed
  old_value VARCHAR(50),
  new_value VARCHAR(50),
  performed_by UUID REFERENCES users(id), -- NULL if guest action
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rsvp_activity_event ON rsvp_activity(event_id);
```

---

## APPENDIX: DESIGN SYSTEM REFERENCE

### Colors (from 33 Strategies Brand)

| Token | Hex | Usage |
|-------|-----|-------|
| Background Primary | `#0a0a0a` | Main background |
| Background Surface | `#111111` | Cards, modals |
| Background Elevated | `#1a1a1a` | Hover states |
| Gold Accent | `#D4A84B` | CTAs, highlights |
| Gold Light | `#E4C06B` | Hover states |
| Text Primary | `#ffffff` | Headlines |
| Text Secondary | `#a3a3a3` | Body text |
| Text Muted | `#737373` | Labels |
| Border Default | `#27272a` | Card borders |
| Success | `#4ADE80` | Confirmed status |
| Warning | `#FBBF24` | Maybe status |
| Error | `#EF4444` | Declined status |

### Typography

| Role | Font | Size |
|------|------|------|
| Display | Instrument Serif | 48-72px |
| Heading 1 | Instrument Serif | 32-40px |
| Heading 2 | DM Sans Bold | 24-28px |
| Body | DM Sans | 16px |
| Small | DM Sans | 14px |
| Caption | DM Sans | 12px |

### Components to Reuse

- Button (primary, secondary, ghost)
- Card with glassmorphism
- Input with dark theme
- Multi-select chips
- Toggle switches
- Progress indicators
- Tab navigation
- Modal dialogs
- Toast notifications

### Animation Guidelines

- Standard transition: 200ms ease-out
- Reveal animations: 300ms with slight overshoot
- Stagger delay: 50ms between items
- Avoid animation on frequently updating elements

---

## NEXT STEPS

1. **Review this document** — Flag any missing requirements or flows
2. **Prototype in order** — Start with Event Creation, build foundation
3. **Share with dev team** — Kirill/Darshan can begin schema work
4. **Create test data** — Mock contacts and events for development

---

*Document Version: 1.0*  
*Created: January 2025*  
*Author: 33 Strategies + Claude*
