"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDisplayName } from "@/types/contact";
import { copyToClipboard } from "@/lib/utils";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string | null;
  howWeMet: string | null;
  whyNow: string | null;
}

interface DraftIntroModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DraftIntroModal({ contact, isOpen, onClose }: DraftIntroModalProps) {
  const [intent, setIntent] = useState("");
  const [intro, setIntro] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!contact) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat/draft-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          intent: intent.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIntro(data.intro);
      }
    } catch (error) {
      console.error("Failed to generate intro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(intro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIntent("");
    setIntro("");
    onClose();
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Draft Intro for {getDisplayName(contact)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Context */}
          <div className="bg-white/5 rounded-lg p-4 space-y-2">
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-500">Contact:</span> {getDisplayName(contact)}
              {contact.title && contact.company && (
                <span className="text-zinc-500">
                  {" "}
                  ({contact.title} at {contact.company})
                </span>
              )}
            </p>
            {contact.howWeMet && (
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-500">How you met:</span> {contact.howWeMet}
              </p>
            )}
            {contact.whyNow && (
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-500">Why now:</span> {contact.whyNow}
              </p>
            )}
          </div>

          {/* Intent Input */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              What&apos;s your goal for this outreach? (optional)
            </label>
            <Textarea
              placeholder="e.g., Catch up and explore partnership opportunities..."
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px]"
            />
          </div>

          {/* Generate Button */}
          {!intro && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gold-primary hover:bg-gold-light text-black font-semibold"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Intro"
              )}
            </Button>
          )}

          {/* Generated Intro */}
          {intro && (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                  {intro}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIntro("");
                    handleGenerate();
                  }}
                  variant="ghost"
                  className="text-zinc-400"
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
