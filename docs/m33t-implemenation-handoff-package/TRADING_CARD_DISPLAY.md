# Trading Card (Display Layer)

## Overview

The Trading Card is a **view** of the Full Profile, not the profile itself. It surfaces the right information at the right depth, depending on context.

---

## Progressive Disclosure Model

```
┌─────────────────────────────────────────────────────────────────┐
│ L1: GLANCE (< 2 seconds)                                        │
│ Answer: "Who is this person?"                                   │
│ Shows: Photo, Name, Headline, Location                          │
│ Context: Notifications, inline mentions, match previews         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L2: SCAN (< 10 seconds)                                         │
│ Answer: "Should I pay attention to this person?"                │
│ Shows: + Role/Company, Expertise tags, Seeking/Offering summary │
│ Context: Search results, attendee lists, match cards            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L3: READ (< 30 seconds)                                         │
│ Answer: "What's this person about?"                             │
│ Shows: + Current focus, Background, Ideal match quote           │
│ Context: Match reveal, pre-meeting prep, profile view           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ L4: DEEP-DIVE (User-driven)                                     │
│ Answer: "Tell me everything relevant"                           │
│ Shows: Expandable sections with full detail                     │
│ Context: Serious interest, pre-call research, post-event lookup │
└─────────────────────────────────────────────────────────────────┘
```

---

## Display Schema

```typescript
interface TradingCardDisplay {
  // ============================================
  // L1: GLANCE
  // ============================================
  glance: {
    photo_url: string | null;
    name: string;                     // "Marcus Chen"
    headline: string;                 // "Build-to-rent developer scaling into Southeast"
    location: string;                 // "Austin → Nashville"
  };

  // ============================================
  // L2: SCAN (adds to L1)
  // ============================================
  scan: {
    role: string;                     // "Managing Partner"
    company: string;                  // "Redline Capital"
    expertise_tags: string[];         // ["Ground-up development", "LP fundraising", "BTR ops"]
    seeking_summary: string;          // "Family office intros, Nashville operator"
    offering_summary: string;         // "LP deck review, Austin market diligence"
  };

  // ============================================
  // L3: READ (adds to L2)
  // ============================================
  read: {
    current_focus: string;            // "Raising Fund III ($75M) for BTR projects, expanding to Southeast"
    background: string;               // "Built 2,000+ units across Texas over 8 years. Former IB, pivoted post-2008."
    ideal_match_quote: string;        // "Someone who's done 50+ BTR units in Nashville..."
    personal_hook: string;            // "Former college baseball player, bourbon collector (200+ bottles)"
  };

  // ============================================
  // L4: DEEP-DIVE (expandable sections)
  // ============================================
  deep_dive: {
    expertise: {
      title: string;                  // "Expertise"
      items: Array<{
        skill: string;                // "Ground-up development"
        detail: string;               // "8 years, 2,000+ units, Texas focus"
        evidence?: string;            // "Led entitlement on 500-unit project in Austin"
      }>;
    };
    
    seeking: {
      title: string;                  // "Looking For"
      items: Array<{
        description: string;          // "Family office intros"
        detail: string;               // "Targeting $5M+ LP checks for Fund III"
        urgency: string;              // "Active" | "Exploratory"
      }>;
    };
    
    offering: {
      title: string;                  // "Can Help With"
      items: Array<{
        description: string;          // "LP deck review"
        detail: string;               // "Raised 2 funds, strong opinions on what works"
        availability: string;         // "Open" | "Selective"
      }>;
    };
    
    background: {
      title: string;                  // "Background"
      current_role: {
        role: string;
        company: string;
        duration: string;
        description: string;
      };
      prior_experience: string;       // Summary of relevant history
      track_record: Array<{
        achievement: string;
        context: string;
      }>;
    };
    
    personal: {
      title: string;                  // "Beyond Work"
      interests: string[];
      background_note: string;
      conversation_starters: string[];
    };
    
    collaboration: {                  // Only shown in certain contexts
      title: string;                  // "Working Style"
      style_summary: string;          // "Direct, responsive, execution-focused"
      preferences: string[];          // What they value in partnerships
    };
  };

  // ============================================
  // ACTIONS (context-dependent)
  // ============================================
  actions: {
    primary: {
      label: string;                  // "Request Intro" | "Connect" | "Message"
      action: string;                 // Action identifier
    };
    secondary?: {
      label: string;                  // "Save" | "Share" | "Report"
      action: string;
    };
  };

  // ============================================
  // METADATA (for display logic)
  // ============================================
  display_meta: {
    accent_color: string;             // Generated from name hash
    completeness: number;             // Profile completeness %
    last_updated: Date;
    event_context?: {                 // If viewing in event context
      event_name: string;
      match_reason?: string;          // Why they were matched to viewer
    };
  };
}
```

---

## Mapping: Full Profile → Trading Card

```typescript
function generateTradingCard(profile: FullProfile, context: DisplayContext): TradingCardDisplay {
  return {
    glance: {
      photo_url: profile.identity.photo_url,
      name: profile.identity.name,
      headline: generateHeadline(profile, context),
      location: formatLocation(profile.identity.location),
    },
    
    scan: {
      role: profile.professional.current.role,
      company: profile.professional.current.company,
      expertise_tags: profile.professional.expertise.primary.slice(0, 4),
      seeking_summary: summarize(profile.goals.seeking, 2),
      offering_summary: summarize(profile.offerings.can_help_with, 2),
    },
    
    read: {
      current_focus: profile.event_context.current_focus.summary,
      background: generateBackgroundSummary(profile, context),
      ideal_match_quote: profile.matching.ideal_match.description,
      personal_hook: generatePersonalHook(profile),
    },
    
    deep_dive: {
      expertise: mapExpertise(profile.professional.expertise.detailed),
      seeking: mapSeeking(profile.goals.seeking),
      offering: mapOffering(profile.offerings.can_help_with),
      background: mapBackground(profile.professional),
      personal: mapPersonal(profile.personal),
      collaboration: mapCollaboration(profile.collaboration),
    },
    
    actions: determineActions(context),
    
    display_meta: {
      accent_color: generateColor(profile.identity.name),
      completeness: profile.meta.profile_completeness,
      last_updated: profile.meta.updated_at,
      event_context: context.event ? {
        event_name: context.event.name,
        match_reason: context.match_reason,
      } : undefined,
    },
  };
}
```

---

## Display Contexts

Different contexts show different disclosure levels:

| Context | Default Level | Expandable To | Actions |
|---------|--------------|---------------|---------|
| Notification | L1 | L2 on tap | Dismiss, View |
| Match Preview (list) | L1 | L2 on tap | - |
| Search Result | L2 | L3 on tap | View, Save |
| Attendee List | L2 | L3 on tap | View, Connect |
| Match Card | L2 | L4 | View Full, Connect |
| Match Reveal | L3 | L4 | Connect, Skip |
| Full Profile View | L3 | L4 | Connect, Save, Share |
| Pre-Meeting Prep | L3 + L4 (auto) | - | Message |
| Post-Event Directory | L2 | L4 | Connect, Message |

---

## Visual Hierarchy

### L1: Glance
```
┌─────────────────────────────────┐
│  ┌───────┐                      │
│  │ Photo │  Marcus Chen         │
│  │  MC   │  BTR developer       │
│  └───────┘  scaling Southeast   │
│             Austin → Nashville  │
└─────────────────────────────────┘
```

### L2: Scan
```
┌─────────────────────────────────────────────┐
│  ┌───────┐                                  │
│  │ Photo │  Marcus Chen                     │
│  │  MC   │  BTR developer scaling Southeast │
│  └───────┘  Managing Partner · Redline Cap  │
│             Austin → Nashville              │
│                                             │
│  [Ground-up dev] [LP fundraising] [BTR ops] │
│                                             │
│  🎯 Family office intros, Nashville operator│
│  🤝 LP deck review, Austin diligence        │
└─────────────────────────────────────────────┘
```

### L3: Read
```
┌─────────────────────────────────────────────────────────────┐
│  [Header: Photo + Name + Headline + Meta]                   │
│                                                             │
│  [Expertise Tags]                                           │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ 🎯 Looking For      │  │ 🤝 Can Help With    │          │
│  │ • Family office     │  │ • LP deck review    │          │
│  │   intros            │  │ • Austin diligence  │          │
│  │ • Nashville operator│  │ • Entitlement help  │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  CURRENT FOCUS                                              │
│  Raising Fund III ($75M) for BTR projects,                  │
│  expanding operations to Southeast.                         │
│                                                             │
│  BACKGROUND                                                 │
│  Built 2,000+ units across Texas over 8 years.             │
│  Former investment banker, pivoted to RE post-2008.         │
│                                                             │
│  IDEAL CONNECTION                                           │
│  "Someone who's done 50+ BTR units in Nashville            │
│   or Memphis and can help me avoid rookie mistakes"        │
│                                                             │
│  ──────────────────────────────────────────────            │
│  🎾 Former college baseball · 🥃 Bourbon collector         │
│                                                             │
│  [Expand for more ↓]                                       │
└─────────────────────────────────────────────────────────────┘
```

### L4: Deep-Dive (Expandable)
```
┌─────────────────────────────────────────────────────────────┐
│  [L3 Content Above]                                         │
│                                                             │
│  ▼ EXPERTISE (tap to expand)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Ground-up Development                                │   │
│  │ 8 years experience, 2,000+ units                    │   │
│  │ "Led entitlement on 500-unit Austin project"        │   │
│  │                                                      │   │
│  │ LP Fundraising                                       │   │
│  │ Raised 2 funds ($XXM total)                         │   │
│  │ "Know what institutional LPs want to see"           │   │
│  │                                                      │   │
│  │ BTR Operations                                       │   │
│  │ Operating 400 units currently                       │   │
│  │ "Built ops playbook from scratch"                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ▼ LOOKING FOR (tap to expand)                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Family Office Intros (Active)                        │   │
│  │ Targeting $5M+ LP checks for Fund III               │   │
│  │ "Want to move upmarket from HNW individuals"        │   │
│  │                                                      │   │
│  │ Nashville Operator (Active)                          │   │
│  │ Looking for JV or operating partner                 │   │
│  │ "Need someone with 50+ units of local experience"   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ▼ CAN HELP WITH (tap to expand)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LP Deck Review (Open)                                │   │
│  │ "Raised two funds, have strong opinions"            │   │
│  │                                                      │   │
│  │ Austin Market Diligence (Open)                       │   │
│  │ "Deep knowledge of submarkets and operators"        │   │
│  │                                                      │   │
│  │ Entitlement Strategy (Selective)                     │   │
│  │ "Know the Texas process well, happy to share"       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ▶ BACKGROUND (collapsed)                                  │
│  ▶ BEYOND WORK (collapsed)                                 │
│  ▶ WORKING STYLE (collapsed)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Headline Generation

The headline is event-contextualized. Same person, different events:

| Event Type | Headline |
|------------|----------|
| Real Estate Summit | "Build-to-rent developer scaling into Southeast" |
| LP/GP Networking | "GP raising $75M for BTR, seeking family office LPs" |
| Austin Business Event | "Multifamily developer, 2,000+ units across Texas" |
| Former Athletes in Business | "Former D1 baseball player turned RE developer" |

**Generation logic:**
1. Pull `event_context.relevant_background.highlighted_expertise`
2. Incorporate `event_context.current_focus.summary`
3. Use event-appropriate framing
4. Keep under 10 words

---

## Expandable Section Behavior

When user taps an expandable section:

1. **Animate expansion** (smooth, not jarring)
2. **Show full detail** for that section
3. **Collapse other open sections** (optional, depends on mobile vs. desktop)
4. **Remember state** within session (if they expanded "Expertise", keep it expanded when returning)

---

## Actions by Context

### Pre-Event (Match Reveal)
- **Primary:** "I'd like to meet them" (confirms interest)
- **Secondary:** "Skip" (passes on match)

### At-Event (Match Lookup)
- **Primary:** "Find them" (shows location hint if available)
- **Secondary:** "Conversation prompts" (shows suggested topics)

### Post-Event (Directory)
- **Primary:** "Request Intro" (sends connection request)
- **Secondary:** "Save" (bookmarks for later)

### Profile View (Any time)
- **Primary:** "Connect" (context-dependent action)
- **Secondary:** "Share" (share card with someone else)

---

## Mobile vs. Desktop

### Mobile (Primary)
- L1/L2 are card-based, tappable
- L3 is full-screen modal/sheet
- L4 expansions happen within the modal
- Bottom sheet for actions

### Desktop
- L2 cards in grid/list
- L3/L4 in side panel or modal
- Hover states for preview
- Actions in card footer

---

## Accessibility

- All images have alt text (name + role)
- Color is never the only indicator
- Expandable sections announced to screen readers
- Tap targets minimum 44x44px
- High contrast text on all backgrounds
