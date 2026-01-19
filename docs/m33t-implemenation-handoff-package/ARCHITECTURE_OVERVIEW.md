# M33T Architecture Overview

## Overview

This document describes the data architecture for M33T, the intelligent event networking platform. The core insight is separating **capture** (what we collect) from **display** (what we show).

---

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                      MULTI-MODAL QUESTIONNAIRE                              │
│                                                                             │
│   RSVP Landing → Pre-fill Review (if BC user) → Question Screens → Preview │
│                                                                             │
│   Question Types: Open Text | Slider | Single/Multi Select | Mad-Lib | Rank│
│   Required: Goals + Ideal Connections (always open text)                    │
│   Optional: Organizer-configured questions (any type)                       │
│                                                                             │
│   Duration: 3-5 minutes                                                     │
│   Existing BC users: Pre-fill + event-specific questions only              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    QUESTIONNAIRE RESPONSE (Raw Storage)                     │
│                                                                             │
│   Stores exactly what the user entered:                                     │
│   • question_id → value (typed by question type)                           │
│   • context elaborations (optional "add more" fields)                      │
│   • metadata (timestamps, pre-fill status, edits)                          │
│                                                                             │
│   See: QuestionnaireResponse schema in handoff package                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                     EXTRACTION PIPELINE (LLM Processing)                    │
│                                                                             │
│   Transforms questionnaire responses into structured Full Profile:          │
│   • Direct mapping (slider → score, select → category)                     │
│   • LLM extraction (open text → multiple structured fields)                │
│   • Inference (derive implicit information from response patterns)         │
│   • Confidence scoring (high/medium/low per field)                         │
│                                                                             │
│   See: EXTRACTION_STRATEGY.md                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        FULL PROFILE (Capture Layer)                         │
│                                                                             │
│   Comprehensive data model optimized for:                                   │
│   • Matching algorithm input                                                │
│   • Semantic search / embeddings                                            │
│   • Long-term user value (persists across events)                          │
│                                                                             │
│   Includes non-displayable fields:                                          │
│   • Collaboration style / preferences                                       │
│   • Dealbreakers / anti-match criteria                                     │
│   • Response quality metadata                                               │
│   • Confidence scores per field                                            │
│                                                                             │
│   See: FULL_PROFILE_SCHEMA.md                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────────┐
│                                   │ │                                       │
│      MATCHING ENGINE              │ │     TRADING CARD (Display Layer)      │
│                                   │ │                                       │
│  Consumes full profile:           │ │  Progressive disclosure view:         │
│  • Seeking ↔ Offering alignment   │ │  • L1: Glance (photo, name, headline) │
│  • Ideal match description        │ │  • L2: Scan (expertise, goals)        │
│  • Expertise overlap              │ │  • L3: Read (context, background)     │
│  • Style compatibility            │ │  • L4: Deep-dive (expandable sections)│
│  • Anti-match filtering           │ │                                       │
│                                   │ │  Event-contextualized:                │
│  Outputs:                         │ │  Same person, different card per event│
│  • Top 5 matches per attendee     │ │                                       │
│  • Score breakdown                │ │  See: TRADING_CARD_DISPLAY.md         │
│  • "Why matched" explanation      │ │       TradingCard-v2.jsx              │
│  • Conversation starters          │ │                                       │
│                                   │ │                                       │
└───────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## Layer Separation: Why It Matters

### Capture More Than You Display

The Full Profile contains information useful for matching that users wouldn't want displayed publicly:

| Captured (Hidden) | Used For |
|-------------------|----------|
| Response quality scores | Weight matching confidence |
| Collaboration style preferences | Avoid incompatible pairings |
| Anti-match criteria | Exclusion filtering |
| Confidence levels per field | Determine what to show |
| Raw verbatim responses | Semantic matching |

### Display Is Event-Contextual

The same Full Profile generates different Trading Cards for different events:

| Event Type | Card Emphasizes |
|------------|-----------------|
| AI Summit | Technical expertise, AI projects |
| Real Estate Dinner | Investment thesis, deal experience |
| Founder Meetup | Company stage, fundraising status |
| Sports Business Conference | Industry connections, partnership interests |

---

## Questionnaire Configuration

Organizers configure what questions attendees see:

### Always Present (Locked)
1. **Goals** — "What are your biggest current goals?" (Open Text, Required)
2. **Ideal Connections** — "Who would be your ideal connections?" (Open Text, Required)

These cannot be removed because matching requires them.

### Organizer-Configured
- Choose from 6 question types
- Set required vs. optional
- Customize copy/options
- Reorder (after the two required questions)
- Two starting paths: "Essentials" (4 questions) or "From Scratch" (2 questions)

### Question Types Available
| Type | Data Captured | Best For |
|------|---------------|----------|
| Open Text | Free-form string | Goals, connections, open-ended |
| Slider | 0-100 numeric | Preferences, comfort levels |
| Single Select | One option | Categories, stages |
| Multi Select | Multiple options (with limit) | Interests, expertise areas |
| Mad-Lib | Fill-in-the-blank | Challenges, structured context |
| Ranking | Ordered list | Priorities |

---

## Better Contacts Integration

M33T layers on top of Better Contacts:

### Pre-Event (Guest List)
- Organizers invite from their Better Contacts
- Relationship strength informs invitation priority
- Tags help segment guest list

### During Intake (Pre-Fill)
- Existing BC users see their profile data
- "Confirm or Edit" before proceeding
- Skip redundant questions (professional background already known)
- Only ask event-specific questions (goals, connections, preferences)

### Post-Event (Sync Back)
- New connections added to Better Contacts
- "Met at [Event Name]" tag auto-applied
- Conversation notes persist in contact record

---

## Data Persistence

### Per-Event Data
- Questionnaire responses
- Trading card (event-contextualized view)
- Match recommendations
- Connection interactions

### Cross-Event Data (Full Profile)
- Identity (name, photo, contact)
- Professional background
- Expertise areas
- Collaboration preferences
- Accumulated from all events

### Better Contacts Sync
- Contact record updated with event participation
- New connections created
- Tags and notes synced

---

## Key Design Decisions

### 1. Structured + Unstructured Capture
We use both:
- **Structured** (sliders, selects) for filterable/comparable data
- **Unstructured** (open text) for nuanced, semantic-matchable data

The two required open-text questions ensure we always have rich matching signal even if organizers only use structured questions for the rest.

### 2. Extraction Pipeline
Open text responses run through LLM extraction to populate Full Profile fields. This allows natural language input while maintaining structured data for matching.

### 3. Confidence Scoring
Every extracted field has a confidence level. This allows:
- Displaying only high-confidence data on cards
- Weighting matching by confidence
- Identifying where to ask follow-ups in future events

### 4. Event Contextualization
Trading Cards are generated per-event, not stored statically. The same Full Profile → different display based on event type and organizer card settings.

---

## Processing Pipeline

```
1. User completes questionnaire
   ↓
2. Raw responses stored (QuestionnaireResponse)
   ↓
3. Extraction pipeline runs:
   - Direct mappings (structured questions)
   - LLM extraction (open text questions)
   - Inference rules applied
   - Confidence scores assigned
   ↓
4. Full Profile updated/created
   ↓
5. Trading Card generated (event-contextualized)
   ↓
6. Matching algorithm runs (when enough RSVPs)
   ↓
7. Match recommendations generated
   ↓
8. Organizer reviews/approves matches
   ↓
9. Matches revealed to attendees
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `EXTRACTION_STRATEGY.md` | How questionnaire responses become Full Profile |
| `FULL_PROFILE_SCHEMA.md` | Complete capture-layer data model |
| `TRADING_CARD_DISPLAY.md` | Display-layer schema with L1-L4 levels |
| `QuestionnaireBuilder.jsx` | Organizer admin for configuring questions |
| `InterviewExperienceV2.jsx` | Attendee-facing questionnaire UI |

---

*Last Updated: January 2025*
