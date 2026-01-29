import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  currentFocus: z.string().max(1000).optional().nullable(),
  seeking: z.string().max(1000).optional().nullable(),
  offering: z.string().max(1000).optional().nullable(),
  expertise: z.array(z.string().max(100)).max(20).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the attendee record for this user and event
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId,
        userId: user.id,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'You are not an attendee of this event' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build profile JSON object
    const profileData = {
      ...(attendee.profile as Record<string, unknown> || {}),
      location: data.location || null,
      role: data.role || null,
      company: data.company || null,
    };

    // Build trading card JSON object
    const tradingCardData = {
      ...(attendee.tradingCard as Record<string, unknown> || {}),
      currentFocus: data.currentFocus || null,
      seeking: data.seeking || null,
      offering: data.offering || null,
      expertise: data.expertise || [],
    };

    // Update the attendee record
    const updatedAttendee = await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName || null,
        profile: profileData,
        tradingCard: tradingCardData,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: true,
        tradingCard: true,
      },
    });

    return NextResponse.json({
      success: true,
      attendee: updatedAttendee,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the attendee record for this user and event
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId,
        userId: user.id,
      },
      include: {
        event: {
          select: { id: true, name: true },
        },
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'You are not an attendee of this event' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: attendee.id,
      eventId: attendee.eventId,
      eventName: attendee.event.name,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      profile: attendee.profile,
      tradingCard: attendee.tradingCard,
      rsvpStatus: attendee.rsvpStatus,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
