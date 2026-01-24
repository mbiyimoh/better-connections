# Social Media Profile Enrichment

**Slug:** feat-social-media-enrichment
**Author:** Claude Code
**Date:** 2026-01-23
**Related:** Contact Deep Research system (`src/lib/research/`)

---

## 1) Intent & Assumptions

**Task brief:** Enhance the existing research enrichment system to discover, match, and extract information from social media profiles (Twitter/X, Instagram, GitHub, etc.) for contacts. The system should suggest social handles with confidence scores, extract profile bios and recent posts when profiles are public, and integrate seamlessly with the existing Tavily-based research pipeline without adding heavy new infrastructure.

**Assumptions:**
- The existing Tavily search + GPT-4o pipeline is the foundation; we're tuning/extending it, not replacing it
- Social media handles need confidence scores because automated matching is imperfect
- Users should manually verify suggested profiles before applying them
- Only publicly accessible profile data should be scraped (no auth bypass)
- LinkedIn extraction already works well; we're adding Twitter/X, Instagram, GitHub, etc.
- Budget-conscious: prefer solutions with minimal new API costs
- Single-user product (no compliance complexity from multi-tenancy)

**Out of scope:**
- OAuth integration with social platforms (no "connect your Twitter" flows)
- Private/protected profile access
- Real-time social media monitoring or feed tracking
- Full profile scraping for non-public accounts
- Building a proprietary social data warehouse
- Enterprise enrichment service integration (FullContact, ZoomInfo, etc.)
- Facebook profile discovery (heavily restricted, low ROI)

---

## 2) Pre-reading Log

- `src/lib/research/orchestrator.ts`: 4-stage pipeline (search → LinkedIn extract → synthesis → recommendations). Supports `onProgress` callbacks for real-time status. Tavily search with advanced depth, 10 results, 0.2 min relevance score.
- `src/lib/research/prompts.ts`: Synthesis and recommendation prompts. Key pattern: "NEVER fabricate information", data preservation on UPDATE actions.
- `src/lib/research/types.ts`: `ContactContext` interface with current fields. `FocusArea` enum: professional, expertise, interests, news. Only `linkedinUrl` exists for social.
- `src/lib/research/tavilyClient.ts`: `searchTavily()` and `extractLinkedInProfile()` functions. Supports `include_domains` filtering. LinkedIn extract uses `extract_depth: "advanced"`.
- `src/lib/research/queryBuilder.ts`: Builds Tavily queries from contact + focus areas. 400 char limit enforced.
- `prisma/schema.prisma`: Contact model has `linkedinUrl` and `websiteUrl` only. No Twitter/GitHub/Instagram fields exist yet.
- `src/app/api/contacts/[id]/research/route.ts`: POST initiates research, GET fetches run with recommendations.
- `src/components/research/RecommendationCard.tsx`: Shows proposed changes with confidence, source URLs, approve/reject/edit actions.

---

## 3) Codebase Map

**Primary components/modules:**
- `src/lib/research/orchestrator.ts` - Main research execution pipeline (entry point for changes)
- `src/lib/research/prompts.ts` - GPT-4o prompts for synthesis and recommendations
- `src/lib/research/tavilyClient.ts` - Tavily API integration (search + extract)
- `src/lib/research/queryBuilder.ts` - Search query construction
- `src/lib/research/types.ts` - TypeScript interfaces for research data flow
- `src/lib/research/schemas.ts` - Zod schemas for structured GPT outputs
- `prisma/schema.prisma` - Database models (Contact, ContactRecommendation)

**Shared dependencies:**
- Tavily API (`TAVILY_API_KEY` env var)
- OpenAI GPT-4o-mini via Vercel AI SDK
- Prisma ORM for database operations
- Design system colors for confidence badges

**Data flow:**
```
User selects contact + focus areas
  → buildSearchQuery() constructs Tavily query
  → searchTavily() gets 10 web results
  → extractLinkedInProfile() (if URL exists)
  → GPT-4o synthesizes findings into report
  → GPT-4o generates recommendations
  → Filter by confidence (≥0.5)
  → User reviews/approves/edits
  → Apply changes to Contact record
```

**Feature flags/config:**
- `MIN_CONFIDENCE_THRESHOLD = 0.5` in orchestrator.ts
- `TAVILY_MAX_QUERY_LENGTH = 400` in queryBuilder.ts
- Focus areas defined in types.ts

**Potential blast radius:**
- Contact model schema (new social URL fields)
- Research orchestrator (new social media search stage)
- Prompts (enhanced to handle social data)
- Recommendation schema (new fieldNames for social handles)
- UI: RecommendationCard needs confidence visualization for social matches

---

## 4) Root Cause Analysis

N/A - This is a new feature, not a bug fix.

---

## 5) Research Findings

### Tavily Capabilities for Social Media

**Profile Discovery (via domain filtering):**
- Tavily supports `include_domains` parameter to target specific platforms
- LinkedIn/GitHub: Excellent discoverability (well-indexed, public profiles)
- Twitter/X: Good discoverability, but content extraction challenging
- Instagram: Moderate discoverability, heavy anti-bot protection

**Content Extraction:**
- Tavily Extract API works well for static pages (GitHub profiles, some LinkedIn)
- Struggles with JavaScript-heavy SPAs (Twitter/X, Instagram)
- LinkedIn has specialized handling in current implementation

### Potential Solutions

#### Option 1: Tavily-Native Enhancement (Recommended)

**Description:** Extend the existing Tavily search to include social platform domain filtering and parse social URLs from search results.

**Implementation approach:**
1. Add a "social" focus area that triggers platform-specific searches
2. Query Tavily with `include_domains: ["twitter.com", "x.com", "github.com", "instagram.com"]`
3. Parse profile URLs from results
4. Use GPT-4o to match profiles to contacts with confidence scoring
5. For GitHub (fully public), use Tavily Extract to pull bio/repos
6. For Twitter/Instagram, rely on search snippets only (no direct extraction)

**Pros:**
- No new dependencies or APIs
- Leverages existing Tavily subscription (cost: ~$1-2 extra per research run)
- 1-2 week implementation
- Clean integration with existing pipeline
- Works well for LinkedIn + GitHub (highest value platforms)

**Cons:**
- Limited extraction for Twitter/Instagram (search snippets only, not full bios)
- No access to recent posts for most platforms
- Confidence scoring relies on GPT inference, not direct attribute matching
- 50-65% expected enrichment rate for social profiles

#### Option 2: Hybrid with Specialized API (ScrapeCreators)

**Description:** Use Tavily for discovery, then call ScrapeCreators API for profile extraction on matched URLs.

**Implementation approach:**
1. Tavily discovers potential social profile URLs
2. GPT-4o scores confidence for each match
3. For high-confidence matches (≥0.7), call ScrapeCreators to extract full profile
4. Parse bio, recent posts, follower counts
5. Generate richer recommendations

**Pros:**
- Full profile extraction for all major platforms
- Access to recent posts and engagement data
- Higher-quality enrichment data
- Professional service handles anti-bot measures

**Cons:**
- Adds new dependency and API cost ($300-600/month for moderate usage)
- 3-4 week implementation
- Another vendor to manage
- Over-engineered for initial launch

#### Option 3: Open-Source Social Analyzer (Self-Hosted)

**Description:** Deploy the open-source Social Analyzer tool for username-based profile discovery across 1000+ platforms.

**Pros:**
- No API costs (self-hosted)
- Massive platform coverage (1000+ sites)
- Built-in confidence scoring (0-100 scale)
- High-volume capable

**Cons:**
- Requires DevOps to deploy and maintain
- May trigger anti-bot measures at scale
- 4-6 week implementation
- Overkill for current needs

### Recommendation

**Start with Option 1 (Tavily-Native)** for these reasons:

1. **Lightweight:** No new infrastructure, just prompt/query tuning
2. **Cost-effective:** Uses existing Tavily subscription
3. **Fast to ship:** 1-2 weeks vs. 4+ weeks for alternatives
4. **Good enough:** LinkedIn + GitHub cover most professional contacts
5. **Reversible:** Can always add ScrapeCreators later if needed

**Key insight from research:** The prompt engineering is the critical piece. The system already finds social profiles in search results but doesn't know to extract and recommend them. By adding social handle fields and tuning prompts to recognize social URLs, we can get significant value without new APIs.

---

## 6) Clarifications Needed

1. **Priority platforms:** Which social platforms should we prioritize?
   - **Suggested:** GitHub (technical contacts), Twitter/X (thought leaders), Instagram (creators/marketers)
   - LinkedIn already handled
   >> agreed

2. **Confidence threshold for social matches:** Should we use the same 0.5 threshold as other recommendations, or be stricter for social (e.g., 0.65)?
   - **Suggested:** 0.65 for social handles (higher bar since wrong match is more visible/awkward)
   >> I agree with your suggestion

3. **New database fields:** Should we add individual fields per platform or a single JSON field?
   - **Option A:** `twitterUrl`, `githubUrl`, `instagramUrl` (explicit, queryable)
   - **Option B:** `socialProfiles: Json` (flexible, but harder to query)
   - **Suggested:** Option A for the top 3 platforms
   >> I agree with your suggestion

4. **Profile content extraction:** How deep should we go?
   - **Option A:** Just handles (URL only) - simplest
   - **Option B:** Handle + bio - moderate effort
   - **Option C:** Handle + bio + recent posts - requires specialized API
   - **Suggested:** Option B for GitHub (Tavily Extract works), Option A for Twitter/Instagram initially
   >> option B for all without killing ourselves if we cant get bios from X and IG

5. **UI for social handle recommendations:** Should these show differently from text field recommendations?
   - Profile URL recommendations could show a preview/verification link
   - Suggested: Add "Verify Profile" button that opens URL in new tab
   >> I agree with your suggestion but say "Verify Profile Match"

6. **"Social" focus area:** Should this be a new checkbox in ResearchOptionsModal, or automatically included in existing research?
   - **Option A:** New "Social Profiles" focus area (user opt-in)
   - **Option B:** Always attempt social discovery as part of professional/expertise research
   - **Suggested:** Option A initially to measure interest and success rate
   >> I agree with your suggestion

---

## 7) Proposed Implementation Approach

### Phase 1: Schema & Data Model (Day 1)

Add new Contact fields:
```prisma
model Contact {
  // ... existing fields
  twitterUrl    String?
  githubUrl     String?
  instagramUrl  String?
}
```

Add to recommendation fieldName enum in prompts/schemas.

### Phase 2: Discovery Enhancement (Days 2-3)

1. Add "social" to `FocusArea` type
2. Create `buildSocialSearchQueries()` function that generates platform-specific queries:
   ```typescript
   // For each platform, query with name + company + site filter
   queries = [
     { query: `"${name}" ${company} site:twitter.com OR site:x.com`, platform: 'twitter' },
     { query: `"${name}" ${company} site:github.com`, platform: 'github' },
     { query: `"${name}" ${company} site:instagram.com`, platform: 'instagram' },
   ]
   ```
3. Execute queries in parallel with Tavily
4. Deduplicate and score results

### Phase 3: Prompt Engineering (Days 4-5)

Update prompts to:
1. Recognize social profile URLs in search results
2. Match profiles to contacts with confidence scoring
3. Generate social handle recommendations with the new fieldNames
4. Include clear "verify this profile" guidance in reasoning

### Phase 4: UI Updates (Days 6-7)

1. Add "Social Profiles" checkbox to ResearchOptionsModal
2. Update RecommendationCard to:
   - Show social platform icon for handle recommendations
   - Include "Verify Profile" external link
   - Display confidence with appropriate threshold messaging

### Phase 5: GitHub Bio Extraction (Optional, Days 8-9)

For GitHub profiles specifically (fully public):
1. Use Tavily Extract to pull profile content
2. Parse bio, location, company, repositories
3. Generate expertise/interests recommendations from GitHub activity

---

## 8) Success Criteria

1. **Discovery rate:** Find at least one social profile for 40%+ of contacts researched
2. **Precision:** <10% false positive rate on high-confidence (≥0.7) matches
3. **User experience:** Clear confidence indication and easy verification flow
4. **Performance:** Social discovery adds <5 seconds to research time
5. **Cost:** <$2 additional Tavily cost per research run

---

## 9) Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low match rate for common names | High | Medium | Require company/title match for confidence ≥0.65 |
| False positive social matches | Medium | High | Higher confidence threshold (0.65), "Verify" links |
| Tavily rate limits | Low | Low | Already within limits, social adds ~3 queries |
| User confusion about confidence | Medium | Medium | Clear UI badges, explanation tooltips |
| Scope creep to full social extraction | Medium | Medium | Start with handles only, defer posts/bio to Phase 2 |
