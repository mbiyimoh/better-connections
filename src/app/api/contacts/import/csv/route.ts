import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';
import { normalizePhone } from '@/lib/phone';

const importContactSchema = z.object({
  contact: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    primaryEmail: z.string().email().optional().or(z.literal('')),
    secondaryEmail: z.string().email().optional().or(z.literal('')),
    primaryPhone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    // URLs are stored as strings - CSV data may have partial URLs or profile names
    linkedinUrl: z.string().optional(),
    websiteUrl: z.string().optional(),
    // Address fields
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    location: z.string().optional(),
    // Referral
    referredBy: z.string().optional(),
    // Enrichment fields
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

    // Ensure user exists in Prisma database (Supabase Auth user may not have a corresponding Prisma User record)
    await prisma.user.upsert({
      where: { id: user.id },
      update: {}, // No updates needed, just ensure exists
      create: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
    });

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
    if (skipDuplicates && cleanContact.primaryEmail) {
      const existing = await prisma.contact.findFirst({
        where: {
          userId: user.id,
          primaryEmail: cleanContact.primaryEmail,
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
        firstName: cleanContact.firstName,
        lastName: cleanContact.lastName || null,
        primaryEmail: cleanContact.primaryEmail || null,
        secondaryEmail: cleanContact.secondaryEmail || null,
        primaryPhone: cleanContact.primaryPhone ? (normalizePhone(cleanContact.primaryPhone) ?? null) : null,
        secondaryPhone: cleanContact.secondaryPhone ? (normalizePhone(cleanContact.secondaryPhone) ?? null) : null,
        title: cleanContact.title || null,
        company: cleanContact.company || null,
        linkedinUrl: cleanContact.linkedinUrl || null,
        websiteUrl: cleanContact.websiteUrl || null,
        // Address fields
        streetAddress: cleanContact.streetAddress || null,
        city: cleanContact.city || null,
        state: cleanContact.state || null,
        zipCode: cleanContact.zipCode || null,
        country: cleanContact.country || null,
        location: cleanContact.location || null,
        // Referral
        referredBy: cleanContact.referredBy || null,
        // Enrichment fields
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
