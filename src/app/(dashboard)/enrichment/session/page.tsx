"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Plus,
  Pause,
  Play,
  Sparkles,
  SkipForward,
  Send,
  Mic,
  MicOff,
  Keyboard,
} from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircularTimer } from "@/components/enrichment/CircularTimer";
import {
  EnrichmentBubbles,
  createBubble,
  type EnrichmentBubble,
  type BubbleCategory,
} from "@/components/enrichment/EnrichmentBubbles";
import { CompletionCelebration } from "@/components/enrichment/completion";
import { getDisplayName } from "@/types/contact";
import type { EnrichmentInsight } from "@/lib/schemas/enrichmentInsight";
import type { MentionMatch } from "@/lib/schemas/mentionExtraction";

// Persist listening state across HMR to prevent mic toggling on every code change
let persistedListeningState = false;
if (typeof window !== "undefined") {
  // @ts-expect-error - HMR state persistence
  persistedListeningState = window.__SPEECH_LISTENING__ || false;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  title: string | null;
  company: string | null;
  enrichmentScore: number;
}

interface EnrichmentData {
  howWeMet: string;
  whyNow: string;
  expertise: string;
  interests: string;
  notes: string;
}

// Constants for AI extraction timing
const PAUSE_THRESHOLD = 1000; // 1 second pause detection
const DEBOUNCE_DELAY = 500;   // 500ms debounce after pause

// Conflict type for title/company resolution
interface FieldConflict {
  field: "title" | "company";
  existingValue: string;
  newValue: string;
}

// Conflict Resolution Modal Component
function ConflictResolutionModal({
  conflicts,
  onResolve,
  onCancel,
}: {
  conflicts: FieldConflict[];
  onResolve: (resolutions: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [resolutions, setResolutions] = useState<Record<string, string>>(() => {
    // Default to keeping existing values
    const initial: Record<string, string> = {};
    conflicts.forEach((c) => {
      initial[c.field] = c.existingValue;
    });
    return initial;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          Review Conflicting Information
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
          The AI extracted information that differs from existing contact data.
          Choose which value to keep for each field:
        </p>

        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div key={conflict.field} className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 capitalize">
                {conflict.field}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700">
                  <input
                    type="radio"
                    name={conflict.field}
                    checked={resolutions[conflict.field] === conflict.existingValue}
                    onChange={() =>
                      setResolutions((prev) => ({
                        ...prev,
                        [conflict.field]: conflict.existingValue,
                      }))
                    }
                    className="text-amber-500"
                  />
                  <span className="text-zinc-300">
                    Keep existing: <span className="text-white">{conflict.existingValue}</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 cursor-pointer hover:bg-zinc-700">
                  <input
                    type="radio"
                    name={conflict.field}
                    checked={resolutions[conflict.field] === conflict.newValue}
                    onChange={() =>
                      setResolutions((prev) => ({
                        ...prev,
                        [conflict.field]: conflict.newValue,
                      }))
                    }
                    className="text-amber-500"
                  />
                  <span className="text-zinc-300">
                    Use new: <span className="text-green-400">{conflict.newValue}</span>
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(resolutions)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EnrichmentSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact");

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  const [bubbles, setBubbles] = useState<EnrichmentBubble[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputText, setInputText] = useState("");

  // Completion celebration state
  const [previousScore, setPreviousScore] = useState(0);
  const [completionData, setCompletionData] = useState<{
    ranking: { currentRank: number; previousRank: number; totalContacts: number };
    streak: { count: number };
    scoreDelta: number;
  } | null>(null);
  const [notesChangeSummary, setNotesChangeSummary] = useState("");
  const [mentionedPeople, setMentionedPeople] = useState<MentionMatch[]>([]);

  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData>({
    howWeMet: "",
    whyNow: "",
    expertise: "",
    interests: "",
    notes: "",
  });

  // Voice input
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  const [savedTranscripts, setSavedTranscripts] = useState<string[]>([]);
  const hasRestoredListening = useRef(false);

  // AI processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const lastApiCallRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for accumulated AI extractions
  const [extractedFields, setExtractedFields] = useState<{
    howWeMet: string[];
    whyNow: string[];
    expertise: string[];
    interests: string[];
    title: string | null;
    company: string | null;
    notes: string[];
  }>({
    howWeMet: [],
    whyNow: [],
    expertise: [],
    interests: [],
    title: null,
    company: null,
    notes: [],
  });

  // Conflict detection state
  const [conflicts, setConflicts] = useState<FieldConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Error handling state
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Restore listening state after HMR (dev mode only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !hasRestoredListening.current) {
      hasRestoredListening.current = true;
      if (persistedListeningState && browserSupportsSpeechRecognition && !listening) {
        SpeechRecognition.startListening({ continuous: true });
      }
    }
  }, [browserSupportsSpeechRecognition, listening]);

  // Persist listening state to window for HMR
  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-expect-error - HMR state persistence
      window.__SPEECH_LISTENING__ = listening;
      persistedListeningState = listening;
    }
  }, [listening]);

  useEffect(() => {
    if (contactId) {
      fetchContact(contactId);
    }
  }, [contactId]);

  // Helper to accumulate extracted fields from AI insights
  const storeExtractedFields = useCallback((insights: EnrichmentInsight[]) => {
    setExtractedFields((prev) => {
      const updated = { ...prev };

      for (const insight of insights) {
        if (insight.howWeMet) updated.howWeMet = [...updated.howWeMet, insight.howWeMet];
        if (insight.whyNow) updated.whyNow = [...updated.whyNow, insight.whyNow];
        if (insight.expertise) updated.expertise = [...updated.expertise, insight.expertise];
        if (insight.interests) updated.interests = [...updated.interests, insight.interests];
        if (insight.notes) updated.notes = [...updated.notes, insight.notes];

        // For structured fields, keep latest non-null value
        if (insight.title) updated.title = insight.title;
        if (insight.company) updated.company = insight.company;
      }

      return updated;
    });
  }, []);

  // AI extraction function with retry logic
  const extractInsightsWithAI = useCallback(async (text: string): Promise<void> => {
    if (text.trim().length < 10 || isProcessing) return;

    setIsProcessing(true);
    setExtractionError(null); // Clear previous error

    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch("/api/enrichment/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            contactContext: contact
              ? {
                  name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
                  title: contact.title,
                  company: contact.company,
                }
              : undefined,
          }),
        });

        if (!response.ok) throw new Error("Extraction failed");

        const data = await response.json();

        if (data.insights && data.insights.length > 0) {
          const newBubbles = data.insights.map((insight: EnrichmentInsight) =>
            createBubble(insight.capturedText, insight.category as BubbleCategory)
          );
          setBubbles((prev) => [...prev, ...newBubbles]);

          // Store field data for later merge
          storeExtractedFields(data.insights);
        }

        setIsProcessing(false);
        return; // Success - exit function

      } catch (error) {
        lastError = error as Error;
        console.error(`AI extraction attempt ${attempt + 1} failed:`, error);

        // Wait 1s before retry (only if not last attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    // All retries failed - fallback to generic bubble and show error
    console.error("AI extraction failed after retries:", lastError);
    setExtractionError("Couldn't process speech. Your transcript is saved.");
    if (text.length > 20) {
      const truncated = text.length > 60 ? text.slice(0, 57) + "..." : text;
      setBubbles((prev) => [...prev, createBubble(truncated, "relationship")]);
    }

    setIsProcessing(false);
  }, [contact, isProcessing, storeExtractedFields]);

  // Speech pause detection effect
  useEffect(() => {
    if (!listening || !isStarted) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only process new text
    const newText = transcript.slice(lastProcessedLength).trim();
    if (newText.length < 10) return;

    // Set up pause detection
    debounceTimerRef.current = setTimeout(() => {
      // Check if we haven't made a call recently (debounce)
      const now = Date.now();
      if (now - lastApiCallRef.current < DEBOUNCE_DELAY) return;

      lastApiCallRef.current = now;
      setLastProcessedLength(transcript.length);
      extractInsightsWithAI(newText);
    }, PAUSE_THRESHOLD + DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [transcript, listening, isStarted, lastProcessedLength, extractInsightsWithAI]);

  const fetchContact = async (id: string) => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setContact(data);
      }
    } catch (error) {
      console.error("Failed to fetch contact:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    // Save current score before starting enrichment
    if (contact) {
      setPreviousScore(contact.enrichmentScore);
    }
    setIsStarted(true);
    setIsPlaying(true);
  };

  const handleAddTime = () => {
    setRemainingTime((prev) => Math.min(prev + 30, 90));
  };

  const handleAddInsight = () => {
    if (!inputText.trim()) return;

    // Use AI extraction for typed input as well
    extractInsightsWithAI(inputText.trim());

    // Also store in enrichment data notes
    setEnrichmentData((prev) => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n${inputText}` : inputText,
    }));

    setInputText("");
  };

  // Detect conflicts between AI-extracted values and existing contact data
  const detectConflicts = useCallback((): FieldConflict[] => {
    const detected: FieldConflict[] = [];

    if (
      contact?.title &&
      extractedFields.title &&
      contact.title.toLowerCase() !== extractedFields.title.toLowerCase()
    ) {
      detected.push({
        field: "title",
        existingValue: contact.title,
        newValue: extractedFields.title,
      });
    }

    if (
      contact?.company &&
      extractedFields.company &&
      contact.company.toLowerCase() !== extractedFields.company.toLowerCase()
    ) {
      detected.push({
        field: "company",
        existingValue: contact.company,
        newValue: extractedFields.company,
      });
    }

    return detected;
  }, [contact, extractedFields]);

  // Perform the actual save with optional overrides from conflict resolution
  const performSave = async (overrides: Record<string, string>) => {
    if (!contact) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        lastEnrichedAt: new Date().toISOString(),
      };

      // TEXT FIELDS: Append to existing
      if (extractedFields.howWeMet.length > 0) {
        const existing = enrichmentData.howWeMet || "";
        const newContent = extractedFields.howWeMet.join(". ");
        updateData.howWeMet = existing ? `${existing}. ${newContent}` : newContent;
      }

      if (extractedFields.whyNow.length > 0) {
        const existing = enrichmentData.whyNow || "";
        const newContent = extractedFields.whyNow.join(". ");
        updateData.whyNow = existing ? `${existing}. ${newContent}` : newContent;
      }

      if (extractedFields.expertise.length > 0) {
        const existing = enrichmentData.expertise || "";
        const newContent = extractedFields.expertise.join(", ");
        updateData.expertise = existing ? `${existing}, ${newContent}` : newContent;
      }

      if (extractedFields.interests.length > 0) {
        const existing = enrichmentData.interests || "";
        const newContent = extractedFields.interests.join(", ");
        updateData.interests = existing ? `${existing}, ${newContent}` : newContent;
      }

      // STRUCTURED FIELDS: Overwrite if empty OR user approved override
      if (extractedFields.title) {
        if (!contact?.title || overrides.title) {
          updateData.title = overrides.title || extractedFields.title;
        }
      }

      if (extractedFields.company) {
        if (!contact?.company || overrides.company) {
          updateData.company = overrides.company || extractedFields.company;
        }
      }

      // Notes: collect raw content, merge with existing using AI
      const transcriptToSave = transcript.trim();
      if (transcriptToSave || extractedFields.notes.length > 0 || savedTranscripts.length > 0) {
        const existingNotes = enrichmentData.notes || "";
        const aiNotes = extractedFields.notes.join("\n");

        // Combine all new notes content
        const rawNewNotes = [aiNotes, ...savedTranscripts, transcriptToSave]
          .filter(Boolean)
          .join("\n\n");

        // Intelligently merge with existing notes using AI
        // This will deduplicate, update outdated info, and organize logically
        if (rawNewNotes.length >= 20) {
          try {
            const refineRes = await fetch("/api/enrichment/refine-notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                existingNotes,
                newContent: rawNewNotes,
              }),
            });
            if (refineRes.ok) {
              const { refinedNotes, changeSummary } = await refineRes.json();
              updateData.notes = refinedNotes || existingNotes || rawNewNotes;
              if (changeSummary) {
                setNotesChangeSummary(changeSummary);
              }
            } else {
              // Fall back to simple append on API error
              updateData.notes = [existingNotes, rawNewNotes].filter(Boolean).join("\n\n");
            }
          } catch (refineError) {
            console.error("Failed to merge notes, using simple append:", refineError);
            updateData.notes = [existingNotes, rawNewNotes].filter(Boolean).join("\n\n");
          }
        } else if (rawNewNotes) {
          // Very short new content - just append
          updateData.notes = [existingNotes, rawNewNotes].filter(Boolean).join("\n\n");
        }
      }

      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedContact = await res.json();
        // Update contact with new enrichment score
        setContact(updatedContact);
        // Fetch completion celebration data
        await fetchCompletionData(contact.id, previousScore);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to save enrichment:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Fetch completion celebration data (ranking, streak)
  const fetchCompletionData = async (contactId: string, prevScore: number) => {
    try {
      const res = await fetch(
        `/api/enrichment/completion-data?contactId=${contactId}&previousScore=${prevScore}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompletionData(data);
      }
    } catch (error) {
      console.error("Failed to fetch completion data:", error);
    }
  };

  // Extract and match mentions of other people from transcript
  const extractAndMatchMentions = async (): Promise<MentionMatch[]> => {
    if (!contact) return [];

    const fullTranscript = [...savedTranscripts, transcript.trim()]
      .filter(Boolean)
      .join("\n\n");

    if (fullTranscript.length < 20) return [];

    try {
      // 1. Extract mentions from transcript
      const extractRes = await fetch("/api/enrichment/extract-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullTranscript,
          primaryContactName: `${contact.firstName} ${contact.lastName || ""}`.trim(),
        }),
      });

      if (!extractRes.ok) return [];
      const { mentions } = await extractRes.json();

      if (!mentions || mentions.length === 0) return [];

      // 2. Save mentions to DB and match against contacts
      const matchRes = await fetch("/api/contacts/match-mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentions,
          sourceContactId: contact.id,
        }),
      });

      if (!matchRes.ok) return [];
      const { matches } = await matchRes.json();

      return matches || [];
    } catch (error) {
      console.error("Failed to extract mentions:", error);
      return [];
    }
  };

  const handleComplete = useCallback(async () => {
    setIsPlaying(false);
    // Save transcript before stopping voice
    if (transcript.trim()) {
      setSavedTranscripts((prev) => [...prev, transcript.trim()]);
    }
    SpeechRecognition.stopListening();

    // Check for conflicts before saving
    const conflicts = detectConflicts();
    if (conflicts.length > 0) {
      setConflicts(conflicts);
      setShowConflictModal(true);
      return;
    }

    // Save data first, then show celebration with updated score
    setSaving(true);
    const success = await performSave({});
    if (success) {
      // Extract mentions after successful save
      const mentions = await extractAndMatchMentions();
      setMentionedPeople(mentions);
      setSessionComplete(true);
    }
    setSaving(false);
  }, [transcript, detectConflicts, performSave, extractAndMatchMentions]);

  const handleSave = async () => {
    const detectedConflicts = detectConflicts();

    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      setShowConflictModal(true);
      return;
    }

    await performSave({});
  };

  const handleSkip = async () => {
    if (!contact) return;

    try {
      await fetch(`/api/enrichment/${contact.id}/skip`, { method: "POST" });
      router.push("/enrichment");
    } catch (error) {
      console.error("Failed to skip:", error);
    }
  };

  // Handler for "Enrich Next Contact" button in completion screen
  const handleEnrichNext = async () => {
    setSaving(true);
    try {
      // Fetch queue to get next contact
      const res = await fetch("/api/enrichment/queue?limit=2");
      if (res.ok) {
        const queue = await res.json();
        // Find next contact that isn't the current one
        const nextContact = queue.find(
          (c: { id: string }) => c.id !== contact?.id
        );
        if (nextContact) {
          router.push(`/enrichment/session?contact=${nextContact.id}`);
        } else {
          router.push("/enrichment");
        }
      } else {
        router.push("/enrichment");
      }
    } catch (error) {
      console.error("Failed to fetch next contact:", error);
      router.push("/enrichment");
    } finally {
      setSaving(false);
    }
  };

  const handleBackToQueue = () => {
    router.push("/enrichment");
  };

  const handleContinueEnriching = () => {
    // Reset to enrichment state, keeping existing data
    setSessionComplete(false);
    // Clear transcript for new input
    resetTranscript();
    setLastProcessedLength(0);
    // Restart the session
    setIsStarted(true);
    setIsPlaying(true);
    setRemainingTime(30);
  };

  // Bubble edit handlers
  const handleUpdateBubble = (id: string, updates: Partial<EnrichmentBubble>) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleDeleteBubble = (id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Contact not found</p>
          <Button onClick={() => router.push("/enrichment")}>
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <CompletionCelebration
        contact={contact}
        previousScore={previousScore}
        newScore={contact.enrichmentScore}
        bubbles={bubbles}
        completionData={completionData}
        notesChangeSummary={notesChangeSummary}
        sourceContactId={contact.id}
        mentionedPeople={mentionedPeople}
        onMentionProcessed={(id) => {
          setMentionedPeople((prev) =>
            prev.filter((m) => (m.mentionId || m.name) !== id)
          );
        }}
        onEnrichNext={handleEnrichNext}
        onBackToQueue={handleBackToQueue}
        onContinueEnriching={handleContinueEnriching}
        saving={saving}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="max-w-lg mx-auto p-6 flex flex-col gap-6">
        {/* Contact Info */}
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-6 text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,165,74,0.3), rgba(168,85,247,0.3))",
            }}
          >
            <User size={40} className="text-white/60" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            {getDisplayName(contact)}
          </h2>
          <p className="text-zinc-500 text-sm">
            {contact.title && contact.company
              ? `${contact.title} at ${contact.company}`
              : contact.primaryEmail || "No details yet"}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Current score: {contact.enrichmentScore}%
          </p>
        </div>

        {/* Timer & Controls */}
        {isStarted && (
          <div className="flex flex-col items-center gap-4">
            <CircularTimer
              duration={30}
              isPlaying={isPlaying}
              remainingTime={remainingTime}
              setRemainingTime={setRemainingTime}
              onComplete={handleComplete}
            />

            <div className="flex gap-3">
              <Button
                variant={listening ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  if (listening) {
                    // Save transcript before stopping
                    if (transcript.trim()) {
                      setSavedTranscripts((prev) => [...prev, transcript.trim()]);
                    }
                    SpeechRecognition.stopListening();
                    resetTranscript();
                    setLastProcessedLength(0);
                  } else {
                    SpeechRecognition.startListening({ continuous: true });
                  }
                }}
                className={listening ? "bg-red-500 hover:bg-red-400 animate-pulse" : ""}
                disabled={!browserSupportsSpeechRecognition}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                {listening ? "Stop" : "Voice"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddTime}
                disabled={!isPlaying}
              >
                <Plus size={16} />
                +30 sec
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? "Pause" : "Resume"}
              </Button>
            </div>

            {/* Category hints */}
            <div className="flex gap-3 justify-center text-xs">
              <span className="text-blue-400">Relationship</span>
              <span className="text-green-400">Opportunity</span>
              <span className="text-purple-400">Expertise</span>
              <span className="text-amber-400">Interest</span>
            </div>

            {/* Browser support warning */}
            {!browserSupportsSpeechRecognition && (
              <p className="text-amber-500 text-xs text-center">
                Voice input not supported in this browser. Use Chrome for best experience.
              </p>
            )}
          </div>
        )}

        {/* Live Transcript Display */}
        {listening && transcript && (
          <div className="bg-zinc-800/50 backdrop-blur-xl rounded-xl border border-amber-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-amber-400 uppercase tracking-wider font-medium">Live Transcript</span>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">{transcript}</p>
            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-amber-400 text-sm mt-3 pt-3 border-t border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Processing speech...</span>
              </div>
            )}
            {/* Error Display */}
            {extractionError && (
              <div className="text-amber-400 text-sm mt-3 pt-3 border-t border-amber-500/20">
                {extractionError}
              </div>
            )}
          </div>
        )}

        {/* Bubble Canvas */}
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-6 min-h-[180px]">
          {bubbles.length > 0 ? (
            <EnrichmentBubbles
              bubbles={bubbles}
              editable
              onUpdate={handleUpdateBubble}
              onDelete={handleDeleteBubble}
            />
          ) : (
            <p className="text-zinc-500 text-center py-8">
              {isStarted
                ? listening
                  ? "Listening... Try saying 'met at a conference' or 'investor in AI'"
                  : "Click Voice to speak or type below"
                : "Start the session to begin enriching"}
            </p>
          )}
        </div>

        {/* Input area */}
        {isStarted && (
          <div className="flex gap-2">
            <Textarea
              placeholder="What do you know about this person? (e.g., 'Met at TechCrunch Disrupt, investor interested in AI startups, loves hiking')"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddInsight();
                }
              }}
              className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 min-h-[80px]"
            />
            <Button
              className="bg-gold-primary hover:bg-gold-light text-black"
              onClick={handleAddInsight}
              disabled={!inputText.trim()}
            >
              <Send size={18} />
            </Button>
          </div>
        )}

        {/* Action buttons */}
        {!isStarted ? (
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-gold-primary hover:bg-gold-light text-black font-semibold"
              onClick={handleStart}
            >
              <Sparkles size={20} />
              Start Session
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-zinc-400"
              onClick={handleSkip}
            >
              <SkipForward size={20} />
              Skip
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="ghost"
              className="text-zinc-400"
              onClick={handleSkip}
            >
              <SkipForward size={18} />
              Skip
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold"
              onClick={handleComplete}
              disabled={bubbles.length === 0}
            >
              <Sparkles size={18} />
              Complete Session
            </Button>
          </div>
        )}

        {/* Text fallback link */}
        {contact && (
          <div className="text-center pt-2">
            <Link
              href={`/enrich/text?id=${contact.id}`}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Keyboard size={14} />
              Prefer typing? Use text-based enrichment
            </Link>
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <ConflictResolutionModal
          conflicts={conflicts}
          onResolve={async (resolutions) => {
            setShowConflictModal(false);
            setSaving(true);
            const success = await performSave(resolutions);
            setSaving(false);
            if (success) {
              setSessionComplete(true);
            }
          }}
          onCancel={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}

export default function EnrichmentSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
        </div>
      }
    >
      <EnrichmentSessionContent />
    </Suspense>
  );
}
