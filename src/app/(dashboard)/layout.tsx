import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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

  // Check if user has completed onboarding
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isOnboardingPage = pathname.includes('/onboarding');

  // Get contact counts for sidebar badges
  let contactCount = 0;
  let enrichQueueCount = 0;
  let hasCompletedOnboarding = true; // Default to true to avoid redirect loop on error

  try {
    // Get user's onboarding status and contact counts in parallel
    const [dbUser, totalContacts, enrichQueue] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { hasCompletedOnboarding: true },
      }),
      prisma.contact.count({
        where: { userId: user.id },
      }),
      prisma.contact.count({
        where: {
          userId: user.id,
          enrichmentScore: { lt: 50 },
        },
      }),
    ]);

    hasCompletedOnboarding = dbUser?.hasCompletedOnboarding ?? true;
    contactCount = totalContacts;
    enrichQueueCount = enrichQueue;
  } catch {
    // Database might not be connected yet during development
    console.warn('Could not fetch user data');
  }

  // Redirect to onboarding if not completed and not already on onboarding page
  if (!hasCompletedOnboarding && !isOnboardingPage) {
    redirect('/onboarding');
  }

  // If on onboarding page, render without AppShell (full-screen experience)
  if (isOnboardingPage) {
    return <>{children}</>;
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
