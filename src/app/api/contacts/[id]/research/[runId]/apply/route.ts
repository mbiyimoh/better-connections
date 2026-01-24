import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { applyRecommendationsSchema } from '@/lib/research/schemas';
import { RESEARCH_FIELD_LABELS } from '@/lib/research/types';
import { calculateEnrichmentScore } from '@/lib/enrichment';
import type { Prisma, TagCategory, Contact } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Generate human-readable summary of applied changes
function generateAppliedChangesSummary(
  changes: { fieldName: string; previousValue: string | null; newValue: string }[]
): string[] {
  const summary: string[] = [];
  const tagCount = changes.filter((c) => c.fieldName === 'tags').length;

  for (const change of changes) {
    if (change.fieldName === 'tags') continue; // Handle tags separately

    const label = RESEARCH_FIELD_LABELS[change.fieldName] || change.fieldName;
    const action = change.previousValue ? 'Updated' : 'Added';
    summary.push(`${action} ${label}`);
  }

  // Group tag additions
  if (tagCount > 0) {
    summary.push(`Added ${tagCount} tag${tagCount !== 1 ? 's' : ''}`);
  }

  return summary;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = applyRecommendationsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Verify research run belongs to user
    const researchRun = await prisma.contactResearchRun.findFirst({
      where: { id: runId, contactId: id, userId: user.id },
    });

    if (!researchRun) {
      return NextResponse.json(
        { error: 'Research run not found' },
        { status: 404 }
      );
    }

    // Get recommendations to apply
    const whereClause: Prisma.ContactRecommendationWhereInput = {
      researchRunId: runId,
      status: 'APPROVED',
    };
    if (parseResult.data.recommendationIds) {
      whereClause.id = { in: parseResult.data.recommendationIds };
    }

    const recommendations = await prisma.contactRecommendation.findMany({
      where: whereClause,
    });

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No approved recommendations to apply' },
        { status: 400 }
      );
    }

    // Get current contact state and capture previous score
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const previousScore = contact.enrichmentScore;

    // Apply in transaction
    const changes: {
      fieldName: string;
      previousValue: string | null;
      newValue: string;
    }[] = [];

    await prisma.$transaction(async (tx) => {
      const contactUpdates: Partial<
        Pick<
          Contact,
          | 'title'
          | 'organizationalTitle'
          | 'company'
          | 'location'
          | 'expertise'
          | 'interests'
          | 'whyNow'
          | 'notes'
          | 'twitterUrl'
          | 'githubUrl'
          | 'instagramUrl'
        >
      > = {};
      const newTags: { text: string; category: string }[] = [];

      for (const rec of recommendations) {
        const valueToApply = rec.editedValue || rec.proposedValue;

        if (rec.fieldName === 'tags' && rec.tagCategory) {
          // Handle tag recommendation
          newTags.push({
            text: valueToApply,
            category: rec.tagCategory,
          });
        } else {
          // Handle field recommendation
          const fieldKey = rec.fieldName as keyof typeof contactUpdates;
          const previousValue = contact[fieldKey] || null;
          (contactUpdates as Record<string, string>)[rec.fieldName] =
            valueToApply;

          changes.push({
            fieldName: rec.fieldName,
            previousValue,
            newValue: valueToApply,
          });

          // Create enrichment log
          await tx.contactEnrichmentLog.create({
            data: {
              contactId: id,
              fieldName: rec.fieldName,
              previousValue,
              newValue: valueToApply,
              source: 'RESEARCH',
              researchRunId: runId,
            },
          });
        }

        // Mark recommendation as applied
        await tx.contactRecommendation.update({
          where: { id: rec.id },
          data: { status: 'APPLIED', appliedAt: new Date() },
        });
      }

      // Update contact fields
      if (Object.keys(contactUpdates).length > 0) {
        await tx.contact.update({
          where: { id },
          data: {
            ...contactUpdates,
            lastEnrichedAt: new Date(),
          },
        });
      }

      // Create new tags
      for (const tag of newTags) {
        // Check if tag already exists for this contact
        const existingTag = await tx.tag.findFirst({
          where: {
            contactId: id,
            text: { equals: tag.text, mode: 'insensitive' },
          },
        });

        if (!existingTag) {
          await tx.tag.create({
            data: {
              contactId: id,
              text: tag.text,
              category: tag.category as TagCategory,
            },
          });

          changes.push({
            fieldName: 'tags',
            previousValue: null,
            newValue: `${tag.text} (${tag.category})`,
          });
        }
      }
    });

    // Recalculate enrichment score
    const contactWithTags = await prisma.contact.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!contactWithTags) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const newScore = calculateEnrichmentScore(
      contactWithTags,
      contactWithTags.tags.length
    );

    await prisma.contact.update({
      where: { id },
      data: { enrichmentScore: newScore },
    });

    // Generate human-readable summary of changes
    const appliedChangesSummary = generateAppliedChangesSummary(changes);

    // Update research run with apply tracking data
    await prisma.contactResearchRun.update({
      where: { id: runId },
      data: {
        appliedAt: new Date(),
        previousScore,
        newScore,
        appliedChangesSummary: JSON.stringify(appliedChangesSummary),
      },
    });

    return NextResponse.json(
      {
        success: true,
        appliedCount: recommendations.length,
        previousScore,
        newScore,
        appliedChangesSummary,
        contact: {
          id: contactWithTags.id,
          enrichmentScore: newScore,
        },
        changes,
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('Apply recommendations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
