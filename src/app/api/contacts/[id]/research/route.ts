import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { researchRequestSchema } from '@/lib/research/schemas';
import { executeContactResearch } from '@/lib/research/orchestrator';
import type { ContactContext } from '@/lib/research/types';
import type { Prisma, ResearchStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow background research execution to complete (fire-and-forget)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await request.json();
    const parseResult = researchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { focusAreas } = parseResult.data;

    // Get contact
    const contact = await prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Validate contact has minimum required data
    if (!contact.firstName || !contact.lastName) {
      return NextResponse.json(
        { error: 'Contact must have first and last name for research' },
        { status: 400 }
      );
    }

    // Create research run record
    const researchRun = await prisma.contactResearchRun.create({
      data: {
        contactId: contact.id,
        userId: user.id,
        searchQuery: '', // Will be updated
        focusAreas,
        status: 'RUNNING',
        progressStage: 'Initializing...',
        startedAt: new Date(),
      },
    });

    // Build contact context
    const contactContext: ContactContext = {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName || '',
      primaryEmail: contact.primaryEmail,
      title: contact.title,
      organizationalTitle: contact.organizationalTitle,
      company: contact.company,
      location: contact.location,
      linkedinUrl: contact.linkedinUrl,
      expertise: contact.expertise,
      interests: contact.interests,
      whyNow: contact.whyNow,
      notes: contact.notes,
      twitterUrl: contact.twitterUrl,
      githubUrl: contact.githubUrl,
      instagramUrl: contact.instagramUrl,
    };

    // Execute research ASYNCHRONOUSLY (fire-and-forget)
    // This allows the client to immediately switch to the progress view
    // and poll for updates while the research runs in the background
    executeContactResearch({
      contact: contactContext,
      focusAreas,
      onProgress: async (stage) => {
        await prisma.contactResearchRun.update({
          where: { id: researchRun.id },
          data: { progressStage: stage },
        });
      },
    })
      .then(async (result) => {
        if (!result.success) {
          // Update run with error
          await prisma.contactResearchRun.update({
            where: { id: researchRun.id },
            data: {
              status: 'FAILED',
              errorMessage: result.error,
              completedAt: new Date(),
              executionTimeMs: result.executionTimeMs,
              progressStage: null,
            },
          });
          return;
        }

        // Save recommendations
        if (result.recommendations.length > 0) {
          await prisma.contactRecommendation.createMany({
            data: result.recommendations.map((rec) => ({
              researchRunId: researchRun.id,
              fieldName: rec.fieldName,
              action: rec.action,
              currentValue: rec.currentValue,
              proposedValue: rec.proposedValue,
              tagCategory: rec.tagCategory || null,
              reasoning: rec.reasoning,
              confidence: rec.confidence,
              sourceUrls: rec.sourceUrls,
              status: 'PENDING',
            })),
          });
        }

        // Update run with results
        await prisma.contactResearchRun.update({
          where: { id: researchRun.id },
          data: {
            status: 'COMPLETED',
            searchQuery: result.searchQuery,
            summary: result.report?.summary || null,
            fullReport: result.report?.fullReport || null,
            sourceUrls: result.report?.sourceUrls || [],
            completedAt: new Date(),
            executionTimeMs: result.executionTimeMs,
            progressStage: 'Research complete!',
          },
        });
      })
      .catch(async (error) => {
        console.error('Research execution error:', error);
        await prisma.contactResearchRun.update({
          where: { id: researchRun.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
            progressStage: null,
          },
        });
      });

    // Return immediately with the run ID so client can start polling
    return NextResponse.json(
      {
        id: researchRun.id,
        status: 'RUNNING',
        progressStage: 'Initializing...',
      },
      {
        status: 202, // Accepted - processing asynchronously
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusParam = searchParams.get('status');

    const where: Prisma.ContactResearchRunWhereInput = {
      contactId: id,
      userId: user.id,
    };
    if (statusParam) {
      where.status = statusParam as ResearchStatus;
    }

    const [runs, total] = await Promise.all([
      prisma.contactResearchRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          _count: { select: { recommendations: true } },
          recommendations: {
            where: { status: 'APPLIED' },
            select: { id: true },
          },
        },
      }),
      prisma.contactResearchRun.count({ where }),
    ]);

    return NextResponse.json(
      {
        runs: runs.map((r) => ({
          id: r.id,
          status: r.status,
          summary: r.summary,
          recommendationCount: r._count.recommendations,
          appliedCount: r.recommendations.length,
          createdAt: r.createdAt.toISOString(),
          completedAt: r.completedAt?.toISOString() || null,
        })),
        total,
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('Get research history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
