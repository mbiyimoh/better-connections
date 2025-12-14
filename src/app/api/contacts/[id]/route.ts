import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { contactUpdateSchema } from '@/lib/validations/contact';
import { calculateEnrichmentScore } from '@/lib/enrichment';

// GET /api/contacts/[id] - Get a single contact
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

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tags: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PUT /api/contacts/[id] - Update a contact
export async function PUT(
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

    // Check if contact exists and belongs to user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tags: true,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = contactUpdateSchema.parse(body);

    // Extract tags for separate handling
    const { tags, ...contactData } = data;

    // Build update data
    const updateData: Record<string, unknown> = {
      ...contactData,
      updatedAt: new Date(),
    };

    // Handle date conversion
    if (contactData.lastContactDate !== undefined) {
      updateData.lastContactDate = contactData.lastContactDate
        ? new Date(contactData.lastContactDate)
        : null;
    }

    // Handle lastEnrichedAt date
    if ('lastEnrichedAt' in data && data.lastEnrichedAt !== undefined) {
      updateData.lastEnrichedAt = data.lastEnrichedAt
        ? new Date(data.lastEnrichedAt)
        : null;
    }

    // Update contact
    const contact = await prisma.$transaction(async (tx) => {
      // If tags are provided, replace them
      if (tags !== undefined) {
        // Delete existing tags
        await tx.tag.deleteMany({
          where: { contactId: id },
        });

        // Create new tags
        if (tags.length > 0) {
          await tx.tag.createMany({
            data: tags.map((tag) => ({
              contactId: id,
              text: tag.text,
              category: tag.category,
            })),
          });
        }
      }

      // Get the final tag count for score calculation
      const tagCount =
        tags !== undefined ? tags.length : existingContact.tags.length;

      // Calculate new enrichment score
      const mergedContact = { ...existingContact, ...contactData };
      const enrichmentScore = calculateEnrichmentScore(mergedContact, tagCount);

      // Update contact
      return tx.contact.update({
        where: { id },
        data: {
          ...updateData,
          enrichmentScore,
        },
        include: {
          tags: true,
        },
      });
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid contact data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] - Delete a contact
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

    // Check if contact exists and belongs to user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Delete contact (tags will cascade delete)
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
