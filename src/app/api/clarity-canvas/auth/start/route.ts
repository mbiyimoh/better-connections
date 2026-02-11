// src/app/api/clarity-canvas/auth/start/route.ts
// Initiate OAuth flow with 33 Strategies

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { generatePKCE, getAuthorizationUrl } from '@/lib/clarity-canvas/oauth';
import { isClarityCanvasConfigured } from '@/lib/clarity-canvas/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Check if Clarity Canvas is configured
  if (!isClarityCanvasConfigured()) {
    return NextResponse.json(
      { error: 'Clarity Canvas integration is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Require auth
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Generate PKCE
  const { verifier, challenge } = generatePKCE();

  // Generate state for CSRF protection
  const state = nanoid(32);

  // Build redirect URI
  const redirectUri = new URL(
    '/api/auth/callback/clarity-canvas',
    process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  ).toString();

  // Build authorization URL
  const authUrl = getAuthorizationUrl(redirectUri, state, challenge);

  // Store state and verifier in secure cookies
  const cookieStore = await cookies();

  cookieStore.set('clarity_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  cookieStore.set('clarity_code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return NextResponse.json({ authUrl });
}
