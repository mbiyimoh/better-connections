# Extraction Strategy (Questionnaire → Full Profile)

## Overview

This document describes how we transform **multi-modal questionnaire responses** into the **Full Profile schema** that powers matching and trading card generation.

The questionnaire captures a mix of:
- **Structured data** (sliders, single-select, multi-select, rankings)
- **Semi-structured data** (mad-libs with fill-in-the-blank)
- **Unstructured data** (open text responses)

The extraction pipeline processes all three types to populate the Full Profile.

---

## The Two Required Questions

These questions are **always present** and **always open text** because they're the foundation of meaningful matching:

### Q1: Goals
```
"What are your biggest current goals?"
(What are you actively working toward right now — professionally or personally?)
```

**Extracts:**
- `goals.seeking.primary` — The #1 thing they want
- `goals.seeking.secondary[]` — Additional goals mentioned
- `goals.seeking.raw_statement` — Verbatim response (preserved)
- `goals.open_to[]` — Broader categories inferred from specifics
- `event_context.current_focus` — What they're actively working on

**Inference Rules:**
- If they mention fundraising → `open_to` includes "Investment opportunities"
- If they mention hiring → `open_to` includes "Talent/recruiting"
- If they mention scaling/growth → `open_to` includes "Strategic partnerships"
- Extract specific asks (dollar amounts, role types, market names) into `seeking`

---

### Q2: Ideal Connections
```
"Who would be your ideal connections at this event?"
(Describe the type of people you'd most like to meet.)
```

**Extracts:**
- `matching.ideal_match.description` — Verbatim response (CRITICAL for matching)
- `matching.ideal_match.parsed_criteria[]` — Structured extraction of criteria
- `goals.seeking[]` — Additional signal for what they want

**Inference Rules:**
- Extract role types ("VCs", "operators", "founders")
- Extract experience levels ("early-stage", "scaled to 100+")
- Extract domain expertise ("AI/ML", "real estate", "healthcare")
- Extract specific attributes ("woman in RE development", "been through acquisition")
- Preserve the raw description — often contains nuance structured fields miss

**Why Verbatim Matters:**
> "Someone who's been through a messy partnership breakup"

This can't be captured in structured fields but is gold for matching. The raw `ideal_match.description` feeds directly into semantic matching.

---

## Extraction by Question Type

### Open Text → Multiple Fields

Open text responses require LLM extraction. The model should:

1. **Identify explicit statements** — Direct claims ("I run a $50M fund")
2. **Infer implicit information** — Role seniority from language, expertise from depth
3. **Preserve verbatim quotes** — For matching and card generation
4. **Flag low-confidence extractions** — When inference is uncertain

**Example:**
```
Input: "I'm trying to raise a $20M seed round for my AI startup. 
We're building developer tools and I need intros to technical LPs 
who get infrastructure plays."

Extracts:
- goals.seeking.primary: "Raise $20M seed round"
- goals.seeking.secondary: ["Intros to technical LPs"]
- professional.industry: "AI / Developer Tools"
- professional.sub_industry: "Infrastructure"
- goals.investment_stage: "Seed"
- goals.target_amount: "$20M"
- matching.ideal_match.parsed_criteria: ["Technical LPs", "Infrastructure investors"]
```

---

### Slider → Numeric + Category

Slider values (0-100) map to both raw scores and categorical labels.

**Example: Tech Savviness**
```
Input: 75 (on scale of "Prefers simplicity" to "Power user")

Extracts:
- preferences.tech_comfort.score: 75
- preferences.tech_comfort.category: "Power user"
- communication.prefers_detailed_tools: true
```

**Example: Energy Level**
```
Input: 30 (on scale of "Reflective" to "High energy")

Extracts:
- matching.energy_level.score: 30
- matching.energy_level.category: "Reflective"
```

---

### Single Select → Direct Mapping + Inference

Single select provides explicit categorization plus inference opportunity.

**Example: Professional Stage**
```
Input: "Founder" (selected from Early/Mid/Senior/Founder)

Extracts:
- professional.experience_level: "Founder"
- professional.seniority: "Executive" (inferred)
- offerings.willing_to: ["Advise", "Partner"] (inferred from founder status)
```

---

### Multi Select → Array + Weighting

Multi-select captures explicit interests. Order and count provide signal.

**Example: Topics to Discuss**
```
Input: ["AI & Machine Learning", "Fundraising", "Hiring"] (selected 3 of 8)

Extracts:
- preferences.conversation_topics: ["AI & Machine Learning", "Fundraising", "Hiring"]
- preferences.primary_interest: "AI & Machine Learning" (first selected)
- professional.expertise[]: May add "AI/ML" if selected
- goals.seeking[]: May add hiring-related goals if "Hiring" selected
```

---

### Mad-Lib → Structured Extraction

Mad-libs provide semi-structured data with natural language context.

**Example: Current Challenge**
```
Template: "Right now, I'm trying to {action}, but it's difficult because {blocker}."
Input: { action: "close our Series A", blocker: "we keep getting pushed to show more traction" }

Extracts:
- goals.seeking.primary: "Close Series A"
- goals.blockers[]: "Need more traction"
- goals.stage: "Series A" (inferred)
- event_context.current_focus: "Fundraising"
```

---

### Ranking → Priority Order

Rankings reveal prioritization that other question types can't capture.

**Example: Event Priorities**
```
Input: ["Find talent to hire", "Meet potential investors", "Learn from peers", ...]

Extracts:
- goals.event_priorities: [ordered array]
- goals.seeking.primary: "Find talent to hire" (top ranked)
- goals.seeking.secondary: ["Meet potential investors"]
- matching.conversation_preference: "Action-oriented" (inferred from hiring/investing focus)
```

---

## Context Field Processing

Every question includes an optional "Add context?" field. This captures elaboration that enriches extraction.

**Processing Rules:**
1. If context provided, re-run extraction on combined (answer + context)
2. Context often contains the "why" behind an answer
3. Weight context-enhanced extractions higher in confidence scoring

**Example:**
```
Question: Professional stage?
Answer: "Mid-Career"
Context: "But I just made a big pivot from finance to tech, so in some ways I feel like I'm starting over"

Extracts:
- professional.experience_level: "Mid-Career"
- professional.career_trajectory: "Pivot"
- professional.previous_industry: "Finance"
- matching.conversation_topics[]: "Career transitions"
```

---

## Pre-Fill Logic (Better Contacts Users)

For users with existing Better Contacts profiles:

### What We Pre-Fill
- `identity.*` (name, photo, location)
- `professional.current.*` (role, company)
- `professional.expertise[]`
- `offerings.can_help_with[]` (from past interactions)

### What We Still Ask
- Goals (always event-specific)
- Ideal connections (always event-specific)
- Any organizer-configured questions

### Confirmation Flow
1. Show pre-filled data: "Based on your profile..."
2. Allow edit before proceeding
3. Mark `is_prefilled: true` in response metadata
4. Track which fields were edited vs. confirmed

---

## Trading Card Generation

After Full Profile extraction, generate the Trading Card (display layer):

### Direct Mappings
| Full Profile Field | Trading Card Field |
|-------------------|-------------------|
| `identity.name` | `identity.name` |
| `professional.current.role` | `professional.role` |
| `professional.current.company` | `professional.company` |
| `goals.seeking.primary` | `goals.seeking[0]` |
| `matching.ideal_match.description` | `matching.ideal_match_description` |

### Generated Fields
| Trading Card Field | Generated From |
|-------------------|----------------|
| `identity.headline` | LLM summary of role + current focus (5-8 words) |
| `event_context.relevant_background` | LLM selection of most event-relevant background |
| `personal.background_note` | LLM extraction of memorable personal detail |

### Event Contextualization
The same Full Profile generates **different Trading Cards** for different events:

- **AI Summit:** Emphasize technical expertise, AI-related goals
- **Real Estate Event:** Emphasize investment interests, deal experience
- **Founder Dinner:** Emphasize company stage, fundraising status

---

## Confidence Scoring

Each extracted field includes confidence metadata:

```typescript
interface ExtractedField {
  value: any;
  confidence: 'high' | 'medium' | 'low';
  source: 'explicit' | 'inferred' | 'prefilled';
  source_question_id?: string;
}
```

**High Confidence:**
- Explicit structured responses (slider value, selected option)
- Direct statements in open text ("I'm raising $20M")
- Pre-filled data confirmed by user

**Medium Confidence:**
- Inferred from open text with clear signals
- Derived from multiple consistent signals

**Low Confidence:**
- Single weak signal
- Contradicted by other responses
- Inferred from absence of information

---

## Quality Signals

Track response quality for matching weight adjustment:

| Signal | Indicates | Impact |
|--------|-----------|--------|
| Response length | Engagement level | Longer = more matching signal |
| Context provided | Thoughtfulness | Weight these responses higher |
| Edit after preview | Self-awareness | May indicate more accurate data |
| Time spent | Care taken | Very fast = possibly low quality |
| Questions skipped | Priorities | Skipped optional = less important to them |

---

## Matching Algorithm Inputs

The Full Profile feeds the matching algorithm. Key fields by weight:

### Primary (Highest Weight)
- `matching.ideal_match.description` — Semantic similarity to other profiles
- `goals.seeking[]` ↔ `offerings.can_help_with[]` — Reciprocal matching

### Secondary
- `professional.expertise[]` — Domain overlap
- `matching.energy_level` — Compatibility
- `preferences.conversation_topics[]` — Common interests

### Tertiary
- `professional.industry` — Context
- `identity.location` — Geographic relevance
- `matching.anti_match[]` — Exclusion criteria

---

## Open Questions

1. **Embedding Model:** Which model for semantic similarity on open text?
2. **Confidence Thresholds:** At what confidence do we display vs. hide fields?
3. **Conflicting Signals:** How to resolve when slider says X but open text implies Y?
4. **Cross-Event Learning:** How much does past event data influence new extractions?

---

*Last Updated: January 2025*
*Replaces: INTERVIEW_STRATEGY.md (chat-based approach)*
