### 33strategies Launch Event: Landing Page & Experience Synthesis

#### 1. Overall Landing Page Intent
- Designed for people who are *already* inclined to come; copy is allowed to be content‑heavy and “nerdy.”
- Goal is less “convince” and more “frame the experience,” help them see themselves in it, and showcase the level of thoughtfulness.
- Visuals (e.g., gold foil, animations, glowing orb) are used for magic and polish on landing pages, but not in-product where they’d be distracting.

---

### 2. RSVP Experience – Core Principles

1. **Open RSVPs ASAP**
   - Don’t wait for the “perfect” questionnaire.
   - Allow people to indicate “I’m coming” right away.
   - Communicate clearly that:
     - The core matching / curation questions are still evolving.
     - Additional questions will arrive as the event approaches.

2. **Two-Phase (Multi-Phase) Question Strategy**
   - **Phase 1 (Starter Questions / Early Taste)**
     - Short, light-weight, focused on:
       - Topic preferences (e.g., “Here are 6 topics – rank which you’d most want a conversation about.”)
       - Fun/identity questions (e.g., “Tupac vs X”, “Nora Jones vs Y”) that:
         - Give people a taste of the product’s personality.
         - Create easy, low-stakes data for on-screen visualizations and “read the room” moments.
       - Network stretch questions:
         - “Who else would you love to have in this room (in your network)?”
         - “Who don’t you know but would *love* to meet?”
           - These power: network expansion, cross-referencing connections, showing “3 people in the room know someone you want to meet,” etc.
     - Purpose:
       - Let guests experience the “magic” quickly.
       - Give us early “signal data” to think about programming and matching.
       - Enable RSVPs to open immediately.

   - **Phase 2 (Core Matching / Deep Questionnaire)**
     - Sent **a few weeks before the event** (e.g., via reminder email/text).
     - Contains the deeper, “real” questions that:
       - Drive actual seating/matching logic.
       - Shape curated conversations, breakouts, and groupings.
     - Must clearly articulate:
       - Why these questions matter.
       - How answers will be used to custom‑curate people’s experience in the room.
     - High‑touch fallback: if someone doesn’t fill it out, hosts can text/call because the room is small and personal.

3. **Continuous / Asynchronous Question Sets Over Time**
   - System-level behavior (how the product should work):
     - Concept of multiple **question sets** (e.g., “Starter Set,” “Core Event Set,” “Optional Fun Set,” etc.).
     - Question sets can be **added later**, after RSVPs are already live.
   - New guest flow:
     - When a brand-new person RSVPs *after* multiple sets exist:
       - They go through all **currently public** sets back‑to‑back (e.g., initial + core).
   - Existing guest flow:
     - If someone RSVPed earlier and already completed the initial set:
       - When a new question set is published:
         - They receive a notification (email/text) that:
           - “There’s a new question set for you to complete.”
           - Why it matters (“We’ll use this to shape the room / match you better / surface the right people.”)
         - When they return, they **only** see the *new* set, not the ones they’ve already done.
   - Future-friendly:
     - Supports “drip questions” in the weeks leading up to the event (e.g., 2–3 short questions mid-way just about topics they’re excited about).
     - Treats the questionnaire as an **ongoing relationship**, not a one‑time form.

4. **Expectation Setting Around Returning**
   - In the initial RSVP flow and on the landing page:
     - Explicitly state that:
       - “You’ll say yes today.”
       - “In 3–4 weeks, as we get closer, we’ll ask a few more questions.”
       - “Here’s *why* we’re asking them and *what* we’ll do with your answers (matching, room design, intros, etc.).”
     - Avoid making it feel like:
       - A bait‑and‑switch where you promise a rich, personalized experience but never actually follow up.
     - Instead: transparent, exciting, and obviously valuable to them.

---

### 3. “What to Expect” Section

- Needs to be surfaced prominently on the landing page.
- Should communicate:
  - **Content & Format:**
    - Types of sessions/conversations to expect.
    - Nature of the room (high‑touch, intimate, curated).
  - **Dynamic / Custom Curation:**
    - Explicitly say that:
      - “The content and conversations are custom‑curated based on what we hear from you as you RSVP.”
  - **Questionnaire Relationship:**
    - Reinforce that:
      - “We’ll ask you a few questions now and a few more later.”
      - “Your answers shape which conversations you’re part of, who you meet, and what we put on stage.”
  - **High-touch Safety Net:**
    - Even if you don’t respond to everything, the hosts know you and can reach out directly.
    - Small room = easy to bridge gaps via text/phone.

---

### 3.5. Invite Verification & Account Creation

**Core Principle:** Turn the RSVP into an authenticated relationship via lightweight account creation + verified phone number.

1. **Verification Flow (Part of RSVP)**
   - After selecting CONFIRMED/MAYBE, prompt the invitee to "verify your invite":
     - **Primary options:** SSO via Google or Apple (one-tap)
     - **Secondary option:** Email + password creation (de-emphasized, for those who prefer it)
   - Then: **Confirm your cell phone number**
     - Explain: "We'll send you event updates, additional question sets, and your matches a few days before the event via SMS."
     - Phone becomes the primary async communication channel for the event relationship.

2. **What This Unlocks**
   - Authenticated sessions (no more token-only access)
   - Persistent profile the invitee can return to and edit
   - Reliable SMS channel for drip questions, match reveals, event reminders
   - Foundation for post-event follow-up and Better Contacts activation

3. **Architectural Decision: Unified User/Profile Model**
   - The profile created for a M33T invitee is the **same schema** as a core Better Contacts user
   - New field: `accountOrigin` (enum: `'bettercontacts'` | `'m33t-invitee'`)
   - New field: `betterContactsActivated` (boolean, default `false`)
   - **For now:** Invitee UI shows nothing about Better Contacts connection
   - **Future:** Post-event email can say "activate your Better Contacts profile with one click" (since we already created it)

4. **Invitee Guest UI (In Scope)**
   - **My Profile:** View and edit your own profile card (how you appear to other guests)
   - **Guest Directory:** Browse other confirmed/maybe attendees
   - **Events Landing:** See events you're invited to as tiles; click to view full event details
   - **Return Access:** Invitee can always return via SMS link or by logging in directly

5. **What's NOT in Scope (Future Work)**
   - Any UI encouraging Better Contacts activation
   - Cross-promotion or upsell flows
   - Better Contacts dashboard access for M33T invitees

---

### 4. Attendee Profile Claiming & Display

1. **Current Situation**
   - Attendees have imported tags from Better Contacts (e.g., “entrepreneur,” “family office”).
   - These tags are **indexable** and useful for search/filter internally, but:
     - They are not emotionally powerful or “punchy” for public display as badges or mini‑bios.

2. **Desired Behavior at RSVP**
   - When someone RSVPs:
     - They can **“claim”** their contact/profile:
       - See how they currently show up on:
         - The event landing page
         - The event directory
       - Then edit/tweak:
         - Headline / label / tags (e.g., “family office” → “angel + family office + SPV”).
         - Short public-facing description / mini-bio.
     - Over time, after RSVP:
       - They should have **full control** over their profile details:
         - Add nuance (“I’m more than just ‘entrepreneur’ – also ‘community builder,’ ‘former athlete,’ etc.”).
         - Reframe how their expertise is described so others know *how* to engage them.
   - Core idea:
     - The platform preserves indexable, structured data *and* gives people a more human, narrative‑driven way to present themselves publicly.


---

### 5. Behavioral Outcomes You’re Designing For

- **For guests:**
  - Feel excited and flattered (already “in”).
  - Experience a taste of the product’s magic quickly via starter questions.
  - Understand clearly:
    - Why they’re being asked to come back later.
    - How their answers shape the event and their own outcomes.
  - Feel ownership over **how they appear** to others via profile claiming.

- **For you / 33strategies:**
  - Ability to open RSVPs immediately without waiting for perfect questionnaires.
  - Ongoing, structured data collection over time (multiple question sets).
  - Richer matching, grouping, and storytelling opportunities using:
    - Fun questions
    - Topic preferences
    - Network wish‑lists
  - A tight, high-touch loop where missing data can be filled via direct outreach.
