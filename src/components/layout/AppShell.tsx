'use client';

import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  contactCount?: number;
  enrichQueueCount?: number;
}

export function AppShell({ children, user, contactCount, enrichQueueCount }: AppShellProps) {
  return (
    <div className="flex h-screen bg-bg-primary font-sans">
      <Sidebar
        user={user}
        contactCount={contactCount}
        enrichQueueCount={enrichQueueCount}
      />
      {/* Add bottom padding on mobile for bottom nav (64px + safe area) */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>

      {/* Bottom nav - mobile only (hidden on md: and above) */}
      <BottomNav />
    </div>
  );
}
