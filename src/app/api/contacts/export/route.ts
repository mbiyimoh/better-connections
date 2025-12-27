import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { contactQuerySchema } from '@/lib/validations/contact';
import { Prisma } from '@prisma/client';

// GET /api/contacts/export - Export contacts as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters (same filters as list)
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
      page: 1,
      limit: 10000, // Export all matching contacts
    });

    // Build where clause
    const where: Prisma.ContactWhereInput = {
      userId: user.id,
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { primaryEmail: { contains: query.search, mode: 'insensitive' } },
        { secondaryEmail: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.tags = {
        some: { category: query.category },
      };
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.relationship) {
      where.relationshipStrength = query.relationship;
    }

    if (query.minScore !== undefined || query.maxScore !== undefined) {
      where.enrichmentScore = {};
      if (query.minScore !== undefined) {
        where.enrichmentScore.gte = query.minScore;
      }
      if (query.maxScore !== undefined) {
        where.enrichmentScore.lte = query.maxScore;
      }
    }

    // Get contacts
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: { tags: true },
    });

    // Build CSV
    const headers = [
      'First Name',
      'Last Name',
      'Primary Email',
      'Secondary Email',
      'Primary Phone',
      'Secondary Phone',
      'Title',
      'Company',
      'Location',
      'LinkedIn URL',
      'How We Met',
      'Relationship Strength',
      'Last Contact Date',
      'Relationship History',
      'Why Now',
      'Expertise',
      'Interests',
      'Notes',
      'Tags',
      'Enrichment Score',
      'Source',
      'Created At',
      'Updated At',
    ];

    const relationshipLabels: Record<number, string> = {
      1: 'Weak',
      2: 'Casual',
      3: 'Good',
      4: 'Strong',
    };

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = contacts.map((contact) => [
      escapeCSV(contact.firstName),
      escapeCSV(contact.lastName),
      escapeCSV(contact.primaryEmail),
      escapeCSV(contact.secondaryEmail),
      escapeCSV(contact.primaryPhone),
      escapeCSV(contact.secondaryPhone),
      escapeCSV(contact.title),
      escapeCSV(contact.company),
      escapeCSV(contact.location),
      escapeCSV(contact.linkedinUrl),
      escapeCSV(contact.howWeMet),
      escapeCSV(relationshipLabels[contact.relationshipStrength] || ''),
      contact.lastContactDate ? contact.lastContactDate.toISOString().split('T')[0] : '',
      escapeCSV(contact.relationshipHistory),
      escapeCSV(contact.whyNow),
      escapeCSV(contact.expertise),
      escapeCSV(contact.interests),
      escapeCSV(contact.notes),
      escapeCSV(contact.tags.map((t) => `${t.text} (${t.category})`).join('; ')),
      String(contact.enrichmentScore),
      escapeCSV(contact.source),
      contact.createdAt.toISOString().split('T')[0],
      contact.updatedAt.toISOString().split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `contacts-${date}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json({ error: 'Failed to export contacts' }, { status: 500 });
  }
}
