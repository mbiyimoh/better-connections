'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
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
  Twitter,
  Github,
  Instagram,
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
import type { Contact } from '@/types/contact';
import { getDisplayName, getInitials as getContactInitials, getAvatarColor } from '@/types/contact';
import { EnrichmentScoreCard } from './EnrichmentScoreCard';
import { TagsSection } from './TagsSection';
import { ResearchButton, type Recommendation } from '@/components/research';
import { ResearchApplyCelebration } from '@/components/research/ResearchApplyCelebration';
import { ResearchRunHistory } from '@/components/research/ResearchRunHistory';
import type { ResearchRunTileData } from '@/components/research/ResearchRunTile';

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const strengthLabels = ['', 'Weak', 'Casual', 'Good', 'Strong'];

const strengthDescriptions: Record<number, string> = {
  1: "Distant connection - know through others or met briefly",
  2: "Friendly acquaintance - met a few times, positive rapport",
  3: "Solid relationship - regular contact, would help if asked",
  4: "Close connection - trusted relationship, can reach out anytime",
};

// Type for serialized research run from server
export interface SerializedResearchRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  appliedAt: string | null;
  appliedChangesSummary: string | null;
  previousScore: number | null;
  newScore: number | null;
  recommendations: Recommendation[];
}

// Celebration state
interface CelebrationData {
  previousScore: number;
  newScore: number;
  appliedChangesSummary: string[];
  currentRank: number;
  previousRank: number;
}

interface ContactDetailProps {
  contact: Contact;
  researchRuns?: SerializedResearchRun[];
  totalContacts?: number;
  autoOpenResearch?: boolean;
}

export function ContactDetail({ contact, researchRuns = [], totalContacts = 1, autoOpenResearch = false }: ContactDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  // Refresh contact data after tag changes
  const handleTagAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  // Handle successful apply - show celebration if score improved
  const handleApplySuccess = useCallback(async (data: {
    previousScore: number;
    newScore: number;
    appliedChangesSummary: string[];
  }) => {
    // Only show celebration if score improved
    if (data.newScore > data.previousScore) {
      // Fetch ranking data
      try {
        const rankRes = await fetch(`/api/contacts/${contact.id}/ranking`);
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          // Calculate approximate previous rank based on score improvement
          // This is an estimation - actual previous rank would need to be calculated before apply
          const scoreDelta = data.newScore - data.previousScore;
          const estimatedPreviousRank = Math.min(
            rankData.currentRank + Math.ceil(scoreDelta / 5), // Rough estimate: 5 points per rank position
            rankData.totalContacts
          );
          setCelebrationData({
            previousScore: data.previousScore,
            newScore: data.newScore,
            appliedChangesSummary: data.appliedChangesSummary,
            currentRank: rankData.currentRank,
            previousRank: estimatedPreviousRank,
          });
        } else {
          // Show celebration without rank data
          setCelebrationData({
            previousScore: data.previousScore,
            newScore: data.newScore,
            appliedChangesSummary: data.appliedChangesSummary,
            currentRank: 1,
            previousRank: 1,
          });
        }
      } catch {
        // Show celebration without rank data
        setCelebrationData({
          previousScore: data.previousScore,
          newScore: data.newScore,
          appliedChangesSummary: data.appliedChangesSummary,
          currentRank: 1,
          previousRank: 1,
        });
      }
    } else {
      // No score improvement - just show toast and refresh
      toast({
        title: 'Recommendations applied',
        description: `${data.appliedChangesSummary.length} changes made to profile`,
      });
      router.refresh();
    }
  }, [contact.id, router, toast]);

  // Handle celebration complete
  const handleCelebrationComplete = useCallback(() => {
    setCelebrationData(null);
    router.refresh();
  }, [router]);

  // Convert serialized research runs to tile data
  const researchRunTileData: ResearchRunTileData[] = researchRuns.map((run) => ({
    id: run.id,
    status: run.status,
    createdAt: new Date(run.createdAt),
    completedAt: run.completedAt ? new Date(run.completedAt) : null,
    appliedAt: run.appliedAt ? new Date(run.appliedAt) : null,
    appliedChangesSummary: run.appliedChangesSummary,
    previousScore: run.previousScore,
    newScore: run.newScore,
    summary: run.summary,
    fullReport: run.fullReport,
    sourceUrls: run.sourceUrls,
    executionTimeMs: run.executionTimeMs,
    recommendations: run.recommendations,
  }));

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
    <div className="h-full overflow-auto p-6 pl-16 md:pl-6">
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
              {(contact.title || contact.organizationalTitle || contact.company) && (
                <p className="mt-1 text-sm text-text-secondary">
                  {contact.organizationalTitle}
                  {contact.organizationalTitle && (contact.title || contact.company) && ', '}
                  {contact.title}
                  {contact.title && contact.company && ' at '}
                  {contact.company}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/contacts/${contact.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
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

        {/* Enrichment Score Card */}
        <div className="mb-6">
          <EnrichmentScoreCard contact={contact} />
        </div>

        {/* Action Buttons: Enrich & Research */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <Button
            className="flex-1 bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
            asChild
          >
            <Link href={`/enrichment/session?contact=${contact.id}`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrich: Personal Context
            </Link>
          </Button>
          <ResearchButton
            contactId={contact.id}
            contactName={`${contact.firstName} ${contact.lastName || ''}`.trim()}
            disabled={!contact.firstName || !contact.lastName}
            className="flex-1"
            label="Enrich: Online Research"
            autoOpen={autoOpenResearch}
          />
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <TagsSection contact={contact} onTagAdded={handleTagAdded} />
        </div>

        {/* Celebration UI - shows after successful apply with score improvement */}
        <AnimatePresence>
          {celebrationData && (
            <div className="mb-6">
              <ResearchApplyCelebration
                previousScore={celebrationData.previousScore}
                newScore={celebrationData.newScore}
                appliedChangesSummary={celebrationData.appliedChangesSummary}
                contactName={getDisplayName(contact)}
                currentRank={celebrationData.currentRank}
                previousRank={celebrationData.previousRank}
                totalContacts={totalContacts}
                onComplete={handleCelebrationComplete}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Research Run History */}
        {researchRunTileData.length > 0 && !celebrationData && (
          <div className="mb-6">
            <ResearchRunHistory
              researchRuns={researchRunTileData}
              contactId={contact.id}
              onApplySuccess={handleApplySuccess}
            />
          </div>
        )}

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
              {contact.twitterUrl && (
                <div className="flex items-center gap-3">
                  <Twitter className="h-4 w-4 text-text-tertiary" />
                  <a
                    href={contact.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gold-primary"
                  >
                    Twitter/X Profile
                  </a>
                </div>
              )}
              {contact.githubUrl && (
                <div className="flex items-center gap-3">
                  <Github className="h-4 w-4 text-text-tertiary" />
                  <a
                    href={contact.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gold-primary"
                  >
                    GitHub Profile
                  </a>
                </div>
              )}
              {contact.instagramUrl && (
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-text-tertiary" />
                  <a
                    href={contact.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gold-primary"
                  >
                    Instagram Profile
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
