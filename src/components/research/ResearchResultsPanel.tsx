'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecommendationCard, type Recommendation } from './RecommendationCard';

interface ResearchRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  fullReport: string | null;
  sourceUrls: string[];
  executionTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  recommendations: Recommendation[];
}

interface ResearchResultsPanelProps {
  contactId: string;
  researchRun: ResearchRun;
  onApplySuccess?: (data: {
    previousScore: number;
    newScore: number;
    appliedChangesSummary: string[];
  }) => void;
}

export function ResearchResultsPanel({
  contactId,
  researchRun,
  onApplySuccess,
}: ResearchResultsPanelProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState(
    researchRun.recommendations
  );
  const [isApplying, setIsApplying] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const [loadingRecommendation, setLoadingRecommendation] = useState<{
    id: string;
    action: 'approve' | 'reject';
  } | null>(null);

  const pendingCount = recommendations.filter(
    (r) => r.status === 'PENDING'
  ).length;
  const approvedCount = recommendations.filter(
    (r) => r.status === 'APPROVED'
  ).length;
  const appliedCount = recommendations.filter(
    (r) => r.status === 'APPLIED'
  ).length;

  const handleUpdateStatus = async (
    id: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const action = status === 'APPROVED' ? 'approve' : 'reject';
    setLoadingRecommendation({ id, action });

    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/recommendations/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      }
    } catch (error) {
      console.error('Failed to update recommendation:', error);
    } finally {
      setLoadingRecommendation(null);
    }
  };

  const handleEdit = async (id: string, editedValue: string) => {
    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/recommendations/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editedValue }),
        }
      );

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, editedValue } : r))
        );
      }
    } catch (error) {
      console.error('Failed to edit recommendation:', error);
    }
  };

  const handleApplyAll = async () => {
    const approvedIds = recommendations
      .filter((r) => r.status === 'APPROVED')
      .map((r) => r.id);

    if (approvedIds.length === 0) return;

    setIsApplying(true);
    try {
      const response = await fetch(
        `/api/contacts/${contactId}/research/${researchRun.id}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendationIds: approvedIds }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        setRecommendations((prev) =>
          prev.map((r) =>
            approvedIds.includes(r.id)
              ? { ...r, status: 'APPLIED' as const }
              : r
          )
        );

        // Call the success callback with celebration data
        if (onApplySuccess && data.previousScore !== undefined && data.newScore !== undefined) {
          onApplySuccess({
            previousScore: data.previousScore,
            newScore: data.newScore,
            appliedChangesSummary: data.appliedChangesSummary || [],
          });
        } else {
          // Fall back to just refreshing if no callback
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Failed to apply recommendations:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApproveAll = () => {
    recommendations
      .filter((r) => r.status === 'PENDING')
      .forEach((r) => handleUpdateStatus(r.id, 'APPROVED'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Research Results</h3>
          <p className="text-sm text-muted-foreground">
            {researchRun.executionTimeMs
              ? `Completed in ${(researchRun.executionTimeMs / 1000).toFixed(1)}s`
              : 'Processing...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-500">
            <CheckCircle className="h-3 w-3" />
            {approvedCount} approved
          </Badge>
          {appliedCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {appliedCount} applied
            </Badge>
          )}
        </div>
      </div>

      {/* Summary */}
      {researchRun.summary && (
        <div className="bg-secondary/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="text-sm whitespace-pre-wrap">
            {researchRun.summary}
          </div>
          {researchRun.fullReport && (
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="text-sm text-gold-primary hover:underline mt-2"
            >
              {showFullReport ? 'Hide full report' : 'Show full report'}
            </button>
          )}
          {showFullReport && researchRun.fullReport && (
            <div className="mt-4 pt-4 border-t prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-white">
              <ReactMarkdown>
                {researchRun.fullReport}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Bulk actions */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleApproveAll}>
            Approve All ({pendingCount})
          </Button>
        </div>
      )}

      {approvedCount > 0 && (
        <Button onClick={handleApplyAll} disabled={isApplying} className="w-full">
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Applying...
            </>
          ) : (
            `Apply ${approvedCount} Approved Recommendation${approvedCount !== 1 ? 's' : ''}`
          )}
        </Button>
      )}

      {/* Recommendations list */}
      <div className="space-y-3">
        {recommendations
          .sort((a, b) => b.confidence - a.confidence)
          .map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onApprove={(id) => handleUpdateStatus(id, 'APPROVED')}
              onReject={(id) => handleUpdateStatus(id, 'REJECTED')}
              onEdit={handleEdit}
              disabled={isApplying}
              isLoading={loadingRecommendation?.id === rec.id}
              loadingAction={loadingRecommendation?.id === rec.id ? loadingRecommendation.action : null}
            />
          ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No recommendations generated. The research may not have found enough
          relevant information about this person.
        </div>
      )}

      {/* Bottom Apply Button - for convenience after reviewing all recommendations */}
      {approvedCount > 0 && recommendations.length > 3 && (
        <Button onClick={handleApplyAll} disabled={isApplying} className="w-full">
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Applying...
            </>
          ) : (
            `Apply ${approvedCount} Approved Recommendation${approvedCount !== 1 ? 's' : ''}`
          )}
        </Button>
      )}

      {/* Sources */}
      {researchRun.sourceUrls.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">
            Sources ({researchRun.sourceUrls.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {researchRun.sourceUrls.slice(0, 5).map((url, i) => {
              let hostname = url;
              try {
                hostname = new URL(url).hostname;
              } catch {
                // Use full URL if parsing fails
              }
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded"
                >
                  {hostname}
                </a>
              );
            })}
            {researchRun.sourceUrls.length > 5 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{researchRun.sourceUrls.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
