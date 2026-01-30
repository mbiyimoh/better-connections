import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';

/**
 * Links an EventAttendee to the currently authenticated user.
 * Called after login/signup from the M33T RSVP completion flow.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attendeeId } = await request.json();

    if (!attendeeId) {
      return NextResponse.json(
        { error: 'attendeeId is required' },
        { status: 400 }
      );
    }

    const attendee = await prisma.eventAttendee.findUnique({
      where: { id: attendeeId },
      select: { id: true, email: true, userId: true },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Verify email match to prevent hijacking invitations
    if (attendee.email && user.email.toLowerCase() !== attendee.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      );
    }

    // Already linked to this user
    if (attendee.userId === user.id) {
      return NextResponse.json({ success: true, alreadyLinked: true });
    }

    // Already linked to a different user — don't overwrite
    if (attendee.userId && attendee.userId !== user.id) {
      return NextResponse.json(
        { error: 'Attendee is already linked to another account' },
        { status: 409 }
      );
    }

    // Link attendee to current user
    await prisma.eventAttendee.update({
      where: { id: attendeeId },
      data: { userId: user.id },
    });

    // Update user account origin if needed
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountOrigin: true },
    });

    if (dbUser?.accountOrigin === 'BETTER_CONTACTS') {
      // BC user linking to an event — no origin change needed
    } else if (!dbUser) {
      // Edge case: Create Prisma user for Supabase user
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split('@')[0],
          accountOrigin: 'M33T_INVITEE',
          betterContactsActivated: false,
          hasCompletedOnboarding: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error linking attendee:', error);
    return NextResponse.json(
      { error: 'Failed to link attendee' },
      { status: 500 }
    );
  }
}
