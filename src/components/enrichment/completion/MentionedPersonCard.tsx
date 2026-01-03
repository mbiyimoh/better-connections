"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Search,
} from "lucide-react";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";
import { ContactSearchModal } from "./ContactSearchModal";

interface MentionedPersonCardProps {
  mention: MentionMatch;
  sourceContactId: string;
  onProcessed: (mentionId: string) => void;
}

export function MentionedPersonCard({
  mention,
  sourceContactId,
  onProcessed,
}: MentionedPersonCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedAction, setProcessedAction] = useState<string | null>(null);

  // Handler for search modal selection
  const handleSearchSelect = (contactId: string) => {
    handleAction("link", contactId);
    setShowSearchModal(false);
  };

  const isConfidentMatch =
    mention.matchType === "EXACT" || mention.confidence >= 0.7;
  const isFuzzyMatch =
    mention.matchType === "FUZZY" && mention.confidence < 0.7;
  const isUnknown = mention.matchType === "NONE";

  const cardStyles = isConfidentMatch
    ? "border-green-500/30 bg-green-500/5"
    : isFuzzyMatch
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-zinc-700 bg-zinc-800/50";

  const contextPreview =
    mention.context.length > 80
      ? mention.context.slice(0, 80) + "..."
      : mention.context;

  async function handleAction(
    action: "link" | "create" | "dismiss",
    linkedContactId?: string
  ) {
    if (!mention.mentionId) {
      setError("Unable to process - missing reference");
      return;
    }

    // Prevent duplicate submissions
    const actionKey = `${action}-${linkedContactId || "none"}`;
    if (isProcessing || processedAction === actionKey) {
      return;
    }

    setIsProcessing(true);
    setProcessedAction(actionKey);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };

      if (action === "link" && linkedContactId) {
        body.linkedContactId = linkedContactId;
      } else if (action === "create") {
        // Parse name into first/last
        const nameParts = mention.normalizedName.trim().split(/\s+/);
        const firstName = nameParts[0] || mention.normalizedName;
        const lastName = nameParts.slice(1).join(" ") || undefined;

        body.newContactData = {
          firstName,
          lastName,
          title: mention.inferredDetails?.title,
          company: mention.inferredDetails?.company,
        };
      }

      const res = await fetch(`/api/contacts/mentions/${mention.mentionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onProcessed(mention.mentionId);
      } else {
        const errorText = await res.text();
        console.error("Failed to process mention:", errorText);
        setError("Failed to process. Please try again.");
        setProcessedAction(null); // Allow retry
      }
    } catch (err) {
      console.error("Error processing mention:", err);
      setError("Network error. Please try again.");
      setProcessedAction(null); // Allow retry
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border p-4 ${cardStyles}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-400" />
          </div>

          {/* Name and match info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {mention.normalizedName}
              </span>
              {isConfidentMatch && mention.matchedContact && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Matches {mention.matchedContact.firstName}
                </span>
              )}
              {isFuzzyMatch && mention.matchedContact && (
                <span className="text-xs text-amber-400">
                  {Math.round(mention.confidence * 100)}% match to{" "}
                  {mention.matchedContact.firstName}
                </span>
              )}
              {isUnknown && (
                <span className="text-xs text-zinc-500">New person</span>
              )}
            </div>

            {/* Inferred details */}
            {mention.inferredDetails && (
              <div className="text-xs text-zinc-500 mt-0.5">
                {mention.inferredDetails.title && mention.inferredDetails.title}
                {mention.inferredDetails.title &&
                  mention.inferredDetails.company &&
                  " at "}
                {mention.inferredDetails.company &&
                  mention.inferredDetails.company}
              </div>
            )}

            {/* Match reasons - shows why this contact was matched */}
            {mention.matchReasons && mention.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {mention.matchReasons.map((reason, i) => (
                  <span
                    key={i}
                    className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => handleAction("dismiss")}
          disabled={isProcessing}
          className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Context preview */}
      <div className="mt-3">
        <p className="text-sm text-zinc-400">
          {isExpanded ? mention.context : contextPreview}
        </p>
        {mention.context.length > 80 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        ) : (
          <>
            {/* Confident match actions */}
            {isConfidentMatch && mention.matchedContact && (
              <>
                <button
                  onClick={() =>
                    handleAction("link", mention.matchedContact!.id)
                  }
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
                >
                  Add Context
                </button>
                <button
                  onClick={() =>
                    router.push(`/enrichment/session?contact=${mention.matchedContact!.id}`)
                  }
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-600 hover:bg-zinc-700/50 text-zinc-300 disabled:opacity-50 flex items-center gap-1"
                >
                  Enrich Now
                  <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}

            {/* Fuzzy match actions */}
            {isFuzzyMatch && mention.matchedContact && (
              <>
                <button
                  onClick={() =>
                    handleAction("link", mention.matchedContact!.id)
                  }
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                >
                  Yes, link
                </button>
                <button
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-600 hover:bg-zinc-700/50 text-zinc-300 disabled:opacity-50"
                >
                  Different person
                </button>
              </>
            )}

            {/* Unknown actions */}
            {isUnknown && (
              <button
                onClick={() => handleAction("create")}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Create Contact
              </button>
            )}

            {/* Search & Link - fallback for all match types */}
            <button
              onClick={() => setShowSearchModal(true)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-600 hover:bg-zinc-700/50 text-zinc-300 disabled:opacity-50 flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              Search & Link
            </button>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Alternative matches - show for ALL matches with alternatives */}
      {mention.alternativeMatches && mention.alternativeMatches.length > 0 && (
        <div className="mt-3 border-t border-zinc-700 pt-3">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
          >
            {showAlternatives ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Other matches ({mention.alternativeMatches.length})
          </button>

          <AnimatePresence>
            {showAlternatives && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {mention.alternativeMatches.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex items-center justify-between p-2 rounded bg-zinc-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-zinc-300">
                          {alt.firstName} {alt.lastName}
                        </span>
                        {alt.company && (
                          <span className="text-xs text-zinc-500">
                            ({alt.company})
                          </span>
                        )}
                      </div>
                      {/* Match reasons for this alternative */}
                      {alt.matchReasons && alt.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {alt.matchReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-zinc-500">
                        {Math.round(alt.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => handleAction("link", alt.id)}
                        disabled={isProcessing}
                        className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => handleAction("create")}
                  disabled={isProcessing}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-700/50 text-sm text-blue-400 disabled:opacity-50 flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Create as new contact
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Contact Search Modal */}
      <ContactSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleSearchSelect}
        contextHint={mention.context}
      />
    </motion.div>
  );
}
