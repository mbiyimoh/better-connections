'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreImprovementBar } from '@/components/enrichment/completion/ScoreImprovementBar';
import { RankCelebration } from '@/components/enrichment/completion/RankCelebration';
import { ChangesSummaryList } from './ChangesSummaryList';

interface ResearchApplyCelebrationProps {
  previousScore: number;
  newScore: number;
  appliedChangesSummary: string[];
  contactName: string;
  currentRank: number;
  previousRank: number;
  totalContacts: number;
  onComplete: () => void;
}

// Animation timeline:
// 0-1500ms: Score bar animates
// 1500-2000ms: Sound plays, delta badge appears
// 2000-2500ms: Rank celebration appears
// 2500-3000ms: Changes summary fades in
// Then stays visible until user dismisses

const SCORE_ANIMATION_DURATION = 1500;
const RANK_DELAY = 2000;
const CHANGES_DELAY = 2500;

export function ResearchApplyCelebration({
  previousScore,
  newScore,
  appliedChangesSummary,
  contactName,
  currentRank,
  previousRank,
  totalContacts,
  onComplete,
}: ResearchApplyCelebrationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  useEffect(() => {
    // Start score animation immediately
    setIsAnimating(true);

    // Show delta badge after score animation
    const deltaTimer = setTimeout(() => {
      setShowDelta(true);
    }, SCORE_ANIMATION_DURATION);

    // Show rank celebration
    const rankTimer = setTimeout(() => {
      setShowRank(true);
    }, RANK_DELAY);

    // Show changes summary
    const changesTimer = setTimeout(() => {
      setShowChanges(true);
    }, CHANGES_DELAY);

    // No auto-dismiss - user will click dismiss button

    return () => {
      clearTimeout(deltaTimer);
      clearTimeout(rankTimer);
      clearTimeout(changesTimer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-secondary/50 rounded-xl p-6 space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <motion.h3
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-white"
        >
          Research Applied!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground mt-1"
        >
          {contactName}&apos;s profile has been updated
        </motion.p>
      </div>

      {/* Score improvement bar */}
      <ScoreImprovementBar
        previousScore={previousScore}
        newScore={newScore}
        isAnimating={isAnimating}
        showDelta={showDelta}
      />

      {/* Rank celebration */}
      <AnimatePresence>
        {showRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RankCelebration
              contactName={contactName}
              currentRank={currentRank}
              previousRank={previousRank}
              totalContacts={totalContacts}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Changes summary */}
      <AnimatePresence>
        {showChanges && appliedChangesSummary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChangesSummaryList changes={appliedChangesSummary} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dismiss button */}
      <AnimatePresence>
        {showChanges && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
            className="pt-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              className="w-full text-muted-foreground hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
