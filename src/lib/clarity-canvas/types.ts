// src/lib/clarity-canvas/types.ts
// TypeScript types for Clarity Canvas (33 Strategies) integration
// Mirrors the enriched BaseSynthesis from web-decks/lib/companion/types.ts

/**
 * Base synthesis returned from the Companion API
 * Contains ~1500-2000 tokens of comprehensive user context
 * Covers ALL 6 sections of Clarity Canvas:
 * - Individual (background, thinking, working, values)
 * - Role (responsibilities, scope, constraints)
 * - Organization (fundamentals, product, market, financials)
 * - Goals (immediate, medium, metrics, strategy)
 * - Network (stakeholders, team, support)
 * - Projects (active, upcoming, completed)
 */
export interface BaseSynthesis {
  // -------------------------------------------------------------------------
  // INDIVIDUAL SECTION - Who is this person?
  // -------------------------------------------------------------------------

  // Core identity (from 'individual.background' + 'role.responsibilities')
  identity: {
    name: string;
    role: string;
    company: string;
    industry: string;
    companyStage: 'startup' | 'growth' | 'enterprise' | 'unknown';
  };

  // Background & expertise (from 'individual.background')
  background: {
    careerPath: string | null;
    expertise: string[];
    yearsExperience: number | null;
    education: string | null;
  };

  // Thinking style (from 'individual.thinking')
  thinkingStyle: {
    decisionMaking: string | null;
    problemSolving: string | null;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' | null;
    learningStyle: string | null;
  };

  // Working style (from 'individual.working')
  workingStyle: {
    collaborationPreference: string | null;
    communicationStyle: string | null;
    workPace: string | null;
    autonomyLevel: string | null;
  };

  // Values & motivations (from 'individual.values')
  values: {
    coreValues: string[];
    motivations: string[];
    personalMission: string | null;
    passions: string[];
  };

  // -------------------------------------------------------------------------
  // ROLE SECTION - What do they do?
  // -------------------------------------------------------------------------

  // Role scope & authority (from 'role.scope')
  roleScope: {
    decisionAuthority: string | null;
    budgetControl: string | null;
    strategicInput: string | null;
    teamSize: number | null;
  };

  // Role constraints & challenges (from 'role.constraints')
  painPoints: PainPointSummary[];

  // -------------------------------------------------------------------------
  // ORGANIZATION SECTION - Where do they work?
  // -------------------------------------------------------------------------

  // Product & strategy (from 'organization.product')
  product: {
    coreProduct: string | null;
    valueProposition: string | null;
    businessModel: string | null;
    competitiveAdvantage: string | null;
  };

  // Market position (from 'organization.market')
  market: {
    targetMarket: string | null;
    customerSegments: string[];
    marketSize: string | null;
    competitiveLandscape: string | null;
  };

  // Financial context (from 'organization.financials')
  financials: {
    fundingStatus: string | null;
    runway: string | null;
    revenueStage: string | null;
  };

  // -------------------------------------------------------------------------
  // GOALS SECTION - What are they trying to achieve?
  // -------------------------------------------------------------------------

  // Goals summary (from 'goals.immediate' + 'goals.medium')
  goals: GoalSummary[];

  // Success metrics (from 'goals.metrics')
  successMetrics: {
    northStar: string | null;
    kpis: string[];
    successDefinition: string | null;
  };

  // Strategic direction (from 'goals.strategy')
  strategicPriorities: string[];

  // Decision dynamics (from 'individual.thinking' + derived)
  decisionDynamics: {
    decisionMakers: string[];
    buyingProcess: string;
    keyInfluencers: string[];
  };

  // -------------------------------------------------------------------------
  // NETWORK SECTION - Who do they work with?
  // -------------------------------------------------------------------------

  // Team & collaborators (from 'network.team')
  team: {
    directReports: string[];
    keyCollaborators: string[];
    crossFunctional: string[];
  };

  // Support network (from 'network.support')
  supportNetwork: {
    advisors: string[];
    mentors: string[];
    peerNetwork: string | null;
    helpNeeded: string[];
  };

  // -------------------------------------------------------------------------
  // PROJECTS SECTION - What are they working on?
  // -------------------------------------------------------------------------

  // Active & planned projects (from 'projects.active' + 'projects.upcoming')
  activeProjects: ProjectSummary[];

  // Recent completions & learnings (from 'projects.completed')
  recentAccomplishments: {
    recentWins: string[];
    lessonsLearned: string[];
  };

  // -------------------------------------------------------------------------
  // PERSONAS - Customer understanding (from Persona model)
  // -------------------------------------------------------------------------
  personas: PersonaSummary[];

  // -------------------------------------------------------------------------
  // METADATA
  // -------------------------------------------------------------------------
  _meta: {
    tokenCount: number;
    version: string;
    generatedAt: string;
    profileCompleteness: number; // 0-100%
  };
}

export interface PersonaSummary {
  name: string;
  role: string;
  primaryGoal: string;
  topFrustration: string;
}

export interface GoalSummary {
  goal: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string; // e.g., 'now', 'this week', 'quarterly', 'annual'
}

export interface PainPointSummary {
  pain: string;
  severity: 'critical' | 'significant' | 'moderate';
  category: string;
}

export interface ProjectSummary {
  name: string;
  status: 'active' | 'planned' | 'completed';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * OAuth token response from 33 Strategies
 */
export interface ClarityCanvasTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/**
 * Synthesis API response shape
 */
export interface SynthesisResponse {
  synthesis: BaseSynthesis | null;
  syncedAt: string | null;
  connected: boolean;
  error?: ClarityCanvasError;
}

/**
 * Error types for Clarity Canvas operations
 */
export type ClarityCanvasError =
  | 'unauthorized'
  | 'token_expired'
  | 'api_error'
  | 'network_error'
  | 'invalid_state'
  | 'no_profile';
