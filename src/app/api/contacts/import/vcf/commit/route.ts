import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateEnrichmentScore } from '@/lib/enrichment';
import { normalizeName } from '@/lib/vcf-parser';

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
  sameNameDecisions: z.record(
    z.string(),  // normalized name as key
    z.enum(['merge', 'keep_separate', 'skip_new'])
  ).optional().default({}),
});

interface CommitError {
  tempId: string;
  error: string;
}

// Types for same-name merge
type ParsedContact = z.infer<typeof parsedContactSchema>;

interface ContactData {
  id?: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
}

/**
 * Count non-null fields for sorting by completeness
 */
function countFields(contact: ContactData): number {
  return [
    contact.primaryEmail,
    contact.secondaryEmail,
    contact.primaryPhone,
    contact.secondaryPhone,
    contact.title,
    contact.company,
    contact.linkedinUrl,
    contact.websiteUrl,
    contact.streetAddress,
    contact.city,
    contact.state,
    contact.zipCode,
    contact.country,
    contact.notes,
  ].filter(Boolean).length;
}

/**
 * Merge multiple contacts with same name into one.
 * Priority: existing contact wins for single-value fields.
 * Multi-value fields (emails, phones, notes) are combined.
 */
function mergeContactData(contacts: ContactData[]): ContactData {
  if (contacts.length === 0) {
    throw new Error('Cannot merge empty contact list');
  }

  // Sort: existing contacts first (have id), then by most complete
  const sorted = [...contacts].sort((a, b) => {
    if (a.id && !b.id) return -1;  // Existing first
    if (!a.id && b.id) return 1;
    // Then by field completeness
    const aScore = countFields(a);
    const bScore = countFields(b);
    return bScore - aScore;
  });

  const base = sorted[0]!;
  const merged: ContactData = {
    id: base.id,
    firstName: base.firstName,
    lastName: base.lastName,
    primaryEmail: base.primaryEmail,
    secondaryEmail: base.secondaryEmail,
    primaryPhone: base.primaryPhone,
    secondaryPhone: base.secondaryPhone,
    title: base.title,
    company: base.company,
    linkedinUrl: base.linkedinUrl,
    websiteUrl: base.websiteUrl,
    streetAddress: base.streetAddress,
    city: base.city,
    state: base.state,
    zipCode: base.zipCode,
    country: base.country,
    notes: base.notes,
  };

  // Collect all emails
  const emails = new Set<string>();
  for (const c of contacts) {
    if (c.primaryEmail) emails.add(c.primaryEmail.toLowerCase());
    if (c.secondaryEmail) emails.add(c.secondaryEmail.toLowerCase());
  }
  const emailArray = Array.from(emails);
  merged.primaryEmail = emailArray[0] || null;
  merged.secondaryEmail = emailArray[1] || null;

  // Collect all phones
  const phones = new Set<string>();
  for (const c of contacts) {
    if (c.primaryPhone) phones.add(c.primaryPhone);
    if (c.secondaryPhone) phones.add(c.secondaryPhone);
  }
  const phoneArray = Array.from(phones);
  merged.primaryPhone = phoneArray[0] || null;
  merged.secondaryPhone = phoneArray[1] || null;

  // For single-value fields, use first non-null
  merged.title = contacts.find(c => c.title)?.title || null;
  merged.company = contacts.find(c => c.company)?.company || null;
  merged.linkedinUrl = contacts.find(c => c.linkedinUrl)?.linkedinUrl || null;
  merged.websiteUrl = contacts.find(c => c.websiteUrl)?.websiteUrl || null;
  merged.streetAddress = contacts.find(c => c.streetAddress)?.streetAddress || null;
  merged.city = contacts.find(c => c.city)?.city || null;
  merged.state = contacts.find(c => c.state)?.state || null;
  merged.zipCode = contacts.find(c => c.zipCode)?.zipCode || null;
  merged.country = contacts.find(c => c.country)?.country || null;

  // Combine notes with separator
  const allNotes = contacts
    .map(c => c.notes)
    .filter(Boolean)
    .join('\n\n---\n\n');
  merged.notes = allNotes || null;

  return merged;
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
    const { newContacts, duplicateResolutions, sameNameDecisions } = commitRequestSchema.parse(body);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: CommitError[] = [];

    // Track VCF indices that have been processed via same-name decisions
    const processedVcfIndices = new Set<number>();

    // Process same-name decisions
    for (const [normalizedName, decision] of Object.entries(sameNameDecisions)) {
      // Find new contacts that match this normalized name
      const matchingNewContacts = newContacts.filter(
        c => normalizeName(c.firstName, c.lastName) === normalizedName
      );

      if (matchingNewContacts.length === 0) continue;

      switch (decision) {
        case 'skip_new':
          // Mark all new contacts in this group as skipped
          for (const contact of matchingNewContacts) {
            processedVcfIndices.add(contact.rawVcardIndex);
            skipped++;
          }
          break;

        case 'keep_separate':
          // Do nothing - contacts will be imported individually
          break;

        case 'merge':
          try {
            // Find existing contacts with this normalized name
            const existingContacts = await prisma.contact.findMany({
              where: { userId: user.id },
            });

            const matchingExisting = existingContacts.filter(
              c => normalizeName(c.firstName, c.lastName) === normalizedName
            );

            // Convert to ContactData format
            const existingContactData: ContactData[] = matchingExisting.map(c => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              primaryEmail: c.primaryEmail,
              secondaryEmail: c.secondaryEmail,
              primaryPhone: c.primaryPhone,
              secondaryPhone: c.secondaryPhone,
              title: c.title,
              company: c.company,
              linkedinUrl: c.linkedinUrl,
              websiteUrl: c.websiteUrl,
              streetAddress: c.streetAddress,
              city: c.city,
              state: c.state,
              zipCode: c.zipCode,
              country: c.country,
              notes: c.notes,
            }));

            const newContactData: ContactData[] = matchingNewContacts.map(c => ({
              firstName: c.firstName,
              lastName: c.lastName,
              primaryEmail: c.primaryEmail,
              secondaryEmail: c.secondaryEmail,
              primaryPhone: c.primaryPhone,
              secondaryPhone: c.secondaryPhone,
              title: c.title,
              company: c.company,
              linkedinUrl: c.linkedinUrl,
              websiteUrl: c.websiteUrl,
              streetAddress: c.streetAddress,
              city: c.city,
              state: c.state,
              zipCode: c.zipCode,
              country: c.country,
              notes: c.notes,
            }));

            const allContacts = [...existingContactData, ...newContactData];
            const merged = mergeContactData(allContacts);

            if (matchingExisting.length > 0) {
              // Update the first existing contact with merged data
              const primaryExisting = matchingExisting[0];
              if (!primaryExisting) continue;

              await prisma.contact.update({
                where: { id: primaryExisting.id },
                data: {
                  firstName: merged.firstName,
                  lastName: merged.lastName,
                  primaryEmail: merged.primaryEmail,
                  secondaryEmail: merged.secondaryEmail,
                  primaryPhone: merged.primaryPhone,
                  secondaryPhone: merged.secondaryPhone,
                  title: merged.title,
                  company: merged.company,
                  linkedinUrl: merged.linkedinUrl,
                  websiteUrl: merged.websiteUrl,
                  streetAddress: merged.streetAddress,
                  city: merged.city,
                  state: merged.state,
                  zipCode: merged.zipCode,
                  country: merged.country,
                  notes: merged.notes,
                  updatedAt: new Date(),
                },
              });

              // Delete other existing contacts with same name (they're now merged)
              for (let i = 1; i < matchingExisting.length; i++) {
                const contactToDelete = matchingExisting[i];
                if (contactToDelete) {
                  await prisma.contact.delete({
                    where: { id: contactToDelete.id },
                  });
                }
              }

              updated++;
            } else {
              // No existing contact - create new merged contact
              const enrichmentScore = calculateEnrichmentScore(merged, 0);
              await prisma.contact.create({
                data: {
                  userId: user.id,
                  firstName: merged.firstName,
                  lastName: merged.lastName,
                  primaryEmail: merged.primaryEmail,
                  secondaryEmail: merged.secondaryEmail,
                  primaryPhone: merged.primaryPhone,
                  secondaryPhone: merged.secondaryPhone,
                  title: merged.title,
                  company: merged.company,
                  linkedinUrl: merged.linkedinUrl,
                  websiteUrl: merged.websiteUrl,
                  streetAddress: merged.streetAddress,
                  city: merged.city,
                  state: merged.state,
                  zipCode: merged.zipCode,
                  country: merged.country,
                  notes: merged.notes,
                  source: 'ICLOUD',
                  enrichmentScore,
                },
              });
              created++;
            }

            // Mark all new contacts in this group as processed
            for (const contact of matchingNewContacts) {
              processedVcfIndices.add(contact.rawVcardIndex);
            }
          } catch (error) {
            // Log error but continue with other decisions
            console.error('Same-name merge error:', error);
            for (const contact of matchingNewContacts) {
              errors.push({
                tempId: contact.tempId,
                error: error instanceof Error ? error.message : 'Failed to merge contacts',
              });
            }
          }
          break;
      }
    }

    // Create new contacts (excluding those already processed via same-name decisions)
    for (const contact of newContacts) {
      // Skip if already processed via same-name decision
      if (processedVcfIndices.has(contact.rawVcardIndex)) {
        continue;
      }
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, summary: { created: 0, updated: 0, skipped: 0, errors: [{ tempId: 'request', error: 'Invalid request body' }] } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, summary: { created: 0, updated: 0, skipped: 0, errors: [{ tempId: 'unknown', error: error instanceof Error ? error.message : 'Import failed' }] } },
      { status: 500 }
    );
  }
}
