import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

// GET /api/contacts/[id]/ranking - Get contact's ranking among all contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all contacts for this user, ordered by enrichment score descending
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, enrichmentScore: true },
      orderBy: { enrichmentScore: 'desc' },
    });

    const totalContacts = contacts.length;

    // Find the rank of the target contact
    const contactIndex = contacts.findIndex((c) => c.id === id);

    if (contactIndex === -1) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Rank is 1-indexed (position + 1)
    const currentRank = contactIndex + 1;

    return NextResponse.json({
      currentRank,
      totalContacts,
    });
  } catch (error) {
    console.error('Error getting contact ranking:', error);
    return NextResponse.json({ error: 'Failed to get ranking' }, { status: 500 });
  }
}
