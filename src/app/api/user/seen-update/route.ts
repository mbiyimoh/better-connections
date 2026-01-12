import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// ISO date format regex: YYYY-MM-DD
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { version } = body;

    // Validate version format
    if (!version || typeof version !== 'string' || !ISO_DATE_REGEX.test(version)) {
      return NextResponse.json(
        { error: 'Invalid version format. Expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenUpdateVersion: version },
      select: { lastSeenUpdateVersion: true },
    });

    return NextResponse.json({
      success: true,
      lastSeenUpdateVersion: updatedUser.lastSeenUpdateVersion,
    });
  } catch (error) {
    console.error('Error updating lastSeenUpdateVersion:', error);
    return NextResponse.json(
      { error: 'Failed to update seen version' },
      { status: 500 }
    );
  }
}
