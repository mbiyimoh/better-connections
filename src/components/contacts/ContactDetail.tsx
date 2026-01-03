'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Building,
  Sparkles,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Contact, TagCategory } from '@/types/contact';
import { getDisplayName, getInitials as getContactInitials, getAvatarColor } from '@/types/contact';

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const categoryColors: Record<TagCategory, { bg: string; text: string; dot: string }> = {
  RELATIONSHIP: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  OPPORTUNITY: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  EXPERTISE: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  INTEREST: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
};

const strengthLabels = ['', 'Weak', 'Casual', 'Good', 'Strong'];

const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};

interface ContactDetailProps {
  contact: Contact;
}

export function ContactDetail({ contact }: ContactDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/contacts');
      router.refresh();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/contacts"
            className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Link>
        </div>

        {/* Profile Header */}
        <div className="mb-8 flex items-start justify-between rounded-xl border border-border bg-bg-secondary p-6">
          <div className="flex gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                style={{ background: getAvatarColor(contact) }}
                className="text-2xl font-semibold text-white/90"
              >
                {getContactInitials(contact)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white">{getDisplayName(contact)}</h1>
              {(contact.title || contact.company) && (
                <p className="mt-1 text-text-secondary">
                  {contact.title}
                  {contact.title && contact.company && ' at '}
                  {contact.company}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {contact.tags.map((tag) => {
                  const colors = categoryColors[tag.category];
                  return (
                    <span
                      key={tag.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        colors.bg,
                        colors.text
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                      {tag.text}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button
              className="bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
              asChild
            >
              <Link href={`/enrichment/session?contact=${contact.id}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Enrich
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Draft Intro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Why Now - Key Section */}
        {contact.whyNow && (
          <div className="mb-6 rounded-xl border border-gold-primary/30 bg-gold-subtle p-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold-primary">
              <Sparkles className="h-4 w-4" />
              Why Now
            </h2>
            <p className="text-white">{contact.whyNow}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Info */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Contact Information
            </h2>
            <div className="space-y-4">
              {contact.primaryEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-text-tertiary" />
                  <a href={`mailto:${contact.primaryEmail}`} className="text-white hover:text-gold-primary">
                    {contact.primaryEmail}
                  </a>
                </div>
              )}
              {contact.secondaryEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-text-tertiary opacity-50" />
                  <a href={`mailto:${contact.secondaryEmail}`} className="text-text-tertiary hover:text-gold-primary">
                    {contact.secondaryEmail}
                  </a>
                </div>
              )}
              {contact.primaryPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-text-tertiary" />
                  <a href={`tel:${contact.primaryPhone}`} className="text-white hover:text-gold-primary">
                    {contact.primaryPhone}
                  </a>
                </div>
              )}
              {contact.secondaryPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-text-tertiary opacity-50" />
                  <a href={`tel:${contact.secondaryPhone}`} className="text-text-tertiary hover:text-gold-primary">
                    {contact.secondaryPhone}
                  </a>
                </div>
              )}
              {contact.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-text-tertiary" />
                  <span className="text-text-secondary">{contact.location}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-text-tertiary" />
                  <span className="text-text-secondary">{contact.company}</span>
                </div>
              )}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-3">
                  <Linkedin className="h-4 w-4 text-text-tertiary" />
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gold-primary"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Relationship */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Relationship
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm text-text-tertiary">Strength</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                'h-2 w-6 rounded-full',
                                level <= contact.relationshipStrength
                                  ? 'bg-gold-primary'
                                  : 'bg-white/10'
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-text-secondary">
                          {strengthLabels[contact.relationshipStrength]}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{strengthDescriptions[contact.relationshipStrength]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {contact.howWeMet && (
                <div>
                  <p className="mb-1 text-sm text-text-tertiary">How We Met</p>
                  <p className="text-white">{contact.howWeMet}</p>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm text-text-tertiary">Last Contact</p>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Calendar className="h-4 w-4" />
                  {formatDate(contact.lastContactDate)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-text-tertiary">Enrichment Score</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gold-primary"
                      style={{ width: `${contact.enrichmentScore}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary">{contact.enrichmentScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(contact.expertise || contact.interests || contact.notes) && (
          <div className="mt-6 space-y-6">
            {contact.expertise && (
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Expertise
                </h2>
                <p className="text-white">{contact.expertise}</p>
              </div>
            )}
            {contact.interests && (
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Interests
                </h2>
                <p className="text-white">{contact.interests}</p>
              </div>
            )}
            {contact.notes && (
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Notes
                </h2>
                <p className="text-white whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
