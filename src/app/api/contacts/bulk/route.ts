import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// DELETE /api/contacts/bulk - Bulk delete contacts
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = bulkDeleteSchema.parse(body);

    // Delete contacts that belong to this user
    const result = await prisma.contact.deleteMany({
      where: {
        id: { in: data.ids },
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error bulk deleting contacts:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to delete contacts' }, { status: 500 });
  }
}
