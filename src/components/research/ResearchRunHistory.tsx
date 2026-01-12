'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResearchRunTile, type ResearchRunTileData } from './ResearchRunTile';

interface ResearchRunHistoryProps {
  researchRuns: ResearchRunTileData[];
  contactId: string;
  activeRunId?: string; // Currently running research (always expanded)
  onApplySuccess?: (data: {
    previousScore: number;
    newScore: number;
    appliedChangesSummary: string[];
  }) => void;
}

export function ResearchRunHistory({
  researchRuns,
  contactId,
  activeRunId,
  onApplySuccess,
}: ResearchRunHistoryProps) {
  // Most recent at top
  const sortedRuns = useMemo(() =>
    [...researchRuns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [researchRuns]
  );

  // Compute what should be auto-expanded
  const getDefaultExpandedId = (): string | null => {
    if (activeRunId) return activeRunId;
    const mostRecent = sortedRuns[0];
    // Only auto-expand if it's completed but NOT yet applied (has pending recommendations)
    if (mostRecent?.status === 'COMPLETED' && !mostRecent?.appliedAt) {
      return mostRecent.id;
    }
    return null;
  };

  // Track which tile is expanded (accordion behavior)
  const [expandedId, setExpandedId] = useState<string | null>(getDefaultExpandedId);

  // Reset expanded state when the underlying data changes (e.g., after apply)
  useEffect(() => {
    setExpandedId(getDefaultExpandedId());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sortedRuns.map(r => ({ id: r.id, appliedAt: r.appliedAt?.toString() })))]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (researchRuns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Research History
      </h3>
      <div className="space-y-2">
        {sortedRuns.map((run) => {
          const isActive = run.id === activeRunId;
          const isRunning = run.status === 'PENDING' || run.status === 'RUNNING';

          return (
            <ResearchRunTile
              key={run.id}
              researchRun={run}
              isExpanded={isActive || isRunning || expandedId === run.id}
              onToggle={() => handleToggle(run.id)}
              contactId={contactId}
              isActive={isActive || isRunning}
              onApplySuccess={onApplySuccess}
            />
          );
        })}
      </div>
    </div>
  );
}
