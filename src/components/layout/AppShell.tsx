'use client';

import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
  contactCount?: number;
  enrichQueueCount?: number;
  hasM33tAccess?: boolean;
}

export function AppShell({ children, user, contactCount, enrichQueueCount, hasM33tAccess }: AppShellProps) {
  return (
    <div className="flex h-screen bg-bg-primary font-sans">
      <Sidebar
        user={user}
        contactCount={contactCount}
        enrichQueueCount={enrichQueueCount}
        hasM33tAccess={hasM33tAccess}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
