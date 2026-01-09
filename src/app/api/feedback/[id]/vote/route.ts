import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/feedback/[id]/vote - Toggle vote on feedback
 *
 * Supports both authenticated users (userId) and anonymous visitors (visitorId).
 * If a vote exists, it's removed. If no vote exists, one is created.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: feedbackId } = await params;

    // Verify feedback exists
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Get current user (optional for voting)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only create visitor ID for anonymous users
    const visitorId = user ? null : await getOrCreateVisitorId();

    // Check for existing vote using findFirst (handles nullable composite keys)
    const existingVote = await prisma.feedbackVote.findFirst({
      where: {
        feedbackId,
        ...(user
          ? { userId: user.id }
          : { visitorId, userId: null }),
      },
    });

    let hasVoted: boolean;
    let newUpvoteCount: number;

    if (existingVote) {
      // Remove vote
      await prisma.$transaction([
        prisma.feedbackVote.delete({ where: { id: existingVote.id } }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvoteCount: { decrement: 1 } },
        }),
      ]);
      hasVoted = false;
      newUpvoteCount = feedback.upvoteCount - 1;
    } else {
      // Add vote
      await prisma.$transaction([
        prisma.feedbackVote.create({
          data: {
            feedbackId,
            userId: user?.id ?? null,
            visitorId: user ? null : visitorId,
          },
        }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvoteCount: { increment: 1 } },
        }),
      ]);
      hasVoted = true;
      newUpvoteCount = feedback.upvoteCount + 1;
    }

    return NextResponse.json({
      hasVoted,
      upvoteCount: newUpvoteCount,
    });
  } catch (error) {
    console.error('Error toggling vote:', error);
    return NextResponse.json(
      { error: 'Failed to toggle vote' },
      { status: 500 }
    );
  }
}
