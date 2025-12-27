import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { contactCreateSchema, contactQuerySchema } from '@/lib/validations/contact';
import { calculateEnrichmentScore } from '@/lib/enrichment';
import { Prisma } from '@prisma/client';

// GET /api/contacts - List contacts with filtering, sorting, pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = contactQuerySchema.parse({
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      relationship: searchParams.get('relationship') || undefined,
      minScore: searchParams.get('minScore') || undefined,
      maxScore: searchParams.get('maxScore') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 25,
    });

    // Build where clause
    const where: Prisma.ContactWhereInput = {
      userId: user.id,
    };

    // Search filter
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { primaryEmail: { contains: query.search, mode: 'insensitive' } },
        { secondaryEmail: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Category filter (via tags)
    if (query.category) {
      where.tags = {
        some: { category: query.category },
      };
    }

    // Source filter
    if (query.source) {
      where.source = query.source;
    }

    // Relationship strength filter
    if (query.relationship) {
      where.relationshipStrength = query.relationship;
    }

    // Enrichment score range filter
    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.enrichmentScore = {};
      if (query.minScore !== undefined) {
        where.enrichmentScore.gte = query.minScore;
      }
      if (query.maxScore !== undefined) {
        where.enrichmentScore.lte = query.maxScore;
      }
    }

    // Build order by - default sort by lastName
    const orderBy: Prisma.ContactOrderByWithRelationInput = {};
    const sortField = query.sort || 'lastName';
    orderBy[sortField as keyof Prisma.ContactOrderByWithRelationInput] = query.order || 'asc';

    // Get total count
    const total = await prisma.contact.count({ where });

    // Get paginated results
    const contacts = await prisma.contact.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        tags: true,
      },
    });

    return NextResponse.json({
      contacts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
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
    const data = contactCreateSchema.parse(body);

    // Extract tags for separate creation
    const { tags, ...contactData } = data;

    // Calculate enrichment score
    const enrichmentScore = calculateEnrichmentScore(contactData, tags?.length ?? 0);

    // Create contact with tags
    const contact = await prisma.contact.create({
      data: {
        ...contactData,
        userId: user.id,
        enrichmentScore,
        lastContactDate: contactData.lastContactDate ? new Date(contactData.lastContactDate) : null,
        tags: tags && tags.length > 0
          ? {
              create: tags.map((tag) => ({
                text: tag.text,
                category: tag.category,
              })),
            }
          : undefined,
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid contact data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
