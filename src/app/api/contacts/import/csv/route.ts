import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';

const importContactSchema = z.object({
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    title: z.string().optional(),
    company: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    howWeMet: z.string().optional(),
    whyNow: z.string().optional(),
    expertise: z.string().optional(),
    interests: z.string().optional(),
    notes: z.string().optional(),
  }),
  skipDuplicates: z.boolean().default(true),
});

// POST /api/contacts/import/csv - Import a single contact from CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contact, skipDuplicates } = importContactSchema.parse(body);

    // Clean up empty strings to null
    const cleanContact = Object.fromEntries(
      Object.entries(contact).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    ) as typeof contact;

    // Check for duplicate email if skipDuplicates is enabled
    if (skipDuplicates && cleanContact.email) {
      const existing = await prisma.contact.findFirst({
        where: {
          userId: user.id,
          email: cleanContact.email,
        },
      });

      if (existing) {
        return NextResponse.json({ skipped: true, reason: 'duplicate' }, { status: 200 });
      }
    }

    // Calculate enrichment score
    const enrichmentScore = calculateEnrichmentScore(cleanContact, 0);

    // Create the contact
    const newContact = await prisma.contact.create({
      data: {
        userId: user.id,
        name: cleanContact.name,
        email: cleanContact.email || null,
        title: cleanContact.title || null,
        company: cleanContact.company || null,
        location: cleanContact.location || null,
        phone: cleanContact.phone || null,
        linkedinUrl: cleanContact.linkedinUrl || null,
        howWeMet: cleanContact.howWeMet || null,
        whyNow: cleanContact.whyNow || null,
        expertise: cleanContact.expertise || null,
        interests: cleanContact.interests || null,
        notes: cleanContact.notes || null,
        source: 'CSV',
        enrichmentScore,
      },
    });

    return NextResponse.json({ success: true, contact: newContact }, { status: 201 });
  } catch (error) {
    console.error('Error importing contact:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid contact data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to import contact' }, { status: 500 });
  }
}
