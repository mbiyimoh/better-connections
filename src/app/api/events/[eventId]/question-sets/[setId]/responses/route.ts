import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';
import { computeAggregation } from '@/lib/m33t/response-aggregation';
import type { Question } from '@/lib/m33t/schemas';

interface ResponseItem {
  questionId: string;
  value: string | number | string[];
  context?: string;
  answeredAt: string;
}

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

  // Fetch question set (validate belongs to event, not DRAFT)
  const questionSet = await prisma.questionSet.findFirst({
    where: { id: setId, eventId, status: { not: 'DRAFT' } },
  });

  if (!questionSet) {
    return NextResponse.json(
      { error: 'Question set not found' },
      { status: 404 }
    );
  }

  // Fetch all responses with attendee info
  const questionSetResponses = await prisma.questionSetResponse.findMany({
    where: { questionSetId: setId },
    include: {
      attendee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          rsvpStatus: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  // Count total CONFIRMED attendees
  const totalAttendees = await prisma.eventAttendee.count({
    where: { eventId, rsvpStatus: 'CONFIRMED' },
  });

  // Parse questions from JSON
  const questions = (questionSet.questions as unknown as Question[]) || [];

  // Build summary
  const completed = questionSetResponses.filter(
    (r) => r.completedAt !== null
  ).length;
  const inProgress = questionSetResponses.filter(
    (r) => r.completedAt === null
  ).length;

  const summary = {
    totalAttendees,
    completed,
    inProgress,
    notStarted: Math.max(0, totalAttendees - completed - inProgress),
    completionRate:
      totalAttendees > 0
        ? Math.round((completed / totalAttendees) * 100)
        : 0,
  };

  // Build responsesByQuestion
  const responsesByQuestion = questions.map((question) => {
    const responsesForQuestion: Array<{
      attendeeId: string;
      attendeeName: string;
      value: string | number | string[];
      context: string | null;
      answeredAt: string;
      isCompleted: boolean;
    }> = [];

    for (const qsr of questionSetResponses) {
      const items = (qsr.responses as unknown as ResponseItem[]) || [];
      const item = items.find((r) => r.questionId === question.id);
      if (!item) continue;

      const attendee = qsr.attendee;
      const name =
        [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') ||
        'Anonymous';

      responsesForQuestion.push({
        attendeeId: attendee.id,
        attendeeName: name,
        value: item.value,
        context: item.context ?? null,
        answeredAt: item.answeredAt,
        isCompleted: qsr.completedAt !== null,
      });
    }

    // Sort by answeredAt descending (most recent first)
    responsesForQuestion.sort(
      (a, b) =>
        new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
    );

    const values = responsesForQuestion.map((r) => r.value);
    const aggregation = computeAggregation(question, values);

    return { question, responses: responsesForQuestion, aggregation };
  });

  // Build responsesByAttendee
  const responsesByAttendee = questionSetResponses.map((qsr) => {
    const attendee = qsr.attendee;
    const name =
      [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') ||
      'Anonymous';
    const items = (qsr.responses as unknown as ResponseItem[]) || [];

    const responses = questions.map((question) => {
      const item = items.find((r) => r.questionId === question.id);
      return {
        question,
        value: item?.value ?? null,
        context: item?.context ?? null,
      };
    });

    return {
      attendee: {
        id: attendee.id,
        name,
        email: attendee.email,
        completedAt: qsr.completedAt?.toISOString() ?? null,
        startedAt: qsr.startedAt.toISOString(),
      },
      responses,
    };
  });

  return NextResponse.json(
    {
      questionSet: {
        id: questionSet.id,
        title: questionSet.title,
        description: questionSet.description,
        status: questionSet.status,
        publishedAt: questionSet.publishedAt?.toISOString() ?? null,
      },
      summary,
      responsesByQuestion,
      responsesByAttendee,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
