'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMissingFieldSuggestions, type FieldSuggestion } from '@/lib/enrichment';
import type { Contact } from '@/types/contact';

interface RankingData {
  currentRank: number;
  totalContacts: number;
}

interface EnrichmentScoreCardProps {
  contact: Contact;
}

// Score color thresholds matching ScoreImprovementBar
function getScoreColor(score: number): string {
  if (score <= 25) return '#EF4444'; // Red
  if (score <= 50) return '#F97316'; // Orange
  if (score <= 75) return '#F59E0B'; // Amber
  return '#22C55E'; // Green
}

function getScoreColorClasses(score: number): { bg: string; text: string; border: string } {
  if (score <= 25) {
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  }
  if (score <= 50) {
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
  }
  if (score <= 75) {
    return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
  return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
}

export function EnrichmentScoreCard({ contact }: EnrichmentScoreCardProps) {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);

  // Fetch ranking on mount
  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch(`/api/contacts/${contact.id}/ranking`);
        if (res.ok) {
          const data = await res.json();
          setRanking(data);
        }
      } catch (error) {
        console.error('Failed to fetch ranking:', error);
      } finally {
        setIsLoadingRanking(false);
      }
    }
    fetchRanking();
  }, [contact.id]);

  const score = contact.enrichmentScore;
  const scoreColor = getScoreColor(score);
  const colorClasses = getScoreColorClasses(score);

  // Get missing field suggestions
  const suggestions = getMissingFieldSuggestions(contact);

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <div className="flex items-start gap-6">
        {/* Score Circle */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full border-4',
              colorClasses.border,
              colorClasses.bg
            )}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: scoreColor }}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Enrichment Score
            </h3>
            {/* Ranking Badge */}
            {ranking && (
              <div className="flex items-center gap-1.5 rounded-full bg-gold-subtle px-3 py-1">
                <Trophy className="h-3.5 w-3.5 text-gold-primary" />
                <span className="text-xs font-medium text-gold-primary">
                  #{ranking.currentRank} of {ranking.totalContacts}
                </span>
              </div>
            )}
            {isLoadingRanking && (
              <div className="h-6 w-20 animate-pulse rounded-full bg-white/5" />
            )}
          </div>

          {/* Missing Field Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">Improve your score:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <SuggestionChip
                    key={suggestion.field}
                    suggestion={suggestion}
                    contactId={contact.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Perfect Score Message */}
          {suggestions.length === 0 && score >= 75 && (
            <div className="mt-3 flex items-center gap-2 text-green-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">Fully enriched! Great job.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SuggestionChipProps {
  suggestion: FieldSuggestion;
  contactId: string;
}

function SuggestionChip({ suggestion, contactId }: SuggestionChipProps) {
  return (
    <Link
      href={`/contacts/${contactId}/edit`}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
    >
      <span className="font-medium">{suggestion.label}</span>
      <span className="text-gold-primary">+{suggestion.points}</span>
    </Link>
  );
}
