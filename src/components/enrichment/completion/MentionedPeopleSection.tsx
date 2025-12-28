"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { MentionedPersonCard } from "./MentionedPersonCard";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

interface MentionedPeopleSectionProps {
  mentions: MentionMatch[];
  sourceContactId: string;
  onMentionProcessed: (mentionId: string) => void;
}

export function MentionedPeopleSection({
  mentions,
  sourceContactId,
  onMentionProcessed,
}: MentionedPeopleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [processedMentions, setProcessedMentions] = useState<Set<string>>(
    new Set()
  );

  // Filter out processed mentions
  const activeMentions = mentions.filter(
    (m) => !processedMentions.has(m.mentionId || m.name)
  );

  if (activeMentions.length === 0) return null;

  // Sort by confidence (matched first, then fuzzy, then unknown)
  const sortedMentions = [...activeMentions].sort((a, b) => {
    const order = { EXACT: 0, FUZZY: 1, PHONETIC: 2, NONE: 3 };
    return order[a.matchType] - order[b.matchType] || b.confidence - a.confidence;
  });

  const displayedMentions = showAll
    ? sortedMentions
    : sortedMentions.slice(0, 5);
  const hasMore = sortedMentions.length > 5;

  function handleMentionProcessed(mentionId: string) {
    setProcessedMentions((prev) => new Set([...prev, mentionId]));
    onMentionProcessed(mentionId);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] overflow-hidden"
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">
              {activeMentions.length}{" "}
              {activeMentions.length === 1 ? "person" : "people"} mentioned
            </h3>
            <p className="text-xs text-zinc-500">
              Add context or create new contacts
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-zinc-500" />
        ) : (
          <ChevronDown size={18} className="text-zinc-500" />
        )}
      </button>

      {/* Animated Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {displayedMentions.map((mention, index) => (
                <MentionedPersonCard
                  key={mention.mentionId || `${mention.name}-${index}`}
                  mention={mention}
                  sourceContactId={sourceContactId}
                  onProcessed={() =>
                    handleMentionProcessed(mention.mentionId || mention.name)
                  }
                />
              ))}

              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Show {sortedMentions.length - 5} more
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
