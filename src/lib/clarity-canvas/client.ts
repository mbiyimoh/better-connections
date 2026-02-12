// src/lib/clarity-canvas/client.ts
// Authenticated API client for Clarity Canvas Companion API

import { refreshAccessToken } from './oauth';
import { getClarityCanvasConfig } from './config';
import { prisma } from '@/lib/db';
import type { BaseSynthesis } from './types';

interface ClarityCanvasClient {
  getBaseSynthesis(): Promise<BaseSynthesis>;
}

/**
 * Create a Clarity Canvas API client for a user
 * Handles token refresh automatically
 */
export async function getClarityClient(
  userId: string
): Promise<ClarityCanvasClient | null> {
  // Fetch user's tokens
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clarityCanvasAccessToken: true,
      clarityCanvasRefreshToken: true,
      clarityCanvasTokenExpiresAt: true,
      clarityCanvasConnected: true,
    },
  });

  if (!user?.clarityCanvasConnected || !user.clarityCanvasAccessToken) {
    return null;
  }

  // Check if token needs refresh (with 5 min buffer)
  let accessToken = user.clarityCanvasAccessToken;
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (
    user.clarityCanvasTokenExpiresAt &&
    new Date(user.clarityCanvasTokenExpiresAt.getTime() - bufferMs) < new Date()
  ) {
    try {
      if (!user.clarityCanvasRefreshToken) {
        throw new Error('No refresh token available');
      }

      const tokens = await refreshAccessToken(user.clarityCanvasRefreshToken);
      accessToken = tokens.access_token;

      // Update stored tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          clarityCanvasAccessToken: tokens.access_token,
          clarityCanvasRefreshToken: tokens.refresh_token,
          clarityCanvasTokenExpiresAt: new Date(
            Date.now() + tokens.expires_in * 1000
          ),
        },
      });
    } catch (error) {
      console.error('[clarity-canvas] Token refresh failed:', error);
      // Mark as disconnected if refresh fails
      await prisma.user.update({
        where: { id: userId },
        data: { clarityCanvasConnected: false },
      });
      return null;
    }
  }

  // Create authenticated fetch helper
  const config = getClarityCanvasConfig();

  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${config.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');

      // Parse error for specific handling
      let errorMessage = `Companion API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error === 'No profile found for user') {
          errorMessage = 'NO_PROFILE';
        }
      } catch {
        // Not JSON, use generic message
      }

      throw new Error(errorMessage);
    }

    return response.json();
  };

  return {
    async getBaseSynthesis(): Promise<BaseSynthesis> {
      const { synthesis } = await authFetch('/synthesis/base');
      return synthesis;
    },
  };
}

/**
 * Result type for synthesis fetch
 */
export type SynthesisFetchResult =
  | { success: true; synthesis: BaseSynthesis }
  | { success: false; error: 'NO_PROFILE' | 'NOT_CONNECTED' | 'FETCH_FAILED' };

/**
 * Fetch and cache synthesis for a user
 * Returns result object with synthesis or error type
 */
export async function fetchAndCacheSynthesis(
  userId: string
): Promise<SynthesisFetchResult> {
  const client = await getClarityClient(userId);
  if (!client) {
    return { success: false, error: 'NOT_CONNECTED' };
  }

  try {
    const synthesis = await client.getBaseSynthesis();

    // Cache in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        clarityCanvasSynthesis: synthesis as object,
        clarityCanvasSyncedAt: new Date(),
      },
    });

    return { success: true, synthesis };
  } catch (error) {
    // Check for specific error types
    if (error instanceof Error && error.message === 'NO_PROFILE') {
      return { success: false, error: 'NO_PROFILE' };
    }
    return { success: false, error: 'FETCH_FAILED' };
  }
}

/**
 * Check if synthesis should be refreshed (>24h old)
 */
export function shouldRefreshSynthesis(syncedAt: Date | null): boolean {
  if (!syncedAt) return true;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - syncedAt.getTime() > twentyFourHours;
}
