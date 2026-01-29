import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';
import { QuestionSchema } from '@/lib/m33t/schemas';

// Validation schema for creating a question set
const createQuestionSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  questions: z.array(QuestionSchema).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check organizer access
  const access = await checkEventAccess(eventId, user.id, 'view');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 404 }
    );
  }

  // Get all question sets with completion stats
  const questionSets = await prisma.questionSet.findMany({
    where: { eventId },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { responses: true },
      },
      responses: {
        select: { completedAt: true },
      },
    },
  });

  // Get total eligible attendees (CONFIRMED status)
  const totalAttendees = await prisma.eventAttendee.count({
    where: {
      eventId,
      rsvpStatus: 'CONFIRMED',
    },
  });

  // Format response with completion stats
  const formattedSets = questionSets.map((set) => {
    const completed = set.responses.filter((r) => r.completedAt !== null).length;
    const inProgress = set.responses.filter((r) => r.completedAt === null).length;
    const questionsArray = set.questions as unknown[];

    return {
      id: set.id,
      internalId: set.internalId,
      title: set.title,
      description: set.description,
      status: set.status,
      publishedAt: set.publishedAt?.toISOString() || null,
      order: set.order,
      questions: questionsArray, // Include full questions array for editor
      questionCount: Array.isArray(questionsArray) ? questionsArray.length : 0,
      completionStats: {
        total: totalAttendees,
        completed,
        inProgress,
      },
    };
  });

  return NextResponse.json({ questionSets: formattedSets });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check organizer access (need edit permission to create sets)
  const access = await checkEventAccess(eventId, user.id, 'edit');
  if (!access) {
    return NextResponse.json(
      { error: 'Event not found or access denied' },
      { status: 403 }
    );
  }

  // Parse and validate body
  const body = await req.json();
  const result = createQuestionSetSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, questions } = result.data;

  // Generate internal ID
  const existingCount = await prisma.questionSet.count({
    where: { eventId },
  });
  const internalId = `set_${existingCount + 1}`;

  // Get max order
  const maxOrder = await prisma.questionSet.aggregate({
    where: { eventId },
    _max: { order: true },
  });
  const newOrder = (maxOrder._max.order ?? -1) + 1;

  // Create question set
  const questionSet = await prisma.questionSet.create({
    data: {
      eventId,
      internalId,
      title,
      description,
      questions: questions || [],
      order: newOrder,
      status: 'DRAFT',
    },
  });

  return NextResponse.json({ questionSet }, { status: 201 });
}
