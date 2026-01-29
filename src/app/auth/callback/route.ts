import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/contacts';

  // M33T Invitee Auth params
  const isM33tInvitee = searchParams.get('m33t_invitee') === 'true';
  const attendeeId = searchParams.get('attendee_id');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      // Check if user exists in Prisma
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email },
      });

      if (existingUser) {
        // Existing user - link attendee if M33T flow
        if (isM33tInvitee && attendeeId) {
          await prisma.eventAttendee.update({
            where: { id: attendeeId },
            data: { userId: existingUser.id },
          });

          // Redirect with account linking message
          const redirectUrl = next.includes('?')
            ? `${next}&account_linked=true`
            : `${next}?account_linked=true`;
          return NextResponse.redirect(`${origin}${redirectUrl}`);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }

      // New user - create in Prisma
      const newUser = await prisma.user.create({
        data: {
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          // M33T Invitee: Set account origin and BC activation status
          accountOrigin: isM33tInvitee ? 'M33T_INVITEE' : 'BETTER_CONTACTS',
          betterContactsActivated: !isM33tInvitee, // false for M33T invitees
          hasCompletedOnboarding: isM33tInvitee, // Skip onboarding for M33T invitees
        },
      });

      // Link attendee to new user if M33T flow
      if (isM33tInvitee && attendeeId) {
        await prisma.eventAttendee.update({
          where: { id: attendeeId },
          data: { userId: newUser.id },
        });
      }

      // Redirect M33T invitees to guest dashboard, BC users to onboarding or contacts
      if (isM33tInvitee) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
