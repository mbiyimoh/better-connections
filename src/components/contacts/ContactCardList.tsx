'use client';

import type { CSSProperties, ReactElement } from 'react';
import { useRef, useState, useCallback } from 'react';
import { List, type ListImperativeAPI } from 'react-window';
import { ContactCard } from './ContactCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Contact } from '@/types/contact';

const CARD_HEIGHT = 100;
const CARD_GAP = 12;

interface ContactCardListProps {
  contacts: Contact[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

// Row props that will be passed via rowProps
interface ContactRowProps {
  contacts: Contact[];
  expandedId: string | null;
  onExpand: (id: string) => void;
}

// Row component for virtualized list - receives rowProps merged with index/style/ariaAttributes
function ContactRow(props: {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & ContactRowProps): ReactElement {
  const { index, style, contacts, expandedId, onExpand } = props;
  const contact = contacts[index];
  return (
    <div style={{ ...style, paddingLeft: 16, paddingRight: 16, paddingBottom: CARD_GAP }}>
      {contact && (
        <ContactCard
          contact={contact}
          isExpanded={expandedId === contact.id}
          onExpand={onExpand}
        />
      )}
    </div>
  );
}

export function ContactCardList({
  contacts,
  isLoading,
  onRefresh,
  isRefreshing,
}: ContactCardListProps) {
  const listRef = useRef<ListImperativeAPI>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Toggle expand - clicking same card collapses it
  const handleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
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

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Users className="h-16 w-16 text-text-tertiary opacity-30 mb-4" />
        <p className="text-xl font-semibold text-text-primary mb-2">
          Welcome to Better Connections
        </p>
        <p className="text-base text-text-secondary text-center mb-8 max-w-xs">
          Import your existing contacts to get started.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button asChild size="lg" className="w-full bg-gold-primary hover:bg-gold-light text-black">
            <Link href="/contacts/import">
              <Upload className="mr-2 h-5 w-5" />
              Import Contacts
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
            <Link href="/contacts/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Or add manually
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="h-[calc(100vh-180px)]">
      <List<ContactRowProps>
        listRef={listRef}
        rowComponent={ContactRow}
        rowCount={contacts.length}
        rowHeight={CARD_HEIGHT + CARD_GAP}
        rowProps={{ contacts, expandedId, onExpand: handleExpand }}
        overscanCount={5}
        className="w-full h-full"
      />
    </div>
  );

  if (onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh} isRefreshing={isRefreshing}>
        {content}
      </PullToRefresh>
    );
  }

  return content;
}
