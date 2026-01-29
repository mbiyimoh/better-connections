import { redirect } from 'next/navigation';
import { getCurrentUser, isM33tInvitee, canAccessBetterContacts } from '@/lib/auth-helpers';
import { GuestShell } from '@/components/guest/GuestShell';

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // If user can access Better Contacts, they can still view guest pages
  // but they also have full BC access
  // M33T-only invitees are restricted to guest pages

  return (
    <GuestShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: null, // Add avatar URL if available
      }}
    >
      {children}
    </GuestShell>
  );
}
