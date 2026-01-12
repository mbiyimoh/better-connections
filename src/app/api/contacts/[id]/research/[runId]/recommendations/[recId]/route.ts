import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { updateRecommendationSchema } from '@/lib/research/schemas';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string; recId: string }> }
) {
  try {
    const { id, runId, recId } = await params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const parseResult = updateRecommendationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership through research run
    const researchRun = await prisma.contactResearchRun.findFirst({
      where: {
        id: runId,
        contactId: id,
        userId: user.id,
      },
    });

    if (!researchRun) {
      return NextResponse.json(
        { error: 'Research run not found' },
        { status: 404 }
      );
    }

    // Get and update recommendation
    const recommendation = await prisma.contactRecommendation.findFirst({
      where: {
        id: recId,
        researchRunId: runId,
      },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    const updateData: Prisma.ContactRecommendationUpdateInput = {};
    if (parseResult.data.status) {
      updateData.status = parseResult.data.status;
      updateData.reviewedAt = new Date();
    }
    if (parseResult.data.editedValue !== undefined) {
      updateData.editedValue = parseResult.data.editedValue;
    }

    const updated = await prisma.contactRecommendation.update({
      where: { id: recId },
      data: updateData,
    });

    return NextResponse.json(
      {
        id: updated.id,
        status: updated.status,
        editedValue: updated.editedValue,
        reviewedAt: updated.reviewedAt?.toISOString() || null,
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('Update recommendation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
