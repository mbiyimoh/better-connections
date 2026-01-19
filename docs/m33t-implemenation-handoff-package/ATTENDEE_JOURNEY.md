# Attendee Journey Map

## Overview

This document maps the complete attendee experience across all four phases, from receiving an invite to post-event follow-up.

---

## Journey Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 1: PRE-EVENT INTAKE                           Timeline: Days before │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Invite] → [Landing] → [Stories Intro] → [Questionnaire] → [Card Preview] │
│                                                                             │
│  Goal: Capture profile, build anticipation                                  │
│  Duration: 3-5 minutes                                                      │
│                                                                             │
│  Existing BC Users: Pre-fill review → Event-specific questions only        │
│  New Users: Full questionnaire flow                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 2: MATCH REVEAL                           Timeline: 24-48 hrs before│
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Notification] → [Reveal Intro] → [Match Cards] → [Match Detail] → [Prep] │
│                                                                             │
│  Goal: Build excitement, enable pre-research                                │
│  Duration: 2-3 minutes                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 3: AT-EVENT                                   Timeline: Event day   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Check-in] → [Match Dashboard] → [Find Match] → [Conversation] → [Rotate] │
│                                                                             │
│  Goal: Facilitate curated connections                                       │
│  Duration: 30-45 min (structured portion)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 4: POST-EVENT                             Timeline: Days/weeks after│
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Recap Email] → [Portal] → [Directory] → [Search] → [Connect Request]     │
│                                                                             │
│  Goal: Enable follow-up, extend value                                       │
│  Duration: Ongoing                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Pre-Event Intake

### Screen 1.1: Invite Landing
**Trigger:** User clicks invite link (email, SMS, physical card QR)

**Content:**
- Event branding (name, date, venue photo)
- Host introduction ("You're invited by [Host Name]")
- Event description (1-2 sentences)
- Value prop: "We'll match you with the people most worth meeting"
- Primary CTA: "RSVP Now"

**Design Notes:**
- Premium feel, not a form
- Mobile-first (most will open on phone)
- Should feel exclusive, not transactional

---

### Screen 1.2: Stories-Style Intro (Optional)
**Purpose:** Set expectations before questionnaire

**Content (3-4 swipeable cards):**
1. "Here's how M33T works..."
2. "We'll ask a few questions (takes ~4 min)"
3. "Then match you with your ideal connections"
4. "Ready? Let's go."

**Design Notes:**
- Skip option for returning users
- Progress dots at bottom
- Auto-advance or tap to continue

---

### Screen 1.3: Pre-Fill Review (Better Contacts Users Only)
**Trigger:** System detects existing BC profile

**Content:**
- "Welcome back, [First Name]!"
- Profile card preview (photo, name, role, company, expertise)
- "We found your profile. Let's make sure it's up to date."
- Edit button on each section
- Primary CTA: "Looks Good — Continue"

**What's Pre-Filled:**
- Identity (name, photo)
- Professional (role, company)
- Expertise areas
- Location

**What's NOT Pre-Filled (Always Asked):**
- Event-specific goals
- Ideal connections for THIS event
- Any organizer-configured questions

---

### Screen 1.4: Multi-Modal Questionnaire
**Purpose:** Capture profile data through engaging question formats

**Flow:**
- Progress bar at top
- One question per screen
- "Add context?" expandable on every question
- Back/Continue navigation
- Skip option for non-required questions

**Question Sequence:**
1. **Goals** (Required, Open Text) — "What are your biggest current goals?"
2. **Ideal Connections** (Required, Open Text) — "Who would be your ideal connections?"
3. **[Organizer-Configured Questions]** — Varies by event

**Question Types:**
| Type | Interaction |
|------|-------------|
| Open Text | Textarea with placeholder |
| Slider | Drag between two poles |
| Single Select | Tap one option (with descriptions) |
| Multi Select | Tap multiple (with limit indicator) |
| Mad-Lib | Fill in blanks within sentence |
| Ranking | Drag to reorder by priority |

**Design Notes:**
- Each screen feels distinct (not repetitive form)
- Visual variety keeps engagement
- Progress indicator shows how much remains
- Typing indicators and transitions add polish

**See:** `InterviewExperienceV2.jsx` for full prototype

---

### Screen 1.5: Card Preview
**Purpose:** Show user their generated Trading Card

**Content:**
- "Here's how we'll introduce you"
- Trading Card (L2 or L3 level)
- Edit button for key fields (headline, goals, offerings)
- Primary CTA: "Looks Good"

**Editable Fields:**
- Headline (5-8 word summary)
- Seeking (goals, presented as list)
- Can Help With (offerings)

**Design Notes:**
- Celebrate completion ("You're all set!")
- Show the value of what they just did
- Allow light edits but don't encourage overthinking

---

### Screen 1.6: Confirmation
**Purpose:** Confirm RSVP, set expectations

**Content:**
- "You're In! 🎉"
- Event details (date, time, venue)
- "Your matches will be revealed [X] hours before the event"
- Add to Calendar button
- "We'll notify you when your matches are ready"

**Follow-Up:**
- Calendar invite sent
- Reminder emails scheduled

---

## Phase 2: Match Reveal

### Screen 2.1: Reveal Notification
**Trigger:** 24-48 hours before event

**Delivery:** Push notification, email, SMS

**Content:**
- "Your matches are ready 🎯"
- "We found [3] people you should meet at [Event Name]"
- CTA: "See Your Matches"

---

### Screen 2.2: Reveal Intro
**Purpose:** Build anticipation before showing matches

**Content:**
- "We analyzed [X] attendees..."
- "Based on your goals and who you wanted to meet..."
- "Here are your top connections:"
- Animation/transition to match cards

**Design Notes:**
- Brief but meaningful buildup
- Acknowledges the work done on their behalf
- Creates moment of anticipation

---

### Screen 2.3: Match Cards
**Purpose:** Overview of all matches

**Content:**
- 3-5 match cards in stack/carousel
- Each shows: Photo, Name, Headline, Match Score
- "Why You Match" snippet for each
- Tap to expand to full detail

**Design Notes:**
- Scannable at a glance
- Visual hierarchy emphasizes #1 match
- Easy to flip through all matches

---

### Screen 2.4: Match Detail
**Purpose:** Deep dive on single match

**Content:**
- Full Trading Card (L3-L4)
- "Why You're Matched" explanation
- What they're seeking (relevance to you highlighted)
- What they can offer (relevance to your goals highlighted)
- Conversation starters (2-3 suggested openers)
- Personal hook (non-professional detail)

**Actions:**
- "Looks Great" (confirm)
- "Not a fit" (optional feedback)
- LinkedIn preview link (if available)

---

## Phase 3: At-Event

### Screen 3.1: Event Dashboard
**Trigger:** Event day, user opens app

**Content:**
- "Today's the day!"
- Match checklist (photo + name + status)
  - ☐ Sarah Chen
  - ☐ Marcus Williams
  - ☐ Jennifer Park
- Current/next match highlight
- "Find [Name]" button

**Status States:**
- Pending (not yet met)
- In Progress (currently meeting)
- Connected (conversation complete)

---

### Screen 3.2: Active Conversation View
**Purpose:** Support during matched conversation

**Content:**
- Match's card (compact view)
- Timer (optional, if structured rotations)
- Conversation prompts (tap to reveal more)
- Quick notes field
- "Mark Complete" button

**Design Notes:**
- Minimal—users shouldn't stare at phones
- Glanceable prompts if conversation stalls
- Notes capture for post-event follow-up

---

## Phase 4: Post-Event

### Screen 4.1: Recap Email
**Trigger:** Day after event

**Content:**
- "Great connecting at [Event Name]!"
- Your matches with any notes you took
- "Continue the conversation" CTAs
- Link to full attendee directory

---

### Screen 4.2: Event Directory
**Purpose:** Browse all attendees, not just matches

**Content:**
- Search bar
- Filter options (industry, expertise, location)
- Card grid/list view
- Your matches appear first (highlighted)

**Search Supports:**
- Name
- Company
- Expertise
- Interests ("played volleyball", "Goldman Sachs")

---

### Screen 4.3: Connection Request
**Trigger:** User taps "Connect" on a card

**Content:**
- Their card (summary)
- Optional note field
- "Where did you meet?" prompt
- Send button

**Follow-Up:**
- Recipient notified
- Appears in both users' Better Contacts (if accepted)
- "Met at [Event Name]" tag applied

---

## Timing Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Phase 1 | 3-5 min | Profile captured, RSVP confirmed |
| Phase 2 | 2-3 min | Matches reviewed, anticipation built |
| Phase 3 | 30-45 min | Curated connections facilitated |
| Phase 4 | Ongoing | Follow-ups enabled, directory accessible |

---

## Key Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Intake completion rate | >80% | Drop-off = lost data |
| Questions answered | >90% of required | Data quality |
| Match reveal open rate | >90% | Anticipation → attendance |
| Matches actually met | >2 of 3 | Event value delivered |
| Post-event connection requests | >1 per attendee | Extended value |

---

## Related Documents

| Document | Content |
|----------|---------|
| `InterviewExperienceV2.jsx` | Phase 1 questionnaire prototype |
| `RSVPAttendeeFlow.jsx` | Phase 1 landing + RSVP |
| `AttendeeJourney-Wireframe.jsx` | Full journey prototype (Phases 1-4) |
| `TradingCard-v2.jsx` | Card component used throughout |

---

*Last Updated: January 2025*
