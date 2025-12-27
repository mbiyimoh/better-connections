"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Mail,
  Pin,
  PinOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/types/contact";

interface ContactTag {
  id: string;
  text: string;
  category: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  primaryEmail: string | null;
  howWeMet: string | null;
  whyNow: string | null;
  expertise: string | null;
  interests: string | null;
  relationshipStrength: number;
  lastContactDate: string | null;
  tags: ContactTag[];
}

interface ContactCardProps {
  contact: Contact;
  dynamicWhyNow?: string;
  isPinned?: boolean;
  onPin?: (contactId: string) => void;
  onDraftIntro?: (contact: Contact) => void;
  onViewContact?: (contactId: string) => void;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  RELATIONSHIP: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  OPPORTUNITY: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  EXPERTISE: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  INTEREST: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarGradient(name: string) {
  const hue = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${(hue + 60) % 360}, 60%, 30%))`;
}

function getRelativeTime(dateString: string | null) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function RelationshipStrength({ strength }: { strength: number }) {
  const labels = ["Weak", "Casual", "Good", "Strong"];
  const colors = ["text-zinc-500", "text-amber-400", "text-green-400", "text-green-400"];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full",
              i <= strength ? "bg-green-400" : "bg-white/20",
              i > 1 && "-ml-0.5"
            )}
          />
        ))}
      </div>
      <span className={cn("text-xs", colors[strength - 1] || "text-zinc-500")}>
        {labels[strength - 1] || "Unknown"}
      </span>
    </div>
  );
}

export function ContactCard({
  contact,
  dynamicWhyNow,
  isPinned = false,
  onPin,
  onDraftIntro,
  onViewContact,
}: ContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const whyNowText = dynamicWhyNow || contact.whyNow;

  return (
    <motion.div layout>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-zinc-900/85 backdrop-blur-xl rounded-xl border cursor-pointer transition-all overflow-hidden",
          isHovered || isExpanded
            ? "border-white/[0.12] bg-zinc-800/85"
            : "border-white/[0.08]",
          isPinned && "ring-1 ring-[#C9A227]/50"
        )}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white/90"
              style={{ background: getAvatarGradient(getDisplayName(contact)) }}
            >
              {getInitials(getDisplayName(contact))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{getDisplayName(contact)}</h3>
                {isPinned && <Pin size={12} className="text-[#C9A227] shrink-0" />}
              </div>
              <p className="text-sm text-zinc-500 truncate">
                {contact.title || "No title"}
                {contact.company && ` · ${contact.company}`}
              </p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              className="text-zinc-500"
            >
              <ChevronRight size={20} />
            </motion.div>
          </div>

          {/* Why Now Section */}
          {whyNowText && (
            <div className="mt-4 p-3 rounded-lg bg-[#C9A227]/15 border border-[#C9A227]/25">
              <p className="text-[11px] font-semibold text-[#C9A227] uppercase tracking-wider mb-1">
                Why Now
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{whyNowText}</p>
            </div>
          )}

          {/* Hover Preview */}
          <AnimatePresence>
            {isHovered && !isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-white/[0.08]"
              >
                <div className="flex gap-4 text-[13px] text-zinc-500">
                  {contact.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {contact.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {getRelativeTime(contact.lastContactDate)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex flex-col gap-4"
              >
                {/* Relationship */}
                {contact.howWeMet && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Relationship
                    </h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">{contact.howWeMet}</p>
                    <div className="flex items-center gap-4 mt-2 text-[13px]">
                      <span className="text-zinc-500">
                        Last contact: {getRelativeTime(contact.lastContactDate)}
                      </span>
                      <RelationshipStrength strength={contact.relationshipStrength} />
                    </div>
                  </div>
                )}

                {/* Profile */}
                {(contact.expertise || contact.interests || contact.location) && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Profile
                    </h4>
                    <div className="flex flex-col gap-1 text-sm text-zinc-400">
                      {contact.expertise && (
                        <p>
                          <span className="text-zinc-500">Expertise:</span> {contact.expertise}
                        </p>
                      )}
                      {contact.interests && (
                        <p>
                          <span className="text-zinc-500">Interests:</span> {contact.interests}
                        </p>
                      )}
                      {contact.location && (
                        <p>
                          <span className="text-zinc-500">Location:</span> {contact.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => {
                      const defaultColors = { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" };
                      const colors = categoryColors[tag.category] ?? defaultColors;
                      return (
                        <span
                          key={tag.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                            colors.bg,
                            colors.text,
                            colors.border
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              colors.text.replace("text-", "bg-")
                            )}
                          />
                          {tag.text}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-[#C9A227] hover:bg-[#E5C766] text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDraftIntro?.(contact);
                    }}
                  >
                    <Mail size={14} />
                    Draft Intro
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin?.(contact.id);
                    }}
                  >
                    {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                    {isPinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-zinc-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewContact?.(contact.id);
                    }}
                  >
                    <ExternalLink size={14} />
                    View
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
