# M33T HANDOFF PACKAGE FOR CLAUDE CODE (v3)

> Complete technical handoff for building M33T — the intelligent event networking platform that layers on top of Better Contacts.
>
> **Updated:** January 2025 — Unified all documentation, updated OG thread documents for multi-modal questionnaire approach

---

## PRODUCT OVERVIEW

**M33T** transforms networking events from random mingling into purposeful matching by:
1. Leveraging existing Better Contacts profiles for rich attendee context
2. Enabling organizers to curate guest lists from their network
3. Collecting rich attendee context through **configurable multi-modal questionnaires**
4. Generating AI-powered connection recommendations based on attendee goals
5. Facilitating meaningful conversations with contextual prompts

**Architecture:** M33T is a feature layer on Better Contacts, not a standalone product. Events inherit contact intelligence.

---

## FILES TO DOWNLOAD

### ALL FILES NOW IN CURRENT SESSION
*Located in `/mnt/user-data/outputs/` — download directly*

The OG thread documents have been **updated and moved** to the current session to maintain consistency with the multi-modal questionnaire approach.

#### Core Documentation

| File | Description | Status |
|------|-------------|--------|
| `M33T_HANDOFF_PACKAGE_v3.md` | This document — complete handoff guide | ✅ Current |
| `M33T_Organizer_Prototypes_Design_Spec.md` | Comprehensive design document covering all organizer prototypes | ✅ Complete |
| `ARCHITECTURE_OVERVIEW.md` | Data architecture — capture vs. display layer separation | ✅ **Updated** |
| `FULL_PROFILE_SCHEMA.md` | Complete capture-layer data model (30+ fields) | ✅ **Updated** |
| `EXTRACTION_STRATEGY.md` | How questionnaire responses become Full Profile data | ✅ **NEW** (replaces INTERVIEW_STRATEGY.md) |
| `TRADING_CARD_DISPLAY.md` | Display-layer schema with L1-L4 progressive disclosure | ✅ Valid |
| `ATTENDEE_JOURNEY.md` | Complete attendee journey across all 4 phases | ✅ **Updated** |

#### Organizer Prototypes

| File | Description | Status |
|------|-------------|--------|
| `EventCreationFlow.jsx` | **7-step** event creation wizard (includes Questionnaire step) | ✅ Complete |
| `GuestListCuration.jsx` | AI-powered guest list builder from Better Contacts | ✅ Complete |
| `CurateConnectionsDashboard.jsx` | THE killer feature — organizer reviews matches per attendee | ✅ Complete |
| `RSVPOrganizerDashboard.jsx` | RSVP tracking, reminders, activity timeline | ✅ Complete |
| `QuestionnaireBuilder.jsx` | Organizer admin for configuring interview questions | ✅ Complete |

#### Attendee Prototypes

| File | Description | Status |
|------|-------------|--------|
| `RSVPAttendeeFlow.jsx` | Guest-facing landing page and RSVP flow | ✅ Complete |
| `InterviewExperienceV2.jsx` | **Multi-modal questionnaire** with 6 question types | ✅ Complete |
| `TradingCard-v2.jsx` | Trading card component with L1-L4 disclosure levels | ✅ Valid |
| `AttendeeJourney-Wireframe.jsx` | Full attendee journey prototype (Phases 1-4) | ✅ Valid |

---

### FROM "Wisconsin sports conference networking proposal" THREAD
*URL: https://claude.ai/chat/522f4336-918a-4512-bedd-616b0cb75937*

| File | Description | What It Contains |
|------|-------------|------------------|
| `WisconsinProposal-Enhanced-v2.jsx` | Wisconsin-branded full prototype | Complete flow with Stories → Interview → Trading Card → Match Reveal |

**Note:** This is a themed variant showing how M33T can be white-labeled for conferences. Use for reference on branding flexibility.

---

## ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MULTI-MODAL QUESTIONNAIRE                              │
│   RSVP Landing → Pre-fill Review (if BC user) → Question Screens → Preview │
│   Question Types: Open Text | Slider | Single/Multi Select | Mad-Lib | Rank│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    QUESTIONNAIRE RESPONSE (Raw Storage)                     │
│   Stores exactly what the user entered: question_id → value + context       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXTRACTION PIPELINE (LLM Processing)                    │
│   Direct mapping (structured) + LLM extraction (open text) + Inference      │
│   See: EXTRACTION_STRATEGY.md                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FULL PROFILE (Capture Layer)                         │
│   Comprehensive data model for matching — includes non-displayable fields   │
│   See: FULL_PROFILE_SCHEMA.md                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────────┐
│      MATCHING ENGINE              │ │     TRADING CARD (Display Layer)      │
│  Seeking ↔ Offering alignment     │ │  L1: Glance | L2: Scan | L3: Read     │
│  Ideal match description          │ │  L4: Deep-dive (expandable)           │
│  Style compatibility              │ │  See: TRADING_CARD_DISPLAY.md         │
└───────────────────────────────────┘ └───────────────────────────────────────┘
```

**See:** `ARCHITECTURE_OVERVIEW.md` for complete data flow documentation.

---

## MULTI-MODAL QUESTIONNAIRE SYSTEM

### Philosophy

The interview is the single most important data collection moment. Better questions → richer context → better AI recommendations. The **multi-modal questionnaire**:

1. **Engages** — Varied question types keep users interested
2. **Extracts** — Different formats capture different types of data
3. **Encourages elaboration** — Every question has "Add context?" prompt
4. **Respects constraints** — Two questions are ALWAYS required for matching to work

### The Two Required Questions

These cannot be removed or changed to optional:

1. **"What are your biggest current goals?"** (Open Text, category: GOALS)
2. **"Who would be your ideal connections at this event?"** (Open Text, category: CONNECTIONS)

Without these, meaningful matching is impossible. Everything else is organizer-configurable.

---

### Six Question Types

| Type | Icon | Description | Best For |
|------|------|-------------|----------|
| **Open Text** | 📝 | Free-form textarea with placeholder/hint | Goals, ideal connections, open-ended questions |
| **Slider** | 🎚️ | Spectrum between two labeled poles (0-100) | Preferences, comfort levels, experience scales |
| **Single Select** | ⭕ | Radio buttons with optional descriptions | Professional stage, industry, binary choices |
| **Multi Select** | ☑️ | Checkboxes with selection limit | Topics of interest, expertise areas, preferences |
| **Mad-Lib** | 🧩 | Fill-in-the-blank sentence template | Challenges, current projects, context gathering |
| **Ranking** | 📊 | Drag-to-reorder priority list | Event goals, connection priorities |

### Question Categories

| Category | Purpose | Required Questions |
|----------|---------|-------------------|
| `GOALS` | What they want to achieve | ✅ "What are your biggest goals?" |
| `CONNECTIONS` | Who they want to meet | ✅ "Who are your ideal connections?" |
| `IDENTITY` | Who they are | Optional |
| `BACKGROUND` | Professional context | Optional |
| `PREFERENCES` | How they like to interact | Optional |

Organizers can also create custom categories.

---

## DATA MODELS

### Questionnaire Configuration Schema

```typescript
interface QuestionnaireConfig {
  event_id: string;
  questions: Question[];
  created_at: Date;
  updated_at: Date;
}

interface Question {
  id: string;
  type: 'open_text' | 'slider' | 'single_select' | 'multi_select' | 'mad_lib' | 'ranking';
  category: string;           // GOALS, CONNECTIONS, IDENTITY, BACKGROUND, PREFERENCES, or custom
  title: string;              // The main question text
  subtitle?: string;          // Additional context/instructions
  required: boolean;
  locked: boolean;            // If true, cannot be removed (only for Goals & Connections)
  order: number;
  
  // Type-specific fields
  placeholder?: string;       // For open_text
  hint?: string;              // Helper text below input
  leftLabel?: string;         // For slider (left pole)
  rightLabel?: string;        // For slider (right pole)
  options?: {                 // For single_select, multi_select
    value: string;
    label: string;
    description?: string;
  }[];
  maxSelections?: number;     // For multi_select
  template?: string;          // For mad_lib (e.g., "I'm trying to {action} but {blocker}")
  fields?: {                  // For mad_lib fill-in fields
    id: string;
    placeholder: string;
  }[];
  items?: {                   // For ranking
    id: string;
    label: string;
  }[];
}
```

### Question Response Schema

```typescript
interface QuestionnaireResponse {
  event_id: string;
  attendee_id: string;
  responses: {
    question_id: string;
    value: any;               // Type depends on question type
    context?: string;         // Optional "add context" elaboration
    answered_at: Date;
  }[];
  completed_at: Date;
  is_prefilled: boolean;      // True if existing Better Contacts user
}

// Value types by question type:
// open_text: string
// slider: number (0-100)
// single_select: string (option value)
// multi_select: string[] (array of option values)
// mad_lib: { [field_id]: string }
// ranking: string[] (ordered array of item ids)
```

### Full Profile Schema (Capture Layer)

See `FULL_PROFILE_SCHEMA.md` for complete 30+ field schema including:
- Identity (name, photo, location)
- Professional (role, company, expertise, seniority)
- Event Context (current focus, relevant background)
- Goals (seeking, open_to, priorities)
- Offerings (can_help_with, willing_to)
- Matching (ideal_match, anti_match, energy_level, style)
- Collaboration (communication pace, decision style, dealbreakers)
- Quality (confidence scores, completeness)

### Trading Card Schema (Display Layer)

See `TRADING_CARD_DISPLAY.md` for L1-L4 progressive disclosure:
- **L1 Glance:** Photo, name, headline, location
- **L2 Scan:** + Role/company, expertise tags, seeking/offering summary
- **L3 Read:** + Current focus, background, ideal match quote
- **L4 Deep-dive:** Expandable sections with full detail

---

## EVENT SCHEMA

```typescript
interface Event {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  
  // Timing
  date: Date;
  start_time: string;
  end_time: string;
  timezone: string;
  
  // Location
  venue_name: string;
  venue_address: string;
  
  // Settings
  capacity: number;
  rsvp_deadline?: Date;
  
  // Team
  organizer_ids: string[];
  
  // Interview Configuration
  questionnaire_id: string;    // Links to QuestionnaireConfig
  
  // Card Display Settings
  card_settings: {
    show_company: boolean;
    show_role: boolean;
    show_expertise: boolean;
    show_seeking: boolean;
    show_offering: boolean;
    show_personal: boolean;
  };
  
  // Match Settings
  matches_per_attendee: number;  // Default: 5
  reveal_timing: 'immediate' | '24h_before' | '48h_before';
  
  // Status
  status: 'draft' | 'published' | 'active' | 'completed';
  created_at: Date;
  updated_at: Date;
}
```

---

## DESIGN SYSTEM

### Colors
```css
--bg-primary: #0a0a0a;
--bg-surface: #111111;
--bg-elevated: #1a1a1a;
--gold: #d4a54a;
--gold-dim: rgba(212, 165, 74, 0.1);
--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--text-muted: #737373;
--border: #27272a;
--success: #4ade80;
--warning: #fbbf24;
--error: #ef4444;
--info: #60a5fa;
```

### Typography
- **Display:** Instrument Serif (fallback: Georgia, serif)
- **Body:** DM Sans (fallback: system-ui, sans-serif)
- **Mono:** JetBrains Mono (for technical content)

### Component Patterns
All prototypes use inline styles (not Tailwind arbitrary values) because Claude artifacts only support pre-defined Tailwind classes. When building in Claude Code, you can convert to proper Tailwind or CSS modules.

---

## INTEGRATION POINTS WITH BETTER CONTACTS

### 1. Contact Import
- Guest list pulls from user's Better Contacts
- Each contact has relationship strength, tags, notes
- AI can suggest guests based on natural language queries

### 2. Profile Enrichment + Interview Differential
- **Existing Better Contacts users** → Pre-fill review screen + Quick interview (event-specific questions only)
- **New contacts** → Full interview (all questions)
- Pre-filled data shown with "Confirm or Edit" option
- This creates two interview paths without organizer configuration

### 3. Post-Event Sync
- New connections made at event can be added to Better Contacts
- Conversation notes persist in contact record
- "Met at [Event Name]" tag auto-applied

---

## KEY FEATURES BY USER TYPE

### Organizers
1. **Event Creation** — 7-step wizard (includes questionnaire configuration)
2. **Questionnaire Builder** — Configure question types, order, required/optional
3. **Guest List Curation** — AI-powered suggestions from Better Contacts
4. **RSVP Management** — Track responses, send reminders, manage waitlist
5. **Connection Curation** — Review/approve AI-generated matches per attendee
6. **Card Customization** — Choose which profile fields to display

### Attendees
1. **RSVP Flow** — Beautiful landing page, one-tap response
2. **Multi-Modal Interview** — Engaging question types (slider, ranking, mad-lib, etc.)
3. **Match Reveal** — See curated connections 24-48 hours before event
4. **At-Event Dashboard** — Current match, conversation prompts, timer
5. **Post-Event Directory** — Searchable attendee list with connection requests

---

## QUESTIONNAIRE BUILDER FEATURES

### Two Starting Paths
1. **"Start with Essentials"** — 4 pre-configured questions:
   - Goals (required, locked)
   - Ideal Connections (required, locked)
   - Professional Stage (single select)
   - Topics of Interest (multi select)

2. **"Build from Scratch"** — Just the 2 required questions, add your own

### Organizer Capabilities
- Add any of 6 question types
- Set questions as required or optional
- Reorder questions (except locked ones stay at top)
- Duplicate questions as templates
- Preview attendee experience
- Edit questionnaire any time (via "Questionnaire" tab post-creation)

### Constraints
- Goals and Ideal Connections CANNOT be removed
- Goals and Ideal Connections MUST be open text (for rich context extraction)
- These two questions always appear first

---

## EXTRACTION PIPELINE

### How Questionnaire Responses Become Full Profiles

See `EXTRACTION_STRATEGY.md` for complete documentation. Summary:

**Direct Mapping (Structured Questions):**
- Slider → numeric score + category label
- Single select → category value
- Multi select → array of values
- Ranking → ordered array

**LLM Extraction (Open Text):**
- Goals question → `goals.seeking.*`, `event_context.current_focus`
- Ideal Connections → `matching.ideal_match.*`
- Inference of implicit information from response patterns

**Confidence Scoring:**
- Every extracted field has confidence: high | medium | low
- Source tracking: explicit | inferred | prefilled
- Affects display decisions and matching weight

---

## MATCHING ALGORITHM REQUIREMENTS

### Inputs (Per Attendee)
- `goals.seeking` — What they want (from required Goals question)
- `matching.ideal_match.description` — Who they want to meet (from required Connections question)
- `offerings.can_help_with` — What they offer
- `professional.expertise` — Domain knowledge
- `matching.energy_level` — High/Medium/Low
- `matching.conversation_preference` — Deep-dive/Action-oriented/Social
- **All questionnaire responses** — Additional signals for matching

### Logic
1. **Goal-Offering Match** — Does A seek what B offers (and vice versa)?
2. **Ideal Connection Match** — Does A's ideal match description fit B?
3. **Expertise Relevance** — Do their domains intersect productively?
4. **Style Compatibility** — Similar energy levels, compatible conversation styles
5. **Anti-Match Filtering** — Avoid pairings where either party has stated dealbreakers

### Outputs (Per Attendee)
- Top 5 ranked matches with:
  - Overall score (0-100)
  - Score breakdown by dimension
  - "Why This Match" explanation
  - 2-3 conversation starters

### Real-Time Updates
- When new RSVPs come in, regenerate affected match lists
- Late additions flagged but don't replace existing top matches
- Organizer can trigger manual regeneration

---

## PRIORITY ORDER FOR DEVELOPMENT

### Phase 1: Core Infrastructure
1. Event data model + CRUD
2. Questionnaire configuration model + CRUD
3. Guest list management
4. RSVP tracking
5. Better Contacts integration

### Phase 2: Attendee Experience
1. RSVP landing page
2. Multi-modal interview flow (all 6 question types)
3. Pre-fill detection + quick vs full path
4. Profile/trading card generation (extraction pipeline)
5. Match reveal experience

### Phase 3: Organizer Intelligence
1. Questionnaire Builder admin
2. AI guest suggestions
3. Matching algorithm
4. Curate Connections dashboard
5. Real-time updates

### Phase 4: At-Event + Post-Event
1. Event day dashboard
2. Conversation prompts
3. Post-event directory
4. Connection request flow

---

## OPEN QUESTIONS FOR DEVELOPMENT

1. **Matching Algorithm Implementation** — Use embeddings for semantic similarity? Rule-based scoring? Hybrid?

2. **Real-Time Architecture** — WebSockets for live RSVP/match updates? Polling?

3. **Better Contacts Data Model** — What's the actual schema? How do we query it?

4. **Authentication** — Shared auth with Better Contacts? Separate?

5. **Notification System** — Email + SMS for reminders? Push notifications?

6. **Scalability** — How many attendees per event? Affects matching algorithm complexity.

7. **Question Response Storage** — Store raw responses separately from extracted Trading Card fields?

8. **LLM Extraction Pipeline** — Which model? Batch processing or real-time?

9. **Embedding Model** — Which model for semantic similarity on ideal_match descriptions?

---

## FILE CHECKLIST FOR HANDOFF

Before starting development, confirm you have all files from `/mnt/user-data/outputs/`:

**Documentation:**
- [ ] `M33T_HANDOFF_PACKAGE_v3.md` — This document
- [ ] `M33T_Organizer_Prototypes_Design_Spec.md` — Master design document
- [ ] `ARCHITECTURE_OVERVIEW.md` — Data architecture (capture vs. display)
- [ ] `FULL_PROFILE_SCHEMA.md` — Complete capture-layer schema
- [ ] `EXTRACTION_STRATEGY.md` — Questionnaire → Full Profile transformation
- [ ] `TRADING_CARD_DISPLAY.md` — Display-layer schema (L1-L4)
- [ ] `ATTENDEE_JOURNEY.md` — Complete attendee journey (4 phases)

**Organizer Prototypes:**
- [ ] `EventCreationFlow.jsx` — 7-step wizard
- [ ] `GuestListCuration.jsx` — Guest list builder
- [ ] `CurateConnectionsDashboard.jsx` — Match curation
- [ ] `RSVPOrganizerDashboard.jsx` — RSVP tracking
- [ ] `QuestionnaireBuilder.jsx` — Question configuration admin

**Attendee Prototypes:**
- [ ] `RSVPAttendeeFlow.jsx` — Landing page + RSVP
- [ ] `InterviewExperienceV2.jsx` — Multi-modal questionnaire
- [ ] `TradingCard-v2.jsx` — Card component (from OG thread)
- [ ] `AttendeeJourney-Wireframe.jsx` — Full journey prototype (from OG thread)

**Reference Only (from OG thread — outdated approach but useful for context):**
- [ ] Wisconsin proposal prototype (separate thread)

---

## CHANGELOG

### v3 (January 2025)
- **Updated:** ARCHITECTURE_OVERVIEW.md for multi-modal questionnaire flow
- **Updated:** FULL_PROFILE_SCHEMA.md with source tracking and questionnaire_response_id
- **Updated:** ATTENDEE_JOURNEY.md Phase 1 to reflect questionnaire (not chat)
- **Replaced:** INTERVIEW_STRATEGY.md → EXTRACTION_STRATEGY.md (new document)
- **Consolidated:** All documentation now in single session outputs
- **Clarified:** File locations and which documents supersede OG thread versions

### v2 (January 2025)
- Added multi-modal interview system with 6 question types
- Added QuestionnaireBuilder.jsx for organizer configuration
- Added QuestionnaireConfig and QuestionnaireResponse data models
- Updated EventCreationFlow.jsx to 7 steps (added Questionnaire step)
- Updated Event schema to include questionnaire_id
- Replaced chat-based InterviewExperience.jsx with InterviewExperienceV2.jsx
- Clarified two required questions (Goals + Connections) that cannot be removed

### v1 (January 2025)
- Initial handoff package with 6 organizer prototypes
- Chat-based interview experience
- Core data models and integration points

---

*Last Updated: January 2025*
