import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

// Validation schema for updating a question set
const updateQuestionSetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  questions: z.array(z.any()).optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'view');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 404 }
    );
  }

  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
    include: {
      responses: {
        select: { completedAt: true },
      },
    },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Get total eligible attendees
  const totalAttendees = await prisma.eventAttendee.count({
    where: { eventId, rsvpStatus: 'CONFIRMED' },
  });

  const completed = questionSet.responses.filter((r) => r.completedAt !== null).length;
  const inProgress = questionSet.responses.filter((r) => r.completedAt === null).length;

  return NextResponse.json({
    questionSet: {
      id: questionSet.id,
      internalId: questionSet.internalId,
      title: questionSet.title,
      description: questionSet.description,
      questions: questionSet.questions,
      status: questionSet.status,
      publishedAt: questionSet.publishedAt?.toISOString() || null,
      order: questionSet.order,
      completionStats: {
        total: totalAttendees,
        completed,
        inProgress,
      },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  // Get existing set
  const existingSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
  });

  if (!existingSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Cannot modify archived sets
  if (existingSet.status === 'ARCHIVED') {
    return NextResponse.json(
      { error: 'Cannot modify archived question set' },
      { status: 400 }
    );
  }

  // Parse and validate body
  const body = await req.json();
  const result = updateQuestionSetSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, questions, order } = result.data;

  // Cannot modify questions of published sets
  if (existingSet.status === 'PUBLISHED' && questions !== undefined) {
    return NextResponse.json(
      { error: 'Cannot modify questions of a published set' },
      { status: 400 }
    );
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (questions !== undefined) updateData.questions = questions;
  if (order !== undefined) updateData.order = order;

  const updatedSet = await prisma.questionSet.update({
    where: { id: setId },
    data: updateData,
  });

  return NextResponse.json({ questionSet: updatedSet });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; setId: string }> }
) {
  const { eventId, setId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  const existingSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId },
    include: {
      _count: { select: { responses: true } },
    },
  });

  if (!existingSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Delete behavior based on status and responses
  if (existingSet.status === 'DRAFT') {
    // DRAFT sets: Hard delete
    await prisma.questionSet.delete({
      where: { id: setId },
    });
    return NextResponse.json({ success: true, action: 'deleted' });
  }

  if (existingSet.status === 'PUBLISHED') {
    if (existingSet._count.responses > 0) {
      // PUBLISHED with responses: Soft delete (archive)
      await prisma.questionSet.update({
        where: { id: setId },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({ success: true, action: 'archived' });
    } else {
      // PUBLISHED without responses: Hard delete
      await prisma.questionSet.delete({
        where: { id: setId },
      });
      return NextResponse.json({ success: true, action: 'deleted' });
    }
  }

  // Already ARCHIVED - no action
  return NextResponse.json(
    { error: 'Cannot delete archived question set' },
    { status: 400 }
  );
}
