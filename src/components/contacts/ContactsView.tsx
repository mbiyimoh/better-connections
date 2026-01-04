'use client';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { ContactCardList } from './ContactCardList';
import { ContactsTable } from './ContactsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { FAB } from '@/components/ui/FAB';
import { Plus } from 'lucide-react';
import type { Contact } from '@/types/contact';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Viewport-aware component that switches between:
 * - ContactCardList on mobile (<768px)
 * - ContactsTable on desktop (>=768px)
 */
export function ContactsView() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mobile view state (ContactsTable has its own state)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const sortField = searchParams.get('sort') || 'lastName';
  const sortOrder = searchParams.get('order') || 'asc';

  // Fetch contacts for mobile view
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '500', // Load more on mobile since we'll virtualize later
        sort: sortField,
        order: sortOrder,
      });
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortField, sortOrder]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchContacts();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchContacts]);

  // Only fetch when mobile and when params change
  useEffect(() => {
    if (isMobile) {
      fetchContacts();
    }
  }, [isMobile, fetchContacts]);

  // Show skeleton during SSR/hydration to avoid layout shift
  if (isMobile === undefined) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <ContactCardList
          contacts={contacts}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <FAB
          icon={<Plus className="h-6 w-6 text-black" />}
          label="Add contact"
          onClick={() => router.push('/contacts/new')}
        />
      </>
    );
  }

  return <ContactsTable />;
}
