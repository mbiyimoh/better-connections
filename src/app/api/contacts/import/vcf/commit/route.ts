import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';

const parsedContactSchema = z.object({
  tempId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  primaryEmail: z.string().nullable(),
  secondaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  secondaryPhone: z.string().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  streetAddress: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  notes: z.string().nullable(),
  rawVcardIndex: z.number(),
});

const fieldDecisionSchema = z.object({
  field: z.string(),
  choice: z.enum(['keep', 'use_new']),
});

const duplicateResolutionSchema = z.object({
  existingContactId: z.string(),
  incoming: parsedContactSchema,
  action: z.enum(['skip', 'merge']),
  fieldDecisions: z.array(fieldDecisionSchema).optional(),
});

const commitRequestSchema = z.object({
  newContacts: z.array(parsedContactSchema),
  duplicateResolutions: z.array(duplicateResolutionSchema),
});

interface CommitError {
  tempId: string;
  error: string;
}

// 60 second timeout for large imports
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in Prisma
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
    });

    // Parse and validate request
    const body = await request.json();
    const { newContacts, duplicateResolutions } = commitRequestSchema.parse(body);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: CommitError[] = [];

    // Create new contacts
    for (const contact of newContacts) {
      try {
        const enrichmentScore = calculateEnrichmentScore(contact, 0);

        await prisma.contact.create({
          data: {
            userId: user.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            primaryEmail: contact.primaryEmail,
            secondaryEmail: contact.secondaryEmail,
            primaryPhone: contact.primaryPhone,
            secondaryPhone: contact.secondaryPhone,
            title: contact.title,
            company: contact.company,
            linkedinUrl: contact.linkedinUrl,
            websiteUrl: contact.websiteUrl,
            streetAddress: contact.streetAddress,
            city: contact.city,
            state: contact.state,
            zipCode: contact.zipCode,
            country: contact.country,
            notes: contact.notes,
            source: 'ICLOUD',
            enrichmentScore,
          },
        });

        created++;
      } catch (error) {
        errors.push({
          tempId: contact.tempId,
          error: error instanceof Error ? error.message : 'Failed to create contact',
        });
      }
    }

    // Process duplicate resolutions
    for (const resolution of duplicateResolutions) {
      if (resolution.action === 'skip') {
        skipped++;
        continue;
      }

      try {
        // Build update data based on field decisions
        const updateData: Record<string, string | null> = {};
        const fieldDecisions = new Map(
          (resolution.fieldDecisions || []).map(d => [d.field, d.choice])
        );

        // Apply field decisions for conflict fields
        const conflictFields = [
          'firstName', 'lastName', 'title', 'company',
          'primaryPhone', 'secondaryPhone',
          'linkedinUrl', 'websiteUrl',
          'streetAddress', 'city', 'state', 'zipCode', 'country',
        ] as const;

        for (const field of conflictFields) {
          const decision = fieldDecisions.get(field);
          if (decision === 'use_new') {
            const value = resolution.incoming[field];
            if (value !== undefined) {
              updateData[field] = value;
            }
          }
        }

        // Fill empty slots (no conflict, auto-fill)
        const existing = await prisma.contact.findUnique({
          where: { id: resolution.existingContactId },
        });

        if (existing) {
          // Auto-fill empty fields
          const fillableFields = ['secondaryEmail', 'secondaryPhone', 'linkedinUrl', 'websiteUrl'] as const;
          for (const field of fillableFields) {
            if (!existing[field] && resolution.incoming[field]) {
              updateData[field] = resolution.incoming[field];
            }
          }

          // Auto-merge notes
          if (resolution.incoming.notes) {
            const existingNotes = existing.notes || '';
            const separator = existingNotes ? '\n\n[Imported from iCloud]\n' : '';
            updateData.notes = existingNotes + separator + resolution.incoming.notes;
          }
        }

        // Update contact if there are changes
        if (Object.keys(updateData).length > 0) {
          const updatedContact = await prisma.contact.update({
            where: { id: resolution.existingContactId },
            data: updateData,
          });

          // Recalculate enrichment score
          const tagCount = await prisma.tag.count({
            where: { contactId: resolution.existingContactId },
          });
          const newScore = calculateEnrichmentScore(updatedContact, tagCount);

          await prisma.contact.update({
            where: { id: resolution.existingContactId },
            data: { enrichmentScore: newScore },
          });
        }

        updated++;
      } catch (error) {
        errors.push({
          tempId: resolution.incoming.tempId,
          error: error instanceof Error ? error.message : 'Failed to update contact',
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        created,
        updated,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error('VCF commit error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
