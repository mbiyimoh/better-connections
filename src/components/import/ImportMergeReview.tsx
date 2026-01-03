'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info, Zap } from 'lucide-react';
import type { DuplicateAnalysis, DuplicateResolution } from '@/lib/vcf-import-types';

// Re-export for consumers
export type { DuplicateResolution } from '@/lib/vcf-import-types';

interface ImportMergeReviewProps {
  duplicates: DuplicateAnalysis[];
  onConfirm: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  title: 'Title',
  company: 'Company',
  primaryPhone: 'Primary Phone',
  secondaryPhone: 'Secondary Phone',
  linkedinUrl: 'LinkedIn',
  websiteUrl: 'Website',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  country: 'Country',
};

export function ImportMergeReview({
  duplicates,
  onConfirm,
  onCancel,
}: ImportMergeReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, DuplicateResolution>>(
    () => {
      // Initialize all resolutions with default "keep existing"
      const map = new Map<string, DuplicateResolution>();
      for (const dup of duplicates) {
        map.set(dup.existing.id, {
          existingContactId: dup.existing.id,
          incoming: dup.incoming,
          action: 'merge',
          fieldDecisions: dup.conflicts.map(c => ({
            field: c.field,
            choice: 'keep' as const,
          })),
        });
      }
      return map;
    }
  );

  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation - must be before any returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onCancel();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < duplicates.length - 1) {
            setCurrentIndex(i => i + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, duplicates.length, onCancel]);

  // Focus management - must be before any returns
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Get current duplicate with bounds checking (after hooks)
  const current = duplicates[currentIndex];

  // Early return if no duplicates (shouldn't happen, but TypeScript needs this)
  if (!current) {
    return null;
  }

  const currentResolution = resolutions.get(current.existing.id);

  // If no resolution found (shouldn't happen), return null
  if (!currentResolution) {
    return null;
  }

  const updateFieldDecision = (field: string, choice: 'keep' | 'use_new') => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const dup = duplicates[currentIndex];
      if (!dup) return prev;
      const currentRes = updated.get(dup.existing.id);
      if (!currentRes) return prev;
      const newDecisions = currentRes.fieldDecisions?.map(d =>
        d.field === field ? { ...d, choice } : d
      ) || [];
      updated.set(dup.existing.id, {
        ...currentRes,
        fieldDecisions: newDecisions,
      });
      return updated;
    });
  };

  const skipCurrentContact = () => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const dup = duplicates[currentIndex];
      if (!dup) return prev;
      const currentRes = updated.get(dup.existing.id);
      if (!currentRes) return prev;
      updated.set(dup.existing.id, {
        ...currentRes,
        action: 'skip',
      });
      return updated;
    });

    // Move to next if not at end
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const undoSkip = () => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const dup = duplicates[currentIndex];
      if (!dup) return prev;
      const currentRes = updated.get(dup.existing.id);
      if (!currentRes) return prev;
      updated.set(dup.existing.id, {
        ...currentRes,
        action: 'merge',
      });
      return updated;
    });
  };

  const acceptAllDefaults = () => {
    // All resolutions already default to "keep existing"
    onConfirm(Array.from(resolutions.values()));
  };

  const handleConfirm = () => {
    onConfirm(Array.from(resolutions.values()));
  };

  // Count duplicates that haven't been skipped yet (for Skip All button)
  const unskippedCount = Array.from(resolutions.values()).filter(
    r => r.action !== 'skip'
  ).length;

  const handleSkipAllRemaining = () => {
    // Create all-skipped resolutions and confirm immediately
    const allSkipped = Array.from(resolutions.values()).map(r => ({
      ...r,
      action: 'skip' as const,
    }));
    onConfirm(allSkipped);
  };

  const isSkipped = currentResolution.action === 'skip';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl outline-none max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-review-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
          <h2 id="merge-review-title" className="text-lg font-semibold text-white">
            Review Import Conflicts
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-zinc-400 mb-6">
            {duplicates.length} contact{duplicates.length !== 1 ? 's' : ''} already exist in your network.
            Review what should be updated.
          </p>

          {/* Contact Card */}
          <div className={`rounded-lg border p-4 ${
            isSkipped ? 'border-zinc-700 bg-zinc-800/30 opacity-50' : 'border-zinc-700 bg-zinc-800/50'
          }`}>
            {/* Contact Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-white">
                  {current.existing.firstName} {current.existing.lastName}
                </h3>
                <p className="text-sm text-zinc-400">{current.existing.primaryEmail}</p>
              </div>
              <span className="text-sm text-zinc-500">
                {currentIndex + 1} / {duplicates.length}
              </span>
            </div>

            {isSkipped ? (
              <div className="text-center py-4">
                <p className="text-zinc-500">This contact will be skipped</p>
                <button
                  onClick={undoSkip}
                  className="mt-2 text-sm text-[#C9A227] hover:underline"
                >
                  Undo skip
                </button>
              </div>
            ) : (
              <>
                {/* Conflicts */}
                {current.conflicts.length > 0 ? (
                  <div className="space-y-4">
                    {current.conflicts.map(conflict => {
                      const decision = currentResolution.fieldDecisions?.find(
                        d => d.field === conflict.field
                      );
                      return (
                        <div key={conflict.field} className="space-y-2">
                          <label className="text-sm font-medium text-zinc-300">
                            {FIELD_LABELS[conflict.field] || conflict.field}
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`${current.existing.id}-${conflict.field}`}
                                checked={decision?.choice === 'keep'}
                                onChange={() => updateFieldDecision(conflict.field, 'keep')}
                                className="w-4 h-4 accent-[#C9A227]"
                              />
                              <span className="text-sm text-white truncate max-w-xs">
                                Keep: &quot;{conflict.existingValue}&quot;
                              </span>
                              <span className="text-xs text-zinc-500">(existing)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`${current.existing.id}-${conflict.field}`}
                                checked={decision?.choice === 'use_new'}
                                onChange={() => updateFieldDecision(conflict.field, 'use_new')}
                                className="w-4 h-4 accent-[#C9A227]"
                              />
                              <span className="text-sm text-green-400 truncate max-w-xs">
                                Use: &quot;{conflict.incomingValue}&quot;
                              </span>
                              <span className="text-xs text-zinc-500">(incoming)</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 py-4">
                    No conflicts - empty fields will be filled automatically.
                  </p>
                )}

                {/* Auto-merge info */}
                {current.autoMergeFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="flex items-start gap-2 text-sm text-blue-400">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Notes will be appended to existing content</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={skipCurrentContact}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Skip this contact
            </button>
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={currentIndex === duplicates.length - 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={acceptAllDefaults}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Accept All Defaults
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 rounded-lg bg-[#C9A227] text-black font-medium hover:bg-[#E5C766] transition-colors"
            >
              Apply & Import
            </button>
          </div>

          {/* Skip All Remaining button */}
          {unskippedCount > 0 && (
            <button
              onClick={handleSkipAllRemaining}
              className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700
                         border border-zinc-600 rounded-lg text-zinc-300
                         flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Skip All Remaining ({unskippedCount} duplicate{unskippedCount !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
