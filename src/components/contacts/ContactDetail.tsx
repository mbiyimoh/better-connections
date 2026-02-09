'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contact';
import { getDisplayName } from '@/types/contact';
import { SECTION_FIELDS } from '@/lib/validations/contact-sections';
import { useInlineEdit } from './hooks/useInlineEdit';
import { EnrichmentScoreCard } from './EnrichmentScoreCard';
import { TagsSection } from './TagsSection';
import {
  ProfileHeaderSection,
  ContactInfoSection,
  SocialLinksSection,
  RelationshipSection,
  WhyNowSection,
  ExpertiseInterestsSection,
  NotesSection,
} from './sections';
import { ResearchButton, type Recommendation } from '@/components/research';
import { ResearchApplyCelebration } from '@/components/research/ResearchApplyCelebration';
import { ResearchRunHistory } from '@/components/research/ResearchRunHistory';
import type { ResearchRunTileData } from '@/components/research/ResearchRunTile';

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

  // Handle score improvement celebration from inline editing
  const handleScoreImproved = useCallback(async (previousScore: number, newScore: number) => {
    try {
      const rankRes = await fetch(`/api/contacts/${contact.id}/ranking`);
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        const scoreDelta = newScore - previousScore;
        const estimatedPreviousRank = Math.min(
          rankData.currentRank + Math.ceil(scoreDelta / 5),
          rankData.totalContacts
        );
        setCelebrationData({
          previousScore,
          newScore,
          appliedChangesSummary: ['Updated profile fields'],
          currentRank: rankData.currentRank,
          previousRank: estimatedPreviousRank,
        });
      } else {
        setCelebrationData({
          previousScore,
          newScore,
          appliedChangesSummary: ['Updated profile fields'],
          currentRank: 1,
          previousRank: 1,
        });
      }
    } catch {
      setCelebrationData({
        previousScore,
        newScore,
        appliedChangesSummary: ['Updated profile fields'],
        currentRank: 1,
        previousRank: 1,
      });
    }
  }, [contact.id]);

  // Inline editing hook
  const {
    editingSection,
    startEditing,
    formData,
    updateField,
    saveSection,
    cancelEdit,
    isSaving,
    localContact,
  } = useInlineEdit({
    contact,
    onScoreImproved: handleScoreImproved,
  });

  // Refresh contact data after tag changes
  const handleTagAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  // Handle successful apply from research - show celebration if score improved
  const handleApplySuccess = useCallback(async (data: {
    previousScore: number;
    newScore: number;
    appliedChangesSummary: string[];
  }) => {
    if (data.newScore > data.previousScore) {
      try {
        const rankRes = await fetch(`/api/contacts/${contact.id}/ranking`);
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const scoreDelta = data.newScore - data.previousScore;
          const estimatedPreviousRank = Math.min(
            rankData.currentRank + Math.ceil(scoreDelta / 5),
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
          setCelebrationData({
            previousScore: data.previousScore,
            newScore: data.newScore,
            appliedChangesSummary: data.appliedChangesSummary,
            currentRank: 1,
            previousRank: 1,
          });
        }
      } catch {
        setCelebrationData({
          previousScore: data.previousScore,
          newScore: data.newScore,
          appliedChangesSummary: data.appliedChangesSummary,
          currentRank: 1,
          previousRank: 1,
        });
      }
    } else {
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

  // Handle EnrichmentScoreCard suggestion click
  const handleEditSection = useCallback((sectionId: string) => {
    startEditing(sectionId);
  }, [startEditing]);

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
        <div className="mb-8">
          <ProfileHeaderSection
            contact={localContact}
            isEditing={editingSection === 'profileHeader'}
            onEditStart={() => startEditing('profileHeader')}
            onSave={async () => { await saveSection('profileHeader', SECTION_FIELDS.profileHeader); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>

        {/* Enrichment Score Card */}
        <div className="mb-6">
          <EnrichmentScoreCard contact={localContact} onEditSection={handleEditSection} />
        </div>

        {/* Action Buttons: Enrich & Research */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <Button
            className="flex-1 bg-gold-primary hover:bg-gold-light text-bg-primary font-semibold"
            asChild
          >
            <Link href={`/enrichment/session?contact=${localContact.id}`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrich: Personal Context
            </Link>
          </Button>
          <ResearchButton
            contactId={localContact.id}
            contactName={`${localContact.firstName} ${localContact.lastName || ''}`.trim()}
            disabled={!localContact.firstName || !localContact.lastName}
            className="flex-1"
            label="Enrich: Online Research"
            autoOpen={autoOpenResearch}
          />
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <TagsSection contact={localContact} onTagAdded={handleTagAdded} />
        </div>

        {/* Celebration UI - shows after successful apply with score improvement */}
        <AnimatePresence>
          {celebrationData && (
            <div className="mb-6">
              <ResearchApplyCelebration
                previousScore={celebrationData.previousScore}
                newScore={celebrationData.newScore}
                appliedChangesSummary={celebrationData.appliedChangesSummary}
                contactName={getDisplayName(localContact)}
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
              contactId={localContact.id}
              onApplySuccess={handleApplySuccess}
            />
          </div>
        )}

        {/* Why Now - Key Section (always visible) */}
        <div className="mb-6">
          <WhyNowSection
            contact={localContact}
            isEditing={editingSection === 'whyNow'}
            onEditStart={() => startEditing('whyNow')}
            onSave={async () => { await saveSection('whyNow', SECTION_FIELDS.whyNow); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />
        </div>

        {/* Two-column grid for Contact Info and Relationship */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <ContactInfoSection
            contact={localContact}
            isEditing={editingSection === 'contactInfo'}
            onEditStart={() => startEditing('contactInfo')}
            onSave={async () => { await saveSection('contactInfo', SECTION_FIELDS.contactInfo); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />

          <RelationshipSection
            contact={localContact}
            isEditing={editingSection === 'relationship'}
            onEditStart={() => startEditing('relationship')}
            onSave={async () => { await saveSection('relationship', SECTION_FIELDS.relationship); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />
        </div>

        {/* Two-column grid for Social Links and Expertise/Interests */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <SocialLinksSection
            contact={localContact}
            isEditing={editingSection === 'socialLinks'}
            onEditStart={() => startEditing('socialLinks')}
            onSave={async () => { await saveSection('socialLinks', SECTION_FIELDS.socialLinks); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />

          <ExpertiseInterestsSection
            contact={localContact}
            isEditing={editingSection === 'expertiseInterests'}
            onEditStart={() => startEditing('expertiseInterests')}
            onSave={async () => { await saveSection('expertiseInterests', SECTION_FIELDS.expertiseInterests); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <NotesSection
            contact={localContact}
            isEditing={editingSection === 'notes'}
            onEditStart={() => startEditing('notes')}
            onSave={async () => { await saveSection('notes', SECTION_FIELDS.notes); }}
            onCancel={cancelEdit}
            isSaving={isSaving}
            formData={formData}
            updateField={updateField}
          />
        </div>
      </div>
    </div>
  );
}
