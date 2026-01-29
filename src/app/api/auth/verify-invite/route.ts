import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { eventId, email } = await request.json();

    if (!eventId || !email) {
      return NextResponse.json(
        { error: 'Event ID and email are required' },
        { status: 400 }
      );
    }

    // Find the attendee by event and email
    const attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId,
        email: { equals: email, mode: 'insensitive' },
      },
      include: {
        event: {
          select: { id: true, name: true },
        },
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'No invitation found for this email' },
        { status: 404 }
      );
    }

    // Get current user if authenticated
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser) {
      // User is already authenticated - link attendee to user
      let user = await prisma.user.findUnique({
        where: { id: supabaseUser.id },
      });

      if (!user) {
        // Create user if doesn't exist
        user = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: attendee.firstName + (attendee.lastName ? ` ${attendee.lastName}` : ''),
            accountOrigin: 'M33T_INVITEE',
          },
        });
      }

      // Link attendee to user
      await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: { userId: user.id },
      });

      return NextResponse.json({
        success: true,
        eventName: attendee.event.name,
        eventId: attendee.event.id,
        needsPhoneVerification: !user.phoneVerified,
      });
    }

    // User not authenticated - return info about the event so frontend can handle OAuth flow
    return NextResponse.json({
      success: true,
      requiresAuth: true,
      eventName: attendee.event.name,
      eventId: attendee.event.id,
      attendeeFirstName: attendee.firstName,
    });
  } catch (error) {
    console.error('Error verifying invite:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
