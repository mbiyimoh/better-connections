// src/lib/clarity-canvas/index.ts
// Barrel export for Clarity Canvas module

// Configuration
export { getClarityCanvasConfig, isClarityCanvasConfigured } from './config';

// Types
export type {
  BaseSynthesis,
  PersonaSummary,
  GoalSummary,
  PainPointSummary,
  ProjectSummary,
  ClarityCanvasTokens,
  SynthesisResponse,
  ClarityCanvasError,
} from './types';

// OAuth utilities
export {
  generatePKCE,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './oauth';

// API client
export {
  getClarityClient,
  fetchAndCacheSynthesis,
  shouldRefreshSynthesis,
} from './client';

// Prompt builder
export { buildExploreSystemPrompt } from './prompts';
