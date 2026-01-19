import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

/**
 * Events Layout - Server-side access protection
 *
 * Redirects unauthorized users before they reach any events pages.
 * This provides defense-in-depth alongside API route protection.
 */
export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check M33T access
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hasM33tAccess: true },
  });

  if (!dbUser?.hasM33tAccess) {
    // Redirect to contacts page - they don't have M33T access
    redirect('/contacts');
  }

  return <>{children}</>;
}
