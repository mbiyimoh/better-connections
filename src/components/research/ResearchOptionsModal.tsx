'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Brain, Heart, Newspaper, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FocusArea } from '@/lib/research/types';
import { ResearchProgressView } from './ResearchProgressView';

interface FocusOption {
  id: FocusArea;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: 'professional',
    label: 'Professional Background',
    description: 'Career history, roles, and companies',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: 'expertise',
    label: 'Expertise & Skills',
    description: 'Domain knowledge and specializations',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'interests',
    label: 'Personal Interests',
    description: 'Hobbies, passions, and causes',
    icon: <Heart className="h-4 w-4" />,
  },
  {
    id: 'news',
    label: 'Recent News',
    description: 'Latest announcements and updates',
    icon: <Newspaper className="h-4 w-4" />,
  },
  // NOTE: 'social' option hidden until feature is more reliable
  // {
  //   id: 'social',
  //   label: 'Social Profiles',
  //   description: 'Twitter/X, GitHub, and Instagram profiles',
  //   icon: <Share2 className="h-4 w-4" />,
  // },
];

type ModalView = 'options' | 'progress';

interface ResearchOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onResearchComplete?: () => void;
}

export function ResearchOptionsModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  onResearchComplete,
}: ResearchOptionsModalProps) {
  const router = useRouter();
  const [selectedAreas, setSelectedAreas] = useState<FocusArea[]>([
    'professional',
    'expertise',
  ]);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ModalView>('options');
  const [runId, setRunId] = useState<string | null>(null);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  const toggleArea = (area: FocusArea) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleStartResearch = async () => {
    if (selectedAreas.length === 0) return;

    setIsResearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusAreas: selectedAreas }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Research failed');
      }

      const data = await response.json();

      // Store runId and switch to progress view
      setRunId(data.id);
      setView('progress');
      setIsResearching(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsResearching(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && view === 'progress') {
      // Show warning if trying to close during research
      setShowCloseWarning(true);
    } else if (!open) {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowCloseWarning(false);
    setView('options');
    setRunId(null);
    onClose();
  };

  const handleResearchComplete = () => {
    setView('options');
    setRunId(null);
    onResearchComplete?.();
    onClose();
    router.refresh();
  };

  const handleResearchError = (errorMessage: string) => {
    setError(errorMessage);
    setView('options');
    setRunId(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {view === 'options' ? (
            <>
              <DialogHeader>
                <DialogTitle>Research {contactName}</DialogTitle>
                <DialogDescription>
                  Select what you want to learn about this person. We&apos;ll search
                  the web and generate recommendations for their profile.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                {FOCUS_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedAreas.includes(option.id)
                        ? 'border-gold-primary bg-gold-subtle'
                        : 'border-border hover:border-gold-primary/50'
                    )}
                    onClick={() => !isResearching && toggleArea(option.id)}
                  >
                    <Checkbox
                      checked={selectedAreas.includes(option.id)}
                      disabled={isResearching}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <Label className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isResearching}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartResearch}
                  disabled={selectedAreas.length === 0 || isResearching}
                  className="gap-2"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Research'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Researching {contactName}</DialogTitle>
                <DialogDescription>
                  We&apos;re searching the web for information. This usually takes about a minute.
                </DialogDescription>
              </DialogHeader>
              <ResearchProgressView
                contactName={contactName}
                runId={runId!}
                contactId={contactId}
                onComplete={handleResearchComplete}
                onError={handleResearchError}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Close Warning Dialog */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Research in progress</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close? The research will continue in the
              background, but you won&apos;t see the progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep watching</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceClose}>
              Close anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
