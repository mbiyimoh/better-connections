'use client';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { ContactCardList } from './ContactCardList';
import { ContactsTable } from './ContactsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { FAB } from '@/components/ui/FAB';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import type { Contact } from '@/types/contact';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';

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
  const [totalContacts, setTotalContacts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');

  const searchQuery = searchParams.get('search') || '';
  const sortField = searchParams.get('sort') || 'lastName';
  const sortOrder = searchParams.get('order') || 'asc';

  // Fetch contacts for mobile view
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100', // API max is 100; pagination can be added later
        sort: sortField,
        order: sortOrder,
      });
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');

      const data = await response.json();
      setContacts(data.contacts || []);
      setTotalContacts(data.pagination?.total || data.contacts?.length || 0);
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

  // Only fetch when explicitly mobile (not during undefined/transitional state)
  useEffect(() => {
    if (isMobile === true) {
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
    // Filter contacts by mobile search
    const filteredContacts = mobileSearch
      ? contacts.filter(c => {
          const search = mobileSearch.toLowerCase();
          return (
            c.firstName?.toLowerCase().includes(search) ||
            c.lastName?.toLowerCase().includes(search) ||
            c.primaryEmail?.toLowerCase().includes(search) ||
            c.company?.toLowerCase().includes(search)
          );
        })
      : contacts;

    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header - sticky at top */}
        <header className="sticky top-0 z-30 bg-bg-primary border-b border-border shrink-0">
          {/* Top row: hamburger space + right-aligned header text */}
          <div className="flex items-start justify-end p-4 pb-2">
            <div className="text-right">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
                01 — Your Network
              </p>
              <h1 className="text-xl font-semibold text-white">Contacts</h1>
            </div>
          </div>
          {/* Full-width search bar */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-10 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:border-gold-primary/50"
              />
              {mobileSearch && (
                <button
                  onClick={() => setMobileSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-text-tertiary" />
                </button>
              )}
            </div>
            {/* Results count */}
            <p className="text-xs text-text-tertiary mt-3">
              {mobileSearch
                ? `${filteredContacts.length} of ${totalContacts} contacts`
                : `${totalContacts} contacts`
              }
            </p>
          </div>
        </header>

        {/* Contact list - flex-1 + min-h-0, react-window handles its own scrolling */}
        <div className="flex-1 min-h-0">
          <ContactCardList
            contacts={filteredContacts}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Add Contact FAB (bottom-right, primary) */}
        <FAB
          icon={<Plus className="w-6 h-6" />}
          label="Add Contact"
          onClick={() => router.push('/contacts/new')}
        />

        {/* Feedback button (bottom-left, secondary) - elevated on contacts page */}
        <FeedbackButton hideOnScroll={false} variant="contacts-page" />
      </div>
    );
  }

  return <ContactsTable />;
}
