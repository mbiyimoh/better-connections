'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  title: string | null;
  company: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AddAttendeesPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        // Fetch contacts with pagination (max 100 per page)
        const allContacts: Contact[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const res = await fetch(`/api/contacts?limit=100&page=${page}`);
          if (!res.ok) throw new Error('Failed to fetch contacts');
          const data = await res.json();
          allContacts.push(...data.contacts);
          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setContacts(allContacts);
      } catch (error) {
        toast.error('Failed to load contacts');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${contact.firstName} ${contact.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(query) ||
      contact.primaryEmail?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query)
    );
  });

  const toggleContact = useCallback((contactId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  }, [selectedIds.size, filteredContacts]);

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import contacts');
      }

      toast.success(
        `Added ${data.imported} attendee${data.imported !== 1 ? 's' : ''}` +
          (data.skipped > 0 ? ` (${data.skipped} already added)` : '') +
          (data.noEmail > 0 ? ` (${data.noEmail} missing email)` : '')
      );
      router.push(`/events/${eventId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  const contactsWithEmail = filteredContacts.filter((c) => c.primaryEmail);
  const allSelected = contactsWithEmail.length > 0 && selectedIds.size === contactsWithEmail.length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4" onClick={() => router.push(`/events/${eventId}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Event
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Add Attendees</h1>
        <p className="text-text-secondary">Select contacts from your list to add as attendees</p>
      </div>

      {/* Search & Actions */}
      <Card className="bg-bg-secondary border-border mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importing}
              className="bg-gold-primary hover:bg-gold-light text-bg-primary"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={contactsWithEmail.length === 0}
            />
            <label htmlFor="select-all" className="text-sm text-text-secondary cursor-pointer">
              Select all ({contactsWithEmail.length})
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Contact List */}
      <Card className="bg-bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-lg">Available Contacts</CardTitle>
          <CardDescription>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              {searchQuery ? 'No contacts match your search' : 'No contacts available'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
                const hasEmail = !!contact.primaryEmail;
                const isSelected = selectedIds.has(contact.id);

                return (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      hasEmail
                        ? 'cursor-pointer hover:bg-bg-tertiary/50'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isSelected ? 'bg-bg-tertiary/50' : ''}`}
                    onClick={() => hasEmail && toggleContact(contact.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!hasEmail}
                      onCheckedChange={() => toggleContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-bg-tertiary text-gold-primary">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">{fullName}</p>
                      <p className="text-text-secondary text-sm">
                        {contact.primaryEmail || 'No email'}
                        {contact.title && contact.company && (
                          <span className="text-text-tertiary"> • {contact.title} at {contact.company}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
