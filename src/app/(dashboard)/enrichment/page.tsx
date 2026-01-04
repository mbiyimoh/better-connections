"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Play,
  SkipForward,
  AlertCircle,
  Check,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Calendar,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/types/contact";
import { AlphabetSlider } from "@/components/ui/AlphabetSlider";

interface QueueContact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  title: string | null;
  company: string | null;
  enrichmentScore: number;
  source: string;
  createdAt: string;
  priority: number;
  priorityLevel: "high" | "medium" | "low";
  enrichmentReason: string;
}

interface EnrichmentStats {
  totalContacts: number;
  fullyEnriched: number;
  needsEnrichment: number;
  averageScore: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  enrichedThisWeek: number;
}

type FilterType = "all" | "high" | "medium" | "low";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = getInitials(name);
  const hue =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white/90 shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${(hue + 60) % 360}, 60%, 30%))`,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-500/15 text-red-400",
    medium: "bg-amber-500/15 text-amber-400",
    low: "bg-white/5 text-zinc-500",
  };

  const labels = {
    high: "High Priority",
    medium: "Medium",
    low: "Low",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider",
        styles[priority]
      )}
    >
      {priority === "high" && <Zap size={10} />}
      {labels[priority]}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    MANUAL: "Manual",
    CSV: "CSV Import",
    GOOGLE: "Google",
    LINKEDIN: "LinkedIn",
    ICLOUD: "iCloud",
    OUTLOOK: "Outlook",
  };

  return (
    <span className="text-[11px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
      {labels[source] || source}
    </span>
  );
}

function StatsCard({ stats }: { stats: EnrichmentStats }) {
  const percentage =
    stats.totalContacts > 0
      ? Math.round((stats.fullyEnriched / stats.totalContacts) * 100)
      : 0;

  return (
    <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-6 mb-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-1">
            Enrichment Progress
          </h3>
          <p className="text-[28px] font-bold text-white m-0">
            {percentage}%{" "}
            <span className="text-sm font-normal text-zinc-500">complete</span>
          </p>
        </div>
        <div className="w-16 h-16 rounded-full bg-gold-subtle flex items-center justify-center">
          <Sparkles size={28} className="text-gold-primary" />
        </div>
      </div>

      <div className="h-2 bg-white/10 rounded overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded"
          style={{
            background: "linear-gradient(90deg, #d4a54a, #e5c766)",
          }}
        />
      </div>

      <div className="flex gap-8">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Total Contacts</p>
          <p className="text-lg font-semibold text-white">
            {stats.totalContacts}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Enriched</p>
          <p className="text-lg font-semibold text-green-400">
            {stats.fullyEnriched}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Need Attention</p>
          <p className="text-lg font-semibold text-amber-400">
            {stats.needsEnrichment}
          </p>
        </div>
      </div>
    </div>
  );
}

function QueueItemCard({
  contact,
  rank,
  onEnrich,
  onSkip,
}: {
  contact: QueueContact;
  rank: number;
  onEnrich: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
    >
      <div className="group bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-5 mb-3 hover:bg-zinc-800/85 hover:border-white/[0.12] transition-all">
        <div className="flex gap-4">
          {/* Rank */}
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
              rank <= 3
                ? "bg-gold-subtle text-gold-primary"
                : "bg-white/5 text-zinc-500"
            )}
          >
            {rank}
          </div>

          {/* Avatar */}
          <Avatar name={getDisplayName(contact)} size={44} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-white">
                {getDisplayName(contact)}
              </h3>
              <PriorityBadge priority={contact.priorityLevel} />
            </div>

            <p className="text-sm text-zinc-400 mb-2">
              {contact.title || "No title"} ·{" "}
              {contact.company || "No company"}
            </p>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md">
                <AlertCircle size={12} />
                {contact.enrichmentReason}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar size={12} /> Added {getRelativeTime(contact.createdAt)}
              </span>
              <SourceBadge source={contact.source} />
              <span className="text-xs text-zinc-500">
                Score:{" "}
                <span
                  className={
                    contact.enrichmentScore < 30
                      ? "text-red-400"
                      : "text-amber-400"
                  }
                >
                  {contact.enrichmentScore}%
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              className="bg-gold-primary hover:bg-gold-light text-black font-semibold"
              onClick={onEnrich}
            >
              <Sparkles size={14} /> Enrich
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white"
              onClick={onSkip}
            >
              <SkipForward size={14} /> Skip
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <div className="text-center py-16">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center mx-auto mb-5"
      >
        <Check size={40} className="text-green-400" />
      </motion.div>

      <h3 className="text-[22px] font-semibold text-white mb-2">
        All caught up!
      </h3>
      <p className="text-[15px] text-zinc-400 mb-6">
        Every contact has been enriched. Nice work!
      </p>
      <Button
        variant="secondary"
        onClick={() => router.push("/contacts")}
      >
        <Users size={18} /> View All Contacts
      </Button>
    </div>
  );
}

function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: { all: number; high: number; medium: number; low: number };
}) {
  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "high", label: "High Priority" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
  ];

  return (
    <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5",
            activeFilter === filter.id
              ? "bg-gold-primary text-black"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          )}
        >
          {filter.label}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[11px]",
              activeFilter === filter.id ? "bg-black/20" : "bg-white/10"
            )}
          >
            {counts[filter.id as keyof typeof counts]}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function EnrichmentQueuePage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [queue, setQueue] = useState<QueueContact[]>([]);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalContacts, setTotalContacts] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Clear letter filter when search is used
  useEffect(() => {
    if (searchQuery) {
      setLetterFilter(null);
    }
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch("/api/enrichment/queue?limit=50"),
        fetch("/api/enrichment/stats"),
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData.contacts ?? []);
        setTotalContacts(queueData.total ?? queueData.contacts?.length ?? 0);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch enrichment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (contactId: string) => {
    try {
      const res = await fetch(`/api/enrichment/${contactId}/skip`, {
        method: "POST",
      });

      if (res.ok) {
        setQueue((prev) => prev.filter((c) => c.id !== contactId));
      }
    } catch (error) {
      console.error("Failed to skip contact:", error);
    }
  };

  const handleEnrich = (contactId: string) => {
    router.push(`/enrichment/session?contact=${contactId}`);
  };

  const handleStartSession = () => {
    const firstContact = queue[0];
    if (firstContact) {
      router.push(`/enrichment/session?contact=${firstContact.id}`);
    }
  };

  const handleShowMore = async () => {
    if (isLoadingMore) return; // Prevent concurrent requests

    setIsLoadingMore(true);
    try {
      const newLimit = displayLimit + 25;
      const res = await fetch(`/api/enrichment/queue?limit=${newLimit}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.contacts ?? []);
        setDisplayLimit(newLimit);
        setTotalContacts(data.total ?? data.contacts?.length ?? 0);
      }
    } catch (error) {
      console.error("Failed to load more contacts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredQueue = queue.filter((contact) => {
    // Apply priority filter
    const matchesPriority = activeFilter === "all" || contact.priorityLevel === activeFilter;

    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      getDisplayName(contact).toLowerCase().includes(searchLower) ||
      (contact.primaryEmail?.toLowerCase().includes(searchLower)) ||
      (contact.company?.toLowerCase().includes(searchLower));

    // Apply letter filter
    const matchesLetter = !letterFilter ||
      getDisplayName(contact)[0]?.toUpperCase() === letterFilter;

    return matchesPriority && matchesSearch && matchesLetter;
  });

  const counts = {
    all: queue.length,
    high: queue.filter((c) => c.priorityLevel === "high").length,
    medium: queue.filter((c) => c.priorityLevel === "medium").length,
    low: queue.filter((c) => c.priorityLevel === "low").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header - 33 Strategies Style */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
              02 — Build Depth
            </p>
            <h1 className="font-display text-[28px] text-white mb-1">
              Enrichment Queue
            </h1>
            <p className="font-body text-[15px] text-zinc-400">
              {stats?.needsEnrichment || 0} contacts need your attention
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gold-primary hover:bg-gold-light text-black font-semibold"
            onClick={handleStartSession}
            disabled={queue.length === 0}
          >
            <Play size={18} /> Start Session
          </Button>
        </div>

        {/* Stats */}
        {stats && <StatsCard stats={stats} />}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />

        {/* Queue List */}
        {filteredQueue.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 mb-2">No contacts match &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-gold-primary hover:text-gold-light text-sm"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] mt-5">
              <EmptyState />
            </div>
          )
        ) : (
          <div className="relative">
            {/* Queue list with padding for alphabet slider */}
            <div className="pr-12">
              {filteredQueue.map((contact, index) => (
                <QueueItemCard
                  key={contact.id}
                  contact={contact}
                  rank={index + 1}
                  onEnrich={() => handleEnrich(contact.id)}
                  onSkip={() => handleSkip(contact.id)}
                />
              ))}

              {queue.length < totalContacts && (
                <div className="text-center mt-5">
                  <Button
                    variant="ghost"
                    className="text-zinc-400"
                    onClick={handleShowMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-zinc-400 mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Show more contacts <ChevronRight size={16} />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Alphabet slider - positioned at right edge */}
            <div className="absolute right-0 top-0 hidden md:flex">
              <AlphabetSlider
                items={queue}
                selectedLetter={letterFilter}
                onLetterSelect={setLetterFilter}
              />
            </div>
          </div>
        )}

        {/* Tip Card */}
        <div className="bg-zinc-900/85 backdrop-blur-xl rounded-xl border border-white/[0.08] p-5 mt-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
            <TrendingUp size={22} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-0.5">
              Pro tip: Build a streak
            </h4>
            <p className="text-[13px] text-zinc-400">
              Enrich 5 contacts in a row to build momentum. Small sessions add
              up over time.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={handleStartSession}
          >
            Start Streak <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
