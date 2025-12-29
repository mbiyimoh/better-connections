import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import {
  parseVcfFile,
  detectConflicts,
  ParsedContact,
  SkippedEntry,
  FieldConflict,
  AUTO_MERGE_FIELDS,
} from '@/lib/vcf-parser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: {
    id: string;
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
    enrichmentScore: number;
  };
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

interface VcfUploadResponse {
  success: true;
  analysis: {
    totalParsed: number;
    newContacts: ParsedContact[];
    duplicates: DuplicateAnalysis[];
    skipped: SkippedEntry[];
  };
}

interface VcfUploadError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

// 60 second timeout for large files
export const maxDuration = 60;

export async function POST(
  request: NextRequest
): Promise<NextResponse<VcfUploadResponse | VcfUploadError>> {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.vcf')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Please upload a .vcf file' } },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File is too large. Maximum size is 10MB.' } },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: 'The file appears to be empty' } },
        { status: 400 }
      );
    }

    // Parse VCF
    const parseResult = parseVcfFile(content);

    if (parseResult.contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_VALID_CONTACTS', message: 'Could not read any valid contacts from this file' } },
        { status: 400 }
      );
    }

    // Collect emails for duplicate check
    const emails = parseResult.contacts
      .map(c => c.primaryEmail)
      .filter((e): e is string => e !== null);

    // Query existing contacts
    const existingContacts = emails.length > 0
      ? await prisma.contact.findMany({
          where: {
            userId: user.id,
            primaryEmail: { in: emails },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            secondaryEmail: true,
            primaryPhone: true,
            secondaryPhone: true,
            title: true,
            company: true,
            linkedinUrl: true,
            websiteUrl: true,
            streetAddress: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            notes: true,
            enrichmentScore: true,
          },
        })
      : [];

    // Create email -> existing contact map
    const existingByEmail = new Map(
      existingContacts.map(c => [c.primaryEmail?.toLowerCase(), c])
    );

    // Categorize contacts
    const newContacts: ParsedContact[] = [];
    const duplicates: DuplicateAnalysis[] = [];

    for (const contact of parseResult.contacts) {
      const emailKey = contact.primaryEmail?.toLowerCase();
      const existing = emailKey ? existingByEmail.get(emailKey) : undefined;

      if (existing) {
        const conflicts = detectConflicts(contact, existing);
        const autoMergeFields: string[] = [];

        // Check which auto-merge fields have incoming data
        for (const field of AUTO_MERGE_FIELDS) {
          const incomingValue = contact[field as keyof ParsedContact];
          if (incomingValue) {
            autoMergeFields.push(field);
          }
        }

        duplicates.push({
          incoming: contact,
          existing,
          conflicts,
          autoMergeFields,
        });
      } else {
        newContacts.push(contact);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        totalParsed: parseResult.contacts.length,
        newContacts,
        duplicates,
        skipped: parseResult.skipped,
      },
    });
  } catch (error) {
    console.error('VCF upload error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_FAILED', message: 'Failed to process VCF file' } },
      { status: 500 }
    );
  }
}
