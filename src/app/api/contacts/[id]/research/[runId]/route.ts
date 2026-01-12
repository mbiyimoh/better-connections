import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const researchRun = await prisma.contactResearchRun.findFirst({
      where: {
        id: runId,
        contactId: id,
        userId: user.id,
      },
      include: {
        recommendations: {
          orderBy: { confidence: 'desc' },
        },
      },
    });

    if (!researchRun) {
      return NextResponse.json(
        { error: 'Research run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(researchRun, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Get research run error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
