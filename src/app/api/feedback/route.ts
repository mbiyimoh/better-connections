import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { feedbackCreateSchema, feedbackQuerySchema } from '@/lib/validations/feedback';

/**
 * GET /api/feedback - List feedback with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Parse and validate query parameters
    const parseResult = feedbackQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { area, type, status, sort, order, page, limit } = parseResult.data;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (area) where.area = area;
    if (type) where.type = type;
    if (status) where.status = status;

    // Get current user (optional for viewing feedback)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only create visitor ID for anonymous users
    const visitorId = user ? null : await getOrCreateVisitorId();

    // Fetch feedback with vote status
    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
          attachments: { select: { id: true, fileName: true, url: true, mimeType: true } },
          votes: {
            where: user
              ? { userId: user.id }
              : { visitorId },
            select: { id: true },
          },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    // Transform to include hasVoted flag
    const feedbackWithVoteStatus = feedback.map((item) => ({
      ...item,
      hasVoted: item.votes.length > 0,
      votes: undefined, // Remove votes array from response
    }));

    return NextResponse.json({
      data: feedbackWithVoteStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback - Create new feedback
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = feedbackCreateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { title, description, area, type, attachmentIds } = parseResult.data;

    // Create feedback and link attachments atomically
    const feedback = await prisma.$transaction(async (tx) => {
      // Ensure user exists in Prisma (same pattern as contacts)
      await tx.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        },
      });

      // Create the feedback
      const newFeedback = await tx.feedback.create({
        data: {
          userId: user.id,
          title,
          description,
          area,
          type,
        },
      });

      // Link attachments if provided (only user's own uploads)
      if (attachmentIds.length > 0) {
        await tx.feedbackAttachment.updateMany({
          where: {
            id: { in: attachmentIds },
            uploadedBy: user.id,
          },
          data: {
            feedbackId: newFeedback.id,
          },
        });
      }

      // Return with relations included
      return tx.feedback.findUniqueOrThrow({
        where: { id: newFeedback.id },
        include: {
          user: { select: { id: true, name: true } },
          attachments: true,
        },
      });
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    );
  }
}
