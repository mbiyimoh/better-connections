import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkEventAccess } from '@/lib/m33t';
import { getCurrentUser } from '@/lib/auth-helpers';

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
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

  const body = await req.json();
  const result = reorderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { orderedIds } = result.data;

  // Verify all IDs belong to this event
  const existingSets = await prisma.questionSet.findMany({
    where: { eventId },
    select: { id: true },
  });

  const existingIds = new Set(existingSets.map((s) => s.id));

  // Check that all provided IDs exist
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return NextResponse.json(
        { error: `Question set ${id} not found in this event` },
        { status: 400 }
      );
    }
  }

  // Update order for each set in a transaction
  const updates = orderedIds.map((id, index) =>
    prisma.questionSet.update({
      where: { id },
      data: { order: index },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ success: true });
}
