import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse } from '@/lib/m33t';

// GET /api/users/search - Search users with M33T access (for co-organizer selection)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Check M33T access
    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Search users with M33T access (excluding the current user)
    const users = await prisma.user.findMany({
      where: {
        hasM33tAccess: true,
        id: { not: user.id },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to search users:', error);
    return NextResponse.json(
      { error: 'Failed to search users', code: 'SEARCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
