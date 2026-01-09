import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { feedbackUpdateSchema } from '@/lib/validations/feedback';
import { deleteFeedbackAttachment } from '@/lib/storage/supabase-storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/feedback/[id] - Get single feedback item
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get current user (optional for viewing)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only create visitor ID for anonymous users
    const visitorId = user ? null : await getOrCreateVisitorId();

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { id: true, fileName: true, url: true, mimeType: true, fileSize: true } },
        votes: {
          where: user
            ? { userId: user.id }
            : { visitorId },
          select: { id: true },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Transform to include hasVoted flag
    const feedbackWithVoteStatus = {
      ...feedback,
      hasVoted: feedback.votes.length > 0,
      votes: undefined,
    };

    return NextResponse.json(feedbackWithVoteStatus);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedback/[id] - Update feedback status (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Prisma user to check role
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { role: true },
    });

    if (!user || user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const parseResult = feedbackUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { status } = parseResult.data;

    // Check if feedback exists
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Update status
    const updated = await prisma.feedback.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true } },
        attachments: { select: { id: true, fileName: true, url: true, mimeType: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback/[id] - Delete feedback (owner or admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Prisma user to check role
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { role: true },
    });

    const { id } = await params;

    // Check if feedback exists and user has permission
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Only owner or admin can delete
    if (feedback.userId !== supabaseUser.id && user?.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete files from Supabase Storage first
    for (const attachment of feedback.attachments) {
      await deleteFeedbackAttachment(attachment.url).catch(err =>
        console.error('Failed to delete attachment file:', err)
      );
    }

    // Delete feedback (attachments cascade delete via Prisma)
    await prisma.feedback.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
