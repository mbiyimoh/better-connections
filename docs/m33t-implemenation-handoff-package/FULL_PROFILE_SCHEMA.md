# Full Profile Schema (Capture Layer)

## Overview

This schema defines **everything** we capture about an attendee. It's the "backend" of their identity—optimized for matching algorithm consumption, not human readability.

The Trading Card is a *view* of this data, not the data itself.

---

## Design Principles

1. **Capture more than you display** — The matching algorithm benefits from signal humans wouldn't want to read
2. **Infer aggressively** — Extract implicit information from how people answer, not just what they say
3. **Event-contextual + persistent** — Some data is event-specific, some carries across events
4. **Structured + unstructured** — Typed fields for filtering, free-text for semantic matching
5. **Track provenance** — Know where each field came from (direct capture vs. inference)

---

## Schema

```typescript
interface FullProfile {
  // ============================================
  // METADATA
  // ============================================
  meta: {
    id: string;                           // Unique profile ID
    created_at: Date;
    updated_at: Date;
    better_contacts_id?: string;          // Link to BC profile
    questionnaire_response_ids: string[]; // All questionnaire submissions
    last_event_id?: string;               // Most recent event participated
  };

  // ============================================
  // IDENTITY (Persistent across events)
  // ============================================
  identity: {
    name: string;                         // [DIRECT] Full name
    email: string;                        // [DIRECT] Primary contact
    phone?: string;                       // [DIRECT] Optional
    photo_url?: string;                   // [DIRECT] Profile photo
    linkedin_url?: string;                // [DIRECT] For enrichment
    location: {
      primary: string;                    // [DIRECT/INFERRED] "Austin, TX"
      secondary?: string;                 // [INFERRED] If multi-city mentioned
      flexibility: LocationFlex;          // [INFERRED] local_only | regional | national | global
    };
  };

  // ============================================
  // PROFESSIONAL BACKGROUND (Persistent, evolves)
  // ============================================
  professional: {
    current: {
      role: string;                       // [DIRECT/INFERRED] "Managing Partner"
      company: string;                    // [DIRECT/INFERRED] "Redline Capital"
      company_type?: CompanyType;         // [INFERRED] startup | enterprise | fund | agency | etc
      industry: string;                   // [DIRECT/INFERRED] "Real Estate"
      sub_industry?: string;              // [INFERRED] "Multifamily Development"
      function?: string;                  // [INFERRED] Investment | Operations | Sales | etc
      tenure_months?: number;             // [INFERRED] How long in current role
    };
    seniority: SeniorityLevel;            // [INFERRED] junior | mid | senior | executive | founder
    experience_years?: number;            // [INFERRED] Total professional experience
    previous_roles?: {                    // [INFERRED] From context clues
      role: string;
      company: string;
      industry: string;
    }[];
    expertise: {
      primary: string[];                  // [DIRECT/INFERRED] Top 2-4 skills
      secondary: string[];                // [INFERRED] Additional competencies
      evidence: {                         // [INFERRED] Why we believe this
        skill: string;
        source: string;                   // Quote or reference from response
      }[];
    };
  };

  // ============================================
  // EVENT CONTEXT (Per-event, regenerated)
  // ============================================
  event_context: {
    event_id: string;
    connection_to_event?: string;         // [INFERRED] How they know host/event
    attendance_motivation?: string;       // [INFERRED] Why they're coming
    relevant_background: string;          // [GENERATED] Most relevant slice for THIS event
    current_focus: {
      description: string;                // [DIRECT] From Goals question
      category?: string;                  // [INFERRED] Fundraising | Hiring | Growth | etc
      stage?: string;                     // [INFERRED] Seed | Series A | Scaling | etc
      timeline?: string;                  // [INFERRED] If mentioned
    };
  };

  // ============================================
  // GOALS & NEEDS (Per-event, from required questions)
  // ============================================
  goals: {
    seeking: {
      primary: string;                    // [EXTRACTED] The #1 thing they want
      secondary: string[];                // [EXTRACTED] Additional goals
      raw_statement: string;              // [DIRECT] Verbatim from Goals question
    };
    open_to: string[];                    // [INFERRED] Broader categories
    not_interested_in?: string[];         // [EXTRACTED] If anti-goals captured
    event_priorities?: string[];          // [DIRECT] If ranking question used
  };

  // ============================================
  // OFFERINGS (What they can give)
  // ============================================
  offerings: {
    can_help_with: {
      primary: string[];                  // [EXTRACTED] Specific offerings
      raw_statement?: string;             // [DIRECT] If asked directly
    };
    willing_to: WillingnessType[];        // [INFERRED] Partner | Advise | Invest | Hire | etc
    network_value?: string[];             // [INFERRED] "Connected to VCs", "Austin real estate network"
  };

  // ============================================
  // MATCHING CRITERIA
  // ============================================
  matching: {
    ideal_match: {
      description: string;                // [DIRECT] Verbatim from Ideal Connections question
      parsed_criteria: string[];          // [EXTRACTED] Structured extraction
    };
    anti_match?: {
      explicit: string[];                 // [DIRECT] If asked "who NOT to meet"
      inferred: string[];                 // [INFERRED] From other signals
    };
    energy_level?: {
      score: number;                      // [DIRECT] If slider used, or [INFERRED]
      category: EnergyLevel;              // reflective | moderate | high_energy
    };
    conversation_preference?: ConvoPref;  // [INFERRED] deep_dive | action_oriented | social
  };

  // ============================================
  // COLLABORATION STYLE (Feeds matching, not displayed)
  // ============================================
  collaboration?: {
    communication_pace?: CommPace;        // [INFERRED] quick_responder | thoughtful | slow
    decision_making?: DecisionStyle;      // [INFERRED] data_driven | intuitive | collaborative
    work_style?: WorkStyle;               // [INFERRED] independent | collaborative | leader
    dealbreakers?: string[];              // [EXTRACTED] What makes partnerships fail
  };

  // ============================================
  // PERSONAL (Conversation starters)
  // ============================================
  personal: {
    interests: string[];                  // [EXTRACTED] Non-professional interests
    background_note?: string;             // [EXTRACTED] Memorable personal detail
    fun_facts?: string[];                 // [EXTRACTED] "Past lives", unusual background
  };

  // ============================================
  // RESPONSE QUALITY (Internal scoring)
  // ============================================
  quality: {
    overall_score: number;                // 0-100, composite quality
    completeness: number;                 // % of fields populated
    depth: number;                        // Average response length / detail
    confidence: {                         // Per-section confidence
      professional: ConfidenceLevel;
      goals: ConfidenceLevel;
      offerings: ConfidenceLevel;
      matching: ConfidenceLevel;
    };
  };
}

// ============================================
// ENUMS & TYPES
// ============================================

type LocationFlex = 'local_only' | 'regional' | 'national' | 'global';

type CompanyType = 
  | 'startup_early'      // Pre-seed to Seed
  | 'startup_growth'     // Series A+
  | 'smb'                // Small/medium business
  | 'enterprise'         // Large corporation
  | 'fund'               // Investment firm
  | 'agency'             // Service provider
  | 'nonprofit'          // Non-profit org
  | 'independent';       // Solo/consultant

type SeniorityLevel = 
  | 'entry'              // 0-2 years
  | 'mid'                // 3-7 years
  | 'senior'             // 8-15 years
  | 'executive'          // C-suite, VP+
  | 'founder';           // Company founder

type WillingnessType = 
  | 'invest'             // Write checks
  | 'advise'             // Advisory roles
  | 'partner'            // Business partnerships
  | 'hire'               // Looking to hire
  | 'mentor'             // Mentorship
  | 'collaborate'        // Project collaboration
  | 'refer';             // Make introductions

type EnergyLevel = 'reflective' | 'moderate' | 'high_energy';

type ConvoPref = 'deep_dive' | 'action_oriented' | 'social' | 'mixed';

type CommPace = 'quick_responder' | 'thoughtful' | 'slow';

type DecisionStyle = 'data_driven' | 'intuitive' | 'collaborative' | 'hierarchical';

type WorkStyle = 'independent' | 'collaborative' | 'leader' | 'flexible';

type ConfidenceLevel = 'high' | 'medium' | 'low';
```

---

## Field Source Legend

Each field is tagged with its data source:

| Tag | Meaning | Example |
|-----|---------|---------|
| `[DIRECT]` | Captured directly from user input | Name, email, slider value |
| `[EXTRACTED]` | Pulled from open text response | Goals parsed from Goals question |
| `[INFERRED]` | Derived from response patterns | Seniority from language/role |
| `[GENERATED]` | Created by LLM for display | Headline, event-relevant summary |

---

## Questionnaire → Full Profile Mapping

### From Required Questions

**Goals Question** → 
- `goals.seeking.raw_statement` (verbatim)
- `goals.seeking.primary` (extracted)
- `goals.seeking.secondary` (extracted)
- `goals.open_to` (inferred)
- `event_context.current_focus` (extracted)

**Ideal Connections Question** →
- `matching.ideal_match.description` (verbatim)
- `matching.ideal_match.parsed_criteria` (extracted)

### From Optional Question Types

**Slider** →
- Direct numeric value + category mapping
- Example: Energy slider → `matching.energy_level.score` + `.category`

**Single Select** →
- Direct category value
- Example: Professional stage → `professional.seniority`

**Multi Select** →
- Array of selected values
- Example: Topics → `personal.interests` or `professional.expertise`

**Mad-Lib** →
- Structured extraction from filled blanks
- Example: Challenge mad-lib → `goals.blockers`, `event_context.current_focus`

**Ranking** →
- Ordered array
- Example: Event priorities → `goals.event_priorities`

---

## Cross-Event Accumulation

Some fields persist and improve across events:

| Field | Behavior |
|-------|----------|
| `identity.*` | Persists, updated if changed |
| `professional.current` | Persists, updated if changed |
| `professional.expertise` | Accumulates, confidence increases |
| `offerings.can_help_with` | Accumulates across events |
| `personal.interests` | Accumulates |
| `goals.*` | Event-specific, not accumulated |
| `matching.ideal_match` | Event-specific, not accumulated |

---

## Privacy Considerations

**Never Display:**
- `collaboration.*` (matching input only)
- `matching.anti_match` (never shown to others)
- `quality.*` (internal scoring)
- `meta.questionnaire_response_ids` (internal)

**Display With Consent:**
- `identity.email`, `identity.phone` (connection request only)
- `identity.linkedin_url` (if they provided it)

**Always Display (on Trading Card):**
- `identity.name`, `identity.photo_url`
- `professional.current.role`, `.company`
- `goals.seeking` (what they're looking for)
- `offerings.can_help_with` (what they offer)

---

## Validation Rules

| Field | Rule |
|-------|------|
| `goals.seeking.raw_statement` | Required, min 20 chars |
| `matching.ideal_match.description` | Required, min 20 chars |
| `identity.name` | Required |
| `identity.email` | Required, valid format |
| `professional.current.role` | Required if not pre-filled |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `EXTRACTION_STRATEGY.md` | How questionnaire responses populate this schema |
| `TRADING_CARD_DISPLAY.md` | How Full Profile maps to display layer |
| `ARCHITECTURE_OVERVIEW.md` | Where this fits in overall data flow |

---

*Last Updated: January 2025*
