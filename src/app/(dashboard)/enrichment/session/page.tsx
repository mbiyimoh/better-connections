"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Plus,
  Pause,
  Play,
  Sparkles,
  ArrowRight,
  SkipForward,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircularTimer } from "@/components/enrichment/CircularTimer";
import {
  EnrichmentBubbles,
  createBubble,
  type EnrichmentBubble,
  type BubbleCategory,
} from "@/components/enrichment/EnrichmentBubbles";

interface Contact {
  id: string;
  name: string;
  email: string | null;
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

// AI-like extraction of insights from text (simplified for MVP)
function extractInsights(text: string): { text: string; category: BubbleCategory }[] {
  const insights: { text: string; category: BubbleCategory }[] = [];
  const lowerText = text.toLowerCase();

  // Relationship keywords
  const relationshipKeywords = [
    "met at", "introduced by", "worked with", "known from", "friend of",
    "colleague", "conference", "event", "school", "university", "alumni",
  ];
  for (const keyword of relationshipKeywords) {
    if (lowerText.includes(keyword)) {
      const match = text.match(new RegExp(`${keyword}[^,.!?]*`, "i"));
      if (match) {
        insights.push({ text: match[0].trim(), category: "relationship" });
      }
    }
  }

  // Opportunity keywords
  const opportunityKeywords = [
    "investor", "investment", "funding", "advisor", "mentor", "partner",
    "client", "customer", "lead", "prospect", "opportunity", "deal",
    "intro", "introduction", "connect", "potential",
  ];
  for (const keyword of opportunityKeywords) {
    if (lowerText.includes(keyword)) {
      insights.push({ text: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} opportunity`, category: "opportunity" });
    }
  }

  // Expertise keywords
  const expertiseKeywords = [
    "expert in", "specializes in", "experience in", "skilled at",
    "background in", "worked on", "built", "created", "founded",
    "engineering", "sales", "marketing", "product", "design",
  ];
  for (const keyword of expertiseKeywords) {
    if (lowerText.includes(keyword)) {
      const match = text.match(new RegExp(`${keyword}[^,.!?]*`, "i"));
      if (match) {
        insights.push({ text: match[0].trim(), category: "expertise" });
      }
    }
  }

  // Interest keywords
  const interestKeywords = [
    "loves", "enjoys", "passionate about", "interested in", "hobby",
    "fan of", "into", "likes", "collects", "plays",
  ];
  for (const keyword of interestKeywords) {
    if (lowerText.includes(keyword)) {
      const match = text.match(new RegExp(`${keyword}[^,.!?]*`, "i"));
      if (match) {
        insights.push({ text: match[0].trim(), category: "interest" });
      }
    }
  }

  // Remove duplicates
  return insights.filter((insight, index, self) =>
    index === self.findIndex((i) => i.text.toLowerCase() === insight.text.toLowerCase())
  ).slice(0, 8);
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

  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData>({
    howWeMet: "",
    whyNow: "",
    expertise: "",
    interests: "",
    notes: "",
  });

  useEffect(() => {
    if (contactId) {
      fetchContact(contactId);
    }
  }, [contactId]);

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
    setIsStarted(true);
    setIsPlaying(true);
  };

  const handleAddTime = () => {
    setRemainingTime((prev) => Math.min(prev + 30, 90));
  };

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setSessionComplete(true);
  }, []);

  const handleAddInsight = () => {
    if (!inputText.trim()) return;

    const insights = extractInsights(inputText);
    if (insights.length > 0) {
      const newBubbles = insights.map((i) => createBubble(i.text, i.category));
      setBubbles((prev) => [...prev, ...newBubbles]);
    } else {
      // Default to notes if no specific category detected
      setBubbles((prev) => [...prev, createBubble(inputText.trim(), "relationship")]);
    }

    // Also store in enrichment data
    setEnrichmentData((prev) => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n${inputText}` : inputText,
    }));

    setInputText("");
  };

  const handleSave = async () => {
    if (!contact) return;

    setSaving(true);
    try {
      // Compile enrichment data from bubbles
      const relationshipBubbles = bubbles.filter((b) => b.category === "relationship");
      const opportunityBubbles = bubbles.filter((b) => b.category === "opportunity");
      const expertiseBubbles = bubbles.filter((b) => b.category === "expertise");
      const interestBubbles = bubbles.filter((b) => b.category === "interest");

      const updateData = {
        howWeMet: relationshipBubbles.map((b) => b.text).join(". ") || enrichmentData.howWeMet,
        whyNow: opportunityBubbles.map((b) => b.text).join(". ") || enrichmentData.whyNow,
        expertise: expertiseBubbles.map((b) => b.text).join(", ") || enrichmentData.expertise,
        interests: interestBubbles.map((b) => b.text).join(", ") || enrichmentData.interests,
        notes: enrichmentData.notes,
        lastEnrichedAt: new Date().toISOString(),
      };

      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        router.push("/enrichment");
      }
    } catch (error) {
      console.error("Failed to save enrichment:", error);
    } finally {
      setSaving(false);
    }
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

  const handleNextContact = async () => {
    await handleSave();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C9A227]" />
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
      <div className="min-h-screen bg-[#0D0D0F]">
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-8">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles size={32} className="text-green-400" />
              </motion.div>
              <h2 className="text-xl font-semibold text-white mb-1">
                {contact.name} enriched
              </h2>
              <p className="text-zinc-400 text-sm">
                We captured {bubbles.length} insights
              </p>
            </div>

            {/* Summary by category */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {(["relationship", "opportunity", "interest", "expertise"] as const).map(
                (cat) => {
                  const catBubbles = bubbles.filter((b) => b.category === cat);
                  return (
                    <div key={cat}>
                      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        {cat}
                      </h3>
                      <div className="flex flex-col gap-1">
                        {catBubbles.length > 0 ? (
                          catBubbles.map((b) => (
                            <div
                              key={b.id}
                              className="text-[13px] text-zinc-400"
                            >
                              • {b.text}
                            </div>
                          ))
                        ) : (
                          <div className="text-[13px] text-zinc-600 italic">
                            (none captured)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <Button
              size="lg"
              className="w-full bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold"
              onClick={handleNextContact}
              disabled={saving}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <ArrowRight size={16} />
                  Save & Return to Queue
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
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
                "linear-gradient(135deg, rgba(201,162,39,0.3), rgba(168,85,247,0.3))",
            }}
          >
            <User size={40} className="text-white/60" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            {contact.name}
          </h2>
          <p className="text-zinc-500 text-sm">
            {contact.title && contact.company
              ? `${contact.title} at ${contact.company}`
              : contact.email || "No details yet"}
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
          </div>
        )}

        {/* Bubble Canvas */}
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-6 min-h-[180px]">
          {bubbles.length > 0 ? (
            <EnrichmentBubbles bubbles={bubbles} />
          ) : (
            <p className="text-zinc-500 text-center py-8">
              {isStarted
                ? "Type what you know about this contact below"
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
              className="bg-[#C9A227] hover:bg-[#E5C766] text-black"
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
              className="flex-1 bg-[#C9A227] hover:bg-[#E5C766] text-black font-semibold"
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
      </div>
    </div>
  );
}

export default function EnrichmentSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C9A227]" />
        </div>
      }
    >
      <EnrichmentSessionContent />
    </Suspense>
  );
}
