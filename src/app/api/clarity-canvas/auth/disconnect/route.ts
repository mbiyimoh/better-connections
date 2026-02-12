// src/app/api/clarity-canvas/auth/disconnect/route.ts
// Disconnect Clarity Canvas connection

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function POST() {
  // Require auth
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Look up Prisma user by email (Supabase ID != Prisma ID)
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // Clear all Clarity Canvas data
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        clarityCanvasConnected: false,
        clarityCanvasAccessToken: null,
        clarityCanvasRefreshToken: null,
        clarityCanvasTokenExpiresAt: null,
        clarityCanvasSynthesis: Prisma.DbNull,
        clarityCanvasSyncedAt: null,
        // Keep clarityCanvasConnectedAt for historical record
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[clarity-canvas] Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
