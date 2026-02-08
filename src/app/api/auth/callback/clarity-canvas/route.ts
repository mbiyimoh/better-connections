// src/app/api/auth/callback/clarity-canvas/route.ts
// Handle OAuth callback from 33 Strategies

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/clarity-canvas/oauth';
import { fetchAndCacheSynthesis } from '@/lib/clarity-canvas/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = request.nextUrl.origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial
  if (error) {
    console.log('[clarity-canvas] OAuth denied:', error);
    return NextResponse.redirect(new URL('/settings?error=access_denied', appUrl));
  }

  // Validate state (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get('clarity_oauth_state')?.value;
  const codeVerifier = cookieStore.get('clarity_code_verifier')?.value;

  if (!state || state !== storedState || !codeVerifier) {
    console.error('[clarity-canvas] Invalid state or missing verifier');
    return NextResponse.redirect(new URL('/settings?error=invalid_state', appUrl));
  }

  if (!code) {
    console.error('[clarity-canvas] No authorization code received');
    return NextResponse.redirect(new URL('/settings?error=no_code', appUrl));
  }

  // Get current user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl));
  }

  try {
    // Exchange code for tokens
    const redirectUri = new URL(
      '/api/auth/callback/clarity-canvas',
      appUrl
    ).toString();

    const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier);

    // Store tokens in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        clarityCanvasAccessToken: tokens.access_token,
        clarityCanvasRefreshToken: tokens.refresh_token,
        clarityCanvasTokenExpiresAt: new Date(
          Date.now() + tokens.expires_in * 1000
        ),
        clarityCanvasConnected: true,
        clarityCanvasConnectedAt: new Date(),
      },
    });

    // Fetch and cache synthesis immediately
    await fetchAndCacheSynthesis(user.id);

    // Clear OAuth cookies and redirect to settings with success flag
    const response = NextResponse.redirect(
      new URL('/settings?clarity_connected=true', appUrl)
    );
    response.cookies.delete('clarity_oauth_state');
    response.cookies.delete('clarity_code_verifier');

    return response;
  } catch (error) {
    console.error('[clarity-canvas] OAuth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=token_exchange_failed', appUrl)
    );
  }
}
