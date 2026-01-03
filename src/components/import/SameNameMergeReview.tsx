'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, ChevronRight, Merge, X } from 'lucide-react';
import type { SameNameGroup, SameNameDecision } from '@/lib/vcf-import-types';

// Re-export for consumers
export type { SameNameDecision } from '@/lib/vcf-import-types';

interface SameNameMergeReviewProps {
  groups: SameNameGroup[];
  onComplete: (decisions: Map<string, SameNameDecision>) => void;
  onBack: () => void;
}

export function SameNameMergeReview({
  groups,
  onComplete,
  onBack,
}: SameNameMergeReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, SameNameDecision>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onBack();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < groups.length - 1) {
            setCurrentIndex(i => i + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, groups.length, onBack]);

  // Guard for empty groups
  if (groups.length === 0) {
    return null;
  }

  const currentGroup = groups[currentIndex];
  if (!currentGroup) {
    return null;
  }

  const allContacts = [
    ...currentGroup.existingContacts.map(c => ({ ...c, isExisting: true })),
    ...currentGroup.newContacts.map(c => ({ ...c, isExisting: false })),
  ];

  const handleDecision = (decision: SameNameDecision) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(currentGroup.normalizedName, decision);
    setDecisions(newDecisions);

    // Auto-advance to next group
    if (currentIndex < groups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleComplete = () => {
    // Fill in any unreviewed groups with 'keep_separate' default
    const finalDecisions = new Map(decisions);
    for (const group of groups) {
      if (!finalDecisions.has(group.normalizedName)) {
        finalDecisions.set(group.normalizedName, { action: 'keep_separate' });
      }
    }
    onComplete(finalDecisions);
  };

  const unreviewedCount = groups.filter(g => !decisions.has(g.normalizedName)).length;
  const currentDecision = decisions.get(currentGroup.normalizedName);

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
        className="w-full max-w-3xl bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl outline-none max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="same-name-review-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
          <div>
            <h2 id="same-name-review-title" className="text-lg font-semibold text-white">
              Same Name Detected
            </h2>
            <p className="text-sm text-zinc-400">
              Reviewing {currentIndex + 1} of {groups.length} potential duplicate{groups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Group info */}
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-white capitalize">
                &quot;{currentGroup.normalizedName}&quot;
              </span>
              <span className="text-zinc-400">
                ({allContacts.length} contact{allContacts.length !== 1 ? 's' : ''})
              </span>
              {currentDecision && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  {currentDecision.action === 'merge' && 'Will Merge'}
                  {currentDecision.action === 'keep_separate' && 'Keep Separate'}
                  {currentDecision.action === 'skip_new' && 'Skip New'}
                </span>
              )}
            </div>

            {/* Contact cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    contact.isExisting
                      ? 'bg-zinc-700/50 border-zinc-600'
                      : 'bg-blue-900/20 border-blue-700/50'
                  }`}
                >
                  <div className="text-xs text-zinc-500 mb-1">
                    {contact.isExisting ? 'Existing' : 'New from import'}
                  </div>
                  <div className="font-medium text-white">
                    {contact.firstName} {contact.lastName}
                  </div>
                  {contact.primaryEmail && (
                    <div className="text-sm text-zinc-400 truncate">{contact.primaryEmail}</div>
                  )}
                  {contact.phone && (
                    <div className="text-sm text-zinc-500 truncate">{contact.phone}</div>
                  )}
                  {contact.company && (
                    <div className="text-sm text-zinc-500 truncate">{contact.company}</div>
                  )}
                  {contact.title && (
                    <div className="text-sm text-zinc-500 truncate">{contact.title}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDecision({ action: 'merge' })}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                currentDecision?.action === 'merge'
                  ? 'bg-amber-500 text-black'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <Merge className="w-4 h-4" />
              Same Person - Merge All
            </button>

            <button
              onClick={() => handleDecision({ action: 'keep_separate' })}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                currentDecision?.action === 'keep_separate'
                  ? 'bg-zinc-500 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Different People - Keep Separate
            </button>

            {currentGroup.existingContacts.length > 0 && (
              <button
                onClick={() => handleDecision({ action: 'skip_new' })}
                className={`w-full px-4 py-2 rounded-lg text-sm border transition-colors ${
                  currentDecision?.action === 'skip_new'
                    ? 'bg-zinc-600 border-zinc-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-300'
                }`}
              >
                Skip new contacts (keep existing only)
              </button>
            )}
          </div>
        </div>

        {/* Navigation & Footer */}
        <div className="p-4 border-t border-zinc-700 flex-shrink-0 space-y-4">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {groups.map((group, idx) => (
                <button
                  key={group.normalizedName}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    decisions.has(group.normalizedName)
                      ? 'bg-green-500'
                      : idx === currentIndex
                        ? 'bg-amber-400'
                        : 'bg-zinc-600 hover:bg-zinc-500'
                  }`}
                  aria-label={`Go to group ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentIndex(Math.min(groups.length - 1, currentIndex + 1))}
              disabled={currentIndex === groups.length - 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            className="w-full px-4 py-3 bg-[#C9A227] hover:bg-[#E5C766] rounded-lg text-black font-medium transition-colors"
          >
            {unreviewedCount > 0
              ? `Continue (${unreviewedCount} will be kept separate)`
              : 'Continue to Import'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
