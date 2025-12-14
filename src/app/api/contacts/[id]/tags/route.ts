import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';

const tagSchema = z.object({
  text: z.string().min(1).max(100),
  category: z.enum(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST']),
});

// POST /api/contacts/[id]/tags - Add tag to contact
export async function POST(
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

    // Verify contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = tagSchema.parse(body);

    // Check if tag already exists on this contact
    const existingTag = contact.tags.find(
      (t) => t.text.toLowerCase() === data.text.toLowerCase() && t.category === data.category
    );

    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 });
    }

    // Create the tag
    const tag = await prisma.tag.create({
      data: {
        text: data.text,
        category: data.category,
        contactId: id,
      },
    });

    // Update enrichment score
    const newTagCount = contact.tags.length + 1;
    const enrichmentScore = calculateEnrichmentScore(contact, newTagCount);

    await prisma.contact.update({
      where: { id },
      data: { enrichmentScore },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error adding tag:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid tag data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}

// DELETE /api/contacts/[id]/tags - Remove tag from contact
export async function DELETE(
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

    // Verify contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    }

    // Verify tag belongs to this contact
    const tag = contact.tags.find((t) => t.id === tagId);
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Delete the tag
    await prisma.tag.delete({
      where: { id: tagId },
    });

    // Update enrichment score
    const newTagCount = contact.tags.length - 1;
    const enrichmentScore = calculateEnrichmentScore(contact, newTagCount);

    await prisma.contact.update({
      where: { id },
      data: { enrichmentScore },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tag:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
