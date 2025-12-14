import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

// GET /api/tags - List all unique tags for the user (for autocomplete)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique tags for this user's contacts
    const tags = await prisma.tag.findMany({
      where: {
        contact: {
          userId: user.id,
        },
      },
      distinct: ['text', 'category'],
      select: {
        text: true,
        category: true,
      },
      orderBy: {
        text: 'asc',
      },
    });

    // Remove duplicates by text+category combination
    const uniqueTags = Array.from(
      new Map(tags.map((t) => [`${t.text}-${t.category}`, t])).values()
    );

    return NextResponse.json({ tags: uniqueTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
