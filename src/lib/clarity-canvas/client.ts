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
  console.log('[clarity-canvas] getClarityClient called for userId:', userId);

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

  console.log('[clarity-canvas] User lookup result:', {
    found: !!user,
    connected: user?.clarityCanvasConnected,
    hasAccessToken: !!user?.clarityCanvasAccessToken,
    hasRefreshToken: !!user?.clarityCanvasRefreshToken,
    tokenExpiresAt: user?.clarityCanvasTokenExpiresAt,
  });

  if (!user?.clarityCanvasConnected || !user.clarityCanvasAccessToken) {
    console.log('[clarity-canvas] User not connected or missing token');
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
  console.log('[clarity-canvas] API URL configured as:', config.apiUrl);

  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${config.apiUrl}${endpoint}`;
    console.log('[clarity-canvas] Fetching:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('[clarity-canvas] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('[clarity-canvas] API error response:', errorText);
      throw new Error(`Companion API error: ${response.status} - ${errorText}`);
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
 * Fetch and cache synthesis for a user
 * Returns the synthesis or null if fetch fails
 */
export async function fetchAndCacheSynthesis(
  userId: string
): Promise<BaseSynthesis | null> {
  console.log('[clarity-canvas] fetchAndCacheSynthesis called for userId:', userId);

  const client = await getClarityClient(userId);
  if (!client) {
    console.log('[clarity-canvas] getClarityClient returned null - user not connected or no token');
    return null;
  }

  console.log('[clarity-canvas] Client created, fetching synthesis...');

  try {
    const synthesis = await client.getBaseSynthesis();
    console.log('[clarity-canvas] Synthesis fetched successfully:', {
      hasIdentity: !!synthesis?.identity,
      goalsCount: synthesis?.goals?.length || 0,
      personasCount: synthesis?.personas?.length || 0,
    });

    // Cache in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        clarityCanvasSynthesis: synthesis as object,
        clarityCanvasSyncedAt: new Date(),
      },
    });

    console.log('[clarity-canvas] Synthesis cached in database');
    return synthesis;
  } catch (error) {
    console.error('[clarity-canvas] Failed to fetch synthesis:', error);
    return null;
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
