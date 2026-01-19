import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EventWizardCreateSchema, DEFAULT_QUESTIONS, checkM33tAccess, m33tAccessDeniedResponse, generateUniqueSlug } from '@/lib/m33t';
import { z } from 'zod';

// GET /api/events - List user's events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Check M33T access
    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Include events where user is owner OR co-organizer
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { userId: user.id }, // Owner
          { organizers: { some: { userId: user.id } } }, // Co-organizer
        ],
        ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' } : {})
      },
      include: {
        _count: {
          select: { attendees: true, matches: true }
        },
        // Include organizer status so UI can distinguish owner vs co-organizer
        organizers: {
          where: { userId: user.id },
          select: { canInvite: true, canCurate: true, canEdit: true, canManage: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', code: 'FETCH_FAILED', retryable: true },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', retryable: false },
        { status: 401 }
      );
    }

    // Check M33T access
    if (!(await checkM33tAccess(user.id))) {
      return m33tAccessDeniedResponse();
    }

    // Ensure user exists in Prisma database
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      },
    });

    const body = await request.json();
    const { organizers, ...eventData } = body;
    const validatedData = EventWizardCreateSchema.parse(eventData);

    // Generate unique slug from event name
    const slug = await generateUniqueSlug(
      validatedData.name,
      async (candidateSlug) => {
        const existing = await prisma.event.findFirst({
          where: { slug: candidateSlug },
        });
        return !!existing;
      }
    );

    const event = await prisma.event.create({
      data: {
        ...validatedData,
        slug,
        userId: user.id,
        questions: validatedData.questions || DEFAULT_QUESTIONS,
        ...(organizers && organizers.length > 0 ? {
          organizers: {
            create: organizers.map((org: { userId: string; canInvite?: boolean; canCurate?: boolean; canEdit?: boolean; canManage?: boolean }) => ({
              userId: org.userId,
              canInvite: org.canInvite ?? true,
              canCurate: org.canCurate ?? true,
              canEdit: org.canEdit ?? false,
              canManage: org.canManage ?? false,
            })),
          },
        } : {}),
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const firstIssue = zodError.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', code: 'CREATE_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
