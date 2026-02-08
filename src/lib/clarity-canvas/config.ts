// src/lib/clarity-canvas/config.ts
// Configuration and environment variable validation for Clarity Canvas integration

/**
 * Get a required environment variable or throw a clear error.
 * This provides better error messages than non-null assertions.
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env file and ensure Clarity Canvas is properly configured.`
    );
  }
  return value;
}

/**
 * Get Clarity Canvas configuration lazily.
 * Configuration is validated on first access, not at module load time,
 * to avoid breaking builds when env vars aren't set.
 */
export function getClarityCanvasConfig() {
  return {
    issuer: getRequiredEnv('CLARITY_CANVAS_ISSUER'),
    clientId: getRequiredEnv('CLARITY_CANVAS_CLIENT_ID'),
    clientSecret: getRequiredEnv('CLARITY_CANVAS_CLIENT_SECRET'),
    apiUrl: getRequiredEnv('CLARITY_CANVAS_API_URL'),
  };
}

/**
 * Check if Clarity Canvas is configured (env vars present).
 * Returns false instead of throwing if not configured.
 */
export function isClarityCanvasConfigured(): boolean {
  return !!(
    process.env.CLARITY_CANVAS_ISSUER &&
    process.env.CLARITY_CANVAS_CLIENT_ID &&
    process.env.CLARITY_CANVAS_CLIENT_SECRET &&
    process.env.CLARITY_CANVAS_API_URL
  );
}
