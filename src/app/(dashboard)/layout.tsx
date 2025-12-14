import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout';
import { prisma } from '@/lib/db';

export default async function DashboardLayout({
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

  // Get contact counts for sidebar badges
  let contactCount = 0;
  let enrichQueueCount = 0;

  try {
    // Get total contacts for user
    contactCount = await prisma.contact.count({
      where: { userId: user.id },
    });

    // Get contacts needing enrichment (score < 50)
    enrichQueueCount = await prisma.contact.count({
      where: {
        userId: user.id,
        enrichmentScore: { lt: 50 },
      },
    });
  } catch {
    // Database might not be connected yet during development
    console.warn('Could not fetch contact counts');
  }

  return (
    <AppShell
      user={{
        name: user.user_metadata?.name || user.email?.split('@')[0],
        email: user.email,
      }}
      contactCount={contactCount}
      enrichQueueCount={enrichQueueCount}
    >
      {children}
    </AppShell>
  );
}
