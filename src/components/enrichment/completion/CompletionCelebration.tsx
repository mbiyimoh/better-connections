"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreImprovementBar } from "./ScoreImprovementBar";
import { RankCelebration } from "./RankCelebration";
import { StreakBadge } from "./StreakBadge";
import { CompletionSummary } from "./CompletionSummary";
import { MentionedPeopleSection } from "./MentionedPeopleSection";
import { useCelebrationSounds } from "./sounds/useCelebrationSounds";
import type { EnrichmentBubble } from "@/components/enrichment/EnrichmentBubbles";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";
import { getDisplayName } from "@/types/contact";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  enrichmentScore: number;
}

interface CompletionData {
  ranking: {
    currentRank: number;
    previousRank: number;
    totalContacts: number;
  };
  streak: {
    count: number;
  };
  scoreDelta: number;
}

interface CompletionCelebrationProps {
  contact: Contact;
  previousScore: number;
  newScore: number;
  bubbles: EnrichmentBubble[];
  completionData: CompletionData | null;
  notesChangeSummary?: string;
  mentionedPeople?: MentionMatch[];
  sourceContactId: string;
  onMentionProcessed?: (mentionId: string) => void;
  onEnrichNext: () => void;
  onBackToQueue: () => void;
  onContinueEnriching?: () => void;
  saving?: boolean;
}

type AnimationPhase =
  | "initial"
  | "score-animating"
  | "score-complete"
  | "rank-reveal"
  | "summary"
  | "complete";

export function CompletionCelebration({
  contact,
  previousScore,
  newScore,
  bubbles,
  completionData,
  notesChangeSummary,
  mentionedPeople,
  sourceContactId,
  onMentionProcessed,
  onEnrichNext,
  onBackToQueue,
  onContinueEnriching,
  saving = false,
}: CompletionCelebrationProps) {
  const [phase, setPhase] = useState<AnimationPhase>("initial");
  const { playScoreComplete, playRankReveal } = useCelebrationSounds();

  // Animation timeline
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Start score animation after brief delay
    timers.push(setTimeout(() => setPhase("score-animating"), 300));

    // Score complete (after 1.5s animation + 300ms delay = 1800ms)
    timers.push(
      setTimeout(() => {
        setPhase("score-complete");
        playScoreComplete();
      }, 1800)
    );

    // Rank reveal (500ms after score complete)
    timers.push(
      setTimeout(() => {
        setPhase("rank-reveal");
        playRankReveal();
      }, 2300)
    );

    // Summary reveal
    timers.push(setTimeout(() => setPhase("summary"), 2800));

    // Complete - show CTAs
    timers.push(setTimeout(() => setPhase("complete"), 3200));

    return () => timers.forEach(clearTimeout);
  }, [playScoreComplete, playRankReveal]);

  const showScoreBar = phase !== "initial";
  const showDelta = ["score-complete", "rank-reveal", "summary", "complete"].includes(phase);
  const showRank = ["rank-reveal", "summary", "complete"].includes(phase);
  const showSummary = ["summary", "complete"].includes(phase);
  const showCTAs = phase === "complete";

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-8">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <Sparkles size={32} className="text-green-400" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold text-white mb-1"
            >
              {getDisplayName(contact)} enriched
            </motion.h2>
          </div>

          {/* Score Improvement Bar */}
          <AnimatePresence>
            {showScoreBar && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <ScoreImprovementBar
                  previousScore={previousScore}
                  newScore={newScore}
                  isAnimating={phase === "score-animating"}
                  showDelta={showDelta}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rank Celebration */}
          <AnimatePresence>
            {showRank && completionData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mb-6"
              >
                <RankCelebration
                  contactName={contact.firstName}
                  currentRank={completionData.ranking.currentRank}
                  previousRank={completionData.ranking.previousRank}
                  totalContacts={completionData.ranking.totalContacts}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streak Badge */}
          <AnimatePresence>
            {showRank && completionData && completionData.streak.count > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6 flex justify-center"
              >
                <StreakBadge count={completionData.streak.count} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Summary */}
          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <CompletionSummary bubbles={bubbles} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes Change Summary */}
          <AnimatePresence>
            {showSummary && notesChangeSummary && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6 px-4 py-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
              >
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Notes Updated
                </p>
                <p className="text-sm text-zinc-300">{notesChangeSummary}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mentioned People Section */}
          {showSummary && mentionedPeople && mentionedPeople.length > 0 && (
            <div className="mb-6">
              <MentionedPeopleSection
                mentions={mentionedPeople}
                sourceContactId={sourceContactId}
                onMentionProcessed={(id) => {
                  onMentionProcessed?.(id);
                }}
              />
            </div>
          )}

          {/* CTAs */}
          <AnimatePresence>
            {showCTAs && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Button
                  size="lg"
                  className="w-full bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold"
                  onClick={onEnrichNext}
                  disabled={saving}
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Enrich Next Contact
                    </>
                  )}
                </Button>

                {onContinueEnriching && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-zinc-600 text-white hover:bg-zinc-800"
                    onClick={onContinueEnriching}
                    disabled={saving}
                  >
                    <Plus size={16} />
                    Continue Enriching {contact.firstName}
                  </Button>
                )}

                <button
                  onClick={onBackToQueue}
                  className="w-full text-center text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Back to Queue
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
