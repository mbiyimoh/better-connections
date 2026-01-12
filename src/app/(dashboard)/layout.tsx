import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout';
import { prisma } from '@/lib/db';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { getLatestUpdate } from '@/lib/updates';
import { WhatsNewProvider } from '@/components/whats-new';

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
  let lastSeenUpdateVersion: string | null = null;

  try {
    // Get user's onboarding status, contact counts, and update version in parallel
    const [dbUser, totalContacts, enrichQueue] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          hasCompletedOnboarding: true,
          lastSeenUpdateVersion: true,
        },
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
    lastSeenUpdateVersion = dbUser?.lastSeenUpdateVersion ?? null;
    contactCount = totalContacts;
    enrichQueueCount = enrichQueue;
  } catch {
    // Database might not be connected yet during development
    console.warn('Could not fetch user data');
  }

  // Get latest update for What's New modal
  const latestUpdate = getLatestUpdate();

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
      {/* Hide on mobile - ContactsView handles its own FeedbackButton for mobile */}
      <FeedbackButton hideOnMobile />
      {/* What's New modal - shows when new updates are available */}
      <WhatsNewProvider
        latestUpdate={latestUpdate}
        userLastSeenVersion={lastSeenUpdateVersion}
      />
    </AppShell>
  );
}
