'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResearchResultsPanel } from './ResearchResultsPanel';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import type { ResearchStatus } from '@prisma/client';
import type { Recommendation } from './RecommendationCard';

export interface ResearchRunTileData {
  id: string;
  status: ResearchStatus;
  createdAt: Date;
  completedAt: Date | null;
  appliedAt: Date | null;
  appliedChangesSummary: string | null;
  previousScore: number | null;
  newScore: number | null;
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  recommendations: Recommendation[];
}

interface ResearchRunTileProps {
  researchRun: ResearchRunTileData;
  isExpanded: boolean;
  onToggle: () => void;
  contactId: string;
  isActive?: boolean; // Currently running/pending
  onApplySuccess?: (data: {
    previousScore: number;
    newScore: number;
    appliedChangesSummary: string[];
  }) => void;
}

function getStatusBadge(status: ResearchStatus, appliedAt: Date | null) {
  if (appliedAt) {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
        <CheckCircle className="h-3 w-3" />
        Applied
      </Badge>
    );
  }

  switch (status) {
    case 'PENDING':
    case 'RUNNING':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
  }
}

function formatRelativeDate(date: Date): string {
  const sevenDaysAgo = subDays(new Date(), 7);

  if (isAfter(date, sevenDaysAgo)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, 'MMM d, yyyy');
}

function getRecommendationStats(recommendations: ResearchRunTileData['recommendations']): string {
  const total = recommendations.length;
  const approved = recommendations.filter((r) => r.status === 'APPROVED' || r.status === 'APPLIED').length;
  const rejected = recommendations.filter((r) => r.status === 'REJECTED').length;

  if (total === 0) return 'No recommendations';

  const parts: string[] = [`${total} recommendation${total !== 1 ? 's' : ''}`];

  if (approved > 0 || rejected > 0) {
    const statusParts: string[] = [];
    if (approved > 0) statusParts.push(`${approved} approved`);
    if (rejected > 0) statusParts.push(`${rejected} rejected`);
    parts.push(statusParts.join(', '));
  }

  return parts.join(': ');
}

function getOneLineSummary(researchRun: ResearchRunTileData): string | null {
  if (researchRun.appliedChangesSummary) {
    try {
      const changes = JSON.parse(researchRun.appliedChangesSummary) as string[];
      if (changes.length > 0) {
        return changes.slice(0, 2).join(', ') + (changes.length > 2 ? '...' : '');
      }
    } catch {
      // Ignore parse errors
    }
  }
  return null;
}

export function ResearchRunTile({
  researchRun,
  isExpanded,
  onToggle,
  contactId,
  isActive = false,
  onApplySuccess,
}: ResearchRunTileProps) {
  const isRunning = researchRun.status === 'PENDING' || researchRun.status === 'RUNNING';
  const canCollapse = !isRunning && !isActive;

  const handleClick = () => {
    if (canCollapse) {
      onToggle();
    }
  };

  const oneLineSummary = getOneLineSummary(researchRun);

  return (
    <div className="border rounded-lg overflow-hidden bg-secondary/30">
      {/* Tile Header - always visible */}
      <button
        onClick={handleClick}
        disabled={!canCollapse}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
          canCollapse ? 'hover:bg-secondary/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date */}
            <span className="text-sm text-muted-foreground">
              {formatRelativeDate(new Date(researchRun.createdAt))}
            </span>

            {/* Status badge */}
            {getStatusBadge(researchRun.status, researchRun.appliedAt)}

            {/* Recommendation stats */}
            <span className="text-xs text-muted-foreground">
              {getRecommendationStats(researchRun.recommendations)}
            </span>
          </div>

          {/* One-line summary */}
          {!isExpanded && oneLineSummary && (
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {oneLineSummary}
            </p>
          )}
        </div>

        {/* Expand/collapse indicator */}
        {canCollapse && (
          <div className="ml-2 text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {(isExpanded || isActive) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t">
              <ResearchResultsPanel
                contactId={contactId}
                researchRun={{
                  id: researchRun.id,
                  status: researchRun.status,
                  summary: researchRun.summary,
                  fullReport: researchRun.fullReport,
                  sourceUrls: researchRun.sourceUrls,
                  executionTimeMs: researchRun.executionTimeMs,
                  createdAt: researchRun.createdAt.toISOString(),
                  completedAt: researchRun.completedAt?.toISOString() || null,
                  recommendations: researchRun.recommendations,
                }}
                onApplySuccess={onApplySuccess}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
