// src/app/api/clarity-canvas/synthesis/route.ts
// Get or refresh cached synthesis

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { fetchAndCacheSynthesis } from '@/lib/clarity-canvas/client';
import type { BaseSynthesis, SynthesisResponse } from '@/lib/clarity-canvas/types';

export async function GET(request: NextRequest) {
  // Require auth
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    // Look up Prisma user by email (Supabase ID != Prisma ID)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        clarityCanvasConnected: true,
        clarityCanvasSynthesis: true,
        clarityCanvasSyncedAt: true,
      },
    });

    if (!dbUser?.clarityCanvasConnected) {
      const response: SynthesisResponse = {
        synthesis: null,
        syncedAt: null,
        connected: false,
      };
      return NextResponse.json(response);
    }

    let synthesis = dbUser.clarityCanvasSynthesis as BaseSynthesis | null;
    let syncedAt = dbUser.clarityCanvasSyncedAt;

    // Refresh if requested or no cached data
    if (forceRefresh || !synthesis) {
      const freshSynthesis = await fetchAndCacheSynthesis(dbUser.id);
      if (freshSynthesis) {
        synthesis = freshSynthesis;
        syncedAt = new Date();
      }
    }

    const response: SynthesisResponse = {
      synthesis,
      syncedAt: syncedAt?.toISOString() || null,
      connected: true,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[clarity-canvas] Synthesis fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synthesis' },
      { status: 500 }
    );
  }
}
