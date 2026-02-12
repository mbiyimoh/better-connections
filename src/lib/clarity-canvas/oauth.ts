// src/lib/clarity-canvas/oauth.ts
// OAuth utilities for Clarity Canvas (33 Strategies) integration

import crypto from 'crypto';
import { getClarityCanvasConfig } from './config';
import type { ClarityCanvasTokens } from './types';

/**
 * Generate PKCE challenge pair for OAuth
 * Returns a code_verifier and S256 code_challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  // Generate 32 random bytes, encode as base64url
  const verifier = crypto.randomBytes(32).toString('base64url');

  // Create SHA-256 hash of verifier, encode as base64url
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Build authorization URL for 33 Strategies OAuth
 */
export function getAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const config = getClarityCanvasConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:profile read:synthesis search:profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${config.issuer}/api/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<ClarityCanvasTokens> {
  const config = getClarityCanvasConfig();

  const requestBody = {
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  const response = await fetch(`${config.issuer}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_description || error.error || 'Token exchange failed'
    );
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<ClarityCanvasTokens> {
  const config = getClarityCanvasConfig();
  const response = await fetch(`${config.issuer}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_description || error.error || 'Token refresh failed'
    );
  }

  return response.json();
}
