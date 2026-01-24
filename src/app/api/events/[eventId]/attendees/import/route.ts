import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkM33tAccess, m33tAccessDeniedResponse, checkEventAccess, calculateProfileRichness } from '@/lib/m33t';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const ImportContactsSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact is required'),
});

// POST /api/events/[eventId]/attendees/import - Import contacts as attendees
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Verify event access (owner or co-organizer with curate permission)
    const access = await checkEventAccess(eventId, user.id, 'curate');
    if (!access) {
      return NextResponse.json(
        { error: 'Event not found or insufficient permissions', code: 'FORBIDDEN', retryable: false },
        { status: 403 }
      );
    }

    // Fetch event capacity
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, capacity: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND', retryable: false },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { contactIds } = ImportContactsSchema.parse(body);

    // Fetch contacts that belong to this user (include profile data for cards)
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        userId: user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryEmail: true,
        primaryPhone: true,
        title: true,
        company: true,
        expertise: true,
        interests: true,
        whyNow: true,
        location: true,
      },
    });

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found', code: 'NO_CONTACTS', retryable: false },
        { status: 400 }
      );
    }

    // Filter out contacts without email OR phone
    const validContacts = contacts.filter((c) => c.primaryEmail || c.primaryPhone);

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: 'All selected contacts are missing email and phone', code: 'NO_CONTACT_INFO', retryable: false },
        { status: 400 }
      );
    }

    // Check current attendee count
    const currentAttendeeCount = await prisma.eventAttendee.count({
      where: { eventId },
    });

    if (currentAttendeeCount + validContacts.length > event.capacity) {
      return NextResponse.json(
        {
          error: `Adding ${validContacts.length} attendees would exceed capacity (${event.capacity})`,
          code: 'CAPACITY_EXCEEDED',
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Get existing attendees to avoid duplicates (check by contactId, email, or phone)
    const existingAttendees = await prisma.eventAttendee.findMany({
      where: {
        eventId,
        OR: [
          { contactId: { in: validContacts.map((c) => c.id) } },
          { email: { in: validContacts.filter((c) => c.primaryEmail).map((c) => c.primaryEmail!.toLowerCase()) } },
          { phone: { in: validContacts.filter((c) => c.primaryPhone).map((c) => c.primaryPhone!) } },
        ],
      },
      select: { contactId: true, email: true, phone: true },
    });

    const existingContactIds = new Set(existingAttendees.map((e) => e.contactId).filter(Boolean));
    const existingEmails = new Set(existingAttendees.map((e) => e.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingAttendees.map((e) => e.phone).filter(Boolean));

    // Filter to only new contacts (not already added by contactId, email, or phone)
    const newContacts = validContacts.filter((c) => {
      if (existingContactIds.has(c.id)) return false;
      if (c.primaryEmail && existingEmails.has(c.primaryEmail.toLowerCase())) return false;
      if (c.primaryPhone && existingPhones.has(c.primaryPhone)) return false;
      return true;
    });

    if (newContacts.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: validContacts.length,
        message: 'All contacts are already attendees',
      });
    }

    // Map contacts to attendee data (including profile info from contacts)
    // Profile structure follows canonical ProfileSchema from @/lib/m33t/schemas
    const attendeeData = newContacts.map((contact) => {
      const fullName = `${contact.firstName || 'Guest'} ${contact.lastName || ''}`.trim();

      // Build profile matching ProfileSchema for card display
      const profile = {
        name: fullName,
        photoUrl: null,
        location: contact.location,
        role: contact.title,
        company: contact.company,
        seniority: null,
        expertise: contact.expertise ? contact.expertise.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        seekingSummary: null,
        seekingKeywords: contact.interests ? contact.interests.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        offeringSummary: null,
        offeringKeywords: [],
        currentFocus: contact.whyNow, // Maps contact.whyNow to profile.currentFocus
        idealMatch: null,
        conversationHooks: [],
        completeness: 0.3, // Basic completeness since we have some imported data
      };

      // Calculate profile richness for sorting
      const richness = calculateProfileRichness(profile, null, contact.firstName || 'Guest', contact.lastName);

      return {
        eventId,
        contactId: contact.id,
        email: contact.primaryEmail?.toLowerCase() || null,
        phone: contact.primaryPhone,
        firstName: contact.firstName || 'Guest',
        lastName: contact.lastName,
        rsvpStatus: 'PENDING' as const,
        profile, // Store profile data for card display
        profileRichness: richness, // Calculated richness for auto-sorting
        addedById: user.id, // Track who added this attendee
      };
    });

    // Batch create attendees
    const created = await prisma.eventAttendee.createMany({
      data: attendeeData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      imported: created.count,
      skipped: validContacts.length - newContacts.length,
      noEmail: contacts.length - validContacts.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR', retryable: false },
        { status: 400 }
      );
    }
    console.error('Contact import failed:', error);
    return NextResponse.json(
      { error: 'Failed to import contacts', code: 'IMPORT_FAILED', retryable: true },
      { status: 500 }
    );
  }
}
