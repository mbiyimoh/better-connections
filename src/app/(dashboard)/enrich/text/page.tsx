'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ChevronRight,
  ArrowRight,
  Save,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials, getAvatarColor } from '@/types/contact';

interface EnrichedContact extends Contact {
  priority: number;
  priorityLevel: 'high' | 'medium' | 'low';
  enrichmentReason: string;
}

interface QueueResponse {
  contacts: EnrichedContact[];
  total: number;
}

const priorityColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function EnrichTextPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [queue, setQueue] = useState<EnrichedContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the currently loaded contact ID to prevent re-fetching
  const loadedContactIdRef = useRef<string | null>(null);
  const hasAutoSelectedRef = useRef(false);

  // Form state for enrichment fields
  const [formData, setFormData] = useState({
    whyNow: '',
    howWeMet: '',
    expertise: '',
    interests: '',
    notes: '',
  });

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      setIsLoadingQueue(true);
      const res = await fetch('/api/enrichment/queue?limit=50');
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data: QueueResponse = await res.json();
      setQueue(data.contacts);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError('Failed to load enrichment queue');
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  // Fetch specific contact
  const fetchContact = useCallback(async (id: string, force = false) => {
    // Skip if already loaded this contact (unless forced)
    if (!force && loadedContactIdRef.current === id) {
      return;
    }

    try {
      setIsLoadingContact(true);
      loadedContactIdRef.current = id;
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      const contact: Contact = await res.json();
      setSelectedContact(contact);
      setFormData({
        whyNow: contact.whyNow || '',
        howWeMet: contact.howWeMet || '',
        expertise: contact.expertise || '',
        interests: contact.interests || '',
        notes: contact.notes || '',
      });
    } catch (err) {
      console.error('Error fetching contact:', err);
      loadedContactIdRef.current = null;
      toast({
        title: 'Error',
        description: 'Failed to load contact',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingContact(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle ?id= parameter
  useEffect(() => {
    const contactId = searchParams.get('id');
    if (contactId) {
      fetchContact(contactId);
    } else if (queue.length > 0 && !hasAutoSelectedRef.current) {
      // Auto-select first contact if none specified (only once)
      hasAutoSelectedRef.current = true;
      const firstContact = queue[0];
      if (firstContact) {
        fetchContact(firstContact.id);
        router.replace(`/enrich/text?id=${firstContact.id}`, { scroll: false });
      }
    }
  }, [searchParams, queue, fetchContact, router]);

  // Select contact from queue
  const handleSelectContact = (contact: EnrichedContact) => {
    router.push(`/enrich/text?id=${contact.id}`, { scroll: false });
  };

  // Save enrichment
  const handleSave = async () => {
    if (!selectedContact) return;

    setIsSaving(true);
    try {
      // Prepare update data
      const updateData = {
        ...formData,
        lastEnrichedAt: new Date().toISOString(),
      };

      // Intelligently merge notes with AI if content was modified
      const existingNotes = selectedContact.notes || '';
      const notesChanged = formData.notes !== existingNotes;
      let notesChangeSummary = '';
      if (notesChanged && formData.notes && formData.notes.trim().length >= 20) {
        try {
          const refineRes = await fetch('/api/enrichment/refine-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              existingNotes,
              newContent: formData.notes,
            }),
          });
          if (refineRes.ok) {
            const { refinedNotes, changeSummary } = await refineRes.json();
            updateData.notes = refinedNotes || formData.notes;
            notesChangeSummary = changeSummary || '';
          }
        } catch (refineError) {
          console.error('Failed to merge notes, using raw:', refineError);
        }
      }

      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast({
        title: 'Saved',
        description: notesChangeSummary
          ? `Notes updated: ${notesChangeSummary}`
          : 'Contact enrichment saved successfully',
      });

      // Refresh queue and contact (force refresh)
      await fetchQueue();
      await fetchContact(selectedContact.id, true);
    } catch (err) {
      console.error('Error saving:', err);
      toast({
        title: 'Error',
        description: 'Failed to save enrichment',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Move to next contact
  const handleNext = async () => {
    await handleSave();
    const currentIndex = queue.findIndex((c) => c.id === selectedContact?.id);
    const nextContact = queue[currentIndex + 1] || queue[0];
    if (nextContact && nextContact.id !== selectedContact?.id) {
      router.push(`/enrich/text?id=${nextContact.id}`, { scroll: false });
    }
  };

  // Calculate potential score increase
  const calculateScoreIncrease = (): number => {
    if (!selectedContact) return 0;
    let increase = 0;
    if (formData.whyNow && !selectedContact.whyNow) increase += 20;
    if (formData.howWeMet && !selectedContact.howWeMet) increase += 15;
    if (formData.notes && !selectedContact.notes) increase += 5;
    return increase;
  };

  if (isLoadingQueue) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-text-secondary">{error}</p>
        <Button onClick={fetchQueue}>Try Again</Button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
        <h1 className="mb-2 text-[28px] font-bold text-white">All Caught Up!</h1>
        <p className="mb-6 text-text-tertiary">All your contacts are fully enriched</p>
        <Button asChild>
          <Link href="/contacts">View Contacts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Queue Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-border bg-bg-primary overflow-hidden flex flex-col">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-gold-primary" />
            Enrichment Queue
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            {queue.length} contacts need attention
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queue.map((contact) => (
            <button
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className={cn(
                'w-full border-b border-border p-4 text-left transition-colors hover:bg-bg-secondary',
                selectedContact?.id === contact.id && 'bg-bg-secondary border-l-2 border-l-gold-primary'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback
                    style={{ background: getAvatarColor(contact) }}
                    className="text-sm font-medium text-white/90"
                  >
                    {getInitials(contact)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-white">
                      {getDisplayName(contact)}
                    </p>
                    <span className="text-xs text-text-tertiary">
                      {contact.enrichmentScore}%
                    </span>
                  </div>
                  {contact.company && (
                    <p className="truncate text-sm text-text-tertiary">
                      {contact.company}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        priorityColors[contact.priorityLevel]
                      )}
                    >
                      {contact.priorityLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-tertiary line-clamp-1">
                    {contact.enrichmentReason}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Enrichment Form */}
      <div className="flex-1 overflow-y-auto bg-bg-primary p-6">
        {isLoadingContact ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold-primary" />
          </div>
        ) : selectedContact ? (
          <div className="mx-auto max-w-2xl">
            {/* Voice Mode Banner */}
            <div className="mb-6 rounded-lg border border-gold-primary/30 bg-gold-subtle p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5 text-gold-primary" />
                <span className="text-sm text-gold-primary">
                  Prefer to speak? Try our voice-first enrichment experience.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-gold-primary/50 text-gold-primary hover:bg-gold-primary hover:text-black"
                asChild
              >
                <Link href={`/enrichment/session?contact=${selectedContact.id}`}>
                  Use Voice Mode
                </Link>
              </Button>
            </div>

            {/* Contact Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback
                    style={{ background: getAvatarColor(selectedContact) }}
                    className="text-xl font-semibold text-white/90"
                  >
                    {getInitials(selectedContact)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {getDisplayName(selectedContact)}
                  </h1>
                  {(selectedContact.title || selectedContact.company) && (
                    <p className="text-text-secondary">
                      {selectedContact.title}
                      {selectedContact.title && selectedContact.company && ' at '}
                      {selectedContact.company}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/contacts/${selectedContact.id}`}
                className="text-sm text-text-secondary hover:text-gold-primary"
              >
                View Full Profile
              </Link>
            </div>

            {/* Score Progress */}
            <div className="mb-8 rounded-xl border border-border bg-bg-secondary p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">
                  Enrichment Score
                </span>
                <span className="font-semibold text-white">
                  {selectedContact.enrichmentScore}%
                  {calculateScoreIncrease() > 0 && (
                    <span className="ml-2 text-green-400">
                      +{calculateScoreIncrease()}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold-primary transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      selectedContact.enrichmentScore + calculateScoreIncrease(),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Enrichment Fields */}
            <div className="space-y-6">
              {/* Why Now - Most Important */}
              <div className="rounded-xl border border-gold-primary/30 bg-gold-subtle p-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold-primary">
                  <Sparkles className="h-4 w-4" />
                  Why Now (+20 points)
                </label>
                <p className="mb-3 text-sm text-text-secondary">
                  What makes this person relevant to you right now? Any timely opportunities?
                </p>
                <Textarea
                  value={formData.whyNow}
                  onChange={(e) => setFormData({ ...formData, whyNow: e.target.value })}
                  placeholder="e.g., Just raised Series A, looking to hire engineers..."
                  className="min-h-[100px] border-gold-primary/30 bg-bg-primary focus:border-gold-primary"
                />
              </div>

              {/* How We Met */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  <User className="h-4 w-4" />
                  How We Met (+15 points)
                </label>
                <p className="mb-3 text-sm text-text-secondary">
                  Where did you meet? What was the context?
                </p>
                <Textarea
                  value={formData.howWeMet}
                  onChange={(e) => setFormData({ ...formData, howWeMet: e.target.value })}
                  placeholder="e.g., Met at TechCrunch Disrupt 2024, they were demoing their product..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Expertise */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Expertise
                </label>
                <p className="mb-3 text-sm text-text-secondary">
                  What are they exceptionally good at?
                </p>
                <Textarea
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  placeholder="e.g., Deep experience in B2B SaaS sales, especially enterprise deals..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Interests */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Interests
                </label>
                <p className="mb-3 text-sm text-text-secondary">
                  Personal interests, hobbies, conversation starters
                </p>
                <Textarea
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="e.g., Big into rock climbing, also a wine collector..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Notes (+5 points)
                </label>
                <p className="mb-3 text-sm text-text-secondary">
                  Anything else worth remembering
                </p>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context, follow-ups needed, etc..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
              <Button onClick={handleNext} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Save & Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <User className="mb-4 h-12 w-12 text-text-tertiary" />
            <p className="text-text-secondary">Select a contact from the queue</p>
          </div>
        )}
      </div>
    </div>
  );
}
