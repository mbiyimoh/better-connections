// src/lib/clarity-canvas/types.ts
// TypeScript types for Clarity Canvas (33 Strategies) integration

/**
 * Base synthesis returned from the Companion API
 * Contains ~800-1000 tokens of user context
 */
export interface BaseSynthesis {
  identity: {
    name: string;
    role: string; // from role.responsibilities.title
    company: string; // from organization.fundamentals.company_name
    industry: string; // from organization.fundamentals.org_industry
    companyStage: 'startup' | 'growth' | 'enterprise' | 'unknown';
  };

  personas: PersonaSummary[]; // Up to 3 customer personas
  goals: GoalSummary[]; // Up to 5 goals (3 immediate + 2 medium-term)
  painPoints: PainPointSummary[]; // Up to 3 pain points

  decisionDynamics: {
    decisionMakers: string[];
    buyingProcess: string; // from individual.thinking.decision_making
    keyInfluencers: string[]; // from network.stakeholders
  };

  strategicPriorities: string[]; // Up to 5 priorities from goals.strategy
  activeProjects: ProjectSummary[]; // Up to 4 projects

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
  timeframe: 'immediate' | 'medium-term' | 'long-term';
}

export interface PainPointSummary {
  pain: string;
  severity: 'critical' | 'moderate' | 'minor';
  category: string;
}

export interface ProjectSummary {
  name: string;
  status: 'active' | 'planned';
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
}

/**
 * Error types for Clarity Canvas operations
 */
export type ClarityCanvasError =
  | 'unauthorized'
  | 'token_expired'
  | 'api_error'
  | 'network_error'
  | 'invalid_state';
